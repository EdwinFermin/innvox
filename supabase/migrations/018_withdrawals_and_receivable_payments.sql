-- Standalone account withdrawals and receivable payments (partial supported).
--
-- withdraw_funds: decreases an account balance and records a 'withdrawal'
-- bank_transaction that is NOT an expense (no linked_expense_id), simulating a
-- bank/cash withdrawal. Optionally creates a receivable linked to a client.
--
-- pay_receivable: records a (possibly partial) collection against a receivable,
-- creating an income (deposit) into a selected bank account via create_income.

-- Receivable columns: client link, partial-payment tracking, source withdrawal.
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS client_id TEXT REFERENCES clients(id);
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS source_bank_transaction_id UUID REFERENCES bank_transactions(id);

-- One row per collection (abono) against a receivable.
CREATE TABLE IF NOT EXISTS receivable_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id   UUID NOT NULL REFERENCES receivables(id),
  income_id       UUID NOT NULL REFERENCES incomes(id),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  amount          NUMERIC(15,2) NOT NULL,
  date            TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id)
);

ALTER TABLE receivable_payments DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_receivable_payments_receivable_id ON receivable_payments(receivable_id);

CREATE OR REPLACE FUNCTION withdraw_funds(
  p_bank_account_id       UUID,
  p_amount                NUMERIC,
  p_description           TEXT DEFAULT NULL,
  p_created_by            UUID DEFAULT NULL,
  p_create_receivable     BOOLEAN DEFAULT FALSE,
  p_receivable_client_id  TEXT DEFAULT NULL,
  p_receivable_branch_id  TEXT DEFAULT NULL,
  p_receivable_due_date   TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account     bank_accounts%ROWTYPE;
  v_new_balance NUMERIC;
  v_tx_id       UUID := gen_random_uuid();
  v_client_name TEXT;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'El monto del retiro debe ser mayor a 0'; END IF;

  SELECT * INTO v_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta bancaria no encontrada'; END IF;
  IF v_account.current_balance < p_amount THEN RAISE EXCEPTION 'Fondos insuficientes en la cuenta'; END IF;

  v_new_balance := v_account.current_balance - p_amount;
  UPDATE bank_accounts SET current_balance = v_new_balance WHERE id = p_bank_account_id;

  INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, created_by)
  VALUES (v_tx_id, p_bank_account_id, 'withdrawal', p_amount, p_description, NOW(), v_new_balance, p_created_by);

  IF p_create_receivable THEN
    IF p_receivable_client_id IS NULL THEN RAISE EXCEPTION 'Cliente requerido para la cuenta por cobrar'; END IF;
    SELECT name INTO v_client_name FROM clients WHERE id = p_receivable_client_id;
    INSERT INTO receivables (id, branch_id, client_id, name, amount, due_date, description, status, paid_amount, source_bank_transaction_id, created_by)
    VALUES (gen_random_uuid(), p_receivable_branch_id, p_receivable_client_id, COALESCE(v_client_name, 'Cliente'),
            p_amount, COALESCE(p_receivable_due_date, NOW()), p_description, 'pendiente', 0, v_tx_id, p_created_by);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pay_receivable(
  p_receivable_id   UUID,
  p_amount          NUMERIC,
  p_income_type_id  UUID,
  p_bank_account_id UUID,
  p_date            TIMESTAMPTZ,
  p_created_by      UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rec         receivables%ROWTYPE;
  v_outstanding NUMERIC;
  v_income_id   UUID;
  v_new_paid    NUMERIC;
  v_status      TEXT;
BEGIN
  SELECT * INTO v_rec FROM receivables WHERE id = p_receivable_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta por cobrar no encontrada'; END IF;

  v_outstanding := v_rec.amount - v_rec.paid_amount;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'El monto del cobro debe ser mayor a 0'; END IF;
  IF p_amount > v_outstanding THEN RAISE EXCEPTION 'El cobro excede el saldo pendiente'; END IF;

  v_income_id := create_income(
    v_rec.branch_id, p_income_type_id, p_amount,
    'Cobro CxC ' || v_rec.friendly_id, p_date, p_bank_account_id, p_created_by);

  INSERT INTO receivable_payments (receivable_id, income_id, bank_account_id, amount, date, created_by)
  VALUES (p_receivable_id, v_income_id, p_bank_account_id, p_amount, p_date, p_created_by);

  v_new_paid := v_rec.paid_amount + p_amount;
  v_status   := CASE WHEN v_new_paid >= v_rec.amount THEN 'pagado' ELSE 'parcial' END;
  UPDATE receivables SET paid_amount = v_new_paid, status = v_status WHERE id = p_receivable_id;

  RETURN v_income_id;
END;
$$;
