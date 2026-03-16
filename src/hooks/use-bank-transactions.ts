import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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
  },
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
      const supabase = getSupabaseBrowserClient();

      let query = supabase
        .from("bank_transactions")
        .select("*")
        .eq("bank_account_id", bankAccountId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      if (startDate) {
        query = query.gte("date", startDate.toISOString());
      }

      if (endDate) {
        query = query.lte("date", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as BankTransaction[];
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
  },
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
      const supabase = getSupabaseBrowserClient();

      // Get account IDs for the branch via the junction table
      const { data: junctions, error: junctionError } = await supabase
        .from("bank_account_branches")
        .select("bank_account_id")
        .eq("branch_id", branchId);

      if (junctionError) throw junctionError;

      const accountIds = (junctions ?? []).map((j) => j.bank_account_id);
      if (accountIds.length === 0) return [];

      // Get transactions for all branch accounts in a single query
      let query = supabase
        .from("bank_transactions")
        .select("*")
        .in("bank_account_id", accountIds)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      if (startDate) {
        query = query.gte("date", startDate.toISOString());
      }

      if (endDate) {
        query = query.lte("date", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as BankTransaction[];
    },
    enabled: !!userId && !!branchId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY_TRANSACTIONS,
  };
}
