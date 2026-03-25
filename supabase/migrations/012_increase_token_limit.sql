-- ============================================================================
-- 012 – Increase loyalty token limit from 8 to 10
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Update CHECK constraint on clients.tokens
-- ---------------------------------------------------------------------------

ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_tokens_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_tokens_check CHECK (tokens >= 0 AND tokens <= 10);

-- ---------------------------------------------------------------------------
-- 2. Replace adjust_tokens to reset at 10 instead of 8
-- ---------------------------------------------------------------------------

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
  -- Lock row to prevent race conditions
  SELECT tokens INTO v_current
    FROM clients WHERE id = p_client_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado: %', p_client_id;
  END IF;

  v_new := v_current + p_delta;

  -- Auto-reset when reaching 10
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
