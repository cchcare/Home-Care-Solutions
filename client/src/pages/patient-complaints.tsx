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
  AlertTriangle, Plus, Search, Pencil, Trash2, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, FileText
} from "lucide-react";

const complaintSchema = z.object({
  complaintNumber: z.string().min(1, "Complaint number required"),
  complaintDate: z.string().min(1, "Date required"),
  source: z.enum(["patient", "family", "staff", "regulatory", "other"]),
  category: z.enum(["care_quality", "staff_conduct", "scheduling", "communication", "billing", "safety", "privacy", "other"]),
  description: z.string().min(1, "Description required"),
  clientId: z.string().optional(),
  caregiverId: z.string().optional(),
  incidentOutcome: z.string().optional(),
  rootCause: z.string().optional(),
  correctiveAction: z.string().optional(),
  preventiveMeasures: z.string().optional(),
  employeeInvolved: z.boolean().optional(),
  departmentInvolved: z.boolean().optional(),
  employeeNames: z.string().optional(),
  departmentNames: z.string().optional(),
  patientSatisfied: z.boolean().optional(),
  status: z.enum(["open", "under_investigation", "resolved_satisfactory", "resolved_unsatisfactory", "referred", "closed"]).default("open"),
});

type ComplaintForm = z.infer<typeof complaintSchema>;

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: AlertTriangle },
  under_investigation: { label: "Investigating", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: FileText },
  resolved_satisfactory: { label: "Resolved (Satisfactory)", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
  resolved_unsatisfactory: { label: "Resolved (Unsatisfactory)", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  referred: { label: "Referred", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: FileText },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: CheckCircle2 },
};

export default function PatientComplaints() {
  const { selectedOfficeId, canMutate } = useOfficeScope();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: complaints = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/patient-complaints", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/patient-complaints?officeId=${selectedOfficeId}`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/patient-complaints-stats", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return null;
      const r = await fetch(`/api/patient-complaints-stats?officeId=${selectedOfficeId}`);
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const form = useForm<ComplaintForm>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      complaintDate: new Date().toISOString().split("T")[0],
      source: "patient",
      category: "care_quality",
      status: "open",
      employeeInvolved: false,
      departmentInvolved: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ComplaintForm) => {
      const payload = {
        ...data,
        officeId: selectedOfficeId,
      };
      if (editing) return apiRequest("PATCH", `/api/patient-complaints/${editing.id}`, payload);
      return apiRequest("POST", "/api/patient-complaints", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient-complaints", selectedOfficeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/patient-complaints-stats", selectedOfficeId] });
      toast({ title: editing ? "Complaint updated" : "Complaint logged" });
      setOpen(false); setEditing(null); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/patient-complaints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient-complaints", selectedOfficeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/patient-complaints-stats", selectedOfficeId] });
      toast({ title: "Complaint deleted" });
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      complaintDate: new Date().toISOString().split("T")[0],
      source: "patient",
      category: "care_quality",
      status: "open",
      employeeInvolved: false,
      departmentInvolved: false,
    });
    setOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    form.reset({
      complaintNumber: c.complaintNumber,
      complaintDate: c.complaintDate,
      source: c.source,
      category: c.category,
      description: c.description,
      incidentOutcome: c.incidentOutcome || "",
      rootCause: c.rootCause || "",
      correctiveAction: c.correctiveAction || "",
      preventiveMeasures: c.preventiveMeasures || "",
      employeeInvolved: c.employeeInvolved || false,
      departmentInvolved: c.departmentInvolved || false,
      employeeNames: c.employeeNames || "",
      departmentNames: c.departmentNames || "",
      patientSatisfied: c.patientSatisfied ?? undefined,
      status: c.status,
    });
    setOpen(true);
  };

  const filtered = complaints.filter((c: any) => {
    const matchesSearch = !search ||
      c.complaintNumber?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
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
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  Patient Complaints
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Track complaints, root cause analysis, and resolution outcomes
                </p>
              </div>
              {canMutate && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Complaint
                </Button>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {isLoading ? (
                Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)
              ) : stats ? (
                <>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Open</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Investigating</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.underInvestigation}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Satisfactory</p>
                      <p className="text-2xl font-bold text-green-600">{stats.resolvedSatisfactory}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Unsatisfactory</p>
                      <p className="text-2xl font-bold text-red-600">{stats.resolvedUnsatisfactory}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Satisfaction Ratio</p>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold">{Math.round(stats.satisfactoryRatio)}%</p>
                        {stats.satisfactoryRatio >= 80 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search complaints..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="under_investigation">Investigating</SelectItem>
                  <SelectItem value="resolved_satisfactory">Resolved (Satisfactory)</SelectItem>
                  <SelectItem value="resolved_unsatisfactory">Resolved (Unsatisfactory)</SelectItem>
                  <SelectItem value="referred">Referred</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Complaints Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No complaints found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Number</th>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-left font-medium">Source</th>
                          <th className="px-4 py-3 text-left font-medium">Category</th>
                          <th className="px-4 py-3 text-left font-medium">Description</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                          <th className="px-4 py-3 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filtered.map((c: any) => {
                          const sc = statusConfig[c.status] || statusConfig.open;
                          const StatusIcon = sc.icon;
                          return (
                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-4 py-3 font-medium">{c.complaintNumber}</td>
                              <td className="px-4 py-3">{c.complaintDate ? new Date(c.complaintDate).toLocaleDateString() : "-"}</td>
                              <td className="px-4 py-3 capitalize">{c.source}</td>
                              <td className="px-4 py-3 capitalize">{c.category?.replace("_", " ")}</td>
                              <td className="px-4 py-3 max-w-xs truncate">{c.description}</td>
                              <td className="px-4 py-3">
                                <Badge className={`${sc.color} border-0`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {sc.label}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteId(c.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Complaint" : "Log New Complaint"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="complaintNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complaint Number</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g., COMP-2024-001" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="complaintDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Received</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="patient">Patient</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="regulatory">Regulatory</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="care_quality">Care Quality</SelectItem>
                        <SelectItem value="staff_conduct">Staff Conduct</SelectItem>
                        <SelectItem value="scheduling">Scheduling</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                        <SelectItem value="privacy">Privacy</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="incidentOutcome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Incident Outcome</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="rootCause" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Root Cause</FormLabel>
                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="correctiveAction" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corrective Action</FormLabel>
                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="preventiveMeasures" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preventive Measures</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="under_investigation">Under Investigation</SelectItem>
                        <SelectItem value="resolved_satisfactory">Resolved (Satisfactory)</SelectItem>
                        <SelectItem value="resolved_unsatisfactory">Resolved (Unsatisfactory)</SelectItem>
                        <SelectItem value="referred">Referred</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="patientSatisfied" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Satisfied?</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "true")} value={field.value === true ? "true" : field.value === false ? "false" : "undefined"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="undefined">Not assessed</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
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
          <DialogHeader><DialogTitle>Delete Complaint?</DialogTitle></DialogHeader>
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
