-- Migration 023: drop dead fee-unaware overloads of create_expense / transfer_funds.
--
-- Migration 008 added fee-aware overloads of both RPCs (extra p_lbtr_fee /
-- p_transfer_tax params), and migration 022 wired repair_bank_transaction_balances()
-- into those fee-aware versions so running balances self-heal on write. The
-- original fee-unaware overloads from migration 001 were left in place.
--
-- Every caller passes the fee params, so PostgREST and SQL name resolution always
-- bind to the fee-aware overloads, never these:
--   - src/actions/expenses.ts        create_expense  (9 named args incl. fees)
--   - src/actions/bank-accounts.ts   transfer_funds  (7 args incl. fees)
--   - 009_operating_costs.sql        create_expense  (9 named args incl. fees)
--   - 016_loyalty_reward_expense.sql create_expense  (9 positional args, fees = 0)
--
-- The legacy overloads are therefore dead code AND dangerous: they predate
-- migration 022 and lack the repair call, so any future caller hitting them would
-- reintroduce broken running balances. Drop them by explicit signature; the
-- fee-aware overloads (different arity) are unaffected.

DROP FUNCTION IF EXISTS create_expense(text, uuid, numeric, text, timestamptz, uuid, uuid);
DROP FUNCTION IF EXISTS transfer_funds(uuid, uuid, numeric, text, uuid);
