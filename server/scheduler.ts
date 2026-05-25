import cron from "node-cron";
import { sql } from "drizzle-orm";
import { sendTodaysBirthdayNotifications } from "./birthday-service";
import { exclusionService } from "./exclusion-service";
import { expirationAlertService } from "./expiration-alert-service";
import { sendDailyHhaxSummary } from "./hhax-summary-service";
import { runAccruals, isAccrualDateForAnyOffice } from "./pto-service";
import { sendEmail, isValidEmail } from "./communication-services";
import { db } from "./db";
import { users } from "@shared/schema";

interface FetchSourceResult {
  success: boolean;
  recordCount: number;
  errors: string[];
}

interface FailedSource {
  name: string;
  result: FetchSourceResult;
  reason: "errors" | "zero_records";
}

function getFailedSources(refreshResults: {
  oig: FetchSourceResult;
  sam: FetchSourceResult;
  medicheck: FetchSourceResult;
}): FailedSource[] {
  const failed: FailedSource[] = [];
  const entries: Array<[string, FetchSourceResult]> = [
    ["SAM.gov", refreshResults.sam],
    ["PA MediCheck", refreshResults.medicheck],
  ];
  for (const [name, result] of entries) {
    if (!result.success || result.errors.length > 0) {
      failed.push({ name, result, reason: "errors" });
    } else if (result.recordCount === 0) {
      failed.push({ name, result, reason: "zero_records" });
    }
  }
  return failed;
}

async function getAdminEmails(): Promise<string[]> {
  try {
    const adminUsers = await db
      .select({ email: users.email })
      .from(users)
      .where(sql`${users.role} IN ('admin', 'super_admin', 'office_admin')`);
    const emails = adminUsers
      .map((u) => u.email)
      .filter((e): e is string => !!e && isValidEmail(e));
    return Array.from(new Set(emails));
  } catch (error) {
    console.error("[Scheduler] Failed to look up admin emails:", error);
    return [];
  }
}

function buildFetchFailureEmail(
  failed: FailedSource[],
  timestamp: Date,
): { subject: string; html: string; text: string } {
  const sourceNames = failed.map((f) => f.name).join(", ");
  const subject = `⚠️ Exclusion auto-fetch failed: ${sourceNames}`;
  const tsLabel = timestamp.toISOString();

  const sectionsHtml = failed
    .map((f) => {
      const reasonLabel =
        f.reason === "zero_records"
          ? "Imported zero records (possible source change or empty dataset)."
          : "Fetch returned errors.";
      const errorList = f.result.errors.length
        ? `<ul>${f.result.errors
            .map(
              (e) =>
                `<li><code>${String(e)
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</code></li>`,
            )
            .join("")}</ul>`
        : "<p><em>No error messages were captured.</em></p>";
      return `<h3>${f.name}</h3>
        <p><strong>Status:</strong> ${reasonLabel}</p>
        <p><strong>Records imported:</strong> ${f.result.recordCount}</p>
        ${errorList}`;
    })
    .join("");

  const html = `
    <p>The scheduled exclusion data auto-fetch reported problems with one or more sources at <strong>${tsLabel}</strong>.</p>
    ${sectionsHtml}
    <p>Please review the Exclusion Verification &rarr; Data Sources tab and re-run the import if needed. The License/NPI matcher relies on this data being current.</p>
  `;

  const textSections = failed
    .map((f) => {
      const reasonLabel =
        f.reason === "zero_records"
          ? "Imported zero records (possible source change or empty dataset)."
          : "Fetch returned errors.";
      const errorList = f.result.errors.length
        ? f.result.errors.map((e) => `  - ${e}`).join("\n")
        : "  (no error messages captured)";
      return `${f.name}\n  Status: ${reasonLabel}\n  Records imported: ${f.result.recordCount}\n${errorList}`;
    })
    .join("\n\n");
  const text = `Exclusion auto-fetch reported problems at ${tsLabel}.\n\n${textSections}\n\nPlease review the Exclusion Verification > Data Sources tab.`;

  return { subject, html, text };
}

async function sendExclusionFetchFailureEmails(
  failed: FailedSource[],
  timestamp: Date,
): Promise<void> {
  if (failed.length === 0) return;
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) {
    console.warn(
      "[Scheduler] Exclusion fetch failure detected but no admin emails are configured to notify.",
    );
    return;
  }
  const { subject, html, text } = buildFetchFailureEmail(failed, timestamp);
  for (const to of adminEmails) {
    try {
      await sendEmail({ to, subject, html, text });
      console.log(`[Scheduler] Sent exclusion fetch failure alert to ${to}`);
    } catch (error) {
      console.error(
        `[Scheduler] Failed to send exclusion fetch failure alert to ${to}:`,
        error,
      );
    }
  }
}

