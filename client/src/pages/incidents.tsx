import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonCombobox } from "@/components/ui/person-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { OfficeSelector } from "@/components/office-selector";
import { useOfficeScope } from "@/context/office-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIncidentReportSchema, type IncidentReport } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Search, Eye, Calendar, User, MapPin, Clock, FileWarning, CheckCircle2, AlertCircle } from "lucide-react";
import { format, differenceInHours, differenceInCalendarDays } from "date-fns";
import { z } from "zod";
import { useUrlState } from "@/hooks/use-url-state";
import { useSavedViews } from "@/hooks/use-saved-views";
import { MultiSelectPopover } from "@/components/filters/multi-select-popover";
import { ActiveFilterChips, type FilterChip } from "@/components/filters/active-filter-chips";
import { ColumnsMenu, type ColumnDef } from "@/components/filters/columns-menu";
import { SavedViewsMenu } from "@/components/filters/saved-views-menu";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "under_investigation", label: "Under Investigation" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const CIR_CLASS_OPTIONS = [
  { value: "class_1", label: "CIR Class I (24h)" },
  { value: "class_2", label: "CIR Class II (5d)" },
  { value: "not_applicable", label: "Not Applicable" },
];

const DOH_STATUS_OPTIONS = [
  { value: "not_required", label: "Not Required" },
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "acknowledged", label: "Acknowledged" },
];

const COLUMN_DEFS: ColumnDef[] = [
  { key: "summary", label: "Title & Badges" },
  { key: "person", label: "Person / Date / Location" },
  { key: "description", label: "Description" },
  { key: "injuries", label: "Injuries" },
  { key: "followUp", label: "Follow-up" },
  { key: "notifications", label: "Notifications" },
  { key: "actions", label: "Actions" },
];

const REQUIRED_COLUMNS = new Set(["summary", "actions"]);

