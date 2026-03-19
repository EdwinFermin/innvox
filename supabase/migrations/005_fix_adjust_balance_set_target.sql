-- Fix adjust_balance to accept a target balance instead of a delta.
-- The UI sends the desired new balance; the function computes the delta
-- internally so bank_transactions.amount still records the actual change.

DROP FUNCTION IF EXISTS adjust_balance(UUID, NUMERIC, TEXT, UUID);

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
