import { Timestamp } from "firebase/firestore";

export interface Expense {
  id: string;
  branchId: string;
  expenseTypeId: string;
  amount: number;
  description: string;
  date: Timestamp;
  createdAt: Timestamp;
}
