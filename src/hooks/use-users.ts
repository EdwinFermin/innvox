import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { User } from "@/types/auth.types";

const EMPTY: User[] = [];

export function useUsers() {
  const queryResult = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const supabase = getSupabaseBrowserClient();

      const [usersResult, branchesResult] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("user_branches").select("user_id, branch_id"),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (branchesResult.error) throw branchesResult.error;

      // Build a map of user_id -> branch_ids
      const branchMap = new Map<string, string[]>();
      for (const j of branchesResult.data ?? []) {
        const existing = branchMap.get(j.user_id) ?? [];
        existing.push(j.branch_id);
        branchMap.set(j.user_id, existing);
      }

      return (usersResult.data ?? []).map((row) => ({
        ...row,
        branch_ids: branchMap.get(row.id) ?? [],
      }));
    },
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
