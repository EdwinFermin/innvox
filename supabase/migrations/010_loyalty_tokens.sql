-- ============================================================================
-- 010 – Loyalty Token System (Tarjeta de Fidelidad)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add loyalty fields to clients
-- ---------------------------------------------------------------------------

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS tokens INTEGER NOT NULL DEFAULT 0
    CHECK (tokens >= 0 AND tokens <= 8);

-- ---------------------------------------------------------------------------
-- 2. Token events audit table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS token_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  delta        INTEGER NOT NULL,
  tokens_after INTEGER NOT NULL,
  event_type   TEXT NOT NULL DEFAULT 'manual'
    CHECK (event_type IN ('manual', 'scan', 'reset', 'registration')),
  note         TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE token_events DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_token_events_client
  ON token_events(client_id);

CREATE INDEX IF NOT EXISTS idx_token_events_created_at
  ON token_events(created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. RPC: adjust_tokens (atomic token adjustment with auto-reset at 8)
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

  -- Auto-reset when reaching 8
  IF v_new >= 8 AND p_delta > 0 THEN
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
