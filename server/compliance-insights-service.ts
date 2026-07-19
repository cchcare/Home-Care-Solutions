import OpenAI from "openai";
import { storage } from "./storage";
import { getUpcomingExpirations, type ExpiringItem } from "./expiration-alert-service";
import { db } from "./db";
import { incidentReports } from "@shared/schema";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { format } from "date-fns";

// Same guard pattern as aiService.ts — a missing key must not crash startup,
// and the service degrades to a rule-based summary instead of failing.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "not-configured",
});

const aiConfigured = !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

export interface ComplianceAction {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  dueDate: string | null;
  category: string;
}

export interface ComplianceInsights {
  source: "ai" | "rules";
  generatedAt: string;
  summary: string;
  actions: ComplianceAction[];
}

interface ComplianceSnapshot {
  expiringItems: ExpiringItem[];
  overdueIncidents: Array<{ kind: "doh" | "sc"; incidentType: string; dueDate: Date }>;
  credentialsMissingDates: Array<{ name: string; credentialType: string }>;
}

async function gatherSnapshot(officeId?: string): Promise<ComplianceSnapshot> {
  const allExpiring = await getUpcomingExpirations(60);
  const expiringItems = officeId
    ? allExpiring.filter((i) => !i.officeId || i.officeId === officeId)
    : allExpiring;

  const now = new Date();
  const conditions = [isNotNull(incidentReports.dohReportDue), lt(incidentReports.dohReportDue, now), eq(incidentReports.dohSubmissionStatus, "pending")];
  if (officeId) conditions.push(eq(incidentReports.officeId, officeId));
  const overdueDoh = await db.select().from(incidentReports).where(and(...conditions));

  const scConditions = [isNotNull(incidentReports.scNotificationDue), lt(incidentReports.scNotificationDue, now), eq(incidentReports.scNotificationStatus, "pending")];
  if (officeId) scConditions.push(eq(incidentReports.officeId, officeId));
  const overdueSc = await db.select().from(incidentReports).where(and(...scConditions));

  const overdueIncidents = [
    ...overdueDoh.map((i) => ({ kind: "doh" as const, incidentType: i.incidentType, dueDate: i.dohReportDue! })),
    ...overdueSc.map((i) => ({ kind: "sc" as const, incidentType: i.incidentType, dueDate: i.scNotificationDue! })),
  ];

  // Credentials that exist but have no expiration date entered yet are a
  // silent tracking gap — the alert scan can never fire for them.
  const credentials = await storage.getOfficeCredentials(officeId);
  const credentialsMissingDates = credentials
    .filter((c) => c.status === "active" && !c.expirationDate)
    .map((c) => ({ name: c.name, credentialType: c.credentialType }));

  return { expiringItems, overdueIncidents, credentialsMissingDates };
}

// Deterministic fallback (and the baseline the AI reorders/annotates):
// overdue incident reporting first, then anything expiring inside its
// urgency band, then untracked credentials.
function buildRuleBasedInsights(snapshot: ComplianceSnapshot): ComplianceInsights {
  const actions: ComplianceAction[] = [];

  for (const inc of snapshot.overdueIncidents) {
    actions.push({
      priority: "critical",
      title: inc.kind === "doh" ? `Overdue DOH incident report (${inc.incidentType})` : `Overdue Service Coordinator notification (${inc.incidentType})`,
      detail: inc.kind === "doh"
        ? `The DOH submission deadline passed on ${format(inc.dueDate, "MMM d, yyyy h:mm a")}. Submit immediately and document the delay.`
        : `The 24-hour CHC Service Coordinator notification window passed on ${format(inc.dueDate, "MMM d, yyyy h:mm a")}. Contact the SC now and record the notification.`,
      dueDate: inc.dueDate.toISOString(),
      category: "incident_reporting",
    });
  }

  for (const item of snapshot.expiringItems) {
    const days = item.daysUntilExpiration;
    const priority: ComplianceAction["priority"] = days <= 7 ? "critical" : days <= 14 ? "high" : days <= 30 ? "medium" : "low";
    actions.push({
      priority,
      title: item.itemDescription,
      detail: `${item.entityName} — due ${format(item.expirationDate, "MMM d, yyyy")} (${days === 0 ? "today" : `in ${days} days`}).`,
      dueDate: item.expirationDate.toISOString(),
      category: item.type,
    });
  }

  for (const cred of snapshot.credentialsMissingDates) {
    actions.push({
      priority: "medium",
      title: `Enter the expiration date for "${cred.name}"`,
      detail: "This credential is being tracked but has no expiration date, so renewal reminders can never fire for it. Look up the real date and enter it.",
      dueDate: null,
      category: "office_credential",
    });
  }

  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  actions.sort((a, b) => rank[a.priority] - rank[b.priority]);

  const criticalCount = actions.filter((a) => a.priority === "critical").length;
  return {
    source: "rules",
    generatedAt: new Date().toISOString(),
    summary: actions.length === 0
      ? "No outstanding compliance actions found — everything tracked is current."
      : `${actions.length} open compliance action${actions.length === 1 ? "" : "s"}${criticalCount ? `, ${criticalCount} critical` : ""}. Work top to bottom.`,
    actions: actions.slice(0, 25),
  };
}

export async function getComplianceInsights(officeId?: string): Promise<ComplianceInsights> {
  const snapshot = await gatherSnapshot(officeId);
  const ruleBased = buildRuleBasedInsights(snapshot);

  if (!aiConfigured || ruleBased.actions.length === 0) {
    return ruleBased;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a compliance operations assistant for a Pennsylvania home care agency (28 Pa. Code Chapter 611) that bills PA Medicaid Community HealthChoices MCOs. " +
            "You receive a JSON list of open compliance items (expiring credentials/certifications, overdue incident reports, claims approaching the 180-day timely-filing deadline, authorization renewals, care-plan reassessments). " +
            "Produce a prioritized daily action plan. Combine related items into one action where sensible (e.g. several caregivers with expiring TB tests). Never invent items not present in the input. " +
            'Respond with JSON only: {"summary": string (2-3 sentences, plain language, what to do first and why), "actions": [{"priority": "critical"|"high"|"medium"|"low", "title": string, "detail": string (concrete next step), "dueDate": string|null (ISO), "category": string}]}. Max 15 actions.',
        },
        {
          role: "user",
          content: JSON.stringify({
            today: format(new Date(), "yyyy-MM-dd"),
            openItems: ruleBased.actions,
          }),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    if (!parsed.summary || !Array.isArray(parsed.actions)) {
      return ruleBased;
    }
    const validPriorities = new Set(["critical", "high", "medium", "low"]);
    const actions: ComplianceAction[] = parsed.actions
      .filter((a: any) => a && typeof a.title === "string" && validPriorities.has(a.priority))
      .slice(0, 15)
      .map((a: any) => ({
        priority: a.priority,
        title: String(a.title),
        detail: typeof a.detail === "string" ? a.detail : "",
        dueDate: typeof a.dueDate === "string" ? a.dueDate : null,
        category: typeof a.category === "string" ? a.category : "general",
      }));
    if (actions.length === 0) return ruleBased;

    return {
      source: "ai",
      generatedAt: new Date().toISOString(),
      summary: String(parsed.summary),
      actions,
    };
  } catch (error) {
    console.error("[Compliance Insights] AI call failed, falling back to rule-based summary:", error);
    return ruleBased;
  }
}
