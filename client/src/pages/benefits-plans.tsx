import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, DollarSign, HeartPulse } from "lucide-react";
import type { BenefitPlan, BenefitPlanRate, Office } from "@shared/schema";

const BENEFIT_TYPES = ["health", "dental", "vision", "life", "disability", "retirement_401k", "fsa", "hsa", "other"] as const;
const TIERS = ["employee", "employee_spouse", "employee_children", "employee_family", "waived"] as const;
const TIER_LABELS: Record<string, string> = {
  employee: "Employee Only",
  employee_spouse: "Employee + Spouse",
  employee_children: "Employee + Children",
  employee_family: "Employee + Family",
  waived: "Waived",
};

function RatesEditor({ plan }: { plan: BenefitPlan }) {
  const { toast } = useToast();
  const { data: rates = [], isLoading } = useQuery<BenefitPlanRate[]>({
    queryKey: ["/api/benefit-plans", plan.id, "rates"],
    queryFn: () => fetch(`/api/benefit-plans/${plan.id}/rates`).then(r => r.json()),
  });
  const [draft, setDraft] = useState<Record<string, { ee: string; er: string; pp: string }>>({});

  const upsertMutation = useMutation({
    mutationFn: ({ tier, ee, er, pp }: any) =>
      apiRequest("PUT", `/api/benefit-plans/${plan.id}/rates/${tier}`, {
        employeeCostPerPayPeriod: ee, employerCostPerPayPeriod: er, payPeriodsPerYear: Number(pp),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefit-plans", plan.id, "rates"] });
      toast({ title: "Rate saved" });
    },
    onError: () => toast({ title: "Failed to save rate", variant: "destructive" }),
  });

  const getValue = (tier: string, field: "ee" | "er" | "pp", fallback: string) => {
    if (draft[tier]?.[field] !== undefined) return draft[tier][field];
    const existing = rates.find(r => r.tier === tier);
    if (!existing) return fallback;
    if (field === "ee") return String(existing.employeeCostPerPayPeriod);
    if (field === "er") return String(existing.employerCostPerPayPeriod ?? "0");
    return String(existing.payPeriodsPerYear ?? 26);
  };
  const setValue = (tier: string, field: "ee" | "er" | "pp", value: string) =>
    setDraft(d => ({ ...d, [tier]: { ...(d[tier] || { ee: "", er: "", pp: "" }), [field]: value } }));

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading rates…</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Per pay period premium amounts. Defaults to 26 pay periods per year.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Coverage Tier</TableHead>
            <TableHead>Employee $</TableHead>
            <TableHead>Employer $</TableHead>
            <TableHead>Pay Periods/Year</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TIERS.filter(t => t !== "waived").map(tier => (
            <TableRow key={tier} data-testid={`row-rate-${tier}`}>
              <TableCell>{TIER_LABELS[tier]}</TableCell>
              <TableCell><Input type="number" step="0.01" value={getValue(tier, "ee", "0")} onChange={e => setValue(tier, "ee", e.target.value)} className="w-24" data-testid={`input-rate-ee-${tier}`} /></TableCell>
              <TableCell><Input type="number" step="0.01" value={getValue(tier, "er", "0")} onChange={e => setValue(tier, "er", e.target.value)} className="w-24" data-testid={`input-rate-er-${tier}`} /></TableCell>
              <TableCell><Input type="number" value={getValue(tier, "pp", "26")} onChange={e => setValue(tier, "pp", e.target.value)} className="w-20" /></TableCell>
              <TableCell>
                <Button size="sm" onClick={() => upsertMutation.mutate({
                  tier,
                  ee: getValue(tier, "ee", "0"),
                  er: getValue(tier, "er", "0"),
                  pp: getValue(tier, "pp", "26"),
                })} data-testid={`button-save-rate-${tier}`}>Save</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function BenefitsPlansPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<BenefitPlan | null>(null);
  const [ratesPlan, setRatesPlan] = useState<BenefitPlan | null>(null);
  const [form, setForm] = useState({
    carrier: "", planName: "", benefitType: "health", planYear: new Date().getFullYear(),
    effectiveFrom: "", effectiveTo: "", description: "", officeId: "", isActive: true,
  });

  const { data: plans = [] } = useQuery<BenefitPlan[]>({ queryKey: ["/api/benefit-plans"] });
  const { data: offices = [] } = useQuery<Office[]>({ queryKey: ["/api/offices"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/benefit-plans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefit-plans"] });
      setIsOpen(false);
      toast({ title: "Plan created" });
    },
    onError: (e: any) => toast({ title: e?.message || "Failed to create plan", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/benefit-plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefit-plans"] });
      setIsOpen(false); setEditing(null);
      toast({ title: "Plan updated" });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/benefit-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefit-plans"] });
      toast({ title: "Plan deleted" });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ carrier: "", planName: "", benefitType: "health", planYear: new Date().getFullYear(), effectiveFrom: "", effectiveTo: "", description: "", officeId: "", isActive: true });
    setIsOpen(true);
  };
  const openEdit = (p: BenefitPlan) => {
    setEditing(p);
    setForm({
      carrier: p.carrier, planName: p.planName, benefitType: p.benefitType,
      planYear: p.planYear || new Date().getFullYear(),
      effectiveFrom: p.effectiveFrom as any, effectiveTo: (p.effectiveTo as any) || "",
      description: p.description || "", officeId: p.officeId || "", isActive: p.isActive ?? true,
    });
    setIsOpen(true);
  };

  const submit = () => {
    if (!form.carrier || !form.planName || !form.effectiveFrom) {
      toast({ title: "Carrier, plan name, and effective from are required", variant: "destructive" });
      return;
    }
    const payload: any = { ...form, planYear: Number(form.planYear) };
    if (!payload.officeId) payload.officeId = null;
    if (!payload.effectiveTo) payload.effectiveTo = null;
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="container mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HeartPulse className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold">Benefit Plans</h1>
                <p className="text-muted-foreground">Define carriers, benefit types, and per-tier rates.</p>
              </div>
            </div>
            <Button onClick={openCreate} data-testid="button-add-plan"><Plus className="h-4 w-4 mr-2" />Add Plan</Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Plan Year</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map(p => (
                    <TableRow key={p.id} data-testid={`row-plan-${p.id}`}>
                      <TableCell><Badge variant="outline">{(p.benefitType || "").replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>{p.carrier}</TableCell>
                      <TableCell className="font-medium">{p.planName}</TableCell>
                      <TableCell>{p.planYear || "—"}</TableCell>
                      <TableCell>{String(p.effectiveFrom)} → {p.effectiveTo ? String(p.effectiveTo) : "ongoing"}</TableCell>
                      <TableCell><Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setRatesPlan(p)} title="Rates" data-testid={`button-rates-${p.id}`}><DollarSign className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} data-testid={`button-edit-plan-${p.id}`}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete plan?")) deleteMutation.mutate(p.id); }} data-testid={`button-delete-plan-${p.id}`}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {plans.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No plans yet. Add one to get started.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Benefit Plan</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Benefit Type *</Label>
                  <Select value={form.benefitType} onValueChange={v => setForm(f => ({ ...f, benefitType: v }))}>
                    <SelectTrigger data-testid="select-benefit-type"><SelectValue /></SelectTrigger>
                    <SelectContent>{BENEFIT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Office (optional)</Label>
                  <Select value={form.officeId || "__all__"} onValueChange={v => setForm(f => ({ ...f, officeId: v === "__all__" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="All offices" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All offices</SelectItem>
                      {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Carrier *</Label><Input value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))} data-testid="input-carrier" /></div>
                <div><Label>Plan Name *</Label><Input value={form.planName} onChange={e => setForm(f => ({ ...f, planName: e.target.value }))} data-testid="input-plan-name" /></div>
                <div><Label>Plan Year</Label><Input type="number" value={form.planYear} onChange={e => setForm(f => ({ ...f, planYear: Number(e.target.value) }))} /></div>
                <div className="flex items-center gap-3 mt-6"><Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} /><Label>Active</Label></div>
                <div><Label>Effective From *</Label><Input type="date" value={form.effectiveFrom as any} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} data-testid="input-effective-from" /></div>
                <div><Label>Effective To</Label><Input type="date" value={form.effectiveTo as any} onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-plan">Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!ratesPlan} onOpenChange={(open) => !open && setRatesPlan(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Rates — {ratesPlan?.planName}</DialogTitle>
                <CardDescription>{ratesPlan?.carrier}</CardDescription>
              </DialogHeader>
              {ratesPlan && <RatesEditor plan={ratesPlan} />}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
