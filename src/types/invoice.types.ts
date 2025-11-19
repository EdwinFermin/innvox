import { Timestamp } from "firebase/firestore";
import { User } from "./auth.types";
import { Client } from "./client.types";

export interface Invoice {
  id: string;
  NCF: string;
  client: Client;
  description: string;
  amount: number;
  ITBIS: number;
  createdAt: Timestamp;
  user: User;
}
