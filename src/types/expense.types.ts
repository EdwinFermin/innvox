import { Timestamp } from "firebase/firestore";
import { PaymentMethod } from "./bank-account.types";

export interface Expense {
  id: string;
  branchId: string;
  expenseTypeId: string;
  amount: number;
  description: string;
  date: Timestamp;
  paymentMethod: PaymentMethod;
  bankAccountId?: string; // Required if paymentMethod is "bank"
  bankTransactionId?: string; // Reference to the auto-created bank transaction
  createdAt: Timestamp;
  createdBy?: string;
}
