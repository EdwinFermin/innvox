import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { OperatingCost } from "@/types/operating-cost.types";

const EMPTY: OperatingCost[] = [];

export function useOperatingCosts(userId: string) {
  const queryResult = useQuery({
    queryKey: ["operatingCosts", userId],
    queryFn: async (): Promise<OperatingCost[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("operating_costs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as OperatingCost[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
