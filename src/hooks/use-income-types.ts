import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { IncomeType } from "@/types/income-type.types";

export function useIncomeTypes(userId: string) {
  const query = useQuery({
    queryKey: ["incomeTypes", userId],
    queryFn: async (): Promise<IncomeType[]> => {
      const ref = collection(db, "incomeTypes");
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as IncomeType[];
    },
    enabled: !!userId,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
