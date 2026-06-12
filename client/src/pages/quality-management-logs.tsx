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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ClipboardList, Plus, Search, Pencil, Trash2, User,
  MapPin, Star
} from "lucide-react";

const logSchema = z.object({
  logDate: z.string().min(1, "Date required"),
  complaintNumber: z.string().optional(),
  patientName: z.string().optional(),
  patientLocation: z.string().optional(),
  patientIssues: z.string().optional(),
  incidentOutcome: z.string().optional(),
  preventableMeasures: z.string().optional(),
  qualitySatisfactionCode: z.string().optional(),
  surveySent: z.boolean().optional(),
  surveyResults: z.string().optional(),
  rating1: z.coerce.number().optional(),
  rating2: z.coerce.number().optional(),
  rating3: z.coerce.number().optional(),
  rating4: z.coerce.number().optional(),
  rating5: z.coerce.number().optional(),
  employeeInvolved: z.boolean().optional(),
  departmentInvolved: z.boolean().optional(),
  notes: z.string().optional(),
});

type LogForm = z.infer<typeof logSchema>;

export default function QualityManagementLogs() {
  const { selectedOfficeId, canMutate } = useOfficeScope();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/quality-management-logs", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/quality-management-logs?officeId=${selectedOfficeId}`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const form = useForm<LogForm>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      logDate: new Date().toISOString().split("T")[0],
      surveySent: false,
      employeeInvolved: false,
      departmentInvolved: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: LogForm) => {
      const payload = { ...data, officeId: selectedOfficeId };
      if (editing) return apiRequest("PATCH", `/api/quality-management-logs/${editing.id}`, payload);
      return apiRequest("POST", "/api/quality-management-logs", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-management-logs", selectedOfficeId] });
      toast({ title: editing ? "Log updated" : "Log created" });
      setOpen(false); setEditing(null); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quality-management-logs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-management-logs", selectedOfficeId] });
      toast({ title: "Log deleted" });
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      logDate: new Date().toISOString().split("T")[0],
      surveySent: false,
      employeeInvolved: false,
      departmentInvolved: false,
    });
    setOpen(true);
  };

  const openEdit = (l: any) => {
    setEditing(l);
    form.reset({
      logDate: l.logDate,
      complaintNumber: l.complaintNumber || "",
      patientName: l.patientName || "",
      patientLocation: l.patientLocation || "",
      patientIssues: l.patientIssues || "",
      incidentOutcome: l.incidentOutcome || "",
      preventableMeasures: l.preventableMeasures || "",
      qualitySatisfactionCode: l.qualitySatisfactionCode || "",
      surveySent: l.surveySent || false,
      surveyResults: l.surveyResults || "",
      rating1: l.rating1 ?? undefined,
      rating2: l.rating2 ?? undefined,
      rating3: l.rating3 ?? undefined,
      rating4: l.rating4 ?? undefined,
      rating5: l.rating5 ?? undefined,
      employeeInvolved: l.employeeInvolved || false,
      departmentInvolved: l.departmentInvolved || false,
      notes: l.notes || "",
    });
    setOpen(true);
  };

  const filtered = logs.filter((l: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.complaintNumber?.toLowerCase().includes(s) ||
      l.patientName?.toLowerCase().includes(s) ||
      l.patientIssues?.toLowerCase().includes(s) ||
      l.incidentOutcome?.toLowerCase().includes(s)
    );
  });

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
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                  Quality Management System Log
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  The form from the Quality Management Policy — log complaints, incidents, outcomes, and surveys
                </p>
              </div>
              {canMutate && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Log Entry
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No quality management logs found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-left font-medium">Complaint #</th>
                          <th className="px-4 py-3 text-left font-medium">Patient</th>
                          <th className="px-4 py-3 text-left font-medium">Issues</th>
                          <th className="px-4 py-3 text-left font-medium">Outcome</th>
                          <th className="px-4 py-3 text-left font-medium">Survey</th>
                          <th className="px-4 py-3 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filtered.map((l: any) => (
                          <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3">{l.logDate ? new Date(l.logDate).toLocaleDateString() : "-"}</td>
                            <td className="px-4 py-3 font-medium">{l.complaintNumber || "-"}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-400" />
                                {l.patientName || "-"}
                              </div>
                              {l.patientLocation && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="h-3 w-3" />
                                  {l.patientLocation}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-xs truncate">{l.patientIssues || "-"}</td>
                            <td className="px-4 py-3 max-w-xs truncate">{l.incidentOutcome || "-"}</td>
                            <td className="px-4 py-3">
                              {l.surveySent ? (
                                <Badge variant="default" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Sent
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Not sent</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteId(l.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Log Entry" : "New Quality Management Log"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="logDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Log Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="complaintNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complaint Number</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g., COMP-2024-001" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="patientName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="patientLocation" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Location</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g., Room 101, Home A" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="patientIssues" render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Issues / Concerns</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="incidentOutcome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Incident Outcome</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="preventableMeasures" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preventable Measures</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="qualitySatisfactionCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quality Satisfaction Code</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., SAT-001, UNSAT-002" /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="surveySent" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey Sent?</FormLabel>
                    <FormControl>
                      <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="surveyResults" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey Results Summary</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1,2,3,4,5].map((n) => (
                  <FormField key={n} control={form.control} name={`rating${n}` as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating {n}</FormLabel>
                      <FormControl><Input type="number" min={1} max={5} {...field} /></FormControl>
                    </FormItem>
                  )} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="employeeInvolved" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Involved?</FormLabel>
                    <FormControl>
                      <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="departmentInvolved" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Involved?</FormLabel>
                    <FormControl>
                      <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : editing ? "Update" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Log Entry?</DialogTitle></DialogHeader>
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
