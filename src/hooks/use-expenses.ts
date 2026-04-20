import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Expense } from "@/types/expense.types";

const EMPTY: Expense[] = [];

export function useExpenses(userId: string) {
  const queryResult = useQuery({
    queryKey: ["expenses", userId],
    queryFn: async (): Promise<Expense[]> => {
      const supabase = getSupabaseBrowserClient();
      const PAGE = 1000;
      const rows: Expense[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .order("date", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as Expense[];
        rows.push(...batch);
        if (batch.length < PAGE) break;
      }
      return rows;
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
