import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Payable } from "@/types/payable.types";

export function usePayables(userId: string) {
  const query = useQuery({
    queryKey: ["payables", userId],
    queryFn: async (): Promise<Payable[]> => {
      const ref = collection(db, "payables");
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Payable[];
    },
    enabled: !!userId,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
