import { pool } from "./db";

const TABLES_TO_TRUNCATE = [
  "ai_detected_issues", "api_keys", "api_usage_logs",
  "applicant_interviews", "applicant_notes", "applicants",
  "audit_logs", "background_checks", "billing_records",
  "birthday_notifications", "care_plan_goals", "care_plan_interventions",
  "care_plans", "caregiver_absences", "caregiver_availability",
  "caregiver_availability_exceptions", "caregiver_compliance",
  "caregiver_exclusion_checks", "caregiver_exclusion_false_positives",
  "caregiver_expenses", "caregiver_in_services", "caregiver_notes",
  "caregiver_office_moves", "caregiver_paychecks", "caregiver_payroll_info",
  "caregiver_preferences", "caregiver_rates", "caregiver_schedules",
  "caregiver_time_entries", "caregivers", "certifications",
  "claim_line_items", "claims", "client_caregiver_assignments",
  "client_communications", "client_family_members", "client_mcos",
  "client_referrals", "client_schedules", "clients",
  "compliance_items", "coordinator_pay_records", "coordinators",
  "custom_integrations", "custom_roles", "documents",
  "eligibility_checks", "eligibility_schedule", "email_templates",
  "entity_field_configs", "esignature_requests", "esignature_templates",
  "evv_data", "exclusion_records", "exclusion_reports", "exclusion_sources",
  "family_members", "family_updates", "files", "generated_letters",
  "help_articles", "hhax_office_mappings", "hhax_sync_logs", "holidays",
  "incident_follow_ups", "incident_reports", "letter_template_versions",
  "letter_templates", "master_week_slots", "master_week_templates",
  "mco_types", "mcos", "medication_logs", "medications", "messages",
  "mileage_logs", "notification_preferences", "notification_queue",
  "notification_templates", "office_dashboard_links", "office_expenses",
  "office_licenses", "office_mco_billing_rates", "office_pa_survey_statuses",
  "office_payroll_configs", "office_staff", "offices", "organizations",
  "pa_survey_checklist_items", "payroll_holidays", "payroll_line_items",
  "payroll_runs", "performance_metrics", "performance_reviews",
  "permissions", "plan_features", "progress_notes", "pto_balances",
  "referral_sources", "role_permissions", "schedule_change_log", "sessions",
  "shift_differentials", "shift_swap_requests", "sms_logs",
  "staff_time_audit_logs", "staff_time_records", "subscription_history",
  "support_tickets", "survey_responses", "survey_templates",
  "system_settings", "tasks", "ticket_messages", "time_off_requests",
  "training_records", "trainings", "user_custom_roles", "users", "vital_signs",
];

export async function runProductionInit() {
  const client = await pool.connect();
  try {
    console.log("[Init] Starting production database reset...");

    await client.query("BEGIN");

    const tableList = TABLES_TO_TRUNCATE.join(", ");
    await client.query(`TRUNCATE TABLE ${tableList} CASCADE`);
    console.log("[Init] All tables cleared.");

    const orgResult = await client.query(`
      INSERT INTO organizations (id, name, slug, email, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, 'active', NOW(), NOW())
      RETURNING id
    `, ["Care Crafter Home Care", "care-crafter-home-care", "radhatimsina@gmail.com"]);
    const orgId = orgResult.rows[0].id;
    console.log("[Init] Organization created:", orgId);

    const officeResult = await client.query(`
      INSERT INTO offices (id, organization_id, name, email, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
      RETURNING id
    `, [orgId, "Care Crafter Home Care - Main Office", "radhatimsina@gmail.com"]);
    const officeId = officeResult.rows[0].id;
    console.log("[Init] Main office created:", officeId);

    await client.query(`
      INSERT INTO users (
        id, organization_id, email, username,
        first_name, last_name,
        role, is_active, primary_office_id,
        password_hash, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $2,
        'Radha', 'Timsina',
        'super_admin', true, $3,
        $4, NOW(), NOW()
      )
    `, [
      orgId,
      "radhatimsina@gmail.com",
      officeId,
      "$2b$12$mIJiuyTERD4KrI.vF9w77ur5QSyUWXWurH502FiiBK0DdyMNCHQjG",
    ]);
    console.log("[Init] Super admin user created: radhatimsina@gmail.com");

    await client.query("COMMIT");
    console.log("[Init] Production database reset complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Init] Reset failed, rolled back:", err);
    throw err;
  } finally {
    client.release();
  }
}
