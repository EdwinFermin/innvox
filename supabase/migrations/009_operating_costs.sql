-- ============================================================================
-- 009 – Operating Costs & Scheduled Alerts
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS operating_costs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  friendly_id           TEXT NOT NULL,
  branch_id             TEXT NOT NULL REFERENCES branches(id),
  expense_type_id       UUID NOT NULL REFERENCES expense_types(id),
  name                  TEXT NOT NULL,
  default_amount        NUMERIC(15,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'DOP' CHECK (currency IN ('DOP','USD')),
  allows_custom_amount  BOOLEAN NOT NULL DEFAULT FALSE,
  frequency             TEXT NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly','custom')),
  custom_interval_days  INTEGER,
  day_of_month          INTEGER CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  description           TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES users(id)
);

ALTER TABLE operating_costs DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS operating_cost_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  friendly_id           TEXT NOT NULL,
  operating_cost_id     UUID NOT NULL REFERENCES operating_costs(id) ON DELETE CASCADE,
  branch_id             TEXT NOT NULL REFERENCES branches(id),
  due_date              DATE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  default_amount        NUMERIC(15,2) NOT NULL,
  actual_amount         NUMERIC(15,2),
  bank_account_id       UUID REFERENCES bank_accounts(id),
  linked_expense_id     UUID REFERENCES expenses(id),
  completed_at          TIMESTAMPTZ,
  completed_by          UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE operating_cost_alerts DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_operating_costs_branch
  ON operating_costs(branch_id);

CREATE INDEX IF NOT EXISTS idx_oc_alerts_branch_status
  ON operating_cost_alerts(branch_id, status);

