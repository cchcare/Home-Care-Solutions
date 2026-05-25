-- Task 138: Benefits enrollment

DO $$ BEGIN
  CREATE TYPE "benefit_type" AS ENUM ('health','dental','vision','life','disability','retirement_401k','fsa','hsa','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "benefit_tier" AS ENUM ('employee','employee_spouse','employee_children','employee_family','waived');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "enrollment_window_type" AS ENUM ('open_enrollment','new_hire','qualifying_life_event');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "benefit_enrollment_status" AS ENUM ('draft','submitted','waived','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "benefit_dependent_relationship" AS ENUM ('spouse','domestic_partner','child','stepchild','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "benefit_plans" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" varchar,
  "office_id" varchar REFERENCES "offices"("id"),
  "carrier" varchar NOT NULL,
  "plan_name" varchar NOT NULL,
  "benefit_type" "benefit_type" NOT NULL,
  "plan_year" integer,
  "effective_from" date NOT NULL,
  "effective_to" date,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benefit_plans_org" ON "benefit_plans" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benefit_plans_office" ON "benefit_plans" ("office_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benefit_plans_type" ON "benefit_plans" ("benefit_type");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "benefit_plan_rates" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" varchar NOT NULL REFERENCES "benefit_plans"("id") ON DELETE CASCADE,
  "tier" "benefit_tier" NOT NULL,
  "employee_cost_per_pay_period" numeric(10,2) NOT NULL,
  "employer_cost_per_pay_period" numeric(10,2) DEFAULT 0,
  "pay_periods_per_year" integer DEFAULT 26,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benefit_plan_rates_plan" ON "benefit_plan_rates" ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_benefit_plan_rates_plan_tier" ON "benefit_plan_rates" ("plan_id","tier");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "enrollment_windows" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" varchar,
  "name" varchar NOT NULL,
  "window_type" "enrollment_window_type" NOT NULL DEFAULT 'open_enrollment',
  "employee_user_id" varchar REFERENCES "users"("id"),
  "reason_code" varchar,
  "starts_at" date NOT NULL,
  "ends_at" date NOT NULL,
  "coverage_effective_date" date,
  "notes" text,
  "created_by" varchar REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enrollment_windows_org" ON "enrollment_windows" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enrollment_windows_employee" ON "enrollment_windows" ("employee_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enrollment_windows_dates" ON "enrollment_windows" ("starts_at","ends_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "benefit_enrollments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" varchar,
  "employee_user_id" varchar NOT NULL REFERENCES "users"("id"),
  "window_id" varchar NOT NULL REFERENCES "enrollment_windows"("id"),
  "plan_id" varchar NOT NULL REFERENCES "benefit_plans"("id"),
  "tier" "benefit_tier" NOT NULL,
  "status" "benefit_enrollment_status" NOT NULL DEFAULT 'draft',
  "coverage_effective_date" date,
  "signed_name" varchar,
  "signed_at" timestamp,
  "signature_ip" varchar,
  "document_id" varchar REFERENCES "documents"("id"),
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benefit_enrollments_employee" ON "benefit_enrollments" ("employee_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benefit_enrollments_window" ON "benefit_enrollments" ("window_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benefit_enrollments_plan" ON "benefit_enrollments" ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_benefit_enrollments_emp_window_plan" ON "benefit_enrollments" ("employee_user_id","window_id","plan_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "benefit_dependents" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enrollment_id" varchar NOT NULL REFERENCES "benefit_enrollments"("id") ON DELETE CASCADE,
  "first_name" varchar NOT NULL,
  "last_name" varchar NOT NULL,
  "relationship" "benefit_dependent_relationship" NOT NULL,
  "date_of_birth" date,
  "ssn_last4" varchar,
  "gender" varchar,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benefit_dependents_enrollment" ON "benefit_dependents" ("enrollment_id");--> statement-breakpoint
