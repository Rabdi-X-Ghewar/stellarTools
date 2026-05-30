import { Horizon } from "@stellar/stellar-sdk";

export interface HorizonConfig {
  network: "testnet" | "mainnet";
  horizonUrl?: string;
}

export function getHorizonUrl(config: HorizonConfig): string {
  return (
    config.horizonUrl ??
    (config.network === "mainnet"
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org")
  );
}

export function createServer(config: HorizonConfig): Horizon.Server {
  return new Horizon.Server(getHorizonUrl(config));
}
