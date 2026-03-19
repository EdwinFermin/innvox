export type BankTransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer_in"
  | "transfer_out"
  | "adjustment"
  | "lbtr_fee"
  | "transfer_tax";

export interface BankTransaction {
  id: string;
  friendly_id: string;
  bank_account_id: string;
  type: BankTransactionType;
  amount: number;
  description: string | null;
  date: string;
  balance_after: number;
  linked_expense_id: string | null;
  linked_income_id: string | null;
  related_transfer_id: string | null;
  related_account_id: string | null;
  created_at: string;
  created_by: string | null;
  linked_income_friendly_id?: string | null;
  linked_expense_friendly_id?: string | null;
  related_transfer_friendly_id?: string | null;
  related_account_name?: string | null;
  related_account_number_last4?: string | null;
}
