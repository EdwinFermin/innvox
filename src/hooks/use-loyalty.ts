import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Client } from "@/types/client.types";
import { TokenEvent } from "@/types/loyalty.types";

const EMPTY_CLIENTS: Client[] = [];
const EMPTY_EVENTS: TokenEvent[] = [];

export function useLoyaltyClients(userId: string) {
  const queryResult = useQuery({
    queryKey: ["loyalty-clients", userId],
    queryFn: async (): Promise<Client[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        po_box: row.id,
      })) as Client[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY_CLIENTS,
  };
}

export function useTokenHistory(clientId: string) {
  const queryResult = useQuery({
    queryKey: ["token-history", clientId],
    queryFn: async (): Promise<TokenEvent[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("token_events")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data ?? []) as TokenEvent[];
    },
    enabled: !!clientId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY_EVENTS,
  };
}
