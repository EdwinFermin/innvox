"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function createBranch(data: { code: string; name: string }) {
  const { code, name } = data;
  await requirePermission(PERMISSIONS.branchesManage);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.from("branches").insert({
    id: code,
    name,
  });

  if (error) {
    throw new Error(`Error al crear la sucursal: ${error.message}`);
  }

  revalidatePath("/dashboard/sucursales");
}

export async function deleteBranch(id: string) {
  await requirePermission(PERMISSIONS.branchesManage);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.from("branches").delete().eq("id", id);

  if (error) {
    throw new Error(`Error al eliminar la sucursal: ${error.message}`);
  }

  revalidatePath("/dashboard/sucursales");
}
