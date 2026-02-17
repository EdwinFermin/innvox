import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Branch } from "@/types/branch.types";

export function useBranches(userId: string, allowedBranchIds?: string[]) {
  const query = useQuery({
    queryKey: [
      "branches",
      userId,
      [...(allowedBranchIds ?? [])].sort().join(","),
    ],
    queryFn: async (): Promise<Branch[]> => {
      const ref = collection(db, "branches");
      const snapshot = await getDocs(ref);
      const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Branch));

      if (allowedBranchIds && allowedBranchIds.length > 0) {
        const set = new Set(allowedBranchIds);
        return all.filter((b) => set.has(b.id));
      }

      return all;
    },
    enabled: !!userId,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
