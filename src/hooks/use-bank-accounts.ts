import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import { accountSupportsBranch, normalizeBankAccount } from "@/lib/bank-accounts";
import { db } from "@/lib/firebase";
import { AccountType, BankAccount } from "@/types/bank-account.types";

const EMPTY_ACCOUNTS: BankAccount[] = [];

export function useBankAccounts(
  userId: string,
  options?: {
    branchId?: string;
    allowedBranchIds?: string[];
    accountType?: AccountType;
    activeOnly?: boolean;
  }
) {
  const { branchId, allowedBranchIds, accountType, activeOnly = true } = options ?? {};

  const queryResult = useQuery({
    queryKey: ["bankAccounts", userId, branchId, allowedBranchIds?.join(","), accountType, activeOnly],
    queryFn: async (): Promise<BankAccount[]> => {
      const ref = collection(db, "bankAccounts");
      const snapshot = await getDocs(ref);
      let accounts = snapshot.docs.map((doc) =>
        normalizeBankAccount({ id: doc.id, ...doc.data() } as BankAccount),
      );

      // Filter by branch if specified
      if (branchId) {
        accounts = accounts.filter((a) => accountSupportsBranch(a, branchId));
      }

      if (allowedBranchIds && allowedBranchIds.length > 0) {
        accounts = accounts.filter((account) =>
          account.branchIds.some((accountBranchId) => allowedBranchIds.includes(accountBranchId)),
        );
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
    data: queryResult.data ?? EMPTY_ACCOUNTS,
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
      const snapshot = await getDocs(ref);
      const account = snapshot.docs
        .map((doc) => normalizeBankAccount({ id: doc.id, ...doc.data() } as BankAccount))
        .find(
          (item) =>
            item.accountType === "petty_cash" &&
            item.isActive &&
            accountSupportsBranch(item, branchId),
        );

      return account ?? null;
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
      const snapshot = await getDocs(ref);

      return snapshot.docs
        .map((doc) => normalizeBankAccount({ id: doc.id, ...doc.data() } as BankAccount))
        .filter(
          (account) =>
            account.accountType === "bank" &&
            account.isActive &&
            accountSupportsBranch(account, branchId),
        );
    },
    enabled: !!userId && !!branchId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY_ACCOUNTS,
  };
}
