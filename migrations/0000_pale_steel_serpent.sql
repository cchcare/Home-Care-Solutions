CREATE TYPE "public"."ai_issue_category" AS ENUM('compliance', 'data_quality', 'scheduling', 'certification', 'documentation', 'incident_pattern', 'care_plan', 'other');--> statement-breakpoint
CREATE TYPE "public"."ai_issue_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."ai_issue_status" AS ENUM('open', 'in_progress', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."availability_exception_reason" AS ENUM('vacation', 'sick', 'personal', 'training', 'other');--> statement-breakpoint
CREATE TYPE "public"."billing_status" AS ENUM('pending', 'invoiced', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."care_plan_goal_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."care_plan_goal_status" AS ENUM('active', 'achieved', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."care_plan_intervention_assigned_to_type" AS ENUM('caregiver', 'nurse', 'therapist');--> statement-breakpoint
CREATE TYPE "public"."care_plan_intervention_frequency" AS ENUM('daily', 'weekly', 'monthly', 'as_needed');--> statement-breakpoint
CREATE TYPE "public"."care_plan_intervention_status" AS ENUM('active', 'paused', 'completed', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."communication_type" AS ENUM('internal', 'email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('client', 'caregiver');--> statement-breakpoint
CREATE TYPE "public"."field_type" AS ENUM('text', 'number', 'date', 'select', 'boolean', 'textarea');--> statement-breakpoint
CREATE TYPE "public"."file_category" AS ENUM('client_document', 'training_material', 'certificate', 'insurance', 'identification', 'care_plan', 'medical_record', 'other');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('document', 'image', 'video', 'audio', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'non_binary', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."incident_follow_up_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."incident_follow_up_status" AS ENUM('pending', 'in_progress', 'completed', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."medication_log_status" AS ENUM('taken', 'skipped', 'refused');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('unread', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('sms', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_recipient_type" AS ENUM('user', 'client', 'caregiver');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_template_type" AS ENUM('sms', 'email', 'both');--> statement-breakpoint
CREATE TYPE "public"."pa_survey_status" AS ENUM('not_started', 'in_progress', 'complete', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."payroll_frequency" AS ENUM('weekly', 'biweekly', 'semi_monthly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."payroll_status" AS ENUM('draft', 'approved', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'admin', 'office_admin', 'supervisor', 'caregiver', 'family', 'custom');--> statement-breakpoint
CREATE TYPE "public"."training_status" AS ENUM('not_started', 'in_progress', 'completed', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."training_type" AS ENUM('orientation', 'annual', 'certification', 'continuing_education', 'safety', 'hipaa', 'other');--> statement-breakpoint
CREATE TABLE "ai_detected_issues" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "ai_issue_category" NOT NULL,
	"severity" "ai_issue_severity" NOT NULL,
	"status" "ai_issue_status" DEFAULT 'open',
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"affected_entity_type" varchar,
	"affected_entity_id" varchar,
	"suggested_action" text,
	"auto_fix_available" boolean DEFAULT false,
	"auto_fix_applied" boolean DEFAULT false,
	"resolved_by" varchar,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"ai_confidence" numeric(5, 2),
	"raw_ai_response" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"action" varchar NOT NULL,
	"entity_type" varchar,
	"entity_id" varchar,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "billing_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar,
	"mco_id" varchar,
	"service_start_date" timestamp NOT NULL,
	"service_end_date" timestamp NOT NULL,
	"service_code" varchar,
	"hours" numeric(8, 2),
	"rate" numeric(10, 2),
	"total_amount" numeric(12, 2) NOT NULL,
	"bill_date" timestamp NOT NULL,
	"due_date" timestamp,
	"status" varchar DEFAULT 'pending',
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "birthday_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_type" varchar NOT NULL,
	"recipient_id" varchar NOT NULL,
	"recipient_name" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"sms_status" varchar,
	"email_status" varchar,
	"sms_error" text,
	"email_error" text,
	"birthday_date" timestamp NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"office_id" varchar
);
--> statement-breakpoint
CREATE TABLE "care_plan_goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_plan_id" varchar NOT NULL,
	"goal_text" text NOT NULL,
	"target_date" timestamp,
	"priority" "care_plan_goal_priority" DEFAULT 'medium',
	"status" "care_plan_goal_status" DEFAULT 'active',
	"progress_notes" text,
	"achieved_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "care_plan_interventions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_plan_id" varchar NOT NULL,
	"intervention_text" text NOT NULL,
	"frequency" "care_plan_intervention_frequency" DEFAULT 'daily',
	"assigned_to_type" "care_plan_intervention_assigned_to_type",
	"assigned_to_id" varchar,
	"status" "care_plan_intervention_status" DEFAULT 'active',
	"last_performed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "care_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"created_by" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"goals" text[],
	"interventions" text[],
	"status" varchar DEFAULT 'active',
	"start_date" timestamp,
	"end_date" timestamp,
	"next_assessment_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_absences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"absence_type" varchar NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_all_day" boolean DEFAULT true,
	"start_time" varchar,
	"end_time" varchar,
	"reason" text,
	"status" varchar DEFAULT 'approved',
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_availability" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar NOT NULL,
	"end_time" varchar NOT NULL,
	"is_available" boolean DEFAULT true,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_availability_exceptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"is_available" boolean DEFAULT false,
	"reason" "availability_exception_reason",
	"start_time" varchar,
	"end_time" varchar,
	"approved_by" varchar,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_compliance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"office_id" varchar,
	"category" varchar NOT NULL,
	"item_type" varchar NOT NULL,
	"document_id" varchar,
	"expiration_date" timestamp,
	"performed_date" timestamp,
	"result_date" timestamp,
	"result" varchar,
	"status" varchar DEFAULT 'pending',
	"notes" text,
	"verified_by" varchar,
	"verified_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"expense_date" timestamp NOT NULL,
	"expense_type" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"client_id" varchar,
	"receipt_document_id" varchar,
	"status" varchar DEFAULT 'pending',
	"approved_by" varchar,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"mileage" numeric(10, 2),
	"mileage_rate" numeric(10, 4),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_in_services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"training_id" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"training_date" timestamp NOT NULL,
	"hours" numeric(5, 2),
	"instructor" varchar,
	"location" varchar,
	"status" varchar DEFAULT 'completed',
	"certificate_number" varchar,
	"expiration_date" timestamp,
	"document_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"author_id" varchar,
	"note_type" varchar DEFAULT 'general',
	"subject" varchar,
	"content" text NOT NULL,
	"is_private" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_office_moves" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"from_office_id" varchar,
	"to_office_id" varchar NOT NULL,
	"move_date" timestamp NOT NULL,
	"reason" text,
	"approved_by" varchar,
	"status" varchar DEFAULT 'completed',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_paychecks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
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
CREATE TABLE "caregiver_payroll_info" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"payment_method" varchar DEFAULT 'direct_deposit',
	"bank_name" varchar,
	"account_type" varchar,
	"account_number_last4" varchar,
	"routing_number_last4" varchar,
	"tax_filing_status" varchar,
	"federal_withholding" integer DEFAULT 0,
	"state_withholding" integer DEFAULT 0,
	"additional_withholding" numeric(10, 2),
	"ssn_last4" varchar,
	"w4_on_file" boolean DEFAULT false,
	"i9_on_file" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"preference_type" varchar NOT NULL,
	"preference_value" text NOT NULL,
	"priority" integer DEFAULT 1,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"service_type" varchar NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"rate_type" varchar DEFAULT 'hourly',
	"effective_from" timestamp,
	"effective_to" timestamp,
	"client_id" varchar,
	"mco_id" varchar,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"client_id" varchar,
	"scheduled_date" timestamp NOT NULL,
	"start_time" varchar NOT NULL,
	"end_time" varchar NOT NULL,
	"service_type" varchar,
	"status" varchar DEFAULT 'scheduled',
	"clock_in_time" timestamp,
	"clock_out_time" timestamp,
	"clock_in_latitude" numeric(10, 7),
	"clock_in_longitude" numeric(10, 7),
	"clock_out_latitude" numeric(10, 7),
	"clock_out_longitude" numeric(10, 7),
	"clock_in_distance" numeric,
	"clock_out_distance" numeric,
	"evv_status" varchar DEFAULT 'pending',
	"evv_notes" text,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregiver_time_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" varchar NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"client_id" varchar,
	"entry_date" timestamp NOT NULL,
	"hours_worked" numeric(8, 2) NOT NULL,
	"week_number" integer NOT NULL,
	"source_row_number" integer,
	"import_batch_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregivers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"first_name" varchar,
	"middle_name" varchar,
	"last_name" varchar,
	"date_of_birth" timestamp,
	"email" varchar,
	"phone" varchar,
	"employee_id" varchar,
	"assignment_id" varchar,
	"gender" "gender",
	"hire_date" timestamp,
	"start_date" timestamp,
	"experience_years" integer,
	"hourly_wage" numeric(10, 2),
	"specializations" text[],
	"office_id" varchar,
	"coordinator_id" varchar,
	"mco_id" varchar,
	"address" text,
	"address_2" varchar,
	"city" varchar,
	"state" varchar,
	"zip_code" varchar,
	"county" varchar,
	"hhax_caregiver_code" varchar,
	"adp_code" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "caregivers_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "caregivers_assignment_id_unique" UNIQUE("assignment_id"),
	CONSTRAINT "caregivers_hhax_caregiver_code_unique" UNIQUE("hhax_caregiver_code")
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar,
	"certification_type" varchar NOT NULL,
	"issue_date" timestamp,
	"expiration_date" timestamp,
	"issuing_organization" varchar,
	"certificate_number" varchar,
	"status" varchar DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_caregiver_assignments" (
	"client_id" varchar NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"assigned_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"is_primary" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_caregiver_assignments_client_id_caregiver_id_pk" PRIMARY KEY("client_id","caregiver_id")
);
--> statement-breakpoint
CREATE TABLE "client_communications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"office_id" varchar,
	"author_user_id" varchar,
	"message" text NOT NULL,
	"communication_type" varchar DEFAULT 'note',
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_family_members" (
	"client_id" varchar NOT NULL,
	"family_member_id" varchar NOT NULL,
	"access_level" varchar DEFAULT 'view_only',
	"can_view_care_plans" boolean DEFAULT true,
	"can_view_progress_notes" boolean DEFAULT true,
	"can_view_documents" boolean DEFAULT false,
	"can_view_incident_reports" boolean DEFAULT true,
	"can_receive_alerts" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_family_members_client_id_family_member_id_pk" PRIMARY KEY("client_id","family_member_id")
);
--> statement-breakpoint
CREATE TABLE "client_mcos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"mco_id" varchar NOT NULL,
	"member_id" varchar,
	"start_date" timestamp NOT NULL,
	"discharge_date" timestamp,
	"discharge_reason" varchar,
	"discharge_notes" text,
	"is_primary" boolean DEFAULT false,
	"status" varchar DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"caregiver_id" varchar,
	"scheduled_date" timestamp NOT NULL,
	"start_time" varchar NOT NULL,
	"end_time" varchar NOT NULL,
	"service_type" varchar,
	"status" varchar DEFAULT 'scheduled',
	"notes" text,
	"master_week_slot_id" varchar,
	"created_by" varchar,
	"completed_at" timestamp,
	"schedule_type" varchar,
	"pay_code" varchar,
	"poc" varchar,
	"primary_bill_to" varchar,
	"service_code" varchar,
	"budget_number" varchar,
	"rate_type" varchar,
	"hourly_rate" numeric(10, 2),
	"total_hours" numeric(10, 2),
	"billing_amount" numeric(10, 2),
	"include_mileage" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"date_of_birth" timestamp,
	"phone" varchar,
	"email" varchar,
	"address" text,
	"address_2" varchar,
	"city" varchar,
	"state" varchar,
	"zip_code" varchar,
	"hhax_admission_id" varchar,
	"emergency_contact_name" varchar,
	"emergency_contact_phone" varchar,
	"emergency_contact_relation" varchar,
	"primary_diagnosis" text,
	"allergies" text,
	"medications" text,
	"primary_physician" varchar,
	"primary_caregiver_id" varchar,
	"office_id" varchar,
	"mco_id" varchar,
	"status" varchar DEFAULT 'active',
	"service_start_date" timestamp,
	"coordinator_id" varchar,
	"member_id" varchar,
	"snap_renewal_date" timestamp,
	"snap_expiry_date" timestamp,
	"snap_status" varchar DEFAULT 'unknown',
	"snap_notes" text,
	"medicaid_renewal_date" timestamp,
	"medicaid_expiry_date" timestamp,
	"medicaid_status" varchar DEFAULT 'unknown',
	"medicaid_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "clients_hhax_admission_id_unique" UNIQUE("hhax_admission_id")
);
--> statement-breakpoint
CREATE TABLE "compliance_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar,
	"item_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"due_date" timestamp,
	"completed_date" timestamp,
	"notes" text,
	"office_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coordinators" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"office_id" varchar,
	"title" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"office_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "custom_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"caregiver_id" varchar,
	"uploaded_by" varchar,
	"office_id" varchar,
	"file_name" varchar NOT NULL,
	"original_name" varchar NOT NULL,
	"file_type" varchar,
	"file_size" integer,
	"document_type" varchar,
	"is_signature_required" boolean DEFAULT false,
	"is_signed" boolean DEFAULT false,
	"signed_by" varchar,
	"signed_at" timestamp,
	"encryption_key" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eligibility_checks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"mco_id" varchar,
	"member_id" varchar,
	"check_date" timestamp NOT NULL,
	"status" varchar DEFAULT 'pending',
	"eligibility_status" varchar,
	"coverage_start_date" timestamp,
	"coverage_end_date" timestamp,
	"verification_source" varchar DEFAULT 'promise_portal',
	"verified_by" varchar,
	"notes" text,
	"portal_response" text,
	"document_id" varchar,
	"expiration_date" timestamp,
	"office_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entity_field_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"field_key" varchar NOT NULL,
	"label" varchar NOT NULL,
	"field_type" "field_type" NOT NULL,
	"is_required" boolean DEFAULT false,
	"is_enabled" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"options" jsonb,
	"validation_rules" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evv_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"mco" varchar NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"total_visits" integer,
	"evv_compliant_visits" integer,
	"notes" text,
	"office_id" varchar,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"relationship_type" varchar NOT NULL,
	"is_emergency_contact" boolean DEFAULT false,
	"is_primary_contact" boolean DEFAULT false,
	"can_receive_updates" boolean DEFAULT true,
	"can_update_client_info" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "family_updates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"submitted_by" varchar,
	"update_type" varchar NOT NULL,
	"requested_changes" jsonb NOT NULL,
	"current_values" jsonb,
	"status" varchar DEFAULT 'pending',
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" varchar NOT NULL,
	"original_name" varchar NOT NULL,
	"file_type" "file_type" NOT NULL,
	"category" "file_category" NOT NULL,
	"file_path" varchar NOT NULL,
	"file_size" integer,
	"mime_type" varchar,
	"uploaded_by" varchar NOT NULL,
	"related_entity_type" varchar,
	"related_entity_id" varchar,
	"office_id" varchar,
	"is_confidential" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "incident_follow_ups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" varchar NOT NULL,
	"action_required" text NOT NULL,
	"assigned_to_id" varchar,
	"due_date" timestamp,
	"priority" "incident_follow_up_priority" DEFAULT 'medium',
	"status" "incident_follow_up_status" DEFAULT 'pending',
	"completed_at" timestamp,
	"completed_by" varchar,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "incident_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar NOT NULL,
	"entity_id" varchar NOT NULL,
	"client_id" varchar,
	"caregiver_id" varchar,
	"reported_by" varchar,
	"office_id" varchar,
	"incident_date" timestamp NOT NULL,
	"incident_type" varchar NOT NULL,
	"incident_category" varchar NOT NULL,
	"location" varchar,
	"description" text NOT NULL,
	"injuries" text,
	"witnesses_present" boolean DEFAULT false,
	"witness_names" text,
	"severity" varchar NOT NULL,
	"immediate_actions" text,
	"actions_taken" text,
	"preventive_measures" text,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_date" timestamp,
	"follow_up_notes" text,
	"notified_family" boolean DEFAULT false,
	"notified_doctor" boolean DEFAULT false,
	"notified_agency" boolean DEFAULT false,
	"status" varchar DEFAULT 'open',
	"resolution" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_week_slots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar,
	"day_of_week" integer NOT NULL,
	"start_time" varchar NOT NULL,
	"end_time" varchar NOT NULL,
	"caregiver_id" varchar,
	"service_type" varchar,
	"notes" text,
	"is_recurring" boolean DEFAULT true,
	"schedule_type" varchar DEFAULT 'daily_fixed',
	"pay_code" varchar,
	"poc" varchar,
	"primary_bill_to" varchar,
	"service_code" varchar,
	"budget_number" varchar,
	"rate_type" varchar DEFAULT 'hourly',
	"hourly_rate" numeric(10, 2),
	"include_mileage" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_week_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"client_id" varchar,
	"created_by" varchar,
	"start_date" timestamp,
	"end_date" timestamp,
	"recurrence_weeks" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"auto_rollover" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mco_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "mco_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "mcos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"office_id" varchar,
	"type_id" varchar,
	"payer_id" varchar,
	"contact_name" varchar,
	"contact_email" varchar,
	"contact_phone" varchar,
	"address" text,
	"billing_requirements" text,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medication_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medication_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"caregiver_id" varchar,
	"scheduled_time" timestamp,
	"taken_time" timestamp,
	"status" "medication_log_status" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"medication_name" varchar NOT NULL,
	"dosage" varchar,
	"frequency" varchar,
	"route" varchar,
	"prescribed_by" varchar,
	"start_date" timestamp,
	"end_date" timestamp,
	"instructions" text,
	"side_effects" text,
	"refill_date" timestamp,
	"pharmacy" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar,
	"recipient_id" varchar,
	"subject" varchar,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"sender_status" "message_status" DEFAULT 'read',
	"recipient_status" "message_status" DEFAULT 'unread',
	"message_type" varchar DEFAULT 'message',
	"priority" varchar DEFAULT 'normal',
	"communication_type" "communication_type" DEFAULT 'internal',
	"recipient_email" varchar,
	"recipient_phone" varchar,
	"delivery_status" "delivery_status" DEFAULT 'pending',
	"delivery_attempts" integer DEFAULT 0,
	"last_delivery_attempt" timestamp,
	"external_id" varchar,
	"related_client_id" varchar,
	"attachment_url" varchar,
	"parent_message_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"enable_sms" boolean DEFAULT true,
	"enable_email" boolean DEFAULT true,
	"quiet_hours_start" varchar,
	"quiet_hours_end" varchar,
	"schedule_change_notifications" boolean DEFAULT true,
	"reminder_notifications" boolean DEFAULT true,
	"urgent_alert_notifications" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notification_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_type" "notification_recipient_type" NOT NULL,
	"recipient_id" varchar NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"template_id" varchar,
	"subject" varchar,
	"body" text NOT NULL,
	"recipient_contact" varchar,
	"scheduled_for" timestamp,
	"sent_at" timestamp,
	"status" "notification_status" DEFAULT 'pending',
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"external_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"type" "notification_template_type" NOT NULL,
	"subject" varchar,
	"body" text NOT NULL,
	"variables" text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "office_expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"expense_date" timestamp NOT NULL,
	"expense_type" varchar NOT NULL,
	"category" varchar,
	"description" text NOT NULL,
	"vendor" varchar,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar,
	"receipt_document_id" varchar,
	"recurring" boolean DEFAULT false,
	"recurring_frequency" varchar,
	"status" varchar DEFAULT 'pending',
	"approved_by" varchar,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "office_licenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"license_number" varchar NOT NULL,
	"license_type" varchar DEFAULT 'health',
	"issued_date" timestamp NOT NULL,
	"expiration_date" timestamp NOT NULL,
	"document_id" varchar,
	"status" varchar DEFAULT 'active',
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "office_mco_billing_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"mco_id" varchar NOT NULL,
	"service_code" varchar NOT NULL,
	"service_name" varchar,
	"rate" numeric(10, 2) NOT NULL,
	"rate_type" varchar DEFAULT 'hourly',
	"effective_from" timestamp,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "office_pa_survey_statuses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"checklist_item_id" varchar NOT NULL,
	"status" "pa_survey_status" DEFAULT 'not_started',
	"assigned_to" varchar,
	"due_date" timestamp,
	"completed_at" timestamp,
	"completed_by" varchar,
	"notes" text,
	"document_ids" jsonb,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "office_payroll_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"payroll_frequency" "payroll_frequency" DEFAULT 'biweekly',
	"default_paycheck_day" integer,
	"custom_payroll_dates" jsonb,
	"company_name" varchar,
	"company_logo" varchar,
	"last_generated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "office_payroll_configs_office_id_unique" UNIQUE("office_id")
);
--> statement-breakpoint
CREATE TABLE "office_staff" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"position" varchar,
	"department" varchar,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_primary" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"address" text,
	"phone" varchar,
	"email" varchar,
	"manager_user_id" varchar,
	"timezone" varchar DEFAULT 'America/New_York',
	"is_active" boolean DEFAULT true,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pa_survey_checklist_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"regulation_ref" varchar,
	"sort_order" integer DEFAULT 0,
	"is_required" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_holidays" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"is_default" boolean DEFAULT false,
	"year" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_line_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" varchar NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"hours_worked" numeric(8, 2) DEFAULT '0',
	"regular_hours" numeric(8, 2) DEFAULT '0',
	"overtime_hours" numeric(8, 2) DEFAULT '0',
	"week1_regular_hours" numeric(8, 2) DEFAULT '0',
	"week1_overtime_hours" numeric(8, 2) DEFAULT '0',
	"week2_regular_hours" numeric(8, 2) DEFAULT '0',
	"week2_overtime_hours" numeric(8, 2) DEFAULT '0',
	"hourly_rate" numeric(8, 2),
	"gross_pay" numeric(10, 2) DEFAULT '0',
	"deductions" jsonb,
	"net_pay" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"pay_period_start" timestamp NOT NULL,
	"pay_period_end" timestamp NOT NULL,
	"paycheck_date" timestamp NOT NULL,
	"status" "payroll_status" DEFAULT 'draft',
	"total_gross" numeric(12, 2) DEFAULT '0',
	"total_deductions" numeric(12, 2) DEFAULT '0',
	"total_net" numeric(12, 2) DEFAULT '0',
	"employee_count" integer DEFAULT 0,
	"notes" text,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"description" text,
	"category" varchar NOT NULL,
	"resource" varchar NOT NULL,
	"action" varchar NOT NULL,
	"is_system_permission" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "progress_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"caregiver_id" varchar,
	"visit_date" timestamp,
	"visit_duration" integer,
	"notes" text NOT NULL,
	"vitals" jsonb,
	"services_provided" text[],
	"client_condition" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" varchar,
	"permission_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_change_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" varchar,
	"change_type" varchar NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_by" varchar,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"value" jsonb,
	"description" text,
	"scope" varchar DEFAULT 'global',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assigned_to" varchar,
	"created_by" varchar,
	"client_id" varchar,
	"office_id" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"priority" varchar DEFAULT 'medium',
	"due_date" timestamp,
	"status" varchar DEFAULT 'pending',
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" varchar NOT NULL,
	"training_id" varchar NOT NULL,
	"status" "training_status" DEFAULT 'not_started',
	"start_date" timestamp,
	"completion_date" timestamp,
	"expiration_date" timestamp,
	"score" integer,
	"certificate_url" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"training_type" "training_type" NOT NULL,
	"duration_hours" integer,
	"expiration_months" integer,
	"is_required" boolean DEFAULT false,
	"material_url" varchar,
	"office_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_custom_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"role_id" varchar,
	"assigned_by" varchar,
	"assigned_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"username" varchar,
	"password_hash" varchar,
	"must_reset_password" boolean DEFAULT false,
	"last_login_at" timestamp,
	"reset_token" varchar,
	"reset_token_expiry" timestamp,
	"first_name" varchar,
	"middle_name" varchar,
	"last_name" varchar,
	"date_of_birth" timestamp,
	"profile_image_url" varchar,
	"role" "role" DEFAULT 'caregiver',
	"primary_office_id" varchar,
	"address" text,
	"address_2" varchar,
	"city" varchar,
	"state" varchar,
	"zip_code" varchar,
	"is_active" boolean DEFAULT true,
	"mobile_phone" varchar,
	"mobile_verified" boolean DEFAULT false,
	"sms_verification_code" varchar,
	"sms_code_expiry" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vital_signs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"caregiver_id" varchar,
	"recorded_at" timestamp NOT NULL,
	"blood_pressure_systolic" integer,
	"blood_pressure_diastolic" integer,
	"heart_rate" integer,
	"temperature" numeric(10, 2),
	"respiratory_rate" integer,
	"oxygen_saturation" integer,
	"weight" numeric(10, 2),
	"blood_sugar" integer,
	"pain_level" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_detected_issues" ADD CONSTRAINT "ai_detected_issues_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_mco_id_mcos_id_fk" FOREIGN KEY ("mco_id") REFERENCES "public"."mcos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birthday_notifications" ADD CONSTRAINT "birthday_notifications_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_goals" ADD CONSTRAINT "care_plan_goals_care_plan_id_care_plans_id_fk" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_interventions" ADD CONSTRAINT "care_plan_interventions_care_plan_id_care_plans_id_fk" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_absences" ADD CONSTRAINT "caregiver_absences_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_absences" ADD CONSTRAINT "caregiver_absences_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_availability" ADD CONSTRAINT "caregiver_availability_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_availability_exceptions" ADD CONSTRAINT "caregiver_availability_exceptions_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_availability_exceptions" ADD CONSTRAINT "caregiver_availability_exceptions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_compliance" ADD CONSTRAINT "caregiver_compliance_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_compliance" ADD CONSTRAINT "caregiver_compliance_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_compliance" ADD CONSTRAINT "caregiver_compliance_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_compliance" ADD CONSTRAINT "caregiver_compliance_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_compliance" ADD CONSTRAINT "caregiver_compliance_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_expenses" ADD CONSTRAINT "caregiver_expenses_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_expenses" ADD CONSTRAINT "caregiver_expenses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_expenses" ADD CONSTRAINT "caregiver_expenses_receipt_document_id_documents_id_fk" FOREIGN KEY ("receipt_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_expenses" ADD CONSTRAINT "caregiver_expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_in_services" ADD CONSTRAINT "caregiver_in_services_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_in_services" ADD CONSTRAINT "caregiver_in_services_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_in_services" ADD CONSTRAINT "caregiver_in_services_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_notes" ADD CONSTRAINT "caregiver_notes_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_notes" ADD CONSTRAINT "caregiver_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_office_moves" ADD CONSTRAINT "caregiver_office_moves_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_office_moves" ADD CONSTRAINT "caregiver_office_moves_from_office_id_offices_id_fk" FOREIGN KEY ("from_office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_office_moves" ADD CONSTRAINT "caregiver_office_moves_to_office_id_offices_id_fk" FOREIGN KEY ("to_office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_office_moves" ADD CONSTRAINT "caregiver_office_moves_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_paychecks" ADD CONSTRAINT "caregiver_paychecks_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_paychecks" ADD CONSTRAINT "caregiver_paychecks_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_paychecks" ADD CONSTRAINT "caregiver_paychecks_paystub_document_id_documents_id_fk" FOREIGN KEY ("paystub_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_payroll_info" ADD CONSTRAINT "caregiver_payroll_info_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_preferences" ADD CONSTRAINT "caregiver_preferences_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_rates" ADD CONSTRAINT "caregiver_rates_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_rates" ADD CONSTRAINT "caregiver_rates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_rates" ADD CONSTRAINT "caregiver_rates_mco_id_mcos_id_fk" FOREIGN KEY ("mco_id") REFERENCES "public"."mcos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_schedules" ADD CONSTRAINT "caregiver_schedules_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_schedules" ADD CONSTRAINT "caregiver_schedules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_schedules" ADD CONSTRAINT "caregiver_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_time_entries" ADD CONSTRAINT "caregiver_time_entries_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_time_entries" ADD CONSTRAINT "caregiver_time_entries_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_time_entries" ADD CONSTRAINT "caregiver_time_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregivers" ADD CONSTRAINT "caregivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregivers" ADD CONSTRAINT "caregivers_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregivers" ADD CONSTRAINT "caregivers_coordinator_id_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."coordinators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_caregiver_assignments" ADD CONSTRAINT "client_caregiver_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_caregiver_assignments" ADD CONSTRAINT "client_caregiver_assignments_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_family_members" ADD CONSTRAINT "client_family_members_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_family_members" ADD CONSTRAINT "client_family_members_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_mcos" ADD CONSTRAINT "client_mcos_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_mcos" ADD CONSTRAINT "client_mcos_mco_id_mcos_id_fk" FOREIGN KEY ("mco_id") REFERENCES "public"."mcos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_schedules" ADD CONSTRAINT "client_schedules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_schedules" ADD CONSTRAINT "client_schedules_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_schedules" ADD CONSTRAINT "client_schedules_master_week_slot_id_master_week_slots_id_fk" FOREIGN KEY ("master_week_slot_id") REFERENCES "public"."master_week_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_schedules" ADD CONSTRAINT "client_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_coordinator_id_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."coordinators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinators" ADD CONSTRAINT "coordinators_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_signed_by_users_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_mco_id_mcos_id_fk" FOREIGN KEY ("mco_id") REFERENCES "public"."mcos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evv_data" ADD CONSTRAINT "evv_data_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evv_data" ADD CONSTRAINT "evv_data_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_updates" ADD CONSTRAINT "family_updates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_updates" ADD CONSTRAINT "family_updates_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_updates" ADD CONSTRAINT "family_updates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_follow_ups" ADD CONSTRAINT "incident_follow_ups_incident_id_incident_reports_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_follow_ups" ADD CONSTRAINT "incident_follow_ups_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_follow_ups" ADD CONSTRAINT "incident_follow_ups_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_follow_ups" ADD CONSTRAINT "incident_follow_ups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_week_slots" ADD CONSTRAINT "master_week_slots_template_id_master_week_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."master_week_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_week_slots" ADD CONSTRAINT "master_week_slots_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_week_templates" ADD CONSTRAINT "master_week_templates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_week_templates" ADD CONSTRAINT "master_week_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcos" ADD CONSTRAINT "mcos_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcos" ADD CONSTRAINT "mcos_type_id_mco_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."mco_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_related_client_id_clients_id_fk" FOREIGN KEY ("related_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_expenses" ADD CONSTRAINT "office_expenses_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_expenses" ADD CONSTRAINT "office_expenses_receipt_document_id_documents_id_fk" FOREIGN KEY ("receipt_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_expenses" ADD CONSTRAINT "office_expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_expenses" ADD CONSTRAINT "office_expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_licenses" ADD CONSTRAINT "office_licenses_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_licenses" ADD CONSTRAINT "office_licenses_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_licenses" ADD CONSTRAINT "office_licenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_mco_billing_rates" ADD CONSTRAINT "office_mco_billing_rates_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_mco_billing_rates" ADD CONSTRAINT "office_mco_billing_rates_mco_id_mcos_id_fk" FOREIGN KEY ("mco_id") REFERENCES "public"."mcos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_pa_survey_statuses" ADD CONSTRAINT "office_pa_survey_statuses_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_pa_survey_statuses" ADD CONSTRAINT "office_pa_survey_statuses_checklist_item_id_pa_survey_checklist_items_id_fk" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."pa_survey_checklist_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_pa_survey_statuses" ADD CONSTRAINT "office_pa_survey_statuses_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_pa_survey_statuses" ADD CONSTRAINT "office_pa_survey_statuses_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_pa_survey_statuses" ADD CONSTRAINT "office_pa_survey_statuses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_payroll_configs" ADD CONSTRAINT "office_payroll_configs_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_staff" ADD CONSTRAINT "office_staff_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_staff" ADD CONSTRAINT "office_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_holidays" ADD CONSTRAINT "payroll_holidays_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_notes" ADD CONSTRAINT "progress_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_notes" ADD CONSTRAINT "progress_notes_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_custom_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."custom_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_log" ADD CONSTRAINT "schedule_change_log_schedule_id_client_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."client_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_log" ADD CONSTRAINT "schedule_change_log_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_custom_roles" ADD CONSTRAINT "user_custom_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_custom_roles" ADD CONSTRAINT "user_custom_roles_role_id_custom_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."custom_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_custom_roles" ADD CONSTRAINT "user_custom_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");