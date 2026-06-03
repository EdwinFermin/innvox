import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { BankTransaction } from "@/types/bank-transaction.types";

const EMPTY_TRANSACTIONS: BankTransaction[] = [];

// PostgREST rejects very long URLs (Bad Request) when `id=in.(...)` lists
// hundreds of UUIDs. Chunk lookups to keep each request under safe limits.
const IN_LOOKUP_CHUNK = 100;

async function fetchByIdsInChunks<T>(
  ids: string[],
  loader: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += IN_LOOKUP_CHUNK) {
    const chunk = ids.slice(i, i + IN_LOOKUP_CHUNK);
    const { data, error } = await loader(chunk);
    if (error) throw error;
    if (data) results.push(...data);
  }
  return results;
}

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

      const PAGE = 1000;
      const transactions: BankTransaction[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = supabase
          .from("bank_transactions")
          .select("*")
          .eq("bank_account_id", bankAccountId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + PAGE - 1);

        if (startDate) {
          query = query.gte("date", startDate.toISOString());
        }

        if (endDate) {
          query = query.lte("date", endDate.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        const batch = (data ?? []) as BankTransaction[];
        transactions.push(...batch);
        if (batch.length < PAGE) break;
      }

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
      const relatedAccountIds = Array.from(
        new Set(
          transactions
            .map((transaction) => transaction.related_account_id)
            .filter((value): value is string => !!value),
        ),
      );

      const [incomeRows, expenseRows, relatedAccountRows] = await Promise.all([
        fetchByIdsInChunks<{ id: string; friendly_id: string; branch_id: string | null }>(
          incomeIds,
          (chunk) =>
            supabase.from("incomes").select("id, friendly_id, branch_id").in("id", chunk),
        ),
        fetchByIdsInChunks<{ id: string; friendly_id: string; branch_id: string | null }>(
          expenseIds,
          (chunk) =>
            supabase.from("expenses").select("id, friendly_id, branch_id").in("id", chunk),
        ),
        fetchByIdsInChunks<{ id: string; account_name: string; account_number: string | null }>(
          relatedAccountIds,
          (chunk) =>
            supabase
              .from("bank_accounts")
              .select("id, account_name, account_number")
              .in("id", chunk),
        ),
      ]);

      const incomeFriendlyIdById = new Map(
        incomeRows.map((item) => [item.id, item.friendly_id]),
      );
      const incomeBranchIdById = new Map(
        incomeRows.map((item) => [item.id, item.branch_id]),
      );
      const expenseFriendlyIdById = new Map(
        expenseRows.map((item) => [item.id, item.friendly_id]),
      );
      const expenseBranchIdById = new Map(
        expenseRows.map((item) => [item.id, item.branch_id]),
      );
      const transactionFriendlyIdById = new Map(
        transactions.map((transaction) => [transaction.id, transaction.friendly_id]),
      );
      const relatedAccountNameById = new Map(
        relatedAccountRows.map((item) => [item.id, item.account_name]),
      );
      const relatedAccountLast4ById = new Map(
        relatedAccountRows.map((item) => [
          item.id,
          item.account_number ? String(item.account_number).replace(/\s+/g, "").slice(-4) : null,
        ]),
      );

      return transactions.map((transaction) => ({
        ...transaction,
        linked_branch_id: transaction.linked_income_id
          ? incomeBranchIdById.get(transaction.linked_income_id) ?? null
          : transaction.linked_expense_id
            ? expenseBranchIdById.get(transaction.linked_expense_id) ?? null
            : null,
        linked_income_friendly_id: transaction.linked_income_id
          ? incomeFriendlyIdById.get(transaction.linked_income_id) ?? null
          : null,
        linked_expense_friendly_id: transaction.linked_expense_id
          ? expenseFriendlyIdById.get(transaction.linked_expense_id) ?? null
          : null,
        related_transfer_friendly_id: transaction.related_transfer_id
          ? transactionFriendlyIdById.get(transaction.related_transfer_id) ?? null
          : null,
        related_account_name: transaction.related_account_id
          ? relatedAccountNameById.get(transaction.related_account_id) ?? null
          : null,
        related_account_number_last4: transaction.related_account_id
          ? relatedAccountLast4ById.get(transaction.related_account_id) ?? null
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
