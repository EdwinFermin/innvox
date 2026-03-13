import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Income } from "@/types/income.types";

const EMPTY: Income[] = [];

export function useIncomes(userId: string) {
  const queryResult = useQuery({
    queryKey: ["incomes", userId],
    queryFn: async (): Promise<Income[]> => {
      const supabase = getSupabaseBrowserClient();
      // RLS handles role-based filtering automatically
      const { data, error } = await supabase.from("incomes").select("*");

      if (error) throw error;

      return data as Income[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
