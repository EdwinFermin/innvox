export interface Invoice {
  id: string;
  invoice_type: string;
  ncf: string | null;
  client_id: string | null;
  description: string | null;
  amount: number;
  monto_exento: number;
  monto_gravado: number;
  itbis: number;
  created_at: string;
  user_id: string | null;
  created_by: string | null;
  /** Joined from clients table */
  client_name: string | null;
  /** Joined from users table */
  user_name: string | null;
}
