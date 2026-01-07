import { Timestamp } from "firebase/firestore";

export interface Income {
  id: string;
  branchId: string;
  incomeTypeId: string;
  amount: number;
  description: string;
  date: Timestamp;
  createdAt: Timestamp;
}
