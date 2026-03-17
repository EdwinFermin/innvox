export type AccountType = "bank" | "petty_cash";
export type Currency = "DOP" | "USD";
export type PaymentMethod = "cash" | "bank";

export interface BankAccount {
  id: string;
  friendly_id: string;
  branch_id: string | null;
  account_type: AccountType;
  bank_name: string | null;
  account_number: string | null;
  account_name: string;
  icon_url: string | null;
  current_balance: number;
  currency: Currency;
  is_active: boolean;
  is_public: boolean | null;
  created_at: string;
  created_by: string | null;
  /** Populated from bank_account_branches junction table */
  branch_ids: string[];
}
