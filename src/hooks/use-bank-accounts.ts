import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { AccountType, BankAccount } from "@/types/bank-account.types";

export function useBankAccounts(
  userId: string,
  options?: {
    branchId?: string;
    accountType?: AccountType;
    activeOnly?: boolean;
  }
) {
  const { branchId, accountType, activeOnly = true } = options ?? {};

  const queryResult = useQuery({
    queryKey: ["bankAccounts", userId, branchId, accountType, activeOnly],
    queryFn: async (): Promise<BankAccount[]> => {
      const ref = collection(db, "bankAccounts");
      const snapshot = await getDocs(ref);
      let accounts = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as BankAccount)
      );

      // Filter by branch if specified
      if (branchId) {
        accounts = accounts.filter((a) => a.branchId === branchId);
      }

      // Filter by account type if specified
      if (accountType) {
        accounts = accounts.filter((a) => a.accountType === accountType);
      }

      // Filter active accounts only
      if (activeOnly) {
        accounts = accounts.filter((a) => a.isActive);
      }

      return accounts;
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? [],
  };
}

/**
 * Get the petty cash account for a specific branch
 */
export function useBranchPettyCash(userId: string, branchId: string) {
  const queryResult = useQuery({
    queryKey: ["bankAccounts", "pettyCash", userId, branchId],
    queryFn: async (): Promise<BankAccount | null> => {
      const ref = collection(db, "bankAccounts");
      const q = query(
        ref,
        where("branchId", "==", branchId),
        where("accountType", "==", "petty_cash"),
        where("isActive", "==", true)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as BankAccount;
    },
    enabled: !!userId && !!branchId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? null,
  };
}

/**
 * Get bank accounts (excluding petty cash) for a specific branch
 */
export function useBranchBankAccounts(userId: string, branchId: string) {
  const queryResult = useQuery({
    queryKey: ["bankAccounts", "bank", userId, branchId],
    queryFn: async (): Promise<BankAccount[]> => {
      const ref = collection(db, "bankAccounts");
      const q = query(
        ref,
        where("branchId", "==", branchId),
        where("accountType", "==", "bank"),
        where("isActive", "==", true)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as BankAccount)
      );
    },
    enabled: !!userId && !!branchId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? [],
  };
}
