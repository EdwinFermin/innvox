import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Payable } from "@/types/payable.types";

type UsePayablesOptions = {
  role?: "ADMIN" | "USER";
};

export function usePayables(userId: string, options: UsePayablesOptions = {}) {
  const isUserRole = options.role === "USER";

  const queryResult = useQuery({
    queryKey: ["payables", userId, isUserRole ? "mine" : "all"],
    queryFn: async (): Promise<Payable[]> => {
      const ref = collection(db, "payables");
      const snapshot = isUserRole
        ? await getDocs(query(ref, where("createdBy", "==", userId)))
        : await getDocs(ref);

      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Payable[];
    },
    enabled: isUserRole ? !!userId : true,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? [],
  };
}
