import { useQuery } from "@tanstack/react-query";
import { collection, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice } from "@/types/invoice.types";

export function useInvoices() {
  const query = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "invoices"));

      return Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();

          const clientSnap = await getDoc(data.client);
          const userSnap = await getDoc(data.user);

          return {
            id: d.id,
            ...data,
            client: clientSnap.data() ?? null,
            user: userSnap.data() ?? null,
          } as Invoice;
        })
      );
    },
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
