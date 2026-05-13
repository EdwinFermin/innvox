-- 014_cuadre_sync.sql
-- Cuadre sync module: import daily closings from envios-rd-api as incomes.

-- 1. Branch configuration: default cash account + envios-rd branch key
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS default_cash_account_id UUID REFERENCES bank_accounts(id),
  ADD COLUMN IF NOT EXISTS enviosrd_branch_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_enviosrd_branch_key
  ON branches(enviosrd_branch_key)
  WHERE enviosrd_branch_key IS NOT NULL;

-- 2. External tracking on incomes (idempotent sync)
ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_ref TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_incomes_external_ref
  ON incomes(external_source, external_ref)
  WHERE external_source IS NOT NULL AND external_ref IS NOT NULL;

-- 3. Sync log (one row per successful sync run)
CREATE TABLE IF NOT EXISTS cuadre_syncs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           TEXT NOT NULL REFERENCES branches(id),
  cuadre_date         DATE NOT NULL,
  enviosrd_branch_key TEXT NOT NULL,
  transaction_count   INT NOT NULL,
  total_amount        NUMERIC(15,2) NOT NULL,
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_by           UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cuadre_syncs_branch_date
  ON cuadre_syncs(branch_id, cuadre_date);

ALTER TABLE cuadre_syncs DISABLE ROW LEVEL SECURITY;

-- 4. Seed fixed income types used by the sync (idempotent by name)
INSERT INTO income_types (name)
SELECT 'Efectivo' WHERE NOT EXISTS (SELECT 1 FROM income_types WHERE name = 'Efectivo');

INSERT INTO income_types (name)
SELECT 'Transferencia' WHERE NOT EXISTS (SELECT 1 FROM income_types WHERE name = 'Transferencia');

-- 5. RPC: apply a batch of cuadre transactions atomically.
-- Each tx is created via the same balance-updating path as create_income;
-- to capture the new income id, we inline a minimal version that returns it
-- and then stamp the external_source/ref columns.
CREATE OR REPLACE FUNCTION apply_cuadre_sync(
  p_branch_id           TEXT,
  p_cuadre_date         DATE,
  p_enviosrd_branch_key TEXT,
  p_transactions        JSONB,
  p_synced_by           UUID DEFAULT NULL
) RETURNS TABLE (sync_id UUID, created_count INT, skipped_count INT, total_amount NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sync_id       UUID := gen_random_uuid();
  v_tx            JSONB;
  v_total         NUMERIC(15,2) := 0;
  v_count         INT := 0;
  v_skipped       INT := 0;
  v_external_ref  TEXT;
  v_amount        NUMERIC(15,2);
  v_date          TIMESTAMPTZ;
  v_description   TEXT;
  v_income_type   UUID;
  v_bank_account  UUID;
  v_income_id     UUID;
  v_bank_tx_id    UUID;
  v_account       bank_accounts%ROWTYPE;
  v_payment_method TEXT;
  v_new_balance   NUMERIC(15,2);
BEGIN
  FOR v_tx IN SELECT * FROM jsonb_array_elements(p_transactions) LOOP
    v_external_ref := v_tx->>'external_ref';
    v_amount       := (v_tx->>'amount')::NUMERIC;
    v_date         := (v_tx->>'date')::TIMESTAMPTZ;
    v_description  := v_tx->>'description';
    v_income_type  := (v_tx->>'income_type_id')::UUID;
    v_bank_account := (v_tx->>'bank_account_id')::UUID;

    IF EXISTS (
      SELECT 1 FROM incomes
       WHERE external_source = 'enviosrd'
         AND external_ref = v_external_ref
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Lock + update account balance, create bank transaction
    SELECT * INTO v_account FROM bank_accounts WHERE id = v_bank_account FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta bancaria no encontrada: %', v_bank_account; END IF;

    v_new_balance := v_account.current_balance + v_amount;
    v_payment_method := CASE WHEN v_account.account_type = 'petty_cash' THEN 'cash' ELSE 'bank' END;

    UPDATE bank_accounts SET current_balance = v_new_balance WHERE id = v_bank_account;

    v_bank_tx_id := gen_random_uuid();
    INSERT INTO bank_transactions (id, bank_account_id, type, amount, description, date, balance_after, created_by)
    VALUES (v_bank_tx_id, v_bank_account, 'deposit', v_amount, v_description, v_date, v_new_balance, p_synced_by);

    -- Create the income with external tracking populated
    v_income_id := gen_random_uuid();
    INSERT INTO incomes (
      id, branch_id, income_type_id, amount, description, date,
      payment_method, bank_account_id, bank_transaction_id, created_by,
      external_source, external_ref
    ) VALUES (
      v_income_id, p_branch_id, v_income_type, v_amount, v_description, v_date,
      v_payment_method, v_bank_account, v_bank_tx_id, p_synced_by,
      'enviosrd', v_external_ref
    );

    UPDATE bank_transactions SET linked_income_id = v_income_id WHERE id = v_bank_tx_id;

    v_total := v_total + v_amount;
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO cuadre_syncs (id, branch_id, cuadre_date, enviosrd_branch_key, transaction_count, total_amount, synced_by)
  VALUES (v_sync_id, p_branch_id, p_cuadre_date, p_enviosrd_branch_key, v_count, v_total, p_synced_by);

  RETURN QUERY SELECT v_sync_id, v_count, v_skipped, v_total;
END;
$$;
