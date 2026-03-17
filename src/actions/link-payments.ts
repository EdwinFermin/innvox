"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/guards";
import { resolveSessionUserId } from "@/lib/auth/session-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface CreateLinkPaymentData {
  branch_id: string;
  amount: number;
  payment_url: string;
}

export async function createLinkPayment(data: CreateLinkPaymentData) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();
  const createdBy = await resolveSessionUserId(session, supabase);

  const { error } = await supabase.from("link_payments").insert({
    branch_id: data.branch_id,
    amount: data.amount,
    payment_url: data.payment_url,
    status: "pending",
    created_by: createdBy,
  });

  if (error) {
    throw new Error(
      `Error al crear el link de pago: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/link-de-pago");
}

export async function completeLinkPayment(id: string) {
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("link_payments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Error al completar el link de pago: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/link-de-pago");
}

export async function deleteLinkPayment(id: string) {
  await requireAuth();

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("link_payments")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Error al eliminar el link de pago: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/link-de-pago");
}
