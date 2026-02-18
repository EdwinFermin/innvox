import { Timestamp } from "firebase/firestore";
import { User } from "./auth.types";
import { Client } from "./client.types";

export interface Invoice {
  id: string;
  invoiceType: "FISCAL";
  NCF: string | null;
  clientId: string;
  client: Client | null;
  description: string;
  amount: number;
  montoExento: number;
  montoGravado: number;
  ITBIS: number;
  createdAt: Timestamp;
  userId: string;
  user: User | null;
}
