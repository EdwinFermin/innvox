import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Payable } from "@/types/payable.types";

const EMPTY: Payable[] = [];

export function usePayables(userId: string) {
  const queryResult = useQuery({
    queryKey: ["payables", userId],
    queryFn: async (): Promise<Payable[]> => {
      const supabase = getSupabaseBrowserClient();
      // RLS handles role-based filtering automatically
      const { data, error } = await supabase.from("payables").select("*");

      if (error) throw error;

      return data as Payable[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
