import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { IncomeType } from "@/types/income-type.types";

const EMPTY: IncomeType[] = [];

export function useIncomeTypes(userId: string) {
  const queryResult = useQuery({
    queryKey: ["incomeTypes", userId],
    queryFn: async (): Promise<IncomeType[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("income_types").select("*");

      if (error) throw error;

      return data as IncomeType[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
