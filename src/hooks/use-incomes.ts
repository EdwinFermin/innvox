import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Income } from "@/types/income.types";
import { dateOnlyToISOString } from "@/utils/dates";

const EMPTY: Income[] = [];

interface UseIncomesOptions {
  startDate?: string;
  endDate?: string;
}

export function useIncomes(userId: string, options?: UseIncomesOptions) {
  const { startDate, endDate } = options ?? {};
  const queryResult = useQuery({
    queryKey: ["incomes", userId, startDate ?? null, endDate ?? null],
    queryFn: async (): Promise<Income[]> => {
      const supabase = getSupabaseBrowserClient();
      const PAGE = 1000;
      const rows: Income[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = supabase
          .from("incomes")
          .select("*")
          .order("date", { ascending: false })
          .range(from, from + PAGE - 1);
        if (startDate) query = query.gte("date", dateOnlyToISOString(startDate));
        if (endDate) query = query.lte("date", dateOnlyToISOString(endDate));
        const { data, error } = await query;
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
