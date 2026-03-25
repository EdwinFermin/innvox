"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/guards";
import { resolveSessionUserId } from "@/lib/auth/session-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateGoogleWalletTokens } from "@/lib/wallet/google";
import { sendApplePassUpdateNotification, getApplePassTypeId } from "@/lib/wallet/apple";

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
  const newTokens = result?.new_tokens ?? 0;

  // Update wallet passes in the background (fire-and-forget)
  updateGoogleWalletTokens(clientId, newTokens).catch((err) =>
    console.error("Google Wallet update error:", err),
  );
  notifyAppleWalletDevices(clientId).catch((err) =>
    console.error("Apple Wallet push error:", err),
  );

  return {
    new_tokens: newTokens,
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

async function notifyAppleWalletDevices(clientId: string) {
  const passTypeId = getApplePassTypeId();
  if (!passTypeId) return;

  const supabase = getSupabaseAdminClient();
  const serialNumber = `loyalty-${clientId}`;

  // Find all devices registered for this pass
  const { data: devices } = await (supabase
    .from("apple_wallet_devices" as any)
    .select("push_token")
    .eq("pass_type_id", passTypeId)
    .eq("serial_number", serialNumber) as unknown as Promise<{ data: { push_token: string }[] | null }>);

  if (!devices || devices.length === 0) return;

  // Update the updated_at so the device knows the pass changed
  await (supabase
    .from("apple_wallet_devices" as any)
    .update({ updated_at: new Date().toISOString() } as any)
    .eq("pass_type_id", passTypeId)
    .eq("serial_number", serialNumber) as any);

  // Send push notification to each device
  for (const device of devices) {
    await sendApplePassUpdateNotification(device.push_token).catch(() => {});
  }
}
