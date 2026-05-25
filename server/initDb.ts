import { pool } from "./db";
import { getEmailTemplateSeeds } from "./email-template-seeds";

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
  "eligibility_checks", "eligibility_schedule",
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

export async function seedEmailTemplates() {
  const client = await pool.connect();
  try {
    const templates = getEmailTemplateSeeds();
    console.log(`[Init] Seeding ${templates.length} email templates...`);

    for (const tpl of templates) {
      await client.query(
        `INSERT INTO email_templates (
          id, type, name, subject, html_content, text_content,
          placeholders, theme_settings, is_active, is_default,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW()
        )
        ON CONFLICT (type, name) DO UPDATE SET
          subject       = EXCLUDED.subject,
          html_content  = EXCLUDED.html_content,
          text_content  = EXCLUDED.text_content,
          placeholders  = EXCLUDED.placeholders,
          theme_settings = EXCLUDED.theme_settings,
          is_active     = EXCLUDED.is_active,
          is_default    = EXCLUDED.is_default,
          updated_at    = NOW()
        WHERE email_templates.updated_by IS NULL`,
        [
          tpl.type,
          tpl.name,
          tpl.subject,
          tpl.htmlContent,
          tpl.textContent,
          JSON.stringify(tpl.placeholders),
          JSON.stringify({
            primaryColor: "#1a6faf",
            backgroundColor: "#f5f7fa",
            fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
          }),
          tpl.isDefault,
        ]
      );
    }

    console.log(`[Init] Email templates seeded successfully.`);
  } catch (err) {
    console.error("[Init] Failed to seed email templates:", err);
    throw err;
  } finally {
    client.release();
  }
}

// Ensure employee_notes table + indexes exist on databases that were created
// before the disciplinary-actions-and-coaching-notes migration shipped.
// Uses raw DDL so it is safe to run on every boot without drizzle-kit.
let employeeNotesSchemaReady = false;
export async function ensureEmployeeNotesSchema() {
  if (employeeNotesSchemaReady) return;
  const client = await pool.connect();
  try {
    // Fast path: if the table exists AND the backfill marker row exists, skip
    // all DDL + the backfill SELECT. This keeps subsequent boots cheap; the
    // first boot of a new instance still runs the full migration once.
    const ready = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'employee_notes'
      ) AS table_exists,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'employee_notes_init_marker'
      ) AS marker_exists;
    `);
    const row = ready.rows[0] || {};
    if (row.table_exists && row.marker_exists) {
      employeeNotesSchemaReady = true;
      return;
    }

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE employee_note_type AS ENUM (
          'coaching','verbal_warning','written_warning','final_warning','pip',
          'commendation','performance','general'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE employee_note_severity AS ENUM ('low','medium','high','critical');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE employee_note_follow_up_status AS ENUM ('open','resolved','cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_notes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id varchar,
        office_id varchar REFERENCES offices(id),
        employee_type varchar NOT NULL,
        employee_id varchar NOT NULL,
        author_id varchar REFERENCES users(id),
        note_type employee_note_type NOT NULL DEFAULT 'coaching',
        severity employee_note_severity DEFAULT 'low',
        subject varchar,
        summary text NOT NULL,
        incident_date timestamp,
        action_plan text,
        follow_up_date timestamp,
        follow_up_status employee_note_follow_up_status DEFAULT 'open',
        resolved_at timestamp,
        resolved_by varchar REFERENCES users(id),
        resolution_notes text,
        attachment_document_ids text[],
        acknowledged_at timestamp,
        acknowledgment_signature_name varchar,
        acknowledgment_ip varchar,
        acknowledgment_notes text,
        source_caregiver_note_id varchar UNIQUE,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);

    // ALTER TABLE for older deployments that may have an earlier schema.
    await client.query(`
      ALTER TABLE employee_notes
        ADD COLUMN IF NOT EXISTS resolution_notes text,
        ADD COLUMN IF NOT EXISTS acknowledgment_notes text,
        ADD COLUMN IF NOT EXISTS source_caregiver_note_id varchar;
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE employee_notes ADD CONSTRAINT employee_notes_source_caregiver_note_id_unique UNIQUE (source_caregiver_note_id);
      EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_notes_employee ON employee_notes (employee_type, employee_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_notes_office ON employee_notes (office_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_notes_follow_up ON employee_notes (follow_up_status, follow_up_date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_notes_author ON employee_notes (author_id);`);

    // Backfill existing caregiver_notes disciplinary/commendation rows. The
    // source row's id is preserved in source_caregiver_note_id so backfill is
    // idempotent across boots.
    await client.query(`
      INSERT INTO employee_notes (
        id, organization_id, office_id, employee_type, employee_id,
        author_id, note_type, severity, subject, summary, incident_date,
        follow_up_status, source_caregiver_note_id, created_at, updated_at
      )
      SELECT
        gen_random_uuid(),
        u.organization_id,
        c.office_id,
        'caregiver',
        cn.caregiver_id,
        cn.author_id,
        CASE WHEN cn.note_type = 'commendation' THEN 'commendation'::employee_note_type
             ELSE 'written_warning'::employee_note_type END,
        CASE WHEN cn.note_type = 'commendation' THEN 'low'::employee_note_severity
             ELSE 'medium'::employee_note_severity END,
        cn.subject,
        cn.content,
        cn.created_at,
        'resolved'::employee_note_follow_up_status,
        cn.id,
        cn.created_at,
        cn.updated_at
      FROM caregiver_notes cn
      LEFT JOIN caregivers c ON c.id = cn.caregiver_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE cn.note_type IN ('disciplinary','commendation')
      ON CONFLICT (source_caregiver_note_id) DO NOTHING;
    `);

    // Drop a marker so subsequent boots short-circuit the migration entirely.
    await client.query(`CREATE TABLE IF NOT EXISTS employee_notes_init_marker (initialized_at timestamp DEFAULT NOW());`);
    employeeNotesSchemaReady = true;
    console.log("[Init] employee_notes schema ensured.");
  } catch (err) {
    console.error("[Init] ensureEmployeeNotesSchema failed (non-fatal):", err);
  } finally {
    client.release();
  }
}

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

  // Seed email templates after reset (outside the transaction so they survive)
  await seedEmailTemplates();
}
