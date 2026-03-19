CREATE TABLE IF NOT EXISTS friendly_id_counters (
  entity TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  last_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

ALTER TABLE users ADD COLUMN IF NOT EXISTS friendly_id TEXT;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS friendly_id TEXT;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS friendly_id TEXT;
ALTER TABLE income_types ADD COLUMN IF NOT EXISTS friendly_id TEXT;
ALTER TABLE expense_types ADD COLUMN IF NOT EXISTS friendly_id TEXT;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS friendly_id TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS friendly_id TEXT;
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS friendly_id TEXT;
ALTER TABLE payables ADD COLUMN IF NOT EXISTS friendly_id TEXT;
ALTER TABLE link_payments ADD COLUMN IF NOT EXISTS friendly_id TEXT;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM users
)
UPDATE users AS target
SET friendly_id = 'USR-' || LPAD(ordered.seq::TEXT, 6, '0')
FROM ordered
WHERE target.id = ordered.id
  AND target.friendly_id IS NULL;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM bank_accounts
)
UPDATE bank_accounts AS target
SET friendly_id = 'ACC-' || LPAD(ordered.seq::TEXT, 6, '0')
FROM ordered
WHERE target.id = ordered.id
  AND target.friendly_id IS NULL;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM bank_transactions
)
UPDATE bank_transactions AS target
SET friendly_id = 'BTX-' || LPAD(ordered.seq::TEXT, 6, '0')
FROM ordered
WHERE target.id = ordered.id
  AND target.friendly_id IS NULL;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM income_types
)
UPDATE income_types AS target
SET friendly_id = 'ITY-' || LPAD(ordered.seq::TEXT, 6, '0')
FROM ordered
WHERE target.id = ordered.id
  AND target.friendly_id IS NULL;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM expense_types
)
UPDATE expense_types AS target
SET friendly_id = 'ETY-' || LPAD(ordered.seq::TEXT, 6, '0')
FROM ordered
WHERE target.id = ordered.id
  AND target.friendly_id IS NULL;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM incomes
)
UPDATE incomes AS target
SET friendly_id = 'INC-' || LPAD(ordered.seq::TEXT, 6, '0')
FROM ordered
WHERE target.id = ordered.id
  AND target.friendly_id IS NULL;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM expenses
)
UPDATE expenses AS target
SET friendly_id = 'EXP-' || LPAD(ordered.seq::TEXT, 6, '0')
FROM ordered
WHERE target.id = ordered.id
  AND target.friendly_id IS NULL;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM receivables
)
UPDATE receivables AS target
SET friendly_id = 'REC-' || LPAD(ordered.seq::TEXT, 6, '0')
FROM ordered
WHERE target.id = ordered.id
  AND target.friendly_id IS NULL;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM payables
)
UPDATE payables AS target
SET friendly_id = 'PAY-' || LPAD(ordered.seq::TEXT, 6, '0')
FROM ordered
WHERE target.id = ordered.id
  AND target.friendly_id IS NULL;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM link_payments
)
UPDATE link_payments AS target
SET friendly_id = 'LNK-' || LPAD(ordered.seq::TEXT, 6, '0')
FROM ordered
WHERE target.id = ordered.id
  AND target.friendly_id IS NULL;

INSERT INTO friendly_id_counters (entity, prefix, last_value)
VALUES
  ('users', 'USR', COALESCE((SELECT MAX(SUBSTRING(friendly_id FROM '[0-9]+$')::BIGINT) FROM users), 0)),
  ('bank_accounts', 'ACC', COALESCE((SELECT MAX(SUBSTRING(friendly_id FROM '[0-9]+$')::BIGINT) FROM bank_accounts), 0)),
  ('bank_transactions', 'BTX', COALESCE((SELECT MAX(SUBSTRING(friendly_id FROM '[0-9]+$')::BIGINT) FROM bank_transactions), 0)),
  ('income_types', 'ITY', COALESCE((SELECT MAX(SUBSTRING(friendly_id FROM '[0-9]+$')::BIGINT) FROM income_types), 0)),
  ('expense_types', 'ETY', COALESCE((SELECT MAX(SUBSTRING(friendly_id FROM '[0-9]+$')::BIGINT) FROM expense_types), 0)),
  ('incomes', 'INC', COALESCE((SELECT MAX(SUBSTRING(friendly_id FROM '[0-9]+$')::BIGINT) FROM incomes), 0)),
  ('expenses', 'EXP', COALESCE((SELECT MAX(SUBSTRING(friendly_id FROM '[0-9]+$')::BIGINT) FROM expenses), 0)),
  ('receivables', 'REC', COALESCE((SELECT MAX(SUBSTRING(friendly_id FROM '[0-9]+$')::BIGINT) FROM receivables), 0)),
  ('payables', 'PAY', COALESCE((SELECT MAX(SUBSTRING(friendly_id FROM '[0-9]+$')::BIGINT) FROM payables), 0)),
  ('link_payments', 'LNK', COALESCE((SELECT MAX(SUBSTRING(friendly_id FROM '[0-9]+$')::BIGINT) FROM link_payments), 0))