CREATE INDEX IF NOT EXISTS idx_oc_alerts_due_date
  ON operating_cost_alerts(due_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oc_alerts_unique_period
  ON operating_cost_alerts(operating_cost_id, due_date);

-- ---------------------------------------------------------------------------
-- 3. Friendly IDs
-- ---------------------------------------------------------------------------

INSERT INTO friendly_id_counters (entity, prefix, last_value)
VALUES
  ('operating_costs', 'OPC', 0),
  ('operating_cost_alerts', 'OCA', 0)
ON CONFLICT (entity)
DO UPDATE
SET prefix = EXCLUDED.prefix,
    last_value = EXCLUDED.last_value,
    updated_at = NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_operating_costs_friendly_id
  ON operating_costs(friendly_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operating_cost_alerts_friendly_id
  ON operating_cost_alerts(friendly_id);

DROP TRIGGER IF EXISTS set_operating_costs_friendly_id ON operating_costs;
CREATE TRIGGER set_operating_costs_friendly_id
BEFORE INSERT ON operating_costs
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('OPC');

DROP TRIGGER IF EXISTS set_operating_cost_alerts_friendly_id ON operating_cost_alerts;
CREATE TRIGGER set_operating_cost_alerts_friendly_id
BEFORE INSERT ON operating_cost_alerts
FOR EACH ROW
EXECUTE FUNCTION assign_friendly_id('OCA');

-- ---------------------------------------------------------------------------
-- 4. RPC: generate_operating_cost_alerts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_operating_cost_alerts()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cost          RECORD;
  v_last_due      DATE;
  v_next_due      DATE;
  v_today         DATE := CURRENT_DATE;
  v_month_end     DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  v_count         INTEGER := 0;
  v_safe          INTEGER;
BEGIN
  FOR v_cost IN
    SELECT * FROM operating_costs WHERE is_active = TRUE
  LOOP
    -- Find the most recent alert due date for this cost
    SELECT MAX(due_date) INTO v_last_due
    FROM operating_cost_alerts
    WHERE operating_cost_id = v_cost.id;

    -- Generate all alerts up to end of current month (loop for frequencies with multiple per month)
    v_safe := 0;
    LOOP
      v_safe := v_safe + 1;
      IF v_safe > 10 THEN EXIT; END IF; -- safety limit

      -- Calculate next due date based on frequency
      IF v_cost.frequency = 'monthly' THEN
        IF v_last_due IS NULL THEN
          v_next_due := make_date(
            EXTRACT(YEAR FROM v_today)::INTEGER,
            EXTRACT(MONTH FROM v_today)::INTEGER,
            LEAST(v_cost.day_of_month, EXTRACT(DAY FROM v_month_end)::INTEGER)
          );
          IF v_next_due < v_today THEN
            -- Already past this month, create for next month
            v_next_due := make_date(
              EXTRACT(YEAR FROM v_today + INTERVAL '1 month')::INTEGER,
              EXTRACT(MONTH FROM v_today + INTERVAL '1 month')::INTEGER,
              LEAST(v_cost.day_of_month, EXTRACT(DAY FROM (DATE_TRUNC('month', v_today + INTERVAL '1 month') + INTERVAL '1 month' - INTERVAL '1 day')::DATE)::INTEGER)
            );
          END IF;
        ELSE
          v_next_due := make_date(
            EXTRACT(YEAR FROM v_last_due + INTERVAL '1 month')::INTEGER,
            EXTRACT(MONTH FROM v_last_due + INTERVAL '1 month')::INTEGER,
            LEAST(v_cost.day_of_month, EXTRACT(DAY FROM (DATE_TRUNC('month', v_last_due + INTERVAL '1 month') + INTERVAL '1 month' - INTERVAL '1 day')::DATE)::INTEGER)
          );
        END IF;

      ELSIF v_cost.frequency = 'biweekly' THEN
        -- Biweekly: 15th and last day of each month
        IF v_last_due IS NULL THEN
          IF EXTRACT(DAY FROM v_today)::INTEGER <= 15 THEN
            v_next_due := make_date(EXTRACT(YEAR FROM v_today)::INTEGER, EXTRACT(MONTH FROM v_today)::INTEGER, 15);
          ELSE
            v_next_due := (DATE_TRUNC('month', v_today) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
          END IF;
        ELSE
          IF EXTRACT(DAY FROM v_last_due)::INTEGER <= 15 THEN
            -- Last was on or before the 15th → next is last day of same month
            v_next_due := (DATE_TRUNC('month', v_last_due) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
          ELSE
            -- Last was after 15th (end-of-month) → next is 15th of next month
            v_next_due := make_date(
              EXTRACT(YEAR FROM v_last_due + INTERVAL '1 month')::INTEGER,
              EXTRACT(MONTH FROM v_last_due + INTERVAL '1 month')::INTEGER,
              15
            );
          END IF;
        END IF;

      ELSIF v_cost.frequency = 'weekly' THEN
        IF v_last_due IS NULL THEN
          v_next_due := v_today;
        ELSE
          v_next_due := v_last_due + INTERVAL '7 days';
        END IF;

      ELSIF v_cost.frequency = 'custom' THEN
        IF v_last_due IS NULL THEN
          v_next_due := v_today;
        ELSE
          v_next_due := v_last_due + (v_cost.custom_interval_days || ' days')::INTERVAL;
        END IF;

      ELSE
        EXIT; -- unknown frequency
      END IF;

      -- Stop if past end of current month
      IF v_next_due > v_month_end THEN
        EXIT;
      END IF;

      INSERT INTO operating_cost_alerts (operating_cost_id, branch_id, due_date, default_amount)
      VALUES (v_cost.id, v_cost.branch_id, v_next_due, v_cost.default_amount)
      ON CONFLICT (operating_cost_id, due_date) DO NOTHING;

      IF FOUND THEN
        v_count := v_count + 1;
      END IF;

      -- Advance v_last_due for the next iteration
      v_last_due := v_next_due;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: complete_operating_cost_alert
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION complete_operating_cost_alert(
  p_alert_id        UUID,
  p_actual_amount   NUMERIC,
  p_bank_account_id UUID DEFAULT NULL,
  p_completed_by    UUID DEFAULT NULL,
  p_lbtr_fee        NUMERIC DEFAULT 0,
  p_transfer_tax    NUMERIC DEFAULT 0,
  p_skip_expense    BOOLEAN DEFAULT FALSE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_alert   operating_cost_alerts%ROWTYPE;
  v_cost    operating_costs%ROWTYPE;
  v_expense_id UUID := NULL;
  v_description TEXT;
BEGIN
  -- Lock and verify alert
  SELECT * INTO v_alert FROM operating_cost_alerts WHERE id = p_alert_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Alerta no encontrada'; END IF;
  IF v_alert.status = 'completed' THEN RAISE EXCEPTION 'Esta alerta ya fue completada'; END IF;

  -- Create expense only if not skipping
  IF NOT COALESCE(p_skip_expense, FALSE) THEN
    -- Get the operating cost
    SELECT * INTO v_cost FROM operating_costs WHERE id = v_alert.operating_cost_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Costo operativo no encontrado'; END IF;

    -- Build description
    v_description := v_cost.name || ' - ' || TO_CHAR(v_alert.due_date, 'DD/MM/YYYY');

    -- Create expense using existing RPC (reuse all expense + bank transaction logic)
    v_expense_id := create_expense(
      p_branch_id       := v_cost.branch_id,
      p_expense_type_id := v_cost.expense_type_id,
      p_amount          := p_actual_amount,
      p_description     := v_description,
      p_date            := NOW(),
      p_bank_account_id := p_bank_account_id,
      p_created_by      := p_completed_by,
      p_lbtr_fee        := COALESCE(p_lbtr_fee, 0),
      p_transfer_tax    := COALESCE(p_transfer_tax, 0)
    );
  END IF;

  -- Update alert as completed
  UPDATE operating_cost_alerts
  SET status = 'completed',
      actual_amount = p_actual_amount,
      bank_account_id = p_bank_account_id,
      linked_expense_id = v_expense_id,
      completed_at = NOW(),
      completed_by = p_completed_by
  WHERE id = p_alert_id;

  RETURN v_expense_id;
END;
$$;
