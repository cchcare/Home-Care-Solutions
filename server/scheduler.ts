import cron from "node-cron";
import { sendTodaysBirthdayNotifications } from "./birthday-service";

const BIRTHDAY_NOTIFICATION_CRON = process.env.BIRTHDAY_CRON_SCHEDULE || "0 8 * * *";
const BIRTHDAY_NOTIFICATION_HOUR = parseInt(process.env.BIRTHDAY_NOTIFICATION_HOUR || "8", 10);

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

export function startScheduledJobs() {
  console.log(`[Scheduler] Starting birthday notification scheduler with cron: ${BIRTHDAY_NOTIFICATION_CRON}`);

  // Check if we need to run a catch-up job on startup
  // If server starts after the scheduled time, run immediately
  const now = new Date();
  const currentHour = now.getHours();
  
  if (currentHour >= BIRTHDAY_NOTIFICATION_HOUR) {
    console.log(`[Scheduler] Server started after ${BIRTHDAY_NOTIFICATION_HOUR}:00, running catch-up birthday notification job`);
    // Run async but don't await - let server continue starting
    runBirthdayJob().catch(err => {
      console.error("[Scheduler] Catch-up birthday notification job failed:", err);
    });
  }

  cron.schedule(BIRTHDAY_NOTIFICATION_CRON, async () => {
    await runBirthdayJob();
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
