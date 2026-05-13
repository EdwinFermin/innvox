export interface Branch {
  id: string;
  code: string;
  name: string;
  created_at: string;
  default_cash_account_id: string | null;
  enviosrd_branch_key: string | null;
}
