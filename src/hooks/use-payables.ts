import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Payable } from "@/types/payable.types";

const EMPTY: Payable[] = [];

export function usePayables(userId: string) {
  const queryResult = useQuery({
    queryKey: ["payables", userId],
    queryFn: async (): Promise<Payable[]> => {
      const supabase = getSupabaseBrowserClient();
      const PAGE = 1000;
      const rows: Payable[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("payables")
          .select("*")
          .order("due_date", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as Payable[];
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
