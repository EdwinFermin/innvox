"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function createIncomeType(name: string) {
  await requirePermission(PERMISSIONS.settingsManage);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.from("income_types").insert({ name });

  if (error) {
    throw new Error(
      `Error al crear el tipo de ingreso: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/configuracion");
}

export async function deleteIncomeType(id: string) {
  await requirePermission(PERMISSIONS.settingsManage);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("income_types")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Error al eliminar el tipo de ingreso: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/configuracion");
}
