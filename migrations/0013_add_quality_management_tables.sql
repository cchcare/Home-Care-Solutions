CREATE TYPE "public"."benefit_dependent_relationship" AS ENUM('spouse', 'domestic_partner', 'child', 'stepchild', 'other');--> statement-breakpoint
CREATE TYPE "public"."benefit_enrollment_status" AS ENUM('draft', 'submitted', 'waived', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."benefit_tier" AS ENUM('employee', 'employee_spouse', 'employee_children', 'employee_family', 'waived');--> statement-breakpoint
CREATE TYPE "public"."benefit_type" AS ENUM('health', 'dental', 'vision', 'life', 'disability', 'retirement_401k', 'fsa', 'hsa', 'other');--> statement-breakpoint
CREATE TYPE "public"."complaint_category" AS ENUM('care_quality', 'staff_conduct', 'scheduling', 'communication', 'billing', 'safety', 'privacy', 'other');--> statement-breakpoint
CREATE TYPE "public"."complaint_source" AS ENUM('patient', 'family', 'staff', 'regulatory', 'other');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('open', 'under_investigation', 'resolved_satisfactory', 'resolved_unsatisfactory', 'referred', 'closed');--> statement-breakpoint
CREATE TYPE "public"."employee_note_follow_up_status" AS ENUM('open', 'resolved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."employee_note_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."employee_note_type" AS ENUM('coaching', 'verbal_warning', 'written_warning', 'final_warning', 'pip', 'commendation', 'performance', 'general');--> statement-breakpoint
CREATE TYPE "public"."enrollment_window_type" AS ENUM('open_enrollment', 'new_hire', 'qualifying_life_event');--> statement-breakpoint
CREATE TYPE "public"."offboarding_employee_type" AS ENUM('caregiver', 'user');--> statement-breakpoint
CREATE TYPE "public"."offboarding_instance_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."offboarding_instance_step_status" AS ENUM('pending', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."offboarding_step_type" AS ENUM('account_deactivation', 'equipment_return', 'final_paycheck', 'cobra_notice', 'exit_interview', 'document', 'checklist');--> statement-breakpoint
CREATE TYPE "public"."onboarding_employee_type" AS ENUM('caregiver', 'user');--> statement-breakpoint
CREATE TYPE "public"."onboarding_instance_status" AS ENUM('in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."onboarding_instance_step_status" AS ENUM('pending', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."onboarding_step_type" AS ENUM('signature', 'document', 'policy', 'training', 'checklist');--> statement-breakpoint
CREATE TYPE "public"."pto_accrual_frequency" AS ENUM('weekly', 'biweekly', 'semi_monthly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."pto_ledger_source" AS ENUM('accrual', 'debit', 'reversal', 'adjustment', 'carryover');--> statement-breakpoint
CREATE TYPE "public"."qmp_oadri_status" AS ENUM('not_started', 'in_progress', 'completed', 'needs_improvement');--> statement-breakpoint
CREATE TYPE "public"."qmp_review_status" AS ENUM('pending', 'in_review', 'completed', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."qmp_status" AS ENUM('active', 'draft', 'archived');--> statement-breakpoint
CREATE TABLE "benefit_dependents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"relationship" "benefit_dependent_relationship" NOT NULL,
	"date_of_birth" date,
	"ssn_last4" varchar,
	"gender" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "benefit_enrollments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"employee_user_id" varchar NOT NULL,
	"window_id" varchar NOT NULL,
	"benefit_type" "benefit_type" NOT NULL,
	"plan_id" varchar,
	"tier" "benefit_tier" NOT NULL,
	"status" "benefit_enrollment_status" DEFAULT 'draft' NOT NULL,
	"coverage_effective_date" date,
	"signed_name" varchar,
	"signed_at" timestamp,
	"signature_ip" varchar,
	"document_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "benefit_plan_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"tier" "benefit_tier" NOT NULL,
	"employee_cost_per_pay_period" numeric(10, 2) NOT NULL,
	"employer_cost_per_pay_period" numeric(10, 2) DEFAULT '0',
	"pay_periods_per_year" integer DEFAULT 26,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "benefit_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"office_id" varchar,
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
);
--> statement-breakpoint
CREATE TABLE "employee_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"office_id" varchar,
	"employee_type" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"author_id" varchar,
	"note_type" "employee_note_type" DEFAULT 'coaching' NOT NULL,
	"severity" "employee_note_severity" DEFAULT 'low',
	"subject" varchar,
	"summary" text NOT NULL,
	"incident_date" timestamp,
	"action_plan" text,
	"follow_up_date" timestamp,
	"follow_up_status" "employee_note_follow_up_status" DEFAULT 'open',
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"resolution_notes" text,
	"attachment_document_ids" text[],
	"acknowledged_at" timestamp,
	"acknowledgment_signature_name" varchar,
	"acknowledgment_ip" varchar,
	"acknowledgment_notes" text,
	"source_caregiver_note_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_tax_form_change_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"employee_type" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"requested_by_user_id" varchar,
	"form_type" varchar NOT NULL,
	"reason" text,
	"status" varchar DEFAULT 'pending',
	"hr_task_id" varchar,
	"esignature_request_id" varchar,
	"reviewed_by_user_id" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_tax_forms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"employee_type" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"form_type" varchar NOT NULL,
	"document_id" varchar,
	"signed_at" timestamp,
	"effective_date" timestamp,
	"is_current" boolean DEFAULT true,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enrollment_windows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"name" varchar NOT NULL,
	"window_type" "enrollment_window_type" DEFAULT 'open_enrollment' NOT NULL,
	"employee_user_id" varchar,
	"reason_code" varchar,
	"starts_at" date NOT NULL,
	"ends_at" date NOT NULL,
	"coverage_effective_date" date,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offboarding_instance_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" varchar NOT NULL,
	"template_step_id" varchar,
	"step_order" integer DEFAULT 0 NOT NULL,
	"step_type" "offboarding_step_type" NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"ref_id" varchar,
	"link_id" varchar,
	"status" "offboarding_instance_step_status" DEFAULT 'pending',
	"is_required" boolean DEFAULT true,
	"completed_at" timestamp,
	"completed_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offboarding_instances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"template_id" varchar,
	"employee_type" "offboarding_employee_type" NOT NULL,
	"employee_user_id" varchar,
	"employee_caregiver_id" varchar,
	"status" "offboarding_instance_status" DEFAULT 'in_progress',
	"termination_date" timestamp,
	"launched_by" varchar,
	"launched_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"termination_processed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offboarding_template_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"step_order" integer DEFAULT 0 NOT NULL,
	"step_type" "offboarding_step_type" NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"ref_id" varchar,
	"is_required" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offboarding_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"office_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"role" varchar DEFAULT 'any' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "office_staff_paychecks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"payroll_run_id" varchar,
	"pay_period_start" timestamp NOT NULL,
	"pay_period_end" timestamp NOT NULL,
	"pay_date" timestamp NOT NULL,
	"regular_hours" numeric(10, 2) DEFAULT '0',
	"overtime_hours" numeric(10, 2) DEFAULT '0',
	"holiday_hours" numeric(10, 2) DEFAULT '0',
	"gross_pay" numeric(10, 2) NOT NULL,
	"federal_tax" numeric(10, 2) DEFAULT '0',
	"state_tax" numeric(10, 2) DEFAULT '0',
	"social_security" numeric(10, 2) DEFAULT '0',
	"medicare" numeric(10, 2) DEFAULT '0',
	"other_deductions" numeric(10, 2) DEFAULT '0',
	"net_pay" numeric(10, 2) NOT NULL,
	"status" varchar DEFAULT 'pending',
	"check_number" varchar,
	"paystub_document_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_instance_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" varchar NOT NULL,
	"template_step_id" varchar,
	"step_order" integer DEFAULT 0 NOT NULL,
	"step_type" "onboarding_step_type" NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"ref_id" varchar,
	"link_id" varchar,
	"status" "onboarding_instance_step_status" DEFAULT 'pending',
	"is_required" boolean DEFAULT true,
	"completed_at" timestamp,
	"completed_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_instances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"template_id" varchar,
	"employee_type" "onboarding_employee_type" NOT NULL,
	"employee_user_id" varchar,
	"employee_caregiver_id" varchar,
	"status" "onboarding_instance_status" DEFAULT 'in_progress',
	"launched_by" varchar,
	"launched_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_template_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"step_order" integer DEFAULT 0 NOT NULL,
	"step_type" "onboarding_step_type" NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"ref_id" varchar,
	"is_required" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"office_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"role" varchar DEFAULT 'any' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patient_complaints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"client_id" varchar,
	"caregiver_id" varchar,
	"complaint_number" varchar NOT NULL,
	"complaint_date" date NOT NULL,
	"received_by" varchar,
	"source" "complaint_source" NOT NULL,
	"category" "complaint_category" NOT NULL,
	"description" text NOT NULL,
	"incident_outcome" text,
	"root_cause" text,
	"corrective_action" text,
	"preventive_measures" text,
	"employee_involved" boolean DEFAULT false,
	"department_involved" boolean DEFAULT false,
	"employee_names" text,
	"department_names" text,
	"resolved_at" date,
	"resolved_by" varchar,
	"resolution_notes" text,
	"patient_satisfied" boolean,
	"referred_to_department" boolean DEFAULT false,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_date" date,
	"survey_sent" boolean DEFAULT false,
	"survey_results" varchar,
	"survey_rating" integer,
	"incident_report_id" varchar,
	"status" "complaint_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "policy_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"office_id" varchar,
	"due_at" timestamp,
	"assigned_by" varchar,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "policy_reminder_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"sent_by_user_id" varchar,
	"recipient_email" varchar,
	"status" varchar DEFAULT 'sent',
	"error_message" text,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pto_ledger" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"pto_type" "pto_type" NOT NULL,
	"source" "pto_ledger_source" NOT NULL,
	"delta_hours" numeric(10, 2) NOT NULL,
	"run_date" date NOT NULL,
	"policy_id" varchar,
	"source_request_id" varchar,
	"reason" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pto_policies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"name" varchar NOT NULL,
	"pto_type" "pto_type" NOT NULL,
	"role" varchar,
	"office_id" varchar,
	"hours_per_period" numeric(10, 2) NOT NULL,
	"cap_hours" numeric(10, 2),
	"accrual_frequency" "pto_accrual_frequency" DEFAULT 'biweekly',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qmp_measurable_outcomes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"office_id" varchar NOT NULL,
	"outcome_number" integer NOT NULL,
	"outcome_name" varchar NOT NULL,
	"target_value" varchar NOT NULL,
	"current_value" varchar,
	"measurement_method" text,
	"review_frequency" varchar DEFAULT 'quarterly' NOT NULL,
	"last_reviewed_at" date,
	"data_source" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qmp_oadri_cycles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"office_id" varchar NOT NULL,
	"cycle_name" varchar NOT NULL,
	"objectives" text,
	"objectives_status" "qmp_oadri_status" DEFAULT 'not_started',
	"approach" text,
	"approach_status" "qmp_oadri_status" DEFAULT 'not_started',
	"deployment" text,
	"deployment_status" "qmp_oadri_status" DEFAULT 'not_started',
	"results" text,
	"results_status" "qmp_oadri_status" DEFAULT 'not_started',
	"improvement" text,
	"improvement_status" "qmp_oadri_status" DEFAULT 'not_started',
	"start_date" date,
	"target_completion_date" date,
	"completed_at" date,
	"overall_status" "qmp_oadri_status" DEFAULT 'not_started',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qmp_quarterly_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"office_id" varchar NOT NULL,
	"quarter" varchar NOT NULL,
	"year" integer NOT NULL,
	"review_date" date NOT NULL,
	"reviewed_by" varchar,
	"findings" text,
	"action_items" jsonb,
	"outcomes_reviewed" jsonb,
	"status" "qmp_review_status" DEFAULT 'pending' NOT NULL,
	"next_review_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quality_management_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"complaint_id" varchar,
	"incident_report_id" varchar,
	"log_date" date NOT NULL,
	"complaint_number" varchar,
	"patient_name" varchar,
	"patient_location" varchar,
	"patient_issues" text,
	"incident_outcome" text,
	"preventable_measures" text,
	"quality_satisfaction_code" varchar,
	"survey_sent" boolean DEFAULT false,
	"survey_results" varchar,
	"rating_1" integer,
	"rating_2" integer,
	"rating_3" integer,
	"rating_4" integer,
	"rating_5" integer,
	"employee_involved" boolean DEFAULT false,
	"department_involved" boolean DEFAULT false,
	"notes" text,
	"logged_by" varchar,
	"reviewed_at" date,
	"reviewed_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quality_management_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"organization_id" varchar,
	"title" varchar DEFAULT 'Quality Management Plan' NOT NULL,
	"policy_document" text,
	"effective_date" date NOT NULL,
	"revision_number" varchar DEFAULT '1' NOT NULL,
	"reviewed_by" varchar,
	"next_review_date" date,
	"status" "qmp_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "caregivers" ADD COLUMN "termination_date" timestamp;--> statement-breakpoint
ALTER TABLE "caregivers" ADD COLUMN "manager_id" varchar;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "document_category" varchar;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "manager_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hire_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "termination_date" timestamp;--> statement-breakpoint
ALTER TABLE "benefit_dependents" ADD CONSTRAINT "benefit_dependents_enrollment_id_benefit_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."benefit_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_window_id_enrollment_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."enrollment_windows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_plan_id_benefit_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."benefit_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_plan_rates" ADD CONSTRAINT "benefit_plan_rates_plan_id_benefit_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."benefit_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_plans" ADD CONSTRAINT "benefit_plans_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_notes" ADD CONSTRAINT "employee_notes_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_notes" ADD CONSTRAINT "employee_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_notes" ADD CONSTRAINT "employee_notes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_tax_form_change_requests" ADD CONSTRAINT "employee_tax_form_change_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_tax_form_change_requests" ADD CONSTRAINT "employee_tax_form_change_requests_hr_task_id_tasks_id_fk" FOREIGN KEY ("hr_task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_tax_form_change_requests" ADD CONSTRAINT "employee_tax_form_change_requests_esignature_request_id_esignature_requests_id_fk" FOREIGN KEY ("esignature_request_id") REFERENCES "public"."esignature_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_tax_form_change_requests" ADD CONSTRAINT "employee_tax_form_change_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_tax_forms" ADD CONSTRAINT "employee_tax_forms_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_tax_forms" ADD CONSTRAINT "employee_tax_forms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_windows" ADD CONSTRAINT "enrollment_windows_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_windows" ADD CONSTRAINT "enrollment_windows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_instance_steps" ADD CONSTRAINT "offboarding_instance_steps_instance_id_offboarding_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."offboarding_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_instance_steps" ADD CONSTRAINT "offboarding_instance_steps_template_step_id_offboarding_template_steps_id_fk" FOREIGN KEY ("template_step_id") REFERENCES "public"."offboarding_template_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_instance_steps" ADD CONSTRAINT "offboarding_instance_steps_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_instances" ADD CONSTRAINT "offboarding_instances_template_id_offboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offboarding_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_instances" ADD CONSTRAINT "offboarding_instances_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_instances" ADD CONSTRAINT "offboarding_instances_employee_caregiver_id_caregivers_id_fk" FOREIGN KEY ("employee_caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_instances" ADD CONSTRAINT "offboarding_instances_launched_by_users_id_fk" FOREIGN KEY ("launched_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_template_steps" ADD CONSTRAINT "offboarding_template_steps_template_id_offboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offboarding_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_templates" ADD CONSTRAINT "offboarding_templates_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding_templates" ADD CONSTRAINT "offboarding_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_staff_paychecks" ADD CONSTRAINT "office_staff_paychecks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_staff_paychecks" ADD CONSTRAINT "office_staff_paychecks_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_staff_paychecks" ADD CONSTRAINT "office_staff_paychecks_paystub_document_id_documents_id_fk" FOREIGN KEY ("paystub_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_instance_steps" ADD CONSTRAINT "onboarding_instance_steps_instance_id_onboarding_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."onboarding_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_instance_steps" ADD CONSTRAINT "onboarding_instance_steps_template_step_id_onboarding_template_steps_id_fk" FOREIGN KEY ("template_step_id") REFERENCES "public"."onboarding_template_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_instance_steps" ADD CONSTRAINT "onboarding_instance_steps_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_instances" ADD CONSTRAINT "onboarding_instances_template_id_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_instances" ADD CONSTRAINT "onboarding_instances_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_instances" ADD CONSTRAINT "onboarding_instances_employee_caregiver_id_caregivers_id_fk" FOREIGN KEY ("employee_caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_instances" ADD CONSTRAINT "onboarding_instances_launched_by_users_id_fk" FOREIGN KEY ("launched_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_template_steps" ADD CONSTRAINT "onboarding_template_steps_template_id_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_complaints" ADD CONSTRAINT "patient_complaints_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_complaints" ADD CONSTRAINT "patient_complaints_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_complaints" ADD CONSTRAINT "patient_complaints_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_complaints" ADD CONSTRAINT "patient_complaints_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_complaints" ADD CONSTRAINT "patient_complaints_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_complaints" ADD CONSTRAINT "patient_complaints_incident_report_id_incident_reports_id_fk" FOREIGN KEY ("incident_report_id") REFERENCES "public"."incident_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_policy_id_policy_documents_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policy_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_reminder_log" ADD CONSTRAINT "policy_reminder_log_policy_id_policy_documents_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policy_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_reminder_log" ADD CONSTRAINT "policy_reminder_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_reminder_log" ADD CONSTRAINT "policy_reminder_log_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pto_ledger" ADD CONSTRAINT "pto_ledger_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pto_ledger" ADD CONSTRAINT "pto_ledger_policy_id_pto_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."pto_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pto_ledger" ADD CONSTRAINT "pto_ledger_source_request_id_time_off_requests_id_fk" FOREIGN KEY ("source_request_id") REFERENCES "public"."time_off_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pto_ledger" ADD CONSTRAINT "pto_ledger_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pto_policies" ADD CONSTRAINT "pto_policies_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qmp_measurable_outcomes" ADD CONSTRAINT "qmp_measurable_outcomes_plan_id_quality_management_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."quality_management_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qmp_measurable_outcomes" ADD CONSTRAINT "qmp_measurable_outcomes_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qmp_oadri_cycles" ADD CONSTRAINT "qmp_oadri_cycles_plan_id_quality_management_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."quality_management_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qmp_oadri_cycles" ADD CONSTRAINT "qmp_oadri_cycles_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qmp_quarterly_reviews" ADD CONSTRAINT "qmp_quarterly_reviews_plan_id_quality_management_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."quality_management_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qmp_quarterly_reviews" ADD CONSTRAINT "qmp_quarterly_reviews_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qmp_quarterly_reviews" ADD CONSTRAINT "qmp_quarterly_reviews_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_management_logs" ADD CONSTRAINT "quality_management_logs_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_management_logs" ADD CONSTRAINT "quality_management_logs_complaint_id_patient_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."patient_complaints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_management_logs" ADD CONSTRAINT "quality_management_logs_incident_report_id_incident_reports_id_fk" FOREIGN KEY ("incident_report_id") REFERENCES "public"."incident_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_management_logs" ADD CONSTRAINT "quality_management_logs_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_management_logs" ADD CONSTRAINT "quality_management_logs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_management_plans" ADD CONSTRAINT "quality_management_plans_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_management_plans" ADD CONSTRAINT "quality_management_plans_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_benefit_dependents_enrollment" ON "benefit_dependents" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_benefit_enrollments_employee" ON "benefit_enrollments" USING btree ("employee_user_id");--> statement-breakpoint
CREATE INDEX "idx_benefit_enrollments_window" ON "benefit_enrollments" USING btree ("window_id");--> statement-breakpoint
CREATE INDEX "idx_benefit_enrollments_plan" ON "benefit_enrollments" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_benefit_enrollments_emp_window_type" ON "benefit_enrollments" USING btree ("employee_user_id","window_id","benefit_type");--> statement-breakpoint
CREATE INDEX "idx_benefit_plan_rates_plan" ON "benefit_plan_rates" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_benefit_plan_rates_plan_tier" ON "benefit_plan_rates" USING btree ("plan_id","tier");--> statement-breakpoint
CREATE INDEX "idx_benefit_plans_org" ON "benefit_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_benefit_plans_office" ON "benefit_plans" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_benefit_plans_type" ON "benefit_plans" USING btree ("benefit_type");--> statement-breakpoint
CREATE INDEX "idx_employee_notes_employee" ON "employee_notes" USING btree ("employee_type","employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_notes_office" ON "employee_notes" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_employee_notes_follow_up" ON "employee_notes" USING btree ("follow_up_status","follow_up_date");--> statement-breakpoint
CREATE INDEX "idx_employee_notes_author" ON "employee_notes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_enrollment_windows_org" ON "enrollment_windows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_enrollment_windows_employee" ON "enrollment_windows" USING btree ("employee_user_id");--> statement-breakpoint
CREATE INDEX "idx_enrollment_windows_dates" ON "enrollment_windows" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "idx_off_inst_step_instance" ON "offboarding_instance_steps" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "idx_off_inst_step_link" ON "offboarding_instance_steps" USING btree ("step_type","link_id");--> statement-breakpoint
CREATE INDEX "idx_off_inst_user" ON "offboarding_instances" USING btree ("employee_user_id");--> statement-breakpoint
CREATE INDEX "idx_off_inst_caregiver" ON "offboarding_instances" USING btree ("employee_caregiver_id");--> statement-breakpoint
CREATE INDEX "idx_off_inst_status" ON "offboarding_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_off_tmpl_step_template" ON "offboarding_template_steps" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_onb_inst_step_instance" ON "onboarding_instance_steps" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "idx_onb_inst_step_link" ON "onboarding_instance_steps" USING btree ("step_type","link_id");--> statement-breakpoint
CREATE INDEX "idx_onb_inst_user" ON "onboarding_instances" USING btree ("employee_user_id");--> statement-breakpoint
CREATE INDEX "idx_onb_inst_caregiver" ON "onboarding_instances" USING btree ("employee_caregiver_id");--> statement-breakpoint
CREATE INDEX "idx_onb_inst_status" ON "onboarding_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_onb_tmpl_step_template" ON "onboarding_template_steps" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_patient_complaints_office" ON "patient_complaints" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_patient_complaints_status" ON "patient_complaints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_patient_complaints_date" ON "patient_complaints" USING btree ("complaint_date");--> statement-breakpoint
CREATE INDEX "idx_patient_complaints_number" ON "patient_complaints" USING btree ("complaint_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_policy_assignment_unique" ON "policy_assignments" USING btree ("policy_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_policy_assignment_user" ON "policy_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_policy_assignment_office" ON "policy_assignments" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_policy_reminder_user_sent" ON "policy_reminder_log" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE INDEX "idx_policy_reminder_policy_sent" ON "policy_reminder_log" USING btree ("policy_id","sent_at");--> statement-breakpoint
CREATE INDEX "idx_pto_ledger_caregiver" ON "pto_ledger" USING btree ("caregiver_id");--> statement-breakpoint
CREATE INDEX "idx_pto_ledger_request" ON "pto_ledger" USING btree ("source_request_id");--> statement-breakpoint
CREATE INDEX "idx_pto_policies_office" ON "pto_policies" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_pto_policies_role" ON "pto_policies" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_qmp_outcomes_plan" ON "qmp_measurable_outcomes" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_qmp_outcomes_office" ON "qmp_measurable_outcomes" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_qmp_oadri_plan" ON "qmp_oadri_cycles" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_qmp_oadri_office" ON "qmp_oadri_cycles" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_qmp_reviews_plan" ON "qmp_quarterly_reviews" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_qmp_reviews_office" ON "qmp_quarterly_reviews" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_qmp_reviews_quarter" ON "qmp_quarterly_reviews" USING btree ("quarter","year");--> statement-breakpoint
CREATE INDEX "idx_qm_logs_office" ON "quality_management_logs" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_qm_logs_date" ON "quality_management_logs" USING btree ("log_date");--> statement-breakpoint
CREATE INDEX "idx_qm_logs_complaint" ON "quality_management_logs" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX "idx_qmp_office" ON "quality_management_plans" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_qmp_status" ON "quality_management_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_caregivers_manager" ON "caregivers" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "idx_users_manager" ON "users" USING btree ("manager_id");