"use server";

import { revalidatePath } from "next/cache";

import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveSessionUserId } from "@/lib/auth/session-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { OperatingCostFrequency } from "@/types/operating-cost.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateOperatingCostData {
  branchId: string;
  expenseTypeId: string;
  name: string;
  defaultAmount: number;
  currency: "DOP" | "USD";
  allowsCustomAmount: boolean;
  frequency: OperatingCostFrequency;
  customIntervalDays?: number | null;
  dayOfMonth?: number | null;
  description?: string | null;
}

interface UpdateOperatingCostData {
  branchId?: string;
  expenseTypeId?: string;
  name?: string;
  defaultAmount?: number;
  currency?: "DOP" | "USD";
  allowsCustomAmount?: boolean;
  frequency?: OperatingCostFrequency;
  customIntervalDays?: number | null;
  dayOfMonth?: number | null;
  description?: string | null;
}

interface CompleteAlertData {
  alertId: string;
  actualAmount: number;
  bankAccountId?: string | null;
  skipExpense?: boolean;
  lbtrFee?: number;
  transferTax?: number;
}

// ---------------------------------------------------------------------------
// CRUD – Operating Costs (admin only)
// ---------------------------------------------------------------------------

export async function createOperatingCost(data: CreateOperatingCostData) {
  const session = await requirePermission(PERMISSIONS.settingsManage);

  const supabase = await getSupabaseServerClient();
  const createdBy = await resolveSessionUserId(session, supabase);

  const { error } = await supabase.from("operating_costs").insert({
    branch_id: data.branchId,
    expense_type_id: data.expenseTypeId,
    name: data.name,
    default_amount: data.defaultAmount,
    currency: data.currency,
    allows_custom_amount: data.allowsCustomAmount,
    frequency: data.frequency,
    custom_interval_days: data.customIntervalDays ?? null,
    day_of_month: data.dayOfMonth ?? null,
    description: data.description ?? null,
    created_by: createdBy,
  });

  if (error) {
    throw new Error(`Error al crear el costo operativo: ${error.message}`);
  }

  revalidatePath("/dashboard/costos-operativos");
}

export async function updateOperatingCost(
  id: string,
  data: UpdateOperatingCostData,
) {
  await requirePermission(PERMISSIONS.settingsManage);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("operating_costs")
    .update({
      branch_id: data.branchId,
      expense_type_id: data.expenseTypeId,
      name: data.name,
      default_amount: data.defaultAmount,
      currency: data.currency,
      allows_custom_amount: data.allowsCustomAmount,
      frequency: data.frequency,
      custom_interval_days: data.customIntervalDays,
      day_of_month: data.dayOfMonth,
      description: data.description,
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Error al actualizar el costo operativo: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/costos-operativos");
}

export async function toggleOperatingCostActive(
  id: string,
  isActive: boolean,
) {
  await requirePermission(PERMISSIONS.settingsManage);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("operating_costs")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Error al cambiar estado del costo operativo: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/costos-operativos");
}

export async function deleteOperatingCost(id: string) {
  await requirePermission(PERMISSIONS.dataDelete);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("operating_costs")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Error al eliminar el costo operativo: ${error.message}`);
  }

  revalidatePath("/dashboard/costos-operativos");
}

// ---------------------------------------------------------------------------
// Alert generation
// ---------------------------------------------------------------------------

export async function generateAlerts() {
  await requireAuth();

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("generate_operating_cost_alerts");

  if (error) {
    throw new Error(`Error al generar alertas: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/costos-operativos");
}

// ---------------------------------------------------------------------------
// Alert completion (admin only)
// ---------------------------------------------------------------------------

export async function completeAlert(data: CompleteAlertData) {
  const session = await requirePermission(PERMISSIONS.settingsManage);

  const supabase = await getSupabaseServerClient();
  const completedBy = await resolveSessionUserId(session, supabase);

  const { error } = await supabase.rpc("complete_operating_cost_alert", {
    p_alert_id: data.alertId,
    p_actual_amount: data.actualAmount,
    p_bank_account_id: data.skipExpense ? null : (data.bankAccountId ?? null),
    p_completed_by: completedBy,
    p_lbtr_fee: data.lbtrFee ?? 0,
    p_transfer_tax: data.transferTax ?? 0,
    p_skip_expense: data.skipExpense ?? false,
  });

  if (error) {
    throw new Error(`Error al completar la alerta: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/costos-operativos");
  revalidatePath("/dashboard/transactions/expenses");
}
