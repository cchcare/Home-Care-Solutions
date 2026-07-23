import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/loading-states";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { formatDateOnly, parseDateOnlyInput, toDateOnlyInputValue } from "@/lib/dateOnly";
import {
  ArrowLeft, User, Mail, Phone, Building, Briefcase, FileText, Users,
  UserCheck, GraduationCap, DollarSign, Search, Upload, Download, Plus, Wallet,
} from "lucide-react";
import type { Coordinator, Caregiver, Client, Document, Office, Training, CoordinatorPayRecord } from "@shared/schema";

const MENU_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "clients", label: "Assigned Clients", icon: Users },
  { id: "caregivers", label: "Assigned Caregivers", icon: UserCheck },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "pay", label: "Payroll & Balance", icon: DollarSign },
];

type TrainingRecordRow = {
  id: string;
  trainingId: string;
  trainingTitle: string | null;
  trainingCategory: string | null;
  status: string | null;
  startDate: string | null;
  completionDate: string | null;
  expirationDate: string | null;
  score: number | null;
  notes: string | null;
};

type PaySummary = {
  payRecords: CoordinatorPayRecord[];
  compPayments: Array<{
    id: string;
    paymentMade: string;
    notes: string | null;
    periodName: string | null;
    periodStartDate: string | null;
    periodEndDate: string | null;
    periodStatus: string | null;
    createdAt: string | null;
  }>;
  totals: { totalAccrued: number; totalPaid: number; balanceRemaining: number };
};

