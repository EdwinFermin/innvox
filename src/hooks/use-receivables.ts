import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Receivable } from "@/types/receivable.types";

const EMPTY: Receivable[] = [];

export function useReceivables(userId: string) {
  const queryResult = useQuery({
    queryKey: ["receivables", userId],
    queryFn: async (): Promise<Receivable[]> => {
      const supabase = getSupabaseBrowserClient();
      const PAGE = 1000;
      const rows: Receivable[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("receivables")
          .select("*")
          .order("due_date", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as Receivable[];
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
