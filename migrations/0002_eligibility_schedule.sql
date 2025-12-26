CREATE TYPE "public"."eligibility_check_status" AS ENUM('active', 'inactive', 'pending', 'error', 'not_found');--> statement-breakpoint
CREATE TYPE "public"."eligibility_check_type" AS ENUM('medicaid', 'medicare', 'private_insurance', 'mco');--> statement-breakpoint
CREATE TYPE "public"."eligibility_schedule_frequency" AS ENUM('weekly', 'monthly', 'quarterly');--> statement-breakpoint
CREATE TYPE "public"."pto_type" AS ENUM('vacation', 'sick', 'personal');--> statement-breakpoint
CREATE TYPE "public"."survey_respondent_type" AS ENUM('client', 'caregiver', 'family');--> statement-breakpoint
CREATE TYPE "public"."survey_status" AS ENUM('pending', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."survey_type" AS ENUM('client_satisfaction', 'caregiver_feedback', 'exit_survey', 'quarterly_review');--> statement-breakpoint
CREATE TYPE "public"."time_off_request_status" AS ENUM('pending', 'approved', 'denied', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."time_off_request_type" AS ENUM('vacation', 'sick', 'personal', 'bereavement', 'jury_duty', 'fmla', 'unpaid');--> statement-breakpoint
CREATE TABLE "eligibility_schedule" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"check_frequency" "eligibility_schedule_frequency" DEFAULT 'monthly',
	"last_checked" timestamp,
	"next_check_date" timestamp,
	"is_active" boolean DEFAULT true,
	"check_type" "eligibility_check_type" DEFAULT 'medicaid',
	"payer_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pto_balances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"year" integer NOT NULL,
	"pto_type" "pto_type" NOT NULL,
	"accrued" numeric(10, 2) DEFAULT '0',
	"used" numeric(10, 2) DEFAULT '0',
	"pending" numeric(10, 2) DEFAULT '0',
	"available" numeric(10, 2) DEFAULT '0',
	"carryover_from_previous_year" numeric(10, 2) DEFAULT '0',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"respondent_type" "survey_respondent_type" NOT NULL,
	"respondent_id" varchar,
	"respondent_name" varchar,
	"respondent_email" varchar,
	"client_id" varchar,
	"caregiver_id" varchar,
	"office_id" varchar,
	"sent_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"status" "survey_status" DEFAULT 'pending',
	"responses" jsonb,
	"overall_rating" integer,
	"comments" text,
	"is_anonymous" boolean DEFAULT false,
	"access_token" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "survey_responses_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "survey_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"survey_type" "survey_type" NOT NULL,
	"questions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_off_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"request_type" time_off_request_type NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"hours_requested" numeric(10, 2),
	"reason" text,
	"status" time_off_request_status DEFAULT 'pending',
	"submitted_at" timestamp DEFAULT now(),
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"is_paid" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "eligibility_checks" ALTER COLUMN "status" SET DATA TYPE eligibility_check_status;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD COLUMN "check_type" "eligibility_check_type" DEFAULT 'medicaid';--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD COLUMN "payer_id" varchar;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD COLUMN "coverage_details" jsonb;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD COLUMN "response_raw" jsonb;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD COLUMN "checked_by" varchar;--> statement-breakpoint
ALTER TABLE "eligibility_schedule" ADD CONSTRAINT "eligibility_schedule_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pto_balances" ADD CONSTRAINT "pto_balances_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_template_id_survey_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."survey_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;