import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeletonRows, ListSkeleton } from "@/components/ui/loading-states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Upload, Trash2, Download } from "lucide-react";
import type { CompPayrollPeriod, Caregiver, Client } from "@shared/schema";

const money = (n: number) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CoordinatorCompensation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name: "", startDate: "", endDate: "", otWeeklyThreshold: "40" });

  const isManager = ["super_admin", "admin", "office_admin", "supervisor", "manager"].includes((user as any)?.role || "");

  const { data: periods = [] } = useQuery<CompPayrollPeriod[]>({ queryKey: ["/api/comp/periods"] });
  const period = periods.find((p) => p.id === selectedPeriodId) || periods[0];
  const activePeriodId = period?.id || "";

  const createPeriod = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/comp/periods", {
        name: periodForm.name,
        startDate: periodForm.startDate,
        endDate: periodForm.endDate,
        otWeeklyThreshold: periodForm.otWeeklyThreshold || "40",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comp/periods"] });
      setPeriodDialogOpen(false);
      setPeriodForm({ name: "", startDate: "", endDate: "", otWeeklyThreshold: "40" });
      toast({ title: "Payroll period created" });
    },
    onError: (e: any) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold">Coordinator Compensation</h1>
              <p className="text-sm text-muted-foreground">Track hours, caregiver payroll, and coordinator compensation per payroll period.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={activePeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="w-64" data-testid="select-period"><SelectValue placeholder="Select payroll period" /></SelectTrigger>
                <SelectContent>
                  {periods.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.startDate} → {p.endDate})</SelectItem>)}
                </SelectContent>
              </Select>
              {isManager && (
                <Button onClick={() => setPeriodDialogOpen(true)} data-testid="button-add-period"><Plus className="mr-2 h-4 w-4" /> New Period</Button>
              )}
            </div>
          </div>

          {!period ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No payroll periods yet. Create one to begin (biweekly by default).</CardContent></Card>
          ) : (
            <Tabs defaultValue="caregiver" className="space-y-4">
              <TabsList>
                <TabsTrigger value="caregiver" data-testid="tab-caregiver">Caregiver Payroll</TabsTrigger>
                <TabsTrigger value="coordinator" data-testid="tab-coordinator">Coordinator Compensation</TabsTrigger>
                <TabsTrigger value="schedule" data-testid="tab-schedule">Schedule Entries</TabsTrigger>
              </TabsList>
              <TabsContent value="caregiver"><CaregiverPayrollTab periodId={activePeriodId} canEdit={isManager} /></TabsContent>
              <TabsContent value="coordinator"><CoordinatorPayrollTab periodId={activePeriodId} canEdit={isManager} /></TabsContent>
              <TabsContent value="schedule"><ScheduleTab period={period} canEdit={isManager} /></TabsContent>
            </Tabs>
          )}
        </main>
      </div>

      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Payroll Period</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} placeholder="e.g. Jan 5–18, 2026" data-testid="input-period-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start date</Label><Input type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })} data-testid="input-period-start" /></div>
              <div><Label>End date</Label><Input type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })} data-testid="input-period-end" /></div>
            </div>
            <div><Label>Weekly OT threshold (hours)</Label><Input type="number" step="0.5" value={periodForm.otWeeklyThreshold} onChange={(e) => setPeriodForm({ ...periodForm, otWeeklyThreshold: e.target.value })} data-testid="input-ot-threshold" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createPeriod.mutate()} disabled={createPeriod.isPending || !periodForm.name || !periodForm.startDate || !periodForm.endDate} data-testid="button-save-period">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CaregiverPayrollRow {
  caregiverId: string; caregiverName: string; coordinatorId: string | null; rate: number;
  totalHours: number; regularHours: number; overtimeHours: number; payroll: number;
  paymentMade: number; paymentRemaining: number;
}

