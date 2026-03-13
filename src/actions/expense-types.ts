"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function createExpenseType(name: string) {
  await requirePermission(PERMISSIONS.settingsManage);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.from("expense_types").insert({ name });

  if (error) {
    throw new Error(
      `Error al crear el tipo de gasto: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/configuracion");
}

export async function deleteExpenseType(id: string) {
  await requirePermission(PERMISSIONS.settingsManage);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("expense_types")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Error al eliminar el tipo de gasto: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/configuracion");
}
