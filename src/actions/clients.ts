"use server";

import { revalidatePath } from "next/cache";

import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function createClient(data: { po_box: string; name: string }) {
  const { po_box: poBox, name } = data;
  await requirePermission(PERMISSIONS.clientsCreate);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.from("clients").insert({
    id: poBox,
    name,
  });

  if (error) {
    throw new Error(`Error al crear el cliente: ${error.message}`);
  }

  revalidatePath("/dashboard/clients");
}

export async function deleteClient(id: string) {
  await requireAuth();

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    throw new Error(`Error al eliminar el cliente: ${error.message}`);
  }

  revalidatePath("/dashboard/clients");
}
