// One-time deploy step for Vercel: run `drizzle-kit push` first (schema DDL),
// then this script (data-shape backfills / idempotent schema patches that
// used to run on every server boot in server/index.ts). Run manually against
// the target database before the first deploy and after any schema-changing
// merge — do NOT wire these into the serverless request path, since they'd
// otherwise re-run on every cold start.
//
// Usage: DATABASE_URL=... npx tsx scripts/migrate.ts
import {
  seedEmailTemplates,
  ensureEmployeeNotesSchema,
  ensureOnboardingSchema,
  ensureOffboardingSchema,
  ensureSelfServiceSchema,
} from "../server/initDb";

async function main() {
  console.log("[Migrate] Seeding email templates...");
  await seedEmailTemplates();

  console.log("[Migrate] Ensuring employee notes schema...");
  await ensureEmployeeNotesSchema();

  console.log("[Migrate] Ensuring onboarding schema...");
  await ensureOnboardingSchema();

  console.log("[Migrate] Ensuring offboarding schema...");
  await ensureOffboardingSchema();

  console.log("[Migrate] Ensuring self-service schema...");
  await ensureSelfServiceSchema();

  console.log("[Migrate] Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[Migrate] Failed:", err);
  process.exit(1);
});
