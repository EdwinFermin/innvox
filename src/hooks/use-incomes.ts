import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Income } from "@/types/income.types";

const EMPTY: Income[] = [];

export function useIncomes(userId: string) {
  const queryResult = useQuery({
    queryKey: ["incomes", userId],
    queryFn: async (): Promise<Income[]> => {
      const supabase = getSupabaseBrowserClient();
      const PAGE = 1000;
      const rows: Income[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("incomes")
          .select("*")
          .order("date", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as Income[];
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
