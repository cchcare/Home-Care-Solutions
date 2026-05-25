import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, Edit, ListChecks } from "lucide-react";

type StepType =
  | "account_deactivation"
  | "equipment_return"
  | "final_paycheck"
  | "cobra_notice"
  | "exit_interview"
  | "document"
  | "checklist";

interface TemplateStep {
  id?: string;
  stepOrder: number;
  stepType: StepType;
  title: string;
  description?: string | null;
  refId?: string | null;
  isRequired: boolean;
}

interface Template {
  id?: string;
  name: string;
  description?: string | null;
  role: string;
  officeId?: string | null;
  isActive: boolean;
  steps?: TemplateStep[];
}

export default function OffboardingTemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Template | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/offboarding/templates"],
  });
  const { data: surveyTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/survey-templates", "exit_survey"],
    queryFn: async () => {
      const r = await fetch("/api/survey-templates");
      if (!r.ok) return [];
      const all = await r.json();
      return (all as any[]).filter((t) => t.surveyType === "exit_survey");
    },
  });
  const { data: offices = [] } = useQuery<any[]>({ queryKey: ["/api/offices"] });

  const saveMutation = useMutation({
    mutationFn: async (data: Template) => {
      const { id, ...payload } = data as any;
      delete payload.createdAt; delete payload.updatedAt; delete payload.createdBy; delete payload.organizationId;
      if (id) return apiRequest("PATCH", `/api/offboarding/templates/${id}`, payload);
      return apiRequest("POST", "/api/offboarding/templates", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/offboarding/templates"] });
      setIsOpen(false); setEditing(null);
      toast({ title: "Template saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/offboarding/templates/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/offboarding/templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const openNew = () => {
    setEditing({ name: "", description: "", role: "any", isActive: true, steps: [] });
    setIsOpen(true);
  };
  const openEdit = async (id: string) => {
    const full = await fetch(`/api/offboarding/templates/${id}`).then((r) => r.json());
    setEditing(full);
    setIsOpen(true);
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
                  <ListChecks className="w-6 h-6" /> Offboarding Templates
                </h1>
                <p className="text-muted-foreground">Build reusable exit checklists. The matching one auto-launches when a termination date is set.</p>
              </div>
              <Button onClick={openNew} data-testid="button-new-template">
                <Plus className="w-4 h-4 mr-1" /> New Template
              </Button>
            </div>

            {isLoading ? (
              <div className="animate-pulse h-32 bg-muted rounded" />
            ) : templates.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No templates yet.</CardContent></Card>
            ) : (
              <div className="grid gap-4">
                {templates.map((t) => (
                  <Card key={t.id} data-testid={`template-card-${t.id}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {t.name}
                          <Badge variant="outline">{t.role}</Badge>
                          {!t.isActive && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                        {t.description && <div className="text-sm text-muted-foreground mt-1">{t.description}</div>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(t.id!)} data-testid={`button-edit-${t.id}`}>
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(t.id!)} data-testid={`button-delete-${t.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Template" : "New Offboarding Template"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <TemplateEditor value={editing} onChange={setEditing} surveyTemplates={surveyTemplates} offices={offices} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editing && saveMutation.mutate(editing)}
              disabled={saveMutation.isPending || !editing?.name}
              data-testid="button-save-template"
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateEditor({
  value, onChange, surveyTemplates, offices,
}: {
  value: Template;
  onChange: (v: Template) => void;
  surveyTemplates: any[]; offices: any[];
}) {
  const steps = value.steps || [];
  const updateStep = (idx: number, patch: Partial<TemplateStep>) => {
    onChange({ ...value, steps: steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)) });
  };
  const addStep = () => {
    onChange({ ...value, steps: [...steps, { stepOrder: steps.length, stepType: "checklist", title: "", isRequired: true }] });
  };
  const removeStep = (idx: number) => {
    onChange({ ...value, steps: steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepOrder: i })) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} data-testid="input-template-name" />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={value.role} onValueChange={(v) => onChange({ ...value, role: v })}>
            <SelectTrigger data-testid="select-template-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="caregiver">Caregiver</SelectItem>
              <SelectItem value="office_staff">Office Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Office (optional)</Label>
          <Select value={value.officeId || "none"} onValueChange={(v) => onChange({ ...value, officeId: v === "none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="All offices" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All offices</SelectItem>
              {offices.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Active</Label>
          <Select value={value.isActive ? "yes" : "no"} onValueChange={(v) => onChange({ ...value, isActive: v === "yes" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Active</SelectItem>
              <SelectItem value="no">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={value.description || ""} onChange={(e) => onChange({ ...value, description: e.target.value })} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-base">Steps</Label>
          <Button size="sm" variant="outline" onClick={addStep} data-testid="button-add-step">
            <Plus className="w-4 h-4 mr-1" /> Add Step
          </Button>
        </div>
        <div className="space-y-2">
          {steps.length === 0 && <div className="text-sm text-muted-foreground">No steps yet.</div>}
          {steps.map((s, idx) => (
            <div key={idx} className="border rounded p-3 space-y-2" data-testid={`step-row-${idx}`}>
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">#{idx + 1}</span>
                <Select value={s.stepType} onValueChange={(v) => updateStep(idx, { stepType: v as StepType, refId: null })}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account_deactivation">Account Deactivation</SelectItem>
                    <SelectItem value="equipment_return">Equipment Return</SelectItem>
                    <SelectItem value="final_paycheck">Final Paycheck</SelectItem>
                    <SelectItem value="cobra_notice">COBRA Notice</SelectItem>
                    <SelectItem value="exit_interview">Exit Interview Survey</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="checklist">Checklist Item</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  placeholder="Step title"
                  value={s.title}
                  onChange={(e) => updateStep(idx, { title: e.target.value })}
                  data-testid={`input-step-title-${idx}`}
                />
                <Select value={s.isRequired ? "yes" : "no"} onValueChange={(v) => updateStep(idx, { isRequired: v === "yes" })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Required</SelectItem>
                    <SelectItem value="no">Optional</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => removeStep(idx)} data-testid={`button-remove-step-${idx}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {s.stepType === "exit_interview" && (
                <div>
                  <Label className="text-xs">Exit Interview Survey Template</Label>
                  <Select value={s.refId || ""} onValueChange={(v) => updateStep(idx, { refId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select exit survey template..." /></SelectTrigger>
                    <SelectContent>
                      {surveyTemplates.length === 0 && <SelectItem value="__none" disabled>No exit_survey templates exist</SelectItem>}
                      {surveyTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">A tokenized link is emailed to the employee when offboarding launches. Responses stay HR-only.</p>
                </div>
              )}
              <Textarea
                placeholder="Description (optional)"
                value={s.description || ""}
                onChange={(e) => updateStep(idx, { description: e.target.value })}
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
