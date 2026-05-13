import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CuadreSync } from "@/types/cuadre.types";

const EMPTY: CuadreSync[] = [];

export function useCuadreSyncs(userId: string) {
  const queryResult = useQuery({
    queryKey: ["cuadre_syncs", userId],
    queryFn: async (): Promise<CuadreSync[]> => {
      const supabase = getSupabaseBrowserClient();
      const PAGE = 1000;
      const rows: CuadreSync[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("cuadre_syncs")
          .select("*")
          .order("synced_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as CuadreSync[];
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
