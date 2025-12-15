import { Timestamp } from "firebase/firestore";
import { User } from "./auth.types";
import { Client } from "./client.types";

export interface InvoiceItem {
  itemId: string;
  description: string;
  weight: string;
  pricePerPound?: number;
  tracking: string;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  invoiceType: "FINAL" | "RECEIPT" | "FISCAL";
  NCF: string | null;
  clientId: string;
  client: Client | null;
  items: InvoiceItem[];
  pricePerPound?: number;
  amount: number;
  ITBIS: number;
  createdAt: Timestamp;
  userId: string;
  user: User | null;
}
