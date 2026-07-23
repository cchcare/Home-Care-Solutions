import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOfficeScope } from "@/context/office-context";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { OfficeSelector } from "@/components/office-selector";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  BadgeCheck, Plus, Sparkles, Pencil, Trash2, RefreshCw, Loader2,
  AlertTriangle, Bot, CheckCircle2,
} from "lucide-react";
import { formatDateOnly, toDateOnlyInputValue, parseDateOnlyInput } from "@/lib/dateOnly";
import type { OfficeCredential, Mco } from "@shared/schema";

const CREDENTIAL_TYPES: Record<string, string> = {
  pa_doh_license: "PA DOH License",
  promise_revalidation: "PROMISe / OLTL Revalidation",
  medicare_enrollment: "CMS / Medicare Enrollment",
  mco_credentialing: "MCO Recredentialing",
  fwa_training: "FWA Training & Attestation",
  liability_insurance: "Liability Insurance",
  workers_comp: "Workers' Comp",
  surety_bond: "Surety Bond",
  other: "Other",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  renewal_in_progress: { label: "Renewal In Progress", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  expired: { label: "Expired", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  not_applicable: { label: "N/A", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const formSchema = z.object({
  credentialType: z.string().min(1, "Type is required"),
  mcoId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  identifier: z.string().optional(),
  issuedBy: z.string().optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  renewalCadenceMonths: z.string().optional(),
  renewalLeadTimeDays: z.string().optional(),
  status: z.string().default("active"),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

interface ComplianceAction {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  dueDate: string | null;
  category: string;
}
interface ComplianceInsights {
  source: "ai" | "rules";
  generatedAt: string;
  summary: string;
  actions: ComplianceAction[];
}

function expirationBadge(credential: OfficeCredential) {
  if (!credential.expirationDate) {
    return <Badge variant="outline" className="border-yellow-500 text-yellow-700">No date set</Badge>;
  }
  const expiration = new Date(credential.expirationDate);
  const now = new Date();
  const days = Math.ceil((expiration.getTime() - now.getTime()) / 86400000);
  const leadDays = credential.renewalLeadTimeDays ?? 0;
  if (days < 0) {
    return <Badge variant="destructive">Expired {Math.abs(days)}d ago</Badge>;
  }
  if (days <= leadDays) {
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0">Renewal window — {days}d to expiry</Badge>;
  }
  if (days <= leadDays + 30) {
    return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-0">{days}d — submit in {days - leadDays}d</Badge>;
  }
  return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">{days}d left</Badge>;
}

function AiInsightsCard({ officeId }: { officeId: string | undefined }) {
  const { data: insights, isLoading, refetch, isFetching } = useQuery<ComplianceInsights>({
    queryKey: ["/api/compliance/ai-insights", officeId],
    queryFn: async () => {
      const params = officeId && officeId !== "all" ? `?officeId=${officeId}` : "";
      const r = await fetch(`/api/compliance/ai-insights${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load insights");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Daily Compliance Action Plan
            {insights && (
              <Badge variant="outline" className="text-xs font-normal">
                {insights.source === "ai" ? "AI-prioritized" : "Rule-based"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Everything the trackers know — expiring credentials, overdue reports, filing deadlines — turned into a worked list.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-insights">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !insights || insights.actions.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {insights?.summary || "No outstanding compliance actions."}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">{insights.summary}</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {insights.actions.map((action, i) => (
                <div key={i} className="border rounded-lg p-3 flex items-start gap-3" data-testid={`insight-action-${i}`}>
                  <Badge className={`border-0 shrink-0 ${PRIORITY_STYLES[action.priority]}`}>{action.priority}</Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{action.title}</p>
                    {action.detail && <p className="text-xs text-muted-foreground mt-0.5">{action.detail}</p>}
                    {action.dueDate && (
                      <p className="text-xs text-muted-foreground mt-0.5">Due {formatDateOnly(action.dueDate)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OfficeCredentials() {
  const { selectedOfficeId, setSelectedOfficeId, isAllOffices, canMutate } = useOfficeScope();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OfficeCredential | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: credentials = [], isLoading } = useQuery<OfficeCredential[]>({
    queryKey: ["/api/office-credentials", selectedOfficeId],
    queryFn: async () => {
      const params = isAllOffices ? "" : `?officeId=${selectedOfficeId}`;
      const r = await fetch(`/api/office-credentials${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch credentials");
      return r.json();
    },
  });

  const { data: mcos = [] } = useQuery<Mco[]>({ queryKey: ["/api/mcos"] });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      credentialType: "", mcoId: "", name: "", identifier: "", issuedBy: "",
      effectiveDate: "", expirationDate: "", renewalCadenceMonths: "12",
      renewalLeadTimeDays: "60", status: "active", notes: "",
    },
  });
  const watchedType = form.watch("credentialType");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/office-credentials"] });
    queryClient.invalidateQueries({ queryKey: ["/api/compliance/ai-insights"] });
  };

  const buildPayload = (data: FormData) => ({
    credentialType: data.credentialType,
    mcoId: data.mcoId || undefined,
    name: data.name,
    identifier: data.identifier || undefined,
    issuedBy: data.issuedBy || undefined,
    effectiveDate: data.effectiveDate ? parseDateOnlyInput(data.effectiveDate) : null,
    expirationDate: data.expirationDate ? parseDateOnlyInput(data.expirationDate) : null,
    renewalCadenceMonths: data.renewalCadenceMonths ? parseInt(data.renewalCadenceMonths, 10) : undefined,
    renewalLeadTimeDays: data.renewalLeadTimeDays ? parseInt(data.renewalLeadTimeDays, 10) : undefined,
    status: data.status,
    notes: data.notes || undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (editing) return apiRequest("PUT", `/api/office-credentials/${editing.id}`, buildPayload(data));
      return apiRequest("POST", "/api/office-credentials", { ...buildPayload(data), officeId: selectedOfficeId });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: editing ? "Credential updated" : "Credential added" });
      setOpen(false); setEditing(null); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/office-credentials/seed-pa-defaults", { officeId: selectedOfficeId }),
    onSuccess: async (res: Response) => {
      const result = await res.json();
      invalidate();
      if (result.created?.length) {
        toast({ title: `Added ${result.created.length} credential(s)`, description: "Enter each credential's real expiration date so reminders can fire." });
      } else {
        toast({ title: "All recommended PA credentials already exist for this office" });
      }
    },
    onError: (e: any) => toast({ title: "Failed to seed credentials", description: e.message, variant: "destructive" }),
  });

  const renewMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/office-credentials/${id}/renew`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Credential renewed", description: "Expiration advanced by the renewal cadence." });
    },
    onError: (e: any) => toast({ title: "Failed to renew", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/office-credentials/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Credential deleted" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openEdit = (credential: OfficeCredential) => {
    setEditing(credential);
    form.reset({
      credentialType: credential.credentialType,
      mcoId: credential.mcoId || "",
      name: credential.name,
      identifier: credential.identifier || "",
      issuedBy: credential.issuedBy || "",
      effectiveDate: toDateOnlyInputValue(credential.effectiveDate),
      expirationDate: toDateOnlyInputValue(credential.expirationDate),
      renewalCadenceMonths: credential.renewalCadenceMonths != null ? String(credential.renewalCadenceMonths) : "",
      renewalLeadTimeDays: credential.renewalLeadTimeDays != null ? String(credential.renewalLeadTimeDays) : "",
      status: credential.status || "active",
      notes: credential.notes || "",
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.reset({
      credentialType: "", mcoId: "", name: "", identifier: "", issuedBy: "",
      effectiveDate: "", expirationDate: "", renewalCadenceMonths: "12",
      renewalLeadTimeDays: "60", status: "active", notes: "",
    });
    setOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Agency Credentials" subtitle="Licenses, payer enrollment, MCO credentialing, and required attestations for each office" />
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BadgeCheck className="h-6 w-6 text-primary" />
                  Agency Credentials
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  PA DOH license, PROMISe/OLTL revalidation, CMS enrollment, MCO recredentialing, FWA attestations, insurance
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <OfficeSelector selectedOfficeId={isAllOffices ? undefined : selectedOfficeId} onOfficeChange={setSelectedOfficeId} />
                <Button
                  variant="outline"
                  disabled={!canMutate || seedMutation.isPending}
                  onClick={() => seedMutation.mutate()}
                  title={!canMutate ? "Select a specific office first" : "Add the recommended PA credential set (DOH license, PROMISe, FWA, insurance, one row per configured MCO)"}
                  data-testid="button-seed-pa-credentials"
                >
                  {seedMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Add PA Recommended Set
                </Button>
                <Button onClick={openCreate} disabled={!canMutate} data-testid="button-add-credential">
                  <Plus className="h-4 w-4 mr-2" />Add Credential
                </Button>
              </div>
            </div>

            {isAllOffices && (
              <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
                <CardContent className="pt-4 flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">Viewing all offices. Select a specific office to add, seed, or edit credentials.</span>
                </CardContent>
              </Card>
            )}

            <AiInsightsCard officeId={isAllOffices ? undefined : selectedOfficeId} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tracked Credentials</CardTitle>
                <CardDescription>
                  Renewal reminders fire from the submission deadline (expiration minus lead time), through the daily expiration-alert emails.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : credentials.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <BadgeCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No credentials tracked yet</p>
                    <p className="text-sm mt-1">Use "Add PA Recommended Set" to start with the standard PA home care set.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Credential</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Identifier</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Renewal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {credentials.map((credential) => (
                        <TableRow key={credential.id} data-testid={`row-credential-${credential.id}`}>
                          <TableCell>
                            <p className="font-medium text-sm">{credential.name}</p>
                            {credential.issuedBy && <p className="text-xs text-muted-foreground">{credential.issuedBy}</p>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{CREDENTIAL_TYPES[credential.credentialType] || credential.credentialType}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{credential.identifier || "—"}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm">{formatDateOnly(credential.expirationDate) || "—"}</p>
                              {expirationBadge(credential)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {credential.renewalCadenceMonths ? `Every ${credential.renewalCadenceMonths} mo` : "—"}
                            {credential.renewalLeadTimeDays ? <><br />Submit {credential.renewalLeadTimeDays}d early</> : null}
                          </TableCell>
                          <TableCell>
                            <Badge className={`border-0 text-xs ${STATUS_LABELS[credential.status || "active"]?.className}`}>
                              {STATUS_LABELS[credential.status || "active"]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {canMutate && credential.expirationDate && (
                                <Button
                                  size="sm" variant="outline" className="h-7 text-xs px-2"
                                  onClick={() => renewMutation.mutate(credential.id)}
                                  disabled={renewMutation.isPending}
                                  title="Stamp renewed and advance the expiration by the cadence"
                                  data-testid={`button-renew-${credential.id}`}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />Renewed
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canMutate} onClick={() => openEdit(credential)} data-testid={`button-edit-${credential.id}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={!canMutate} onClick={() => setDeleteId(credential.id)} data-testid={`button-delete-${credential.id}`}>
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
            </Card>

            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); form.reset(); } }}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Credential" : "Add Credential"}</DialogTitle>
                  <DialogDescription>Track an agency-level license, enrollment, credentialing cycle, or policy</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="credentialType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger data-testid="select-credential-type"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.entries(CREDENTIAL_TYPES).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {(watchedType === "mco_credentialing" || watchedType === "fwa_training") && (
                        <FormField control={form.control} name="mcoId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>MCO</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger data-testid="select-credential-mco"><SelectValue placeholder="Select MCO" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {mcos.map((mco) => <SelectItem key={mco.id} value={mco.id}>{mco.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Name *</FormLabel>
                          <FormControl><Input placeholder="e.g., PA DOH Home Care Agency License" {...field} data-testid="input-credential-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="identifier" render={({ field }) => (
                        <FormItem>
                          <FormLabel>License / ID Number</FormLabel>
                          <FormControl><Input placeholder="License #, PROMISe ID, policy #..." {...field} data-testid="input-credential-identifier" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="issuedBy" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issued By</FormLabel>
                          <FormControl><Input placeholder="PA DOH, DHS/OLTL, CMS, carrier..." {...field} data-testid="input-credential-issued-by" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="effectiveDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Effective Date</FormLabel>
                          <FormControl><Input type="date" {...field} data-testid="input-credential-effective" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="expirationDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiration / Revalidation Due</FormLabel>
                          <FormControl><Input type="date" {...field} data-testid="input-credential-expiration" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="renewalCadenceMonths" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Renewal Cadence (months)</FormLabel>
                          <FormControl><Input type="number" placeholder="12" {...field} data-testid="input-credential-cadence" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="renewalLeadTimeDays" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Submission Lead Time (days)</FormLabel>
                          <FormControl><Input type="number" placeholder="60" {...field} data-testid="input-credential-lead-time" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger data-testid="select-credential-status"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="renewal_in_progress">Renewal In Progress</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="not_applicable">Not Applicable</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl><Textarea rows={3} placeholder="Regulation reference, portal login location, contact..." {...field} data-testid="input-credential-notes" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-credential">
                        {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {editing ? "Save Changes" : "Add Credential"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
              <DialogContent>
                <DialogHeader><DialogTitle>Delete Credential?</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Renewal reminders for this credential will stop.</p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                  <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete">
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