export default function CoordinatorProfile() {
  const [, params] = useRoute("/coordinators/:id");
  const coordinatorId = params?.id;
  const [activeSection, setActiveSection] = useState("profile");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [trainingForm, setTrainingForm] = useState({
    trainingId: "", status: "completed", completionDate: "", expirationDate: "", score: "", notes: "",
  });
  const [startDateDialogOpen, setStartDateDialogOpen] = useState(false);
  const [pendingStartDate, setPendingStartDate] = useState("");

  const { data: coordinator, isLoading } = useQuery<Coordinator>({
    queryKey: ["/api/coordinators", coordinatorId],
    queryFn: async () => {
      const r = await fetch(`/api/coordinators/${coordinatorId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load coordinator");
      return r.json();
    },
    enabled: !!coordinatorId,
  });

  const { data: office } = useQuery<Office>({
    queryKey: ["/api/offices", coordinator?.officeId],
    queryFn: async () => {
      const r = await fetch(`/api/offices/${coordinator?.officeId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load office");
      return r.json();
    },
    enabled: !!coordinator?.officeId,
  });

  const { data: assignedClients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/coordinators", coordinatorId, "clients"],
    queryFn: async () => (await fetch(`/api/coordinators/${coordinatorId}/clients`, { credentials: "include" })).json(),
    enabled: !!coordinatorId,
  });

  const { data: assignedCaregivers = [], isLoading: caregiversLoading } = useQuery<Caregiver[]>({
    queryKey: ["/api/coordinators", coordinatorId, "caregivers"],
    queryFn: async () => (await fetch(`/api/coordinators/${coordinatorId}/caregivers`, { credentials: "include" })).json(),
    enabled: !!coordinatorId,
  });

  const { data: coordinatorDocs = [], isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/coordinators", coordinatorId, "documents"],
    queryFn: async () => (await fetch(`/api/coordinators/${coordinatorId}/documents`, { credentials: "include" })).json(),
    enabled: !!coordinatorId,
  });

  const { data: trainingRecords = [], isLoading: trainingLoading } = useQuery<TrainingRecordRow[]>({
    queryKey: ["/api/coordinators", coordinatorId, "trainings"],
    queryFn: async () => (await fetch(`/api/coordinators/${coordinatorId}/trainings`, { credentials: "include" })).json(),
    enabled: !!coordinatorId,
  });

  const { data: trainingCatalog = [] } = useQuery<Training[]>({
    queryKey: ["/api/trainings"],
    enabled: trainingDialogOpen,
  });

  const { data: paySummary, isLoading: payLoading } = useQuery<PaySummary>({
    queryKey: ["/api/coordinators", coordinatorId, "pay-summary"],
    queryFn: async () => (await fetch(`/api/coordinators/${coordinatorId}/pay-summary`, { credentials: "include" })).json(),
    enabled: !!coordinatorId,
  });

  const addTrainingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/coordinators/${coordinatorId}/trainings`, {
        trainingId: trainingForm.trainingId,
        status: trainingForm.status,
        completionDate: trainingForm.completionDate ? parseDateOnlyInput(trainingForm.completionDate) : null,
        expirationDate: trainingForm.expirationDate ? parseDateOnlyInput(trainingForm.expirationDate) : null,
        score: trainingForm.score ? parseInt(trainingForm.score, 10) : null,
        notes: trainingForm.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coordinators", coordinatorId, "trainings"] });
      setTrainingDialogOpen(false);
      setTrainingForm({ trainingId: "", status: "completed", completionDate: "", expirationDate: "", score: "", notes: "" });
      toast({ title: "Training recorded" });
    },
    onError: (e: any) => toast({ title: "Failed to record training", description: e.message, variant: "destructive" }),
  });

  const saveStartDateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/coordinators/${coordinatorId}`, {
        startDate: pendingStartDate ? parseDateOnlyInput(pendingStartDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coordinators", coordinatorId] });
      queryClient.invalidateQueries({ queryKey: ["/api/coordinators"] });
      setStartDateDialogOpen(false);
      toast({ title: "Start date updated" });
    },
    onError: (e: any) => toast({ title: "Failed to update start date", description: e.message, variant: "destructive" }),
  });

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("coordinatorId", coordinatorId!);
      if (coordinator?.officeId) formData.append("officeId", coordinator.officeId);
      formData.append("documentType", "general");
      const r = await fetch("/api/documents/upload", { method: "POST", body: formData, credentials: "include" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/coordinators", coordinatorId, "documents"] });
      toast({ title: "Document uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const coordinatorName = coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : "Coordinator";
  const money = (v: unknown) => `$${(Number(v) || 0).toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          <aside className="w-56 border-r bg-muted/25 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-16 animate-pulse" />
              </div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 bg-muted rounded-lg animate-pulse" />
            ))}
          </aside>
          <div className="flex-1 p-6">
            <div className="max-w-5xl space-y-4">
              <div className="h-8 bg-muted rounded w-56 animate-pulse" />
              <div className="h-64 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!coordinator) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-4">Coordinator not found</p>
          <Link href="/coordinators">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Coordinators
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={coordinatorName} />
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-56 border-r bg-muted/25 overflow-y-auto">
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm ${
                  coordinator.isActive
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                    : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400"
                }`}>
                  {coordinator.firstName?.[0]}{coordinator.lastName?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate" data-testid="text-coordinator-name" title={coordinatorName}>
                    {coordinatorName}
                  </p>
                  <Badge variant={coordinator.isActive ? "default" : "secondary"} className="mt-1.5 text-xs" data-testid="badge-coordinator-status">
                    {coordinator.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <Building className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{office?.name || "No office"}</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <Briefcase className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{coordinator.title || "Coordinator"}</span>
                </div>
              </div>
              <Link href="/coordinators">
                <Button variant="outline" size="sm" className="w-full mt-4" data-testid="button-back-coordinators">
                  <Search className="w-3.5 h-3.5 mr-2" />
                  All Coordinators
                </Button>
              </Link>
            </div>
            <nav className="p-3 space-y-1">
              {MENU_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                    data-testid={`menu-${item.id}`}
                    title={item.label}
                  >
                    <IconComponent className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-5xl space-y-6">
              {activeSection === "profile" && (
                <div className="rounded-lg border border-border/50 p-6 bg-card hover:shadow-md transition-shadow">
                  <h2 className="text-base font-semibold mb-5 text-foreground flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Coordinator Information
                  </h2>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Email</dt>
                      <dd className="mt-1.5 text-foreground">{coordinator.email || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Phone</dt>
                      <dd className="mt-1.5 text-foreground">{coordinator.phone || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</dt>
                      <dd className="mt-1.5 text-foreground">{coordinator.title || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Office</dt>
                      <dd className="mt-1.5 text-foreground">{office?.name || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date</dt>
                      <dd className="mt-1.5 text-foreground flex items-center gap-2" data-testid="text-start-date">
                        {coordinator.startDate ? formatDateOnly(coordinator.startDate) : "—"}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setPendingStartDate(toDateOnlyInputValue(coordinator.startDate));
                            setStartDateDialogOpen(true);
                          }}
                          data-testid="button-edit-start-date"
                        >
                          Edit
                        </Button>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coordinator Rate</dt>
                      <dd className="mt-1.5 text-foreground">
                        {coordinator.coordinatorRate != null ? `$${Number(coordinator.coordinatorRate).toFixed(2)}/hr` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned Clients</dt>
                      <dd className="mt-1.5 text-foreground">{assignedClients.length}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned Caregivers</dt>
                      <dd className="mt-1.5 text-foreground">{assignedCaregivers.length}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {activeSection === "clients" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Assigned Clients ({assignedClients.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {clientsLoading ? (
                      <div className="p-6"><ListSkeleton rows={4} rowHeight="h-10" /></div>
                    ) : assignedClients.length === 0 ? (
                      <EmptyState icon={Users} title="No clients assigned" description="Assign clients to this coordinator from the client's profile or the Clients page." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Service Start</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignedClients.map((c) => (
                            <TableRow key={c.id} className="hover:bg-muted/40 transition-colors" data-testid={`row-client-${c.id}`}>
                              <TableCell>
                                <Link href={`/clients/${c.id}`} className="font-medium text-primary hover:underline">
                                  {c.firstName} {c.lastName}
                                </Link>
                              </TableCell>
                              <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs">{c.status}</Badge></TableCell>
                              <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                              <TableCell>{c.serviceStartDate ? formatDateOnly(c.serviceStartDate) : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSection === "caregivers" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-primary" />
                      Assigned Caregivers ({assignedCaregivers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {caregiversLoading ? (
                      <div className="p-6"><ListSkeleton rows={4} rowHeight="h-10" /></div>
                    ) : assignedCaregivers.length === 0 ? (
                      <EmptyState icon={UserCheck} title="No caregivers assigned" description="Assign caregivers from the Coordinators page or the caregiver's profile." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead className="text-right">Hourly Wage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignedCaregivers.map((c) => (
                            <TableRow key={c.id} className="hover:bg-muted/40 transition-colors" data-testid={`row-caregiver-${c.id}`}>
                              <TableCell>
                                <Link href={`/caregivers/${c.id}`} className="font-medium text-primary hover:underline">
                                  {c.firstName} {c.lastName}
                                </Link>
                              </TableCell>
                              <TableCell><Badge variant={c.isActive ? "default" : "secondary"} className="text-xs">{c.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                              <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                              <TableCell className="text-right tabular-nums">{c.hourlyWage != null ? `$${Number(c.hourlyWage).toFixed(2)}/hr` : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSection === "documents" && (
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Documents ({coordinatorDocs.length})
                    </CardTitle>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(f);
                        }}
                        data-testid="input-coordinator-document"
                      />
                      <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} data-testid="button-upload-document">
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {docsLoading ? (
                      <div className="p-6"><ListSkeleton rows={4} rowHeight="h-10" /></div>
                    ) : coordinatorDocs.length === 0 ? (
                      <EmptyState icon={FileText} title="No documents yet" description="Upload contracts, certifications, or other files for this coordinator." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Uploaded</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {coordinatorDocs.map((d) => (
                            <TableRow key={d.id} className="hover:bg-muted/40 transition-colors" data-testid={`row-document-${d.id}`}>
                              <TableCell className="font-medium">{d.originalName}</TableCell>
                              <TableCell className="capitalize text-muted-foreground">{(d.documentType || "general").replace(/_/g, " ")}</TableCell>
                              <TableCell>{d.createdAt ? format(new Date(d.createdAt), "MMM d, yyyy") : "—"}</TableCell>
                              <TableCell className="text-right">
                                <Button asChild variant="ghost" size="sm" title="Download" aria-label={`Download ${d.originalName}`}>
                                  <a href={`/api/documents/${d.id}/download`}>
                                    <Download className="w-4 h-4" />
                                  </a>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSection === "training" && (
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Training ({trainingRecords.length})
                    </CardTitle>
                    <Button size="sm" onClick={() => setTrainingDialogOpen(true)} data-testid="button-add-training">
                      <Plus className="w-4 h-4 mr-2" />
                      Record Training
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {trainingLoading ? (
                      <div className="p-6"><ListSkeleton rows={4} rowHeight="h-10" /></div>
                    ) : trainingRecords.length === 0 ? (
                      <EmptyState icon={GraduationCap} title="No training recorded" description="Record completed or in-progress trainings for this coordinator." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Training</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Completed</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trainingRecords.map((t) => (
                            <TableRow key={t.id} className="hover:bg-muted/40 transition-colors" data-testid={`row-training-${t.id}`}>
                              <TableCell className="font-medium">{t.trainingTitle || t.trainingId}</TableCell>
                              <TableCell>
                                <Badge variant={t.status === "completed" ? "default" : "secondary"} className="text-xs capitalize">
                                  {(t.status || "").replace(/_/g, " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>{t.completionDate ? formatDateOnly(t.completionDate) : "—"}</TableCell>
                              <TableCell>{t.expirationDate ? formatDateOnly(t.expirationDate) : "—"}</TableCell>
                              <TableCell className="text-right tabular-nums">{t.score != null ? `${t.score}%` : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSection === "pay" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Accrued</p>
                        <p className="text-2xl font-bold mt-2 tabular-nums" data-testid="text-total-accrued">
                          {payLoading ? "…" : money(paySummary?.totals.totalAccrued)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Accruals + bonuses</p>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Paid</p>
                        <p className="text-2xl font-bold mt-2 tabular-nums" data-testid="text-total-paid">
                          {payLoading ? "…" : money(paySummary?.totals.totalPaid)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Across all pay records</p>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow border-primary/30">
                      <CardContent className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5" /> Balance Remaining
                        </p>
                        <p className="text-2xl font-bold mt-2 tabular-nums text-primary" data-testid="text-balance-remaining">
                          {payLoading ? "…" : money(paySummary?.totals.balanceRemaining)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Still owed</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        Quarterly Pay Records
                      </CardTitle>
                      <Link href="/coordinator-pay-records">
                        <Button variant="outline" size="sm" data-testid="button-open-pay-records">Manage</Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                      {payLoading ? (
                        <div className="p-6"><ListSkeleton rows={3} rowHeight="h-10" /></div>
                      ) : !paySummary?.payRecords.length ? (
                        <EmptyState icon={DollarSign} title="No pay records yet" description="Quarterly pay records appear here once created on the Coordinator Pay page." />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Period</TableHead>
                              <TableHead className="text-right">Payroll Hours</TableHead>
                              <TableHead className="text-right">Accrued</TableHead>
                              <TableHead className="text-right">Bonus</TableHead>
                              <TableHead className="text-right">Paid</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paySummary.payRecords.map((r) => (
                              <TableRow key={r.id} className="hover:bg-muted/40 transition-colors" data-testid={`row-pay-record-${r.id}`}>
                                <TableCell className="font-medium">Q{r.quarter} {r.year}</TableCell>
                                <TableCell className="text-right tabular-nums">{Number(r.totalPayrollHours || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right tabular-nums">{money(r.accrualAmount)}</TableCell>
                                <TableCell className="text-right tabular-nums">{money(r.quarterlyBonus)}</TableCell>
                                <TableCell className="text-right tabular-nums">{money(r.amountPaid)}</TableCell>
                                <TableCell className="text-right tabular-nums font-semibold">{money(r.balanceRemaining)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        Compensation Payments
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {payLoading ? (
                        <div className="p-6"><ListSkeleton rows={3} rowHeight="h-10" /></div>
                      ) : !paySummary?.compPayments.length ? (
                        <EmptyState icon={Wallet} title="No compensation payments" description="Payments recorded in Coordinator Compensation periods appear here." />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Period</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Payment Made</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paySummary.compPayments.map((p) => (
                              <TableRow key={p.id} className="hover:bg-muted/40 transition-colors" data-testid={`row-comp-payment-${p.id}`}>
                                <TableCell className="font-medium">
                                  {p.periodName || (p.periodStartDate ? `${formatDateOnly(p.periodStartDate)} – ${p.periodEndDate ? formatDateOnly(p.periodEndDate) : ""}` : "—")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs capitalize">{p.periodStatus || "—"}</Badge>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{money(p.paymentMade)}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{p.notes || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Record training dialog */}
      <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Training</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Training *</Label>
              <Select value={trainingForm.trainingId} onValueChange={(v) => setTrainingForm({ ...trainingForm, trainingId: v })}>
                <SelectTrigger data-testid="select-training"><SelectValue placeholder="Select a training" /></SelectTrigger>
                <SelectContent>
                  {trainingCatalog.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={trainingForm.status} onValueChange={(v) => setTrainingForm({ ...trainingForm, status: v })}>
                  <SelectTrigger data-testid="select-training-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Score (%)</Label>
                <Input type="number" min="0" max="100" value={trainingForm.score} onChange={(e) => setTrainingForm({ ...trainingForm, score: e.target.value })} data-testid="input-training-score" />
              </div>
              <div>
                <Label>Completion date</Label>
                <Input type="date" value={trainingForm.completionDate} onChange={(e) => setTrainingForm({ ...trainingForm, completionDate: e.target.value })} data-testid="input-training-completion" />
              </div>
              <div>
                <Label>Expiration date</Label>
                <Input type="date" value={trainingForm.expirationDate} onChange={(e) => setTrainingForm({ ...trainingForm, expirationDate: e.target.value })} data-testid="input-training-expiration" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={trainingForm.notes} onChange={(e) => setTrainingForm({ ...trainingForm, notes: e.target.value })} data-testid="input-training-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrainingDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addTrainingMutation.mutate()}
              disabled={!trainingForm.trainingId || addTrainingMutation.isPending}
              data-testid="button-save-training"
            >
              {addTrainingMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit start date dialog */}
      <Dialog open={startDateDialogOpen} onOpenChange={setStartDateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Start Date</DialogTitle></DialogHeader>
          <div>
            <Label>Start date</Label>
            <Input type="date" value={pendingStartDate} onChange={(e) => setPendingStartDate(e.target.value)} data-testid="input-start-date" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDateDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveStartDateMutation.mutate()} disabled={saveStartDateMutation.isPending} data-testid="button-save-start-date">
              {saveStartDateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
