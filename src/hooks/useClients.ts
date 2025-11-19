import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Client } from "@/types/client.types";

export function useClients(userId: string) {
  const query = useQuery({
    queryKey: ["clients", userId],
    queryFn: async (): Promise<Client[]> => {
      const ref = collection(db, "clients");
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
    },
    enabled: !!userId,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
