import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { LinkPayment } from "@/types/link-payment.types";

type UseLinkPaymentsOptions = {
  role?: "ADMIN" | "USER";
};

export function useLinkPayments(
  userId: string,
  options: UseLinkPaymentsOptions = {},
) {
  const isUserRole = options.role === "USER";

  const queryResult = useQuery({
    queryKey: ["linkPayments", userId, isUserRole ? "mine" : "all"],
    queryFn: async (): Promise<LinkPayment[]> => {
      const ref = collection(db, "linkPayments");
      const snapshot = isUserRole
        ? await getDocs(query(ref, where("createdBy", "==", userId)))
        : await getDocs(ref);

      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as LinkPayment[];
    },
    enabled: isUserRole ? !!userId : true,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? [],
  };
}
