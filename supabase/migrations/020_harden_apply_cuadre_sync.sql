-- 020_harden_apply_cuadre_sync.sql
-- Address Supabase advisors raised for apply_cuadre_sync:
--   * function_search_path_mutable: pin search_path to public, pg_temp.
--   * anon_security_definer_function_executable: revoke EXECUTE from anon.
--   * authenticated_security_definer_function_executable: revoke EXECUTE
--     from authenticated.
--
-- This function is only invoked from server actions via the service_role
-- client (see src/lib/supabase/server.ts), so the public REST role does not
-- need EXECUTE permission. service_role bypasses these privilege checks.

ALTER FUNCTION public.apply_cuadre_sync(TEXT, DATE, TEXT, JSONB, UUID)
  SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.apply_cuadre_sync(TEXT, DATE, TEXT, JSONB, UUID)
  FROM PUBLIC, anon, authenticated;
