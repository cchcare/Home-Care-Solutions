import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function MyOffboardingPage() {
  const { toast } = useToast();
  const { data: rows = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/my-offboarding"] });

  const completeStep = useMutation({
    mutationFn: async (stepId: string) => apiRequest("POST", `/api/offboarding/instance-steps/${stepId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-offboarding"] });
      toast({ title: "Marked done" });
    },
    onError: (e: any) => toast({ title: "Could not complete", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="w-6 h-6" /> My Offboarding
              </h1>
              <p className="text-muted-foreground">Your exit checklist and the items still needing your attention.</p>
            </div>

            {isLoading ? (
              <div className="animate-pulse h-40 bg-muted rounded" />
            ) : rows.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No offboarding in progress.</CardContent></Card>
            ) : (
              rows.map((r) => {
                const total = r.steps.length;
                const done = r.steps.filter((s: any) => s.status === "completed" || s.status === "skipped").length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <Card key={r.id} data-testid={`instance-${r.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{r.template?.name || "Offboarding"}</CardTitle>
                        <Badge>{r.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Progress value={pct} className="flex-1" />
                        <span className="text-sm">{done}/{total}</span>
                      </div>
                      {r.terminationDate && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Termination date: {format(new Date(r.terminationDate), "PP")}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {r.steps.map((s: any) => (
                          <div key={s.id} className="border rounded p-3 flex items-center justify-between" data-testid={`my-step-${s.id}`}>
                            <div>
                              <div className="flex items-center gap-2">
                                {s.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}
                                <span className="font-medium">{s.title}</span>
                                <Badge variant="outline">{s.stepType.replace(/_/g, " ")}</Badge>
                                {!s.isRequired && <Badge variant="secondary">Optional</Badge>}
                              </div>
                              {s.description && <div className="text-xs text-muted-foreground mt-1">{s.description}</div>}
                            </div>
                            <div>
                              {s.status !== "completed" && s.action?.kind === "exit_interview" && (
                                <a href={s.action.href} target="_blank" rel="noreferrer">
                                  <Button size="sm" variant="outline" data-testid={`button-open-exit-interview-${s.id}`}>
                                    <ExternalLink className="w-4 h-4 mr-1" /> {s.action.label}
                                  </Button>
                                </a>
                              )}
                              {s.status !== "completed" && s.action?.kind === "checklist" && (
                                <Button size="sm" variant="outline" onClick={() => completeStep.mutate(s.id)} data-testid={`button-mark-done-${s.id}`}>
                                  Mark done
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
