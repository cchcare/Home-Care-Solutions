import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, ClipboardList, PenTool, FileText, GraduationCap, ShieldCheck, ListChecks, ExternalLink } from "lucide-react";
import { Link } from "wouter";

const stepIcons: Record<string, any> = {
  signature: PenTool,
  document: FileText,
  policy: ShieldCheck,
  training: GraduationCap,
  checklist: ListChecks,
};

export default function MyOnboardingPage() {
  const { toast } = useToast();
  const { data: instances = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/my-onboarding"] });

  const completeStep = useMutation({
    mutationFn: async (stepId: string) => apiRequest("POST", `/api/onboarding/instance-steps/${stepId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-onboarding"] });
      toast({ title: "Step marked complete" });
    },
    onError: (e: any) => toast({ title: "Could not mark complete", description: e?.message, variant: "destructive" }),
  });

  const acknowledgePolicy = useMutation({
    mutationFn: async (policyId: string) => apiRequest("POST", `/api/policy-documents/${policyId}/acknowledge`, { method: "digital" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-onboarding"] });
      toast({ title: "Policy acknowledged" });
    },
    onError: (e: any) => toast({ title: "Could not acknowledge", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="w-6 h-6" /> My Onboarding
              </h1>
              <p className="text-muted-foreground">Click each task to complete it. Your progress is saved automatically.</p>
            </div>

            {isLoading ? (
              <div className="animate-pulse h-32 bg-muted rounded" />
            ) : instances.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No onboarding assigned.</CardContent></Card>
            ) : (
              instances.map((inst: any) => {
                const total = inst.steps.length;
                const done = inst.steps.filter((s: any) => s.status === "completed" || s.status === "skipped").length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <Card key={inst.id} data-testid={`my-instance-${inst.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{inst.template?.name || "Onboarding"}</CardTitle>
                        <Badge variant={inst.status === "completed" ? "default" : "outline"}>{inst.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Progress value={pct} className="flex-1" />
                        <span className="text-sm">{done}/{total}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {inst.steps.map((s: any) => {
                        const Icon = stepIcons[s.stepType] || ListChecks;
                        const action = s.action;
                        return (
                          <div key={s.id} className="border rounded p-3" data-testid={`my-step-${s.id}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2 flex-1">
                                {s.status === "completed"
                                  ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                                  : <Clock className="w-5 h-5 text-yellow-500 mt-0.5" />}
                                <div className="flex-1">
                                  <div className="font-medium flex items-center gap-2">
                                    <Icon className="w-4 h-4" /> {s.title}
                                    {!s.isRequired && <Badge variant="secondary" className="ml-1">Optional</Badge>}
                                  </div>
                                  {s.description && <div className="text-sm text-muted-foreground mt-1">{s.description}</div>}
                                  {s.stepType === "policy" && action?.policyTitle && (
                                    <div className="text-xs text-muted-foreground mt-1">Policy: {action.policyTitle}</div>
                                  )}
                                  <div className="text-xs text-muted-foreground mt-1">Type: {s.stepType}</div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 items-end">
                                {s.status === "completed" ? (
                                  <Badge variant="default">Completed</Badge>
                                ) : (
                                  <>
                                    {action?.kind === "signature" && action.href && (
                                      <Link href={action.href}>
                                        <Button size="sm" data-testid={`button-open-sign-${s.id}`}>
                                          <ExternalLink className="w-4 h-4 mr-1" /> {action.label}
                                        </Button>
                                      </Link>
                                    )}
                                    {action?.kind === "policy" && action.policyId && (
                                      <Button
                                        size="sm"
                                        onClick={() => acknowledgePolicy.mutate(action.policyId)}
                                        disabled={acknowledgePolicy.isPending}
                                        data-testid={`button-ack-${s.id}`}
                                      >
                                        {action.label}
                                      </Button>
                                    )}
                                    {action?.kind === "document" && (
                                      <Link href={action.href}>
                                        <Button size="sm" variant="outline" data-testid={`button-open-docs-${s.id}`}>
                                          <ExternalLink className="w-4 h-4 mr-1" /> {action.label}
                                        </Button>
                                      </Link>
                                    )}
                                    {action?.kind === "training" && (
                                      <Link href={action.href}>
                                        <Button size="sm" variant="outline" data-testid={`button-open-training-${s.id}`}>
                                          <ExternalLink className="w-4 h-4 mr-1" /> {action.label}
                                        </Button>
                                      </Link>
                                    )}
                                    {s.stepType === "checklist" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => completeStep.mutate(s.id)}
                                        disabled={completeStep.isPending}
                                        data-testid={`button-mark-done-${s.id}`}
                                      >
                                        Mark Done
                                      </Button>
                                    )}
                                    {(s.stepType === "document" || s.stepType === "training") && (
                                      <div className="text-xs text-muted-foreground text-right max-w-[200px]">
                                        Completion is verified by your administrator after submission.
                                      </div>
                                    )}
                                    {s.stepType === "signature" && !action?.href && (
                                      <div className="text-xs text-muted-foreground text-right max-w-[200px]">
                                        Check your email for the signing link.
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
