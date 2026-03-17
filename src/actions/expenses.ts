"use server";

import { revalidatePath } from "next/cache";

import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveSessionUserId } from "@/lib/auth/session-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface CreateExpenseData {
  branchId: string;
  expenseTypeId: string;
  amount: number;
  description?: string | null;
  date: string;
  bankAccountId?: string | null;
}

interface UpdateExpenseAccountData {
  expenseId: string;
  bankAccountId: string;
}

export async function createExpense(data: CreateExpenseData) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();
  const createdBy = await resolveSessionUserId(session, supabase);

  const { error } = await supabase.rpc("create_expense", {
    p_branch_id: data.branchId,
    p_expense_type_id: data.expenseTypeId,
    p_amount: data.amount,
    p_description: data.description ?? null,
    p_date: data.date,
    p_bank_account_id: data.bankAccountId ?? null,
    p_created_by: createdBy,
  });

  if (error) {
    throw new Error(`Error al registrar el gasto: ${error.message}`);
  }

  revalidatePath("/dashboard/gastos");
}

export async function deleteExpense(id: string) {
  await requireAuth();

  const supabase = await getSupabaseServerClient();

  // Delete the financial movement and get the bank account id
  const { data: bankAccountId, error: deleteError } = await supabase.rpc(
    "delete_financial_movement",
    {
      p_kind: "expense",
      p_movement_id: id,
    },
  );

  if (deleteError) {
    throw new Error(`Error al eliminar el gasto: ${deleteError.message}`);
  }

  // Repair balances if the expense was linked to a bank account
  if (bankAccountId) {
    const { error: repairError } = await supabase.rpc(
      "repair_bank_transaction_balances",
      { p_bank_account_id: bankAccountId },
    );

    if (repairError) {
      throw new Error(
        `Error al recalcular balances: ${repairError.message}`,
      );
    }
  }

  revalidatePath("/dashboard/gastos");
}

export async function updateExpenseAccount(data: UpdateExpenseAccountData) {
  await requirePermission(PERMISSIONS.dataDelete);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("update_expense_account", {
    p_expense_id: data.expenseId,
    p_bank_account_id: data.bankAccountId,
  });

  if (error) {
    throw new Error(`Error al actualizar la cuenta del gasto: ${error.message}`);
  }

  revalidatePath("/dashboard/transactions/expenses");
}
