import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Office } from "@shared/schema";

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

const gapTypeLabel: Record<string, string> = {
  background_check: "Background Check Expired/Missing",
  tb_test: "TB Test Expired/Missing",
  cpr_expired: "CPR Certification Expired",
  supervisory_visit_overdue: "Supervisory Visit Overdue",
  cir_class1_overdue: "CIR Class I Report Overdue",
  cir_class2_overdue: "CIR Class II Report Overdue",
  policy_unacknowledged: "Policy Acknowledgment Missing",
};

const levelLabel: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  critical: "Critical",
};

export default function SurveyReadinessPrint() {
  const search = useSearch();
  const officeId = useMemo(() => new URLSearchParams(search).get("officeId") || "", [search]);

  const { data, isLoading, error } = useQuery<ReadinessData>({
    queryKey: ["/api/survey-readiness", officeId, "print"],
    queryFn: async () => {
      if (!officeId) throw new Error("Office ID required");
      const r = await fetch(`/api/survey-readiness?officeId=${officeId}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: !!officeId,
    staleTime: 0,
  });

  const { data: office } = useQuery<Office>({
    queryKey: ["/api/offices", officeId],
    queryFn: async () => {
      const r = await fetch(`/api/offices/${officeId}`);
      if (!r.ok) throw new Error("Failed to load office");
      return r.json();
    },
    enabled: !!officeId,
  });

  useEffect(() => {
    if (data && office) {
      const t = setTimeout(() => {
        try { window.print(); } catch {}
      }, 600);
      return () => clearTimeout(t);
    }
  }, [data, office]);

  const totalGaps = data
    ? data.gaps.caregiverGaps.length + data.gaps.visitGaps.length + data.gaps.cirGaps.length +
      data.gaps.policyGaps.length + data.gaps.clientsWithoutEmergencyPlans.length
    : 0;

  if (!officeId) {
    return (
      <div className="p-10 text-center text-red-600">
        Missing office ID. Please open this report from the Survey Readiness Hub.
      </div>
    );
  }

  if (isLoading) return <div className="p-10 text-center text-gray-500">Generating report…</div>;
  if (error || !data) return <div className="p-10 text-center text-red-600">Failed to load readiness data.</div>;

  const generated = new Date().toLocaleString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="bg-white text-gray-900 min-h-screen print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
        }
        @page { size: letter; margin: 0.6in; }
      `}</style>

      <div className="no-print sticky top-0 bg-white border-b shadow-sm p-3 flex justify-between items-center z-10">
        <div className="text-sm text-gray-600">Survey Readiness Report — {office?.name || "Office"}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.close()}>Close</Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 print:p-0 space-y-6">
        <header className="border-b border-gray-300 pb-4 avoid-break">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {office?.logoFileName && (
                <img
                  src={`/uploads/${office.logoFileName}`}
                  alt={`${office.name || "Office"} logo`}
                  className="h-16 w-auto object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div>
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <ShieldCheck className="h-6 w-6" />
                  <h1 className="text-2xl font-bold">Survey Readiness Report</h1>
                </div>
                <p className="text-lg font-semibold text-gray-800">{office?.name || "Office"}</p>
                {office?.address && (
                  <p className="text-sm text-gray-600">
                    {office.address}{office.city ? `, ${office.city}` : ""}{office.state ? `, ${office.state}` : ""} {office.zipCode || ""}
                  </p>
                )}
                {office?.phone && <p className="text-sm text-gray-600">Phone: {office.phone}</p>}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Generated</p>
              <p className="text-sm font-medium text-gray-800">{generated}</p>
            </div>
          </div>
        </header>

        <section className="avoid-break">
          <div className="grid grid-cols-3 gap-4 border border-gray-300 rounded-md p-4">
            <div className="col-span-1 text-center border-r border-gray-200 pr-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Readiness Score</p>
              <p className="text-5xl font-bold text-blue-700">{data.score}<span className="text-xl text-gray-400">/100</span></p>
              <p className="text-sm font-semibold text-gray-700 mt-1">{levelLabel[data.readinessLevel] || data.readinessLevel}</p>
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-3 text-center">
              <Stat label="Active Caregivers" value={data.summary.activeCaregivers} />
              <Stat label="Active Clients" value={data.summary.activeClients} />
              <Stat label="Open Incidents" value={data.summary.openIncidents} />
              <Stat label="Overdue Visits" value={data.summary.overdueVisits} />
              <Stat label="Unack'd Policies" value={data.summary.unapprovedPolicies} />
              <Stat label="Missing Plans" value={data.summary.clientsNeedingPlans} />
            </div>
          </div>
        </section>

        <section className="avoid-break">
          <div className="flex items-center gap-2 border border-gray-300 rounded-md p-3 bg-gray-50">
            <AlertTriangle className="h-5 w-5 text-gray-600" />
            <p className="text-sm font-medium text-gray-800">
              {totalGaps} total deficienc{totalGaps === 1 ? "y" : "ies"} identified across 5 compliance categories.
            </p>
          </div>
        </section>

        <PrintGapList
          title="Caregiver Credential Gaps"
          gaps={data.gaps.caregiverGaps}
          renderGap={(g) => `${g.name} — ${gapTypeLabel[g.type] || g.type}${g.severity ? ` [${g.severity.toUpperCase()}]` : ""}`}
        />

        <PrintGapList
          title="Supervisory Visit Compliance"
          gaps={data.gaps.visitGaps}
          renderGap={(g) => `${g.name} — ${g.lastVisit ? `Last visit ${new Date(g.lastVisit).toLocaleDateString()}` : "No visits on record"}${g.severity ? ` [${g.severity.toUpperCase()}]` : ""}`}
        />

        <PrintGapList
          title="Critical Incident Reports (CIR)"
          gaps={data.gaps.cirGaps}
          renderGap={(g) => `${gapTypeLabel[g.type] || g.type} — ${g.name || "Incident"}${g.dueDate ? ` (due ${new Date(g.dueDate).toLocaleDateString()})` : ""}${g.severity ? ` [${g.severity.toUpperCase()}]` : ""}`}
        />

        <PrintGapList
          title="Policy Acknowledgments"
          gaps={data.gaps.policyGaps}
          renderGap={(g) => `${g.policyTitle} — ${g.missingCount} staff member${g.missingCount !== 1 ? "s" : ""} have not acknowledged`}
        />

        <PrintGapList
          title="Clients Without Emergency Plans"
          gaps={data.gaps.clientsWithoutEmergencyPlans}
          renderGap={(g) => `${g.name} — Emergency plan not on file`}
        />

        <footer className="border-t border-gray-300 pt-4 mt-8 text-xs text-gray-500 text-center">
          <p>This report was generated for internal compliance and DOH survey preparation.</p>
          <p className="mt-1">{office?.name || "Office"} · Generated {generated}</p>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function PrintGapList({ title, gaps, renderGap }: { title: string; gaps: any[]; renderGap: (g: any) => string }) {
  return (
    <section className="avoid-break">
      <h2 className="text-base font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2 flex items-center gap-2">
        {title}
        <span className="ml-auto text-xs font-normal text-gray-500">
          {gaps.length === 0 ? "All clear" : `${gaps.length} item${gaps.length !== 1 ? "s" : ""}`}
        </span>
      </h2>
      {gaps.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-700 py-2">
          <CheckCircle2 className="h-4 w-4" />
          No deficiencies in this category.
        </div>
      ) : (
        <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-800">
          {gaps.map((g, i) => (
            <li key={i}>{renderGap(g)}</li>
          ))}
        </ol>
      )}
    </section>
  );
}
