import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Plus, AlertTriangle, CheckCircle2, Clock, Search, Trash2, Pencil } from "lucide-react";
import type { SupervisoryVisit } from "@shared/schema";

const formSchema = z.object({
  caregiverId: z.string().min(1, "Caregiver is required"),
  officeId: z.string().min(1),
  visitDate: z.string().min(1, "Visit date is required"),
  visitType: z.enum(["in_person", "phone", "virtual", "written"]),
  durationMinutes: z.coerce.number().optional(),
  topics: z.string().optional(),
  notes: z.string().optional(),
  nextVisitDue: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
});

type FormValues = z.infer<typeof formSchema>;

const visitTypeLabel: Record<string, string> = {
  in_person: "In Person", phone: "Phone", virtual: "Virtual", written: "Written",
};
const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

function isOverdue(nextVisitDue: string | null, status: string): boolean {
  if (!nextVisitDue || status === "cancelled") return false;
  return new Date(nextVisitDue) < new Date();
}

export default function SupervisoryVisits() {
  const { selectedOfficeId, isAllOffices, canMutate } = useOfficeScope();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupervisoryVisit | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: visits = [], isLoading } = useQuery<SupervisoryVisit[]>({
    queryKey: ["/api/supervisory-visits", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/supervisory-visits?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const { data: caregivers = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/caregivers?officeId=${selectedOfficeId}`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      visitType: "in_person",
      status: "completed",
      officeId: selectedOfficeId || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payload = {
        ...data,
        topics: data.topics ? data.topics.split(",").map(t => t.trim()).filter(Boolean) : [],
        durationMinutes: data.durationMinutes || null,
        nextVisitDue: data.nextVisitDue || null,
      };
      if (editing) {
        return apiRequest("PATCH", `/api/supervisory-visits/${editing.id}`, payload);
      }
      return apiRequest("POST", "/api/supervisory-visits", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisory-visits", selectedOfficeId] });
      toast({ title: editing ? "Visit updated" : "Visit recorded", description: "Supervisory visit saved successfully." });
      setOpen(false);
      setEditing(null);
      form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/supervisory-visits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisory-visits", selectedOfficeId] });
      toast({ title: "Visit deleted" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ visitType: "in_person", status: "completed", officeId: selectedOfficeId || "" });
    setOpen(true);
  };

  const openEdit = (v: SupervisoryVisit) => {
    setEditing(v);
    form.reset({
      caregiverId: v.caregiverId,
      officeId: v.officeId,
      visitDate: v.visitDate,
      visitType: v.visitType as any,
      durationMinutes: v.durationMinutes || undefined,
      topics: (v.topics || []).join(", "),
      notes: v.notes || "",
      nextVisitDue: v.nextVisitDue || "",
      status: v.status as any,
    });
    setOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({ ...values, officeId: selectedOfficeId || "" });
  };

  const filtered = visits.filter(v => {
    if (!search) return true;
    const cg = caregivers.find((c: any) => c.id === v.caregiverId);
    const name = cg ? `${cg.firstName} ${cg.lastName}` : "";
    return name.toLowerCase().includes(search.toLowerCase()) || v.visitDate.includes(search);
  });

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600000);
  const visitsByCaregiver = new Map<string, Date>();
  for (const v of visits.filter(v2 => v2.status === "completed")) {
    const d = new Date(v.visitDate);
    const ex = visitsByCaregiver.get(v.caregiverId);
    if (!ex || d > ex) visitsByCaregiver.set(v.caregiverId, d);
  }
  const overdueCount = caregivers.filter((c: any) => {
    if (c.status !== "active") return false;
    const last = visitsByCaregiver.get(c.id);
    return !last || last < ninetyDaysAgo;
  }).length;

  const completedThisQuarter = visits.filter(v => {
    const d = new Date(v.visitDate);
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    return d >= qStart && v.status === "completed";
  }).length;

  const getCaregiverName = (id: string) => {
    const cg = caregivers.find((c: any) => c.id === id);
    return cg ? `${cg.firstName} ${cg.lastName}` : id;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Supervisory Visits" subtitle="Track and manage caregiver supervisory visit compliance" />
        <div className="flex-1 overflow-auto p-6 bg-background">
        <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clipboard className="h-6 w-6 text-primary" />
            Supervisory Visits
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track and document caregiver supervision</p>
        </div>
        {canMutate && !isAllOffices && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Record Visit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedThisQuarter}</p>
                <p className="text-xs text-muted-foreground">Completed This Quarter</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? "border-red-300 dark:border-red-800" : ""}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-8 w-8 ${overdueCount > 0 ? "text-red-500" : "text-green-500"}`} />
              <div>
                <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600 dark:text-red-400" : ""}`}>{overdueCount}</p>
                <p className="text-xs text-muted-foreground">Caregivers Overdue (90-day)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{visits.filter(v => v.status === "scheduled").length}</p>
                <p className="text-xs text-muted-foreground">Upcoming Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAllOffices && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4 flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Select a specific office to view supervisory visits.</span>
          </CardContent>
        </Card>
      )}

      {!isAllOffices && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by caregiver..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clipboard className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No visits found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caregiver</TableHead>
                    <TableHead>Visit Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{getCaregiverName(v.caregiverId)}</TableCell>
                      <TableCell>{v.visitDate}</TableCell>
                      <TableCell>{visitTypeLabel[v.visitType]}</TableCell>
                      <TableCell>{v.durationMinutes ? `${v.durationMinutes} min` : "—"}</TableCell>
                      <TableCell>
                        {v.nextVisitDue ? (
                          <span className={isOverdue(v.nextVisitDue, v.status) ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                            {v.nextVisitDue}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${statusConfig[v.status]?.className}`}>{statusConfig[v.status]?.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(v.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); form.reset(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Visit" : "Record Supervisory Visit"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="caregiverId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Caregiver *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select caregiver" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {caregivers.filter((c: any) => c.status === "active").map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="visitDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visit Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="visitType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visit Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="in_person">In Person</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="virtual">Virtual</SelectItem>
                        <SelectItem value="written">Written</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl><Input type="number" placeholder="30" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="topics" render={({ field }) => (
                <FormItem>
                  <FormLabel>Topics Discussed <span className="text-muted-foreground text-xs">(comma-separated)</span></FormLabel>
                  <FormControl><Input placeholder="Safety, care plan, documentation..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Visit summary..." rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nextVisitDue" render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Visit Due</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Record Visit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Visit?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This visit record will be permanently deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
        </div>
    </main>
  </div>
  );
}