const BIRTHDAY_NOTIFICATION_CRON = process.env.BIRTHDAY_CRON_SCHEDULE || "0 8 * * *";
const BIRTHDAY_NOTIFICATION_HOUR = parseInt(process.env.BIRTHDAY_NOTIFICATION_HOUR || "8", 10);
const EXCLUSION_CHECK_CRON = process.env.EXCLUSION_CHECK_CRON || "0 2 1,15 * *";
const EXPIRATION_ALERT_CRON = process.env.EXPIRATION_ALERT_CRON || "0 7 * * *";
// HHAX SFTP exports normally land overnight; summarize the prior day at 7:30 AM ET.
const HHAX_SUMMARY_CRON = process.env.HHAX_SUMMARY_CRON || "30 7 * * *";
const HHAX_SUMMARY_WINDOW_HOURS = parseInt(process.env.HHAX_SUMMARY_WINDOW_HOURS || "24", 10);
// PTO accruals — runs daily at 1 AM; only credits on a configured pay date.
const PTO_ACCRUAL_CRON = process.env.PTO_ACCRUAL_CRON || "0 1 * * *";

async function runBirthdayJob() {
  console.log(`[Scheduler] Running birthday notifications job at ${new Date().toISOString()}`);
  try {
    const results = await sendTodaysBirthdayNotifications();
    console.log(`[Scheduler] Birthday notifications completed: ${results.length} notifications processed`);
    
    const smsSent = results.filter(r => r.smsStatus === "sent").length;
    const emailSent = results.filter(r => r.emailStatus === "sent").length;
    const smsFailed = results.filter(r => r.smsStatus === "failed").length;
    const emailFailed = results.filter(r => r.emailStatus === "failed").length;
    
    console.log(`[Scheduler] Results: SMS (${smsSent} sent, ${smsFailed} failed), Email (${emailSent} sent, ${emailFailed} failed)`);
    return results;
  } catch (error) {
    console.error("[Scheduler] Birthday notification job failed:", error);
    throw error;
  }
}

async function runExclusionCheckJob() {
  const jobStart = new Date();
  console.log(`[Scheduler] Running monthly exclusion check job at ${jobStart.toISOString()}`);
  try {
    console.log('[Scheduler] Refreshing exclusion data sources...');
    const refreshResults = await exclusionService.refreshAllSources();
    console.log(`[Scheduler] OIG: ${refreshResults.oig.recordCount} records, SAM: ${refreshResults.sam.recordCount} records, Medicheck: ${refreshResults.medicheck.recordCount} records`);

    const failedSources = getFailedSources(refreshResults);
    if (failedSources.length > 0) {
      console.warn(
        `[Scheduler] Exclusion auto-fetch reported problems for: ${failedSources
          .map((f) => `${f.name} (${f.reason})`)
          .join(', ')}`,
      );
      await sendExclusionFetchFailureEmails(failedSources, jobStart);
    }

    console.log('[Scheduler] Running caregiver exclusion checks...');
    const checkResults = await exclusionService.runFullExclusionCheck();
    console.log(`[Scheduler] Exclusion check completed: ${checkResults.totalCaregivers} caregivers checked`);
    console.log(`[Scheduler] Results: ${checkResults.totalClear} clear, ${checkResults.totalPossibleMatches} possible matches, ${checkResults.newMatches} new matches`);

    console.log('[Scheduler] Generating monthly report...');
    const reportResult = await exclusionService.generateMonthlyReport();
    if (reportResult.success) {
      console.log(`[Scheduler] Monthly report generated: ${reportResult.reportId}`);
    }

    return { refreshResults, checkResults, reportResult };
  } catch (error) {
    console.error("[Scheduler] Exclusion check job failed:", error);
    throw error;
  }
}

async function runHhaxSummaryJob() {
  console.log(`[Scheduler] Running HHAeXchange daily summary job at ${new Date().toISOString()}`);
  try {
    const result = await sendDailyHhaxSummary(HHAX_SUMMARY_WINDOW_HOURS);
    console.log(
      `[Scheduler] HHAX summary completed: ${result.officeSummaries.length} office(s), ${result.emailsSent} sent, ${result.emailsSkipped} skipped, ${result.emailsFailed} failed`,
    );
    return result;
  } catch (error) {
    console.error("[Scheduler] HHAX daily summary job failed:", error);
    throw error;
  }
}

async function runPtoAccrualJob() {
  const now = new Date();
  console.log(`[Scheduler] Running PTO accrual job at ${now.toISOString()}`);
  try {
    const isPayDate = await isAccrualDateForAnyOffice(now);
    if (!isPayDate) {
      console.log(`[Scheduler] PTO accrual: ${now.toISOString().slice(0,10)} is not a pay date — skipping`);
      return { skipped: true };
    }
    const result = await runAccruals(now);
    console.log(
      `[Scheduler] PTO accrual completed: processed ${result.employeesProcessed}, ledger inserts ${result.ledgerInserts}, skipped no-policy ${result.skippedNoPolicy}, capped ${result.skippedCapped}`,
    );
    return result;
  } catch (error) {
    console.error("[Scheduler] PTO accrual job failed:", error);
    throw error;
  }
}

