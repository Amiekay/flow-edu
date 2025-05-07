import { resetDB } from "./db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "~~/app/api/bind-wallet/route";
import { db } from "~~/drizzle/db";
import { walletBindings } from "~~/drizzle/schema";

// Partial mock for viem: only override `verifyMessage`
vi.mock("viem", async importActual => {
  const actual = await importActual<typeof import("viem")>();
  return {
    ...actual,
    verifyMessage: vi.fn().mockResolvedValue(true),
  };
});

// Mock for privateKeyToAccount (used elsewhere in app)
vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    address: "0xMockedAddress",
    privateKey: "0xMockedPrivateKey",
  }),
}));

describe("POST /api/bind-wallet", () => {
  const userAddress = "0x1234567890123456789012345678901234567890";
  const signature = "0x" + "a".repeat(130); // valid 65-byte hex signature
  const message = "FlowEDU Wallet Binding\nPublic Key: xyz";

  beforeEach(async () => {
    await resetDB();

    await db.insert(walletBindings).values({
      userAddress,
      flowEDUAddress: "0xFlowEDUAddress",
      privateKey: "encryptedPrivKey",
      message: "",
      timestamp: 0,
    });
  });

  it("should bind wallet successfully", async () => {
    const req = {
      json: async () => ({ userAddress, message, signature }),
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("should return 400 for invalid address", async () => {
    const req = {
      json: async () => ({ userAddress: "invalid", message, signature }),
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/Invalid address/);
  });

  it("should return 400 for invalid signature", async () => {
    // Override verifyMessage to return false just for this test
    const viem = await import("viem");
    vi.mocked(viem.verifyMessage).mockResolvedValueOnce(false);

    const req = {
      json: async () => ({ userAddress, message, signature }),
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Invalid Signature");
  });

  it("should return 404 if wallet not found", async () => {
    const req = {
      json: async () => ({
        userAddress: "0x0000000000000000000000000000000000000000",
        message,
        signature,
      }),
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.message).toBe("Wallet not found");
  });
});
