import cron from "node-cron";
import { sendTodaysBirthdayNotifications } from "./birthday-service";

const BIRTHDAY_NOTIFICATION_CRON = process.env.BIRTHDAY_CRON_SCHEDULE || "0 8 * * *";

export function startScheduledJobs() {
  console.log(`[Scheduler] Starting birthday notification scheduler with cron: ${BIRTHDAY_NOTIFICATION_CRON}`);

  cron.schedule(BIRTHDAY_NOTIFICATION_CRON, async () => {
    console.log(`[Scheduler] Running birthday notifications job at ${new Date().toISOString()}`);
    try {
      const results = await sendTodaysBirthdayNotifications();
      console.log(`[Scheduler] Birthday notifications completed: ${results.length} notifications processed`);
      
      const smsSent = results.filter(r => r.smsStatus === "sent").length;
      const emailSent = results.filter(r => r.emailStatus === "sent").length;
      const smsFailed = results.filter(r => r.smsStatus === "failed").length;
      const emailFailed = results.filter(r => r.emailStatus === "failed").length;
      
      console.log(`[Scheduler] Results: SMS (${smsSent} sent, ${smsFailed} failed), Email (${emailSent} sent, ${emailFailed} failed)`);
    } catch (error) {
      console.error("[Scheduler] Birthday notification job failed:", error);
    }
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
