import { Horizon, TransactionBuilder, Operation, Networks } from "@stellar/stellar-sdk";
import { createServer, HorizonConfig } from "../utils/horizon";

export async function listClaimableBalances(publicKey: string, config: HorizonConfig) {
  const server = createServer(config);
  let response = await server.claimableBalances().claimant(publicKey).call();
  let allBalances = [...response.records];

  // Sayfalama (Pagination) döngüsü: Tüm kayıtları çeker
  while (response.records.length > 0) {
    if (!response.next) break;
    try {
      response = await response.next();
      if (response.records && response.records.length > 0) {
        allBalances.push(...response.records);
      }
    } catch (e: any) {
      // Sadece 404 veya bulanamadı hatalarını görmezden gel, diğerlerini fırlat
      if (e?.response?.status === 404 || e?.message?.includes('not found')) {
        break;
      }
      throw new Error(`Failed to fetch next page of claimable balances: ${e.message || e}`);
    }
  }

  return allBalances.map((r: any) => ({
    id: r.id,
    asset: r.asset,
    amount: r.amount,
    sponsor: r.sponsor,
  }));
}

export async function claimBalance(publicKey: string, balanceId: string | undefined, config: HorizonConfig) {
  const server = createServer(config);
  const account = await server.loadAccount(publicKey);

  // Hata veren 'fee' kısmı string'e çevrildi ve yapı düzeltildi
  const baseFee = await server.fetchBaseFee();

  const transaction = new TransactionBuilder(account, {
    fee: baseFee.toString(), // Sayı olan fee değerini string yaparak hatayı çözdük
    networkPassphrase: config.network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
  });

  if (balanceId) {
    transaction.addOperation(Operation.claimClaimableBalance({ balanceId }));
  } else {
    const balances = await listClaimableBalances(publicKey, config);
    if (balances.length === 0) throw new Error("No claimable balances found.");

    if (balances.length > 100) {
      throw new Error("Too many claimable balances for a single transaction (max 100). Please provide a specific balanceId or claim them in batches.");
    }

    balances.forEach((b: any) => {
      transaction.addOperation(Operation.claimClaimableBalance({ balanceId: b.id }));
    });
  }

  return transaction.setTimeout(30).build();
}
