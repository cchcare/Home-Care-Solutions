DO $$ BEGIN
  CREATE TYPE "pto_accrual_frequency" AS ENUM ('weekly','biweekly','semi_monthly','monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "pto_ledger_source" AS ENUM ('accrual','debit','reversal','adjustment','carryover');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pto_policies" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" varchar,
  "name" varchar NOT NULL,
  "pto_type" "pto_type" NOT NULL,
  "role" varchar,
  "office_id" varchar,
  "hours_per_period" numeric(10,2) NOT NULL,
  "cap_hours" numeric(10,2),
  "accrual_frequency" "pto_accrual_frequency" DEFAULT 'biweekly',
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pto_policies_office_id_offices_id_fk') THEN
    ALTER TABLE "pto_policies" ADD CONSTRAINT "pto_policies_office_id_offices_id_fk"
      FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_pto_policies_office" ON "pto_policies" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pto_policies_role" ON "pto_policies" USING btree ("role");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pto_ledger" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "caregiver_id" varchar NOT NULL,
  "pto_type" "pto_type" NOT NULL,
  "source" "pto_ledger_source" NOT NULL,
  "delta_hours" numeric(10,2) NOT NULL,
  "run_date" date NOT NULL,
  "policy_id" varchar,
  "source_request_id" varchar,
  "reason" text,
  "created_by" varchar,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pto_ledger_caregiver_id_caregivers_id_fk') THEN
    ALTER TABLE "pto_ledger" ADD CONSTRAINT "pto_ledger_caregiver_id_caregivers_id_fk"
      FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pto_ledger_policy_id_pto_policies_id_fk') THEN
    ALTER TABLE "pto_ledger" ADD CONSTRAINT "pto_ledger_policy_id_pto_policies_id_fk"
      FOREIGN KEY ("policy_id") REFERENCES "public"."pto_policies"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pto_ledger_source_request_id_time_off_requests_id_fk') THEN
    ALTER TABLE "pto_ledger" ADD CONSTRAINT "pto_ledger_source_request_id_time_off_requests_id_fk"
      FOREIGN KEY ("source_request_id") REFERENCES "public"."time_off_requests"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pto_ledger_created_by_users_id_fk') THEN
    ALTER TABLE "pto_ledger" ADD CONSTRAINT "pto_ledger_created_by_users_id_fk"
      FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_pto_ledger_caregiver" ON "pto_ledger" USING btree ("caregiver_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pto_ledger_request" ON "pto_ledger" USING btree ("source_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pto_ledger_accrual" ON "pto_ledger" USING btree ("caregiver_id","pto_type","run_date","source");
