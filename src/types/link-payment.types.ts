export type LinkPaymentStatus = "pending" | "completed";

export interface LinkPayment {
  id: string;
  branch_id: string;
  amount: number;
  payment_url: string;
  status: LinkPaymentStatus;
  created_at: string;
  created_by: string | null;
  completed_at: string | null;
}
