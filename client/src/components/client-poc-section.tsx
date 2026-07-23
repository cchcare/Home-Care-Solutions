import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Plus, Pencil, Trash2, Loader2, Target, ListChecks } from "lucide-react";
import { parseDateOnlyInput, toDateOnlyInputValue, formatDateOnly } from "@/lib/dateOnly";
import type { CarePlan, CarePlanGoal, CarePlanIntervention } from "@shared/schema";

const planEmptyForm = {
  title: "", description: "", startDate: format(new Date(), "yyyy-MM-dd"), endDate: "",
  nextAssessmentDate: "", status: "active",
};

const goalEmptyForm = { goalText: "", targetDate: "", priority: "medium", status: "active", progressNotes: "" };

const interventionEmptyForm = { interventionText: "", frequency: "daily", assignedToType: "", status: "active" };

export function ClientPocSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CarePlan | null>(null);
  const [planForm, setPlanForm] = useState(planEmptyForm);

  const queryKey = ["/api/clients", clientId, "care-plans"] as const;
  const { data: plans = [], isLoading } = useQuery<CarePlan[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}/care-plans`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load care plans");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const savePlanMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: planForm.title,
        description: planForm.description || undefined,
        startDate: planForm.startDate ? parseDateOnlyInput(planForm.startDate)?.toISOString() : undefined,
        endDate: planForm.endDate ? parseDateOnlyInput(planForm.endDate)?.toISOString() : undefined,
        nextAssessmentDate: planForm.nextAssessmentDate ? parseDateOnlyInput(planForm.nextAssessmentDate)?.toISOString() : undefined,
        status: planForm.status,
      };
      if (editingPlan) return apiRequest("PUT", `/api/care-plans/${editingPlan.id}`, payload);
      return apiRequest("POST", "/api/care-plans", { ...payload, clientId });
    },
    onSuccess: () => {
      toast({ title: editingPlan ? "Care plan updated" : "Care plan created" });
      invalidate();
      setPlanDialogOpen(false); setEditingPlan(null); setPlanForm(planEmptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreatePlan = () => { setEditingPlan(null); setPlanForm(planEmptyForm); setPlanDialogOpen(true); };
  const openEditPlan = (plan: CarePlan) => {
    setEditingPlan(plan);
    setPlanForm({
      title: plan.title,
      description: plan.description || "",
      startDate: plan.startDate ? toDateOnlyInputValue(plan.startDate) : "",
      endDate: plan.endDate ? toDateOnlyInputValue(plan.endDate) : "",
      nextAssessmentDate: plan.nextAssessmentDate ? toDateOnlyInputValue(plan.nextAssessmentDate) : "",
      status: plan.status || "active",
    });
    setPlanDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Plan of Care (POC)</CardTitle>
              <CardDescription>Goals and interventions guiding this client's care.</CardDescription>
            </div>
            <Button size="sm" onClick={openCreatePlan} data-testid="button-add-care-plan">
              <Plus className="w-4 h-4 mr-2" />New Care Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : plans.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No care plans on file yet</p>
          ) : null}
        </CardContent>
      </Card>

      {plans.map((plan) => (
        <CarePlanCard key={plan.id} plan={plan} onEdit={() => openEditPlan(plan)} />
      ))}

      <Dialog open={planDialogOpen} onOpenChange={(o) => { setPlanDialogOpen(o); if (!o) setEditingPlan(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingPlan ? "Edit Care Plan" : "New Care Plan"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={planForm.title} onChange={(e) => setPlanForm((f) => ({ ...f, title: e.target.value }))} data-testid="input-plan-title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} value={planForm.description} onChange={(e) => setPlanForm((f) => ({ ...f, description: e.target.value }))} data-testid="textarea-plan-description" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={planForm.startDate} onChange={(e) => setPlanForm((f) => ({ ...f, startDate: e.target.value }))} data-testid="input-plan-start" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={planForm.endDate} onChange={(e) => setPlanForm((f) => ({ ...f, endDate: e.target.value }))} data-testid="input-plan-end" />
              </div>
              <div className="space-y-2">
                <Label>Reassessment</Label>
                <Input type="date" value={planForm.nextAssessmentDate} onChange={(e) => setPlanForm((f) => ({ ...f, nextAssessmentDate: e.target.value }))} data-testid="input-plan-reassessment" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={planForm.status} onValueChange={(v) => setPlanForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-plan-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => savePlanMutation.mutate()} disabled={savePlanMutation.isPending || !planForm.title.trim()} data-testid="button-save-care-plan">
              {savePlanMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CarePlanCard({ plan, onEdit }: { plan: CarePlan; onEdit: () => void }) {
  const { toast } = useToast();
  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<CarePlanGoal | null>(null);
  const [goalForm, setGoalForm] = useState(goalEmptyForm);
  const [interventionOpen, setInterventionOpen] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<CarePlanIntervention | null>(null);
  const [interventionForm, setInterventionForm] = useState(interventionEmptyForm);

  const goalsKey = ["/api/care-plans", plan.id, "goals"] as const;
  const { data: goals = [] } = useQuery<CarePlanGoal[]>({
    queryKey: goalsKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/care-plans/${plan.id}/goals`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load goals");
      return r.json();
    },
  });

  const interventionsKey = ["/api/care-plans", plan.id, "interventions"] as const;
  const { data: interventions = [] } = useQuery<CarePlanIntervention[]>({
    queryKey: interventionsKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/care-plans/${plan.id}/interventions`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load interventions");
      return r.json();
    },
  });

  const invalidateGoals = () => queryClient.invalidateQueries({ queryKey: goalsKey as any });
  const invalidateInterventions = () => queryClient.invalidateQueries({ queryKey: interventionsKey as any });

  const saveGoalMutation = useMutation({
    mutationFn: () => {
      const payload = {
        goalText: goalForm.goalText,
        targetDate: goalForm.targetDate ? parseDateOnlyInput(goalForm.targetDate)?.toISOString() : undefined,
        priority: goalForm.priority,
        status: goalForm.status,
        progressNotes: goalForm.progressNotes || undefined,
      };
      if (editingGoal) return apiRequest("PATCH", `/api/care-plans/${plan.id}/goals/${editingGoal.id}`, payload);
      return apiRequest("POST", `/api/care-plans/${plan.id}/goals`, payload);
    },
    onSuccess: () => {
      toast({ title: editingGoal ? "Goal updated" : "Goal added" });
      invalidateGoals();
      setGoalOpen(false); setEditingGoal(null); setGoalForm(goalEmptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: string) => apiRequest("DELETE", `/api/care-plans/${plan.id}/goals/${goalId}`),
    onSuccess: () => { toast({ title: "Goal deleted" }); invalidateGoals(); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const saveInterventionMutation = useMutation({
    mutationFn: () => {
      const payload = {
        interventionText: interventionForm.interventionText,
        frequency: interventionForm.frequency,
        assignedToType: interventionForm.assignedToType || undefined,
        status: interventionForm.status,
      };
      if (editingIntervention) return apiRequest("PATCH", `/api/care-plans/${plan.id}/interventions/${editingIntervention.id}`, payload);
      return apiRequest("POST", `/api/care-plans/${plan.id}/interventions`, payload);
    },
    onSuccess: () => {
      toast({ title: editingIntervention ? "Intervention updated" : "Intervention added" });
      invalidateInterventions();
      setInterventionOpen(false); setEditingIntervention(null); setInterventionForm(interventionEmptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteInterventionMutation = useMutation({
    mutationFn: (interventionId: string) => apiRequest("DELETE", `/api/care-plans/${plan.id}/interventions/${interventionId}`),
    onSuccess: () => { toast({ title: "Intervention deleted" }); invalidateInterventions(); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreateGoal = () => { setEditingGoal(null); setGoalForm(goalEmptyForm); setGoalOpen(true); };
  const openEditGoal = (goal: CarePlanGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      goalText: goal.goalText,
      targetDate: goal.targetDate ? toDateOnlyInputValue(goal.targetDate) : "",
      priority: goal.priority || "medium",
      status: goal.status || "active",
      progressNotes: goal.progressNotes || "",
    });
    setGoalOpen(true);
  };

  const openCreateIntervention = () => { setEditingIntervention(null); setInterventionForm(interventionEmptyForm); setInterventionOpen(true); };
  const openEditIntervention = (intervention: CarePlanIntervention) => {
    setEditingIntervention(intervention);
    setInterventionForm({
      interventionText: intervention.interventionText,
      frequency: intervention.frequency || "daily",
      assignedToType: intervention.assignedToType || "",
      status: intervention.status || "active",
    });
    setInterventionOpen(true);
  };

  return (
    <Card data-testid={`card-care-plan-${plan.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{plan.title}</CardTitle>
            {plan.description && <CardDescription>{plan.description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={plan.status === "active" ? "default" : "secondary"}>{plan.status}</Badge>
            <Button size="sm" variant="ghost" onClick={onEdit} data-testid={`button-edit-plan-${plan.id}`}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground flex gap-4 pt-1">
          {plan.startDate && <span>Start: {formatDateOnly(plan.startDate, (d) => format(d, "MMM d, yyyy"))}</span>}
          {plan.nextAssessmentDate && <span>Next reassessment: {formatDateOnly(plan.nextAssessmentDate, (d) => format(d, "MMM d, yyyy"))}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium flex items-center gap-2"><Target className="w-4 h-4" />Goals</h4>
            <Button size="sm" variant="outline" onClick={openCreateGoal} data-testid={`button-add-goal-${plan.id}`}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add Goal
            </Button>
          </div>
          {goals.length === 0 ? (
            <p className="text-xs text-muted-foreground">No goals yet</p>
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => (
                <div key={goal.id} className="border rounded-md p-2 flex items-start justify-between gap-2" data-testid={`row-goal-${goal.id}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{goal.priority}</Badge>
                      <Badge variant={goal.status === "achieved" ? "default" : "secondary"} className="text-xs capitalize">{goal.status}</Badge>
                      {goal.targetDate && <span className="text-xs text-muted-foreground">Target: {formatDateOnly(goal.targetDate, (d) => format(d, "MMM d, yyyy"))}</span>}
                    </div>
                    <p className="text-sm">{goal.goalText}</p>
                    {goal.progressNotes && <p className="text-xs text-muted-foreground">{goal.progressNotes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditGoal(goal)} data-testid={`button-edit-goal-${goal.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteGoalMutation.mutate(goal.id)} data-testid={`button-delete-goal-${goal.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium flex items-center gap-2"><ListChecks className="w-4 h-4" />Interventions</h4>
            <Button size="sm" variant="outline" onClick={openCreateIntervention} data-testid={`button-add-intervention-${plan.id}`}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add Intervention
            </Button>
          </div>
          {interventions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No interventions yet</p>
          ) : (
            <div className="space-y-2">
              {interventions.map((intervention) => (
                <div key={intervention.id} className="border rounded-md p-2 flex items-start justify-between gap-2" data-testid={`row-intervention-${intervention.id}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{intervention.frequency?.replace(/_/g, " ")}</Badge>
                      <Badge variant={intervention.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{intervention.status}</Badge>
                      {intervention.assignedToType && <span className="text-xs text-muted-foreground capitalize">{intervention.assignedToType}</span>}
                    </div>
                    <p className="text-sm">{intervention.interventionText}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditIntervention(intervention)} data-testid={`button-edit-intervention-${intervention.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteInterventionMutation.mutate(intervention.id)} data-testid={`button-delete-intervention-${intervention.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={goalOpen} onOpenChange={(o) => { setGoalOpen(o); if (!o) setEditingGoal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingGoal ? "Edit Goal" : "Add Goal"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Goal *</Label>
              <Textarea rows={2} value={goalForm.goalText} onChange={(e) => setGoalForm((f) => ({ ...f, goalText: e.target.value }))} data-testid="textarea-goal-text" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={goalForm.priority} onValueChange={(v) => setGoalForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger data-testid="select-goal-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))} data-testid="input-goal-target-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={goalForm.status} onValueChange={(v) => setGoalForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-goal-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="achieved">Achieved</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Progress Notes</Label>
              <Textarea rows={2} value={goalForm.progressNotes} onChange={(e) => setGoalForm((f) => ({ ...f, progressNotes: e.target.value }))} data-testid="textarea-goal-progress" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveGoalMutation.mutate()} disabled={saveGoalMutation.isPending || !goalForm.goalText.trim()} data-testid="button-save-goal">
              {saveGoalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingGoal ? "Save Changes" : "Add Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={interventionOpen} onOpenChange={(o) => { setInterventionOpen(o); if (!o) setEditingIntervention(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingIntervention ? "Edit Intervention" : "Add Intervention"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Intervention *</Label>
              <Textarea rows={2} value={interventionForm.interventionText} onChange={(e) => setInterventionForm((f) => ({ ...f, interventionText: e.target.value }))} data-testid="textarea-intervention-text" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={interventionForm.frequency} onValueChange={(v) => setInterventionForm((f) => ({ ...f, frequency: v }))}>
                  <SelectTrigger data-testid="select-intervention-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="as_needed">As Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={interventionForm.assignedToType} onValueChange={(v) => setInterventionForm((f) => ({ ...f, assignedToType: v }))}>
                  <SelectTrigger data-testid="select-intervention-assigned"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caregiver">Caregiver</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="therapist">Therapist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={interventionForm.status} onValueChange={(v) => setInterventionForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-intervention-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterventionOpen(false)}>Cancel</Button>
            <Button onClick={() => saveInterventionMutation.mutate()} disabled={saveInterventionMutation.isPending || !interventionForm.interventionText.trim()} data-testid="button-save-intervention">
              {saveInterventionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingIntervention ? "Save Changes" : "Add Intervention"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
