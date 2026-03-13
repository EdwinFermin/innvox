import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Branch } from "@/types/branch.types";

const EMPTY_BRANCHES: Branch[] = [];

export function useBranches(userId: string, allowedBranchIds?: string[]) {
  const queryResult = useQuery({
    queryKey: [
      "branches",
      userId,
      [...(allowedBranchIds ?? [])].sort().join(","),
    ],
    queryFn: async (): Promise<Branch[]> => {
      const supabase = getSupabaseBrowserClient();

      let query = supabase.from("branches").select("*");

      if (allowedBranchIds && allowedBranchIds.length > 0) {
        query = query.in("id", allowedBranchIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      // In the DB, the branch `id` IS the code (e.g. "SDQ-01").
      // Populate the `code` field so the UI can display it.
      return (data ?? []).map((row) => ({
        ...row,
        code: row.id,
      })) as Branch[];
    },
    enabled: !!userId,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY_BRANCHES,
  };
}
