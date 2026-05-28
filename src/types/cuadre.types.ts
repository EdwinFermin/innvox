export interface EnviosRDCuadreTransaction {
  numero: number;
  recibo: string;
  no_factura: string;
  peso: number;
  cliente_nombre: string;
  cliente_codigo: string;
  forma_pago: string;
  fecha: string;
  total: number;
  recibido: number;
  devuelto: number;
  caja: string;
}

export interface EnviosRDResumenPago {
  forma_pago: string;
  total: number;
  credito: number;
}

export interface EnviosRDTotalesTransacciones {
  peso: number;
  total: number;
  recibido: number;
  devuelto: number;
}

export interface EnviosRDCuadreResponse {
  fecha: string;
  transacciones: EnviosRDCuadreTransaction[];
  totales_transacciones: EnviosRDTotalesTransacciones | null;
  creditos: unknown[];
  resumen_pago: EnviosRDResumenPago[];
  total_general: number;
  total_credito: number;
}

export type CuadrePaymentKind = "efectivo" | "transferencia" | "otro";

export interface CuadrePreparedTransaction {
  external_ref: string;
  receipt: string;
  customer: string;
  amount: number;
  date: string;
  forma_pago_raw: string;
  kind: CuadrePaymentKind;
  alreadySynced: boolean;
}

export interface CuadreFetchResult {
  prepared: CuadrePreparedTransaction[];
  totalGeneral: number;
  resumenPago: EnviosRDResumenPago[];
  rangeLabel?: string;
}

export type CuadreDateInput =
  | { mode: "single"; date: string }
  | { mode: "range"; startDate: string; endDate: string };

export interface CuadreSync {
  id: string;
  branch_id: string;
  cuadre_date: string;
  enviosrd_branch_key: string;
  transaction_count: number;
  total_amount: number;
  synced_at: string;
  synced_by: string | null;
}

export interface CuadreSyncAssignment {
  external_ref: string;
  bank_account_id: string;
}

export interface CuadreApplyResult {
  sync_id: string;
  created_count: number;
  skipped_count: number;
  total_amount: number;
}
