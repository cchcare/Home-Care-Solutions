import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, ClipboardList, FileText } from "lucide-react";
import type { EnrollmentWindow } from "@shared/schema";

const TIER_LABELS: Record<string, string> = {
  employee: "Employee Only",
  employee_spouse: "Employee + Spouse",
  employee_children: "Employee + Children",
  employee_family: "Employee + Family",
  waived: "Waived",
};

export default function BenefitsEnrollmentsPage() {
  const [windowId, setWindowId] = useState<string>("__all__");
  const [status, setStatus] = useState<string>("__all__");
  const [search, setSearch] = useState("");

  const { data: windows = [] } = useQuery<EnrollmentWindow[]>({ queryKey: ["/api/enrollment-windows"] });
  const params = new URLSearchParams();
  if (windowId !== "__all__") params.set("windowId", windowId);
  if (status !== "__all__") params.set("status", status);
  const qs = params.toString();
  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/benefit-enrollments", windowId, status],
    queryFn: () => fetch(`/api/benefit-enrollments${qs ? `?${qs}` : ""}`).then(r => r.json()),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      (r.employeeName || "").toLowerCase().includes(s) ||
      (r.employeeEmail || "").toLowerCase().includes(s) ||
      (r.carrier || "").toLowerCase().includes(s) ||
      (r.planName || "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  const exportUrl = `/api/benefit-enrollments/export.csv${qs ? `?${qs}` : ""}`;

  const stats = useMemo(() => {
    const total = rows.length;
    const enrolled = rows.filter(r => r.status !== "waived").length;
    const waived = rows.filter(r => r.status === "waived").length;
    return { total, enrolled, waived };
  }, [rows]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="container mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold">Benefits Enrollments</h1>
                <p className="text-muted-foreground">View employee elections and export for your broker.</p>
              </div>
            </div>
            <Button asChild data-testid="button-export-csv">
              <a href={exportUrl} download><Download className="h-4 w-4 mr-2" />Export CSV</a>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total elections</div><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Enrolled</div><div className="text-3xl font-bold">{stats.enrolled}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Waived</div><div className="text-3xl font-bold">{stats.waived}</div></CardContent></Card>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Select value={windowId} onValueChange={setWindowId}>
                    <SelectTrigger data-testid="filter-window"><SelectValue placeholder="All windows" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All enrollment windows</SelectItem>
                      {windows.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger data-testid="filter-status"><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="waived">Waived</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Search employee, plan, carrier…" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search" />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Benefit</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Deps</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signed</TableHead>
                    <TableHead>Form</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={10} className="text-center py-6">Loading…</TableCell></TableRow>}
                  {!isLoading && filtered.map(r => (
                    <TableRow key={r.id} data-testid={`row-enrollment-${r.id}`}>
                      <TableCell><div className="font-medium">{r.employeeName}</div><div className="text-xs text-muted-foreground">{r.employeeEmail}</div></TableCell>
                      <TableCell><div>{r.windowName}</div><div className="text-xs text-muted-foreground">{r.windowType?.replace(/_/g, " ")}</div></TableCell>
                      <TableCell><Badge variant="outline">{(r.benefitType || "").replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell><div>{r.planName}</div><div className="text-xs text-muted-foreground">{r.carrier}</div></TableCell>
                      <TableCell>{TIER_LABELS[r.tier] || r.tier}</TableCell>
                      <TableCell>{r.dependentCount}</TableCell>
                      <TableCell>{r.coverageEffectiveDate || "—"}</TableCell>
                      <TableCell><Badge variant={r.status === "submitted" || r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-xs">{r.signedAt ? new Date(r.signedAt).toLocaleDateString() : "—"}<div className="text-muted-foreground">{r.signedName}</div></TableCell>
                      <TableCell>{r.documentId ? <a href={`/api/documents/${r.documentId}/view`} target="_blank" rel="noopener noreferrer" className="text-blue-600 inline-flex items-center gap-1 text-xs"><FileText className="h-3 w-3" />PDF</a> : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No enrollments match these filters.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
