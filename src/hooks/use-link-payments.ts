import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LinkPayment } from "@/types/link-payment.types";

const EMPTY: LinkPayment[] = [];

export function useLinkPayments(userId: string) {
  const queryResult = useQuery({
    queryKey: ["linkPayments", userId],
    queryFn: async (): Promise<LinkPayment[]> => {
      const supabase = getSupabaseBrowserClient();
      // RLS handles role-based filtering automatically
      const { data, error } = await supabase.from("link_payments").select("*");

      if (error) throw error;

      return data as LinkPayment[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
