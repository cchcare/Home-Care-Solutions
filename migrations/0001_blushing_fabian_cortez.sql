CREATE TYPE "public"."applicant_position" AS ENUM('caregiver', 'nurse', 'admin', 'coordinator', 'supervisor', 'other');--> statement-breakpoint
CREATE TYPE "public"."applicant_source" AS ENUM('referral', 'indeed', 'website', 'walk_in', 'other');--> statement-breakpoint
CREATE TYPE "public"."applicant_status" AS ENUM('new', 'screening', 'interview_scheduled', 'interview_completed', 'background_check', 'offer_pending', 'hired', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."background_check_result" AS ENUM('clear', 'review_needed', 'disqualifying');--> statement-breakpoint
CREATE TYPE "public"."background_check_status" AS ENUM('pending', 'in_progress', 'completed_clear', 'completed_review', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."background_check_type" AS ENUM('fbi_fingerprint', 'state_criminal', 'child_abuse', 'adult_protective', 'sex_offender', 'oig_exclusion');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."interview_type" AS ENUM('phone', 'in_person', 'video');--> statement-breakpoint
CREATE TYPE "public"."mileage_log_status" AS ENUM('pending', 'approved', 'paid', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."mileage_log_trip_purpose" AS ENUM('client_visit', 'training', 'office_meeting', 'other');--> statement-breakpoint
CREATE TYPE "public"."performance_metric_name" AS ENUM('attendance', 'punctuality', 'client_satisfaction', 'documentation', 'communication', 'teamwork', 'skills', 'professionalism');--> statement-breakpoint
CREATE TYPE "public"."performance_review_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."performance_review_type" AS ENUM('annual', 'semi_annual', 'quarterly', 'probationary', 'improvement_plan');--> statement-breakpoint
CREATE TYPE "public"."shift_differential_type" AS ENUM('weekend', 'holiday', 'overtime', 'evening', 'night', 'on_call');--> statement-breakpoint
CREATE TABLE "applicant_interviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" varchar NOT NULL,
	"interviewer_id" varchar,
	"scheduled_date" timestamp NOT NULL,
	"completed_date" timestamp,
	"type" "interview_type" DEFAULT 'phone',
	"rating" integer,
	"feedback" text,
	"status" "interview_status" DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "applicant_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" varchar NOT NULL,
	"author_id" varchar,
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "applicants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"address" text,
	"city" varchar,
	"state" varchar,
	"zip_code" varchar,
	"date_of_birth" timestamp,
	"office_id" varchar,
	"position" "applicant_position" DEFAULT 'caregiver',
	"source" "applicant_source" DEFAULT 'other',
	"referred_by" varchar,
	"application_date" timestamp DEFAULT now(),
	"resume_document_id" varchar,
	"status" "applicant_status" DEFAULT 'new',
	"stage" varchar,
	"notes" text,
	"assigned_to" varchar,
	"last_contact_date" timestamp,
	"expected_start_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "background_checks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" varchar,
	"caregiver_id" varchar,
	"check_type" "background_check_type" NOT NULL,
	"provider" varchar,
	"requested_date" timestamp,
	"submitted_date" timestamp,
	"expected_completion_date" timestamp,
	"completed_date" timestamp,
	"expiration_date" timestamp,
	"status" "background_check_status" DEFAULT 'pending',
	"result" "background_check_result",
	"result_notes" text,
	"document_id" varchar,
	"cost" numeric(10, 2),
	"requested_by" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"date" timestamp,
	"observed_date" timestamp,
	"is_recurring" boolean DEFAULT false,
	"recurring_month" integer,
	"recurring_day" integer,
	"office_id" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mileage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"client_id" varchar,
	"trip_purpose" "mileage_log_trip_purpose" NOT NULL,
	"start_location" text,
	"end_location" text,
	"start_odometer" numeric(10, 1),
	"end_odometer" numeric(10, 1),
	"total_miles" numeric(10, 1),
	"reimbursement_rate" numeric(10, 4) DEFAULT '0.67',
	"reimbursement_amount" numeric(10, 2),
	"status" "mileage_log_status" DEFAULT 'pending',
	"approved_by" varchar,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" varchar NOT NULL,
	"metric_name" "performance_metric_name" NOT NULL,
	"rating" integer NOT NULL,
	"weight" numeric(5, 2) DEFAULT '1.00',
	"comments" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"reviewer_id" varchar NOT NULL,
	"review_type" "performance_review_type" NOT NULL,
	"review_period_start" timestamp,
	"review_period_end" timestamp,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"status" "performance_review_status" DEFAULT 'scheduled',
	"overall_rating" integer,
	"strengths" text,
	"areas_for_improvement" text,
	"goals" text,
	"action_items" text,
	"employee_comments" text,
	"reviewer_comments" text,
	"acknowledged_at" timestamp,
	"acknowledged_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_differentials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar,
	"mco_id" varchar,
	"name" varchar NOT NULL,
	"type" "shift_differential_type" NOT NULL,
	"multiplier" numeric(10, 3),
	"flat_bonus" numeric(10, 2),
	"conditions" jsonb,
	"is_active" boolean DEFAULT true,
	"effective_date" timestamp NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "applicant_interviews" ADD CONSTRAINT "applicant_interviews_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_interviews" ADD CONSTRAINT "applicant_interviews_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_notes" ADD CONSTRAINT "applicant_notes_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_notes" ADD CONSTRAINT "applicant_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_resume_document_id_documents_id_fk" FOREIGN KEY ("resume_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_checks" ADD CONSTRAINT "background_checks_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_checks" ADD CONSTRAINT "background_checks_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_checks" ADD CONSTRAINT "background_checks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_checks" ADD CONSTRAINT "background_checks_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_logs" ADD CONSTRAINT "mileage_logs_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_logs" ADD CONSTRAINT "mileage_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_logs" ADD CONSTRAINT "mileage_logs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_review_id_performance_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."performance_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_differentials" ADD CONSTRAINT "shift_differentials_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_differentials" ADD CONSTRAINT "shift_differentials_mco_id_mcos_id_fk" FOREIGN KEY ("mco_id") REFERENCES "public"."mcos"("id") ON DELETE no action ON UPDATE no action;