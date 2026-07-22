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
  "notification_templates", "offboarding_instance_steps", "offboarding_instances",
  "offboarding_template_steps", "offboarding_templates",
  "office_dashboard_links", "office_expenses",
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

// Onboarding workflow (Task #136) schema bootstrap. Raw DDL so it is safe to
// run on every boot without drizzle-kit.
let onboardingSchemaReady = false;
export async function ensureOnboardingSchema() {
  if (onboardingSchemaReady) return;
  const client = await pool.connect();
  try {
    // Idempotent column additions on existing tables — always run so older
    // installs pick up new columns when this function evolves.
    await client.query(`ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS onboarded_at timestamp;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at timestamp;`);

    const ready = await client.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_init_marker') AS marker_exists;
    `);
    if (ready.rows[0]?.marker_exists) {
      onboardingSchemaReady = true;
      return;
    }

    await client.query(`DO $$ BEGIN
      CREATE TYPE onboarding_step_type AS ENUM ('signature','document','policy','training','checklist');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE onboarding_instance_status AS ENUM ('in_progress','completed','cancelled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE onboarding_instance_step_status AS ENUM ('pending','completed','skipped');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE onboarding_employee_type AS ENUM ('caregiver','user');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_templates (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id varchar,
        office_id varchar REFERENCES offices(id),
        name varchar NOT NULL,
        description text,
        role varchar NOT NULL DEFAULT 'any',
        is_active boolean DEFAULT true,
        created_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_template_steps (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id varchar NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
        step_order integer NOT NULL DEFAULT 0,
        step_type onboarding_step_type NOT NULL,
        title varchar NOT NULL,
        description text,
        ref_id varchar,
        is_required boolean DEFAULT true,
        created_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_instances (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id varchar,
        template_id varchar REFERENCES onboarding_templates(id),
        employee_type onboarding_employee_type NOT NULL,
        employee_user_id varchar REFERENCES users(id),
        employee_caregiver_id varchar REFERENCES caregivers(id),
        status onboarding_instance_status DEFAULT 'in_progress',
        launched_by varchar REFERENCES users(id),
        launched_at timestamp DEFAULT NOW(),
        completed_at timestamp,
        notes text,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_instance_steps (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id varchar NOT NULL REFERENCES onboarding_instances(id) ON DELETE CASCADE,
        template_step_id varchar REFERENCES onboarding_template_steps(id),
        step_order integer NOT NULL DEFAULT 0,
        step_type onboarding_step_type NOT NULL,
        title varchar NOT NULL,
        description text,
        ref_id varchar,
        link_id varchar,
        status onboarding_instance_step_status DEFAULT 'pending',
        is_required boolean DEFAULT true,
        completed_at timestamp,
        completed_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_onb_tmpl_step_template ON onboarding_template_steps (template_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_onb_inst_user ON onboarding_instances (employee_user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_onb_inst_caregiver ON onboarding_instances (employee_caregiver_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_onb_inst_status ON onboarding_instances (status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_onb_inst_step_instance ON onboarding_instance_steps (instance_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_onb_inst_step_link ON onboarding_instance_steps (step_type, link_id);`);

    await client.query(`CREATE TABLE IF NOT EXISTS onboarding_init_marker (initialized_at timestamp DEFAULT NOW());`);
    onboardingSchemaReady = true;
    console.log("[Init] onboarding schema ensured.");
  } catch (err) {
    console.error("[Init] ensureOnboardingSchema failed (non-fatal):", err);
  } finally {
    client.release();
  }
}

// Offboarding workflow (Task #137) schema bootstrap. Raw DDL so it is safe to
// run on every boot without drizzle-kit. Mirrors ensureOnboardingSchema.
let offboardingSchemaReady = false;
export async function ensureOffboardingSchema() {
  if (offboardingSchemaReady) return;
  const client = await pool.connect();
  try {
    // Idempotent column addition — users gains a termination_date so the
    // offboarding launcher and daily termination job can find office staff
    // exits the same way they find caregiver exits.
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS termination_date timestamp;`);

    const ready = await client.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offboarding_init_marker') AS marker_exists;
    `);
    if (ready.rows[0]?.marker_exists) {
      offboardingSchemaReady = true;
      return;
    }

    await client.query(`DO $$ BEGIN
      CREATE TYPE offboarding_step_type AS ENUM ('account_deactivation','equipment_return','final_paycheck','cobra_notice','exit_interview','document','checklist');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE offboarding_instance_status AS ENUM ('pending','in_progress','completed','cancelled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE offboarding_instance_step_status AS ENUM ('pending','completed','skipped');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE offboarding_employee_type AS ENUM ('caregiver','user');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS offboarding_templates (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id varchar,
        office_id varchar REFERENCES offices(id),
        name varchar NOT NULL,
        description text,
        role varchar NOT NULL DEFAULT 'any',
        is_active boolean DEFAULT true,
        created_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS offboarding_template_steps (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id varchar NOT NULL REFERENCES offboarding_templates(id) ON DELETE CASCADE,
        step_order integer NOT NULL DEFAULT 0,
        step_type offboarding_step_type NOT NULL,
        title varchar NOT NULL,
        description text,
        ref_id varchar,
        is_required boolean DEFAULT true,
        created_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS offboarding_instances (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id varchar,
        template_id varchar REFERENCES offboarding_templates(id),
        employee_type offboarding_employee_type NOT NULL,
        employee_user_id varchar REFERENCES users(id),
        employee_caregiver_id varchar REFERENCES caregivers(id),
        status offboarding_instance_status DEFAULT 'in_progress',
        termination_date timestamp,
        launched_by varchar REFERENCES users(id),
        launched_at timestamp DEFAULT NOW(),
        completed_at timestamp,
        termination_processed_at timestamp,
        notes text,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS offboarding_instance_steps (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id varchar NOT NULL REFERENCES offboarding_instances(id) ON DELETE CASCADE,
        template_step_id varchar REFERENCES offboarding_template_steps(id),
        step_order integer NOT NULL DEFAULT 0,
        step_type offboarding_step_type NOT NULL,
        title varchar NOT NULL,
        description text,
        ref_id varchar,
        link_id varchar,
        status offboarding_instance_step_status DEFAULT 'pending',
        is_required boolean DEFAULT true,
        completed_at timestamp,
        completed_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_off_tmpl_step_template ON offboarding_template_steps (template_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_off_inst_user ON offboarding_instances (employee_user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_off_inst_caregiver ON offboarding_instances (employee_caregiver_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_off_inst_status ON offboarding_instances (status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_off_inst_step_instance ON offboarding_instance_steps (instance_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_off_inst_step_link ON offboarding_instance_steps (step_type, link_id);`);

    await client.query(`CREATE TABLE IF NOT EXISTS offboarding_init_marker (initialized_at timestamp DEFAULT NOW());`);
    offboardingSchemaReady = true;
    console.log("[Init] offboarding schema ensured.");
  } catch (err) {
    console.error("[Init] ensureOffboardingSchema failed (non-fatal):", err);
  } finally {
    client.release();
  }
}

// Self-service upgrade (Task #139) — adds office_staff_paychecks +
// employee tax-form tables for the employee self-service portal. Raw DDL so it
// is safe to run on every boot without drizzle-kit.
let selfServiceSchemaReady = false;
export async function ensureSelfServiceSchema() {
  if (selfServiceSchemaReady) return;
  const client = await pool.connect();
  try {
    const ready = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'self_service_init_marker'
      ) AS marker_exists;
    `);
    if (ready.rows[0]?.marker_exists) {
      selfServiceSchemaReady = true;
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS office_staff_paychecks (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id),
        payroll_run_id varchar REFERENCES payroll_runs(id),
        pay_period_start timestamp NOT NULL,
        pay_period_end timestamp NOT NULL,
        pay_date timestamp NOT NULL,
        regular_hours numeric(10,2) DEFAULT 0,
        overtime_hours numeric(10,2) DEFAULT 0,
        holiday_hours numeric(10,2) DEFAULT 0,
        gross_pay numeric(10,2) NOT NULL,
        federal_tax numeric(10,2) DEFAULT 0,
        state_tax numeric(10,2) DEFAULT 0,
        social_security numeric(10,2) DEFAULT 0,
        medicare numeric(10,2) DEFAULT 0,
        other_deductions numeric(10,2) DEFAULT 0,
        net_pay numeric(10,2) NOT NULL,
        status varchar DEFAULT 'pending',
        check_number varchar,
        paystub_document_id varchar REFERENCES documents(id),
        notes text,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_office_staff_paychecks_user ON office_staff_paychecks (user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_office_staff_paychecks_run ON office_staff_paychecks (payroll_run_id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_tax_forms (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id varchar,
        employee_type varchar NOT NULL,
        employee_id varchar NOT NULL,
        form_type varchar NOT NULL,
        document_id varchar REFERENCES documents(id),
        signed_at timestamp,
        effective_date timestamp,
        is_current boolean DEFAULT true,
        notes text,
        created_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_tax_forms_employee ON employee_tax_forms (employee_type, employee_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_tax_forms_current ON employee_tax_forms (employee_type, employee_id, form_type) WHERE is_current = true;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_tax_form_change_requests (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id varchar,
        employee_type varchar NOT NULL,
        employee_id varchar NOT NULL,
        requested_by_user_id varchar REFERENCES users(id),
        form_type varchar NOT NULL,
        reason text,
        status varchar DEFAULT 'pending',
        hr_task_id varchar REFERENCES tasks(id),
        esignature_request_id varchar REFERENCES esignature_requests(id),
        reviewed_by_user_id varchar REFERENCES users(id),
        reviewed_at timestamp,
        review_notes text,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tax_form_reqs_employee ON employee_tax_form_change_requests (employee_type, employee_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tax_form_reqs_status ON employee_tax_form_change_requests (status);`);

    await client.query(`CREATE TABLE IF NOT EXISTS self_service_init_marker (initialized_at timestamp DEFAULT NOW());`);
    selfServiceSchemaReady = true;
    console.log("[Init] self-service (paystubs + tax forms) schema ensured.");
  } catch (err) {
    console.error("[Init] ensureSelfServiceSchema failed (non-fatal):", err);
  } finally {
    client.release();
  }
}

// Schema drift fix for the compliance-features branch (Tier 1/2/3 PA home
// care & MCO compliance work + coordinator compensation). None of this was
// ever pushed to the production database via drizzle-kit — this raw-DDL
// ensure routine self-heals production on next boot the same way the other
// ensure*Schema() functions do. Safe to run on every boot without drizzle-kit.
let complianceBranchSchemaReady = false;
export async function ensureComplianceBranchSchema() {
  if (complianceBranchSchemaReady) return;
  const client = await pool.connect();
  try {
    const ready = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_branch_init_marker'
      ) AS marker_exists;
    `);
    if (ready.rows[0]?.marker_exists) {
      complianceBranchSchemaReady = true;
      return;
    }

    // ── Columns added to pre-existing tables ──
    await client.query(`ALTER TABLE IF EXISTS coordinators ADD COLUMN IF NOT EXISTS coordinator_rate numeric(10,2);`);
    await client.query(`ALTER TABLE IF EXISTS clients ADD COLUMN IF NOT EXISTS billing_rate numeric(10,2);`);
    await client.query(`
      ALTER TABLE IF EXISTS incident_reports
        ADD COLUMN IF NOT EXISTS sc_notification_required boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS service_coordinator_name varchar,
        ADD COLUMN IF NOT EXISTS service_coordinator_contact varchar,
        ADD COLUMN IF NOT EXISTS sc_notification_due timestamp,
        ADD COLUMN IF NOT EXISTS sc_notified_at timestamp,
        ADD COLUMN IF NOT EXISTS sc_notification_status varchar DEFAULT 'not_required';
    `);
    await client.query(`ALTER TABLE IF EXISTS client_authorizations ADD COLUMN IF NOT EXISTS care_plan_id varchar REFERENCES care_plans(id);`);
    await client.query(`ALTER TABLE IF EXISTS client_satisfaction_surveys ADD COLUMN IF NOT EXISTS access_token varchar UNIQUE;`);

    // ── Coordinator Compensation feature (comp_*) ──
    await client.query(`DO $$ BEGIN
      CREATE TYPE comp_payroll_period_status AS ENUM ('open','closed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comp_payroll_periods (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id varchar,
        office_id varchar REFERENCES offices(id),
        name varchar NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        ot_weekly_threshold numeric(6,2) DEFAULT 40,
        status comp_payroll_period_status NOT NULL DEFAULT 'open',
        created_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comp_periods_office ON comp_payroll_periods (office_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comp_periods_dates ON comp_payroll_periods (start_date, end_date);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comp_schedule_entries (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id varchar,
        office_id varchar REFERENCES offices(id),
        caregiver_id varchar NOT NULL REFERENCES caregivers(id),
        client_id varchar REFERENCES clients(id),
        work_date date NOT NULL,
        hours numeric(6,2) NOT NULL,
        notes text,
        created_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comp_sched_caregiver ON comp_schedule_entries (caregiver_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comp_sched_client ON comp_schedule_entries (client_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comp_sched_date ON comp_schedule_entries (work_date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comp_sched_office ON comp_schedule_entries (office_id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comp_caregiver_payments (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        period_id varchar NOT NULL REFERENCES comp_payroll_periods(id) ON DELETE CASCADE,
        caregiver_id varchar NOT NULL REFERENCES caregivers(id),
        payment_made numeric(12,2) NOT NULL DEFAULT 0,
        notes text,
        updated_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW(),
        CONSTRAINT uniq_comp_cg_payment UNIQUE (period_id, caregiver_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comp_coordinator_payments (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        period_id varchar NOT NULL REFERENCES comp_payroll_periods(id) ON DELETE CASCADE,
        coordinator_id varchar NOT NULL REFERENCES coordinators(id),
        payment_made numeric(12,2) NOT NULL DEFAULT 0,
        notes text,
        updated_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW(),
        CONSTRAINT uniq_comp_coord_payment UNIQUE (period_id, coordinator_id)
      );
    `);

    // ── Agency / Office Credentials (Tier 2) ──
    await client.query(`DO $$ BEGIN
      CREATE TYPE office_credential_type AS ENUM (
        'pa_doh_license','promise_revalidation','medicare_enrollment','mco_credentialing',
        'fwa_training','liability_insurance','workers_comp','surety_bond','other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE office_credential_status AS ENUM ('active','renewal_in_progress','expired','not_applicable');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS office_credentials (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        office_id varchar NOT NULL REFERENCES offices(id),
        credential_type office_credential_type NOT NULL,
        mco_id varchar REFERENCES mcos(id),
        name varchar NOT NULL,
        identifier varchar,
        issued_by varchar,
        effective_date timestamp,
        expiration_date timestamp,
        renewal_cadence_months integer,
        renewal_lead_time_days integer,
        status office_credential_status DEFAULT 'active',
        last_renewed_at timestamp,
        document_id varchar REFERENCES documents(id),
        notes text,
        created_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_office_credentials_office ON office_credentials (office_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_office_credentials_expiration ON office_credentials (expiration_date);`);

    // ── Tier 3: Professional Development (competency reviews, § 611.55) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS caregiver_competency_reviews (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        caregiver_id varchar NOT NULL REFERENCES caregivers(id),
        office_id varchar REFERENCES offices(id),
        review_date timestamp NOT NULL,
        reviewer_id varchar REFERENCES users(id),
        method varchar NOT NULL,
        topics_covered text,
        outcome varchar NOT NULL DEFAULT 'satisfactory',
        development_plan text,
        next_review_due timestamp,
        notes text,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_competency_reviews_caregiver ON caregiver_competency_reviews (caregiver_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_competency_reviews_next_due ON caregiver_competency_reviews (next_review_due);`);

    // ── Tier 3: Client Rights & Notices (§ 611.57) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_notices (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id varchar NOT NULL REFERENCES clients(id),
        office_id varchar REFERENCES offices(id),
        notice_type varchar NOT NULL,
        provided_at timestamp NOT NULL,
        method varchar DEFAULT 'in_person',
        effective_date timestamp,
        document_id varchar REFERENCES documents(id),
        notes text,
        created_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_notices_client ON client_notices (client_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_notices_type ON client_notices (notice_type);`);

    await client.query(`CREATE TABLE IF NOT EXISTS compliance_branch_init_marker (initialized_at timestamp DEFAULT NOW());`);
    complianceBranchSchemaReady = true;
    console.log("[Init] compliance branch schema (comp_*, office_credentials, competency reviews, client notices, coordinator/client/incident columns) ensured.");
  } catch (err) {
    console.error("[Init] ensureComplianceBranchSchema failed (non-fatal):", err);
  } finally {
    client.release();
  }
}

// OIG "Seven Elements" Compliance Program schema (compliance officer/
// committee designations + anonymous hotline reports). Same self-heal
// pattern as ensureComplianceBranchSchema — every new table gets its own
// ensure-function so production never drifts from the code again.
let complianceProgramSchemaReady = false;
export async function ensureComplianceProgramSchema() {
  if (complianceProgramSchemaReady) return;
  const client = await pool.connect();
  try {
    const ready = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_program_init_marker'
      ) AS marker_exists;
    `);
    if (ready.rows[0]?.marker_exists) {
      complianceProgramSchemaReady = true;
      return;
    }

    await client.query(`DO $$ BEGIN
      CREATE TYPE compliance_officer_role AS ENUM ('compliance_officer', 'committee_member');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_officer_designations (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        office_id varchar NOT NULL REFERENCES offices(id),
        role compliance_officer_role NOT NULL DEFAULT 'compliance_officer',
        person_name varchar NOT NULL,
        user_id varchar REFERENCES users(id),
        title varchar,
        email varchar,
        phone varchar,
        effective_date timestamp NOT NULL,
        end_date timestamp,
        notes text,
        created_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_compliance_officer_office ON compliance_officer_designations (office_id);`);

    await client.query(`DO $$ BEGIN
      CREATE TYPE compliance_hotline_category AS ENUM (
        'fraud_waste_abuse', 'hipaa_privacy', 'billing_compliance', 'patient_safety', 'hr_conduct', 'other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE compliance_hotline_severity AS ENUM ('low', 'medium', 'high', 'critical');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE compliance_hotline_status AS ENUM ('received', 'under_investigation', 'resolved', 'closed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_hotline_reports (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        office_id varchar NOT NULL REFERENCES offices(id),
        report_number varchar NOT NULL,
        received_at timestamp NOT NULL,
        is_anonymous boolean DEFAULT false,
        reporter_name varchar,
        reporter_contact varchar,
        category compliance_hotline_category NOT NULL,
        severity compliance_hotline_severity DEFAULT 'medium',
        description text NOT NULL,
        assigned_investigator_id varchar REFERENCES users(id),
        status compliance_hotline_status NOT NULL DEFAULT 'received',
        corrective_action text,
        resolution_notes text,
        resolved_at timestamp,
        resolved_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_compliance_hotline_office ON compliance_hotline_reports (office_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_compliance_hotline_status ON compliance_hotline_reports (status);`);

    await client.query(`CREATE TABLE IF NOT EXISTS compliance_program_init_marker (initialized_at timestamp DEFAULT NOW());`);
    complianceProgramSchemaReady = true;
    console.log("[Init] compliance program schema (officer designations, hotline reports) ensured.");
  } catch (err) {
    console.error("[Init] ensureComplianceProgramSchema failed (non-fatal):", err);
  } finally {
    client.release();
  }
}

// Client profile fixes: Special Requests + Spend Down tracking, added when the
// client profile's stub sections were built out. Same self-heal pattern.
let clientProfileSchemaReady = false;
let staffPerformancePtoSchemaReady = false;
export async function ensureClientProfileSchema() {
  if (clientProfileSchemaReady) return;
  const client = await pool.connect();
  try {
    const ready = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'client_profile_init_marker'
      ) AS marker_exists;
    `);
    if (ready.rows[0]?.marker_exists) {
      clientProfileSchemaReady = true;
      return;
    }

    await client.query(`DO $$ BEGIN
      CREATE TYPE special_request_category AS ENUM (
        'dietary', 'scheduling', 'communication', 'care_preference', 'equipment', 'other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE special_request_priority AS ENUM ('low', 'medium', 'high');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN
      CREATE TYPE special_request_status AS ENUM ('open', 'in_progress', 'completed', 'declined');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS client_special_requests (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id varchar NOT NULL REFERENCES clients(id),
        office_id varchar REFERENCES offices(id),
        category special_request_category NOT NULL,
        description text NOT NULL,
        requested_date timestamp NOT NULL,
        requested_by varchar,
        priority special_request_priority DEFAULT 'medium',
        status special_request_status NOT NULL DEFAULT 'open',
        resolution_notes text,
        resolved_at timestamp,
        resolved_by varchar REFERENCES users(id),
        created_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_special_requests_client ON client_special_requests (client_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_special_requests_status ON client_special_requests (status);`);

    await client.query(`DO $$ BEGIN
      CREATE TYPE spend_down_status AS ENUM ('not_met', 'partially_met', 'met');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS client_spend_downs (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id varchar NOT NULL REFERENCES clients(id),
        office_id varchar REFERENCES offices(id),
        period_start timestamp NOT NULL,
        period_end timestamp NOT NULL,
        spend_down_amount numeric(10,2) NOT NULL,
        amount_met numeric(10,2) DEFAULT 0,
        status spend_down_status NOT NULL DEFAULT 'not_met',
        met_date timestamp,
        document_id varchar REFERENCES documents(id),
        notes text,
        created_by varchar REFERENCES users(id),
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_spend_down_client ON client_spend_downs (client_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_spend_down_period ON client_spend_downs (period_start, period_end);`);

    await client.query(`CREATE TABLE IF NOT EXISTS client_profile_init_marker (initialized_at timestamp DEFAULT NOW());`);
    clientProfileSchemaReady = true;
    console.log("[Init] client profile schema (special requests, spend downs) ensured.");
  } catch (err) {
    console.error("[Init] ensureClientProfileSchema failed (non-fatal):", err);
  } finally {
    client.release();
  }
}

// Extends performance_reviews and pto_balances (previously caregiver-only)
// to also support internal office staff, reviewed/tracked via users.id.
export async function ensureStaffPerformancePtoSchema() {
  if (staffPerformancePtoSchemaReady) return;
  const client = await pool.connect();
  try {
    const ready = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_performance_pto_init_marker'
      ) AS marker_exists;
    `);
    if (ready.rows[0]?.marker_exists) {
      staffPerformancePtoSchemaReady = true;
      return;
    }

    await client.query(`ALTER TABLE performance_reviews ALTER COLUMN caregiver_id DROP NOT NULL;`);
    await client.query(`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS user_id varchar REFERENCES users(id);`);

    await client.query(`ALTER TABLE pto_balances ALTER COLUMN caregiver_id DROP NOT NULL;`);
    await client.query(`ALTER TABLE pto_balances ADD COLUMN IF NOT EXISTS user_id varchar REFERENCES users(id);`);

    await client.query(`CREATE TABLE IF NOT EXISTS staff_performance_pto_init_marker (initialized_at timestamp DEFAULT NOW());`);
    staffPerformancePtoSchemaReady = true;
    console.log("[Init] staff performance review / PTO balance schema ensured.");
  } catch (err) {
    console.error("[Init] ensureStaffPerformancePtoSchema failed (non-fatal):", err);
  } finally {
    client.release();
  }
}

// Coordinators join the employee directory / org chart: they gain a
// manager_id reporting line, mirroring caregivers.manager_id.
let coordinatorDirectorySchemaReady = false;
export async function ensureCoordinatorDirectorySchema() {
  if (coordinatorDirectorySchemaReady) return;
  const client = await pool.connect();
  try {
    const ready = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'coordinator_directory_init_marker'
      ) AS marker_exists;
    `);
    if (ready.rows[0]?.marker_exists) {
      coordinatorDirectorySchemaReady = true;
      return;
    }

    await client.query(`ALTER TABLE coordinators ADD COLUMN IF NOT EXISTS manager_id varchar;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_coordinators_manager ON coordinators (manager_id);`);

    await client.query(`CREATE TABLE IF NOT EXISTS coordinator_directory_init_marker (initialized_at timestamp DEFAULT NOW());`);
    coordinatorDirectorySchemaReady = true;
    console.log("[Init] coordinator directory schema (manager_id) ensured.");
  } catch (err) {
    console.error("[Init] ensureCoordinatorDirectorySchema failed (non-fatal):", err);
  } finally {
    client.release();
  }
}

// Guards runProductionInit() so it can only ever execute once per database,
// no matter how many times the app restarts with INIT_PRODUCTION_DB=true left
// set. Without this marker, every reboot/redeploy that inherited the env var
// from the first deploy would silently truncate all production data.
async function hasProductionInitRun(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_init_marker (initialized_at timestamp DEFAULT NOW());
    `);
    const result = await client.query(`SELECT 1 FROM production_init_marker LIMIT 1;`);
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

export async function runProductionInit() {
  if (await hasProductionInitRun()) {
    console.warn(
      "[Init] INIT_PRODUCTION_DB is set to true, but production init has already " +
      "run for this database. Skipping destructive reset to protect existing data. " +
      "Remove INIT_PRODUCTION_DB from the environment to silence this warning."
    );
    return;
  }

  const client = await pool.connect();
  try {
    // Second, independent safety net: even if the init marker is missing
    // (e.g. a drizzle-kit push dropped the marker table), NEVER truncate a
    // database that plainly contains live data. A real reset of a non-empty
    // database requires an explicit second env var acknowledging data loss.
    let liveRows = 0;
    try {
      const live = await client.query(`
        SELECT
          COALESCE((SELECT count(*) FROM clients), 0) +
          COALESCE((SELECT count(*) FROM caregivers), 0) +
          COALESCE((SELECT count(*) FROM offices), 0) AS n
      `);
      liveRows = Number(live.rows[0]?.n ?? 0);
    } catch {
      // Tables don't exist yet — genuinely fresh database, safe to proceed.
      liveRows = 0;
    }
    if (liveRows > 0 && process.env.INIT_PRODUCTION_DB_FORCE !== "yes-erase-everything") {
      console.warn(
        `[Init] REFUSING production reset: database contains ${liveRows} live ` +
        "client/caregiver/office rows but no init marker. This usually means " +
        "the production_init_marker table was dropped (e.g. by drizzle-kit push). " +
        "Marker restored; no data was touched. To intentionally erase everything, " +
        "set INIT_PRODUCTION_DB_FORCE=yes-erase-everything for one boot."
      );
      // Re-arm the guard so future boots take the fast path again.
      await client.query(`CREATE TABLE IF NOT EXISTS production_init_marker (initialized_at timestamp DEFAULT NOW());`);
      await client.query(`INSERT INTO production_init_marker DEFAULT VALUES;`);
      return;
    }

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

    await client.query(`INSERT INTO production_init_marker DEFAULT VALUES;`);

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
