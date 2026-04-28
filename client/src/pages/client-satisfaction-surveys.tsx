import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOfficeScope } from "@/context/office-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Star, Plus, AlertTriangle, CheckCircle2, Send, Pencil, Trash2, BarChart2 } from "lucide-react";
import type { ClientSatisfactionSurvey } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
});

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  closed: { label: "Closed", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
};

export default function ClientSatisfactionSurveys() {
  const { selectedOfficeId, isAllOffices, canMutate } = useOfficeScope();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientSatisfactionSurvey | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: surveys = [], isLoading } = useQuery<ClientSatisfactionSurvey[]>({
    queryKey: ["/api/client-surveys", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/client-surveys?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const { data: surveyDetail } = useQuery<any>({
    queryKey: ["/api/client-surveys", selectedSurvey?.id, "detail"],
    queryFn: async () => {
      const r = await fetch(`/api/client-surveys/${selectedSurvey!.id}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!selectedSurvey,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      const payload = { ...data, officeId: selectedOfficeId };
      if (editing) return apiRequest("PATCH", `/api/client-surveys/${editing.id}`, payload);
      return apiRequest("POST", "/api/client-surveys", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-surveys", selectedOfficeId] });
      toast({ title: editing ? "Survey updated" : "Survey created" });
      setOpen(false); setEditing(null); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/client-surveys/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-surveys", selectedOfficeId] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/client-surveys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-surveys", selectedOfficeId] });
      toast({ title: "Survey deleted" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const avgRating = surveyDetail?.responses?.length
    ? (surveyDetail.responses.reduce((s: number, r: any) => s + (r.overallRating || 0), 0) / surveyDetail.responses.length).toFixed(1)
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Client Satisfaction Surveys
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Measure and track client satisfaction with care services</p>
        </div>
        {canMutate && !isAllOffices && (
          <Button onClick={() => { setEditing(null); form.reset(); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Survey
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Active Surveys", value: surveys.filter(s => s.status === "active").length, icon: Send, color: "text-green-600 dark:text-green-400" },
          { label: "Draft Surveys", value: surveys.filter(s => s.status === "draft").length, icon: Pencil, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Closed Surveys", value: surveys.filter(s => s.status === "closed").length, icon: CheckCircle2, color: "text-blue-600 dark:text-blue-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAllOffices && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4 flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Select a specific office to manage surveys.</span>
          </CardContent>
        </Card>
      )}

      {!isAllOffices && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : surveys.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Star className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No surveys created yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {surveys.map(survey => (
                  <Card
                    key={survey.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedSurvey?.id === survey.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedSurvey(selectedSurvey?.id === survey.id ? null : survey)}
                  >
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{survey.title}</p>
                            <Badge className={`border-0 text-xs ${statusConfig[survey.status]?.className}`}>{statusConfig[survey.status]?.label}</Badge>
                          </div>
                          {survey.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{survey.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            Created {new Date(survey.createdAt!).toLocaleDateString()}
                            {survey.sentAt ? ` · Sent ${new Date(survey.sentAt).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {survey.status === "draft" && (
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => updateStatusMutation.mutate({ id: survey.id, status: "active" })}>
                              <Send className="h-3 w-3 mr-1" />Send
                            </Button>
                          )}
                          {survey.status === "active" && (
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => updateStatusMutation.mutate({ id: survey.id, status: "closed" })}>
                              Close
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(survey); form.reset({ title: survey.title, description: survey.description || "" }); setOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(survey.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Responses Panel */}
          <div>
            {selectedSurvey && surveyDetail ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Responses — {selectedSurvey.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold">{surveyDetail.responses?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">Responses</p>
                      </div>
                      {avgRating && (
                        <div className="text-center">
                          <div className="flex items-center gap-1">
                            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                            <p className="text-3xl font-bold">{avgRating}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Avg Rating</p>
                        </div>
                      )}
                    </div>
                    {!surveyDetail.responses?.length ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No responses yet</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {surveyDetail.responses.map((r: any) => (
                          <div key={r.id} className="border rounded-lg p-2">
                            <div className="flex items-center gap-1 mb-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-3.5 w-3.5 ${i < (r.overallRating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                              ))}
                              <span className="text-xs text-muted-foreground ml-1">{new Date(r.submittedAt).toLocaleDateString()}</span>
                            </div>
                            {r.comments && <p className="text-xs">{r.comments}</p>}
                            {r.wouldRecommend !== null && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Would recommend: {r.wouldRecommend ? "Yes" : "No"}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Select a survey to view responses</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); form.reset(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Survey" : "Create Survey"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => createMutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Survey Title *</FormLabel>
                  <FormControl><Input placeholder="Q2 2026 Client Satisfaction Survey" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Brief description of survey purpose..." rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Survey"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Survey?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">All responses will also be permanently deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
