import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as StellarSdk from "@stellar/stellar-sdk";

/**
 * Input schema for the getAccountInfo tool.
 * Validates that a proper Stellar public key (G...) is supplied,
 * and allows the caller to choose between testnet and mainnet.
 */
const GetAccountInfoSchema = z.object({
  publicKey: z
    .string()
    .min(56)
    .max(56)
    .startsWith("G")
    .describe(
      "The Stellar public key (G... address) of the account to look up."
    ),
  network: z
    .enum(["testnet", "mainnet"])
    .default("testnet")
    .describe("Which Stellar network to query. Defaults to testnet."),
});

/**
 * Represents a single asset balance on a Stellar account.
 */
interface AssetBalance {
  asset: string;       // "native" → XLM; otherwise "CODE:ISSUER"
  balance: string;     // String to preserve decimal precision
  limit?: string;      // Trustline limit (non-native assets only)
}

/**
 * Structured result returned by getAccountInfo.
 */
interface AccountInfoResult {
  publicKey: string;
  sequence: string;
  balances: AssetBalance[];
  subentryCount: number;
  isAuthRequired: boolean;
  isAuthRevocable: boolean;
  isAuthImmutable: boolean;
  homeDomain?: string;
  network: string;
}

/**
 * Fetch full account information from the Stellar Horizon API.
 *
 * @param publicKey  - Stellar G-address
 * @param network    - "testnet" | "mainnet"
 * @returns Structured account info or a human-readable error string
 */
async function fetchAccountInfo(
  publicKey: string,
  network: "testnet" | "mainnet"
): Promise<AccountInfoResult | string> {
  const horizonUrl =
    network === "mainnet"
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org";

  const server = new StellarSdk.Horizon.Server(horizonUrl);

  try {
    const account = await server.loadAccount(publicKey);

    const balances: AssetBalance[] = account.balances.map((b) => {
      if (b.asset_type === "native") {
        return { asset: "XLM (native)", balance: b.balance };
      }
      // Type-safe narrowing: non-native balances always have asset_code + asset_issuer
      const nonNative = b as StellarSdk.Horizon.HorizonApi.BalanceLine & {
        asset_code: string;
        asset_issuer: string;
        limit: string;
      };
      return {
        asset: `${nonNative.asset_code}:${nonNative.asset_issuer}`,
        balance: nonNative.balance,
        limit: nonNative.limit,
      };
    });

    return {
      publicKey,
      sequence: account.sequence,
      balances,
      subentryCount: account.subentry_count,
      isAuthRequired: account.flags.auth_required,
      isAuthRevocable: account.flags.auth_revocable,
      isAuthImmutable: account.flags.auth_immutable,
      homeDomain: account.home_domain,
      network,
    };
  } catch (err: unknown) {
    // Horizon returns a structured error for unknown accounts
    if (
      err instanceof StellarSdk.Horizon.NetworkError &&
      (err as unknown as { response?: { status: number } }).response?.status === 404
    ) {
      return `Account ${publicKey} does not exist on ${network}. It may not have been funded yet.`;
    }
    const message = err instanceof Error ? err.message : String(err);
    return `Failed to fetch account info: ${message}`;
  }
}

/**
 * Format the account info result into a human-readable string
 * suitable for use as a LangChain tool response.
 */
function formatResult(result: AccountInfoResult | string): string {
  if (typeof result === "string") {
    return result; // Already a human-readable error
  }

  const balanceLines = result.balances
    .map((b) => {
      const limitStr = b.limit ? ` (limit: ${b.limit})` : "";
      return `  • ${b.asset}: ${b.balance}${limitStr}`;
    })
    .join("\n");

  const flags = [
    result.isAuthRequired ? "auth_required" : null,
    result.isAuthRevocable ? "auth_revocable" : null,
    result.isAuthImmutable ? "auth_immutable" : null,
  ]
    .filter(Boolean)
    .join(", ") || "none";

  return [
    `═══ Stellar Account Info (${result.network}) ═══`,
    `Public Key  : ${result.publicKey}`,
    `Sequence    : ${result.sequence}`,
    `Subentries  : ${result.subentryCount}`,
    `Flags       : ${flags}`,
    result.homeDomain ? `Home Domain : ${result.homeDomain}` : null,
    ``,
    `Balances:`,
    balanceLines || "  (no balances found)",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * LangChain DynamicStructuredTool: getAccountInfo
 *
 * Allows an AI agent to look up any Stellar account's balances,
 * sequence number, trustlines, and account flags before executing
 * swaps, payments, or other DeFi operations.
 *
 * @example
 * // Agent can call:
 * // "Check the balance of GABC...XYZ on testnet"
 * // → returns structured account info with all asset balances
 */
export const getAccountInfoTool = new DynamicStructuredTool({
  name: "get_account_info",
  description: `
    Fetches complete information for a Stellar account including:
    - All asset balances (XLM and any tokens/trustlines)
    - Account sequence number
    - Account flags (auth_required, auth_revocable, auth_immutable)
    - Trustline limits for non-native assets
    - Home domain (if set)

    Use this tool BEFORE performing swaps, payments, or LP operations
    to verify the account exists and has sufficient balance.

    Supports both testnet and mainnet.
  `.trim(),
  schema: GetAccountInfoSchema,
  func: async ({ publicKey, network }) => {
    const result = await fetchAccountInfo(publicKey, network);
    return formatResult(result);
  },
});

export type { AccountInfoResult, AssetBalance };
