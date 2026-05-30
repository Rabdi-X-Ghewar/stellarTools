import { bridgeTokenTool } from "./tools/bridge";
import { StellarLiquidityContractTool } from "./tools/contract";
import { StellarDexTool } from "./tools/dex";
import { StellarContractTool } from "./tools/stake";
import { stellarSendPaymentTool, stellarGetBalanceTool, stellarGetAccountInfoTool } from "./tools/stellar";
import { StellarClaimBalanceTool } from "./tools/claim_balance_tool";
import { StellarAccountTool } from "./tools/account";
import { StellarAssetTool } from "./tools/asset";
import { 
  AgentClient, 
  AgentConfig,
  LaunchTokenParams,
  LaunchTokenResult,
} from "./agent";
import type {
  StellarAssetInput,
  QuoteSwapParams,
  RouteQuote,
  SwapBestRouteParams,
  SwapBestRouteResult,
} from "./agent";

// Agent exportları (Hem sınıfları hem de tipleri içerecek şekilde)
export {
  AgentClient,
  AgentConfig,
  LaunchTokenParams,
  LaunchTokenResult,
} from "./agent";

export type {
  StellarAssetInput,
  QuoteSwapParams,
  RouteQuote,
  SwapBestRouteParams,
  SwapBestRouteResult,
  AccountInfo,
  AccountBalance,
  TransactionRecord,
  OperationRecord,
  AssetDetails,
  OrderbookSummary,
  TradeRecord,
} from "./agent";

// claim_balance_tool içindeki her şeyi export et
export * from "./tools/claim_balance_tool";

// Account & Asset tool exportları
export { StellarAccountTool } from "./tools/account";
export { StellarAssetTool } from "./tools/asset";

// Lib-level exports for direct usage
export {
  getAccountInfo,
  getBalances,
  getTransactionHistory,
  getOperationHistory,
  fundTestnetAccount,
} from "./lib/account";

export {
  getAssetDetails,
  getOrderbook,
  getTrades,
} from "./lib/asset";

// Staking lib-level exports
export {
  initialize as stakingInitialize,
  stake as stakingStake,
  unstake as stakingUnstake,
  claimRewards as stakingClaimRewards,
  getStake as stakingGetStake,
} from "./lib/stakeF";

// Claim lib-level exports
export {
  listClaimableBalances,
  claimBalance,
} from "./lib/claimF";

// Bütün tool'ların listesi
export const stellarTools = [
  bridgeTokenTool,
  StellarDexTool,
  StellarLiquidityContractTool,
  StellarContractTool,
  stellarSendPaymentTool,
  stellarGetBalanceTool,
  stellarGetAccountInfoTool,
  StellarClaimBalanceTool,
  StellarAccountTool,
  StellarAssetTool,
];
