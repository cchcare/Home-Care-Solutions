import type { Express, Request, Response } from "express";
import {
  runBirthdayNotificationsNow,
  runExclusionCheckNow,
  runHhaxSummaryNow,
  runPtoAccrualNow,
  runExpirationAlertsNow,
} from "./scheduler";

// Replaces the in-process node-cron scheduler (which needs a persistent
// process) with routes that Vercel Cron invokes on a schedule (see
// vercel.json's "crons" array). Vercel sends `Authorization: Bearer
// $CRON_SECRET` on its own invocations when CRON_SECRET is set as a project
// env var, so these routes reject anything without that header.
function requireCronSecret(req: Request, res: Response): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    res.status(500).json({ message: "CRON_SECRET is not configured" });
    return false;
  }
  if (req.headers.authorization !== `Bearer ${expected}`) {
    res.status(401).json({ message: "Unauthorized" });
    return false;
  }
  return true;
}

function cronHandler(fn: () => Promise<any>) {
  return async (req: Request, res: Response) => {
    if (!requireCronSecret(req, res)) return;
    try {
      const result = await fn();
      res.json({ ok: true, result });
    } catch (error: any) {
      console.error("[Cron] job failed:", error);
      res.status(500).json({ ok: false, message: error?.message || "Job failed" });
    }
  };
}

export function registerCronRoutes(app: Express) {
  app.get("/api/cron/birthdays", cronHandler(runBirthdayNotificationsNow));
  app.get("/api/cron/exclusion-check", cronHandler(runExclusionCheckNow));
  app.get("/api/cron/expiration-alerts", cronHandler(runExpirationAlertsNow));
  app.get("/api/cron/hhax-summary", cronHandler(() => runHhaxSummaryNow()));
  app.get("/api/cron/pto-accrual", cronHandler(() => runPtoAccrualNow()));
  app.get("/api/cron/offboarding-sweep", cronHandler(async () => {
    const { processDueTerminations } = await import("./offboarding");
    return processDueTerminations();
  }));
}
