import { useQuery } from "@tanstack/react-query";
import { collection, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice } from "@/types/invoice.types";
import { Client } from "@/types/client.types";
import { User } from "@/types/auth.types";

export function useInvoices() {
  const query = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "invoices"));

      return Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const clientRef = data.client;
          const userRef = data.user;

          const [clientSnap, userSnap] = await Promise.all([
            clientRef ? getDoc(clientRef) : Promise.resolve(null),
            userRef ? getDoc(userRef) : Promise.resolve(null),
          ]);

          const clientData = clientSnap?.data();
          const userData = userSnap?.data();

          const client =
            clientSnap && clientSnap.exists()
              ? ({ id: clientSnap.id, ...(clientData ?? {}) } as Client)
              : null;
          const user =
            userSnap && userSnap.exists()
              ? ({ id: userSnap.id, ...(userData ?? {}) } as User)
              : null;

          return {
            id: d.id,
            invoiceType: data.invoiceType,
            NCF: data.NCF ?? null,
            clientId: clientRef?.id ?? "",
            client,
            description: data.description,
            amount: data.amount,
            ITBIS: data.ITBIS,
            createdAt: data.createdAt,
            userId: userRef?.id ?? "",
            user,
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
