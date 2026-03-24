"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/guards";
import { resolveSessionUserId } from "@/lib/auth/session-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function adjustTokens(
  clientId: string,
  delta: number,
  eventType: string = "manual",
  note?: string,
) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();
  const userId = await resolveSessionUserId(session, supabase);

  const { data, error } = await supabase.rpc("adjust_tokens", {
    p_client_id: clientId,
    p_delta: delta,
    p_event_type: eventType,
    p_note: note ?? null,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Error al ajustar tokens: ${error.message}`);
  }

  revalidatePath("/dashboard/loyalty");

  const result = Array.isArray(data) ? data[0] : data;
  return {
    new_tokens: result?.new_tokens ?? 0,
    was_reset: result?.was_reset ?? false,
  };
}

interface RegisterLoyaltyClientData {
  name: string;
  phone: string;
  email?: string;
  po_box?: string;
}

export async function registerLoyaltyClient(data: RegisterLoyaltyClientData) {
  const supabase = getSupabaseAdminClient();

  if (data.po_box) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("id", data.po_box)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("clients")
        .update({
          name: data.name,
          phone: data.phone,
          email: data.email ?? null,
        })
        .eq("id", data.po_box);

      if (error) {
        throw new Error(`Error al actualizar el cliente: ${error.message}`);
      }

      return { clientId: data.po_box, isNew: false };
    }
  }

  const clientId = data.po_box || `LY-${Date.now().toString(36).toUpperCase()}`;

  const { error } = await supabase.from("clients").insert({
    id: clientId,
    name: data.name,
    phone: data.phone,
    email: data.email ?? null,
  });

  if (error) {
    throw new Error(`Error al registrar el cliente: ${error.message}`);
  }

  return { clientId, isNew: true };
}
