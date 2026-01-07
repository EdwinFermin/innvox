import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Branch } from "@/types/branch.types";

export function useBranches(userId: string) {
  const query = useQuery({
    queryKey: ["branches", userId],
    queryFn: async (): Promise<Branch[]> => {
      const ref = collection(db, "branches");
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Branch));
    },
    enabled: !!userId,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
