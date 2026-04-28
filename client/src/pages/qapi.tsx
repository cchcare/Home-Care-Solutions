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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Plus, AlertTriangle, CheckCircle2, Calendar, Users, FileText, Pencil, Trash2 } from "lucide-react";
import type { QapiMeeting } from "@shared/schema";

const formSchema = z.object({
  meetingDate: z.string().min(1, "Date required"),
  quarter: z.string().optional(),
  year: z.coerce.number().optional(),
  facilitatedBy: z.string().optional(),
  attendees: z.string().optional(),
  meetingNotes: z.string().optional(),
  nextMeetingDate: z.string().optional(),
  status: z.enum(["draft", "finalized"]),
  indicators: z.object({
    incidentCount: z.coerce.number().optional(),
    complaintsCount: z.coerce.number().optional(),
    trainingCompletionPct: z.coerce.number().optional(),
    hospitalizationsCount: z.coerce.number().optional(),
    fallsCount: z.coerce.number().optional(),
    infectionCount: z.coerce.number().optional(),
  }).optional(),
  actionItems: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Qapi() {
  const { selectedOfficeId, isAllOffices, canMutate } = useOfficeScope();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QapiMeeting | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: meetings = [], isLoading } = useQuery<QapiMeeting[]>({
    queryKey: ["/api/qapi-meetings", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/qapi-meetings?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  // Fetch live metrics for auto-population
  const { data: incidents = [] } = useQuery<any[]>({
    queryKey: ["/api/incident-reports", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/incident-reports?officeId=${selectedOfficeId}`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;

  const incidentsThisQuarter = incidents.filter((i: any) => new Date(i.createdAt) >= quarterStart).length;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "draft",
      quarter: currentQuarter,
      year: now.getFullYear(),
      indicators: {
        incidentCount: incidentsThisQuarter,
        complaintsCount: 0,
        trainingCompletionPct: 0,
        hospitalizationsCount: 0,
        fallsCount: 0,
        infectionCount: 0,
      },
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const attendeesArr = data.attendees?.split(",").map(a => a.trim()).filter(Boolean) || [];
      const actionItemsArr = data.actionItems?.split("\n").map(a => a.trim()).filter(Boolean).map(text => ({ text, completed: false })) || [];
      const payload = {
        meetingDate: data.meetingDate,
        quarter: data.quarter,
        year: data.year,
        facilitatedBy: data.facilitatedBy,
        attendees: attendeesArr,
        meetingNotes: data.meetingNotes,
        nextMeetingDate: data.nextMeetingDate || null,
        status: data.status,
        indicators: data.indicators || {},
        actionItems: actionItemsArr,
        officeId: selectedOfficeId,
      };
      if (editing) return apiRequest("PATCH", `/api/qapi-meetings/${editing.id}`, payload);
      return apiRequest("POST", "/api/qapi-meetings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qapi-meetings", selectedOfficeId] });
      toast({ title: editing ? "Meeting updated" : "Meeting logged" });
      setOpen(false); setEditing(null); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/qapi-meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qapi-meetings", selectedOfficeId] });
      toast({ title: "Meeting deleted" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      status: "draft",
      quarter: currentQuarter,
      year: now.getFullYear(),
      meetingDate: now.toISOString().split("T")[0],
      indicators: {
        incidentCount: incidentsThisQuarter,
        complaintsCount: 0,
        trainingCompletionPct: 0,
        hospitalizationsCount: 0,
        fallsCount: 0,
        infectionCount: 0,
      },
    });
    setOpen(true);
  };

  const openEdit = (m: QapiMeeting) => {
    setEditing(m);
    const ind = (m.indicators as any) || {};
    const acts = (m.actionItems as any[]) || [];
    form.reset({
      meetingDate: m.meetingDate,
      quarter: m.quarter || "",
      year: m.year || undefined,
      facilitatedBy: m.facilitatedBy || "",
      attendees: (m.attendees || []).join(", "),
      meetingNotes: m.meetingNotes || "",
      nextMeetingDate: m.nextMeetingDate || "",
      status: m.status as any,
      indicators: {
        incidentCount: ind.incidentCount ?? 0,
        complaintsCount: ind.complaintsCount ?? 0,
        trainingCompletionPct: ind.trainingCompletionPct ?? 0,
        hospitalizationsCount: ind.hospitalizationsCount ?? 0,
        fallsCount: ind.fallsCount ?? 0,
        infectionCount: ind.infectionCount ?? 0,
      },
      actionItems: acts.map((a: any) => a.text || a).join("\n"),
    });
    setOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            QAPI — Quality Assurance & Performance Improvement
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Quarterly quality meetings, metrics, and action items</p>
        </div>
        {canMutate && !isAllOffices && (
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Log QAPI Meeting</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{meetings.length}</p>
                <p className="text-xs text-muted-foreground">Total Meetings Logged</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{meetings.filter(m => m.status === "finalized").length}</p>
                <p className="text-xs text-muted-foreground">Finalized Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-indigo-500" />
              <div>
                <p className="text-2xl font-bold">{incidentsThisQuarter}</p>
                <p className="text-xs text-muted-foreground">Incidents This Quarter</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAllOffices && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4 flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Select a specific office to view QAPI meetings.</span>
          </CardContent>
        </Card>
      )}

      {!isAllOffices && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No QAPI meetings logged yet</p>
                <p className="text-sm mt-1">Click "Log QAPI Meeting" to start documenting quality meetings.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="divide-y">
                {meetings.map(m => {
                  const indicators = (m.indicators as any) || {};
                  const actionItems = (m.actionItems as any[]) || [];
                  return (
                    <AccordionItem key={m.id} value={m.id} className="border-0">
                      <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {m.quarter && m.year ? `${m.quarter} ${m.year}` : m.meetingDate} — QAPI Meeting
                            </p>
                            <p className="text-xs text-muted-foreground">{m.meetingDate}{m.facilitatedBy ? ` · Facilitated by ${m.facilitatedBy}` : ""}</p>
                          </div>
                          <Badge className={`border-0 ${m.status === "finalized" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
                            {m.status === "finalized" ? "Finalized" : "Draft"}
                          </Badge>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4">
                          {/* Key Indicators */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Key Indicators</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {[
                                { label: "Incidents", key: "incidentCount" },
                                { label: "Complaints", key: "complaintsCount" },
                                { label: "Training %", key: "trainingCompletionPct" },
                                { label: "Hospitalizations", key: "hospitalizationsCount" },
                                { label: "Falls", key: "fallsCount" },
                                { label: "Infections", key: "infectionCount" },
                              ].map(ind => (
                                <div key={ind.key} className="bg-muted/50 rounded-lg p-2 text-center">
                                  <p className="text-lg font-bold">{indicators[ind.key] ?? "—"}</p>
                                  <p className="text-xs text-muted-foreground">{ind.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Attendees */}
                          {m.attendees && m.attendees.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Attendees</p>
                              <div className="flex flex-wrap gap-1">
                                {m.attendees.map((a, i) => <Badge key={i} variant="outline" className="text-xs">{a}</Badge>)}
                              </div>
                            </div>
                          )}
                          {/* Notes */}
                          {m.meetingNotes && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Meeting Notes</p>
                              <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-2">{m.meetingNotes}</p>
                            </div>
                          )}
                          {/* Action Items */}
                          {actionItems.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Action Items</p>
                              <ul className="space-y-1">
                                {actionItems.map((a: any, i: number) => (
                                  <li key={i} className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className={`h-3.5 w-3.5 ${a.completed ? "text-green-500" : "text-muted-foreground"}`} />
                                    {typeof a === "string" ? a : a.text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {m.nextMeetingDate && (
                            <p className="text-xs text-muted-foreground">Next meeting: <span className="font-medium">{m.nextMeetingDate}</span></p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); form.reset(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit QAPI Meeting" : "Log QAPI Meeting"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="meetingDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="quarter" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quarter</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Q1–Q4" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Q1">Q1 (Jan–Mar)</SelectItem>
                        <SelectItem value="Q2">Q2 (Apr–Jun)</SelectItem>
                        <SelectItem value="Q3">Q3 (Jul–Sep)</SelectItem>
                        <SelectItem value="Q4">Q4 (Oct–Dec)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl><Input type="number" placeholder={String(now.getFullYear())} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="facilitatedBy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Facilitated By</FormLabel>
                  <FormControl><Input placeholder="Name or title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="attendees" render={({ field }) => (
                <FormItem>
                  <FormLabel>Attendees <span className="text-muted-foreground text-xs">(comma-separated)</span></FormLabel>
                  <FormControl><Input placeholder="Jane Smith, DON; John Doe, Admin..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Quality Indicators
                  <span className="text-xs text-muted-foreground font-normal">(auto-populated from live data where available)</span>
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { name: "indicators.incidentCount" as const, label: "Incidents" },
                    { name: "indicators.complaintsCount" as const, label: "Complaints" },
                    { name: "indicators.trainingCompletionPct" as const, label: "Training % Complete" },
                    { name: "indicators.hospitalizationsCount" as const, label: "Hospitalizations" },
                    { name: "indicators.fallsCount" as const, label: "Falls" },
                    { name: "indicators.infectionCount" as const, label: "Infections" },
                  ].map(ind => (
                    <FormField key={ind.name} control={form.control} name={ind.name} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">{ind.label}</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>

              <FormField control={form.control} name="meetingNotes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Notes</FormLabel>
                  <FormControl><Textarea placeholder="Summary of discussions, findings, decisions..." rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="actionItems" render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Items <span className="text-muted-foreground text-xs">(one per line)</span></FormLabel>
                  <FormControl><Textarea placeholder="Update care plans for flagged clients&#10;Schedule re-training on documentation&#10;Review incident trends with supervisors" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nextMeetingDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Meeting Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="finalized">Finalized</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Log Meeting"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Meeting?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This QAPI meeting record will be permanently deleted.</p>
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
