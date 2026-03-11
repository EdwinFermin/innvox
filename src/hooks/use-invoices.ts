import { useQuery } from "@tanstack/react-query";
import { collection, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice } from "@/types/invoice.types";

const EMPTY: Invoice[] = [];
import { Client } from "@/types/client.types";
import { User } from "@/types/auth.types";

type UseInvoicesOptions = {
  role?: "ADMIN" | "USER";
};

export function useInvoices(userId = "", options: UseInvoicesOptions = {}) {
  const isUserRole = options.role === "USER";

  const queryResult = useQuery<Invoice[]>({
    queryKey: ["invoices", userId, isUserRole ? "mine" : "all"],
    queryFn: async () => {
      const invoicesRef = collection(db, "invoices");
      const snap = isUserRole
        ? await getDocs(query(invoicesRef, where("createdBy", "==", userId)))
        : await getDocs(invoicesRef);

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
            invoiceType: "FISCAL",
            NCF: data.NCF ?? null,
            clientId: clientRef?.id ?? "",
            client,
            description: String(data.description ?? ""),
            amount: Number(data.amount ?? 0),
            montoExento: Number(data.montoExento ?? 0),
            montoGravado: Number(data.montoGravado ?? 0),
            ITBIS: Number(data.ITBIS ?? 0),
            createdAt: data.createdAt,
            userId: userRef?.id ?? "",
            user,
            createdBy: String(data.createdBy ?? userRef?.id ?? data.userId ?? ""),
          } as Invoice;
        })
      );
    },
    enabled: isUserRole ? !!userId : true,
  });

  return {
    ...queryResult,
    data: queryResult.data ?? EMPTY,
  };
}
