-- Replace coarse PTO ledger uniqueness with source-specific idempotency rules.
-- Old index: (caregiver_id, pto_type, run_date, source) — too coarse, dropped
-- approving a second time-off request on the same day.

DROP INDEX IF EXISTS uq_pto_ledger_accrual;

-- Accrual idempotency: at most one accrual per caregiver/type/day.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pto_ledger_accrual_day
  ON pto_ledger (caregiver_id, pto_type, run_date)
  WHERE source = 'accrual';

-- Request-driven events: at most one debit and one reversal per source request.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pto_ledger_request_event
  ON pto_ledger (source_request_id, source)
  WHERE source_request_id IS NOT NULL AND source IN ('debit', 'reversal');
