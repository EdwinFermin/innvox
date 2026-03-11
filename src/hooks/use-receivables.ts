import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Receivable } from "@/types/receivable.types";

const EMPTY: Receivable[] = [];

type UseReceivablesOptions = {
  role?: "ADMIN" | "USER";
};

export function useReceivables(
  userId: string,
  options: UseReceivablesOptions = {},
) {
  const isUserRole = options.role === "USER";

  const queryResult = useQuery({
    queryKey: ["receivables", userId, isUserRole ? "mine" : "all"],
    queryFn: async (): Promise<Receivable[]> => {
      const ref = collection(db, "receivables");
      const snapshot = isUserRole
        ? await getDocs(query(ref, where("createdBy", "==", userId)))
        : await getDocs(ref);

      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Receivable[];
    },
    enabled: isUserRole ? !!userId : true,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
