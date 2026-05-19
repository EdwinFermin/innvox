"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveSessionUserId } from "@/lib/auth/session-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const createExpenseSchema = z.object({
  branchId: z.string().min(1),
  expenseTypeId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  description: z.string().trim().min(1).nullable().optional(),
  date: z.string().min(1),
  bankAccountId: z.string().uuid().nullable().optional(),
  lbtrFee: z.coerce.number().min(0).optional(),
  transferTax: z.coerce.number().min(0).optional(),
});

interface CreateExpenseData {
  branchId: string;
  expenseTypeId: string;
  amount: number;
  description?: string | null;
  date: string;
  bankAccountId?: string | null;
  lbtrFee?: number;
  transferTax?: number;
}

interface UpdateExpenseAccountData {
  expenseId: string;
  bankAccountId: string;
}

export async function createExpense(data: CreateExpenseData) {
  const session = await requireAuth();
  const validated = createExpenseSchema.parse(data);

  const supabase = await getSupabaseServerClient();
  const createdBy = await resolveSessionUserId(session, supabase);

  await validateCreateExpenseReferences({
    supabase,
    session,
    data: validated,
  });

  const { error } = await supabase.rpc("create_expense", {
    p_branch_id: validated.branchId,
    p_expense_type_id: validated.expenseTypeId,
    p_amount: validated.amount,
    p_description: validated.description ?? null,
    p_date: validated.date,
    p_bank_account_id: validated.bankAccountId ?? null,
    p_created_by: createdBy,
    p_lbtr_fee: validated.lbtrFee ?? 0,
    p_transfer_tax: validated.transferTax ?? 0,
  });

  if (error) {
    throw new Error(`Error al registrar el gasto: ${error.message}`);
  }

  revalidatePath("/dashboard/transactions/expenses");
}

async function validateCreateExpenseReferences(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  session: Awaited<ReturnType<typeof requireAuth>>;
  data: z.infer<typeof createExpenseSchema>;
}) {
  const { supabase, session, data } = params;
  const expenseDate = new Date(data.date);

  if (Number.isNaN(expenseDate.getTime())) {
    throw new Error("La fecha del gasto no es válida.");
  }

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  if (expenseDate > todayEnd) {
    throw new Error("La fecha del gasto no puede estar en el futuro.");
  }

  if (
    session.user.role === "USER" &&
    !(session.user.branchIds ?? []).includes(data.branchId)
  ) {
    throw new Error("No tienes acceso a la sucursal seleccionada.");
  }

  const [branchResult, expenseTypeResult] = await Promise.all([
    supabase.from("branches").select("id").eq("id", data.branchId).maybeSingle(),
    supabase
      .from("expense_types")
      .select("id")
      .eq("id", data.expenseTypeId)
      .maybeSingle(),
  ]);

  if (branchResult.error) {
    throw new Error(`Error al validar sucursal: ${branchResult.error.message}`);
  }
  if (!branchResult.data) {
    throw new Error("La sucursal seleccionada no existe.");
  }

  if (expenseTypeResult.error) {
    throw new Error(
      `Error al validar tipo de gasto: ${expenseTypeResult.error.message}`,
    );
  }
  if (!expenseTypeResult.data) {
    throw new Error("El tipo de gasto seleccionado no existe.");
  }

  if (!data.bankAccountId) {
    return;
  }

  const [accountResult, accountBranchesResult] = await Promise.all([
    supabase
      .from("bank_accounts")
      .select("id, branch_id, is_active")
      .eq("id", data.bankAccountId)
      .maybeSingle(),
    supabase
      .from("bank_account_branches")
      .select("branch_id")
      .eq("bank_account_id", data.bankAccountId),
  ]);

  if (accountResult.error) {
    throw new Error(`Error al validar cuenta: ${accountResult.error.message}`);
  }
  if (!accountResult.data) {
    throw new Error("La cuenta financiera seleccionada no existe.");
  }
  if (!accountResult.data.is_active) {
    throw new Error("La cuenta financiera seleccionada no está activa.");
  }

  if (accountBranchesResult.error) {
    throw new Error(
      `Error al validar sucursales de la cuenta: ${accountBranchesResult.error.message}`,
    );
  }

  const supportsBranch =
    accountResult.data.branch_id === data.branchId ||
    (accountBranchesResult.data ?? []).some((row) => row.branch_id === data.branchId);

  if (!supportsBranch) {
    throw new Error("La cuenta financiera no pertenece a la sucursal seleccionada.");
  }
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

  revalidatePath("/dashboard/transactions/expenses");
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
