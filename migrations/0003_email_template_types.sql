ALTER TYPE "public"."email_template_type" ADD VALUE IF NOT EXISTS 'password_reset_caregiver';--> statement-breakpoint
ALTER TYPE "public"."email_template_type" ADD VALUE IF NOT EXISTS 'signup_confirmation';--> statement-breakpoint
ALTER TYPE "public"."email_template_type" ADD VALUE IF NOT EXISTS 'user_invitation';--> statement-breakpoint
ALTER TYPE "public"."email_template_type" ADD VALUE IF NOT EXISTS 'welcome_caregiver';--> statement-breakpoint
ALTER TYPE "public"."email_template_type" ADD VALUE IF NOT EXISTS 'family_portal_invitation';--> statement-breakpoint
ALTER TYPE "public"."email_template_type" ADD VALUE IF NOT EXISTS 'evv_confirmation';--> statement-breakpoint
ALTER TYPE "public"."email_template_type" ADD VALUE IF NOT EXISTS 'incident_report_notification';--> statement-breakpoint
ALTER TYPE "public"."email_template_type" ADD VALUE IF NOT EXISTS 'esignature_request';--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_type_name_unique" UNIQUE ("type","name");--> statement-breakpoint
