import type { PaymentMethod } from "./bank-account.types";

export interface Expense {
  id: string;
  branch_id: string;
  expense_type_id: string;
  amount: number;
  description: string | null;
  date: string;
  payment_method: PaymentMethod;
  bank_account_id: string | null;
  bank_transaction_id: string | null;
  created_at: string;
  created_by: string | null;
}
