export type OperatingCostFrequency = "weekly" | "biweekly" | "monthly" | "custom";

export type OperatingCostAlertStatus = "pending" | "completed";

export interface OperatingCost {
  id: string;
  friendly_id: string;
  branch_id: string;
  expense_type_id: string;
  name: string;
  default_amount: number;
  currency: "DOP" | "USD";
  allows_custom_amount: boolean;
  frequency: OperatingCostFrequency;
  custom_interval_days: number | null;
  day_of_month: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface OperatingCostAlert {
  id: string;
  friendly_id: string;
  operating_cost_id: string;
  branch_id: string;
  due_date: string;
  status: OperatingCostAlertStatus;
  default_amount: number;
  actual_amount: number | null;
  bank_account_id: string | null;
  linked_expense_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  /** Joined from operating_costs */
  operating_cost_name?: string;
  expense_type_id?: string;
  allows_custom_amount?: boolean;
  currency?: "DOP" | "USD";
}
