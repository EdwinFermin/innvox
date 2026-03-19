-- Disable RLS on all tables.
--
-- This project uses NextAuth for authentication, not Supabase Auth.
-- The browser Supabase client has no Supabase Auth JWT, so auth.uid()
-- is always NULL and RLS policies would block all operations.
--
-- Security is enforced at the application level:
--   - Server Actions: requireAuth() / requirePermission() guards
--   - Client hooks: only rendered inside authenticated dashboard layout
--   - Proxy middleware: gates /dashboard/** routes via NextAuth session

ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account_branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE receivables DISABLE ROW LEVEL SECURITY;
ALTER TABLE payables DISABLE ROW LEVEL SECURITY;
ALTER TABLE link_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE ncf_released_numbers DISABLE ROW LEVEL SECURITY;
ALTER TABLE friendly_id_counters DISABLE ROW LEVEL SECURITY;
