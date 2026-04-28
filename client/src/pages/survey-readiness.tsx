import { useQuery } from "@tanstack/react-query";
import { useOfficeScope } from "@/context/office-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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

const gapTypeLabel: Record<string, string> = {
  background_check: "Background Check Expired/Missing",
  tb_test: "TB Test Expired/Missing",
  cpr_expired: "CPR Certification Expired",
  supervisory_visit_overdue: "Supervisory Visit Overdue",
  cir_class1_overdue: "CIR Class I Report Overdue",
  cir_class2_overdue: "CIR Class II Report Overdue",
  policy_unacknowledged: "Policy Acknowledgment Missing",
};

function ScoreGauge({ score, level }: { score: number; level: string }) {
  const cfg = levelConfig[level] || levelConfig.poor;
  const Icon = cfg.icon;
  const progressColor =
    level === "excellent" ? "bg-green-500" :
    level === "good" ? "bg-blue-500" :
    level === "fair" ? "bg-yellow-500" :
    level === "poor" ? "bg-orange-500" : "bg-red-500";

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
  renderGap: (gap: any, i: number) => React.ReactNode;
}

function GapSection({ title, icon: Icon, iconColor, gaps, renderGap }: GapSectionProps) {
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
        <div className="space-y-2">
          {gaps.map((g, i) => renderGap(g, i))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SurveyReadiness() {
  const { selectedOfficeId, isAllOffices } = useOfficeScope();

  const { data, isLoading, refetch, isFetching } = useQuery<ReadinessData>({
    queryKey: ["/api/survey-readiness", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") throw new Error("Select an office");
      const r = await fetch(`/api/survey-readiness?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
    staleTime: 2 * 60 * 1000,
  });

  const totalGaps = data
    ? data.gaps.caregiverGaps.length + data.gaps.visitGaps.length + data.gaps.cirGaps.length +
      data.gaps.policyGaps.length + data.gaps.clientsWithoutEmergencyPlans.length
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Survey Readiness Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time DOH compliance gap analysis and readiness scoring
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
              renderGap={(g, i) => (
                <div key={i} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{gapTypeLabel[g.type] || g.type}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityBadge[g.severity]}`}>
                    {g.severity}
                  </span>
                </div>
              )}
            />

            <GapSection
              title="Supervisory Visit Compliance"
              icon={Clipboard}
              iconColor="text-indigo-600 dark:text-indigo-400"
              gaps={data.gaps.visitGaps}
              renderGap={(g, i) => (
                <div key={i} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.lastVisit ? `Last visited: ${new Date(g.lastVisit).toLocaleDateString()}` : "No visits on record"}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityBadge[g.severity]}`}>
                    {g.severity}
                  </span>
                </div>
              )}
            />

            <GapSection
              title="Critical Incident Reports (CIR)"
              icon={Activity}
              iconColor="text-red-600 dark:text-red-400"
              gaps={data.gaps.cirGaps}
              renderGap={(g, i) => (
                <div key={i} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{gapTypeLabel[g.type] || g.type}</p>
                    {g.dueDate && (
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Due: {new Date(g.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityBadge[g.severity]}`}>
                    {g.severity}
                  </span>
                </div>
              )}
            />

            <GapSection
              title="Policy Acknowledgments"
              icon={FileText}
              iconColor="text-yellow-600 dark:text-yellow-400"
              gaps={data.gaps.policyGaps}
              renderGap={(g, i) => (
                <div key={i} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{g.policyTitle}</p>
                    <p className="text-xs text-muted-foreground">{g.missingCount} staff member{g.missingCount !== 1 ? "s" : ""} have not acknowledged</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityBadge[g.severity]}`}>
                    {g.severity}
                  </span>
                </div>
              )}
            />

            <GapSection
              title="Client Emergency Plans"
              icon={ClipboardList}
              iconColor="text-orange-600 dark:text-orange-400"
              gaps={data.gaps.clientsWithoutEmergencyPlans}
              renderGap={(g, i) => (
                <div key={i} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">Emergency plan not on file</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                    medium
                  </span>
                </div>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
