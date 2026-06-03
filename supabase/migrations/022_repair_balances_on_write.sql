-- Migration 022: keep bank_transactions.balance_after coherent on every write.
--
-- Problem: balance_after is frozen at insert time in insertion order
-- (created_at), but the UI lists transactions by `date DESC, created_at DESC,
-- id DESC`. Those orders diverge because date semantics differ across writers
-- (income/expense store a midnight business date via p_date, while transfers /
-- withdrawals / fees store NOW() with a real time, and statement/cuadre syncs
-- carry per-row dates). The result is a running-balance column that no longer
-- ladders correctly once a transfer/withdrawal/back-dated row interleaves with
-- same-day income/expense.
--
-- repair_bank_transaction_balances() already rebuilds balance_after in the exact
-- display order, anchored to current_balance, but it was only invoked on
-- income/expense deletion (migration 003). This migration calls it at the end of
-- every balance-mutating RPC (atomic, in-transaction) so the chain self-heals on
-- write, and backfills all existing accounts once.
--
-- Each function below is CREATE OR REPLACE'd from its latest definition
-- (create_income: 001, create_expense/transfer_funds: 008, adjust_balance: 005,
-- withdraw_funds: 018, apply_bank_statement_sync: 017, apply_cuadre_sync: 021)
-- with only the repair call added. pay_receivable is unchanged: it delegates to
-- create_income and is covered transitively.

