import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";

export type ConfigDocument = Record<string, unknown>;

export type ConfigsMap = Record<string, ConfigDocument>;

export function useConfigs() {
  const queryResult = useQuery<ConfigsMap>({
    queryKey: ["configs"],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("configs").select("*");

      if (error) throw error;

      const result: ConfigsMap = {};
      for (const row of data ?? []) {
        const value = row.value as Record<string, Json> | null;
        result[row.key] = (value ?? {}) as ConfigDocument;
      }
      return result;
    },
  });

  return {
    ...queryResult,
    data: (queryResult.data ?? {}) as ConfigsMap,
  };
}
