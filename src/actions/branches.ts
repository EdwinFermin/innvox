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

interface UpdateBranchSyncSettingsData {
  id: string;
  default_cash_account_id: string | null;
  enviosrd_branch_key: string | null;
}

export async function updateBranchSyncSettings(data: UpdateBranchSyncSettingsData) {
  await requirePermission(PERMISSIONS.branchesManage);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("branches")
    .update({
      default_cash_account_id: data.default_cash_account_id,
      enviosrd_branch_key: data.enviosrd_branch_key,
    })
    .eq("id", data.id);

  if (error) {
    throw new Error(`Error al actualizar la sucursal: ${error.message}`);
  }

  revalidatePath("/dashboard/branches");
  revalidatePath("/dashboard/sync-cuadres");
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
