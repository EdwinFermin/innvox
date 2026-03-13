import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Expense } from "@/types/expense.types";

const EMPTY: Expense[] = [];

export function useExpenses(userId: string) {
  const queryResult = useQuery({
    queryKey: ["expenses", userId],
    queryFn: async (): Promise<Expense[]> => {
      const supabase = getSupabaseBrowserClient();
      // RLS handles role-based filtering automatically
      const { data, error } = await supabase.from("expenses").select("*");

      if (error) throw error;

      return data as Expense[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
