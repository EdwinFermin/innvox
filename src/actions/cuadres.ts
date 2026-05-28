"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/guards";
import { resolveSessionUserId } from "@/lib/auth/session-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CuadreApplyResult,
  CuadreDateInput,
  CuadreFetchResult,
  CuadrePaymentKind,
  CuadrePreparedTransaction,
  CuadreSyncAssignment,
  EnviosRDCuadreResponse,
} from "@/types/cuadre.types";

const EXTERNAL_SOURCE = "enviosrd";

function classifyPaymentMethod(formaPago: string): CuadrePaymentKind {
  const normalized = formaPago.trim().toLowerCase();
  if (normalized.includes("efectivo")) return "efectivo";
  if (normalized.includes("transferencia")) return "transferencia";
  return "otro";
}

function toIsoFromEnviosRDFecha(value: string): string {
  // API returns "YYYY-MM-DD HH:MM:SS" in RD local time (UTC-4, no DST).
  const trimmed = value.trim().replace(" ", "T");
  if (/[+-]\d{2}:?\d{2}$|Z$/.test(trimmed)) return new Date(trimmed).toISOString();
  return new Date(`${trimmed}-04:00`).toISOString();
}

function validateDateInput(input: CuadreDateInput): void {
  if (input.mode === "single") {
    if (!input.date) throw new Error("Selecciona una fecha.");
    return;
  }
  if (!input.startDate || !input.endDate) {
    throw new Error("Selecciona la fecha inicio y la fecha fin.");
  }
  if (input.startDate > input.endDate) {
    throw new Error("La fecha inicio debe ser menor o igual a la fecha fin.");
  }
}

function buildCuadrePath(input: CuadreDateInput): string {
  return input.mode === "range"
    ? `${encodeURIComponent(input.startDate)}/${encodeURIComponent(input.endDate)}`
    : encodeURIComponent(input.date);
}

async function fetchEnviosRDCuadreRaw(
  enviosrdBranchKey: string,
  input: CuadreDateInput,
): Promise<EnviosRDCuadreResponse> {
  const baseUrl = process.env.ENVIOSRD_API_URL;
  if (!baseUrl) {
    throw new Error("ENVIOSRD_API_URL no está configurada en el servidor.");
  }

  const url = `${baseUrl}/api/cuadre/${buildCuadrePath(input)}?branch=${encodeURIComponent(enviosrdBranchKey)}`;
  const response = await fetch(url, { cache: "no-store" });

  if (response.status === 401) {
    throw new Error(
      "La sesión del API de Envios RD expiró. Pídele al operador del API actualizar el PHPSESSID.",
    );
  }
  if (response.status === 422) {
    throw new Error("Parámetros inválidos al consultar el cuadre.");
  }
  if (response.status === 502) {
    throw new Error("El API de Envios RD no pudo procesar la respuesta. Intenta de nuevo en un momento.");
  }
  if (!response.ok) {
    throw new Error(`Error consultando el cuadre (HTTP ${response.status}).`);
  }

  return (await response.json()) as EnviosRDCuadreResponse;
}

