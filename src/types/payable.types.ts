import { Timestamp } from "firebase/firestore";

export interface Payable {
  id: string;
  branchId?: string;
  name: string;
  amount: number;
  dueDate: Timestamp;
  description: string;
  status: string;
  createdAt: Timestamp;
}
