export type SiteEntry = {
  title: string;
  path: string;
  description: string;
  keywords: string[];
  category: "page" | "report";
};

export const SITE_CATALOG: SiteEntry[] = [
  // Core pages
  { title: "Dashboard", path: "/", description: "Home dashboard with key metrics and shortcuts", keywords: ["home", "overview", "metrics"], category: "page" },
  { title: "Clients", path: "/clients", description: "All clients (members)", keywords: ["client", "member", "patient", "consumer"], category: "page" },
  { title: "Client Intake", path: "/client-intake", description: "Start a new client intake", keywords: ["new client", "intake", "onboard"], category: "page" },
  { title: "Caregivers", path: "/caregivers", description: "All caregivers (DCWs)", keywords: ["caregiver", "dcw", "worker", "aide", "staff"], category: "page" },
  { title: "Offices", path: "/offices", description: "Branch offices", keywords: ["branch", "location", "site"], category: "page" },
  { title: "User Management", path: "/user-management", description: "Internal users, roles, and permissions", keywords: ["users", "team", "permissions", "roles", "admin"], category: "page" },
  { title: "Role Wizard", path: "/role-wizard", description: "Configure roles and permissions", keywords: ["roles", "permissions"], category: "page" },
  { title: "Account Settings", path: "/account-settings", description: "Your account preferences", keywords: ["profile", "preferences", "settings"], category: "page" },
  { title: "Admin Settings", path: "/admin-settings", description: "Organization and admin settings", keywords: ["org", "organization", "admin", "settings"], category: "page" },

  // Compliance / clinical
  { title: "Compliance", path: "/compliance", description: "Compliance items and tracking", keywords: ["compliance", "regulations"], category: "page" },
  { title: "Documents", path: "/documents", description: "Document library", keywords: ["files", "documents", "library"], category: "page" },
  { title: "Letter Templates", path: "/letter-templates", description: "Letter templates for caregivers and clients", keywords: ["letters", "templates"], category: "page" },
  { title: "Email Templates", path: "/email-templates", description: "Email templates", keywords: ["email", "templates"], category: "page" },
  { title: "E-Signature Templates", path: "/esignature-templates", description: "E-signature document templates", keywords: ["e-sign", "esign", "signature", "templates"], category: "page" },
  { title: "Training", path: "/training", description: "Caregiver training records", keywords: ["training", "in-service"], category: "page" },
  { title: "DCW Training", path: "/dcw-training", description: "DCW training portal", keywords: ["dcw", "training"], category: "page" },
  { title: "Staff Training", path: "/staff-training", description: "Staff training portal", keywords: ["staff", "training"], category: "page" },
  { title: "Incidents", path: "/incidents", description: "Incident reporting and tracking", keywords: ["incidents", "events"], category: "page" },
  { title: "Audit Assessment", path: "/audit-assessment", description: "DOH audit and self-assessment tool", keywords: ["audit", "doh", "assessment", "survey"], category: "page" },
  { title: "Survey Readiness", path: "/survey-readiness", description: "DOH survey readiness", keywords: ["survey", "readiness", "doh"], category: "page" },
  { title: "Supervisory Visits", path: "/supervisory-visits", description: "Supervisory visit log", keywords: ["supervisory", "visits"], category: "page" },
  { title: "Infection Control", path: "/infection-control", description: "Infection control program", keywords: ["infection", "control", "ipc"], category: "page" },
  { title: "QAPI", path: "/qapi", description: "Quality assurance and performance improvement", keywords: ["qapi", "quality"], category: "page" },
  { title: "Policy Management", path: "/policy-management", description: "Agency policies and procedures", keywords: ["policy", "policies", "procedures"], category: "page" },
  { title: "Exclusion Verification", path: "/exclusion-verification", description: "OIG / Medicheck / SAM exclusion checks", keywords: ["exclusion", "oig", "sam", "medicheck", "verification"], category: "page" },
  { title: "Expiration Alerts", path: "/expiration-alerts", description: "Compliance and document expiration alerts", keywords: ["expiration", "alerts", "expiring"], category: "page" },
  { title: "Birthday Notifications", path: "/birthday-notifications", description: "Birthday SMS/email notifications", keywords: ["birthday", "notifications"], category: "page" },

  // Scheduling / EVV
  { title: "EVV Clock", path: "/evv-clock", description: "Electronic Visit Verification clock", keywords: ["evv", "clock", "visit verification"], category: "page" },
  { title: "Kiosk", path: "/kiosk", description: "Kiosk clock-in / clock-out", keywords: ["kiosk", "clock"], category: "page" },
  { title: "Kiosk Setup", path: "/kiosk-setup", description: "Configure the kiosk", keywords: ["kiosk", "setup"], category: "page" },
  { title: "Shift Swap Requests", path: "/shift-swap-requests", description: "Shift swap requests", keywords: ["shift", "swap", "schedule"], category: "page" },
  { title: "Staff Time Tracking", path: "/staff-time-tracking", description: "Staff time tracking", keywords: ["time", "tracking", "staff"], category: "page" },
  { title: "Tasks", path: "/tasks", description: "To-do tasks", keywords: ["tasks", "todo"], category: "page" },
  { title: "Communication", path: "/communication", description: "Messages and notifications", keywords: ["messages", "communication", "chat"], category: "page" },

  // Billing / payroll
  { title: "Billing & Payroll", path: "/billing-payroll", description: "Billing and payroll", keywords: ["billing", "payroll", "invoices"], category: "page" },
  { title: "Payroll Hub", path: "/payroll", description: "Payroll hub", keywords: ["payroll"], category: "page" },
  { title: "Coordinator Pay Records", path: "/coordinator-pay-records", description: "Coordinator pay records", keywords: ["coordinator", "pay", "payroll"], category: "page" },
  { title: "PaySync", path: "/paysync", description: "PaySync HHA payroll matching tool", keywords: ["paysync", "hha", "payroll"], category: "page" },
  { title: "Payroll Hours Calculator", path: "/payroll-hours-calculator", description: "Calculate payroll hours", keywords: ["payroll", "hours", "calculator"], category: "page" },
  { title: "Visit Hours Difference", path: "/visit-hours-difference", description: "Compare scheduled vs actual visit hours", keywords: ["visit", "hours", "difference"], category: "page" },
  { title: "Visit Log Upload", path: "/visit-log-upload", description: "Upload visit logs", keywords: ["visit", "log", "upload"], category: "page" },
  { title: "Overlap Checker", path: "/overlap-checker", description: "Check for overlapping shifts", keywords: ["overlap", "shifts"], category: "page" },

  // Integrations / system
  { title: "HHAX Integration", path: "/hhax-integration", description: "HHAeXchange integration", keywords: ["hhax", "hhaexchange", "integration"], category: "page" },
  { title: "Custom Integrations", path: "/custom-integrations", description: "Custom integrations", keywords: ["integrations"], category: "page" },
  { title: "API Keys", path: "/api-keys", description: "Manage API keys", keywords: ["api", "keys", "tokens"], category: "page" },
  { title: "API Documentation", path: "/api-docs", description: "API documentation", keywords: ["api", "docs", "documentation"], category: "page" },
  { title: "AI Assistant", path: "/ai-assistant", description: "Built-in AI assistant", keywords: ["ai", "assistant", "chat"], category: "page" },
  { title: "Help Center", path: "/help-center-admin", description: "Help center articles", keywords: ["help", "support", "articles"], category: "page" },
  { title: "Support Tickets", path: "/support-tickets", description: "Internal support tickets", keywords: ["support", "tickets"], category: "page" },
  { title: "Error Log", path: "/error-log", description: "System error log", keywords: ["errors", "logs"], category: "page" },
  { title: "System Status", path: "/system-status", description: "System status", keywords: ["status", "health"], category: "page" },
  { title: "Super Admin", path: "/super-admin", description: "Super admin tools", keywords: ["super admin", "platform admin"], category: "page" },
  { title: "Family Portal", path: "/family-portal", description: "Family member portal", keywords: ["family", "portal"], category: "page" },

  // My-area pages
  { title: "My Profile", path: "/my-profile", description: "Your caregiver profile", keywords: ["my profile", "profile"], category: "page" },
  { title: "My Compliance", path: "/my-compliance", description: "Your compliance items", keywords: ["my compliance"], category: "page" },
  { title: "My Documents", path: "/my-documents", description: "Your documents", keywords: ["my documents"], category: "page" },
  { title: "My Communication", path: "/my-communication", description: "Your messages", keywords: ["my communication", "my messages"], category: "page" },
  { title: "My Support Tickets", path: "/my-support-tickets", description: "Your support tickets", keywords: ["my support tickets"], category: "page" },

  // Reports
  { title: "Reports", path: "/reports", description: "All operational reports", keywords: ["reports"], category: "report" },
  { title: "Financial Reports", path: "/financial-reports", description: "Revenue, billing and payroll reports", keywords: ["financial", "revenue", "billing"], category: "report" },
  { title: "Care Quality Scorecard", path: "/care-quality-scorecard", description: "Care quality scorecard", keywords: ["care quality", "scorecard", "kpi"], category: "report" },
  { title: "Schedule Overlap Report", path: "/reports/schedule-overlaps", description: "Detect schedule overlaps", keywords: ["overlap", "schedule", "report"], category: "report" },
  { title: "Client Satisfaction Surveys", path: "/client-satisfaction-surveys", description: "Client satisfaction surveys", keywords: ["satisfaction", "surveys", "csat"], category: "report" },
];

export function searchSiteCatalog(q: string, limit = 50): SiteEntry[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  const matches: { entry: SiteEntry; score: number }[] = [];
  for (const entry of SITE_CATALOG) {
    const titleLc = entry.title.toLowerCase();
    const descLc = entry.description.toLowerCase();
    let score = 0;
    if (titleLc === term) score = 100;
    else if (titleLc.startsWith(term)) score = 80;
    else if (titleLc.includes(term)) score = 60;
    else if (descLc.includes(term)) score = 30;
    else if (entry.keywords.some(k => k.toLowerCase().includes(term))) score = 20;
    if (score > 0) matches.push({ entry, score });
  }
  matches.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
  return matches.slice(0, limit).map(m => m.entry);
}
