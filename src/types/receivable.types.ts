export interface Receivable {
  id: string;
  friendly_id: string;
  branch_id: string | null;
  client_id: string | null;
  name: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  description: string | null;
  status: string;
  source_bank_transaction_id: string | null;
  created_at: string;
  created_by: string | null;
}
