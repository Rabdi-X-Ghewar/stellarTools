"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeTokenTool = void 0;
const big_js_1 = __importDefault(require("big.js"));
const bridge_core_sdk_1 = require("@allbridge/bridge-core-sdk");
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const utils_1 = require("../utils/utils");
const dotenv = __importStar(require("dotenv"));
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
dotenv.config({ path: ".env" });
const fromAddress = process.env.STELLAR_PUBLIC_KEY;
const privateKey = process.env.STELLAR_PRIVATE_KEY;
// const toAddress = process.env.ETH_PUBLIC_KEY as string;
exports.bridgeTokenTool = new tools_1.DynamicStructuredTool({
    name: "bridge_token",
    description: "Bridge token from Stellar chain to EVM compatible chains. Requires amount and toAddress as string",
    schema: zod_1.z.object({
        amount: zod_1.z.string().describe("The amount of tokens to bridge"),
        toAddress: zod_1.z.string().describe("The destination ETH address (as a string)"),
    }),
    func: (_a) => __awaiter(void 0, [_a], void 0, function* ({ amount, toAddress }) {
        const sdk = new bridge_core_sdk_1.AllbridgeCoreSdk(Object.assign(Object.assign({}, bridge_core_sdk_1.nodeRpcUrlsDefault), { SRB: `${process.env.SRB_PROVIDER_URL}` }));
        const chainDetailsMap = yield sdk.chainDetailsMap();
        const sourceToken = (0, utils_1.ensure)(chainDetailsMap[bridge_core_sdk_1.ChainSymbol.SRB].tokens.find((t) => t.symbol == "USDC"));
        const destinationToken = (0, utils_1.ensure)(chainDetailsMap[bridge_core_sdk_1.ChainSymbol.ETH].tokens.find((t) => t.symbol == "USDC"));
        const sendParams = {
            amount,
            fromAccountAddress: fromAddress,
            toAccountAddress: toAddress,
            sourceToken,
            destinationToken,
            messenger: bridge_core_sdk_1.Messenger.ALLBRIDGE,
            extraGas: "1.15",
            extraGasFormat: bridge_core_sdk_1.AmountFormat.FLOAT,
            gasFeePaymentMethod: bridge_core_sdk_1.FeePaymentMethod.WITH_STABLECOIN,
        };
        const xdrTx = (yield sdk.bridge.rawTxBuilder.send(sendParams));
        // SendTx
        const srbKeypair = stellar_sdk_1.Keypair.fromSecret(privateKey);
        const transaction = stellar_sdk_1.TransactionBuilder.fromXDR(xdrTx, stellar_sdk_1.Networks.TESTNET);
        transaction.sign(srbKeypair);
        let signedTx = transaction.toXDR();
        const restoreXdrTx = yield sdk.utils.srb.simulateAndCheckRestoreTxRequiredSoroban(signedTx, fromAddress);
        if (restoreXdrTx) {
            const restoreTx = stellar_sdk_1.TransactionBuilder.fromXDR(restoreXdrTx, stellar_sdk_1.Networks.TESTNET);
            restoreTx.sign(srbKeypair);
            const signedRestoreXdrTx = restoreTx.toXDR();
            const sentRestoreXdrTx = yield sdk.utils.srb.sendTransactionSoroban(signedRestoreXdrTx);
            const confirmRestoreXdrTx = yield sdk.utils.srb.confirmTx(sentRestoreXdrTx.hash);
            if (confirmRestoreXdrTx.status === stellar_sdk_1.rpc.Api.GetTransactionStatus.NOT_FOUND) {
                console.log(`Waited for Restore transaction to complete, but it did not. ` +
                    `Check the transaction status manually. ` +
                    `Hash: ${sentRestoreXdrTx.hash}`);
            }
            else if (confirmRestoreXdrTx.status === stellar_sdk_1.rpc.Api.GetTransactionStatus.FAILED) {
                console.log(`Transaction Restore failed. Check the transaction manually.` + `Hash: ${sentRestoreXdrTx.hash}`);
            }
            else {
                console.log(`Transaction Restore Confirmed. Hash: ${sentRestoreXdrTx.hash}`);
            }
            //get new tx with updated sequences
            const xdrTx2 = (yield sdk.bridge.rawTxBuilder.send(sendParams));
            const transaction2 = stellar_sdk_1.TransactionBuilder.fromXDR(xdrTx2, stellar_sdk_1.Networks.TESTNET);
            transaction2.sign(srbKeypair);
            signedTx = transaction2.toXDR();
        }
        const sent = yield sdk.utils.srb.sendTransactionSoroban(signedTx);
        const confirm = yield sdk.utils.srb.confirmTx(sent.hash);
        if (confirm.status === stellar_sdk_1.rpc.Api.GetTransactionStatus.NOT_FOUND) {
            console.log(`Waited for transaction to complete, but it did not. ` +
                `Check the transaction status manually. ` +
                `Hash: ${sent.hash}`);
        }
        else if (confirm.status === stellar_sdk_1.rpc.Api.GetTransactionStatus.FAILED) {
            console.log(`Transaction failed. Check the transaction manually.` + `Hash: ${sent.hash}`);
        }
        else {
            console.log(`Transaction Confirmed. Hash: ${sent.hash}`);
        }
        //TrustLine check and Set up for destinationToken if it is SRB
        const destinationTokenSBR = sourceToken; // simulate destination is srb
        const balanceLine = yield sdk.utils.srb.getBalanceLine(fromAddress, destinationTokenSBR.tokenAddress);
        console.log(`BalanceLine:`, balanceLine);
        const notEnoughBalanceLine = !balanceLine || (0, big_js_1.default)(balanceLine.balance).add(amount).gt((0, big_js_1.default)(balanceLine.limit));
        if (notEnoughBalanceLine) {
            const xdrTx = yield sdk.utils.srb.buildChangeTrustLineXdrTx({
                sender: fromAddress,
                tokenAddress: destinationTokenSBR.tokenAddress,
                // limit: "1000000",
            });
            //SignTx
            const keypair = stellar_sdk_1.Keypair.fromSecret(privateKey);
            const transaction = stellar_sdk_1.TransactionBuilder.fromXDR(xdrTx, stellar_sdk_1.Networks.TESTNET);
            transaction.sign(keypair);
            const signedTrustLineTx = transaction.toXDR();
            const submit = yield sdk.utils.srb.submitTransactionStellar(signedTrustLineTx);
            return `Submitted change trust tx. Hash: ${submit.hash}`;
        }
    })
});
