import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LinkPayment } from "@/types/link-payment.types";

const EMPTY: LinkPayment[] = [];

export function useLinkPayments(userId: string) {
  const queryResult = useQuery({
    queryKey: ["linkPayments", userId],
    queryFn: async (): Promise<LinkPayment[]> => {
      const supabase = getSupabaseBrowserClient();
      const PAGE = 1000;
      const rows: LinkPayment[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("link_payments")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as LinkPayment[];
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
