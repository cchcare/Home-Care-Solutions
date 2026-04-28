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
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Biohazard, Plus, AlertTriangle, CheckCircle2, Activity, Pencil, Trash2 } from "lucide-react";
import type { InfectionControlLog } from "@shared/schema";

const formSchema = z.object({
  incidentDate: z.string().min(1, "Date required"),
  infectionType: z.enum(["respiratory", "gastrointestinal", "skin", "bloodborne", "covid19", "influenza", "other"]),
  description: z.string().min(1, "Description required"),
  affectedClients: z.string().optional(),
  affectedStaff: z.string().optional(),
  containmentActions: z.string().optional(),
  notificationsGiven: z.string().optional(),
  ppeUsed: z.boolean().default(false),
  reportedToPublicHealth: z.boolean().default(false),
  publicHealthReportDate: z.string().optional(),
  status: z.enum(["active", "monitoring", "resolved"]),
  resolvedAt: z.string().optional(),
  outcome: z.string().optional(),
  officeId: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const infectionTypeLabel: Record<string, string> = {
  respiratory: "Respiratory", gastrointestinal: "Gastrointestinal", skin: "Skin",
  bloodborne: "Bloodborne", covid19: "COVID-19", influenza: "Influenza", other: "Other",
};
const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  monitoring: { label: "Monitoring", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
};

export default function InfectionControl() {
  const { selectedOfficeId, isAllOffices, canMutate } = useOfficeScope();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InfectionControlLog | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [watchPublicHealth, setWatchPublicHealth] = useState(false);

  const { data: logs = [], isLoading } = useQuery<InfectionControlLog[]>({
    queryKey: ["/api/infection-control", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/infection-control?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      infectionType: "respiratory",
      ppeUsed: false,
      reportedToPublicHealth: false,
      status: "active",
      officeId: selectedOfficeId || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payload = {
        ...data,
        affectedClients: data.affectedClients?.split(",").map(s => s.trim()).filter(Boolean) || [],
        affectedStaff: data.affectedStaff?.split(",").map(s => s.trim()).filter(Boolean) || [],
        publicHealthReportDate: data.publicHealthReportDate || null,
        resolvedAt: data.resolvedAt || null,
        outcome: data.outcome || null,
      };
      if (editing) return apiRequest("PATCH", `/api/infection-control/${editing.id}`, payload);
      return apiRequest("POST", "/api/infection-control", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/infection-control", selectedOfficeId] });
      toast({ title: editing ? "Log updated" : "Infection event logged" });
      setOpen(false); setEditing(null); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/infection-control/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/infection-control", selectedOfficeId] });
      toast({ title: "Log deleted" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resolveQuick = (id: string) => {
    apiRequest("PATCH", `/api/infection-control/${id}`, { status: "resolved", resolvedAt: new Date().toISOString().split("T")[0] }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/infection-control", selectedOfficeId] });
      toast({ title: "Marked as resolved" });
    });
  };

  const openCreate = () => {
    setEditing(null);
    form.reset({ infectionType: "respiratory", ppeUsed: false, reportedToPublicHealth: false, status: "active", officeId: selectedOfficeId || "" });
    setWatchPublicHealth(false);
    setOpen(true);
  };

  const openEdit = (log: InfectionControlLog) => {
    setEditing(log);
    form.reset({
      incidentDate: log.incidentDate,
      infectionType: log.infectionType as any,
      description: log.description,
      affectedClients: (log.affectedClients || []).join(", "),
      affectedStaff: (log.affectedStaff || []).join(", "),
      containmentActions: log.containmentActions || "",
      notificationsGiven: log.notificationsGiven || "",
      ppeUsed: log.ppeUsed ?? false,
      reportedToPublicHealth: log.reportedToPublicHealth ?? false,
      publicHealthReportDate: log.publicHealthReportDate || "",
      status: log.status as any,
      resolvedAt: log.resolvedAt || "",
      outcome: log.outcome || "",
      officeId: log.officeId,
    });
    setWatchPublicHealth(log.reportedToPublicHealth ?? false);
    setOpen(true);
  };

  const activeLogs = logs.filter(l => l.status === "active");
  const monitoringLogs = logs.filter(l => l.status === "monitoring");
  const resolvedLogs = logs.filter(l => l.status === "resolved");
  const publicHealthReported = logs.filter(l => l.reportedToPublicHealth).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Infection Control" subtitle="Track and manage infection incidents and prevention measures" />
        <div className="flex-1 overflow-auto p-6 bg-background">
        <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Biohazard className="h-6 w-6 text-primary" />
            Infection Control Log
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage infection events, containment, and resolution</p>
        </div>
        {canMutate && !isAllOffices && (
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Log Infection Event</Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Events", value: activeLogs.length, color: "text-red-600 dark:text-red-400", icon: AlertTriangle },
          { label: "Under Monitoring", value: monitoringLogs.length, color: "text-yellow-600 dark:text-yellow-400", icon: Activity },
          { label: "Resolved", value: resolvedLogs.length, color: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
          { label: "Reported to Public Health", value: publicHealthReported, color: "text-blue-600 dark:text-blue-400", icon: Biohazard },
        ].map(s => (
          <Card key={s.label} className={activeLogs.length > 0 && s.label === "Active Events" ? "border-red-300 dark:border-red-800" : ""}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
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
            <span className="text-sm">Select a specific office to view infection control logs.</span>
          </CardContent>
        </Card>
      )}

      {!isAllOffices && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Biohazard className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No infection events logged</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Affected</TableHead>
                    <TableHead>PPE</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{log.incidentDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{infectionTypeLabel[log.infectionType]}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate">{log.description}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {((log.affectedClients?.length || 0) + (log.affectedStaff?.length || 0)) || "—"}
                        {" person(s)"}
                      </TableCell>
                      <TableCell>
                        {log.ppeUsed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${statusConfig[log.status]?.className}`}>
                          {statusConfig[log.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {log.status !== "resolved" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 dark:text-green-400" onClick={() => resolveQuick(log.id)}>
                              Resolve
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(log)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(log.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); form.reset(); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Infection Log" : "Log Infection Event"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="incidentDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="infectionType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Infection Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(infectionTypeLabel).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Textarea placeholder="Describe the infection event..." rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="affectedClients" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affected Clients <span className="text-xs text-muted-foreground">(comma-sep)</span></FormLabel>
                    <FormControl><Input placeholder="Client names..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="affectedStaff" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affected Staff <span className="text-xs text-muted-foreground">(comma-sep)</span></FormLabel>
                    <FormControl><Input placeholder="Staff names..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="containmentActions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Containment Actions</FormLabel>
                  <FormControl><Textarea placeholder="Steps taken to contain the infection..." rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notificationsGiven" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notifications Given</FormLabel>
                  <FormControl><Input placeholder="DOH, families, staff..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">PPE Used</p>
                    <p className="text-xs text-muted-foreground">Personal protective equipment was used</p>
                  </div>
                  <FormField control={form.control} name="ppeUsed" render={({ field }) => (
                    <FormItem><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">Reported to Public Health</p>
                  </div>
                  <FormField control={form.control} name="reportedToPublicHealth" render={({ field }) => (
                    <FormItem><FormControl>
                      <Switch checked={field.value} onCheckedChange={v => { field.onChange(v); setWatchPublicHealth(v); }} />
                    </FormControl></FormItem>
                  )} />
                </div>
              </div>
              {watchPublicHealth && (
                <FormField control={form.control} name="publicHealthReportDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Public Health Report Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="resolvedAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolution Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="outcome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome / Notes</FormLabel>
                  <FormControl><Textarea placeholder="Final outcome, lessons learned..." rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Log Event"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Log?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This infection control log will be permanently deleted.</p>
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
