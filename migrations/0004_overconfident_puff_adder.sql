-- Corrective Action Plan Builder for DOH Audit Deficiencies
-- This migration adds the doh_audit_corrective_action_status enum and
-- doh_audit_corrective_actions table with FK references to both
-- doh_audit_assessments and doh_audit_responses (via composite unique index).

CREATE TYPE "public"."doh_audit_corrective_action_status" AS ENUM('open', 'in_progress', 'resolved');--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "doh_audit_corrective_actions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "audit_id" varchar NOT NULL,
  "item_key" varchar NOT NULL,
  "responsible_party" varchar,
  "target_date" date,
  "completion_date" date,
  "action_steps" text,
  "status" "doh_audit_corrective_action_status" DEFAULT 'open' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "doh_audit_corrective_actions_audit_id_doh_audit_assessments_id_fk" FOREIGN KEY ("audit_id") REFERENCES "doh_audit_assessments"("id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_doh_audit_ca_audit" ON "doh_audit_corrective_actions" ("audit_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_doh_audit_ca_unique" ON "doh_audit_corrective_actions" ("audit_id", "item_key");--> statement-breakpoint

-- Add composite FK from corrective_actions to responses (unique index satisfies FK constraint in PostgreSQL)
ALTER TABLE "doh_audit_corrective_actions"
  ADD CONSTRAINT "fk_ca_response" FOREIGN KEY ("audit_id", "item_key")
  REFERENCES "doh_audit_responses" ("audit_id", "item_key") ON DELETE CASCADE;--> statement-breakpoint
