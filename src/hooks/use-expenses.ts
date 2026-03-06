import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Expense } from "@/types/expense.types";

type VisibilityScope = "all" | "mine";

type UseExpensesOptions = {
  role?: "ADMIN" | "USER";
};

export function useExpenses(userId: string, options: UseExpensesOptions = {}) {
  const isUserRole = options.role === "USER";
  const effectiveVisibility: VisibilityScope = isUserRole ? "mine" : "all";

  const queryResult = useQuery({
    queryKey: ["expenses", userId, effectiveVisibility],
    queryFn: async (): Promise<Expense[]> => {
      const ref = collection(db, "expenses");
      const snapshot =
        isUserRole
          ? await getDocs(query(ref, where("createdBy", "==", userId)))
          : await getDocs(ref);

      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Expense[];
    },
    enabled: !!userId,
  });

  const baseData = queryResult.data ?? [];

  return {
    ...queryResult,
    data: baseData,
  };
}
