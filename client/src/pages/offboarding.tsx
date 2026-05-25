import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, X, CheckCircle2, Clock, CalendarX, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

interface InstanceStep {
  id: string;
  stepOrder: number;
  stepType: string;
  title: string;
  status: string;
  isRequired: boolean;
  completedAt?: string | null;
  description?: string | null;
}

interface Instance {
  id: string;
  status: string;
  launchedAt: string;
  completedAt?: string | null;
  terminationDate?: string | null;
  terminationProcessedAt?: string | null;
  templateId: string | null;
  template?: { name: string; role: string } | null;
  employee?: { type: string; id: string; firstName?: string; lastName?: string; email?: string } | null;
  steps: InstanceStep[];
  progress: { total: number; done: number };
}

export default function OffboardingPage() {
  const { toast } = useToast();
  const [launchOpen, setLaunchOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: instances = [], isLoading } = useQuery<Instance[]>({
    queryKey: ["/api/offboarding/instances"],
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/offboarding/templates", "true"],
    queryFn: async () => (await fetch("/api/offboarding/templates?isActive=true")).json(),
  });
  const { data: caregiversList = [] } = useQuery<any[]>({ queryKey: ["/api/caregivers"] });
  const { data: usersList = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/offboarding/instances/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offboarding/instances"] });
      toast({ title: "Offboarding cancelled" });
    },
  });

  const completeStep = useMutation({
    mutationFn: async ({ stepId, adminOverrideReason }: { stepId: string; adminOverrideReason?: string }) =>
      apiRequest("POST", `/api/offboarding/instance-steps/${stepId}/complete`, adminOverrideReason ? { adminOverrideReason } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offboarding/instances"] });
    },
    onError: (e: any) => toast({ title: "Could not complete step", description: e?.message, variant: "destructive" }),
  });

  const handleCompleteStep = (step: { id: string; stepType: string }) => {
    if (step.stepType !== "checklist") {
      const reason = window.prompt(
        `'${step.stepType}' steps usually complete via their dedicated flow.\n\nIf you must override, enter a reason (>=5 chars). It will be recorded in the audit log:`
      );
      if (!reason || reason.trim().length < 5) {
        toast({ title: "Override cancelled", description: "A reason of at least 5 characters is required." });
        return;
      }
      completeStep.mutate({ stepId: step.id, adminOverrideReason: reason.trim() });
    } else {
      completeStep.mutate({ stepId: step.id });
    }
  };

  const inProgress = instances.filter((i) => i.status === "in_progress");
  const completed = instances.filter((i) => i.status === "completed");

  const employeeLabel = (i: Instance) => {
    const e = i.employee;
    if (!e) return "(unknown)";
    const name = [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email || e.id;
    return `${name} (${e.type})`;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ClipboardList className="w-6 h-6" /> Offboarding Progress
                </h1>
                <p className="text-muted-foreground">Track employee exits, account deactivation, and final paperwork.</p>
              </div>
              <div className="flex gap-2">
                <Link href="/offboarding/templates">
                  <Button variant="outline">Manage Templates</Button>
                </Link>
                <Button onClick={() => setLaunchOpen(true)} data-testid="button-launch-offboarding">
                  <Plus className="w-4 h-4 mr-1" /> Launch Offboarding
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">In Progress</div><div className="text-2xl font-bold">{inProgress.length}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Completed</div><div className="text-2xl font-bold">{completed.length}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total</div><div className="text-2xl font-bold">{instances.length}</div></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>All Offboarding Instances</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="animate-pulse h-32 bg-muted rounded" />
                ) : instances.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">No offboarding instances yet.</div>
                ) : (
                  <div className="space-y-2">
                    {instances.map((i) => {
                      const pct = i.progress.total ? Math.round((i.progress.done / i.progress.total) * 100) : 0;
                      const termOverdue = i.terminationDate && new Date(i.terminationDate) <= new Date() && i.status === "in_progress";
                      return (
                        <div
                          key={i.id}
                          className="border rounded p-3 hover:bg-accent cursor-pointer"
                          onClick={() => setDetailId(i.id)}
                          data-testid={`instance-row-${i.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {employeeLabel(i)}
                                {termOverdue && (
                                  <Badge variant="destructive" className="text-[10px]">Termination date reached</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {i.template?.name || "(template removed)"} · launched {format(new Date(i.launchedAt), "PP")}
                                {i.terminationDate ? ` · termination ${format(new Date(i.terminationDate), "PP")}` : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 w-72">
                              <Progress value={pct} className="flex-1" />
                              <span className="text-sm w-16 text-right">{i.progress.done}/{i.progress.total}</span>
                              <Badge variant={i.status === "completed" ? "default" : i.status === "cancelled" ? "secondary" : "outline"}>
                                {i.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <LaunchDialog
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        templates={templates}
        caregivers={caregiversList}
        users={usersList}
      />

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Offboarding Details</DialogTitle></DialogHeader>
          {detailId && (
            <InstanceDetail
              id={detailId}
              onComplete={handleCompleteStep}
              onCancel={(id) => { cancelMutation.mutate(id); setDetailId(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LaunchDialog({ open, onClose, templates, caregivers, users }: any) {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState("");
  const [employeeType, setEmployeeType] = useState<"caregiver" | "user">("caregiver");
  const [employeeId, setEmployeeId] = useState("");
  const [terminationDate, setTerminationDate] = useState("");

  const launch = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/offboarding/instances", {
      templateId,
      employeeType,
      terminationDate: terminationDate || null,
      ...(employeeType === "caregiver" ? { employeeCaregiverId: employeeId } : { employeeUserId: employeeId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offboarding/instances"] });
      toast({ title: "Offboarding launched" });
      setTemplateId(""); setEmployeeId(""); setTerminationDate(""); onClose();
    },
    onError: (e: any) => toast({ title: "Launch failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Launch Offboarding</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger data-testid="select-launch-template"><SelectValue placeholder="Select template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.role})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Employee Type</Label>
            <Select value={employeeType} onValueChange={(v) => { setEmployeeType(v as any); setEmployeeId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="caregiver">Caregiver</SelectItem>
                <SelectItem value="user">Office Staff (user)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger data-testid="select-launch-employee"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employeeType === "caregiver"
                  ? caregivers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {(c.user?.firstName || c.firstName || "") + " " + (c.user?.lastName || c.lastName || "")} ({c.employeeId})
                      </SelectItem>
                    ))
                  : users.filter((u: any) => u.role !== "caregiver").map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u.username}</SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Termination Date (optional)</Label>
            <Input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} data-testid="input-termination-date" />
            <p className="text-xs text-muted-foreground mt-1">On this date the account auto-disables and the offboarding step is auto-marked complete.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!templateId || !employeeId || launch.isPending}
            onClick={() => launch.mutate()}
            data-testid="button-launch-confirm"
          >
            Launch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstanceDetail({ id, onComplete, onCancel }: { id: string; onComplete: (step: { id: string; stepType: string }) => void; onCancel: (id: string) => void }) {
  const { toast } = useToast();
  const { data: inst, isLoading } = useQuery<any>({ queryKey: ["/api/offboarding/instances", id] });
  const { data: futureShifts = [], refetch: refetchShifts } = useQuery<any[]>({
    queryKey: ["/api/offboarding/instances", id, "future-shifts"],
    queryFn: async () => (await fetch(`/api/offboarding/instances/${id}/future-shifts`)).json(),
    enabled: !!inst && inst.employee?.type === "caregiver",
  });

  const cancelShifts = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/offboarding/instances/${id}/cancel-future-shifts`, { confirm: true }),
    onSuccess: (data: any) => {
      toast({ title: "Future shifts cancelled", description: `${data?.cancelled ?? 0} shift(s) removed.` });
      refetchShifts();
      queryClient.invalidateQueries({ queryKey: ["/api/offboarding/instances"] });
    },
    onError: (e: any) => toast({ title: "Cancel failed", description: e?.message, variant: "destructive" }),
  });

  if (isLoading || !inst) return <div className="animate-pulse h-40 bg-muted rounded" />;

  const confirmAndCancelShifts = () => {
    if (!window.confirm(`Permanently delete ${futureShifts.length} upcoming shift(s) for this caregiver? This cannot be undone.`)) return;
    cancelShifts.mutate();
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="font-medium">{inst.template?.name}</div>
        <div className="text-sm text-muted-foreground">
          Employee: {[inst.employee?.firstName, inst.employee?.lastName].filter(Boolean).join(" ") || inst.employee?.email}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          Status: <Badge>{inst.status}</Badge>
          {inst.terminationDate && (
            <span className="flex items-center gap-1">
              <CalendarX className="w-3 h-3" />
              Termination: {format(new Date(inst.terminationDate), "PP")}
              {inst.terminationProcessedAt && <Badge variant="secondary" className="text-[10px]">processed</Badge>}
            </span>
          )}
        </div>
      </div>

      {inst.employee?.type === "caregiver" && futureShifts.length > 0 && (
        <div className="border border-orange-200 bg-orange-50 dark:bg-orange-950/20 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-sm">{futureShifts.length} upcoming shift(s) still assigned</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">A manager must confirm before any shifts are deleted.</p>
          <Button size="sm" variant="destructive" onClick={confirmAndCancelShifts} disabled={cancelShifts.isPending} data-testid="button-cancel-future-shifts">
            Cancel all future shifts
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {inst.steps.map((s: any) => (
          <div key={s.id} className="border rounded p-2 flex items-center justify-between" data-testid={`step-detail-${s.id}`}>
            <div>
              <div className="flex items-center gap-2">
                {s.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}
                <span className="font-medium">{s.title}</span>
                <Badge variant="outline">{s.stepType}</Badge>
                {!s.isRequired && <Badge variant="secondary">Optional</Badge>}
              </div>
              {s.description && <div className="text-xs text-muted-foreground mt-1">{s.description}</div>}
            </div>
            {s.status !== "completed" && (
              <Button size="sm" variant="outline" onClick={() => onComplete({ id: s.id, stepType: s.stepType })} data-testid={`button-complete-step-${s.id}`}>
                Mark Done
              </Button>
            )}
          </div>
        ))}
      </div>

      {inst.status === "in_progress" && (
        <div className="text-right">
          <Button size="sm" variant="destructive" onClick={() => onCancel(inst.id)}>
            <X className="w-4 h-4 mr-1" /> Cancel Offboarding
          </Button>
        </div>
      )}
    </div>
  );
}
