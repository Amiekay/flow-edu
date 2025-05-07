import { resetDB } from "./db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "~~/app/api/edu-transfer-webhook/route";
import { db } from "~~/drizzle/db";
import { walletBindings } from "~~/drizzle/schema";

vi.mock("~~/app/api/lib/bridge", () => ({
  bridgeBscToArbitrum: vi.fn().mockResolvedValue("0xmockedHash"),
  bridgeEDUChainToArbitrum: vi.fn().mockResolvedValue("0xmockedHash2"),
}));

describe("POST /api/edu-transfer-webhook", () => {
  const boundWallet = {
    userAddress: "0xUser",
    flowEDUAddress: "0xFlowEDU",
    privateKey: "0xPrivate",
    message: "signed msg",
    signature: "0xsignature",
    timestamp: Date.now(),
  };

  beforeEach(async () => {
    await resetDB();
    await db.insert(walletBindings).values(boundWallet);
  });

  it("handles BSC transfer and calls bridge", async () => {
    const req = {
      json: async () => ({
        from: "0xFrom",
        to: "0xFlowEDU",
        value: "100",
        txHash: "0xTx",
        ca: "0xToken",
        origin: "BSC",
      }),
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(json.status).toBe("handled");
    expect(res.status).toBe(200);
  });

  it("handles EDUChain transfer and calls bridge", async () => {
    const req = {
      json: async () => ({
        from: "0xFrom",
        to: "0xFlowEDU",
        value: "100",
        txHash: "0xTx",
        ca: "0xToken",
        origin: "EDUChain",
      }),
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(json.status).toBe("handled");
  });

  it("ignores if wallet not found", async () => {
    const req = {
      json: async () => ({
        from: "0xFrom",
        to: "0xUnboundAddress",
        value: "100",
        txHash: "0xTx",
        ca: "0xToken",
        origin: "BSC",
      }),
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(json.status).toBe("ignored");
  });

  it("ignores if wallet has no signature", async () => {
    await resetDB();
    await db.insert(walletBindings).values({
      ...boundWallet,
      signature: null,
    });

    const req = {
      json: async () => ({
        from: "0xFrom",
        to: "0xFlowEDU",
        value: "100",
        txHash: "0xTx",
        ca: "0xToken",
        origin: "BSC",
      }),
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(json.status).toBe("ignored");
  });

  it("ignores unknown origin", async () => {
    const req = {
      json: async () => ({
        from: "0xFrom",
        to: "0xFlowEDU",
        value: "100",
        txHash: "0xTx",
        ca: "0xToken",
        origin: "UnknownChain",
      }),
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(json.status).toBe("ignored");
  });
});
