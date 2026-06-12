import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useOfficeScope } from "@/context/office-context";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity, Target, Route, Rocket, BarChart3, ArrowUpCircle, Plus,
  Pencil, Trash2, Circle, CheckCircle2, AlertCircle, Clock
} from "lucide-react";

const cycleSchema = z.object({
  cycleName: z.string().min(1, "Cycle name required"),
  objectives: z.string().optional(),
  objectivesStatus: z.enum(["not_started", "in_progress", "completed", "needs_improvement"]).default("not_started"),
  approach: z.string().optional(),
  approachStatus: z.enum(["not_started", "in_progress", "completed", "needs_improvement"]).default("not_started"),
  deployment: z.string().optional(),
  deploymentStatus: z.enum(["not_started", "in_progress", "completed", "needs_improvement"]).default("not_started"),
  results: z.string().optional(),
  resultsStatus: z.enum(["not_started", "in_progress", "completed", "needs_improvement"]).default("not_started"),
  improvement: z.string().optional(),
  improvementStatus: z.enum(["not_started", "in_progress", "completed", "needs_improvement"]).default("not_started"),
  overallStatus: z.enum(["not_started", "in_progress", "completed", "needs_improvement"]).default("not_started"),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

type CycleForm = z.infer<typeof cycleSchema>;

const phaseConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  not_started: { label: "Not Started", icon: Circle, color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
  needs_improvement: { label: "Needs Improvement", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
};

const phases = [
  { key: "objectives", label: "Objectives", icon: Target, desc: "Set measurable objectives aligned with goals" },
  { key: "approach", label: "Approach", icon: Route, desc: "Document strategies and processes" },
  { key: "deployment", label: "Deployment", icon: Rocket, desc: "Track implementation and rollout" },
  { key: "results", label: "Results", icon: BarChart3, desc: "Monitor with performance measures" },
  { key: "improvement", label: "Improvement", icon: ArrowUpCircle, desc: "Identify amendments and new objectives" },
];

export default function OadriCycle() {
  const { selectedOfficeId, canMutate } = useOfficeScope();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);

  const { data: cycles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/qmp-oadri-cycles", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/qmp-oadri-cycles?officeId=${selectedOfficeId}`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const form = useForm<CycleForm>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      cycleName: "",
      objectivesStatus: "not_started",
      approachStatus: "not_started",
      deploymentStatus: "not_started",
      resultsStatus: "not_started",
      improvementStatus: "not_started",
      overallStatus: "not_started",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CycleForm) => {
      const payload = { ...data, officeId: selectedOfficeId };
      if (editing) return apiRequest("PATCH", `/api/qmp-oadri-cycles/${editing.id}`, payload);
      return apiRequest("POST", "/api/qmp-oadri-cycles", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qmp-oadri-cycles", selectedOfficeId] });
      toast({ title: editing ? "Cycle updated" : "Cycle created" });
      setOpen(false); setEditing(null); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/qmp-oadri-cycles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qmp-oadri-cycles", selectedOfficeId] });
      toast({ title: "Cycle deleted" });
      setDeleteId(null);
      if (selectedCycle?.id === deleteId) setSelectedCycle(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      cycleName: "",
      objectivesStatus: "not_started",
      approachStatus: "not_started",
      deploymentStatus: "not_started",
      resultsStatus: "not_started",
      improvementStatus: "not_started",
      overallStatus: "not_started",
    });
    setOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    form.reset({
      cycleName: c.cycleName,
      objectives: c.objectives || "",
      objectivesStatus: c.objectivesStatus || "not_started",
      approach: c.approach || "",
      approachStatus: c.approachStatus || "not_started",
      deployment: c.deployment || "",
      deploymentStatus: c.deploymentStatus || "not_started",
      results: c.results || "",
      resultsStatus: c.resultsStatus || "not_started",
      improvement: c.improvement || "",
      improvementStatus: c.improvementStatus || "not_started",
      overallStatus: c.overallStatus || "not_started",
      startedAt: c.startedAt || "",
      completedAt: c.completedAt || "",
    });
    setOpen(true);
  };

  const cycle = selectedCycle || cycles[0];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-6 w-6 text-green-600" />
                  OADRI Cycle
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Objectives → Approach → Deployment → Results → Improvement
                </p>
              </div>
              {canMutate && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Cycle
                </Button>
              )}
            </div>

            {/* Cycle Selector */}
            {cycles.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {cycles.map((c: any) => (
                  <Button
                    key={c.id}
                    variant={selectedCycle?.id === c.id || (!selectedCycle && c.id === cycles[0]?.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCycle(c)}
                  >
                    {c.cycleName}
                  </Button>
                ))}
              </div>
            )}

            {isLoading ? (
              <Skeleton className="h-96" />
            ) : !cycle ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No OADRI cycles found. Create one to start tracking improvement.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Cycle Overview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{cycle.cycleName}</CardTitle>
                        {cycle.startedAt && (
                          <p className="text-sm text-gray-500 mt-1">
                            Started: {new Date(cycle.startedAt).toLocaleDateString()}
                            {cycle.completedAt && ` • Completed: ${new Date(cycle.completedAt).toLocaleDateString()}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={cycle.overallStatus === "completed" ? "default" : "outline"}>
                          Overall: {cycle.overallStatus?.replace("_", " ")}
                        </Badge>
                        {canMutate && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(cycle)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteId(cycle.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Cycle Progress</span>
                        <span>{
                          Math.round((
                            [cycle.objectivesStatus, cycle.approachStatus, cycle.deploymentStatus, cycle.resultsStatus, cycle.improvementStatus]
                              .filter(s => s === "completed").length / 5
                          ) * 100)
                        }%</span>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                        {["objectives", "approach", "deployment", "results", "improvement"].map((phase) => {
                          const status = cycle[`${phase}Status`];
                          const color = status === "completed" ? "bg-green-500" : status === "in_progress" ? "bg-blue-500" : status === "needs_improvement" ? "bg-amber-500" : "bg-gray-300";
                          return <div key={phase} className={`flex-1 ${color} border-r border-white/20`} title={`${phase}: ${status}`} />;
                        })}
                      </div>
                    </div>

                    {/* Phase Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {phases.map((phase) => {
                        const status = cycle[`${phase.key}Status`] || "not_started";
                        const config = phaseConfig[status];
                        const PhaseIcon = phase.icon;
                        const StatusIcon = config.icon;
                        const content = cycle[phase.key];
                        return (
                          <Card key={phase.key} className={`${config.bg} border-0`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <div className={`p-2 rounded-lg bg-white dark:bg-gray-800`}>
                                  <PhaseIcon className={`h-4 w-4 ${config.color}`} />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{phase.label}</p>
                                  <div className="flex items-center gap-1">
                                    <StatusIcon className={`h-3 w-3 ${config.color}`} />
                                    <span className={`text-xs ${config.color}`}>{config.label}</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{phase.desc}</p>
                              {content && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-4">{content}</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Phase Details */}
                <div className="space-y-4">
                  {phases.map((phase) => {
                    const content = cycle[phase.key];
                    const status = cycle[`${phase.key}Status`] || "not_started";
                    const config = phaseConfig[status];
                    const PhaseIcon = phase.icon;
                    if (!content) return null;
                    return (
                      <Card key={phase.key}>
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <PhaseIcon className={`h-5 w-5 ${config.color}`} />
                            <CardTitle className="text-base">{phase.label}</CardTitle>
                            <Badge className={`${config.bg} ${config.color} border-0`}>{config.label}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{content}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit OADRI Cycle" : "New OADRI Cycle"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="cycleName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cycle Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., 2024 Q3 Quality Improvement" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startedAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="completedAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Completion</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              {phases.map((phase) => (
                <div key={phase.key} className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <phase.icon className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-sm">{phase.label}</h3>
                  </div>
                  <FormField control={form.control} name={`${phase.key}Status` as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={phase.key as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details</FormLabel>
                      <FormControl><Textarea {...field} rows={2} placeholder={phase.desc} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              ))}
              <FormField control={form.control} name="overallStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete OADRI Cycle?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
