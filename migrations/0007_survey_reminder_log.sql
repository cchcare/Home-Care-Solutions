CREATE TABLE "survey_reminder_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"office_id" varchar,
	"gap_type" varchar NOT NULL,
	"sent_by_user_id" varchar,
	"recipient_email" varchar,
	"status" varchar DEFAULT 'sent',
	"error_message" text,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "survey_reminder_log" ADD CONSTRAINT "survey_reminder_log_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_reminder_log" ADD CONSTRAINT "survey_reminder_log_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_reminder_log" ADD CONSTRAINT "survey_reminder_log_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_survey_reminder_caregiver_sent" ON "survey_reminder_log" USING btree ("caregiver_id","sent_at");--> statement-breakpoint
CREATE INDEX "idx_survey_reminder_office_sent" ON "survey_reminder_log" USING btree ("office_id","sent_at");