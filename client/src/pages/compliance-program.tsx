import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOfficeScope } from "@/context/office-context";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { OfficeSelector } from "@/components/office-selector";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
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
import {
  ShieldQuestion, Plus, Pencil, Trash2, Loader2, AlertTriangle,
  CheckCircle2, XCircle, UserCog, PhoneCall, Siren,
} from "lucide-react";
import { formatDateOnly, toDateOnlyInputValue, parseDateOnlyInput } from "@/lib/dateOnly";
import type { ComplianceOfficerDesignation, ComplianceHotlineReport } from "@shared/schema";

const HOTLINE_CATEGORIES: Record<string, string> = {
  fraud_waste_abuse: "Fraud, Waste & Abuse",
  hipaa_privacy: "HIPAA / Privacy",
  billing_compliance: "Billing Compliance",
  patient_safety: "Patient Safety",
  hr_conduct: "HR / Conduct",
  other: "Other",
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_STYLES: Record<string, string> = {
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  under_investigation: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const ELEMENT_STATUS_ICON: Record<string, JSX.Element> = {
  built_in: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  needs_attention: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  gap: <XCircle className="h-4 w-4 text-red-600" />,
};

interface ProgramElement {
  element: number;
  title: string;
  status: "built_in" | "needs_attention" | "gap";
  detail: string;
  linkHref: string;
}

const officerFormSchema = z.object({
  role: z.string().default("compliance_officer"),
  personName: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  effectiveDate: z.string().min(1, "Effective date is required"),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});
type OfficerFormData = z.infer<typeof officerFormSchema>;

const hotlineFormSchema = z.object({
  isAnonymous: z.boolean().default(false),
  reporterName: z.string().optional(),
  reporterContact: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  severity: z.string().default("medium"),
  description: z.string().min(1, "Description is required"),
});
type HotlineFormData = z.infer<typeof hotlineFormSchema>;

function SevenElementsOverview({ officeId }: { officeId: string | undefined }) {
  const { data, isLoading } = useQuery<{ officeId: string | null; elements: ProgramElement[] }>({
    queryKey: ["/api/compliance/program-overview", officeId],
    queryFn: async () => {
      const params = officeId ? `?officeId=${officeId}` : "";
      const r = await fetch(`/api/compliance/program-overview${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load compliance program overview");
      return r.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldQuestion className="h-4 w-4 text-primary" />
          OIG Seven Elements Overview
        </CardTitle>
        <CardDescription>
          Where each element of an effective compliance program stands today, and what covers it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(data?.elements || []).map((el) => (
              <a
                key={el.element}
                href={el.linkHref}
                className="border rounded-lg p-3 space-y-1 hover:bg-muted/50 transition-colors"
                data-testid={`element-card-${el.element}`}
              >
                <div className="flex items-center gap-2">
                  {ELEMENT_STATUS_ICON[el.status]}
                  <span className="text-xs font-medium">Element {el.element}</span>
                </div>
                <p className="text-sm font-medium leading-tight">{el.title}</p>
                <p className="text-xs text-muted-foreground">{el.detail}</p>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComplianceOfficersSection({ officeId, canMutate }: { officeId: string | undefined; canMutate: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceOfficerDesignation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: officers = [], isLoading } = useQuery<ComplianceOfficerDesignation[]>({
    queryKey: ["/api/compliance-officers", officeId],
    queryFn: async () => {
      const params = officeId ? `?officeId=${officeId}` : "";
      const r = await fetch(`/api/compliance-officers${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch compliance officers");
      return r.json();
    },
  });

  const form = useForm<OfficerFormData>({
    resolver: zodResolver(officerFormSchema),
    defaultValues: { role: "compliance_officer", personName: "", title: "", email: "", phone: "", effectiveDate: "", endDate: "", notes: "" },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/compliance-officers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/compliance/program-overview"] });
  };

  const buildPayload = (data: OfficerFormData) => ({
    role: data.role,
    personName: data.personName,
    title: data.title || undefined,
    email: data.email || undefined,
    phone: data.phone || undefined,
    effectiveDate: parseDateOnlyInput(data.effectiveDate),
    endDate: data.endDate ? parseDateOnlyInput(data.endDate) : null,
    notes: data.notes || undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (data: OfficerFormData) => {
      if (editing) return apiRequest("PUT", `/api/compliance-officers/${editing.id}`, buildPayload(data));
      return apiRequest("POST", "/api/compliance-officers", { ...buildPayload(data), officeId });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: editing ? "Designation updated" : "Designation added" });
      setOpen(false); setEditing(null); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const endMutation = useMutation({
    mutationFn: (designation: ComplianceOfficerDesignation) =>
      apiRequest("PUT", `/api/compliance-officers/${designation.id}`, { endDate: new Date().toISOString() }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Designation ended" });
    },
    onError: (e: any) => toast({ title: "Failed to end designation", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/compliance-officers/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Designation deleted" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openEdit = (designation: ComplianceOfficerDesignation) => {
    setEditing(designation);
    form.reset({
      role: designation.role,
      personName: designation.personName,
      title: designation.title || "",
      email: designation.email || "",
      phone: designation.phone || "",
      effectiveDate: toDateOnlyInputValue(designation.effectiveDate),
      endDate: toDateOnlyInputValue(designation.endDate),
      notes: designation.notes || "",
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.reset({ role: "compliance_officer", personName: "", title: "", email: "", phone: "", effectiveDate: toDateOnlyInputValue(new Date().toISOString()), endDate: "", notes: "" });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="h-4 w-4 text-primary" />
              Compliance Officer / Committee
            </CardTitle>
            <CardDescription>Element 2 — who's designated to oversee the compliance program.</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} disabled={!canMutate} data-testid="button-add-officer">
            <Plus className="h-4 w-4 mr-2" />Add Designation
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : officers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserCog className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No compliance officer or committee member designated yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {officers.map((o) => (
                <TableRow key={o.id} data-testid={`row-officer-${o.id}`}>
                  <TableCell>
                    <p className="font-medium text-sm">{o.personName}</p>
                    {o.title && <p className="text-xs text-muted-foreground">{o.title}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{o.role === "compliance_officer" ? "Compliance Officer" : "Committee Member"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {o.email || "—"}{o.phone ? ` / ${o.phone}` : ""}
                  </TableCell>
                  <TableCell className="text-sm">{formatDateOnly(o.effectiveDate)}</TableCell>
                  <TableCell>
                    {o.endDate ? (
                      <Badge variant="outline" className="text-xs">Ended {formatDateOnly(o.endDate)}</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 text-xs">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {!o.endDate && canMutate && (
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => endMutation.mutate(o)} disabled={endMutation.isPending} data-testid={`button-end-officer-${o.id}`}>
                          End Designation
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canMutate} onClick={() => openEdit(o)} data-testid={`button-edit-officer-${o.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={!canMutate} onClick={() => setDeleteId(o.id)} data-testid={`button-delete-officer-${o.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); form.reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Designation" : "Add Designation"}</DialogTitle>
            <DialogDescription>Record who serves as compliance officer or on the compliance committee.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-officer-role"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                        <SelectItem value="committee_member">Committee Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="personName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-officer-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input {...field} data-testid="input-officer-title" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} data-testid="input-officer-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input {...field} data-testid="input-officer-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="effectiveDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date *</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-officer-effective" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-officer-end" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={2} {...field} data-testid="input-officer-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-officer">
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editing ? "Save Changes" : "Add Designation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Designation?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This removes the history record entirely — consider "End Designation" instead if they've just stepped down.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-officer">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function HotlineReportsSection({ officeId, canManage }: { officeId: string | undefined; canManage: boolean }) {
  const { toast } = useToast();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [managing, setManaging] = useState<ComplianceHotlineReport | null>(null);

  const { data: reports = [], isLoading } = useQuery<ComplianceHotlineReport[]>({
    queryKey: ["/api/compliance-hotline-reports", officeId],
    queryFn: async () => {
      const params = officeId ? `?officeId=${officeId}` : "";
      const r = await fetch(`/api/compliance-hotline-reports${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch hotline reports");
      return r.json();
    },
    enabled: canManage,
  });

  const form = useForm<HotlineFormData>({
    resolver: zodResolver(hotlineFormSchema),
    defaultValues: { isAnonymous: false, reporterName: "", reporterContact: "", category: "", severity: "medium", description: "" },
  });
  const isAnonymous = form.watch("isAnonymous");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/compliance-hotline-reports"] });
    queryClient.invalidateQueries({ queryKey: ["/api/compliance/program-overview"] });
    queryClient.invalidateQueries({ queryKey: ["/api/compliance/ai-insights"] });
  };

  const submitMutation = useMutation({
    mutationFn: (data: HotlineFormData) => apiRequest("POST", "/api/compliance-hotline-reports", {
      officeId,
      isAnonymous: data.isAnonymous,
      reporterName: data.isAnonymous ? undefined : (data.reporterName || undefined),
      reporterContact: data.isAnonymous ? undefined : (data.reporterContact || undefined),
      category: data.category,
      severity: data.severity,
      description: data.description,
    }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Report submitted", description: "Thank you — it will be reviewed by the compliance officer." });
      setSubmitOpen(false); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ComplianceHotlineReport> }) =>
      apiRequest("PUT", `/api/compliance-hotline-reports/${id}`, data),
    onSuccess: () => {
      invalidate();
      toast({ title: "Report updated" });
      setManaging(null);
    },
    onError: (e: any) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-primary" />
              Compliance Hotline Reports
            </CardTitle>
            <CardDescription>Element 4 — any staff member can submit a report; leave reporter fields blank to stay anonymous.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setSubmitOpen(true)} data-testid="button-submit-report">
            <Siren className="h-4 w-4 mr-2" />Submit Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!canManage ? (
          <p className="text-sm text-muted-foreground py-4">
            You can submit a report using the button above. Only administrators can view and manage submitted reports.
          </p>
        ) : isLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <PhoneCall className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hotline reports on file.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report #</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id} data-testid={`row-hotline-${r.id}`}>
                  <TableCell className="font-medium text-sm">{r.reportNumber}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{HOTLINE_CATEGORIES[r.category] || r.category}</Badge></TableCell>
                  <TableCell><Badge className={`border-0 text-xs ${SEVERITY_STYLES[r.severity || "medium"]}`}>{r.severity}</Badge></TableCell>
                  <TableCell className="text-sm">{formatDateOnly(r.receivedAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.isAnonymous ? "Anonymous" : (r.reporterName || "—")}</TableCell>
                  <TableCell><Badge className={`border-0 text-xs ${STATUS_STYLES[r.status]}`}>{r.status.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setManaging(r)} data-testid={`button-manage-hotline-${r.id}`}>
                        Manage
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={submitOpen} onOpenChange={(o) => { setSubmitOpen(o); if (!o) form.reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Compliance Report</DialogTitle>
            <DialogDescription>Report fraud, waste, abuse, HIPAA/privacy, safety, or conduct concerns. Check "remain anonymous" to leave your name and contact off the record.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="isAnonymous" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-anonymous" />
                  </FormControl>
                  <FormLabel className="font-normal">I wish to remain anonymous</FormLabel>
                </FormItem>
              )} />
              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="reporterName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-reporter-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reporterContact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Contact</FormLabel>
                      <FormControl><Input {...field} data-testid="input-reporter-contact" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-hotline-category"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(HOTLINE_CATEGORIES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="severity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-hotline-severity"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Textarea rows={4} placeholder="What happened, when, who was involved..." {...field} data-testid="input-hotline-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitMutation.isPending} data-testid="button-submit-hotline">
                  {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Report
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managing} onOpenChange={(o) => !o && setManaging(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Report {managing?.reportNumber}</DialogTitle>
            <DialogDescription>{managing?.description}</DialogDescription>
          </DialogHeader>
          {managing && (
            <ManageHotlineForm
              report={managing}
              onSave={(data) => updateMutation.mutate({ id: managing.id, data })}
              isSaving={updateMutation.isPending}
              onCancel={() => setManaging(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ManageHotlineForm({
  report, onSave, isSaving, onCancel,
}: {
  report: ComplianceHotlineReport;
  onSave: (data: Partial<ComplianceHotlineReport>) => void;
  isSaving: boolean;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(report.status);
  const [correctiveAction, setCorrectiveAction] = useState(report.correctiveAction || "");
  const [resolutionNotes, setResolutionNotes] = useState(report.resolutionNotes || "");

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Status</label>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger data-testid="select-manage-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="under_investigation">Under Investigation</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Corrective Action</label>
        <Textarea rows={2} value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} data-testid="input-corrective-action" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Resolution Notes</label>
        <Textarea rows={2} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} data-testid="input-resolution-notes" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          type="button"
          disabled={isSaving}
          onClick={() => onSave({ status: status as any, correctiveAction: correctiveAction || undefined, resolutionNotes: resolutionNotes || undefined })}
          data-testid="button-save-hotline-management"
        >
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ComplianceProgram() {
  const { selectedOfficeId, setSelectedOfficeId, isAllOffices, canMutate } = useOfficeScope();
  const { user } = useAuth();
  const isAdmin = ["admin", "office_admin", "super_admin"].includes((user as any)?.role);
  const officeId = isAllOffices ? undefined : selectedOfficeId;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Compliance Program" subtitle="OIG Seven Elements of an Effective Compliance Program" />
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ShieldQuestion className="h-6 w-6 text-primary" />
                  Compliance Program
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Designated officer/committee, anonymous hotline, and how each of the seven elements is covered
                </p>
              </div>
              <OfficeSelector selectedOfficeId={isAllOffices ? undefined : selectedOfficeId} onOfficeChange={setSelectedOfficeId} />
            </div>

            {isAllOffices && (
              <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
                <CardContent className="pt-4 flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">Viewing all offices. Select a specific office to manage designations or reports.</span>
                </CardContent>
              </Card>
            )}

            <SevenElementsOverview officeId={officeId} />
            <ComplianceOfficersSection officeId={officeId} canMutate={canMutate && isAdmin} />
            <HotlineReportsSection officeId={officeId} canManage={isAdmin} />
          </div>
        </div>
      </main>
    </div>
  );
}
