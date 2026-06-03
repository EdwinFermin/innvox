-- Migration 025: drop the dead Supabase-Auth RLS admin layer.
--
-- The app uses NextAuth, not Supabase Auth. Migration 007 disabled RLS on every
-- table and documents that security is enforced app-side (server guards + proxy
-- middleware). The admin_all / admin_write RLS policies, and the
-- auth_is_admin() / auth_user_role() helpers they call, are therefore inert
-- dead code: RLS is disabled on every table they guard, and no app code calls
-- the functions (auth.uid() is always NULL under NextAuth anyway).
--
-- Drop the 17 admin policies first (they are the only objects that depend on
-- auth_is_admin()), then the two helper functions (auth_user_role() is only
-- referenced by auth_is_admin()).
--
-- Deliberately NOT touched here:
--   * the inert authenticated_read / user_* / public_* policies — they reference
--     the built-in auth.uid(), not our helpers, so they don't block this drop.
--   * the `ensure_rls` event trigger + rls_auto_enable() — still ACTIVE (it
--     auto-enables RLS on new public tables; e.g. apple_wallet_devices). Removing
--     it is a behavioral change, handled separately.

DROP POLICY IF EXISTS admin_all ON public.users;
DROP POLICY IF EXISTS admin_all ON public.user_branches;
DROP POLICY IF EXISTS admin_write ON public.branches;
DROP POLICY IF EXISTS admin_write ON public.clients;
DROP POLICY IF EXISTS admin_all ON public.bank_accounts;
DROP POLICY IF EXISTS admin_all ON public.bank_account_branches;
DROP POLICY IF EXISTS admin_all ON public.bank_transactions;
DROP POLICY IF EXISTS admin_write ON public.income_types;
DROP POLICY IF EXISTS admin_write ON public.expense_types;
DROP POLICY IF EXISTS admin_all ON public.incomes;
DROP POLICY IF EXISTS admin_all ON public.expenses;
DROP POLICY IF EXISTS admin_all ON public.invoices;
DROP POLICY IF EXISTS admin_all ON public.receivables;
DROP POLICY IF EXISTS admin_all ON public.payables;
DROP POLICY IF EXISTS admin_all ON public.link_payments;
DROP POLICY IF EXISTS admin_write ON public.configs;
DROP POLICY IF EXISTS admin_write ON public.ncf_released_numbers;

DROP FUNCTION IF EXISTS auth_is_admin();
DROP FUNCTION IF EXISTS auth_user_role();
