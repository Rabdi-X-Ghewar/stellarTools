import { bridgeTokenTool } from "./tools/bridge";
import { StellarLiquidityContractTool } from "./tools/contract";
import { StellarContractTool } from "./tools/stake";
import { stellarSendPaymentTool } from "./tools/stellar";
export const stellarTools = [
  bridgeTokenTool,
  StellarLiquidityContractTool,
  StellarContractTool,
  stellarSendPaymentTool
]; 