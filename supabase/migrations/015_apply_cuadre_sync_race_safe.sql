-- 015_apply_cuadre_sync_race_safe.sql
-- Make apply_cuadre_sync race-safe by relying on the unique index via
-- ON CONFLICT DO NOTHING. The income INSERT happens before any balance
-- change so concurrent runs cannot leave orphan bank_transactions.
--
-- The unique index idx_incomes_external_ref is partial, so the ON CONFLICT
-- inference must repeat the same WHERE predicate.

CREATE OR REPLACE FUNCTION apply_cuadre_sync(
  p_branch_id           TEXT,
  p_cuadre_date         DATE,
  p_enviosrd_branch_key TEXT,
  p_transactions        JSONB,
  p_synced_by           UUID DEFAULT NULL
) RETURNS TABLE (sync_id UUID, created_count INT, skipped_count INT, total_amount NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sync_id        UUID := gen_random_uuid();
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

    v_total := v_total + v_amount;
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO cuadre_syncs (id, branch_id, cuadre_date, enviosrd_branch_key, transaction_count, total_amount, synced_by)
  VALUES (v_sync_id, p_branch_id, p_cuadre_date, p_enviosrd_branch_key, v_count, v_total, p_synced_by);

  RETURN QUERY SELECT v_sync_id, v_count, v_skipped, v_total;
END;
$$;
