"use server";

import { revalidatePath } from "next/cache";

import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface CreateIncomeData {
  branchId: string;
  incomeTypeId: string;
  amount: number;
  description?: string | null;
  date: string;
  bankAccountId?: string | null;
}

interface UpdateIncomeAccountData {
  incomeId: string;
  bankAccountId: string;
}

export async function createIncome(data: CreateIncomeData) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("create_income", {
    p_branch_id: data.branchId,
    p_income_type_id: data.incomeTypeId,
    p_amount: data.amount,
    p_description: data.description ?? null,
    p_date: data.date,
    p_bank_account_id: data.bankAccountId ?? null,
    p_created_by: session.user.id,
  });

  if (error) {
    throw new Error(`Error al registrar el ingreso: ${error.message}`);
  }

  revalidatePath("/dashboard/ingresos");
}

export async function deleteIncome(id: string) {
  await requireAuth();

  const supabase = await getSupabaseServerClient();

  // Delete the financial movement and get the bank account id
  const { data: bankAccountId, error: deleteError } = await supabase.rpc(
    "delete_financial_movement",
    {
      p_kind: "income",
      p_movement_id: id,
    },
  );

  if (deleteError) {
    throw new Error(`Error al eliminar el ingreso: ${deleteError.message}`);
  }

  // Repair balances if the income was linked to a bank account
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

  revalidatePath("/dashboard/ingresos");
}

export async function updateIncomeAccount(data: UpdateIncomeAccountData) {
  await requirePermission(PERMISSIONS.dataDelete);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("update_income_account", {
    p_income_id: data.incomeId,
    p_bank_account_id: data.bankAccountId,
  });

  if (error) {
    throw new Error(`Error al actualizar la cuenta del ingreso: ${error.message}`);
  }

  revalidatePath("/dashboard/transactions/incomes");
}
