export interface Payable {
  id: string;
  friendly_id: string;
  branch_id: string | null;
  name: string;
  amount: number;
  due_date: string;
  description: string | null;
  status: string;
  created_at: string;
  created_by: string | null;
}
