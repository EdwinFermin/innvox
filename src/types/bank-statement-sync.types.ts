export type BankStatementItemStatus =
  | "new"
  | "duplicate"
  | "conflict"
  | "ignored"
  | "applied";

export type BankStatementTransactionType = "deposit" | "withdrawal";

export interface BankStatementMovement {
  source_fingerprint: string;
  external_reference: string | null;
  transaction_date: string;
  description: string;
  transaction_type: BankStatementTransactionType;
  amount: number;
  debit_amount: number | null;
  credit_amount: number | null;
  statement_balance_after: number | null;
  raw_payload: Record<string, string | number | null>;
}

export interface ParsedBankStatement {
  bank_name: string | null;
  statement_account_number: string | null;
  statement_account_last4: string | null;
  currency: "DOP" | "USD";
  period_start: string | null;
  period_end: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  movements: BankStatementMovement[];
  issues: string[];
}

export interface BankStatementImportItemPreview extends BankStatementMovement {
  id: string;
  status: BankStatementItemStatus;
  matched_bank_transaction_id: string | null;
}

export interface BankStatementImportPreview {
  id: string;
  bank_account_id: string;
  file_name: string;
  bank_name: string | null;
  statement_account_number: string | null;
  statement_account_last4: string | null;
  currency: "DOP" | "USD";
  period_start: string | null;
  period_end: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  issues: string[];
  items: BankStatementImportItemPreview[];
}
