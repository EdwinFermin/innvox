import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { OperatingCostAlert } from "@/types/operating-cost.types";

const EMPTY: OperatingCostAlert[] = [];

/** Track whether we've already auto-generated alerts this session */
let generatedThisSession = false;

export function useOperatingCostAlerts(
  userId: string,
  options?: { branchIds?: string[] },
) {
  const branchIds = options?.branchIds;

  const queryResult = useQuery({
    queryKey: ["operatingCostAlerts", userId, branchIds],
    queryFn: async (): Promise<OperatingCostAlert[]> => {
      const supabase = getSupabaseBrowserClient();

      // Auto-generate alerts for the current month (once per session)
      if (!generatedThisSession) {
        generatedThisSession = true;
        try {
          await supabase.rpc("generate_operating_cost_alerts");
        } catch {
          // Silently ignore — generation is best-effort
        }
      }

      // Fetch alerts
      let query = supabase
        .from("operating_cost_alerts")
        .select("*")
        .order("due_date", { ascending: true });

      if (branchIds && branchIds.length > 0) {
        query = query.in("branch_id", branchIds);
      }

      const { data: alertsData, error: alertsError } = await query;
      if (alertsError) throw alertsError;

      const alerts = (alertsData ?? []) as OperatingCostAlert[];
      if (alerts.length === 0) return [];

      // Fetch related operating costs for names and metadata
      const costIds = Array.from(
        new Set(alerts.map((a) => a.operating_cost_id)),
      );

      const { data: costsData, error: costsError } = await supabase
        .from("operating_costs")
        .select("id, name, expense_type_id, allows_custom_amount, currency")
        .in("id", costIds);

      if (costsError) throw costsError;

      const costById = new Map(
        (costsData ?? []).map((c) => [c.id, c]),
      );

      return alerts.map((alert) => {
        const cost = costById.get(alert.operating_cost_id);
        return {
          ...alert,
          operating_cost_name: cost?.name ?? null,
          expense_type_id: cost?.expense_type_id ?? null,
          allows_custom_amount: cost?.allows_custom_amount ?? false,
          currency: cost?.currency ?? "DOP",
        } as OperatingCostAlert;
      });
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
