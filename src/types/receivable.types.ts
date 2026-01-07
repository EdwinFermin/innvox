import { Timestamp } from "firebase/firestore";

export interface Receivable {
  id: string;
  branchId?: string;
  name: string;
  amount: number;
  dueDate: Timestamp;
  description: string;
  status: string;
  createdAt: Timestamp;
}
