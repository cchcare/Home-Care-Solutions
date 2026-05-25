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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, X, CheckCircle2, Clock } from "lucide-react";
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
}

interface Instance {
  id: string;
  status: string;
  launchedAt: string;
  completedAt?: string | null;
  templateId: string | null;
  template?: { name: string; role: string } | null;
  employee?: { type: string; id: string; firstName?: string; lastName?: string; email?: string } | null;
  steps: InstanceStep[];
  progress: { total: number; done: number };
}

export default function OnboardingPage() {
  const { toast } = useToast();
  const [launchOpen, setLaunchOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: instances = [], isLoading } = useQuery<Instance[]>({
    queryKey: ["/api/onboarding/instances"],
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/onboarding/templates", "true"],
    queryFn: async () => (await fetch("/api/onboarding/templates?isActive=true")).json(),
  });
  const { data: caregiversList = [] } = useQuery<any[]>({ queryKey: ["/api/caregivers"] });
  const { data: usersList = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/onboarding/instances/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/instances"] });
      toast({ title: "Onboarding cancelled" });
    },
  });

  const completeStep = useMutation({
    mutationFn: async ({ stepId, adminOverrideReason }: { stepId: string; adminOverrideReason?: string }) =>
      apiRequest("POST", `/api/onboarding/instance-steps/${stepId}/complete`, adminOverrideReason ? { adminOverrideReason } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/instances"] });
    },
    onError: (e: any) => toast({ title: "Could not complete step", description: e?.message, variant: "destructive" }),
  });

  const handleCompleteStep = (step: { id: string; stepType: string }) => {
    if (step.stepType !== "checklist") {
      const reason = window.prompt(
        `'${step.stepType}' steps are normally completed by the new hire signing/acknowledging.\n\nIf you must override, enter a reason (>=5 chars). It will be recorded in the audit log:`
      );
      if (!reason || reason.trim().length < 5) {
        toast({ title: "Override cancelled", description: "An override reason of at least 5 characters is required." });
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
                  <ClipboardList className="w-6 h-6" /> Onboarding Progress
                </h1>
                <p className="text-muted-foreground">Track new hire onboarding across the agency.</p>
              </div>
              <div className="flex gap-2">
                <Link href="/onboarding/templates">
                  <Button variant="outline">Manage Templates</Button>
                </Link>
                <Button onClick={() => setLaunchOpen(true)} data-testid="button-launch-onboarding">
                  <Plus className="w-4 h-4 mr-1" /> Launch Onboarding
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">In Progress</div><div className="text-2xl font-bold">{inProgress.length}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Completed</div><div className="text-2xl font-bold">{completed.length}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total</div><div className="text-2xl font-bold">{instances.length}</div></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>All Onboarding Instances</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="animate-pulse h-32 bg-muted rounded" />
                ) : instances.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">No onboarding instances yet.</div>
                ) : (
                  <div className="space-y-2">
                    {instances.map((i) => {
                      const pct = i.progress.total ? Math.round((i.progress.done / i.progress.total) * 100) : 0;
                      return (
                        <div
                          key={i.id}
                          className="border rounded p-3 hover:bg-accent cursor-pointer"
                          onClick={() => setDetailId(i.id)}
                          data-testid={`instance-row-${i.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{employeeLabel(i)}</div>
                              <div className="text-xs text-muted-foreground">
                                {i.template?.name || "(template removed)"} · launched {format(new Date(i.launchedAt), "PP")}
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
          <DialogHeader><DialogTitle>Onboarding Details</DialogTitle></DialogHeader>
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

  const launch = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/onboarding/instances", {
      templateId,
      employeeType,
      ...(employeeType === "caregiver" ? { employeeCaregiverId: employeeId } : { employeeUserId: employeeId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/instances"] });
      toast({ title: "Onboarding launched" });
      setTemplateId(""); setEmployeeId(""); onClose();
    },
    onError: (e: any) => toast({ title: "Launch failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Launch Onboarding</DialogTitle></DialogHeader>
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
  const { data: inst, isLoading } = useQuery<any>({ queryKey: ["/api/onboarding/instances", id] });
  if (isLoading || !inst) return <div className="animate-pulse h-40 bg-muted rounded" />;
  return (
    <div className="space-y-3">
      <div>
        <div className="font-medium">{inst.template?.name}</div>
        <div className="text-sm text-muted-foreground">
          Employee: {[inst.employee?.firstName, inst.employee?.lastName].filter(Boolean).join(" ") || inst.employee?.email}
        </div>
        <div className="text-sm text-muted-foreground">
          Status: <Badge>{inst.status}</Badge>
        </div>
      </div>
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
            <X className="w-4 h-4 mr-1" /> Cancel Onboarding
          </Button>
        </div>
      )}
    </div>
  );
}
