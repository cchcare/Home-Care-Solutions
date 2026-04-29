import cron from "node-cron";
import { sendTodaysBirthdayNotifications } from "./birthday-service";
import { exclusionService } from "./exclusion-service";
import { expirationAlertService } from "./expiration-alert-service";

const BIRTHDAY_NOTIFICATION_CRON = process.env.BIRTHDAY_CRON_SCHEDULE || "0 8 * * *";
const BIRTHDAY_NOTIFICATION_HOUR = parseInt(process.env.BIRTHDAY_NOTIFICATION_HOUR || "8", 10);
const EXCLUSION_CHECK_CRON = process.env.EXCLUSION_CHECK_CRON || "0 2 1,15 * *";
const EXPIRATION_ALERT_CRON = process.env.EXPIRATION_ALERT_CRON || "0 7 * * *";

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
  console.log(`[Scheduler] Running monthly exclusion check job at ${new Date().toISOString()}`);
  try {
    console.log('[Scheduler] Refreshing exclusion data sources...');
    const refreshResults = await exclusionService.refreshAllSources();
    console.log(`[Scheduler] OIG: ${refreshResults.oig.recordCount} records, SAM: ${refreshResults.sam.recordCount} records, Medicheck: ${refreshResults.medicheck.recordCount} records`);

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

  console.log("[Scheduler] Scheduled jobs started successfully");
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
