CREATE TABLE "user_saved_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"page" varchar NOT NULL,
	"name" varchar NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb,
	"columns" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "caregiver_exclusion_checks" ADD COLUMN "match_reason" varchar;--> statement-breakpoint
ALTER TABLE "caregiver_exclusion_checks" ADD COLUMN "matched_identifier" varchar;--> statement-breakpoint
ALTER TABLE "caregivers" ADD COLUMN "npi" varchar;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "hhax_patient_code" varchar;--> statement-breakpoint
ALTER TABLE "exclusion_records" ADD COLUMN "title" varchar;--> statement-breakpoint
ALTER TABLE "exclusion_records" ADD COLUMN "suffix" varchar;--> statement-breakpoint
ALTER TABLE "exclusion_records" ADD COLUMN "alias_name" varchar;--> statement-breakpoint
ALTER TABLE "exclusion_records" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "exclusion_records" ADD COLUMN "license_number" varchar;--> statement-breakpoint
ALTER TABLE "exclusion_records" ADD COLUMN "fein" varchar;--> statement-breakpoint
ALTER TABLE "exclusion_records" ADD COLUMN "exclusion_status" varchar;--> statement-breakpoint
ALTER TABLE "user_saved_views" ADD CONSTRAINT "user_saved_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_saved_view" ON "user_saved_views" USING btree ("user_id","page","name");--> statement-breakpoint
CREATE INDEX "idx_user_saved_views_user_page" ON "user_saved_views" USING btree ("user_id","page");--> statement-breakpoint
CREATE INDEX "idx_exclusion_records_license" ON "exclusion_records" USING btree ("license_number");--> statement-breakpoint
CREATE INDEX "idx_exclusion_records_npi" ON "exclusion_records" USING btree ("npi");