-- Fix: friendly_id_counters had RLS auto-enabled by Supabase with no policies,
-- blocking all writes from triggers when inserting into any table with friendly IDs.
--
-- Two-part fix:
-- 1. Disable RLS on friendly_id_counters (consistent with all other tables in the project)
-- 2. Mark both functions as SECURITY DEFINER as a safety net

ALTER TABLE friendly_id_counters DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION next_friendly_id(p_entity TEXT, p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_value BIGINT;
BEGIN
  INSERT INTO friendly_id_counters (entity, prefix, last_value)
  VALUES (p_entity, p_prefix, 1)
  ON CONFLICT (entity)
  DO UPDATE
  SET prefix = EXCLUDED.prefix,
      last_value = friendly_id_counters.last_value + 1,
      updated_at = NOW()
  RETURNING last_value INTO v_next_value;

  RETURN p_prefix || '-' || LPAD(v_next_value::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION assign_friendly_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.friendly_id IS NULL OR BTRIM(NEW.friendly_id) = '' THEN
    NEW.friendly_id := next_friendly_id(TG_TABLE_NAME, TG_ARGV[0]);
  END IF;

  RETURN NEW;
END;
$$;