function downloadIncidentsCsv(
  rows: IncidentReport[],
  resolveName: (i: IncidentReport) => string,
  visibility: Record<string, boolean>,
) {
  const isVisible = (k: string) => visibility[k] !== false;
  const fmtDate = (d: unknown) => (d ? new Date(d as string).toISOString() : "");
  type Field = { header: string; accessor: (i: IncidentReport) => unknown };
  const fields: Field[] = [
    { header: "ID", accessor: (i) => i.id },
    { header: "Incident Type", accessor: (i) => i.incidentType },
    { header: "Severity", accessor: (i) => i.severity },
    { header: "Status", accessor: (i) => i.status },
  ];
  if (isVisible("person")) {
    fields.push(
      { header: "Entity Type", accessor: (i) => i.entityType },
      { header: "Person", accessor: (i) => resolveName(i) },
      { header: "Incident Date", accessor: (i) => fmtDate(i.incidentDate) },
      { header: "Location", accessor: (i) => i.location ?? "" },
    );
  }
  if (isVisible("description")) {
    fields.push({ header: "Description", accessor: (i) => i.description });
  }
  if (isVisible("injuries")) {
    fields.push({ header: "Injuries", accessor: (i) => i.injuries ?? "" });
  }
  if (isVisible("followUp")) {
    fields.push(
      { header: "Follow-up Required", accessor: (i) => (i.followUpRequired ? "Yes" : "No") },
      { header: "Follow-up Date", accessor: (i) => fmtDate(i.followUpDate) },
    );
  }
  if (isVisible("notifications")) {
    fields.push(
      { header: "Notified Family", accessor: (i) => (i.notifiedFamily ? "Yes" : "No") },
      { header: "Notified Doctor", accessor: (i) => (i.notifiedDoctor ? "Yes" : "No") },
      { header: "Notified Agency", accessor: (i) => (i.notifiedAgency ? "Yes" : "No") },
    );
  }
  fields.push(
    { header: "CIR Class", accessor: (i) => (i as any).cirClass ?? "" },
    { header: "DOH Submission Status", accessor: (i) => (i as any).dohSubmissionStatus ?? "" },
    { header: "DOH Report Due", accessor: (i) => fmtDate((i as any).dohReportDue) },
    { header: "SC Notification Status", accessor: (i) => (i as any).scNotificationStatus ?? "" },
    { header: "SC Notification Due", accessor: (i) => fmtDate((i as any).scNotificationDue) },
    { header: "Service Coordinator", accessor: (i) => (i as any).serviceCoordinatorName ?? "" },
    { header: "Created At", accessor: (i) => fmtDate(i.createdAt) },
  );

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [fields.map((f) => f.header).join(",")];
  for (const i of rows) {
    lines.push(fields.map((f) => escape(f.accessor(i))).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `incidents-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const incidentFormSchema = insertIncidentReportSchema.extend({
  incidentDate: z.string().min(1, "Incident date is required"),
  followUpDate: z.string().optional(),
  cirClass: z.string().optional(),
  dohSubmissionStatus: z.string().optional(),
}).omit({ reportedBy: true });

type IncidentFormData = z.infer<typeof incidentFormSchema>;

export default function IncidentsPage() {
  const [open, setOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOfficeId, setSelectedOfficeId, isAllOffices, canMutate, viewOnlyMessage } = useOfficeScope();

  // URL-as-source-of-truth filters
  const url = useUrlState("/incidents");
  const search = url.getString("search");
  const statuses = url.getList("statuses");
  const severities = url.getList("severities");
  const cirClasses = url.getList("cirClasses");
  const dohStatuses = url.getList("dohStatuses");
  const from = url.getString("from");
  const to = url.getString("to");

  // Debounced search input
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput.trim() !== search) {
        url.setOne("search", searchInput.trim() || null);
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, search]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openId = params.get("openId");
    if (openId) {
      setHighlightId(openId);
      params.delete("openId");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedOfficeId !== "all") p.set("officeId", selectedOfficeId);
    if (search) p.set("search", search);
    if (statuses.length) p.set("statuses", statuses.join(","));
    if (severities.length) p.set("severities", severities.join(","));
    if (cirClasses.length) p.set("cirClasses", cirClasses.join(","));
    if (dohStatuses.length) p.set("dohStatuses", dohStatuses.join(","));
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [selectedOfficeId, search, statuses, severities, cirClasses, dohStatuses, from, to]);

  const { data: incidents = [], isLoading } = useQuery<IncidentReport[]>({
    queryKey: ["/api/incident-reports", queryParams],
    queryFn: () => fetch(
      queryParams ? `/api/incident-reports?${queryParams}` : "/api/incident-reports",
      { credentials: "include" },
    ).then(r => r.json()),
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: caregivers = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const markDohSubmittedMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const response = await fetch(`/api/incident-reports/${incidentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dohSubmissionStatus: "submitted", dohSubmittedAt: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incident-reports"] });
      toast({ title: "DOH Submission Recorded", description: "Incident marked as submitted to DOH" });
    },
  });

  const markScNotifiedMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const response = await fetch(`/api/incident-reports/${incidentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scNotificationStatus: "notified", scNotifiedAt: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incident-reports"] });
      toast({ title: "Service Coordinator Notification Recorded" });
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: IncidentFormData) => {
      const payload = {
        ...data,
        incidentDate: new Date(data.incidentDate).toISOString(),
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : null,
      };
      const response = await fetch("/api/incident-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create incident report");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incident-reports"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Incident report created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create incident report",
        variant: "destructive",
      });
    },
  });

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      entityType: "client",
      entityId: "",
      incidentDate: "",
      incidentType: "",
      incidentCategory: "safety",
      location: "",
      description: "",
      injuries: "",
      witnessesPresent: false,
      witnessNames: "",
      severity: "low",
      immediateActions: "",
      actionsTaken: "",
      preventiveMeasures: "",
      followUpRequired: false,
      followUpDate: "",
      followUpNotes: "",
      notifiedFamily: false,
      notifiedDoctor: false,
      notifiedAgency: false,
      status: "open",
      resolution: "",
      cirClass: "not_applicable",
      dohSubmissionStatus: "not_required",
      scNotificationRequired: false,
      serviceCoordinatorName: "",
      serviceCoordinatorContact: "",
      scNotificationStatus: "not_required",
    },
  });

  const entityType = form.watch("entityType");
  const followUpRequired = form.watch("followUpRequired");
  const cirClass = form.watch("cirClass");
  const scNotificationRequired = form.watch("scNotificationRequired");

  const getCirDeadlineHours = (cls: string | undefined) => {
    if (cls === "class_1") return 24;
    if (cls === "class_2") return 120; // 5 calendar days
    return null;
  };

  const getCirDeadlineCountdown = (incident: IncidentReport) => {
    const inc = incident as any;
    if (!inc.dohReportDue || inc.dohSubmissionStatus === "submitted" || inc.dohSubmissionStatus === "acknowledged" || inc.dohSubmissionStatus === "not_required") return null;
    const due = new Date(inc.dohReportDue);
    const now = new Date();
    const hoursLeft = differenceInHours(due, now);
    const daysLeft = differenceInCalendarDays(due, now);
    if (hoursLeft < 0) return { label: `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""}`, variant: "overdue" as const };
    if (hoursLeft < 24) return { label: `Due in ${hoursLeft}h`, variant: "urgent" as const };
    return { label: `Due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`, variant: "warning" as const };
  };

  const getScDeadlineCountdown = (incident: IncidentReport) => {
    const inc = incident as any;
    if (!inc.scNotificationDue || inc.scNotificationStatus === "notified" || inc.scNotificationStatus === "not_required") return null;
    const due = new Date(inc.scNotificationDue);
    const now = new Date();
    const hoursLeft = differenceInHours(due, now);
    if (hoursLeft < 0) return { label: `SC notification overdue`, variant: "overdue" as const };
    return { label: `Notify SC in ${hoursLeft}h`, variant: hoursLeft < 6 ? ("urgent" as const) : ("warning" as const) };
  };

  const onSubmit = (data: IncidentFormData) => {
    const deadlineHours = getCirDeadlineHours(data.cirClass);
    const payload: any = { ...data };
    if (selectedOfficeId && selectedOfficeId !== "all") {
      payload.officeId = selectedOfficeId;
    }
    if (deadlineHours && data.incidentDate) {
      const incDate = new Date(data.incidentDate);
      incDate.setHours(incDate.getHours() + deadlineHours);
      payload.dohReportDue = incDate.toISOString();
      payload.dohSubmissionStatus = "pending";
    }
    if (data.scNotificationRequired && data.incidentDate) {
      const scDue = new Date(data.incidentDate);
      scDue.setHours(scDue.getHours() + 24);
      payload.scNotificationDue = scDue.toISOString();
      payload.scNotificationStatus = "pending";
    }
    createIncidentMutation.mutate(payload);
  };

  const filteredIncidents = incidents;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "destructive";
      case "under_investigation": return "default";
      case "resolved": return "default";
      case "closed": return "secondary";
      default: return "secondary";
    }
  };

  const getEntityName = (incident: IncidentReport) => {
    if (incident.entityType === "client") {
      const client = clients.find((c: any) => c.id === incident.entityId);
      return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
    } else if (incident.entityType === "caregiver") {
      const caregiver = caregivers.find((c: any) => c.id === incident.entityId);
      return caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : "Unknown Caregiver";
    } else {
      const user = users.find((u: any) => u.id === incident.entityId);
      return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : "Unknown Staff";
    }
  };

  // Saved views and column prefs
  const {
    views,
    columnPrefs,
    saveView,
    deleteView,
    renameView,
    setColumnPrefs,
  } = useSavedViews("incidents");

  const visibility = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const c of COLUMN_DEFS) {
      out[c.key] = columnPrefs[c.key] !== false;
    }
    return out;
  }, [columnPrefs]);

  const isVisible = (key: string) => visibility[key] !== false;

  const labelFor = (opts: { value: string; label: string }[], v: string) =>
    opts.find((o) => o.value === v)?.label ?? v;

  const activeFilters: Record<string, unknown> = {
    search: search || undefined,
    statuses: statuses.length ? statuses : undefined,
    severities: severities.length ? severities : undefined,
    cirClasses: cirClasses.length ? cirClasses : undefined,
    dohStatuses: dohStatuses.length ? dohStatuses : undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const chips: FilterChip[] = [];
  if (search) {
    chips.push({
      key: "search",
      label: "Search",
      value: search,
      onRemove: () => url.setOne("search", null),
    });
  }
  if (statuses.length) {
    chips.push({
      key: "statuses",
      label: "Status",
      value: statuses.map((s) => labelFor(STATUS_OPTIONS, s)).join(", "),
      onRemove: () => url.setOne("statuses", null),
    });
  }
  if (severities.length) {
    chips.push({
      key: "severities",
      label: "Severity",
      value: severities.map((s) => labelFor(SEVERITY_OPTIONS, s)).join(", "),
      onRemove: () => url.setOne("severities", null),
    });
  }
  if (cirClasses.length) {
    chips.push({
      key: "cirClasses",
      label: "CIR Class",
      value: cirClasses.map((s) => labelFor(CIR_CLASS_OPTIONS, s)).join(", "),
      onRemove: () => url.setOne("cirClasses", null),
    });
  }
  if (dohStatuses.length) {
    chips.push({
      key: "dohStatuses",
      label: "DOH Status",
      value: dohStatuses.map((s) => labelFor(DOH_STATUS_OPTIONS, s)).join(", "),
      onRemove: () => url.setOne("dohStatuses", null),
    });
  }
  if (from) {
    chips.push({
      key: "from",
      label: "From",
      value: from,
      onRemove: () => url.setOne("from", null),
    });
  }
  if (to) {
    chips.push({
      key: "to",
      label: "To",
      value: to,
      onRemove: () => url.setOne("to", null),
    });
  }

  const applySavedView = (filters: Record<string, unknown>) => {
    const next: Record<string, string | string[] | null> = {
      search: null,
      statuses: null,
      severities: null,
      cirClasses: null,
      dohStatuses: null,
      from: null,
      to: null,
    };
    for (const [k, v] of Object.entries(filters)) {
      if (Array.isArray(v)) next[k] = v as string[];
      else if (v == null) next[k] = null;
      else next[k] = String(v);
    }
    url.setMany(next);
  };

  const handleExportCsv = () => {
    if (incidents.length === 0) {
      toast({ title: "No incidents to export", description: "Adjust your filters and try again." });
      return;
    }
    downloadIncidentsCsv(incidents, getEntityName, visibility);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Critical Incident Reports"
          subtitle="Record and track incidents for clients, caregivers, and staff"
        />
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {isAllOffices && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-md text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {viewOnlyMessage}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Critical Incident Reports</h1>
                <p className="text-muted-foreground">
                  Record and track incidents for clients, caregivers, and staff
                </p>
              </div>
              <div className="flex items-center gap-4">
                <OfficeSelector
                  selectedOfficeId={selectedOfficeId === "all" ? undefined : selectedOfficeId}
                  onOfficeChange={setSelectedOfficeId}
                  showAllOption={true}
                />
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      data-testid="button-create-incident"
                      disabled={!canMutate}
                      title={!canMutate ? viewOnlyMessage : undefined}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Report Incident
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Incident Report</DialogTitle>
                      <DialogDescription>
                        Record a critical incident involving a client, caregiver, or staff member
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="entityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Involves</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-entity-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="caregiver">Caregiver</SelectItem>
                            <SelectItem value="staff">Staff Member</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="entityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {entityType === "client" ? "Client" : entityType === "caregiver" ? "Caregiver" : "Staff Member"}
                        </FormLabel>
                        {entityType === "staff" ? (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-entity-id">
                                <SelectValue placeholder="Select staff" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName || ''} {user.lastName || ''} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <PersonCombobox
                            people={(entityType === "client" ? clients : caregivers) as any[]}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder={`Select ${entityType}`}
                            testId="select-entity-id"
                          />
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="incidentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Date & Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field} 
                            data-testid="input-incident-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incidentCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-incident-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="safety">Safety</SelectItem>
                            <SelectItem value="medical">Medical</SelectItem>
                            <SelectItem value="behavioral">Behavioral</SelectItem>
                            <SelectItem value="environmental">Environmental</SelectItem>
                            <SelectItem value="medication">Medication</SelectItem>
                            <SelectItem value="fall">Fall</SelectItem>
                            <SelectItem value="injury">Injury</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-severity">
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="incidentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Type</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Fall, Medication Error, Behavioral Issue"
                            {...field} 
                            data-testid="input-incident-type"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Where did the incident occur?"
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide a detailed description of what happened..."
                          rows={4}
                          {...field} 
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="injuries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Injuries Sustained</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe any injuries, if applicable..."
                          rows={2}
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-injuries"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="witnessesPresent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-witnesses-present"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Were there witnesses present?</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch("witnessesPresent") && (
                    <FormField
                      control={form.control}
                      name="witnessNames"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Witness Names</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="List witness names (comma separated)"
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-witness-names"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="immediateActions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Immediate Actions Taken</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What actions were taken immediately after the incident?"
                          rows={3}
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-immediate-actions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="notifiedFamily"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-notified-family"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Family Notified</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notifiedDoctor"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-notified-doctor"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Doctor Notified</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notifiedAgency"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-notified-agency"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Agency Notified</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="followUpRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-follow-up-required"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Follow-up Required</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {followUpRequired && (
                    <FormField
                      control={form.control}
                      name="followUpDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow-up Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field} 
                              data-testid="input-follow-up-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* DOH CIR Classification */}
                <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-red-600" />
                    <h4 className="font-medium text-sm text-red-800 dark:text-red-300">DOH Critical Incident Report (CIR) Classification</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cirClass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CIR Classification</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "not_applicable"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-cir-class">
                                <SelectValue placeholder="Select classification" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="not_applicable">Not Applicable</SelectItem>
                              <SelectItem value="class_1">Class I — Death or Serious Injury (24-hr report)</SelectItem>
                              <SelectItem value="class_2">Class II — Less Serious (5-day report)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {cirClass && cirClass !== "not_applicable" && (
                      <div className="flex items-end pb-2">
                        <div className={`text-sm px-3 py-2 rounded-md w-full ${cirClass === "class_1" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200"}`}>
                          <div className="font-medium">
                            {cirClass === "class_1" ? "⚠ Class I — DOH report required within 24 hours" : "⚠ Class II — DOH report required within 5 calendar days"}
                          </div>
                          <div className="text-xs mt-1 opacity-80">Deadline auto-calculated from incident date/time</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CHC Service Coordinator Notification */}
                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300">CHC Service Coordinator Notification</h4>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    For Community HealthChoices (CHC) waiver participants, notify the participant's Service
                    Coordinator within 24 hours — the SC/MCO logs it in the state's incident-management system,
                    separately from any DOH report above.
                  </p>
                  <FormField
                    control={form.control}
                    name="scNotificationRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-sc-notification-required"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Client is a CHC waiver participant — Service Coordinator notification required</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  {scNotificationRequired && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="serviceCoordinatorName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Coordinator Name</FormLabel>
                              <FormControl>
                                <Input placeholder="SC name" {...field} value={field.value || ""} data-testid="input-sc-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="serviceCoordinatorContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Coordinator Contact</FormLabel>
                              <FormControl>
                                <Input placeholder="Phone or email" {...field} value={field.value || ""} data-testid="input-sc-contact" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="text-sm px-3 py-2 rounded-md w-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                        <div className="font-medium">⚠ Service Coordinator must be notified within 24 hours</div>
                        <div className="text-xs mt-1 opacity-80">Deadline auto-calculated from incident date/time</div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createIncidentMutation.isPending}
                    data-testid="button-submit-incident"
                  >
                    {createIncidentMutation.isPending ? "Creating..." : "Create Report"}
                  </Button>
                </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by type, description, location, injuries…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
                data-testid="input-search-incidents"
              />
            </div>

            <MultiSelectPopover
              label="Status"
              placeholder="Status"
              options={STATUS_OPTIONS}
              values={statuses}
              onChange={(next) => url.setOne("statuses", next.length ? next : null)}
              testId="filter-statuses"
            />

            <MultiSelectPopover
              label="Severity"
              placeholder="Severity"
              options={SEVERITY_OPTIONS}
              values={severities}
              onChange={(next) => url.setOne("severities", next.length ? next : null)}
              testId="filter-severities"
            />

            <MultiSelectPopover
              label="CIR Class"
              placeholder="CIR Class"
              options={CIR_CLASS_OPTIONS}
              values={cirClasses}
              onChange={(next) => url.setOne("cirClasses", next.length ? next : null)}
              testId="filter-cir-classes"
            />

            <MultiSelectPopover
              label="DOH Status"
              placeholder="DOH Status"
              options={DOH_STATUS_OPTIONS}
              values={dohStatuses}
              onChange={(next) => url.setOne("dohStatuses", next.length ? next : null)}
              testId="filter-doh-statuses"
            />

            <Input
              type="date"
              value={from}
              onChange={(e) => url.setOne("from", e.target.value || null)}
              className="w-[160px]"
              aria-label="From date"
              data-testid="input-from-date"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => url.setOne("to", e.target.value || null)}
              className="w-[160px]"
              aria-label="To date"
              data-testid="input-to-date"
            />

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                data-testid="button-export-csv"
              >
                Export CSV
              </Button>
              <SavedViewsMenu
                views={views}
                currentFilters={activeFilters}
                onApply={applySavedView}
                onSave={(input) => saveView.mutateAsync(input)}
                onDelete={(id) => deleteView.mutateAsync(id)}
                onRename={(input) => renameView.mutateAsync(input)}
              />
              <ColumnsMenu
                columns={COLUMN_DEFS}
                visibility={visibility}
                onChange={(next) => {
                  const safe: Record<string, boolean> = { ...next };
                  REQUIRED_COLUMNS.forEach((k) => { safe[k] = true; });
                  setColumnPrefs.mutate(safe);
                }}
              />
            </div>
          </div>

          {chips.length > 0 && (
            <ActiveFilterChips
              chips={chips}
              onClearAll={() => url.clearAll()}
            />
          )}
        </CardContent>
      </Card>

      {/* Incidents List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredIncidents.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">No incidents found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {chips.length > 0
                    ? "Try adjusting your filters"
                    : "No incident reports have been created yet"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredIncidents.map((incident: IncidentReport) => (
            <Card
              key={incident.id}
              ref={(el) => {
                cardRefs.current[incident.id] = el;
                if (el && highlightId === incident.id) {
                  requestAnimationFrame(() => {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                  });
                }
              }}
              className={`hover:shadow-md transition-shadow ${highlightId === incident.id ? "ring-2 ring-primary ring-offset-2 animate-pulse" : ""}`}
              data-testid={`card-incident-${incident.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{incident.incidentType}</h3>
                          <Badge variant={getSeverityColor(incident.severity as any)}>
                            {incident.severity}
                          </Badge>
                          <Badge variant={getStatusColor(incident.status as any)}>
                            {incident.status?.replace('_', ' ') || 'open'}
                          </Badge>
                          {(incident as any).cirClass && (incident as any).cirClass !== "not_applicable" && (
                            <Badge variant={(incident as any).cirClass === "class_1" ? "destructive" : "default"} className="gap-1">
                              <FileWarning className="h-3 w-3" />
                              {(incident as any).cirClass === "class_1" ? "CIR Class I" : "CIR Class II"}
                            </Badge>
                          )}
                          {(() => {
                            const countdown = getCirDeadlineCountdown(incident);
                            if (!countdown) {
                              if ((incident as any).dohSubmissionStatus === "submitted" || (incident as any).dohSubmissionStatus === "acknowledged") {
                                return (
                                  <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    DOH Submitted
                                  </Badge>
                                );
                              }
                              return null;
                            }
                            return (
                              <Badge
                                variant="outline"
                                className={`gap-1 ${countdown.variant === "overdue" ? "border-red-600 text-red-700 bg-red-50" : countdown.variant === "urgent" ? "border-orange-500 text-orange-700 bg-orange-50" : "border-yellow-500 text-yellow-700 bg-yellow-50"}`}
                              >
                                <AlertCircle className="h-3 w-3" />
                                {countdown.label}
                              </Badge>
                            );
                          })()}
                          {(incident as any).scNotificationRequired && (() => {
                            const scCountdown = getScDeadlineCountdown(incident);
                            if (!scCountdown) {
                              if ((incident as any).scNotificationStatus === "notified") {
                                return (
                                  <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    SC Notified
                                  </Badge>
                                );
                              }
                              return null;
                            }
                            return (
                              <Badge
                                variant="outline"
                                className={`gap-1 ${scCountdown.variant === "overdue" ? "border-red-600 text-red-700 bg-red-50" : scCountdown.variant === "urgent" ? "border-orange-500 text-orange-700 bg-orange-50" : "border-blue-500 text-blue-700 bg-blue-50"}`}
                              >
                                <AlertCircle className="h-3 w-3" />
                                {scCountdown.label}
                              </Badge>
                            );
                          })()}
                        </div>
                        {isVisible("person") && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{getEntityName(incident)} ({incident.entityType})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(incident.incidentDate), "MMM d, yyyy 'at' h:mm a")}</span>
                            </div>
                            {incident.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{incident.location}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {isVisible("description") && (
                      <p className="text-gray-700 line-clamp-2">{incident.description}</p>
                    )}

                    {isVisible("injuries") && incident.injuries && (
                      <div className="text-sm">
                        <span className="font-medium text-red-600">Injuries: </span>
                        <span className="text-gray-700">{incident.injuries}</span>
                      </div>
                    )}

                    {isVisible("followUp") && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Reported {incident.createdAt ? format(new Date(incident.createdAt), "MMM d, yyyy") : "Unknown"}</span>
                        </div>
                        {incident.followUpRequired && incident.followUpDate && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <Calendar className="h-3 w-3" />
                            <span>Follow-up: {format(new Date(incident.followUpDate), "MMM d, yyyy")}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {isVisible("notifications") && (incident.notifiedFamily || incident.notifiedDoctor || incident.notifiedAgency) && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Notifications:</span>
                        {incident.notifiedFamily && <Badge variant="outline">Family</Badge>}
                        {incident.notifiedDoctor && <Badge variant="outline">Doctor</Badge>}
                        {incident.notifiedAgency && <Badge variant="outline">Agency</Badge>}
                      </div>
                    )}
                  </div>

                  {isVisible("actions") && (
                    <div className="flex flex-col items-end gap-2">
                      <Button variant="outline" size="sm" data-testid={`button-view-incident-${incident.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                      {(incident as any).dohSubmissionStatus === "pending" && canMutate && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-700 hover:bg-green-50"
                          onClick={() => markDohSubmittedMutation.mutate(incident.id)}
                          disabled={markDohSubmittedMutation.isPending}
                          data-testid={`button-doh-submit-${incident.id}`}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark DOH Submitted
                        </Button>
                      )}
                      {(incident as any).scNotificationStatus === "pending" && canMutate && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-500 text-blue-700 hover:bg-blue-50"
                          onClick={() => markScNotifiedMutation.mutate(incident.id)}
                          disabled={markScNotifiedMutation.isPending}
                          data-testid={`button-sc-notify-${incident.id}`}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark SC Notified
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}