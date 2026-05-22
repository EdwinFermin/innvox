"use server";

import { revalidatePath } from "next/cache";

import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveSessionUserId } from "@/lib/auth/session-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dateOnlyToISOString } from "@/utils/dates";

interface CreateReceivableData {
  branch_id?: string | null;
  client_id: string;
  name: string;
  amount: number;
  due_date: string;
  description?: string | null;
  status: string;
}

interface PayReceivableData {
  receivableId: string;
  amount: number;
  incomeTypeId: string;
  bankAccountId: string;
  date: string;
}

export async function createReceivable(data: CreateReceivableData) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();
  const createdBy = await resolveSessionUserId(session, supabase);

  const { error } = await supabase.from("receivables").insert({
    branch_id: data.branch_id ?? null,
    client_id: data.client_id,
    name: data.name,
    amount: data.amount,
    paid_amount: 0,
    due_date: dateOnlyToISOString(data.due_date),
    description: data.description ?? null,
    status: data.status,
    created_by: createdBy,
  });

  if (error) {
    throw new Error(
      `Error al crear la cuenta por cobrar: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/receivables");
}

export async function payReceivable(data: PayReceivableData) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();
  const createdBy = await resolveSessionUserId(session, supabase);

  const { error } = await supabase.rpc("pay_receivable", {
    p_receivable_id: data.receivableId,
    p_amount: data.amount,
    p_income_type_id: data.incomeTypeId,
    p_bank_account_id: data.bankAccountId,
    p_date: dateOnlyToISOString(data.date),
    p_created_by: createdBy,
  });

  if (error) {
    throw new Error(`Error al registrar el cobro: ${error.message}`);
  }

  revalidatePath("/dashboard/receivables");
  revalidatePath("/dashboard/transactions/incomes");
  revalidatePath("/dashboard/bank-accounts");
}

export async function deleteReceivable(id: string) {
  await requirePermission(PERMISSIONS.dataDelete);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("receivables")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Error al eliminar la cuenta por cobrar: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/receivables");
}
