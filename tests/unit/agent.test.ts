import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";

import { AgentClient } from "../../agent";

const testKeypair = Keypair.random();
const testPublicKey = testKeypair.publicKey();

describe("AgentClient Base Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STELLAR_PUBLIC_KEY = testPublicKey;
    process.env.STELLAR_PRIVATE_KEY = testKeypair.secret();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("constructor", () => {
    it("creates a testnet client without requiring allowMainnet", () => {
      const client = new AgentClient({
        network: "testnet",
        publicKey: testPublicKey,
      });
      expect(client).toBeDefined();
    });

    it("blocks mainnet without allowMainnet flag", () => {
      expect(
        () =>
          new AgentClient({
            network: "mainnet",
            publicKey: testPublicKey,
          })
      ).toThrow("Mainnet execution blocked for safety");
    });

    it("allows mainnet with allowMainnet: true", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const client = new AgentClient({
        network: "mainnet",
        allowMainnet: true,
        publicKey: testPublicKey,
      });
      expect(client).toBeDefined();
      warnSpy.mockRestore();
    });

    it("falls back to env var for public key", () => {
      process.env.STELLAR_PUBLIC_KEY = testPublicKey;
      const client = new AgentClient({ network: "testnet" });
      expect(client).toBeDefined();
    });
  });

  describe("launchToken (mainnet blocker)", () => {
    it("blocks token launch on mainnet", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const client = new AgentClient({
        network: "mainnet",
        allowMainnet: true,
        publicKey: testPublicKey,
      });

      await expect(
        client.launchToken({
          code: "TEST",
          issuerSecret: Keypair.random().secret(),
          distributorSecret: Keypair.random().secret(),
          initialSupply: "1000",
        })
      ).rejects.toThrow("Token launches on mainnet are disabled");
      warnSpy.mockRestore();
    });
  });
});
