import { useQuery } from "@tanstack/react-query";

import { accountSupportsBranch, normalizeBankAccount } from "@/lib/bank-accounts";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AccountType, BankAccount } from "@/types/bank-account.types";

const EMPTY_ACCOUNTS: BankAccount[] = [];

async function fetchAccountsWithBranches(): Promise<BankAccount[]> {
  const supabase = getSupabaseBrowserClient();

  // Fetch accounts and branch junctions in parallel
  const [accountsResult, junctionsResult] = await Promise.all([
    supabase.from("bank_accounts").select("*"),
    supabase.from("bank_account_branches").select("bank_account_id, branch_id"),
  ]);

  if (accountsResult.error) throw accountsResult.error;
  if (junctionsResult.error) throw junctionsResult.error;

  // Build a map of account_id -> branch_ids
  const branchMap = new Map<string, string[]>();
  for (const j of junctionsResult.data ?? []) {
    const existing = branchMap.get(j.bank_account_id) ?? [];
    existing.push(j.branch_id);
    branchMap.set(j.bank_account_id, existing);
  }

  return (accountsResult.data ?? []).map((row) =>
    normalizeBankAccount({
      ...row,
      branch_ids: branchMap.get(row.id) ?? [],
    }),
  );
}

export function useBankAccounts(
  userId: string,
  options?: {
    branchId?: string;
    allowedBranchIds?: string[];
    accountType?: AccountType;
    activeOnly?: boolean;
  },
) {
  const { branchId, allowedBranchIds, accountType, activeOnly = true } = options ?? {};

  const queryResult = useQuery({
    queryKey: ["bankAccounts", userId, branchId, allowedBranchIds?.join(","), accountType, activeOnly],
    queryFn: async (): Promise<BankAccount[]> => {
      let accounts = await fetchAccountsWithBranches();

      if (branchId) {
        accounts = accounts.filter((a) => accountSupportsBranch(a, branchId));
      }

      if (allowedBranchIds && allowedBranchIds.length > 0) {
        accounts = accounts.filter((account) =>
          account.branch_ids.some((id) => allowedBranchIds.includes(id)),
        );
      }

      if (accountType) {
        accounts = accounts.filter((a) => a.account_type === accountType);
      }

      if (activeOnly) {
        accounts = accounts.filter((a) => a.is_active);
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
      const accounts = await fetchAccountsWithBranches();

      const account = accounts.find(
        (item) =>
          item.account_type === "petty_cash" &&
          item.is_active &&
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
      const accounts = await fetchAccountsWithBranches();

      return accounts.filter(
        (account) =>
          account.account_type === "bank" &&
          account.is_active &&
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
