import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Income } from "@/types/income.types";

export function useIncomes(userId: string) {
  const query = useQuery({
    queryKey: ["incomes", userId],
    queryFn: async (): Promise<Income[]> => {
      const ref = collection(db, "incomes");
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Income[];
    },
    enabled: !!userId,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
