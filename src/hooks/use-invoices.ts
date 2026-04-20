import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Invoice } from "@/types/invoice.types";

const EMPTY: Invoice[] = [];

export function useInvoices(userId = "") {
  const queryResult = useQuery<Invoice[]>({
    queryKey: ["invoices", userId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const PAGE = 1000;
      const rows: Invoice[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("invoices")
          .select("*, clients(name), users:users!invoices_user_id_fkey(name)")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []).map((row) => {
          const { clients, users, ...rest } = row as Record<string, unknown>;
          const clientObj = clients as { name: string } | null;
          const userObj = users as { name: string } | null;
          return {
            ...rest,
            client_name: clientObj?.name ?? "",
            user_name: userObj?.name ?? "",
          } as Invoice;
        });
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
