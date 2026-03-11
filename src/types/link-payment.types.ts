import { Timestamp } from "firebase/firestore";

export type LinkPaymentStatus = "pending" | "completed";

export interface LinkPayment {
  id: string;
  branchId: string;
  amount: number;
  paymentUrl: string;
  status: LinkPaymentStatus;
  createdAt: Timestamp;
  createdBy?: string;
  completedAt?: Timestamp;
}
