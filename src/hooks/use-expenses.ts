import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Expense } from "@/types/expense.types";

export function useExpenses(userId: string) {
  const query = useQuery({
    queryKey: ["expenses", userId],
    queryFn: async (): Promise<Expense[]> => {
      const ref = collection(db, "expenses");
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Expense[];
    },
    enabled: !!userId,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
