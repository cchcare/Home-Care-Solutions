#!/bin/bash
set -e

npm install

# Pre-apply any new enum types and unique constraints that drizzle-kit push
# would otherwise prompt about interactively (stdin is closed during post-merge).
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = \`
  DO \\\$\\\$ BEGIN
    -- Care plan enums (renamed from goal_priority, goal_status, etc.)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'care_plan_goal_priority') THEN
      CREATE TYPE care_plan_goal_priority AS ENUM ('high', 'medium', 'low');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'care_plan_goal_status') THEN
      CREATE TYPE care_plan_goal_status AS ENUM ('active', 'achieved', 'discontinued');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'care_plan_intervention_frequency') THEN
      CREATE TYPE care_plan_intervention_frequency AS ENUM ('daily', 'weekly', 'monthly', 'as_needed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'care_plan_intervention_assigned_to_type') THEN
      CREATE TYPE care_plan_intervention_assigned_to_type AS ENUM ('caregiver', 'nurse', 'therapist');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'care_plan_intervention_status') THEN
      CREATE TYPE care_plan_intervention_status AS ENUM ('active', 'paused', 'completed', 'discontinued');
    END IF;
    -- Mileage log enums (renamed from mileage_status, trip_purpose)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mileage_log_status') THEN
      CREATE TYPE mileage_log_status AS ENUM ('pending', 'approved', 'paid', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mileage_log_trip_purpose') THEN
      CREATE TYPE mileage_log_trip_purpose AS ENUM ('client_visit', 'training', 'office_meeting', 'other');
    END IF;
    -- Unique constraints (drizzle prompts about truncation when adding these)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_features_key_unique') THEN
      ALTER TABLE subscription_features ADD CONSTRAINT subscription_features_key_unique UNIQUE (key);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_slug_unique') THEN
      ALTER TABLE organizations ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique') THEN
      ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
    END IF;
    -- Employee directory: manager self-reference on users and caregivers.
    -- drizzle-kit push is blocked by the doh_audit_responses index conflict,
    -- so apply these here so prod stays in sync without an interactive push.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='manager_id') THEN
      ALTER TABLE users ADD COLUMN manager_id varchar;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='hire_date') THEN
      ALTER TABLE users ADD COLUMN hire_date timestamp;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='caregivers' AND column_name='manager_id') THEN
      ALTER TABLE caregivers ADD COLUMN manager_id varchar;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_manager_id_users_id_fk') THEN
      ALTER TABLE users ADD CONSTRAINT users_manager_id_users_id_fk
        FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caregivers_manager_id_users_id_fk') THEN
      ALTER TABLE caregivers ADD CONSTRAINT caregivers_manager_id_users_id_fk
        FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_manager') THEN
      CREATE INDEX idx_users_manager ON users (manager_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_caregivers_manager') THEN
      CREATE INDEX idx_caregivers_manager ON caregivers (manager_id);
    END IF;
  END \\\$\\\$;
\`;

pool.query(sql).then(() => { console.log('[post-merge] Pre-migration SQL applied'); pool.end(); })
  .catch(err => { console.error('[post-merge] Pre-migration error:', err.message); pool.end(); process.exit(1); });
"

# Run drizzle-kit push — should now complete non-interactively
npm run db:push
