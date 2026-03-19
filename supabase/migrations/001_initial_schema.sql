-- =============================================================================
-- Innvox: Firebase → Supabase Migration
-- Initial schema: tables, indexes, functions, and RLS policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------

-- Branches (id = branch code, e.g. "SDQ-01")
CREATE TABLE branches (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients (id = poBox, e.g. "EV-123450")
CREATE TABLE clients (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (profile data; auth handled by Supabase Auth)
CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  avatar     TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL DEFAULT 'USER' CHECK (type IN ('ADMIN', 'USER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User ↔ Branch junction (replaces branchIds array)
CREATE TABLE user_branches (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, branch_id)
);

-- Bank accounts
CREATE TABLE bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       TEXT REFERENCES branches(id),
  account_type    TEXT NOT NULL CHECK (account_type IN ('bank', 'petty_cash')),
  bank_name       TEXT,
  account_number  TEXT,
  account_name    TEXT NOT NULL,
  icon_url        TEXT,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'DOP' CHECK (currency IN ('DOP', 'USD')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_public       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id)
);

-- Bank account ↔ Branch junction (replaces branchIds array)
CREATE TABLE bank_account_branches (
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  branch_id       TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (bank_account_id, branch_id)
);

-- Bank transactions
CREATE TABLE bank_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id     UUID NOT NULL REFERENCES bank_accounts(id),
  type                TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'adjustment')),
  amount              NUMERIC(15,2) NOT NULL,
  description         TEXT,
  date                TIMESTAMPTZ NOT NULL,
  balance_after       NUMERIC(15,2) NOT NULL,
  linked_expense_id   UUID,
  linked_income_id    UUID,
  related_transfer_id UUID,
  related_account_id  UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES users(id)
);

-- Income types
CREATE TABLE income_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expense types
CREATE TABLE expense_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incomes
CREATE TABLE incomes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           TEXT NOT NULL REFERENCES branches(id),
  income_type_id      UUID NOT NULL REFERENCES income_types(id),
  amount              NUMERIC(15,2) NOT NULL,
  description         TEXT,
  date                TIMESTAMPTZ NOT NULL,
  payment_method      TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank')),
  bank_account_id     UUID REFERENCES bank_accounts(id),
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES users(id)
);

-- Expenses
CREATE TABLE expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           TEXT NOT NULL REFERENCES branches(id),
  expense_type_id     UUID NOT NULL REFERENCES expense_types(id),
  amount              NUMERIC(15,2) NOT NULL,
  description         TEXT,
  date                TIMESTAMPTZ NOT NULL,
  payment_method      TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank')),
  bank_account_id     UUID REFERENCES bank_accounts(id),
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES users(id)
);

-- Invoices (id = generated invoice number, e.g. "INV-20260313-…")
CREATE TABLE invoices (
  id            TEXT PRIMARY KEY,
  invoice_type  TEXT NOT NULL DEFAULT 'FISCAL',
  ncf           TEXT,
  client_id     TEXT REFERENCES clients(id),
  description   TEXT,
  amount        NUMERIC(15,2) NOT NULL,
  monto_exento  NUMERIC(15,2) DEFAULT 0,
  monto_gravado NUMERIC(15,2) DEFAULT 0,
  itbis         NUMERIC(15,2) DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id       UUID REFERENCES users(id),
  created_by    UUID REFERENCES users(id)
);

-- Receivables
CREATE TABLE receivables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   TEXT REFERENCES branches(id),
  name        TEXT NOT NULL,
  amount      NUMERIC(15,2) NOT NULL,
  due_date    TIMESTAMPTZ NOT NULL,
  description TEXT,
  status      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES users(id)
);

-- Payables
CREATE TABLE payables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   TEXT REFERENCES branches(id),
  name        TEXT NOT NULL,
  amount      NUMERIC(15,2) NOT NULL,
  due_date    TIMESTAMPTZ NOT NULL,
  description TEXT,
  status      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES users(id)
);

