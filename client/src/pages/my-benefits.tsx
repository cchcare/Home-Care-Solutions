import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, Plus, Trash2, CheckCircle, AlertCircle, FileText, ChevronLeft, ChevronRight } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  employee: "Employee Only",
  employee_spouse: "Employee + Spouse",
  employee_children: "Employee + Children",
  employee_family: "Employee + Family",
  waived: "Waive coverage",
};

const RELATIONSHIPS = ["spouse", "domestic_partner", "child", "stepchild", "other"] as const;

type Dep = { firstName: string; lastName: string; relationship: string; dateOfBirth?: string; ssnLast4?: string; gender?: string };
type Election = { planId: string; tier: string; dependents: Dep[]; notes?: string };

export default function MyBenefitsPage() {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/my-benefits"] });
  const [step, setStep] = useState(0);
  const [elections, setElections] = useState<Record<string, Election>>({}); // keyed by benefitType
  const [signedName, setSignedName] = useState("");
  const [accepted, setAccepted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/my-benefits/submit", payload),
    onSuccess: () => {
      toast({ title: "Elections submitted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/my-benefits"] });
      setStep(0);
      setElections({});
      setSignedName("");
      setAccepted(false);
      refetch();
    },
    onError: (e: any) => toast({ title: e?.message || "Failed to submit", variant: "destructive" }),
  });

  const activeWindow = data?.activeWindow;
  const plansByType = useMemo<Record<string, any[]>>(() => {
    const map: Record<string, any[]> = {};
    for (const p of data?.plans || []) {
      (map[p.benefitType] ||= []).push(p);
    }
    return map;
  }, [data?.plans]);

  const benefitTypes = useMemo(() => Object.keys(plansByType), [plansByType]);
  // Steps: one per benefit type, plus a final review/signature step
  const totalSteps = benefitTypes.length + 1;
  const currentType = benefitTypes[step];
  const isReviewStep = step >= benefitTypes.length;

  const setElection = (type: string, patch: Partial<Election>) => {
    setElections(prev => ({
      ...prev,
      [type]: { ...(prev[type] || { planId: "", tier: "waived", dependents: [] }), ...patch },
    }));
  };

  const addDependent = (type: string) => {
    setElections(prev => {
      const el = prev[type] || { planId: "", tier: "waived", dependents: [] };
      return { ...prev, [type]: { ...el, dependents: [...el.dependents, { firstName: "", lastName: "", relationship: "spouse" }] } };
    });
  };
  const removeDependent = (type: string, idx: number) => {
    setElections(prev => {
      const el = prev[type];
      if (!el) return prev;
      const dependents = el.dependents.filter((_, i) => i !== idx);
      return { ...prev, [type]: { ...el, dependents } };
    });
  };
  const updateDependent = (type: string, idx: number, patch: Partial<Dep>) => {
    setElections(prev => {
      const el = prev[type];
      if (!el) return prev;
      const dependents = el.dependents.map((d, i) => i === idx ? { ...d, ...patch } : d);
      return { ...prev, [type]: { ...el, dependents } };
    });
  };

  const requiresDependents = (tier: string) => tier === "employee_spouse" || tier === "employee_children" || tier === "employee_family";

  const submit = () => {
    if (!signedName.trim()) return toast({ title: "Type your full name to sign", variant: "destructive" });
    if (!accepted) return toast({ title: "Please acknowledge the terms", variant: "destructive" });
    const items = benefitTypes
      .map(t => ({ benefitType: t, election: elections[t] }))
      .filter(x => !!x.election);
    if (items.length === 0) return toast({ title: "Make at least one election", variant: "destructive" });
    for (const x of items) {
      if (x.election.tier !== "waived" && !x.election.planId) {
        return toast({ title: `Pick a plan for ${x.benefitType.replace(/_/g, " ")} or waive it`, variant: "destructive" });
      }
      if (requiresDependents(x.election.tier) && x.election.dependents.length === 0) {
        return toast({ title: `Add at least one dependent for your ${x.benefitType.replace(/_/g, " ")} tier`, variant: "destructive" });
      }
    }
    const payload = {
      windowId: activeWindow.id,
      signedName: signedName.trim(),
      elections: items.map(x => ({
        benefitType: x.benefitType,
        planId: x.election.tier === "waived" ? null : x.election.planId,
        tier: x.election.tier,
        dependents: requiresDependents(x.election.tier) ? x.election.dependents : [],
        notes: x.election.notes,
      })),
    };
    submitMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen"><Sidebar /><div className="flex-1 flex flex-col"><TopBar /><main className="flex-1 p-6"><div className="max-w-3xl space-y-4"><div className="h-8 bg-muted rounded w-48 animate-pulse" /><div className="h-40 bg-muted rounded-lg animate-pulse" /><div className="h-40 bg-muted rounded-lg animate-pulse" /></div></main></div></div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <HeartPulse className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold">My Benefits</h1>
                <p className="text-muted-foreground">Review your elections and enroll during open windows.</p>
              </div>
            </div>

            {/* Current elections (read-only) */}
            <Card data-testid="card-current-elections">
              <CardHeader>
                <CardTitle>Current Elections</CardTitle>
                <CardDescription>Your latest benefits on file.</CardDescription>
              </CardHeader>
              <CardContent>
                {(data?.enrollments || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">You have no benefit elections yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.enrollments.map((e: any) => (
                      <div key={e.id} className="border rounded p-3 flex items-start justify-between" data-testid={`row-current-${e.id}`}>
                        <div>
                          <div className="font-medium">{e.plan?.planName || (e.tier === "waived" ? "Waived" : "—")} <Badge variant="outline" className="ml-2">{(e.benefitType || e.plan?.benefitType || "").replace(/_/g, " ")}</Badge></div>
                          <div className="text-sm text-muted-foreground">{e.plan?.carrier ? `${e.plan.carrier} • ` : ""}{TIER_LABELS[e.tier] || e.tier}</div>
                          {e.coverageEffectiveDate && <div className="text-xs text-muted-foreground mt-1">Effective {e.coverageEffectiveDate}</div>}
                          {e.dependents?.length > 0 && (
                            <div className="text-xs mt-1">Dependents: {e.dependents.map((d: any) => `${d.firstName} ${d.lastName}`).join(", ")}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant={e.status === "submitted" ? "default" : "secondary"}>{e.status}</Badge>
                          {e.documentId && (
                            <div className="mt-2"><a className="text-blue-600 text-xs inline-flex items-center gap-1" href={`/api/documents/${e.documentId}/view`} target="_blank" rel="noopener noreferrer"><FileText className="h-3 w-3" /> Signed form</a></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active wizard */}
            {!activeWindow ? (
              <Card data-testid="card-no-window">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />
                  No enrollment window is currently open for you. Contact HR if you've had a qualifying life event (marriage, birth, etc.).
                </CardContent>
              </Card>
            ) : benefitTypes.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No active benefit plans are available right now.</CardContent></Card>
            ) : (
              <Card data-testid="card-enrollment-wizard">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{activeWindow.name}</CardTitle>
                      <CardDescription>Window open through {String(activeWindow.endsAt)}. Step {Math.min(step + 1, totalSteps)} of {totalSteps}.</CardDescription>
                    </div>
                    <Badge>{activeWindow.windowType.replace(/_/g, " ")}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isReviewStep && currentType && (
                    <div className="space-y-4" data-testid={`step-${currentType}`}>
                      <h3 className="text-xl font-semibold capitalize">{currentType.replace(/_/g, " ")} coverage</h3>
                      <RadioGroup
                        value={elections[currentType]?.tier === "waived" ? "__waive__" : (elections[currentType]?.planId || "")}
                        onValueChange={(v) => {
                          if (v === "__waive__") setElection(currentType, { planId: "", tier: "waived", dependents: [] });
                          else setElection(currentType, { planId: v, tier: elections[currentType]?.tier && elections[currentType]?.tier !== "waived" ? elections[currentType].tier : "employee" });
                        }}
                      >
                        {(plansByType[currentType] || []).map((p: any) => (
                          <div key={p.id} className="border rounded p-3 flex items-start gap-3" data-testid={`option-plan-${p.id}`}>
                            <RadioGroupItem value={p.id} id={`opt-${p.id}`} className="mt-1" />
                            <Label htmlFor={`opt-${p.id}`} className="flex-1 cursor-pointer">
                              <div className="font-medium">{p.planName}</div>
                              <div className="text-sm text-muted-foreground">{p.carrier}</div>
                              {p.description && <div className="text-xs text-muted-foreground mt-1">{p.description}</div>}
                              {p.rates?.length > 0 && (
                                <div className="text-xs mt-2 grid grid-cols-2 gap-1">
                                  {p.rates.map((r: any) => (
                                    <div key={r.id}>{TIER_LABELS[r.tier]}: ${Number(r.employeeCostPerPayPeriod).toFixed(2)}/pp</div>
                                  ))}
                                </div>
                              )}
                            </Label>
                          </div>
                        ))}
                        <div className="border rounded p-3 flex items-center gap-3">
                          <RadioGroupItem value="__waive__" id={`waive-${currentType}`} />
                          <Label htmlFor={`waive-${currentType}`} className="cursor-pointer">Waive {currentType.replace(/_/g, " ")} coverage</Label>
                        </div>
                      </RadioGroup>

                      {elections[currentType]?.planId && elections[currentType]?.tier !== "waived" && (
                        <div className="space-y-3 border-t pt-4">
                          <div>
                            <Label>Coverage Tier</Label>
                            <Select value={elections[currentType].tier} onValueChange={(v) => setElection(currentType, { tier: v })}>
                              <SelectTrigger data-testid={`select-tier-${currentType}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(TIER_LABELS).filter(([k]) => k !== "waived").map(([k, l]) => (
                                  <SelectItem key={k} value={k}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {requiresDependents(elections[currentType].tier) && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Dependents</Label>
                                <Button size="sm" variant="outline" onClick={() => addDependent(currentType)} data-testid={`button-add-dep-${currentType}`}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                              </div>
                              {elections[currentType].dependents.length === 0 && (
                                <p className="text-xs text-muted-foreground">Add at least one dependent for this tier.</p>
                              )}
                              {elections[currentType].dependents.map((d, i) => (
                                <div key={i} className="border rounded p-3 grid grid-cols-2 gap-2" data-testid={`dep-${currentType}-${i}`}>
                                  <Input placeholder="First name" value={d.firstName} onChange={e => updateDependent(currentType, i, { firstName: e.target.value })} />
                                  <Input placeholder="Last name" value={d.lastName} onChange={e => updateDependent(currentType, i, { lastName: e.target.value })} />
                                  <Select value={d.relationship} onValueChange={v => updateDependent(currentType, i, { relationship: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Input type="date" placeholder="Date of birth" value={d.dateOfBirth || ""} onChange={e => updateDependent(currentType, i, { dateOfBirth: e.target.value })} />
                                  <Input placeholder="SSN last 4" maxLength={4} value={d.ssnLast4 || ""} onChange={e => updateDependent(currentType, i, { ssnLast4: e.target.value })} />
                                  <div className="flex gap-2">
                                    <Select value={d.gender || "__none__"} onValueChange={v => updateDependent(currentType, i, { gender: v === "__none__" ? "" : v })}>
                                      <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">—</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button size="icon" variant="ghost" onClick={() => removeDependent(currentType, i)}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {isReviewStep && (
                    <div className="space-y-4" data-testid="step-review">
                      <h3 className="text-xl font-semibold">Review & Sign</h3>
                      <div className="space-y-2">
                        {benefitTypes.map(t => {
                          const el = elections[t];
                          const plan = (plansByType[t] || []).find((p: any) => p.id === el?.planId);
                          return (
                            <div key={t} className="border rounded p-3" data-testid={`review-${t}`}>
                              <div className="flex items-center justify-between">
                                <div className="font-medium capitalize">{t.replace(/_/g, " ")}</div>
                                <Badge variant={el?.tier === "waived" || !el ? "secondary" : "default"}>{el ? TIER_LABELS[el.tier] : "Not chosen"}</Badge>
                              </div>
                              {plan && el?.tier !== "waived" && (
                                <div className="text-sm text-muted-foreground mt-1">{plan.carrier} — {plan.planName}</div>
                              )}
                              {el && requiresDependents(el.tier) && el.dependents.length > 0 && (
                                <div className="text-xs mt-1">Dependents: {el.dependents.map(d => `${d.firstName} ${d.lastName}`).join(", ")}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t pt-4 space-y-3">
                        <div>
                          <Label>Type your full name to sign electronically *</Label>
                          <Input value={signedName} onChange={e => setSignedName(e.target.value)} placeholder="Full legal name" data-testid="input-signed-name" />
                        </div>
                        <div className="flex items-start gap-2">
                          <Checkbox id="accept-terms" checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} data-testid="checkbox-accept" />
                          <Label htmlFor="accept-terms" className="text-sm cursor-pointer">
                            I confirm these elections are accurate and understand they remain in effect through the plan year unless I experience a qualifying life event.
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t">
                    <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} data-testid="button-prev">
                      <ChevronLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    {isReviewStep ? (
                      <Button onClick={submit} disabled={submitMutation.isPending} data-testid="button-submit-enrollment">
                        <CheckCircle className="h-4 w-4 mr-1" /> Submit Elections
                      </Button>
                    ) : (
                      <Button onClick={() => setStep(s => Math.min(totalSteps - 1, s + 1))} data-testid="button-next">
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
