import { Timestamp } from "firebase/firestore";

export interface IncomeType {
  id: string;
  name: string;
  createdAt: Timestamp;
}
