import { Keypair, TransactionBuilder } from "stellar-sdk";

export const signTransaction = (txXDR: string, networkPassphrase: string) => {
    const keypair = Keypair.fromSecret(`${process.env.STELLAR_PRIVATE_KEY}`);
    const transaction = TransactionBuilder.fromXDR(txXDR, networkPassphrase);
    transaction.sign(keypair);
    return transaction.toXDR();
  };
  