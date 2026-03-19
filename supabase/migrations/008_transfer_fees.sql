-- Migration 008: Add transfer tax and LBTR fee support
-- Adds new bank_transaction types: 'lbtr_fee' and 'transfer_tax'
-- Updates transfer_funds and create_expense RPCs to accept optional fee parameters
-- Updates repair_bank_transaction_balances to handle new types

-- ---------------------------------------------------------------------------
-- 1. Expand the bank_transactions.type CHECK constraint
-- ---------------------------------------------------------------------------
ALTER TABLE bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_type_check;
ALTER TABLE bank_transactions ADD CONSTRAINT bank_transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'adjustment', 'lbtr_fee', 'transfer_tax'));

-- ---------------------------------------------------------------------------
-- 2. Replace transfer_funds to support optional LBTR fee and transfer tax
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION transfer_funds(
  p_source_account_id UUID,
  p_dest_account_id   UUID,
  p_amount            NUMERIC,
  p_description       TEXT DEFAULT NULL,
  p_created_by        UUID DEFAULT NULL,
  p_lbtr_fee          NUMERIC DEFAULT 0,
  p_transfer_tax      NUMERIC DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_source             bank_accounts%ROWTYPE;
  v_dest               bank_accounts%ROWTYPE;
  v_total_deduction    NUMERIC;
  v_source_new_balance NUMERIC;
  v_dest_new_balance   NUMERIC;
  v_transfer_out_id    UUID := gen_random_uuid();
  v_transfer_in_id     UUID := gen_random_uuid();
  v_now                TIMESTAMPTZ := NOW();
BEGIN
  -- Coalesce NULLs to 0
  p_lbtr_fee     := COALESCE(p_lbtr_fee, 0);
  p_transfer_tax := COALESCE(p_transfer_tax, 0);

  -- Lock both accounts in consistent order to prevent deadlocks
  IF p_source_account_id < p_dest_account_id THEN
    SELECT * INTO v_source FROM bank_accounts WHERE id = p_source_account_id FOR UPDATE;
    SELECT * INTO v_dest   FROM bank_accounts WHERE id = p_dest_account_id   FOR UPDATE;
  ELSE
    SELECT * INTO v_dest   FROM bank_accounts WHERE id = p_dest_account_id   FOR UPDATE;
    SELECT * INTO v_source FROM bank_accounts WHERE id = p_source_account_id FOR UPDATE;
  END IF;

  IF NOT FOUND THEN RAISE EXCEPTION 'Una o ambas cuentas no fueron encontradas'; END IF;

  v_total_deduction := p_amount + p_lbtr_fee + p_transfer_tax;

  IF v_source.current_balance < v_total_deduction THEN
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

  -- LBTR fee: separate withdrawal from source account
  IF p_lbtr_fee > 0 THEN
    v_source_new_balance := v_source_new_balance - p_lbtr_fee;
    UPDATE bank_accounts SET current_balance = v_source_new_balance WHERE id = p_source_account_id;
    INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, related_transfer_id, created_by)
    VALUES (gen_random_uuid(), p_source_account_id, 'lbtr_fee', p_lbtr_fee,
            'Comision LBTR - Transferencia', v_now, v_source_new_balance, v_transfer_out_id, p_created_by);
  END IF;

  -- Transfer tax: separate withdrawal from source account
  IF p_transfer_tax > 0 THEN
    v_source_new_balance := v_source_new_balance - p_transfer_tax;
    UPDATE bank_accounts SET current_balance = v_source_new_balance WHERE id = p_source_account_id;
    INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, related_transfer_id, created_by)
    VALUES (gen_random_uuid(), p_source_account_id, 'transfer_tax', p_transfer_tax,
            'Impuesto de transferencia - Transferencia', v_now, v_source_new_balance, v_transfer_out_id, p_created_by);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Replace create_expense to support optional LBTR fee and transfer tax
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_expense(
  p_branch_id        TEXT,
  p_expense_type_id  UUID,
  p_amount           NUMERIC,
  p_description      TEXT,
  p_date             TIMESTAMPTZ,
  p_bank_account_id  UUID DEFAULT NULL,
  p_created_by       UUID DEFAULT NULL,
  p_lbtr_fee         NUMERIC DEFAULT 0,
  p_transfer_tax     NUMERIC DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_expense_id     UUID := gen_random_uuid();
  v_bank_tx_id     UUID;
  v_account        bank_accounts%ROWTYPE;
  v_payment_method TEXT;
  v_new_balance    NUMERIC;
  v_total_deduction NUMERIC;
BEGIN
  -- Coalesce NULLs to 0
  p_lbtr_fee     := COALESCE(p_lbtr_fee, 0);
  p_transfer_tax := COALESCE(p_transfer_tax, 0);

  IF p_bank_account_id IS NOT NULL THEN
    SELECT * INTO v_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta bancaria no encontrada'; END IF;

    v_total_deduction := p_amount + p_lbtr_fee + p_transfer_tax;
    v_new_balance    := v_account.current_balance - p_amount;
    v_payment_method := CASE WHEN v_account.account_type = 'petty_cash' THEN 'cash' ELSE 'bank' END;

    UPDATE bank_accounts SET current_balance = v_new_balance WHERE id = p_bank_account_id;

    v_bank_tx_id := gen_random_uuid();
    INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, created_by)
    VALUES (v_bank_tx_id, p_bank_account_id, 'withdrawal', p_amount, p_description, p_date, v_new_balance, p_created_by);

    -- LBTR fee: separate transaction from same bank account
    IF p_lbtr_fee > 0 THEN
      v_new_balance := v_new_balance - p_lbtr_fee;
      UPDATE bank_accounts SET current_balance = v_new_balance WHERE id = p_bank_account_id;
      INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, created_by)
      VALUES (gen_random_uuid(), p_bank_account_id, 'lbtr_fee', p_lbtr_fee,
              'Comision LBTR - Gasto', p_date, v_new_balance, p_created_by);
    END IF;

    -- Transfer tax: separate transaction from same bank account
    IF p_transfer_tax > 0 THEN
      v_new_balance := v_new_balance - p_transfer_tax;
      UPDATE bank_accounts SET current_balance = v_new_balance WHERE id = p_bank_account_id;
      INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, created_by)
      VALUES (gen_random_uuid(), p_bank_account_id, 'transfer_tax', p_transfer_tax,
              'Impuesto de transferencia - Gasto', p_date, v_new_balance, p_created_by);
    END IF;
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

-- ---------------------------------------------------------------------------
-- 4. Update repair_bank_transaction_balances to handle new types
-- ---------------------------------------------------------------------------
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
          WHEN type IN ('withdrawal', 'transfer_out', 'lbtr_fee', 'transfer_tax') THEN -amount
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