ON CONFLICT (entity)
DO UPDATE
SET prefix = EXCLUDED.prefix,
    last_value = EXCLUDED.last_value,
    updated_at = NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_friendly_id ON users(friendly_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_friendly_id ON bank_accounts(friendly_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_friendly_id ON bank_transactions(friendly_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_income_types_friendly_id ON income_types(friendly_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_types_friendly_id ON expense_types(friendly_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_incomes_friendly_id ON incomes(friendly_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_friendly_id ON expenses(friendly_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_receivables_friendly_id ON receivables(friendly_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payables_friendly_id ON payables(friendly_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_link_payments_friendly_id ON link_payments(friendly_id);

ALTER TABLE users ALTER COLUMN friendly_id SET NOT NULL;
ALTER TABLE bank_accounts ALTER COLUMN friendly_id SET NOT NULL;
ALTER TABLE bank_transactions ALTER COLUMN friendly_id SET NOT NULL;
ALTER TABLE income_types ALTER COLUMN friendly_id SET NOT NULL;
ALTER TABLE expense_types ALTER COLUMN friendly_id SET NOT NULL;
ALTER TABLE incomes ALTER COLUMN friendly_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN friendly_id SET NOT NULL;
ALTER TABLE receivables ALTER COLUMN friendly_id SET NOT NULL;
ALTER TABLE payables ALTER COLUMN friendly_id SET NOT NULL;
ALTER TABLE link_payments ALTER COLUMN friendly_id SET NOT NULL;

DROP TRIGGER IF EXISTS set_users_friendly_id ON users;
CREATE TRIGGER set_users_friendly_id
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('USR');

DROP TRIGGER IF EXISTS set_bank_accounts_friendly_id ON bank_accounts;
CREATE TRIGGER set_bank_accounts_friendly_id
BEFORE INSERT ON bank_accounts
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('ACC');

DROP TRIGGER IF EXISTS set_bank_transactions_friendly_id ON bank_transactions;
CREATE TRIGGER set_bank_transactions_friendly_id
BEFORE INSERT ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('BTX');

DROP TRIGGER IF EXISTS set_income_types_friendly_id ON income_types;
CREATE TRIGGER set_income_types_friendly_id
BEFORE INSERT ON income_types
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('ITY');

DROP TRIGGER IF EXISTS set_expense_types_friendly_id ON expense_types;
CREATE TRIGGER set_expense_types_friendly_id
BEFORE INSERT ON expense_types
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('ETY');

DROP TRIGGER IF EXISTS set_incomes_friendly_id ON incomes;
CREATE TRIGGER set_incomes_friendly_id
BEFORE INSERT ON incomes
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('INC');

DROP TRIGGER IF EXISTS set_expenses_friendly_id ON expenses;
CREATE TRIGGER set_expenses_friendly_id
BEFORE INSERT ON expenses
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('EXP');

DROP TRIGGER IF EXISTS set_receivables_friendly_id ON receivables;
CREATE TRIGGER set_receivables_friendly_id
BEFORE INSERT ON receivables
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('REC');

DROP TRIGGER IF EXISTS set_payables_friendly_id ON payables;
CREATE TRIGGER set_payables_friendly_id
BEFORE INSERT ON payables
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('PAY');

DROP TRIGGER IF EXISTS set_link_payments_friendly_id ON link_payments;
CREATE TRIGGER set_link_payments_friendly_id
BEFORE INSERT ON link_payments
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('LNK');
