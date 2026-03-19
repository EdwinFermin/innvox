/**
 * Database type definitions for Supabase.
 *
 * These types describe the PostgreSQL schema so the Supabase client SDK
 * can provide full TypeScript inference on queries and mutations.
 *
 * After applying migrations to a live Supabase project you can regenerate
 * this file automatically with:
 *
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 *
 * Until then this hand-written version mirrors the migration SQL exactly.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          friendly_id: string;
          name: string;
          email: string;
          avatar: string;
          type: "ADMIN" | "USER";
          created_at: string;
        };
        Insert: {
          id: string;
          friendly_id?: string;
          name: string;
          email: string;
          avatar?: string;
          type?: "ADMIN" | "USER";
          created_at?: string;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          name?: string;
          email?: string;
          avatar?: string;
          type?: "ADMIN" | "USER";
          created_at?: string;
        };
        Relationships: [];
      };
      user_branches: {
        Row: {
          user_id: string;
          branch_id: string;
        };
        Insert: {
          user_id: string;
          branch_id: string;
        };
        Update: {
          user_id?: string;
          branch_id?: string;
        };
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bank_accounts: {
        Row: {
          id: string;
          friendly_id: string;
          branch_id: string | null;
          account_type: "bank" | "petty_cash";
          bank_name: string | null;
          account_number: string | null;
          account_name: string;
          icon_url: string | null;
          current_balance: number;
          currency: "DOP" | "USD";
          is_active: boolean;
          is_public: boolean | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          branch_id?: string | null;
          account_type: "bank" | "petty_cash";
          bank_name?: string | null;
          account_number?: string | null;
          account_name: string;
          icon_url?: string | null;
          current_balance?: number;
          currency?: "DOP" | "USD";
          is_active?: boolean;
          is_public?: boolean | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          branch_id?: string | null;
          account_type?: "bank" | "petty_cash";
          bank_name?: string | null;
          account_number?: string | null;
          account_name?: string;
          icon_url?: string | null;
          current_balance?: number;
          currency?: "DOP" | "USD";
          is_active?: boolean;
          is_public?: boolean | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      bank_account_branches: {
        Row: {
          bank_account_id: string;
          branch_id: string;
        };
        Insert: {
          bank_account_id: string;
          branch_id: string;
        };
        Update: {
          bank_account_id?: string;
          branch_id?: string;
        };
        Relationships: [];
      };
      bank_transactions: {
        Row: {
          id: string;
          friendly_id: string;
          bank_account_id: string;
          type: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "adjustment" | "lbtr_fee" | "transfer_tax";
          amount: number;
          description: string | null;
          date: string;
          balance_after: number;
          linked_expense_id: string | null;
          linked_income_id: string | null;
          related_transfer_id: string | null;
          related_account_id: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          bank_account_id: string;
          type: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "adjustment" | "lbtr_fee" | "transfer_tax";
          amount: number;
          description?: string | null;
          date: string;
          balance_after: number;
          linked_expense_id?: string | null;
          linked_income_id?: string | null;
          related_transfer_id?: string | null;
          related_account_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          bank_account_id?: string;
          type?: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "adjustment" | "lbtr_fee" | "transfer_tax";
          amount?: number;
          description?: string | null;
          date?: string;
          balance_after?: number;
          linked_expense_id?: string | null;
          linked_income_id?: string | null;
          related_transfer_id?: string | null;
          related_account_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      income_types: {
        Row: {
          id: string;
          friendly_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      expense_types: {
        Row: {
          id: string;
          friendly_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      incomes: {
        Row: {
          id: string;
          friendly_id: string;
          branch_id: string;
          income_type_id: string;
          amount: number;
          description: string | null;
          date: string;
          payment_method: "cash" | "bank";
          bank_account_id: string | null;
          bank_transaction_id: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          branch_id: string;
          income_type_id: string;
          amount: number;
          description?: string | null;
          date: string;
          payment_method: "cash" | "bank";
          bank_account_id?: string | null;
          bank_transaction_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          branch_id?: string;
          income_type_id?: string;
          amount?: number;
          description?: string | null;
          date?: string;
          payment_method?: "cash" | "bank";
          bank_account_id?: string | null;
          bank_transaction_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          friendly_id: string;
          branch_id: string;
          expense_type_id: string;
          amount: number;
          description: string | null;
          date: string;
          payment_method: "cash" | "bank";
          bank_account_id: string | null;
          bank_transaction_id: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          branch_id: string;
          expense_type_id: string;
          amount: number;
          description?: string | null;
          date: string;
          payment_method: "cash" | "bank";
          bank_account_id?: string | null;
          bank_transaction_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          branch_id?: string;
          expense_type_id?: string;
          amount?: number;
          description?: string | null;
          date?: string;
          payment_method?: "cash" | "bank";
          bank_account_id?: string | null;
          bank_transaction_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
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
        };
        Insert: {
          id: string;
          invoice_type?: string;
          ncf?: string | null;
          client_id?: string | null;
          description?: string | null;
          amount: number;
          monto_exento?: number;
          monto_gravado?: number;
          itbis?: number;
          created_at?: string;
          user_id?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          invoice_type?: string;
          ncf?: string | null;
          client_id?: string | null;
          description?: string | null;
          amount?: number;
          monto_exento?: number;
          monto_gravado?: number;
          itbis?: number;
          created_at?: string;
          user_id?: string | null;
          created_by?: string | null;
        };
        Relationships: [];
      };
      receivables: {
        Row: {
          id: string;
          friendly_id: string;
          branch_id: string | null;
          name: string;
          amount: number;
          due_date: string;
          description: string | null;
          status: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          branch_id?: string | null;
          name: string;
          amount: number;
          due_date: string;
          description?: string | null;
          status: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          branch_id?: string | null;
          name?: string;
          amount?: number;
          due_date?: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      payables: {
        Row: {
          id: string;
          friendly_id: string;
          branch_id: string | null;
          name: string;
          amount: number;
          due_date: string;
          description: string | null;
          status: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          branch_id?: string | null;
          name: string;
          amount: number;
          due_date: string;
          description?: string | null;
          status: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          branch_id?: string | null;
          name?: string;
          amount?: number;
          due_date?: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      link_payments: {
        Row: {
          id: string;
          friendly_id: string;
          branch_id: string;
          amount: number;
          payment_url: string;
          status: "pending" | "completed";
          created_at: string;
          created_by: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          branch_id: string;
          amount: number;
          payment_url: string;
          status?: "pending" | "completed";
          created_at?: string;
          created_by?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          branch_id?: string;
          amount?: number;
          payment_url?: string;
          status?: "pending" | "completed";
          created_at?: string;
          created_by?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      configs: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      ncf_released_numbers: {
        Row: {
          id: string;
          ncf_number: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ncf_number: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ncf_number?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_income: {
        Args: {
          p_branch_id: string;
          p_income_type_id: string;
          p_amount: number;
          p_description: string | null;
          p_date: string;
          p_bank_account_id: string | null;
          p_created_by: string;
        };
        Returns: string;
      };
      create_expense: {
        Args: {
          p_branch_id: string;
          p_expense_type_id: string;
          p_amount: number;
          p_description: string | null;
          p_date: string;
          p_bank_account_id: string | null;
          p_created_by: string;
          p_lbtr_fee?: number;
          p_transfer_tax?: number;
        };
        Returns: string;
      };
      update_income_account: {
        Args: {
          p_income_id: string;
          p_bank_account_id: string;
        };
        Returns: undefined;
      };
      update_expense_account: {
        Args: {
          p_expense_id: string;
          p_bank_account_id: string;
        };
        Returns: undefined;
      };
      transfer_funds: {
        Args: {
          p_source_account_id: string;
          p_dest_account_id: string;
          p_amount: number;
          p_description: string | null;
          p_created_by: string;
          p_lbtr_fee?: number;
          p_transfer_tax?: number;
        };
        Returns: undefined;
      };
      adjust_balance: {
        Args: {
          p_bank_account_id: string;
          p_target_balance: number;
          p_description: string | null;
          p_created_by: string;
        };
        Returns: undefined;
      };
      generate_ncf: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_cf: {
        Args: Record<string, never>;
        Returns: string;
      };
      delete_financial_movement: {
        Args: {
          p_kind: string;
          p_movement_id: string;
        };
        Returns: string | null;
      };
      delete_invoice: {
        Args: {
          p_invoice_id: string;
        };
        Returns: undefined;
      };
      repair_bank_transaction_balances: {
        Args: {
          p_bank_account_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
}
