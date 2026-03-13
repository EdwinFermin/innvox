import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Receivable } from "@/types/receivable.types";

const EMPTY: Receivable[] = [];

export function useReceivables(userId: string) {
  const queryResult = useQuery({
    queryKey: ["receivables", userId],
    queryFn: async (): Promise<Receivable[]> => {
      const supabase = getSupabaseBrowserClient();
      // RLS handles role-based filtering automatically
      const { data, error } = await supabase.from("receivables").select("*");

      if (error) throw error;

      return data as Receivable[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
