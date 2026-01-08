import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { User } from "@/types/auth.types";

export function useUsers() {
  const query = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const snapshot = await getDocs(collection(db, "users"));
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        branchIds: [],
        ...(docSnap.data() as Omit<User, "id">),
      }));
    },
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
