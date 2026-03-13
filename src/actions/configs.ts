"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

interface ConfigData {
  NCF?: Json;
  CF?: Json;
  ITBIS?: Json;
  EXCENTO?: Json;
  GRAVADO?: Json;
}

export async function updateConfigs(data: ConfigData) {
  await requirePermission(PERMISSIONS.settingsManage);

  const supabase = await getSupabaseServerClient();

  const entries = Object.entries(data).filter(
    ([, value]) => value !== undefined,
  );

  if (entries.length === 0) {
    return;
  }

  const rows = entries.map(([key, value]) => ({
    key,
    value: value as Json,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("configs")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    throw new Error(
      `Error al actualizar la configuración: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/configuracion");
}
