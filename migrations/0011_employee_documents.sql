-- Task 133: Per-employee document library
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "document_category" varchar;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documents_expires_at" ON "documents" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documents_category" ON "documents" USING btree ("document_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documents_user" ON "documents" USING btree ("user_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "policy_assignments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "policy_id" varchar NOT NULL,
  "user_id" varchar NOT NULL,
  "office_id" varchar,
  "due_at" timestamp,
  "assigned_by" varchar,
  "assigned_at" timestamp DEFAULT now()
);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'policy_assignments_policy_id_policy_documents_id_fk') THEN
    ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_policy_id_policy_documents_id_fk"
      FOREIGN KEY ("policy_id") REFERENCES "public"."policy_documents"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'policy_assignments_user_id_users_id_fk') THEN
    ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'policy_assignments_office_id_offices_id_fk') THEN
    ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_office_id_offices_id_fk"
      FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'policy_assignments_assigned_by_users_id_fk') THEN
    ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_assigned_by_users_id_fk"
      FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_policy_assignment_unique" ON "policy_assignments" USING btree ("policy_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_policy_assignment_user" ON "policy_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_policy_assignment_office" ON "policy_assignments" USING btree ("office_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "policy_reminder_log" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "policy_id" varchar NOT NULL,
  "user_id" varchar NOT NULL,
  "sent_by_user_id" varchar,
  "recipient_email" varchar,
  "status" varchar DEFAULT 'sent',
  "error_message" text,
  "sent_at" timestamp DEFAULT now()
);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'policy_reminder_log_policy_id_policy_documents_id_fk') THEN
    ALTER TABLE "policy_reminder_log" ADD CONSTRAINT "policy_reminder_log_policy_id_policy_documents_id_fk"
      FOREIGN KEY ("policy_id") REFERENCES "public"."policy_documents"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'policy_reminder_log_user_id_users_id_fk') THEN
    ALTER TABLE "policy_reminder_log" ADD CONSTRAINT "policy_reminder_log_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'policy_reminder_log_sent_by_user_id_users_id_fk') THEN
    ALTER TABLE "policy_reminder_log" ADD CONSTRAINT "policy_reminder_log_sent_by_user_id_users_id_fk"
      FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_policy_reminder_user_sent" ON "policy_reminder_log" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_policy_reminder_policy_sent" ON "policy_reminder_log" USING btree ("policy_id","sent_at");
