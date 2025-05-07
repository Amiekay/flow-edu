import { NextRequest } from "next/server";
import { resetDB } from "./db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "~~/app/api/generate-keypair/[address]/route";
import { normalizeAddress } from "~~/app/api/lib/helpers";

vi.mock("../app/api/lib/deriveHDWallet", async () => {
  const mod = await vi.importActual("../app/api/lib/deriveHDWallet");
  return {
    ...mod,
    deriveHDWallet: vi.fn().mockImplementation((index: number) => ({
      address: normalizeAddress("mockedPublicKey"),
      privateKey: "mockedPrivateKey",
    })),
  };
});

describe("GET /api/generate-keypair/[address]", () => {
  beforeEach(async () => {
    await resetDB();
  });

  it("should return 400 for invalid address", async () => {
    const res = await GET({} as NextRequest, { params: Promise.resolve({ address: "bad_address" }) });
    expect(res.status).toBe(400);
  });

  it("should create a new wallet for a fresh user", async () => {
    const address = normalizeAddress("0x000000000000000000000000000000000000dEaD");

    const res = await GET({} as NextRequest, { params: Promise.resolve({ address }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.address).toBe(address);
    expect(json.flowEDUAddress).toBeDefined();
    expect(json.isBound).toBe(false);
  });

  it("should return existing wallet if user already has one", async () => {
    const address = "0x000000000000000000000000000000000000dEaD";

    const first = await GET({} as NextRequest, { params: Promise.resolve({ address }) });
    const firstJson = await first.json();

    const second = await GET({} as NextRequest, { params: Promise.resolve({ address }) });
    const secondJson = await second.json();

    expect(firstJson.flowEDUAddress).toBe(secondJson.flowEDUAddress);
    expect(second.status).toBe(200);
  });
});