export async function fetchCuadre(
  branchId: string,
  input: CuadreDateInput,
): Promise<CuadreFetchResult> {
  await requireAuth();
  validateDateInput(input);

  const supabase = await getSupabaseServerClient();

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, enviosrd_branch_key, default_cash_account_id")
    .eq("id", branchId)
    .single();

  if (branchError || !branch) {
    throw new Error("Sucursal no encontrada.");
  }
  if (!branch.enviosrd_branch_key) {
    throw new Error("Esta sucursal no tiene una clave de Envios RD configurada.");
  }
  if (!branch.default_cash_account_id) {
    throw new Error("Esta sucursal no tiene una cuenta de caja por defecto configurada.");
  }

  const cuadre = await fetchEnviosRDCuadreRaw(branch.enviosrd_branch_key, input);

  const externalRefs = cuadre.transacciones.map((t) => t.no_factura);
  let alreadySyncedRefs = new Set<string>();
  if (externalRefs.length > 0) {
    const { data: existing, error: existingError } = await supabase
      .from("incomes")
      .select("external_ref")
      .eq("external_source", EXTERNAL_SOURCE)
      .in("external_ref", externalRefs);
    if (existingError) {
      throw new Error(`Error verificando ingresos existentes: ${existingError.message}`);
    }
    alreadySyncedRefs = new Set(
      (existing ?? []).map((row) => row.external_ref).filter((ref): ref is string => Boolean(ref)),
    );
  }

  const prepared: CuadrePreparedTransaction[] = cuadre.transacciones
    .map((t) => ({
      external_ref: t.no_factura,
      receipt: t.recibo,
      customer: t.cliente_nombre,
      amount: t.total,
      date: toIsoFromEnviosRDFecha(t.fecha),
      forma_pago_raw: t.forma_pago,
      kind: classifyPaymentMethod(t.forma_pago),
      alreadySynced: alreadySyncedRefs.has(t.no_factura),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    prepared,
    totalGeneral: cuadre.total_general,
    resumenPago: cuadre.resumen_pago,
    rangeLabel: input.mode === "range" ? cuadre.fecha : undefined,
  };
}

export async function applyCuadreSync(input: {
  branchId: string;
  dateInput: CuadreDateInput;
  assignments: CuadreSyncAssignment[];
}): Promise<CuadreApplyResult> {
  const session = await requireAuth();
  validateDateInput(input.dateInput);

  const supabase = await getSupabaseServerClient();
  const syncedBy = await resolveSessionUserId(session, supabase);

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, enviosrd_branch_key, default_cash_account_id")
    .eq("id", input.branchId)
    .single();

  if (branchError || !branch) throw new Error("Sucursal no encontrada.");
  if (!branch.enviosrd_branch_key) {
    throw new Error("Esta sucursal no tiene una clave de Envios RD configurada.");
  }
  if (!branch.default_cash_account_id) {
    throw new Error("Esta sucursal no tiene una cuenta de caja por defecto configurada.");
  }

  const { data: incomeTypes, error: incomeTypesError } = await supabase
    .from("income_types")
    .select("id, name")
    .in("name", ["Efectivo", "Transferencia"]);

  if (incomeTypesError) {
    throw new Error(`Error cargando tipos de ingreso: ${incomeTypesError.message}`);
  }

  const incomeTypeByName = new Map((incomeTypes ?? []).map((row) => [row.name, row.id as string]));
  const cashTypeId = incomeTypeByName.get("Efectivo");
  const transferTypeId = incomeTypeByName.get("Transferencia");
  if (!cashTypeId || !transferTypeId) {
    throw new Error("Faltan los tipos de ingreso 'Efectivo' o 'Transferencia'. Aplica la migración 014.");
  }

  const cuadre = await fetchEnviosRDCuadreRaw(branch.enviosrd_branch_key, input.dateInput);

  const assignmentByRef = new Map(input.assignments.map((a) => [a.external_ref, a.bank_account_id]));

  const payload = cuadre.transacciones
    .map((t) => {
      const kind = classifyPaymentMethod(t.forma_pago);
      if (kind === "otro") return null;

      const bankAccountId =
        kind === "efectivo"
          ? (branch.default_cash_account_id as string)
          : assignmentByRef.get(t.no_factura);

      if (!bankAccountId) return null;

      return {
        external_ref: t.no_factura,
        amount: t.total,
        date: toIsoFromEnviosRDFecha(t.fecha),
        description: `Recibo ${t.recibo} — ${t.cliente_nombre}`,
        income_type_id: kind === "efectivo" ? cashTypeId : transferTypeId,
        bank_account_id: bankAccountId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (payload.length === 0) {
    throw new Error("No hay transacciones válidas para sincronizar.");
  }

  // p_cuadre_date is preserved for signature stability but the RPC now derives
  // the per-day cuadre_syncs rows from each transaction's date (migration 019).
  // We still pass a representative value (start of range or the single date).
  const representativeDate =
    input.dateInput.mode === "single" ? input.dateInput.date : input.dateInput.startDate;

  const { data, error } = await supabase.rpc("apply_cuadre_sync", {
    p_branch_id: input.branchId,
    p_cuadre_date: representativeDate,
    p_enviosrd_branch_key: branch.enviosrd_branch_key,
    p_transactions: payload,
    p_synced_by: syncedBy,
  });

  if (error) {
    throw new Error(`Error al aplicar la sincronización: ${error.message}`);
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    throw new Error("La sincronización no devolvió un resultado.");
  }

  revalidatePath("/dashboard/sync-cuadres");
  revalidatePath("/dashboard/transactions/incomes");

  return {
    sync_id: result.sync_id,
    created_count: result.created_count,
    skipped_count: result.skipped_count,
    total_amount: Number(result.total_amount),
  };
}
