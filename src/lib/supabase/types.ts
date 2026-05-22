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
          type: "ADMIN" | "USER" | "ACCOUNTANT";
          created_at: string;
        };
        Insert: {
          id: string;
          friendly_id?: string;
          name: string;
          email: string;
          avatar?: string;
          type?: "ADMIN" | "USER" | "ACCOUNTANT";
          created_at?: string;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          name?: string;
          email?: string;
          avatar?: string;
          type?: "ADMIN" | "USER" | "ACCOUNTANT";
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
          default_cash_account_id: string | null;
          enviosrd_branch_key: string | null;
        };
        Insert: {
          id: string;
          name: string;
          created_at?: string;
          default_cash_account_id?: string | null;
          enviosrd_branch_key?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          default_cash_account_id?: string | null;
          enviosrd_branch_key?: string | null;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          tokens: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          tokens?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          tokens?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      token_events: {
        Row: {
          id: string;
          client_id: string;
          delta: number;
          tokens_after: number;
          event_type: string;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          delta: number;
          tokens_after: number;
          event_type?: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          delta?: number;
          tokens_after?: number;
          event_type?: string;
          note?: string | null;
          created_by?: string | null;
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
          statement_import_id: string | null;
          statement_import_item_id: string | null;
          source_fingerprint: string | null;
          external_reference: string | null;
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
          statement_import_id?: string | null;
          statement_import_item_id?: string | null;
          source_fingerprint?: string | null;
          external_reference?: string | null;
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
          statement_import_id?: string | null;
          statement_import_item_id?: string | null;
          source_fingerprint?: string | null;
          external_reference?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      bank_statement_imports: {
        Row: {
          id: string;
          bank_account_id: string;
          file_name: string;
          file_size: number | null;
          bank_name: string | null;
          statement_account_number: string | null;
          statement_account_last4: string | null;
          currency: "DOP" | "USD" | null;
          period_start: string | null;
          period_end: string | null;
          opening_balance: number | null;
          closing_balance: number | null;
          status: "draft" | "applied" | "cancelled";
          summary: Json;
          created_at: string;
          created_by: string | null;
          applied_at: string | null;
          applied_by: string | null;
        };
        Insert: {
          id?: string;
          bank_account_id: string;
          file_name: string;
          file_size?: number | null;
          bank_name?: string | null;
          statement_account_number?: string | null;
          statement_account_last4?: string | null;
          currency?: "DOP" | "USD" | null;
          period_start?: string | null;
          period_end?: string | null;
          opening_balance?: number | null;
          closing_balance?: number | null;
          status?: "draft" | "applied" | "cancelled";
          summary?: Json;
          created_at?: string;
          created_by?: string | null;
          applied_at?: string | null;
          applied_by?: string | null;
        };
        Update: {
          id?: string;
          bank_account_id?: string;
          file_name?: string;
          file_size?: number | null;
          bank_name?: string | null;
          statement_account_number?: string | null;
          statement_account_last4?: string | null;
          currency?: "DOP" | "USD" | null;
          period_start?: string | null;
          period_end?: string | null;
          opening_balance?: number | null;
          closing_balance?: number | null;
          status?: "draft" | "applied" | "cancelled";
          summary?: Json;
          created_at?: string;
          created_by?: string | null;
          applied_at?: string | null;
          applied_by?: string | null;
        };
        Relationships: [];
      };
      bank_statement_import_items: {
        Row: {
          id: string;
          import_id: string;
          bank_account_id: string;
          source_fingerprint: string;
          external_reference: string | null;
          transaction_date: string;
          description: string | null;
          transaction_type: "deposit" | "withdrawal";
          amount: number;
          debit_amount: number | null;
          credit_amount: number | null;
          statement_balance_after: number | null;
          status: "new" | "duplicate" | "conflict" | "ignored" | "applied";
          matched_bank_transaction_id: string | null;
          raw_payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          import_id: string;
          bank_account_id: string;
          source_fingerprint: string;
          external_reference?: string | null;
          transaction_date: string;
          description?: string | null;
          transaction_type: "deposit" | "withdrawal";
          amount: number;
          debit_amount?: number | null;
          credit_amount?: number | null;
          statement_balance_after?: number | null;
          status?: "new" | "duplicate" | "conflict" | "ignored" | "applied";
          matched_bank_transaction_id?: string | null;
          raw_payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          import_id?: string;
          bank_account_id?: string;
          source_fingerprint?: string;
          external_reference?: string | null;
          transaction_date?: string;
          description?: string | null;
          transaction_type?: "deposit" | "withdrawal";
          amount?: number;
          debit_amount?: number | null;
          credit_amount?: number | null;
          statement_balance_after?: number | null;
          status?: "new" | "duplicate" | "conflict" | "ignored" | "applied";
          matched_bank_transaction_id?: string | null;
          raw_payload?: Json;
          created_at?: string;
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
          external_source: string | null;
          external_ref: string | null;
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
          external_source?: string | null;
          external_ref?: string | null;
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
          external_source?: string | null;
          external_ref?: string | null;
        };
        Relationships: [];
      };
      cuadre_syncs: {
        Row: {
          id: string;
          branch_id: string;
          cuadre_date: string;
          enviosrd_branch_key: string;
          transaction_count: number;
          total_amount: number;
          synced_at: string;
          synced_by: string | null;
        };
        Insert: {
          id?: string;
          branch_id: string;
          cuadre_date: string;
          enviosrd_branch_key: string;
          transaction_count: number;
          total_amount: number;
          synced_at?: string;
          synced_by?: string | null;
        };
        Update: {
          id?: string;
          branch_id?: string;
          cuadre_date?: string;
          enviosrd_branch_key?: string;
          transaction_count?: number;
          total_amount?: number;
          synced_at?: string;
          synced_by?: string | null;
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
          client_id: string | null;
          name: string;
          amount: number;
          paid_amount: number;
          due_date: string;
          description: string | null;
          status: string;
          source_bank_transaction_id: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          branch_id?: string | null;
          client_id?: string | null;
          name: string;
          amount: number;
          paid_amount?: number;
          due_date: string;
          description?: string | null;
          status: string;
          source_bank_transaction_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          branch_id?: string | null;
          client_id?: string | null;
          name?: string;
          amount?: number;
          paid_amount?: number;
          due_date?: string;
          description?: string | null;
          status?: string;
          source_bank_transaction_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      receivable_payments: {
        Row: {
          id: string;
          receivable_id: string;
          income_id: string;
          bank_account_id: string;
          amount: number;
          date: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          receivable_id: string;
          income_id: string;
          bank_account_id: string;
          amount: number;
          date: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          receivable_id?: string;
          income_id?: string;
          bank_account_id?: string;
          amount?: number;
          date?: string;
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
      /* ---- operating costs (migration 009) ---- */
      operating_costs: {
        Row: {
          id: string;
          friendly_id: string;
          branch_id: string;
          expense_type_id: string;
          name: string;
          default_amount: number;
          currency: "DOP" | "USD";
          allows_custom_amount: boolean;
          frequency: "weekly" | "biweekly" | "monthly" | "custom";
          custom_interval_days: number | null;
          day_of_month: number | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          branch_id: string;
          expense_type_id: string;
          name: string;
          default_amount: number;
          currency?: "DOP" | "USD";
          allows_custom_amount?: boolean;
          frequency: "weekly" | "biweekly" | "monthly" | "custom";
          custom_interval_days?: number | null;
          day_of_month?: number | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          branch_id?: string;
          expense_type_id?: string;
          name?: string;
          default_amount?: number;
          currency?: "DOP" | "USD";
          allows_custom_amount?: boolean;
          frequency?: "weekly" | "biweekly" | "monthly" | "custom";
          custom_interval_days?: number | null;
          day_of_month?: number | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      apple_wallet_devices: {
        Row: {
          id: string;
          device_library_id: string;
          push_token: string;
          pass_type_id: string;
          serial_number: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          device_library_id: string;
          push_token: string;
          pass_type_id: string;
          serial_number: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          device_library_id?: string;
          push_token?: string;
          pass_type_id?: string;
          serial_number?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      operating_cost_alerts: {
        Row: {
          id: string;
          friendly_id: string;
          operating_cost_id: string;
          branch_id: string;
          due_date: string;
          status: "pending" | "completed";
          default_amount: number;
          actual_amount: number | null;
          bank_account_id: string | null;
          linked_expense_id: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          friendly_id?: string;
          operating_cost_id: string;
          branch_id: string;
          due_date: string;
          status?: "pending" | "completed";
          default_amount: number;
          actual_amount?: number | null;
          bank_account_id?: string | null;
          linked_expense_id?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          friendly_id?: string;
          operating_cost_id?: string;
          branch_id?: string;
          due_date?: string;
          status?: "pending" | "completed";
          default_amount?: number;
          actual_amount?: number | null;
          bank_account_id?: string | null;
          linked_expense_id?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
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
      withdraw_funds: {
        Args: {
          p_bank_account_id: string;
          p_amount: number;
          p_description: string | null;
          p_created_by: string;
          p_create_receivable?: boolean;
          p_receivable_client_id?: string | null;
          p_receivable_branch_id?: string | null;
          p_receivable_due_date?: string | null;
        };
        Returns: undefined;
      };
      pay_receivable: {
        Args: {
          p_receivable_id: string;
          p_amount: number;
          p_income_type_id: string;
          p_bank_account_id: string;
          p_date: string;
          p_created_by: string;
        };
        Returns: string;
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
      generate_operating_cost_alerts: {
        Args: Record<string, never>;
        Returns: number;
      };
      complete_operating_cost_alert: {
        Args: {
          p_alert_id: string;
          p_actual_amount: number;
          p_bank_account_id?: string | null;
          p_completed_by?: string | null;
          p_lbtr_fee?: number;
          p_transfer_tax?: number;
          p_skip_expense?: boolean;
        };
        Returns: string;
      };
      adjust_tokens: {
        Args: {
          p_client_id: string;
          p_delta: number;
          p_event_type?: string;
          p_note?: string | null;
          p_user_id?: string | null;
        };
        Returns: {
          new_tokens: number;
          was_reset: boolean;
        }[];
      };
      complete_loyalty_reward: {
        Args: {
          p_client_id: string;
          p_amount: number;
          p_bank_account_id: string;
          p_user_id?: string | null;
          p_note?: string | null;
        };
        Returns: {
          new_tokens: number;
          was_reset: boolean;
          expense_id: string;
        }[];
      };
      apply_cuadre_sync: {
        Args: {
          p_branch_id: string;
          p_cuadre_date: string;
          p_enviosrd_branch_key: string;
          p_transactions: Json;
          p_synced_by?: string | null;
        };
        Returns: {
          sync_id: string;
          created_count: number;
          skipped_count: number;
          total_amount: number;
        }[];
      };
      apply_bank_statement_sync: {
        Args: {
          p_import_id: string;
          p_item_ids: string[];
          p_created_by?: string | null;
          p_create_balance_adjustment?: boolean;
        };
        Returns: {
          applied_count: number;
          skipped_count: number;
          duplicate_count: number;
          adjustment_transaction_id: string | null;
          final_balance: number;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}
