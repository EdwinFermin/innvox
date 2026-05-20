export interface AccountBalanceDiagnosis {
  account_name: string;
  currency: string;
  current_balance: number;
  transaction_count: number;
  opening_balance: number;
  movements_sum: number;
  /** opening + Σ movements: what current_balance should be if the ledger is intact */
  reconstructed_balance: number;
  /** current_balance − reconstructed_balance. Non-zero ⇒ valor fantasma */
  phantom_offset: number;
  /** rows whose stored balance_after breaks the date-ordered running chain */
  chain_breaks: number;
  /** whether the most recent (by date) balance_after equals current_balance */
  last_balance_after_matches: boolean;
}
