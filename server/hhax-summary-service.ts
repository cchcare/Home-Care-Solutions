import { storage } from "./storage";
import { sendEmailWithOptions } from "./agentmail";
import type { HhaxSyncLog, Office, User } from "@shared/schema";

const MAX_ERRORS_IN_EMAIL = 20;

interface StageSummary {
  syncType: string;
  status: string | null;
  fileName?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  recordsTotal: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: string[];
  unrecognizedHeaders: string[];
}

interface OfficeSummary {
  officeId: string | null;
  officeName: string;
  stages: StageSummary[];
  recipients: string[];
  emailStatus: "sent" | "skipped" | "failed";
  error?: string;
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getStageFromLog(log: HhaxSyncLog): StageSummary {
  const detail = (log.errorDetails ?? null) as
    | { errors?: string[]; unrecognizedHeaders?: string[] }
    | null;
  return {
    syncType: log.syncType,
    status: log.status ?? null,
    fileName: log.fileName ?? null,
    startedAt: log.startedAt ?? null,
    completedAt: log.completedAt ?? null,
    recordsTotal: log.recordsTotal ?? 0,
    recordsCreated: log.recordsCreated ?? 0,
    recordsUpdated: log.recordsUpdated ?? 0,
    recordsSkipped: log.recordsSkipped ?? 0,
    recordsFailed: log.recordsFailed ?? 0,
    errors: Array.isArray(detail?.errors) ? detail!.errors! : [],
    unrecognizedHeaders: Array.isArray(detail?.unrecognizedHeaders)
      ? detail!.unrecognizedHeaders!
      : [],
  };
}

/**
 * Build the per-office grouping of the most recent HHAX sync log for each
 * sync-type within the given lookback window. We keep only the latest run per
 * (officeId, syncType) so admins see "what happened today", not the entire
 * history.
 */
function groupLatestByOffice(
  logs: HhaxSyncLog[],
  sinceMs: number,
): Map<string | null, Map<string, HhaxSyncLog>> {
  const grouped = new Map<string | null, Map<string, HhaxSyncLog>>();
  for (const log of logs) {
    const startedAt = log.startedAt ? new Date(log.startedAt).getTime() : 0;
    if (startedAt < sinceMs) continue;
    const officeKey = log.officeId ?? null;
    let perOffice = grouped.get(officeKey);
    if (!perOffice) {
      perOffice = new Map();
      grouped.set(officeKey, perOffice);
    }
    const existing = perOffice.get(log.syncType);
    const existingStarted = existing?.startedAt
      ? new Date(existing.startedAt).getTime()
      : -1;
    if (!existing || startedAt > existingStarted) {
      perOffice.set(log.syncType, log);
    }
  }
  return grouped;
}

function uniqEmails(emails: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of emails) {
    if (!raw) continue;
    const v = String(raw).trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Recipients for an office:
 *  1. office.settings.hhaxSummaryRecipients (string[] of emails) when present
 *  2. fallback: emails of users with admin/office_admin role assigned to that
 *     office, plus any super_admin user
 */
function resolveRecipients(
  office: Office | null,
  allUsers: User[],
): string[] {
  const configured = (office?.settings as { hhaxSummaryRecipients?: unknown } | null)
    ?.hhaxSummaryRecipients;
  if (Array.isArray(configured) && configured.length > 0) {
    return uniqEmails(configured.map((v) => (typeof v === "string" ? v : null)));
  }
  const officeId = office?.id ?? null;
  const fallback = allUsers
    .filter((u) => u.isActive !== false)
    .filter((u) => {
      if (u.role === "super_admin") return true;
      if (officeId && (u.role === "admin" || u.role === "office_admin")) {
        return u.primaryOfficeId === officeId;
      }
      // For ungrouped logs (no officeId), include all admins as a safety net.
      if (!officeId && (u.role === "admin" || u.role === "office_admin")) {
        return true;
      }
      return false;
    })
    .map((u) => u.email);
  return uniqEmails(fallback);
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-US", { timeZone: "America/New_York" });
  } catch {
    return new Date(d).toISOString();
  }
}

function buildEmail(
  officeName: string,
  stages: StageSummary[],
  windowLabel: string,
): { subject: string; html: string; text: string } {
  const totals = stages.reduce(
    (acc, s) => {
      acc.created += s.recordsCreated;
      acc.updated += s.recordsUpdated;
      acc.skipped += s.recordsSkipped;
      acc.failed += s.recordsFailed;
      acc.errors += s.errors.length;
      return acc;
    },
    { created: 0, updated: 0, skipped: 0, failed: 0, errors: 0 },
  );

  const hasFailures = stages.some(
    (s) => s.status === "failed" || s.status === "partial" || s.recordsFailed > 0,
  );

  const subject = `[HHAeXchange] ${officeName} daily import summary — ${totals.created} created, ${totals.updated} updated, ${totals.failed} failed`;

  const stageRows = stages
    .map((s) => {
      const statusBadge = (() => {
        const c =
          s.status === "completed"
            ? "#16a34a"
            : s.status === "partial"
              ? "#d97706"
              : s.status === "failed"
                ? "#dc2626"
                : "#6b7280";
        return `<span style="background:${c};color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;">${escapeHtml(s.status ?? "unknown")}</span>`;
      })();
      return `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${escapeHtml(s.syncType)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${statusBadge}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${s.recordsTotal}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${s.recordsCreated}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${s.recordsUpdated}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${s.recordsSkipped}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;color:${s.recordsFailed > 0 ? "#dc2626" : "#111"};">${s.recordsFailed}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;color:#6b7280;">${escapeHtml(s.fileName ?? "—")}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${escapeHtml(fmtDate(s.completedAt ?? s.startedAt))}</td>
        </tr>
      `;
    })
    .join("");

  const errorSections = stages
    .filter((s) => s.errors.length > 0 || s.unrecognizedHeaders.length > 0)
    .map((s) => {
      const errorsHtml =
        s.errors.length > 0
          ? `<p style="margin:8px 0 4px;font-weight:600;">First ${Math.min(s.errors.length, MAX_ERRORS_IN_EMAIL)} of ${s.errors.length} error(s):</p>
             <ul style="margin:0;padding-left:20px;font-family:monospace;font-size:12px;color:#dc2626;">
               ${s.errors.slice(0, MAX_ERRORS_IN_EMAIL).map((e) => `<li>${escapeHtml(e)}</li>`).join("")}
             </ul>`
          : "";
      const headersHtml =
        s.unrecognizedHeaders.length > 0
          ? `<p style="margin:8px 0 4px;font-weight:600;">Unrecognized column(s):</p>
             <p style="margin:0;font-family:monospace;font-size:12px;color:#d97706;">${s.unrecognizedHeaders.map((h) => escapeHtml(h)).join(", ")}</p>`
          : "";
      return `
        <div style="margin-top:16px;padding:12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:4px;">
          <p style="margin:0;font-weight:600;text-transform:capitalize;">${escapeHtml(s.syncType)} stage</p>
          ${errorsHtml}
          ${headersHtml}
        </div>
      `;
    })
    .join("");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:0 auto;color:#111;">
      <h2 style="margin:0 0 4px;">HHAeXchange daily import summary</h2>
      <p style="margin:0 0 16px;color:#6b7280;">Office: <strong>${escapeHtml(officeName)}</strong> · Window: ${escapeHtml(windowLabel)}</p>
      <div style="padding:12px;background:${hasFailures ? "#fef2f2" : "#f0fdf4"};border-radius:6px;margin-bottom:16px;">
        <strong>${totals.created}</strong> created · <strong>${totals.updated}</strong> updated · <strong>${totals.skipped}</strong> skipped · <strong style="color:${totals.failed > 0 ? "#dc2626" : "#111"};">${totals.failed}</strong> failed · <strong>${totals.errors}</strong> error message(s)
      </div>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:8px 10px;">Stage</th>
            <th style="padding:8px 10px;">Status</th>
            <th style="padding:8px 10px;text-align:right;">Total</th>
            <th style="padding:8px 10px;text-align:right;">Created</th>
            <th style="padding:8px 10px;text-align:right;">Updated</th>
            <th style="padding:8px 10px;text-align:right;">Skipped</th>
            <th style="padding:8px 10px;text-align:right;">Failed</th>
            <th style="padding:8px 10px;">File</th>
            <th style="padding:8px 10px;">Completed</th>
          </tr>
        </thead>
        <tbody>${stageRows}</tbody>
      </table>
      ${errorSections}
      <p style="margin-top:24px;font-size:12px;color:#6b7280;">You're receiving this because you're configured as a recipient for HHAeXchange import summaries. Configure recipients in the office's <code>settings.hhaxSummaryRecipients</code>.</p>
    </div>
  `;

  const textLines = [
    `HHAeXchange daily import summary`,
    `Office: ${officeName}`,
    `Window: ${windowLabel}`,
    ``,
    `Totals: ${totals.created} created, ${totals.updated} updated, ${totals.skipped} skipped, ${totals.failed} failed, ${totals.errors} error message(s)`,
    ``,
    ...stages.map(
      (s) =>
        `- ${s.syncType} [${s.status ?? "unknown"}] total=${s.recordsTotal} created=${s.recordsCreated} updated=${s.recordsUpdated} skipped=${s.recordsSkipped} failed=${s.recordsFailed} file=${s.fileName ?? "—"}`,
    ),
  ];
  for (const s of stages) {
    if (s.errors.length > 0) {
      textLines.push("", `${s.syncType} errors (first ${Math.min(s.errors.length, MAX_ERRORS_IN_EMAIL)} of ${s.errors.length}):`);
      for (const e of s.errors.slice(0, MAX_ERRORS_IN_EMAIL)) {
        textLines.push(`  - ${e}`);
      }
    }
    if (s.unrecognizedHeaders.length > 0) {
      textLines.push("", `${s.syncType} unrecognized columns: ${s.unrecognizedHeaders.join(", ")}`);
    }
  }
  return { subject, html, text: textLines.join("\n") };
}

export interface DailyHhaxSummaryResult {
  windowHours: number;
  windowStart: string;
  windowEnd: string;
  totalLogsConsidered: number;
  officeSummaries: OfficeSummary[];
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
}

/**
 * Send a daily HHAeXchange import summary email per office. Looks at all
 * sync_log rows started within the past `windowHours` (default 24) and, for
 * each office, sends the latest result of each sync-type to that office's
 * configured (or default admin) recipients.
 */
export async function sendDailyHhaxSummary(
  windowHours: number = 24,
): Promise<DailyHhaxSummaryResult> {
  const windowEndDate = new Date();
  const windowStartDate = new Date(windowEndDate.getTime() - windowHours * 60 * 60 * 1000);
  const windowLabel = `${fmtDate(windowStartDate)} → ${fmtDate(windowEndDate)}`;

  // Pull a generous slice; per-office filtering happens after.
  const logs = await storage.getHhaxSyncLogs(500);
  const grouped = groupLatestByOffice(logs, windowStartDate.getTime());

  const [allOffices, allUsers] = await Promise.all([
    storage.getAllOffices(),
    storage.getAllUsers(),
  ]);
  const officeById = new Map(allOffices.map((o) => [o.id, o]));

  const result: DailyHhaxSummaryResult = {
    windowHours,
    windowStart: windowStartDate.toISOString(),
    windowEnd: windowEndDate.toISOString(),
    totalLogsConsidered: logs.length,
    officeSummaries: [],
    emailsSent: 0,
    emailsSkipped: 0,
    emailsFailed: 0,
  };

  if (grouped.size === 0) {
    console.log(
      `[HhaxSummary] No HHAeXchange sync activity in the last ${windowHours}h — nothing to send.`,
    );
    return result;
  }

  for (const [officeId, perTypeMap] of Array.from(grouped.entries())) {
    const office = officeId ? officeById.get(officeId) ?? null : null;
    const officeName = office?.name ?? "Unassigned / Global";
    const stages: StageSummary[] = Array.from(perTypeMap.values())
      .map(getStageFromLog)
      .sort((a, b) => a.syncType.localeCompare(b.syncType));
    const recipients = resolveRecipients(office, allUsers);
    const summary: OfficeSummary = {
      officeId,
      officeName,
      stages,
      recipients,
      emailStatus: "skipped",
    };
    if (recipients.length === 0) {
      console.warn(
        `[HhaxSummary] No recipients configured for office "${officeName}" — skipping.`,
      );
      result.emailsSkipped += 1;
      result.officeSummaries.push(summary);
      continue;
    }
    const { subject, html, text } = buildEmail(officeName, stages, windowLabel);
    let sentCount = 0;
    let failedCount = 0;
    let lastError: string | undefined;
    for (const to of recipients) {
      try {
        await sendEmailWithOptions({ to, subject, html, text });
        sentCount += 1;
      } catch (err: any) {
        failedCount += 1;
        lastError = err?.message || String(err);
        console.error(
          `[HhaxSummary] Failed to email ${to} for office "${officeName}":`,
          err,
        );
      }
    }
    if (sentCount > 0 && failedCount === 0) {
      summary.emailStatus = "sent";
      result.emailsSent += 1;
    } else if (sentCount > 0) {
      summary.emailStatus = "sent";
      summary.error = `Some recipients failed: ${lastError}`;
      result.emailsSent += 1;
    } else {
      summary.emailStatus = "failed";
      summary.error = lastError;
      result.emailsFailed += 1;
    }
    result.officeSummaries.push(summary);
  }

  console.log(
    `[HhaxSummary] Daily summary complete — sent: ${result.emailsSent}, skipped: ${result.emailsSkipped}, failed: ${result.emailsFailed}`,
  );
  return result;
}