function CaregiverPayrollTab({ periodId, canEdit }: { periodId: string; canEdit: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ rows: CaregiverPayrollRow[] }>({ queryKey: ["/api/comp/periods", periodId, "caregiver-payroll"] });
  const rows = data?.rows || [];

  const savePayment = useMutation({
    mutationFn: async ({ caregiverId, paymentMade }: { caregiverId: string; paymentMade: number }) => {
      await apiRequest("PUT", `/api/comp/periods/${periodId}/caregiver-payment/${caregiverId}`, { paymentMade });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/comp/periods", periodId, "caregiver-payroll"] }); toast({ title: "Payment saved" }); },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const totals = rows.reduce((a, r) => ({ payroll: a.payroll + r.payroll, paid: a.paid + r.paymentMade, rem: a.rem + r.paymentRemaining }), { payroll: 0, paid: 0, rem: 0 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Caregiver Payroll</CardTitle>
        <a href={`/api/comp/periods/${periodId}/export.csv?type=caregiver`} download>
          <Button variant="outline" size="sm" data-testid="button-export-caregiver"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </a>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Caregiver</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Total Hrs</TableHead>
              <TableHead className="text-right">Regular</TableHead>
              <TableHead className="text-right">OT</TableHead>
              <TableHead className="text-right">Payroll</TableHead>
              <TableHead className="text-right">Payment Made</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableSkeletonRows rows={5} cols={8} />
              : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hours recorded in this period.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.caregiverId} data-testid={`cg-row-${r.caregiverId}`}>
                  <TableCell className="font-medium">{r.caregiverName}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.rate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.totalHours}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.regularHours}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.overtimeHours}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.payroll)}</TableCell>
                  <TableCell className="text-right">
                    <PaymentInput initial={r.paymentMade} disabled={!canEdit} onSave={(v) => savePayment.mutate({ caregiverId: r.caregiverId, paymentMade: v })} testId={`cg-pay-${r.caregiverId}`} />
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${r.paymentRemaining > 0 ? "text-amber-600" : ""}`}>{money(r.paymentRemaining)}</TableCell>
                </TableRow>
              ))}
            {rows.length > 0 && (
              <TableRow className="font-semibold border-t-2">
                <TableCell colSpan={5}>Totals</TableCell>
                <TableCell className="text-right tabular-nums">{money(totals.payroll)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(totals.paid)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(totals.rem)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface CoordCaregiverRow { caregiverId: string; caregiverName: string; totalHours: number; regularHours: number; overtimeHours: number; caregiverPayroll: number; coordinatorGross: number; compensation: number; }
interface CoordBlock { coordinatorId: string; coordinatorName: string; coordinatorRate: number; rows: CoordCaregiverRow[]; totalCompensation: number; paymentMade: number; paymentRemaining: number; }

function CoordinatorPayrollTab({ periodId, canEdit }: { periodId: string; canEdit: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ coordinators: CoordBlock[] }>({ queryKey: ["/api/comp/periods", periodId, "coordinator-payroll"] });
  const blocks = data?.coordinators || [];

  const savePayment = useMutation({
    mutationFn: async ({ coordinatorId, paymentMade }: { coordinatorId: string; paymentMade: number }) => {
      await apiRequest("PUT", `/api/comp/periods/${periodId}/coordinator-payment/${coordinatorId}`, { paymentMade });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/comp/periods", periodId, "coordinator-payroll"] }); toast({ title: "Payment saved" }); },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <Card><CardContent className="py-6"><ListSkeleton rows={4} rowHeight="h-10" /></CardContent></Card>;
  if (blocks.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground">No coordinators found for this office.</CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <a href={`/api/comp/periods/${periodId}/export.csv?type=coordinator`} download>
          <Button variant="outline" size="sm" data-testid="button-export-coordinator"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </a>
      </div>
      {blocks.map((b) => (
        <Card key={b.coordinatorId} data-testid={`coord-block-${b.coordinatorId}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{b.coordinatorName} <span className="text-sm font-normal text-muted-foreground">· rate {money(b.coordinatorRate)}/hr</span></CardTitle>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total compensation</div>
              <div className={`text-lg font-semibold tabular-nums ${b.totalCompensation < 0 ? "text-red-600" : ""}`}>{money(b.totalCompensation)}</div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caregiver</TableHead>
                  <TableHead className="text-right">Total Hrs</TableHead>
                  <TableHead className="text-right">Caregiver Payroll</TableHead>
                  <TableHead className="text-right">Coordinator Gross</TableHead>
                  <TableHead className="text-right">Compensation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {b.rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No caregiver hours this period.</TableCell></TableRow>
                  : b.rows.map((r) => (
                    <TableRow key={r.caregiverId}>
                      <TableCell>{r.caregiverName}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.totalHours}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.caregiverPayroll)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.coordinatorGross)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${r.compensation < 0 ? "text-red-600" : ""}`}>{money(r.compensation)}</TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-semibold border-t-2">
                  <TableCell colSpan={4}>Total compensation</TableCell>
                  <TableCell className={`text-right tabular-nums ${b.totalCompensation < 0 ? "text-red-600" : ""}`}>{money(b.totalCompensation)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-end gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Payment made</span>
                <PaymentInput initial={b.paymentMade} disabled={!canEdit} onSave={(v) => savePayment.mutate({ coordinatorId: b.coordinatorId, paymentMade: v })} testId={`coord-pay-${b.coordinatorId}`} />
              </div>
              <div className="text-sm">Remaining: <span className={`font-semibold tabular-nums ${b.paymentRemaining !== 0 ? "text-amber-600" : ""}`}>{money(b.paymentRemaining)}</span></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PaymentInput({ initial, onSave, disabled, testId }: { initial: number; onSave: (v: number) => void; disabled?: boolean; testId?: string }) {
  const [val, setVal] = useState(String(initial ?? 0));
  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        type="number" step="0.01" min="0" value={val} disabled={disabled}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { const n = Number(val); if (!disabled && n !== initial) onSave(n); }}
        className="w-28 text-right tabular-nums" data-testid={testId}
      />
    </div>
  );
}

function ScheduleTab({ period, canEdit }: { period: CompPayrollPeriod; canEdit: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [entryForm, setEntryForm] = useState({ caregiverId: "", clientId: "", workDate: period.startDate, hours: "" });

  const key = ["/api/comp/schedule-entries", `?startDate=${period.startDate}&endDate=${period.endDate}`];
  const { data: entries = [], isLoading } = useQuery<any[]>({
    queryKey: key,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/comp/schedule-entries?startDate=${period.startDate}&endDate=${period.endDate}`);
      return res.json();
    },
  });
  const { data: caregivers = [] } = useQuery<Caregiver[]>({ queryKey: ["/api/caregivers"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const cgName = (id: string) => { const c = caregivers.find((x) => x.id === id); return c ? `${c.firstName} ${c.lastName}` : id; };
  const clName = (id: string | null) => { if (!id) return "—"; const c = clients.find((x) => x.id === id); return c ? `${c.firstName} ${c.lastName}` : id; };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["/api/comp/periods", period.id, "caregiver-payroll"] });
    queryClient.invalidateQueries({ queryKey: ["/api/comp/periods", period.id, "coordinator-payroll"] });
  };

  const addEntry = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/comp/schedule-entries", {
        caregiverId: entryForm.caregiverId,
        clientId: entryForm.clientId || null,
        workDate: entryForm.workDate,
        hours: entryForm.hours,
      });
    },
    onSuccess: () => { refresh(); setEntryForm({ ...entryForm, hours: "" }); toast({ title: "Entry added" }); },
    onError: (e: any) => toast({ title: "Add failed", description: e.message, variant: "destructive" }),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/comp/schedule-entries/${id}`); },
    onSuccess: () => { refresh(); },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const importFile = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiRequest("POST", "/api/comp/schedule-entries/import", fd);
      return res.json();
    },
    onSuccess: (r: any) => {
      refresh();
      toast({ title: `Imported ${r.imported} entries`, description: r.skipped ? `${r.skipped} rows skipped. First: ${r.errors?.[0]?.reason ?? ""}` : undefined });
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Schedule Entries · {period.startDate} → {period.endDate}</CardTitle>
        {canEdit && (
          <div className="flex items-center gap-2">
            <a href="/api/comp/schedule-entries/template.csv" download>
              <Button variant="ghost" size="sm" data-testid="button-template"><Download className="mr-2 h-4 w-4" /> Template</Button>
            </a>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile.mutate(f); e.target.value = ""; }} data-testid="input-import-file" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importFile.isPending} data-testid="button-import">
              <Upload className="mr-2 h-4 w-4" /> {importFile.isPending ? "Importing…" : "Import Excel/CSV"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {canEdit && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
            <div className="md:col-span-2">
              <Label>Caregiver</Label>
              <Select value={entryForm.caregiverId} onValueChange={(v) => setEntryForm({ ...entryForm, caregiverId: v })}>
                <SelectTrigger data-testid="select-entry-caregiver"><SelectValue placeholder="Select caregiver" /></SelectTrigger>
                <SelectContent>{caregivers.map((c) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              <Select value={entryForm.clientId || "none"} onValueChange={(v) => setEntryForm({ ...entryForm, clientId: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="select-entry-client"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="none">— None —</SelectItem>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" min={period.startDate} max={period.endDate} value={entryForm.workDate} onChange={(e) => setEntryForm({ ...entryForm, workDate: e.target.value })} data-testid="input-entry-date" /></div>
            <div className="flex gap-2 items-end">
              <div className="flex-1"><Label>Hours</Label><Input type="number" step="0.25" min="0" value={entryForm.hours} onChange={(e) => setEntryForm({ ...entryForm, hours: e.target.value })} data-testid="input-entry-hours" /></div>
              <Button onClick={() => addEntry.mutate()} disabled={addEntry.isPending || !entryForm.caregiverId || !entryForm.hours} data-testid="button-add-entry"><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Caregiver</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                {canEdit && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableSkeletonRows rows={5} cols={5} />
                : entries.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No entries yet. Add one above or import a spreadsheet.</TableCell></TableRow>
                : entries.map((e) => (
                  <TableRow key={e.id} data-testid={`entry-${e.id}`}>
                    <TableCell>{e.workDate}</TableCell>
                    <TableCell>{cgName(e.caregiverId)}</TableCell>
                    <TableCell>{clName(e.clientId)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(e.hours)}</TableCell>
                    {canEdit && <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => deleteEntry.mutate(e.id)} data-testid={`button-del-entry-${e.id}`}><Trash2 className="h-4 w-4" /></Button></TableCell>}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
