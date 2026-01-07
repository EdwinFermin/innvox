import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Receivable } from "@/types/receivable.types";

export function useReceivables(userId: string) {
  const query = useQuery({
    queryKey: ["receivables", userId],
    queryFn: async (): Promise<Receivable[]> => {
      const ref = collection(db, "receivables");
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Receivable[];
    },
    enabled: !!userId,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
