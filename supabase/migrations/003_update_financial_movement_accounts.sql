CREATE OR REPLACE FUNCTION update_income_account(
  p_income_id UUID,
  p_bank_account_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_income incomes%ROWTYPE;
  v_old_account bank_accounts%ROWTYPE;
  v_new_account bank_accounts%ROWTYPE;
  v_new_balance NUMERIC;
  v_new_bank_tx_id UUID := gen_random_uuid();
  v_payment_method TEXT;
BEGIN
  SELECT *
  INTO v_income
  FROM incomes
  WHERE id = p_income_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El ingreso no existe';
  END IF;

  IF v_income.bank_account_id = p_bank_account_id THEN
    RETURN;
  END IF;

  IF p_bank_account_id IS NULL THEN
    RAISE EXCEPTION 'La nueva cuenta es obligatoria';
  END IF;

  IF v_income.bank_account_id IS NOT NULL AND v_income.bank_account_id < p_bank_account_id THEN
    SELECT * INTO v_old_account FROM bank_accounts WHERE id = v_income.bank_account_id FOR UPDATE;
    SELECT * INTO v_new_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
  ELSIF v_income.bank_account_id IS NOT NULL THEN
    SELECT * INTO v_new_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
    SELECT * INTO v_old_account FROM bank_accounts WHERE id = v_income.bank_account_id FOR UPDATE;
  ELSE
    SELECT * INTO v_new_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
  END IF;

  IF NOT FOUND OR v_new_account.id IS NULL THEN
    RAISE EXCEPTION 'Cuenta bancaria no encontrada';
  END IF;

  IF v_new_account.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'La nueva cuenta no esta activa';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM bank_account_branches
    WHERE bank_account_id = p_bank_account_id
      AND branch_id = v_income.branch_id
  ) THEN
    RAISE EXCEPTION 'La cuenta no esta disponible para la sucursal del ingreso';
  END IF;

  IF v_income.bank_account_id IS NOT NULL THEN
    UPDATE bank_accounts
    SET current_balance = current_balance - v_income.amount
    WHERE id = v_income.bank_account_id;
  END IF;

  v_new_balance := v_new_account.current_balance + v_income.amount;
  v_payment_method := CASE WHEN v_new_account.account_type = 'petty_cash' THEN 'cash' ELSE 'bank' END;

  UPDATE bank_accounts
  SET current_balance = v_new_balance
  WHERE id = p_bank_account_id;

  INSERT INTO bank_transactions (
    id,
    bank_account_id,
    type,
    amount,
    description,
    date,
    balance_after,
    linked_income_id,
    created_by
  ) VALUES (
    v_new_bank_tx_id,
    p_bank_account_id,
    'deposit',
    v_income.amount,
    v_income.description,
    v_income.date,
    v_new_balance,
    v_income.id,
    v_income.created_by
  );

  UPDATE incomes
  SET bank_account_id = p_bank_account_id,
      bank_transaction_id = v_new_bank_tx_id,
      payment_method = v_payment_method
  WHERE id = p_income_id;

  IF v_income.bank_transaction_id IS NOT NULL THEN
    DELETE FROM bank_transactions WHERE id = v_income.bank_transaction_id;
  END IF;

  IF v_income.bank_account_id IS NOT NULL THEN
    PERFORM repair_bank_transaction_balances(v_income.bank_account_id);
  END IF;

  PERFORM repair_bank_transaction_balances(p_bank_account_id);
END;
$$;

CREATE OR REPLACE FUNCTION update_expense_account(
  p_expense_id UUID,
  p_bank_account_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_expense expenses%ROWTYPE;
  v_old_account bank_accounts%ROWTYPE;
  v_new_account bank_accounts%ROWTYPE;
  v_new_balance NUMERIC;
  v_new_bank_tx_id UUID := gen_random_uuid();
  v_payment_method TEXT;
BEGIN
  SELECT *
  INTO v_expense
  FROM expenses
  WHERE id = p_expense_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El gasto no existe';
  END IF;

  IF v_expense.bank_account_id = p_bank_account_id THEN
    RETURN;
  END IF;

  IF p_bank_account_id IS NULL THEN
    RAISE EXCEPTION 'La nueva cuenta es obligatoria';
  END IF;

  IF v_expense.bank_account_id IS NOT NULL AND v_expense.bank_account_id < p_bank_account_id THEN
    SELECT * INTO v_old_account FROM bank_accounts WHERE id = v_expense.bank_account_id FOR UPDATE;
    SELECT * INTO v_new_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
  ELSIF v_expense.bank_account_id IS NOT NULL THEN
    SELECT * INTO v_new_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
    SELECT * INTO v_old_account FROM bank_accounts WHERE id = v_expense.bank_account_id FOR UPDATE;
  ELSE
    SELECT * INTO v_new_account FROM bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
  END IF;

  IF NOT FOUND OR v_new_account.id IS NULL THEN
    RAISE EXCEPTION 'Cuenta bancaria no encontrada';
  END IF;

  IF v_new_account.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'La nueva cuenta no esta activa';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM bank_account_branches
    WHERE bank_account_id = p_bank_account_id
      AND branch_id = v_expense.branch_id
  ) THEN
    RAISE EXCEPTION 'La cuenta no esta disponible para la sucursal del gasto';
  END IF;

  IF v_expense.bank_account_id IS NOT NULL THEN
    UPDATE bank_accounts
    SET current_balance = current_balance + v_expense.amount
    WHERE id = v_expense.bank_account_id;
  END IF;

  IF v_new_account.current_balance < v_expense.amount THEN
    RAISE EXCEPTION 'Fondos insuficientes en la nueva cuenta';
  END IF;

  v_new_balance := v_new_account.current_balance - v_expense.amount;
  v_payment_method := CASE WHEN v_new_account.account_type = 'petty_cash' THEN 'cash' ELSE 'bank' END;

  UPDATE bank_accounts
  SET current_balance = v_new_balance
  WHERE id = p_bank_account_id;

  INSERT INTO bank_transactions (
    id,
    bank_account_id,
    type,
    amount,
    description,
    date,
    balance_after,
    linked_expense_id,
    created_by
  ) VALUES (
    v_new_bank_tx_id,
    p_bank_account_id,
    'withdrawal',
    v_expense.amount,
    v_expense.description,
    v_expense.date,
    v_new_balance,
    v_expense.id,
    v_expense.created_by
  );

  UPDATE expenses
  SET bank_account_id = p_bank_account_id,
      bank_transaction_id = v_new_bank_tx_id,
      payment_method = v_payment_method
  WHERE id = p_expense_id;

  IF v_expense.bank_transaction_id IS NOT NULL THEN
    DELETE FROM bank_transactions WHERE id = v_expense.bank_transaction_id;
  END IF;

  IF v_expense.bank_account_id IS NOT NULL THEN
    PERFORM repair_bank_transaction_balances(v_expense.bank_account_id);
  END IF;

  PERFORM repair_bank_transaction_balances(p_bank_account_id);
END;
$$;