async function runExpirationAlertJob() {
  console.log(`[Scheduler] Running expiration alerts job at ${new Date().toISOString()}`);
  try {
    const results = await expirationAlertService.sendExpirationAlerts();
    console.log(`[Scheduler] Expiration alerts completed: ${results.totalItems} items, ${results.emailsSent} emails, ${results.smsSent} SMS`);
    if (results.errors.length > 0) {
      console.log(`[Scheduler] Expiration alert errors: ${results.errors.length}`);
    }
    return results;
  } catch (error) {
    console.error("[Scheduler] Expiration alert job failed:", error);
    throw error;
  }
}

export function startScheduledJobs() {
  console.log(`[Scheduler] Starting birthday notification scheduler with cron: ${BIRTHDAY_NOTIFICATION_CRON}`);
  console.log(`[Scheduler] Starting exclusion check scheduler with cron: ${EXCLUSION_CHECK_CRON}`);
  console.log(`[Scheduler] Starting expiration alert scheduler with cron: ${EXPIRATION_ALERT_CRON}`);
  console.log(`[Scheduler] Starting HHAeXchange daily summary scheduler with cron: ${HHAX_SUMMARY_CRON}`);

  const now = new Date();
  const currentHour = now.getHours();
  
  if (currentHour >= BIRTHDAY_NOTIFICATION_HOUR) {
    console.log(`[Scheduler] Server started after ${BIRTHDAY_NOTIFICATION_HOUR}:00, running catch-up birthday notification job`);
    runBirthdayJob().catch(err => {
      console.error("[Scheduler] Catch-up birthday notification job failed:", err);
    });
  }

  cron.schedule(BIRTHDAY_NOTIFICATION_CRON, async () => {
    await runBirthdayJob();
  });

  cron.schedule(EXCLUSION_CHECK_CRON, async () => {
    await runExclusionCheckJob();
  });

  cron.schedule(EXPIRATION_ALERT_CRON, async () => {
    await runExpirationAlertJob();
  });

  cron.schedule(HHAX_SUMMARY_CRON, async () => {
    await runHhaxSummaryJob();
  });

  cron.schedule(PTO_ACCRUAL_CRON, async () => {
    await runPtoAccrualJob();
  });

  console.log(`[Scheduler] Starting PTO accrual scheduler with cron: ${PTO_ACCRUAL_CRON}`);
  console.log("[Scheduler] Scheduled jobs started successfully");
}

export async function runPtoAccrualNow(runDate?: Date) {
  console.log(`[Scheduler] Manual PTO accrual triggered at ${new Date().toISOString()}`);
  return await runAccruals(runDate ?? new Date());
}

export async function runBirthdayNotificationsNow() {
  console.log(`[Scheduler] Manual birthday notification run triggered at ${new Date().toISOString()}`);
  try {
    const results = await sendTodaysBirthdayNotifications();
    console.log(`[Scheduler] Manual run completed: ${results.length} notifications processed`);
    return results;
  } catch (error) {
    console.error("[Scheduler] Manual birthday notification run failed:", error);
    throw error;
  }
}

export async function runExclusionCheckNow() {
  console.log(`[Scheduler] Manual exclusion check triggered at ${new Date().toISOString()}`);
  try {
    const results = await runExclusionCheckJob();
    console.log(`[Scheduler] Manual exclusion check completed`);
    return results;
  } catch (error) {
    console.error("[Scheduler] Manual exclusion check failed:", error);
    throw error;
  }
}

export async function runHhaxSummaryNow(windowHours?: number) {
  console.log(`[Scheduler] Manual HHAX daily summary triggered at ${new Date().toISOString()}`);
  try {
    const result = await sendDailyHhaxSummary(windowHours ?? HHAX_SUMMARY_WINDOW_HOURS);
    console.log(`[Scheduler] Manual HHAX summary completed`);
    return result;
  } catch (error) {
    console.error("[Scheduler] Manual HHAX summary run failed:", error);
    throw error;
  }
}

export async function runExpirationAlertsNow() {
  console.log(`[Scheduler] Manual expiration alert run triggered at ${new Date().toISOString()}`);
  try {
    const results = await runExpirationAlertJob();
    console.log(`[Scheduler] Manual expiration alert run completed`);
    return results;
  } catch (error) {
    console.error("[Scheduler] Manual expiration alert run failed:", error);
    throw error;
  }
}
