import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { OperatingCost } from "@/types/operating-cost.types";

const EMPTY: OperatingCost[] = [];

export function useOperatingCosts(userId: string) {
  const queryResult = useQuery({
    queryKey: ["operatingCosts", userId],
    queryFn: async (): Promise<OperatingCost[]> => {
      const supabase = getSupabaseBrowserClient();
      const PAGE = 1000;
      const rows: OperatingCost[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("operating_costs")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as OperatingCost[];
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