-- Link payments
CREATE TABLE link_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    TEXT NOT NULL REFERENCES branches(id),
  amount       NUMERIC(15,2) NOT NULL,
  payment_url  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ
);

-- Configs (key-value store: NCF, CF, ITBIS, EXCENTO, GRAVADO)
CREATE TABLE configs (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NCF released numbers (replaces releasedNumbers array)
CREATE TABLE ncf_released_numbers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncf_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX idx_bank_transactions_account      ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_date         ON bank_transactions(bank_account_id, date DESC);
CREATE INDEX idx_incomes_created_by             ON incomes(created_by);
CREATE INDEX idx_expenses_created_by            ON expenses(created_by);
CREATE INDEX idx_invoices_created_by            ON invoices(created_by);
CREATE INDEX idx_link_payments_created_by       ON link_payments(created_by);
CREATE INDEX idx_link_payments_branch_status    ON link_payments(branch_id, status);
CREATE INDEX idx_payables_created_by            ON payables(created_by);
CREATE INDEX idx_receivables_created_by         ON receivables(created_by);
CREATE INDEX idx_bank_account_branches_branch   ON bank_account_branches(branch_id);
CREATE INDEX idx_user_branches_branch           ON user_branches(branch_id);

-- ---------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS
-- ---------------------------------------------------------------------------

-- Increment a prefixed sequential number (e.g. "B01" → "B02")
CREATE OR REPLACE FUNCTION increment_sequential_number(p_current TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_prefix      TEXT := LEFT(p_current, 3);
  v_number_part TEXT := SUBSTRING(p_current FROM 4);
  v_next_number INT  := CAST(v_number_part AS INT) + 1;
BEGIN
  RETURN v_prefix || LPAD(v_next_number::TEXT, LENGTH(v_number_part), '0');
END;
$$;

-- Get the current user's role from the users table
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT type FROM public.users WHERE id = auth.uid()
$$;

-- Check if the current user is ADMIN
CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT auth_user_role() = 'ADMIN'
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC FUNCTIONS (called via supabase.rpc())
-- ---------------------------------------------------------------------------

-- 4.1 Create income (atomic: update balance + create bank tx + create income)
CREATE OR REPLACE FUNCTION create_income(
  p_branch_id       TEXT,
  p_income_type_id  UUID,
  p_amount          NUMERIC,
  p_description     TEXT,
  p_date            TIMESTAMPTZ,
  p_bank_account_id UUID DEFAULT NULL,
  p_created_by      UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_income_id      UUID := gen_random_uuid();
  v_bank_tx_id     UUID;
  v_account        bank_accounts%ROWTYPE;
  v_payment_method TEXT;
  v_new_balance    NUMERIC;
BEGIN
  IF p_bank_account_id IS NOT NULL THEN
    SELECT * INTO v_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta bancaria no encontrada'; END IF;

    v_new_balance    := v_account.current_balance + p_amount;
    v_payment_method := CASE WHEN v_account.account_type = 'petty_cash' THEN 'cash' ELSE 'bank' END;

    UPDATE bank_accounts SET current_balance = v_new_balance WHERE id = p_bank_account_id;

    v_bank_tx_id := gen_random_uuid();
    INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, created_by)
    VALUES (v_bank_tx_id, p_bank_account_id, 'deposit', p_amount, p_description, p_date, v_new_balance, p_created_by);
  ELSE
    v_payment_method := 'cash';
  END IF;

  INSERT INTO incomes (id, branch_id, income_type_id, amount, description, date, payment_method, bank_account_id, bank_transaction_id, created_by)
  VALUES (v_income_id, p_branch_id, p_income_type_id, p_amount, p_description, p_date, v_payment_method, p_bank_account_id, v_bank_tx_id, p_created_by);

  IF v_bank_tx_id IS NOT NULL THEN
    UPDATE bank_transactions SET linked_income_id = v_income_id WHERE id = v_bank_tx_id;
  END IF;

  RETURN v_income_id;
END;
$$;

-- 4.2 Create expense (atomic: update balance + create bank tx + create expense)
CREATE OR REPLACE FUNCTION create_expense(
  p_branch_id        TEXT,
  p_expense_type_id  UUID,
  p_amount           NUMERIC,
  p_description      TEXT,
  p_date             TIMESTAMPTZ,
  p_bank_account_id  UUID DEFAULT NULL,
  p_created_by       UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_expense_id     UUID := gen_random_uuid();
  v_bank_tx_id     UUID;
  v_account        bank_accounts%ROWTYPE;
  v_payment_method TEXT;
  v_new_balance    NUMERIC;
BEGIN
  IF p_bank_account_id IS NOT NULL THEN
    SELECT * INTO v_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta bancaria no encontrada'; END IF;

    v_new_balance    := v_account.current_balance - p_amount;
    v_payment_method := CASE WHEN v_account.account_type = 'petty_cash' THEN 'cash' ELSE 'bank' END;

    UPDATE bank_accounts SET current_balance = v_new_balance WHERE id = p_bank_account_id;

    v_bank_tx_id := gen_random_uuid();
    INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, created_by)
    VALUES (v_bank_tx_id, p_bank_account_id, 'withdrawal', p_amount, p_description, p_date, v_new_balance, p_created_by);
  ELSE
    v_payment_method := 'cash';
  END IF;

  INSERT INTO expenses (id, branch_id, expense_type_id, amount, description, date, payment_method, bank_account_id, bank_transaction_id, created_by)
  VALUES (v_expense_id, p_branch_id, p_expense_type_id, p_amount, p_description, p_date, v_payment_method, p_bank_account_id, v_bank_tx_id, p_created_by);

  IF v_bank_tx_id IS NOT NULL THEN
    UPDATE bank_transactions SET linked_expense_id = v_expense_id WHERE id = v_bank_tx_id;
  END IF;

  RETURN v_expense_id;
END;
$$;

-- 4.3 Transfer funds (atomic: update both balances + create paired bank txs)
CREATE OR REPLACE FUNCTION transfer_funds(
  p_source_account_id UUID,
  p_dest_account_id   UUID,
  p_amount            NUMERIC,
  p_description       TEXT DEFAULT NULL,
  p_created_by        UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_source             bank_accounts%ROWTYPE;
  v_dest               bank_accounts%ROWTYPE;
  v_source_new_balance NUMERIC;
  v_dest_new_balance   NUMERIC;
  v_transfer_out_id    UUID := gen_random_uuid();
  v_transfer_in_id     UUID := gen_random_uuid();
  v_now                TIMESTAMPTZ := NOW();
BEGIN
  -- Lock both accounts in consistent order to prevent deadlocks
  IF p_source_account_id < p_dest_account_id THEN
    SELECT * INTO v_source FROM bank_accounts WHERE id = p_source_account_id FOR UPDATE;
    SELECT * INTO v_dest   FROM bank_accounts WHERE id = p_dest_account_id   FOR UPDATE;
  ELSE
    SELECT * INTO v_dest   FROM bank_accounts WHERE id = p_dest_account_id   FOR UPDATE;
    SELECT * INTO v_source FROM bank_accounts WHERE id = p_source_account_id FOR UPDATE;
  END IF;

  IF NOT FOUND THEN RAISE EXCEPTION 'Una o ambas cuentas no fueron encontradas'; END IF;

  IF v_source.current_balance < p_amount THEN
    RAISE EXCEPTION 'Fondos insuficientes en la cuenta origen';
  END IF;

  v_source_new_balance := v_source.current_balance - p_amount;
  v_dest_new_balance   := v_dest.current_balance   + p_amount;

  UPDATE bank_accounts SET current_balance = v_source_new_balance WHERE id = p_source_account_id;
  UPDATE bank_accounts SET current_balance = v_dest_new_balance   WHERE id = p_dest_account_id;

  INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, related_transfer_id, related_account_id, created_by)
  VALUES
    (v_transfer_out_id, p_source_account_id, 'transfer_out', p_amount, p_description, v_now, v_source_new_balance, v_transfer_in_id,  p_dest_account_id,   p_created_by),
    (v_transfer_in_id,  p_dest_account_id,   'transfer_in',  p_amount, p_description, v_now, v_dest_new_balance,   v_transfer_out_id, p_source_account_id, p_created_by);
END;
$$;

-- 4.4 Adjust balance (atomic: set balance to target + create adjustment bank tx)
CREATE OR REPLACE FUNCTION adjust_balance(
  p_bank_account_id UUID,
  p_target_balance  NUMERIC,
  p_description     TEXT DEFAULT NULL,
  p_created_by      UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account bank_accounts%ROWTYPE;
  v_delta   NUMERIC;
BEGIN
  SELECT * INTO v_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta bancaria no encontrada'; END IF;

  v_delta := p_target_balance - v_account.current_balance;

  UPDATE bank_accounts SET current_balance = p_target_balance WHERE id = p_bank_account_id;

  INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, created_by)
  VALUES (gen_random_uuid(), p_bank_account_id, 'adjustment', v_delta, p_description, NOW(), p_target_balance, p_created_by);
END;
$$;

-- 4.5 Generate NCF (atomic sequential counter with released number reuse)
CREATE OR REPLACE FUNCTION generate_ncf()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_config    JSONB;
  v_released  TEXT;
  v_last      TEXT;
  v_next      TEXT;
  v_range_end TEXT;
BEGIN
  SELECT value INTO v_config FROM configs WHERE key = 'NCF' FOR UPDATE;
  IF v_config IS NULL THEN RAISE EXCEPTION 'Configuración de NCF no encontrada'; END IF;

  -- Check for released numbers first
  SELECT ncf_number INTO v_released FROM ncf_released_numbers ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF v_released IS NOT NULL THEN
    DELETE FROM ncf_released_numbers WHERE ncf_number = v_released;
    RETURN v_released;
  END IF;

  v_last      := v_config->>'last_assigned';
  v_range_end := v_config->>'range_end';

  IF v_last IS NULL THEN
    v_next := v_config->>'range_start';
  ELSE
    v_next := increment_sequential_number(v_last);
  END IF;

  IF v_next > v_range_end THEN
    RAISE EXCEPTION 'El rango de NCF ha sido consumido completamente';
  END IF;

  UPDATE configs
  SET value = jsonb_set(value, '{last_assigned}', to_jsonb(v_next)),
      updated_at = NOW()
  WHERE key = 'NCF';

  RETURN v_next;
END;
$$;

-- 4.6 Generate CF (atomic sequential counter, no released numbers)
CREATE OR REPLACE FUNCTION generate_cf()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_config    JSONB;
  v_last      TEXT;
  v_next      TEXT;
  v_range_end TEXT;
BEGIN
  SELECT value INTO v_config FROM configs WHERE key = 'CF' FOR UPDATE;
  IF v_config IS NULL THEN RAISE EXCEPTION 'Configuración de CF no encontrada'; END IF;

  v_last      := v_config->>'last_assigned';
  v_range_end := v_config->>'range_end';

  IF v_last IS NULL THEN
    v_next := v_config->>'range_start';
  ELSE
    v_next := increment_sequential_number(v_last);
  END IF;

  IF v_next > v_range_end THEN
    RAISE EXCEPTION 'El rango de CF ha sido consumido completamente';
  END IF;

  UPDATE configs
  SET value = jsonb_set(value, '{last_assigned}', to_jsonb(v_next)),
      updated_at = NOW()
  WHERE key = 'CF';

  RETURN v_next;
END;
$$;

-- 4.7 Delete financial movement (atomic: reverse balance, delete linked tx, delete movement)
CREATE OR REPLACE FUNCTION delete_financial_movement(
  p_kind        TEXT,   -- 'income' or 'expense'
  p_movement_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_amount            NUMERIC;
  v_bank_account_id   UUID;
  v_bank_tx_id        UUID;
  v_balance_delta     NUMERIC;
  v_account           bank_accounts%ROWTYPE;
BEGIN
  IF p_kind = 'income' THEN
    SELECT amount, bank_account_id, bank_transaction_id
    INTO v_amount, v_bank_account_id, v_bank_tx_id
    FROM incomes WHERE id = p_movement_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'El ingreso ya no existe o fue eliminado'; END IF;
    v_balance_delta := -v_amount;  -- reverse a deposit
  ELSIF p_kind = 'expense' THEN
    SELECT amount, bank_account_id, bank_transaction_id
    INTO v_amount, v_bank_account_id, v_bank_tx_id
    FROM expenses WHERE id = p_movement_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'El gasto ya no existe o fue eliminado'; END IF;
    v_balance_delta := v_amount;   -- reverse a withdrawal
  ELSE
    RAISE EXCEPTION 'Tipo de movimiento no válido: %', p_kind;
  END IF;

  -- Reverse balance on bank account
  IF v_bank_account_id IS NOT NULL THEN
    SELECT * INTO v_account FROM bank_accounts WHERE id = v_bank_account_id FOR UPDATE;
    IF FOUND THEN
      UPDATE bank_accounts
      SET current_balance = v_account.current_balance + v_balance_delta
      WHERE id = v_bank_account_id;
    END IF;
  END IF;

  -- Delete linked bank transaction
  IF v_bank_tx_id IS NOT NULL THEN
    DELETE FROM bank_transactions WHERE id = v_bank_tx_id;
  END IF;

  -- Delete the movement itself
  IF p_kind = 'income' THEN
    DELETE FROM incomes WHERE id = p_movement_id;
  ELSE
    DELETE FROM expenses WHERE id = p_movement_id;
  END IF;

  RETURN v_bank_account_id;
END;
$$;

-- 4.8 Delete invoice (with NCF release)
CREATE OR REPLACE FUNCTION delete_invoice(p_invoice_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ncf TEXT;
BEGIN
  SELECT ncf INTO v_ncf FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'La factura no existe'; END IF;

  IF v_ncf IS NOT NULL AND v_ncf <> '' THEN
    INSERT INTO ncf_released_numbers (ncf_number) VALUES (v_ncf)
    ON CONFLICT (ncf_number) DO NOTHING;
  END IF;

  DELETE FROM invoices WHERE id = p_invoice_id;
END;
$$;

-- 4.9 Repair bank transaction balances (recalculate balanceAfter using window fn)
CREATE OR REPLACE FUNCTION repair_bank_transaction_balances(p_bank_account_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  SELECT current_balance INTO v_current_balance
  FROM bank_accounts WHERE id = p_bank_account_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Use a window function to recalculate running balances from newest to oldest
  WITH ordered_txs AS (
    SELECT id, type, amount,
      ROW_NUMBER() OVER (ORDER BY date DESC, created_at DESC, id DESC) AS rn
    FROM bank_transactions
    WHERE bank_account_id = p_bank_account_id
  ),
  computed AS (
    SELECT id,
      v_current_balance - COALESCE(SUM(
        CASE
          WHEN type IN ('deposit', 'transfer_in') THEN amount
          WHEN type IN ('withdrawal', 'transfer_out') THEN -amount
          WHEN type = 'adjustment' THEN amount
          ELSE 0
        END
      ) OVER (ORDER BY rn ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS new_balance_after
    FROM ordered_txs
  )
  UPDATE bank_transactions bt
  SET balance_after = c.new_balance_after
  FROM computed c
  WHERE bt.id = c.id AND bt.balance_after IS DISTINCT FROM c.new_balance_after;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY — DISABLED
-- ---------------------------------------------------------------------------
-- RLS is intentionally disabled. The app uses NextAuth for authentication,
-- not Supabase Auth. The browser Supabase client has no Supabase Auth JWT,
-- so auth.uid() is always NULL and RLS policies would block all reads.
--
-- Security is enforced at the application level:
--   - Server Actions: requireAuth() / requirePermission() guards
--   - Client hooks: only rendered inside authenticated dashboard layout
--   - Proxy middleware: gates /dashboard/** routes via NextAuth session
-- ---------------------------------------------------------------------------
