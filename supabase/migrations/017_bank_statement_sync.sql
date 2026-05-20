-- Bank statement synchronization
-- Stores parsed statement imports, lets users review proposed movements, and
-- applies selected items atomically to bank_transactions.

CREATE TABLE IF NOT EXISTS bank_statement_imports (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id            UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  file_name                  TEXT NOT NULL,
  file_size                  INTEGER,
  bank_name                  TEXT,
  statement_account_number   TEXT,
  statement_account_last4    TEXT,
  currency                   TEXT CHECK (currency IN ('DOP', 'USD')),
  period_start               DATE,
  period_end                 DATE,
  opening_balance            NUMERIC(15,2),
  closing_balance            NUMERIC(15,2),
  status                     TEXT NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'applied', 'cancelled')),
  summary                    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                 UUID REFERENCES users(id),
  applied_at                 TIMESTAMPTZ,
  applied_by                 UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bank_statement_import_items (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id                    UUID NOT NULL REFERENCES bank_statement_imports(id) ON DELETE CASCADE,
  bank_account_id              UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  source_fingerprint           TEXT NOT NULL,
  external_reference           TEXT,
  transaction_date             DATE NOT NULL,
  description                  TEXT,
  transaction_type             TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
  amount                       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  debit_amount                 NUMERIC(15,2),
  credit_amount                NUMERIC(15,2),
  statement_balance_after      NUMERIC(15,2),
  status                       TEXT NOT NULL DEFAULT 'new'
                                 CHECK (status IN ('new', 'duplicate', 'conflict', 'ignored', 'applied')),
  matched_bank_transaction_id  UUID REFERENCES bank_transactions(id),
  raw_payload                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (import_id, source_fingerprint)
);

ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS statement_import_id UUID REFERENCES bank_statement_imports(id),
  ADD COLUMN IF NOT EXISTS statement_import_item_id UUID REFERENCES bank_statement_import_items(id),
  ADD COLUMN IF NOT EXISTS source_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS external_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_bank_statement_imports_account_created
  ON bank_statement_imports(bank_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bank_statement_import_items_import_status
  ON bank_statement_import_items(import_id, status);

CREATE INDEX IF NOT EXISTS idx_bank_statement_import_items_account_date
  ON bank_statement_import_items(bank_account_id, transaction_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_statement_source
  ON bank_transactions(bank_account_id, source_fingerprint)
  WHERE source_fingerprint IS NOT NULL;

ALTER TABLE bank_statement_imports DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_import_items DISABLE ROW LEVEL SECURITY;

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