-- ---------------------------------------------------------------------------
-- 1. create_income (base: 001) + repair
-- ---------------------------------------------------------------------------
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
    PERFORM repair_bank_transaction_balances(p_bank_account_id);
  END IF;

  RETURN v_income_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. create_expense (base: 008, with fees) + repair
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
    PERFORM repair_bank_transaction_balances(p_bank_account_id);
  END IF;

  RETURN v_expense_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. transfer_funds (base: 008) + repair both accounts
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

  PERFORM repair_bank_transaction_balances(p_source_account_id);
  PERFORM repair_bank_transaction_balances(p_dest_account_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. adjust_balance (base: 005) + repair
-- ---------------------------------------------------------------------------
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

  PERFORM repair_bank_transaction_balances(p_bank_account_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. withdraw_funds (base: 018) + repair
-- ---------------------------------------------------------------------------
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

  PERFORM repair_bank_transaction_balances(p_bank_account_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. apply_bank_statement_sync (base: 017) + repair (single account)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_bank_statement_sync(
  p_import_id UUID,
  p_item_ids UUID[],
  p_created_by UUID DEFAULT NULL,
  p_create_balance_adjustment BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  applied_count INTEGER,
  skipped_count INTEGER,
  duplicate_count INTEGER,
  adjustment_transaction_id UUID,
  final_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_import bank_statement_imports%ROWTYPE;
  v_account bank_accounts%ROWTYPE;
  v_item bank_statement_import_items%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_new_balance NUMERIC(15,2);
  v_tx_id UUID;
  v_delta NUMERIC(15,2);
  v_applied INTEGER := 0;
  v_skipped INTEGER := 0;
  v_duplicates INTEGER := 0;
  v_adjustment_id UUID := NULL;
BEGIN
  IF p_item_ids IS NULL OR array_length(p_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecciona al menos un movimiento para aplicar';
  END IF;

  SELECT *
    INTO v_import
    FROM bank_statement_imports
   WHERE id = p_import_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Importacion de estado no encontrada';
  END IF;

  IF v_import.status <> 'draft' THEN
    RAISE EXCEPTION 'Esta importacion ya fue procesada';
  END IF;

  SELECT *
    INTO v_account
    FROM bank_accounts
   WHERE id = v_import.bank_account_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta bancaria no encontrada';
  END IF;

  v_new_balance := v_account.current_balance;

  FOR v_item IN
    SELECT *
      FROM bank_statement_import_items
     WHERE import_id = p_import_id
       AND id = ANY(p_item_ids)
     ORDER BY transaction_date ASC, created_at ASC, id ASC
     FOR UPDATE
  LOOP
    IF v_item.status NOT IN ('new', 'conflict') THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT id
      INTO v_tx_id
      FROM bank_transactions
     WHERE bank_account_id = v_import.bank_account_id
       AND source_fingerprint = v_item.source_fingerprint
     LIMIT 1;

    IF FOUND THEN
      UPDATE bank_statement_import_items
         SET status = 'duplicate',
             matched_bank_transaction_id = v_tx_id
       WHERE id = v_item.id;

      v_duplicates := v_duplicates + 1;
      CONTINUE;
    END IF;

    IF v_item.transaction_type = 'deposit' THEN
      v_new_balance := v_new_balance + v_item.amount;
    ELSE
      v_new_balance := v_new_balance - v_item.amount;
    END IF;

    INSERT INTO bank_transactions (
      id,
      bank_account_id,
      type,
      amount,
      description,
      date,
      balance_after,
      created_by,
      statement_import_id,
      statement_import_item_id,
      source_fingerprint,
      external_reference
    )
    VALUES (
      gen_random_uuid(),
      v_import.bank_account_id,
      v_item.transaction_type,
      v_item.amount,
      v_item.description,
      v_item.transaction_date::timestamptz,
      v_new_balance,
      p_created_by,
      p_import_id,
      v_item.id,
      v_item.source_fingerprint,
      v_item.external_reference
    )
    RETURNING id INTO v_tx_id;

    UPDATE bank_statement_import_items
       SET status = 'applied',
           matched_bank_transaction_id = v_tx_id
     WHERE id = v_item.id;

    v_applied := v_applied + 1;
  END LOOP;

  IF p_create_balance_adjustment
     AND v_import.closing_balance IS NOT NULL
     AND ROUND(v_new_balance - v_import.closing_balance, 2) <> 0 THEN
    v_delta := v_import.closing_balance - v_new_balance;
    v_new_balance := v_import.closing_balance;
    v_adjustment_id := gen_random_uuid();

    INSERT INTO bank_transactions (
      id,
      bank_account_id,
      type,
      amount,
      description,
      date,
      balance_after,
      created_by,
      statement_import_id
    )
    VALUES (
      v_adjustment_id,
      v_import.bank_account_id,
      'adjustment',
      v_delta,
      'Ajuste por sincronizacion de estado de cuenta: ' || v_import.file_name,
      v_now,
      v_new_balance,
      p_created_by,
      p_import_id
    );
  END IF;

  UPDATE bank_accounts
     SET current_balance = v_new_balance
   WHERE id = v_import.bank_account_id;

  PERFORM repair_bank_transaction_balances(v_import.bank_account_id);

  UPDATE bank_statement_imports
     SET status = 'applied',
         applied_at = v_now,
         applied_by = p_created_by,
         summary = summary || jsonb_build_object(
           'applied_count', v_applied,
           'skipped_count', v_skipped,
           'duplicate_count', v_duplicates,
           'adjustment_transaction_id', v_adjustment_id,
           'final_balance', v_new_balance
         )
   WHERE id = p_import_id;

  applied_count := v_applied;
  skipped_count := v_skipped;
  duplicate_count := v_duplicates;
  adjustment_transaction_id := v_adjustment_id;
  final_balance := v_new_balance;

  RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. apply_cuadre_sync (base: 021) + repair every distinct account touched
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_cuadre_sync(
  p_branch_id           TEXT,
  p_cuadre_date         DATE,
  p_enviosrd_branch_key TEXT,
  p_transactions        JSONB,
  p_synced_by           UUID DEFAULT NULL
) RETURNS TABLE (sync_id UUID, created_count INT, skipped_count INT, total_amount NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sync_id        UUID;
  v_tx             JSONB;
  v_total          NUMERIC(15,2) := 0;
  v_count          INT := 0;
  v_skipped        INT := 0;
  v_external_ref   TEXT;
  v_amount         NUMERIC(15,2);
  v_date           TIMESTAMPTZ;
  v_description    TEXT;
  v_income_type    UUID;
  v_bank_account   UUID;
  v_income_id      UUID;
  v_inserted_id    UUID;
  v_bank_tx_id     UUID;
  v_account        bank_accounts%ROWTYPE;
  v_payment_method TEXT;
  v_new_balance    NUMERIC(15,2);
  v_touched_accounts UUID[] := ARRAY[]::UUID[];
  v_acc            UUID;
BEGIN
  CREATE TEMP TABLE _tmp_cuadre_grouped (
    tx_date  DATE PRIMARY KEY,
    tx_count INT NOT NULL DEFAULT 0,
    tx_total NUMERIC(15,2) NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  FOR v_tx IN SELECT * FROM jsonb_array_elements(p_transactions) LOOP
    v_external_ref := v_tx->>'external_ref';
    v_amount       := (v_tx->>'amount')::NUMERIC;
    v_date         := (v_tx->>'date')::TIMESTAMPTZ;
    v_description  := v_tx->>'description';
    v_income_type  := (v_tx->>'income_type_id')::UUID;
    v_bank_account := (v_tx->>'bank_account_id')::UUID;

    SELECT CASE WHEN account_type = 'petty_cash' THEN 'cash' ELSE 'bank' END
      INTO v_payment_method
      FROM bank_accounts
     WHERE id = v_bank_account;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta bancaria no encontrada: %', v_bank_account; END IF;

    v_income_id := gen_random_uuid();
    INSERT INTO incomes (
      id, branch_id, income_type_id, amount, description, date,
      payment_method, bank_account_id, created_by,
      external_source, external_ref
    ) VALUES (
      v_income_id, p_branch_id, v_income_type, v_amount, v_description, v_date,
      v_payment_method, v_bank_account, p_synced_by,
      'enviosrd', v_external_ref
    )
    ON CONFLICT (external_source, external_ref)
      WHERE external_source IS NOT NULL AND external_ref IS NOT NULL
      DO NOTHING
    RETURNING id INTO v_inserted_id;

    IF v_inserted_id IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT * INTO v_account FROM bank_accounts WHERE id = v_bank_account FOR UPDATE;

    v_new_balance := v_account.current_balance + v_amount;
    UPDATE bank_accounts SET current_balance = v_new_balance WHERE id = v_bank_account;

    v_bank_tx_id := gen_random_uuid();
    INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, linked_income_id, created_by)
    VALUES (v_bank_tx_id, v_bank_account, 'deposit', v_amount, v_description, v_date, v_new_balance, v_inserted_id, p_synced_by);

    UPDATE incomes SET bank_transaction_id = v_bank_tx_id WHERE id = v_inserted_id;

    IF NOT (v_bank_account = ANY(v_touched_accounts)) THEN
      v_touched_accounts := array_append(v_touched_accounts, v_bank_account);
    END IF;

    INSERT INTO _tmp_cuadre_grouped(tx_date, tx_count, tx_total)
    VALUES ((v_date AT TIME ZONE 'America/Santo_Domingo')::DATE, 1, v_amount)
    ON CONFLICT (tx_date) DO UPDATE
      SET tx_count = _tmp_cuadre_grouped.tx_count + 1,
          tx_total = _tmp_cuadre_grouped.tx_total + EXCLUDED.tx_total;

    v_total := v_total + v_amount;
    v_count := v_count + 1;
  END LOOP;

  -- Re-sequence balance_after for every account this sync deposited into, once.
  FOREACH v_acc IN ARRAY v_touched_accounts LOOP
    PERFORM repair_bank_transaction_balances(v_acc);
  END LOOP;

  -- Emit one cuadre_syncs row per distinct transaction date. The returned
  -- sync_id is one of the created rows (the last inserted) and is used by the
  -- caller only for toast/cache invalidation, so the multi-row semantics is
  -- acceptable.
  INSERT INTO cuadre_syncs (
    id, branch_id, cuadre_date, enviosrd_branch_key,
    transaction_count, total_amount, synced_by
  )
  SELECT gen_random_uuid(), p_branch_id, g.tx_date, p_enviosrd_branch_key,
         g.tx_count, g.tx_total, p_synced_by
    FROM _tmp_cuadre_grouped g
    ORDER BY g.tx_date
  RETURNING id INTO v_sync_id;

  RETURN QUERY SELECT v_sync_id, v_count, v_skipped, v_total;
END;
$$;

-- Re-apply hardening from migration 020 (CREATE OR REPLACE preserves grants,
-- but keep this self-contained).
REVOKE EXECUTE ON FUNCTION public.apply_cuadre_sync(TEXT, DATE, TEXT, JSONB, UUID)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. One-time backfill: rebuild balance_after for every existing account.
-- Idempotent (repair only updates rows whose balance_after differs).
-- ---------------------------------------------------------------------------
SELECT repair_bank_transaction_balances(id) FROM bank_accounts;
