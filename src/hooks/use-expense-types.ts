import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { ExpenseType } from "@/types/expense-type.types";

export function useExpenseTypes(userId: string) {
  const query = useQuery({
    queryKey: ["expenseTypes", userId],
    queryFn: async (): Promise<ExpenseType[]> => {
      const ref = collection(db, "expenseTypes");
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as ExpenseType[];
    },
    enabled: !!userId,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
