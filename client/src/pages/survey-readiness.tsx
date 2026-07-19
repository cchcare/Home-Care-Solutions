import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useOfficeScope } from "@/context/office-context";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Users,
  Clipboard,
  FileText,
  Activity,
  AlertCircle,
  ClipboardList,
  UserCheck,
  Calendar,
  ChevronRight,
  Search,
  Send,
  Printer,
  Loader2,
} from "lucide-react";

interface ReadinessData {
  score: number;
  readinessLevel: string;
  gaps: {
    caregiverGaps: any[];
    visitGaps: any[];
    cirGaps: any[];
    policyGaps: any[];
    clientsWithoutEmergencyPlans: any[];
  };
  summary: {
    activeCaregivers: number;
    activeClients: number;
    openIncidents: number;
    overdueVisits: number;
    unapprovedPolicies: number;
    clientsNeedingPlans: number;
  };
}

const levelConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  excellent: { label: "Excellent", color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", icon: CheckCircle2 },
  good: { label: "Good", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", icon: ShieldCheck },
  fair: { label: "Fair", color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30", icon: AlertCircle },
  poor: { label: "Poor", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", icon: XCircle },
};

const severityBadge: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const gapTypeLabel: Record<string, string> = {
  background_check: "Background Check Expired/Missing",
  tb_test: "TB Test Expired/Missing",
  cpr_expired: "CPR Certification Expired",
  supervisory_visit_overdue: "Supervisory Visit Overdue",
  cir_class1_overdue: "CIR Class I Report Overdue",
  cir_class2_overdue: "CIR Class II Report Overdue",
  sc_notification_overdue: "CHC Service Coordinator Notification Overdue",
  policy_unacknowledged: "Policy Acknowledgment Missing",
};

function ScoreGauge({ score, level }: { score: number; level: string }) {
  const cfg = levelConfig[level] || levelConfig.poor;
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl p-6 ${cfg.bg} border border-border`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Survey Readiness Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-5xl font-bold ${cfg.color}`}>{score}</span>
            <span className="text-xl text-muted-foreground">/100</span>
          </div>
        </div>
        <div className={`p-4 rounded-full ${cfg.bg} border border-border`}>
          <Icon className={`h-10 w-10 ${cfg.color}`} />
        </div>
      </div>
      <Progress value={score} className="h-3 mb-3" />
      <div className="flex items-center justify-between">
        <Badge className={`${cfg.color} border-0 font-semibold text-sm px-3 py-1`} variant="outline">
          {cfg.label} Readiness
        </Badge>
        <p className="text-xs text-muted-foreground">Last calculated now</p>
      </div>
    </div>
  );
}

function SummaryCards({ summary }: { summary: ReadinessData["summary"] }) {
  const cards = [
    { label: "Active Caregivers", value: summary.activeCaregivers, icon: UserCheck, color: "text-blue-600 dark:text-blue-400" },
    { label: "Active Clients", value: summary.activeClients, icon: Users, color: "text-indigo-600 dark:text-indigo-400" },
    { label: "Open Incidents", value: summary.openIncidents, icon: Activity, color: summary.openIncidents > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400" },
    { label: "Overdue Visits", value: summary.overdueVisits, icon: Calendar, color: summary.overdueVisits > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400" },
    { label: "Unack'd Policies", value: summary.unapprovedPolicies, icon: FileText, color: summary.unapprovedPolicies > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400" },
    { label: "No Emergency Plan", value: summary.clientsNeedingPlans, icon: ClipboardList, color: summary.clientsNeedingPlans > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="text-center">
          <CardContent className="pt-4 pb-3">
            <c.icon className={`h-5 w-5 mx-auto mb-1 ${c.color}`} />
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface GapSectionProps {
  title: string;
  icon: any;
  iconColor: string;
  gaps: any[];
  searchKey: (g: any) => string;
  hasSeverity?: boolean;
  renderGap: (g: any, i: number) => React.ReactNode;
}

function GapSection({ title, icon: Icon, iconColor, gaps, searchKey, hasSeverity = true, renderGap }: GapSectionProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "severity">(hasSeverity ? "severity" : "name");

  if (!gaps.length) {
    return (
      <Card className="border-green-200 dark:border-green-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            {title}
            <Badge className="ml-auto bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">All Clear</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            No deficiencies found in this category.
          </div>
        </CardContent>
      </Card>
    );
  }

  const term = search.trim().toLowerCase();
  const filtered = term ? gaps.filter(g => searchKey(g).toLowerCase().includes(term)) : gaps;
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return (searchKey(a) || "").localeCompare(searchKey(b) || "");
    return (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
          <Badge className="ml-auto bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0">{gaps.length} Issue{gaps.length !== 1 ? "s" : ""}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {gaps.length > 0 && (
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search this section..."
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "severity")}>
              <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {hasSeverity && <SelectItem value="severity">Severity</SelectItem>}
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No matches for "{search}".</p>
        ) : (
          <div className="space-y-1">
            {sorted.map((g, i) => renderGap(g, i))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const READINESS_SCROLL_KEY = "surveyReadiness:scrollY";

function GapRow({ href, title, subtitle, severity, action }: {
  href: string;
  title: string;
  subtitle?: React.ReactNode;
  severity?: string;
  action?: React.ReactNode;
}) {
  const saveScroll = () => {
    try {
      const container = document.getElementById("survey-readiness-scroll");
      const y = container ? container.scrollTop : window.scrollY;
      sessionStorage.setItem(READINESS_SCROLL_KEY, String(y));
    } catch {}
  };
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-0 group">
      <Link href={href} onClick={saveScroll} className="flex-1 min-w-0 hover:text-primary transition-colors">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
        </div>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {severity && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityBadge[severity] || severityBadge.medium}`}>
            {severity}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SurveyReadiness() {
  const { selectedOfficeId, isAllOffices } = useOfficeScope();
  const { toast } = useToast();
  const [recentlySent, setRecentlySent] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(READINESS_SCROLL_KEY);
      if (saved) {
        const y = parseInt(saved, 10);
        if (!Number.isNaN(y)) {
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = y;
            else window.scrollTo({ top: y, behavior: "auto" });
          });
        }
        sessionStorage.removeItem(READINESS_SCROLL_KEY);
      }
    } catch {}
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery<ReadinessData>({
    queryKey: ["/api/survey-readiness", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") throw new Error("Select an office");
      const r = await fetch(`/api/survey-readiness?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
    staleTime: 30 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const sendReminder = useMutation({
    mutationFn: async ({ caregiverId, gapType }: { caregiverId: string; gapType: string }) => {
      return apiRequest("POST", "/api/survey-readiness/send-reminder", { caregiverId, gapType });
    },
    onSuccess: (_data, vars) => {
      // Backend rate-limits per caregiver per 24h regardless of gap type;
      // mirror that here by disabling all reminder buttons for the caregiver.
      setRecentlySent(prev => {
        const next = new Set(prev);
        next.add(vars.caregiverId);
        return next;
      });
      toast({ title: "Reminder sent", description: "The caregiver has been emailed." });
    },
    onError: (err: any, vars) => {
      const msg = err?.message || "Please try again.";
      const alreadySent = /already sent/i.test(msg) || /429/.test(msg);
      if (alreadySent) {
        setRecentlySent(prev => {
          const next = new Set(prev);
          next.add(vars.caregiverId);
          return next;
        });
        toast({ title: "Already reminded today", description: "This caregiver was reminded in the last 24 hours." });
      } else {
        toast({ title: "Could not send reminder", description: msg, variant: "destructive" });
      }
    },
  });

  const totalGaps = data
    ? data.gaps.caregiverGaps.length + data.gaps.visitGaps.length + data.gaps.cirGaps.length +
      data.gaps.policyGaps.length + data.gaps.clientsWithoutEmergencyPlans.length
    : 0;

  const handleDownloadReport = () => {
    if (!selectedOfficeId || selectedOfficeId === "all") return;
    window.open(`/survey-readiness/print?officeId=${selectedOfficeId}`, "_blank", "noopener");
  };

  const renderCaregiverGap = (g: any, i: number) => {
    const sent = recentlySent.has(g.caregiverId);
    const isPending = sendReminder.isPending && sendReminder.variables?.caregiverId === g.caregiverId;
    const reminderEligible = ["background_check", "tb_test", "cpr_expired", "supervisory_visit_overdue"].includes(g.type);
    const action = reminderEligible && g.email ? (
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        disabled={isPending || sent}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendReminder.mutate({ caregiverId: g.caregiverId, gapType: g.type }); }}
        data-testid={`button-remind-${g.caregiverId}-${g.type}`}
      >
        {isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
        {sent ? "Sent" : "Remind"}
      </Button>
    ) : null;
    return (
      <GapRow
        key={`${g.caregiverId}-${g.type}-${i}`}
        href={`/caregivers/${g.caregiverId}`}
        title={g.name}
        subtitle={gapTypeLabel[g.type] || g.type}
        severity={g.severity}
        action={action}
      />
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Survey Readiness Hub" subtitle="Real-time DOH compliance gap analysis and readiness scoring" />
        <div id="survey-readiness-scroll" ref={scrollRef} className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  Survey Readiness Hub
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Real-time DOH compliance gap analysis and readiness scoring
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReport}
                  disabled={!data || isAllOffices}
                  data-testid="button-download-report"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching || isAllOffices}
                  data-testid="button-refresh-readiness"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {isAllOffices && (
              <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
                <CardContent className="pt-4 flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Please select a specific office to view its readiness score.</span>
                </CardContent>
              </Card>
            )}

            {isLoading && !isAllOffices && (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            )}

            {data && (
              <div className="space-y-6">
                <ScoreGauge score={data.score} level={data.readinessLevel} />
                <SummaryCards summary={data.summary} />

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    {totalGaps} Total Deficiencies Identified
                  </div>
                  <Separator className="flex-1" />
                </div>

                <div className="space-y-4">
                  <GapSection
                    title="Caregiver Credential Gaps"
                    icon={UserCheck}
                    iconColor="text-blue-600 dark:text-blue-400"
                    gaps={data.gaps.caregiverGaps}
                    searchKey={(g) => g.name || ""}
                    renderGap={renderCaregiverGap}
                  />

                  <GapSection
                    title="Supervisory Visit Compliance"
                    icon={Clipboard}
                    iconColor="text-indigo-600 dark:text-indigo-400"
                    gaps={data.gaps.visitGaps}
                    searchKey={(g) => g.name || ""}
                    renderGap={(g, i) => (
                      <GapRow
                        key={`${g.caregiverId}-visit-${i}`}
                        href={`/caregivers/${g.caregiverId}`}
                        title={g.name}
                        subtitle={g.lastVisit ? `Last visited: ${new Date(g.lastVisit).toLocaleDateString()}` : "No visits on record"}
                        severity={g.severity}
                      />
                    )}
                  />

                  <GapSection
                    title="Critical Incident Reports (CIR)"
                    icon={Activity}
                    iconColor="text-red-600 dark:text-red-400"
                    gaps={data.gaps.cirGaps}
                    searchKey={(g) => `${g.name || ""} ${gapTypeLabel[g.type] || g.type}`}
                    renderGap={(g, i) => (
                      <GapRow
                        key={`${g.incidentId}-${i}`}
                        href={`/incidents?openId=${g.incidentId}`}
                        title={gapTypeLabel[g.type] || g.type}
                        subtitle={
                          <>
                            <span className="capitalize">{g.name}</span>
                            {g.dueDate && (
                              <span className="text-red-600 dark:text-red-400 font-medium ml-2">
                                · Due: {new Date(g.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </>
                        }
                        severity={g.severity}
                      />
                    )}
                  />

                  <GapSection
                    title="Policy Acknowledgments"
                    icon={FileText}
                    iconColor="text-yellow-600 dark:text-yellow-400"
                    gaps={data.gaps.policyGaps}
                    searchKey={(g) => g.policyTitle || ""}
                    renderGap={(g, i) => (
                      <GapRow
                        key={`${g.policyId}-${i}`}
                        href={`/policy-management?policyId=${g.policyId}`}
                        title={g.policyTitle}
                        subtitle={`${g.missingCount} staff member${g.missingCount !== 1 ? "s" : ""} have not acknowledged`}
                        severity={g.severity}
                      />
                    )}
                  />

                  <GapSection
                    title="Client Emergency Plans"
                    icon={ClipboardList}
                    iconColor="text-orange-600 dark:text-orange-400"
                    gaps={data.gaps.clientsWithoutEmergencyPlans}
                    searchKey={(g) => g.name || ""}
                    renderGap={(g, i) => (
                      <GapRow
                        key={`${g.clientId}-${i}`}
                        href={`/clients/${g.clientId}`}
                        title={g.name}
                        subtitle="Emergency plan not on file"
                        severity="medium"
                      />
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
