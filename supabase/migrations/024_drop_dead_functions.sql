-- Migration 024: drop the dead generate_cf() function.
--
-- generate_cf() (migration 001) is a legacy "comprobante fiscal" number
-- generator with zero callers: the app only uses generate_ncf() for fiscal
-- numbers. It has no dependent objects. increment_sequential_number() is kept —
-- the live generate_ncf() still depends on it.
--
-- NOTE: auth_is_admin() / auth_user_role() (also migration 001) look unused
-- because migration 007 disabled RLS, but they are deliberately NOT dropped
-- here. 17 live admin_all / admin_write RLS policies still depend on
-- auth_is_admin() (and it calls auth_user_role()), so dropping them would
-- require CASCADE and would remove those policies. Those policies are not
-- captured in any migration (schema drift); removing the dormant RLS layer is a
-- separate, deliberate decision.

DROP FUNCTION IF EXISTS generate_cf();
