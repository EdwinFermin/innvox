"use server";

import { revalidatePath } from "next/cache";

import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface CreateInvoiceData {
  id: string;
  invoiceType: string;
  clientId?: string | null;
  description?: string | null;
  amount: number;
  montoExento?: number;
  montoGravado?: number;
  itbis?: number;
  userId?: string | null;
}

export async function createInvoice(data: CreateInvoiceData) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();

  // Generate NCF via RPC
  const { data: ncf, error: ncfError } = await supabase.rpc("generate_ncf");

  if (ncfError) {
    throw new Error(`Error al generar el NCF: ${ncfError.message}`);
  }

  // Insert the invoice
  const { error } = await supabase.from("invoices").insert({
    id: data.id,
    invoice_type: data.invoiceType,
    ncf,
    client_id: data.clientId ?? null,
    description: data.description ?? null,
    amount: data.amount,
    monto_exento: data.montoExento ?? 0,
    monto_gravado: data.montoGravado ?? 0,
    itbis: data.itbis ?? 0,
    user_id: data.userId ?? null,
    created_by: session.user.id,
  });

  if (error) {
    throw new Error(`Error al crear la factura: ${error.message}`);
  }

  revalidatePath("/dashboard/facturas");
}

export async function deleteInvoice(id: string) {
  await requirePermission(PERMISSIONS.dataDelete);

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("delete_invoice", {
    p_invoice_id: id,
  });

  if (error) {
    throw new Error(`Error al eliminar la factura: ${error.message}`);
  }

  revalidatePath("/dashboard/facturas");
}
