import { Timestamp } from "firebase/firestore";

export type BankTransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer_in"
  | "transfer_out"
  | "adjustment";

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  type: BankTransactionType;
  amount: number;
  description: string;
  date: Timestamp;
  balanceAfter: number; // Snapshot of balance after this transaction

  // Links to source transactions (for reconciliation)
  linkedExpenseId?: string;
  linkedIncomeId?: string;

  // For transfers between accounts
  relatedTransferId?: string; // Links two transfer transactions together
  relatedAccountId?: string; // The other account in the transfer

  createdAt: Timestamp;
  createdBy: string;
}
