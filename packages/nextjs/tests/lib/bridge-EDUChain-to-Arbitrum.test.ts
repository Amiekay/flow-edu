import { bridgeEDUChainToArbitrum } from "../../app/api/lib/bridge";
import { parseEther, parseUnits } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_BOUND_WALLET_GAS } from "~~/app/api/lib/helpers";

// Mocks
vi.mock("~~/app/api/lib/Encryption", () => {
  class MockEncryption {
    decryptCipherText = vi.fn(() => "0x" + "1".repeat(64));
  }

  return {
    default: {
      new: () => new MockEncryption(),
    },
  };
});

vi.mock("../../app/api/lib/clients", () => ({
  eduClient: {
    getBalance: vi.fn(),
    readContract: vi.fn(),
    estimateContractGas: vi.fn(),
    estimateGas: vi.fn(),
    getGasPrice: vi.fn(),
  },
  eduWalletClient: {
    writeContract: vi.fn(),
    sendTransaction: vi.fn(),
  },
  bscClient: {
    readContract: vi.fn(),
  },
}));

vi.mock("../../app/api/lib/config", () => ({
  centralAccount: { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
  feeCollectorAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
}));

vi.mock("../../app/api/lib/constants", () => ({
  LAYERZERO_CHAIN_IDS: { ARBITRUM: 110 },
}));

vi.mock("../contracts/externalContracts", () => ({
  default: {
    "41923": {
      ArbSys: {
        abi: [{ name: "withdrawEth", type: "function" }],
        address: "0xArbSys",
      },
    },
  },
}));
describe("bridgeEDUChainToArbitrum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if tokenAddress is present (unsupported)", async () => {
    const result = await bridgeEDUChainToArbitrum("mock-encrypted-key", "0x1111111111111111111111111111111111111111");
    expect(result).toBeNull();
  });

  it("returns null if balance < 1 EDU", async () => {
    const { eduClient }: any = await import("../../app/api/lib/clients");
    eduClient.getBalance.mockResolvedValue(BigInt(0.5e18)); // 0.5 EDU

    const result = await bridgeEDUChainToArbitrum("mock-encrypted-key", null);
    expect(result).toBeNull();
  });

  it("returns null if bridging amount is insufficient after fees", async () => {
    const { eduClient }: any = await import("../../app/api/lib/clients");

    eduClient.getBalance.mockResolvedValue((1000n * MIN_BOUND_WALLET_GAS) / 997n);
    eduClient.estimateContractGas.mockResolvedValue(21000n);
    eduClient.estimateGas.mockResolvedValue(21000n);
    eduClient.getGasPrice.mockResolvedValue(BigInt(parseEther("1", "gwei")));

    const result = await bridgeEDUChainToArbitrum("wahala-key", null);
    console.log("Result:", result);
    expect(result).toBeNull();
  });

  it("calls withdrawEth and sends fee, returns hash", async () => {
    const { eduClient, eduWalletClient }: any = await import("../../app/api/lib/clients");

    eduClient.getBalance.mockResolvedValue(parseUnits("10", 18));
    eduClient.estimateContractGas.mockResolvedValue(21000n);
    eduClient.estimateGas.mockResolvedValue(21000n);
    eduClient.getGasPrice.mockResolvedValue(parseEther("1", "gwei"));

    eduWalletClient.writeContract.mockResolvedValue("0xWithdrawHash");
    eduWalletClient.sendTransaction.mockResolvedValue("0xFeeHash");

    const result = await bridgeEDUChainToArbitrum("mock-encrypted-key", null);

    expect(eduWalletClient.writeContract).toHaveBeenCalled();
    expect(eduWalletClient.sendTransaction).toHaveBeenCalled();
    expect(result).toBe("0xWithdrawHash");
  });
});
