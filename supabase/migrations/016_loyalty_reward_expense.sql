-- ============================================================================
-- 016 - Loyalty reward expense before token reset
-- ============================================================================

ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_tokens_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_tokens_check CHECK (tokens >= 0 AND tokens <= 10);

CREATE OR REPLACE FUNCTION adjust_tokens(
  p_client_id  TEXT,
  p_delta      INTEGER,
  p_event_type TEXT DEFAULT 'manual',
  p_note       TEXT DEFAULT NULL,
  p_user_id    UUID DEFAULT NULL
)
RETURNS TABLE(new_tokens INTEGER, was_reset BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current  INTEGER;
  v_new      INTEGER;
  v_was_reset BOOLEAN := FALSE;
  v_delta_recorded INTEGER;
BEGIN
  SELECT tokens INTO v_current
    FROM clients WHERE id = p_client_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado: %', p_client_id;
  END IF;

  v_new := v_current + p_delta;

  IF v_new >= 10 AND p_delta > 0 THEN
    v_new := 0;
    v_was_reset := TRUE;
    v_delta_recorded := -(v_current);
  ELSE
    v_delta_recorded := p_delta;
  END IF;

  IF v_new < 0 THEN
    RAISE EXCEPTION 'No se pueden reducir los tokens por debajo de 0';
  END IF;

  UPDATE clients SET tokens = v_new WHERE id = p_client_id;

  INSERT INTO token_events (client_id, delta, tokens_after, event_type, note, created_by)
  VALUES (
    p_client_id,
    v_delta_recorded,
    v_new,
    CASE WHEN v_was_reset THEN 'reset' ELSE p_event_type END,
    p_note,
    p_user_id
  );

  RETURN QUERY SELECT v_new, v_was_reset;
END;
$$;

CREATE OR REPLACE FUNCTION complete_loyalty_reward(
  p_client_id       TEXT,
  p_amount          NUMERIC,
  p_bank_account_id UUID,
  p_user_id         UUID DEFAULT NULL,
  p_note            TEXT DEFAULT NULL
)
RETURNS TABLE(new_tokens INTEGER, was_reset BOOLEAN, expense_id UUID)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_client          clients%ROWTYPE;
  v_branch_id       TEXT;
  v_expense_type_id UUID;
  v_expense_id      UUID;
  v_description     TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto de la recompensa debe ser mayor que 0';
  END IF;

  IF p_bank_account_id IS NULL THEN
    RAISE EXCEPTION 'La cuenta financiera es obligatoria';
  END IF;

  SELECT *
  INTO v_client
  FROM clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado: %', p_client_id;
  END IF;

  IF v_client.tokens + 1 < 10 THEN
    RAISE EXCEPTION 'La tarjeta aun no alcanza los 10 tokens';
  END IF;

  IF p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_branches WHERE user_id = p_user_id
  ) THEN
    SELECT bab.branch_id
    INTO v_branch_id
    FROM bank_account_branches bab
    INNER JOIN user_branches ub
      ON ub.branch_id = bab.branch_id
     AND ub.user_id = p_user_id
    WHERE bab.bank_account_id = p_bank_account_id
    ORDER BY bab.branch_id
    LIMIT 1;

    IF v_branch_id IS NULL THEN
      RAISE EXCEPTION 'La cuenta no esta disponible para las sucursales del usuario';
    END IF;
  ELSE
    SELECT bab.branch_id
    INTO v_branch_id
    FROM bank_account_branches bab
    WHERE bab.bank_account_id = p_bank_account_id
    ORDER BY bab.branch_id
    LIMIT 1;
  END IF;

  IF v_branch_id IS NULL THEN
    SELECT branch_id
    INTO v_branch_id
    FROM bank_accounts
    WHERE id = p_bank_account_id;
  END IF;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'La cuenta no tiene una sucursal asociada';
  END IF;

  SELECT id
  INTO v_expense_type_id
  FROM expense_types
  WHERE name = 'Recompenza programa de fidelidad'
  LIMIT 1;

  IF v_expense_type_id IS NULL THEN
    INSERT INTO expense_types (name)
    VALUES ('Recompenza programa de fidelidad')
    RETURNING id INTO v_expense_type_id;
  END IF;

  v_description := format(
    'Recompenza programa de fidelidad - %s-%s',
    v_client.name,
    v_client.id
  );

  v_expense_id := create_expense(
    v_branch_id,
    v_expense_type_id,
    p_amount,
    v_description,
    NOW(),
    p_bank_account_id,
    p_user_id,
    0,
    0
  );

  UPDATE clients
  SET tokens = 0
  WHERE id = p_client_id;

  INSERT INTO token_events (client_id, delta, tokens_after, event_type, note, created_by)
  VALUES (
    p_client_id,
    -(v_client.tokens),
    0,
    'reset',
    COALESCE(p_note, v_description),
    p_user_id
  );

  RETURN QUERY SELECT 0, TRUE, v_expense_id;
END;
$$;
