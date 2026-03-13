import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ExpenseType } from "@/types/expense-type.types";

const EMPTY: ExpenseType[] = [];

export function useExpenseTypes(userId: string) {
  const queryResult = useQuery({
    queryKey: ["expenseTypes", userId],
    queryFn: async (): Promise<ExpenseType[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("expense_types").select("*");

      if (error) throw error;

      return data as ExpenseType[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
