import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

import { accountSupportsBranch, normalizeBankAccount } from "@/lib/bank-accounts";
import { db } from "@/lib/firebase";
import { BankAccount } from "@/types/bank-account.types";
import { BankTransaction } from "@/types/bank-transaction.types";

const EMPTY_TRANSACTIONS: BankTransaction[] = [];

export function useBankTransactions(
  userId: string,
  bankAccountId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    enabled?: boolean;
  }
) {
  const { startDate, endDate, enabled = true } = options ?? {};

  const queryResult = useQuery({
    queryKey: [
      "bankTransactions",
      userId,
      bankAccountId,
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    queryFn: async (): Promise<BankTransaction[]> => {
      const ref = collection(db, "bankTransactions");
      const q = query(
        ref,
        where("bankAccountId", "==", bankAccountId),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(q);
      let transactions = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as BankTransaction)
      );

      // Filter by date range in memory (Firestore compound queries have limitations)
      if (startDate) {
        const startTimestamp = Timestamp.fromDate(startDate);
        transactions = transactions.filter(
          (t) => t.date.toMillis() >= startTimestamp.toMillis()
        );
      }

      if (endDate) {
        const endTimestamp = Timestamp.fromDate(endDate);
        transactions = transactions.filter(
          (t) => t.date.toMillis() <= endTimestamp.toMillis()
        );
      }

      return transactions;
    },
    enabled: enabled && !!userId && !!bankAccountId,
    staleTime: 30_000,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY_TRANSACTIONS,
  };
}

/**
 * Get all transactions for a branch across all accounts
 */
export function useBranchTransactions(
  userId: string,
  branchId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
  }
) {
  const { startDate, endDate } = options ?? {};

  const queryResult = useQuery({
    queryKey: [
      "bankTransactions",
      "branch",
      userId,
      branchId,
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    queryFn: async (): Promise<BankTransaction[]> => {
      // First get all accounts for the branch
      const accountsRef = collection(db, "bankAccounts");
      const accountsSnapshot = await getDocs(accountsRef);
      const accountIds = accountsSnapshot.docs
        .map((doc) => normalizeBankAccount({ id: doc.id, ...doc.data() } as BankAccount))
        .filter((account) => accountSupportsBranch(account, branchId))
        .map((account) => account.id);

      if (accountIds.length === 0) return [];

      // Get transactions for all accounts
      const transactionsRef = collection(db, "bankTransactions");
      const allTransactions: BankTransaction[] = [];

      // Firestore 'in' queries support max 10 values, so we batch
      for (let i = 0; i < accountIds.length; i += 10) {
        const batch = accountIds.slice(i, i + 10);
        const q = query(
          transactionsRef,
          where("bankAccountId", "in", batch),
          orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((doc) => {
          allTransactions.push({ id: doc.id, ...doc.data() } as BankTransaction);
        });
      }

      // Filter by date range
      let filtered = allTransactions;

      if (startDate) {
        const startTimestamp = Timestamp.fromDate(startDate);
        filtered = filtered.filter(
          (t) => t.date.toMillis() >= startTimestamp.toMillis()
        );
      }

      if (endDate) {
        const endTimestamp = Timestamp.fromDate(endDate);
        filtered = filtered.filter(
          (t) => t.date.toMillis() <= endTimestamp.toMillis()
        );
      }

      // Sort by date descending
      filtered.sort((a, b) => b.date.toMillis() - a.date.toMillis());

      return filtered;
    },
    enabled: !!userId && !!branchId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY_TRANSACTIONS,
  };
}
