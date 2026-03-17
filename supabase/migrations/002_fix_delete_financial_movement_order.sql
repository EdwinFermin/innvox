CREATE OR REPLACE FUNCTION delete_financial_movement(
  p_kind        TEXT,
  p_movement_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_amount          NUMERIC;
  v_bank_account_id UUID;
  v_bank_tx_id      UUID;
  v_balance_delta   NUMERIC;
  v_account         bank_accounts%ROWTYPE;
BEGIN
  IF p_kind = 'income' THEN
    SELECT amount, bank_account_id, bank_transaction_id
    INTO v_amount, v_bank_account_id, v_bank_tx_id
    FROM incomes
    WHERE id = p_movement_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El ingreso ya no existe o fue eliminado';
    END IF;

    v_balance_delta := -v_amount;
  ELSIF p_kind = 'expense' THEN
    SELECT amount, bank_account_id, bank_transaction_id
    INTO v_amount, v_bank_account_id, v_bank_tx_id
    FROM expenses
    WHERE id = p_movement_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El gasto ya no existe o fue eliminado';
    END IF;

    v_balance_delta := v_amount;
  ELSE
    RAISE EXCEPTION 'Tipo de movimiento no valido: %', p_kind;
  END IF;

  IF v_bank_account_id IS NOT NULL THEN
    SELECT *
    INTO v_account
    FROM bank_accounts
    WHERE id = v_bank_account_id
    FOR UPDATE;

    IF FOUND THEN
      UPDATE bank_accounts
      SET current_balance = v_account.current_balance + v_balance_delta
      WHERE id = v_bank_account_id;
    END IF;
  END IF;

  IF p_kind = 'income' THEN
    DELETE FROM incomes WHERE id = p_movement_id;
  ELSE
    DELETE FROM expenses WHERE id = p_movement_id;
  END IF;

  IF v_bank_tx_id IS NOT NULL THEN
    DELETE FROM bank_transactions WHERE id = v_bank_tx_id;
  END IF;

  RETURN v_bank_account_id;
END;
$$;
