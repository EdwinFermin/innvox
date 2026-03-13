import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Client } from "@/types/client.types";

const EMPTY: Client[] = [];

export function useClients(userId: string) {
  const queryResult = useQuery({
    queryKey: ["clients", userId],
    queryFn: async (): Promise<Client[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("clients").select("*");

      if (error) throw error;

      return data as Client[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
