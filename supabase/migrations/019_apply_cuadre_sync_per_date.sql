-- 019_apply_cuadre_sync_per_date.sql
-- Group cuadre_syncs by the actual transaction date (in RD timezone) so that
-- a single sync run with a date range produces one cuadre_syncs row per day,
-- instead of one row stamped with the form's selected date.
--
-- The function signature is preserved for caller stability. p_cuadre_date is
-- accepted but no longer drives the cuadre_syncs row(s): per-date aggregation
-- is derived from each tx's date inside p_transactions.

CREATE OR REPLACE FUNCTION apply_cuadre_sync(
  p_branch_id           TEXT,
  p_cuadre_date         DATE,
  p_enviosrd_branch_key TEXT,
  p_transactions        JSONB,
  p_synced_by           UUID DEFAULT NULL
) RETURNS TABLE (sync_id UUID, created_count INT, skipped_count INT, total_amount NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
    VALUES (v_bank_tx_id, v_bank_account, 'deposit', v_amount, v_description, v_date, v_new_balance, p_synced_by);

    UPDATE incomes SET bank_transaction_id = v_bank_tx_id WHERE id = v_inserted_id;

    INSERT INTO _tmp_cuadre_grouped(tx_date, tx_count, tx_total)
    VALUES ((v_date AT TIME ZONE 'America/Santo_Domingo')::DATE, 1, v_amount)
    ON CONFLICT (tx_date) DO UPDATE
      SET tx_count = _tmp_cuadre_grouped.tx_count + 1,
          tx_total = _tmp_cuadre_grouped.tx_total + EXCLUDED.tx_total;

    v_total := v_total + v_amount;
    v_count := v_count + 1;
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
