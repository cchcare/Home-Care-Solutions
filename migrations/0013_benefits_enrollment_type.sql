-- Replace plan-based uniqueness with benefit-type-based uniqueness
ALTER TABLE benefit_enrollments ADD COLUMN IF NOT EXISTS benefit_type benefit_type;

-- Backfill from referenced plan
UPDATE benefit_enrollments e
SET benefit_type = p.benefit_type
FROM benefit_plans p
WHERE e.plan_id = p.id AND e.benefit_type IS NULL;

ALTER TABLE benefit_enrollments ALTER COLUMN benefit_type SET NOT NULL;

-- Allow null plan_id for waived elections
ALTER TABLE benefit_enrollments ALTER COLUMN plan_id DROP NOT NULL;

DROP INDEX IF EXISTS uq_benefit_enrollments_emp_window_plan;
CREATE UNIQUE INDEX IF NOT EXISTS uq_benefit_enrollments_emp_window_type
  ON benefit_enrollments (employee_user_id, window_id, benefit_type);
