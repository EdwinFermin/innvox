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

      const transactions = (data ?? []) as BankTransaction[];

      const incomeIds = Array.from(
        new Set(
          transactions
            .map((transaction) => transaction.linked_income_id)
            .filter((value): value is string => !!value),
        ),
      );
      const expenseIds = Array.from(
        new Set(
          transactions
            .map((transaction) => transaction.linked_expense_id)
            .filter((value): value is string => !!value),
        ),
      );

      const [incomeResult, expenseResult] = await Promise.all([
        incomeIds.length > 0
          ? supabase.from("incomes").select("id, friendly_id").in("id", incomeIds)
          : Promise.resolve({ data: [], error: null }),
        expenseIds.length > 0
          ? supabase.from("expenses").select("id, friendly_id").in("id", expenseIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (expenseResult.error) throw expenseResult.error;

      const incomeFriendlyIdById = new Map(
        (incomeResult.data ?? []).map((item) => [item.id, item.friendly_id]),
      );
      const expenseFriendlyIdById = new Map(
        (expenseResult.data ?? []).map((item) => [item.id, item.friendly_id]),
      );
      const transactionFriendlyIdById = new Map(
        transactions.map((transaction) => [transaction.id, transaction.friendly_id]),
      );

      return transactions.map((transaction) => ({
        ...transaction,
        linked_income_friendly_id: transaction.linked_income_id
          ? incomeFriendlyIdById.get(transaction.linked_income_id) ?? null
          : null,
        linked_expense_friendly_id: transaction.linked_expense_id
          ? expenseFriendlyIdById.get(transaction.linked_expense_id) ?? null
          : null,
        related_transfer_friendly_id: transaction.related_transfer_id
          ? transactionFriendlyIdById.get(transaction.related_transfer_id) ?? null
          : null,
      }));
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

      const transactions = (data ?? []) as BankTransaction[];

      const incomeIds = Array.from(
        new Set(
          transactions
            .map((transaction) => transaction.linked_income_id)
            .filter((value): value is string => !!value),
        ),
      );
      const expenseIds = Array.from(
        new Set(
          transactions
            .map((transaction) => transaction.linked_expense_id)
            .filter((value): value is string => !!value),
        ),
      );

      const [incomeResult, expenseResult] = await Promise.all([
        incomeIds.length > 0
          ? supabase.from("incomes").select("id, friendly_id").in("id", incomeIds)
          : Promise.resolve({ data: [], error: null }),
        expenseIds.length > 0
          ? supabase.from("expenses").select("id, friendly_id").in("id", expenseIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (expenseResult.error) throw expenseResult.error;

      const incomeFriendlyIdById = new Map(
        (incomeResult.data ?? []).map((item) => [item.id, item.friendly_id]),
      );
      const expenseFriendlyIdById = new Map(
        (expenseResult.data ?? []).map((item) => [item.id, item.friendly_id]),
      );
      const transactionFriendlyIdById = new Map(
        transactions.map((transaction) => [transaction.id, transaction.friendly_id]),
      );

      return transactions.map((transaction) => ({
        ...transaction,
        linked_income_friendly_id: transaction.linked_income_id
          ? incomeFriendlyIdById.get(transaction.linked_income_id) ?? null
          : null,
        linked_expense_friendly_id: transaction.linked_expense_id
          ? expenseFriendlyIdById.get(transaction.linked_expense_id) ?? null
          : null,
        related_transfer_friendly_id: transaction.related_transfer_id
          ? transactionFriendlyIdById.get(transaction.related_transfer_id) ?? null
          : null,
      }));
    },
    enabled: !!userId && !!branchId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY_TRANSACTIONS,
  };
}
