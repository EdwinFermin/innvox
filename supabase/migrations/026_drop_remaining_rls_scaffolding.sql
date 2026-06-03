-- Migration 026: drop the remaining dead Supabase-Auth RLS scaffolding.
--
-- Completes the cleanup from migration 025. The app uses NextAuth (not Supabase
-- Auth) and migration 007 disabled RLS on every table below, so these policies
-- are inert (auth.uid() is always NULL; access is governed by app-level guards).
--
-- The `ensure_rls` event trigger + rls_auto_enable() auto-enabled RLS on every
-- new public table, which contradicts the app-level security model in migration
-- 007; removed so new tables follow the documented model.
--
-- apple_wallet_devices keeps RLS enabled (no policies, service-role-only access)
-- on purpose — it is the one table intended to stay protected, and dropping the
-- event trigger does not change existing tables.

-- 1. Remaining inert policies (auth.uid()/column-based; RLS disabled on all)
DROP POLICY IF EXISTS authenticated_read ON public.bank_account_branches;
DROP POLICY IF EXISTS authenticated_read ON public.bank_accounts;
DROP POLICY IF EXISTS public_read_active ON public.bank_accounts;
DROP POLICY IF EXISTS authenticated_read ON public.bank_transactions;
DROP POLICY IF EXISTS authenticated_read ON public.branches;
DROP POLICY IF EXISTS authenticated_read ON public.clients;
DROP POLICY IF EXISTS authenticated_read ON public.configs;
DROP POLICY IF EXISTS authenticated_read ON public.expense_types;
DROP POLICY IF EXISTS user_insert ON public.expenses;
DROP POLICY IF EXISTS user_read_own ON public.expenses;
DROP POLICY IF EXISTS authenticated_read ON public.income_types;
DROP POLICY IF EXISTS user_insert ON public.incomes;
DROP POLICY IF EXISTS user_read_own ON public.incomes;
DROP POLICY IF EXISTS user_insert ON public.invoices;
DROP POLICY IF EXISTS user_read_own ON public.invoices;
DROP POLICY IF EXISTS public_read_pending ON public.link_payments;
DROP POLICY IF EXISTS public_update_complete ON public.link_payments;
DROP POLICY IF EXISTS user_insert ON public.link_payments;
DROP POLICY IF EXISTS user_read_own ON public.link_payments;
DROP POLICY IF EXISTS authenticated_read ON public.ncf_released_numbers;
DROP POLICY IF EXISTS user_insert ON public.payables;
DROP POLICY IF EXISTS user_read_own ON public.payables;
DROP POLICY IF EXISTS user_insert ON public.receivables;
DROP POLICY IF EXISTS user_read_own ON public.receivables;
DROP POLICY IF EXISTS user_read_own ON public.user_branches;
DROP POLICY IF EXISTS user_read_self ON public.users;

-- 2. Event trigger that auto-enables RLS on new public tables + its function
DROP EVENT TRIGGER IF EXISTS ensure_rls;
DROP FUNCTION IF EXISTS public.rls_auto_enable();
