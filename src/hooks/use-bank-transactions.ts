import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

import { accountSupportsBranch, normalizeBankAccount } from "@/lib/bank-accounts";
import { db } from "@/lib/firebase";
import { BankAccount } from "@/types/bank-account.types";
import { BankTransaction } from "@/types/bank-transaction.types";

const EMPTY_TRANSACTIONS: BankTransaction[] = [];

function toMillis(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  const timestampLike = value as { toMillis?: () => number } | null;

  if (
    timestampLike &&
    typeof timestampLike === "object" &&
    typeof timestampLike.toMillis === "function"
  ) {
    return timestampLike.toMillis();
  }

  return 0;
}

function sortTransactionsDesc(transactions: BankTransaction[]): BankTransaction[] {
  return [...transactions].sort(
    (a, b) =>
      toMillis(b.date) - toMillis(a.date) ||
      toMillis(b.createdAt) - toMillis(a.createdAt) ||
      b.id.localeCompare(a.id),
  );
}

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
      const q = query(ref, where("bankAccountId", "==", bankAccountId));

      const snapshot = await getDocs(q);
      let transactions = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as BankTransaction)
      );

      // Filter by date range in memory (Firestore compound queries have limitations)
      if (startDate) {
        const startTimestamp = Timestamp.fromDate(startDate);
        transactions = transactions.filter(
          (t) => toMillis(t.date) >= startTimestamp.toMillis()
        );
      }

      if (endDate) {
        const endTimestamp = Timestamp.fromDate(endDate);
        transactions = transactions.filter(
          (t) => toMillis(t.date) <= endTimestamp.toMillis()
        );
      }

      return sortTransactionsDesc(transactions);
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
        const q = query(transactionsRef, where("bankAccountId", "in", batch));
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
          (t) => toMillis(t.date) >= startTimestamp.toMillis()
        );
      }

      if (endDate) {
        const endTimestamp = Timestamp.fromDate(endDate);
        filtered = filtered.filter(
          (t) => toMillis(t.date) <= endTimestamp.toMillis()
        );
      }

      // Sort by date descending
      return sortTransactionsDesc(filtered);
    },
    enabled: !!userId && !!branchId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY_TRANSACTIONS,
  };
}
