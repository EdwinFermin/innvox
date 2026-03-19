export interface NCFConfig {
  range_start: string;
  range_end: string;
  last_assigned?: string | null;
}

export interface CFConfig {
  range_start: string;
  range_end: string;
  last_assigned?: string | null;
}

export interface TaxConfig {
  percentage: string;
}

export interface TransferTaxConfig {
  percentage: string;
}

export interface LBTRFeeConfig {
  amount: string;
}

/**
 * Union of all config document shapes keyed by their config key.
 * Stored as JSONB in the `configs` table.
 */
export type ConfigMap = {
  NCF: NCFConfig;
  CF: CFConfig;
  ITBIS: TaxConfig;
  EXCENTO: TaxConfig;
  GRAVADO: TaxConfig;
  TRANSFER_TAX: TransferTaxConfig;
  LBTR_FEE: LBTRFeeConfig;
};
