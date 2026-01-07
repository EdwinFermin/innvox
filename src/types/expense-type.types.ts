import { Timestamp } from "firebase/firestore";

export interface ExpenseType {
  id: string;
  name: string;
  createdAt: Timestamp;
}
