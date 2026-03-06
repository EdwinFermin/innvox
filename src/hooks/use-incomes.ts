import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Income } from "@/types/income.types";

type VisibilityScope = "all" | "mine";

type UseIncomesOptions = {
  role?: "ADMIN" | "USER";
};

export function useIncomes(userId: string, options: UseIncomesOptions = {}) {
  const isUserRole = options.role === "USER";
  const effectiveVisibility: VisibilityScope = isUserRole ? "mine" : "all";

  const queryResult = useQuery({
    queryKey: ["incomes", userId, effectiveVisibility],
    queryFn: async (): Promise<Income[]> => {
      const ref = collection(db, "incomes");
      const snapshot =
        isUserRole
          ? await getDocs(query(ref, where("createdBy", "==", userId)))
          : await getDocs(ref);

      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Income[];
    },
    enabled: !!userId,
  });

  const baseData = queryResult.data ?? [];

  return {
    ...queryResult,
    data: baseData,
  };
}
