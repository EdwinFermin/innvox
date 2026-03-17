"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/guards";
import { resolveSessionUserId } from "@/lib/auth/session-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface CreatePayableData {
  branch_id?: string | null;
  name: string;
  amount: number;
  due_date: string;
  description?: string | null;
  status: string;
}

export async function createPayable(data: CreatePayableData) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();
  const createdBy = await resolveSessionUserId(session, supabase);

  const { error } = await supabase.from("payables").insert({
    branch_id: data.branch_id ?? null,
    name: data.name,
    amount: data.amount,
    due_date: data.due_date,
    description: data.description ?? null,
    status: data.status,
    created_by: createdBy,
  });

  if (error) {
    throw new Error(
      `Error al crear la cuenta por pagar: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/cuentas-por-pagar");
}

export async function deletePayable(id: string) {
  await requireAuth();

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("payables")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Error al eliminar la cuenta por pagar: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/cuentas-por-pagar");
}
