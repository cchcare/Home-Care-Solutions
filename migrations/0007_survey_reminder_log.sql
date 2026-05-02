-- Survey Readiness Hub: per-caregiver reminder log used to rate-limit
-- nudge emails and provide an audit trail of who reminded whom and when.

CREATE TABLE IF NOT EXISTS "survey_reminder_log" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caregiver_id" varchar NOT NULL,
  "office_id" varchar,
  "gap_type" varchar NOT NULL,
  "sent_by_user_id" varchar,
  "recipient_email" varchar NOT NULL,
  "status" varchar DEFAULT 'sent' NOT NULL,
  "error_message" text,
  "sent_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "survey_reminder_log_caregiver_id_caregivers_id_fk"
    FOREIGN KEY ("caregiver_id") REFERENCES "caregivers"("id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_survey_reminder_caregiver_sent"
  ON "survey_reminder_log" ("caregiver_id", "sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_survey_reminder_office"
  ON "survey_reminder_log" ("office_id");--> statement-breakpoint
