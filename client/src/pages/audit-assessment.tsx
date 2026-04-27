import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useOffice } from "@/context/office-context";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardCheck, Plus, ArrowLeft, CheckCircle2, XCircle,
  MinusCircle, Clock, Building2, Trash2, FileText,
  Users, UserCheck, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp,
  Printer,
} from "lucide-react";
import type { Office } from "@shared/schema";

// ─── Checklist Definition ────────────────────────────────────────────────────

type ItemStatus = "pending" | "pass" | "fail" | "na";

interface ChecklistItem {
  key: string;
  label: string;
  reference?: string;
}

interface ChecklistCategory {
  id: string;
  label: string;
  icon: any;
  color: string;
  items: ChecklistItem[];
}

const CHECKLIST: ChecklistCategory[] = [
  {
    id: "company_documents",
    label: "Company Documents",
    icon: FileText,
    color: "blue",
    items: [
      { key: "cd_license", label: "Agency license is current and posted at agency location", reference: "611.51" },
      { key: "cd_license_copy", label: "Copy of license available for surveyor review" },
      { key: "cd_business_reg", label: "Business registration / Articles of incorporation on file" },
      { key: "cd_liability_ins", label: "Certificate of liability insurance current and on file" },
      { key: "cd_workers_comp", label: "Workers' compensation certificate current and on file" },
      { key: "cd_org_chart", label: "Current organizational chart available showing lines of authority" },
      { key: "cd_disaster_plan", label: "Emergency / disaster preparedness plan in place and current", reference: "611.56(e)" },
      { key: "cd_quality_mgmt", label: "Quality management program documented and in place" },
      { key: "cd_nondiscrimination", label: "Non-discrimination policy posted / available to clients and staff" },
      { key: "cd_fee_schedule", label: "Fee schedule / service rate information available for clients" },
      { key: "cd_service_area", label: "Service area description documented" },
      { key: "cd_annual_report", label: "Most recent annual report / program evaluation on file" },
    ],
  },
  {
    id: "policy_procedures",
    label: "Policy & Procedures",
    icon: ShieldCheck,
    color: "purple",
    items: [
      { key: "pp_manual", label: "Policy & procedure manual available, current, dated within last 2 years", reference: "611.55" },
      { key: "pp_infection_ctrl", label: "Infection control / universal precautions policy", reference: "611.55(a)" },
      { key: "pp_emergency", label: "Emergency procedures / client emergency plan policy" },
      { key: "pp_client_rights", label: "Client rights policy and procedure", reference: "611.57" },
      { key: "pp_client_rights_posted", label: "Client rights posted or provided to each client in writing" },
      { key: "pp_abuse_neglect", label: "Abuse, neglect, and exploitation prevention and reporting policy", reference: "611.52" },
      { key: "pp_suspension_discharge", label: "Service suspension and discharge policy and procedure" },
      { key: "pp_complaint", label: "Complaint / grievance policy and procedure", reference: "611.57(c)" },
      { key: "pp_background_check", label: "Criminal background check policy for all new hires", reference: "611.52" },
      { key: "pp_supervision", label: "Staff supervision policy documenting frequency and method" },
      { key: "pp_employee_health", label: "Employee health / TB screening policy", reference: "611.52(d)" },
      { key: "pp_confidentiality", label: "Client confidentiality / HIPAA policy" },
      { key: "pp_dnr", label: "Do Not Resuscitate (DNR) / advance directive policy" },
      { key: "pp_medication", label: "Medication management / assistance policy (if services provided)" },
      { key: "pp_hipaa_training", label: "HIPAA training policy for all staff" },
      { key: "pp_cir_policy", label: "Critical incident reporting policy aligned with DOH requirements" },
    ],
  },
  {
    id: "caregiver_files",
    label: "Caregiver Files",
    icon: UserCheck,
    color: "green",
    items: [
      { key: "cg_application", label: "Completed employment application on file for all sampled DCWs" },
      { key: "cg_state_police", label: "PA State Police criminal background check (within 1 year of hire)", reference: "611.52(a)" },
      { key: "cg_fbi", label: "FBI background check on file for applicable staff", reference: "611.52(a)" },
      { key: "cg_child_abuse", label: "PA Child Abuse History Clearance on file", reference: "611.52(a)" },
      { key: "cg_references", label: "At least two employment / character references checked and documented" },
      { key: "cg_id", label: "Copy of valid government-issued ID on file" },
      { key: "cg_i9", label: "I-9 Employment Eligibility Verification completed and on file" },
      { key: "cg_tb_initial", label: "TB test / health screening completed within 90 days of hire", reference: "611.52(d)" },
      { key: "cg_tb_annual", label: "Annual TB screening documented for all staff" },
      { key: "cg_cpr", label: "Current CPR certification on file (within 2 years)" },
      { key: "cg_first_aid", label: "Current First Aid certification on file" },
      { key: "cg_orientation", label: "Orientation / initial training documented (minimum required hours)", reference: "611.52(c)" },
      { key: "cg_annual_training", label: "Annual in-service training (minimum 12 hours/year) documented", reference: "611.52(c)" },
      { key: "cg_competency", label: "Competency evaluation completed and on file" },
      { key: "cg_confidentiality", label: "Signed confidentiality / HIPAA agreement on file" },
      { key: "cg_client_rights_ack", label: "Signed acknowledgement of client rights on file" },
      { key: "cg_job_desc", label: "Signed job description on file" },
      { key: "cg_performance_review", label: "Annual performance review / supervision documentation on file" },
      { key: "cg_licensure", label: "Required professional licensure / certification on file (if applicable)" },
    ],
  },
  {
    id: "client_files",
    label: "Client Files",
    icon: Users,
    color: "orange",
    items: [
      { key: "cl_service_agreement", label: "Signed service agreement on file for each sampled client", reference: "611.56(a)" },
      { key: "cl_client_rights", label: "Signed and dated client rights statement on file", reference: "611.57" },
      { key: "cl_assessment", label: "Initial assessment / intake completed and on file" },
      { key: "cl_care_plan", label: "Individualized care plan current, signed, and dated", reference: "611.56(b)" },
      { key: "cl_care_plan_review", label: "Care plan reviewed and updated at required intervals" },
      { key: "cl_physician_orders", label: "Physician orders on file where services require medical direction" },
      { key: "cl_emergency_contacts", label: "Emergency contact information documented in file" },
      { key: "cl_advance_directive", label: "Advance directive / DNR status documented and respected" },
      { key: "cl_insurance_auth", label: "Insurance / Medicaid authorization on file and current" },
      { key: "cl_service_auth", label: "Service authorization matching authorized units/hours current" },
      { key: "cl_case_mgr", label: "Case manager name and contact information documented" },
      { key: "cl_visit_logs", label: "Visit logs / service records maintained and completed", reference: "611.56(c)" },
      { key: "cl_med_admin", label: "Medication administration records current (if agency assists with medications)" },
      { key: "cl_grievance_provided", label: "Grievance procedure provided to client in writing" },
      { key: "cl_discharge_criteria", label: "Discharge criteria / plan documented when applicable" },
      { key: "cl_hipaa_auth", label: "HIPAA authorization / privacy notice signed and on file" },
    ],
  },
  {
    id: "critical_incidents",
    label: "Critical Incident Reporting",
    icon: AlertTriangle,
    color: "red",
    items: [
      { key: "cir_policy", label: "CIR policy and procedure in place aligned with 28 Pa. Code § 611.80", reference: "611.80" },
      { key: "cir_form", label: "CIR reporting form / template available for staff use" },
      { key: "cir_log", label: "CIR log maintained listing all reported incidents with dates" },
      { key: "cir_24hr_class1", label: "Class I incidents (death, serious injury, abuse) reported to DOH within 24 hours", reference: "611.80(b)" },
      { key: "cir_5day_class2", label: "Class II incidents reported to DOH within 5 business days" },
      { key: "cir_abuse_reporting", label: "All suspected abuse / neglect / exploitation reported per PA law" },
      { key: "cir_investigation", label: "Internal investigation documentation completed for each incident" },
      { key: "cir_corrective_action", label: "Corrective action plans documented and implemented after incidents" },
      { key: "cir_client_notification", label: "Client / responsible party notified of reportable incidents" },
      { key: "cir_follow_up", label: "Follow-up documentation showing resolution / outcome on file" },
      { key: "cir_staff_training", label: "Staff training records showing CIR training completed" },
      { key: "cir_review", label: "Management / QA review of incidents documented" },
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditResponse {
  id: string;
  auditId: string;
  itemKey: string;
  category: string;
  status: ItemStatus;
  notes: string | null;
  updatedAt: string;
}

interface AuditAssessment {
  id: string;
  officeId: string;
  title: string;
  surveyPeriod: string | null;
  status: "in_progress" | "completed" | "archived";
  createdBy: string | null;
  completedAt: string | null;
  overallNotes: string | null;
  createdAt: string;
  updatedAt: string;
  responses?: AuditResponse[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusIcon(status: ItemStatus, size = 16) {
  const props = { size };
  if (status === "pass") return <CheckCircle2 {...props} className="text-green-500" />;
  if (status === "fail") return <XCircle {...props} className="text-red-500" />;
  if (status === "na") return <MinusCircle {...props} className="text-gray-400" />;
  return <Clock {...props} className="text-yellow-500" />;
}

function getStatusBadge(status: ItemStatus) {
  if (status === "pass") return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300">Pass</Badge>;
  if (status === "fail") return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300">Deficient</Badge>;
  if (status === "na") return <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400">N/A</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">Pending</Badge>;
}

function computeStats(responses: Record<string, ItemStatus>) {
  const total = Object.keys(responses).length;
  const pass = Object.values(responses).filter(s => s === "pass").length;
  const fail = Object.values(responses).filter(s => s === "fail").length;
  const na = Object.values(responses).filter(s => s === "na").length;
  const reviewed = pass + fail + na;
  const totalItems = CHECKLIST.reduce((a, c) => a + c.items.length, 0);
  const pct = totalItems > 0 ? Math.round((reviewed / totalItems) * 100) : 0;
  const scorePct = (pass + na) > 0 && (pass + fail) > 0
    ? Math.round((pass / (pass + fail)) * 100) : 0;
  return { total, pass, fail, na, reviewed, totalItems, pct, scorePct };
}

function categoryStats(catId: string, responses: Record<string, ItemStatus>) {
  const cat = CHECKLIST.find(c => c.id === catId)!;
  const items = cat.items;
  const pass = items.filter(i => responses[i.key] === "pass").length;
  const fail = items.filter(i => responses[i.key] === "fail").length;
  const na = items.filter(i => responses[i.key] === "na").length;
  const reviewed = pass + fail + na;
  return { pass, fail, na, reviewed, total: items.length };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditAssessment() {
  const { selectedOfficeId } = useOffice();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteAuditId, setDeleteAuditId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPeriod, setNewPeriod] = useState("");
  const [newOfficeId, setNewOfficeId] = useState("");

  const officeId = selectedOfficeId && selectedOfficeId !== "all"
    ? selectedOfficeId : (user as any)?.primaryOfficeId || "";

  // Fetch offices for selector
  const { data: offices = [] } = useQuery<Office[]>({ queryKey: ["/api/offices"] });

  // Effective office for list (admin may pick, others use their own)
  const effectiveOfficeId = newOfficeId || officeId;

  // Fetch audit list
  const { data: audits = [], isLoading: listLoading } = useQuery<AuditAssessment[]>({
    queryKey: ["/api/doh-audits", officeId],
    queryFn: async () => {
      if (!officeId) return [];
      const res = await fetch(`/api/doh-audits?officeId=${officeId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!officeId,
  });

  // Fetch active audit detail
  const { data: activeAudit, isLoading: auditLoading } = useQuery<AuditAssessment & { responses: AuditResponse[] }>({
    queryKey: ["/api/doh-audits", activeAuditId],
    enabled: !!activeAuditId,
  });

  // Build local responses map
  const responsesMap: Record<string, ItemStatus> = {};
  const notesMap: Record<string, string> = {};
  (activeAudit?.responses || []).forEach(r => {
    responsesMap[r.itemKey] = r.status;
    notesMap[r.itemKey] = r.notes || "";
  });

  // Create audit
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/doh-audits", data),
    onSuccess: async (newAudit: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", officeId] });
      setCreateDialogOpen(false);
      setNewTitle("");
      setNewPeriod("");
      toast({ title: "Audit created", description: "Start completing the checklist." });
      setActiveAuditId(newAudit.id);
    },
    onError: () => toast({ title: "Error", description: "Failed to create audit.", variant: "destructive" }),
  });

  // Delete audit
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/doh-audits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", officeId] });
      if (activeAuditId === deleteAuditId) setActiveAuditId(null);
      setDeleteAuditId(null);
      toast({ title: "Audit deleted" });
    },
  });

  // Mark complete / reopen
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/doh-audits/${id}`, {
        status,
        completedAt: status === "completed" ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", officeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] });
    },
  });

  // Update notes
  const notesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiRequest("PATCH", `/api/doh-audits/${id}`, { overallNotes: notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] }),
  });

  // Save item response
  const responseMutation = useMutation({
    mutationFn: (data: { itemKey: string; category: string; status: string; notes: string }) =>
      apiRequest("PUT", `/api/doh-audits/${activeAuditId}/responses`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] }),
  });

  const saveResponse = useCallback((item: ChecklistItem, catId: string, status: ItemStatus, notes: string) => {
    responseMutation.mutate({ itemKey: item.key, category: catId, status, notes });
  }, [activeAuditId]);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const targetOffice = newOfficeId || officeId;
    if (!targetOffice) {
      toast({ title: "Select an office first", variant: "destructive" });
      return;
    }
    createMutation.mutate({ title: newTitle.trim(), surveyPeriod: newPeriod.trim() || null, officeId: targetOffice });
  };

  const stats = computeStats(responsesMap);
  const isCompleted = activeAudit?.status === "completed";

  // ─── List View ─────────────────────────────────────────────────────────────

  if (!activeAuditId) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 p-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ClipboardCheck className="text-blue-600" size={26} />
                DOH Audit Assessment
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                PA Department of Health — Home Care Agency Survey Preparation
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus size={16} /> New Audit
            </Button>
          </div>

          {!officeId && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="pt-4 pb-4 flex items-center gap-3 text-yellow-800 dark:text-yellow-300">
                <Building2 size={18} />
                <span className="text-sm">Please select an office from the top bar to view and manage audits for that location.</span>
              </CardContent>
            </Card>
          )}

          {listLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="py-6">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : audits.length === 0 ? (
            <Card className="text-center py-16 border-dashed">
              <CardContent>
                <ClipboardCheck size={40} className="mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium text-muted-foreground">No audits yet for this office</p>
                <p className="text-sm text-muted-foreground mt-1">Create a new audit assessment to get started.</p>
                <Button className="mt-4 gap-2" onClick={() => setCreateDialogOpen(true)}>
                  <Plus size={16} /> Create First Audit
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {audits.map(audit => {
                const auditResponses: Record<string, ItemStatus> = {};
                return (
                  <Card
                    key={audit.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border"
                    onClick={() => setActiveAuditId(audit.id)}
                  >
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-semibold text-base truncate">{audit.title}</h2>
                            {audit.status === "completed" ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300">
                                <CheckCircle2 size={11} className="mr-1" /> Completed
                              </Badge>
                            ) : audit.status === "archived" ? (
                              <Badge variant="secondary">Archived</Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                                <Clock size={11} className="mr-1" /> In Progress
                              </Badge>
                            )}
                          </div>
                          {audit.surveyPeriod && (
                            <p className="text-sm text-muted-foreground mt-0.5">Survey Period: {audit.surveyPeriod}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Started {new Date(audit.createdAt).toLocaleDateString()}
                            {audit.completedAt && ` · Completed ${new Date(audit.completedAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={e => { e.stopPropagation(); setDeleteAuditId(audit.id); }}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New DOH Audit Assessment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {offices.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Office</Label>
                  <Select value={newOfficeId || officeId} onValueChange={setNewOfficeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      {offices.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Audit Title *</Label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g., 2025 Annual DOH Survey Prep"
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Survey Period (optional)</Label>
                <Input
                  value={newPeriod}
                  onChange={e => setNewPeriod(e.target.value)}
                  placeholder="e.g., Q1 2025 or January–March 2025"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newTitle.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Audit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteAuditId} onOpenChange={open => !open && setDeleteAuditId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this audit?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete the audit and all its responses. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteAuditId && deleteMutation.mutate(deleteAuditId)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── Detail / Checklist View ───────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveAuditId(null)}>
              <ArrowLeft size={18} />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{activeAudit?.title || "Loading…"}</h1>
                {isCompleted ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300">
                    <CheckCircle2 size={11} className="mr-1" /> Completed
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                    <Clock size={11} className="mr-1" /> In Progress
                  </Badge>
                )}
              </div>
              {activeAudit?.surveyPeriod && (
                <p className="text-sm text-muted-foreground">Survey Period: {activeAudit.surveyPeriod}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </Button>
            {isCompleted ? (
              <Button variant="outline" size="sm" onClick={() => statusMutation.mutate({ id: activeAuditId!, status: "in_progress" })}>
                Reopen
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => statusMutation.mutate({ id: activeAuditId!, status: "completed" })}
              >
                <CheckCircle2 size={15} /> Mark Complete
              </Button>
            )}
          </div>
        </div>

        {auditLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-24" />)}
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                <CardContent className="pt-3 pb-3 text-center">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.reviewed}/{stats.totalItems}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Items Reviewed</p>
                  <Progress value={stats.pct} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
                <CardContent className="pt-3 pb-3 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.pass}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Passed</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
                <CardContent className="pt-3 pb-3 text-center">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.fail}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Deficiencies</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
                <CardContent className="pt-3 pb-3 text-center">
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {stats.pass + stats.fail > 0 ? `${stats.scorePct}%` : "—"}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">Pass Rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Category Tabs */}
            <Tabs defaultValue={CHECKLIST[0].id}>
              <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-muted p-1">
                {CHECKLIST.map(cat => {
                  const cs = categoryStats(cat.id, responsesMap);
                  const Icon = cat.icon;
                  return (
                    <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5 text-xs py-1.5 px-3">
                      <Icon size={13} />
                      <span className="hidden sm:inline">{cat.label}</span>
                      {cs.fail > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-1 py-0 ml-1">{cs.fail}</Badge>
                      )}
                      {cs.fail === 0 && cs.reviewed === cs.total && (
                        <CheckCircle2 size={12} className="text-green-500 ml-1" />
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {CHECKLIST.map(cat => (
                <TabsContent key={cat.id} value={cat.id}>
                  <CategorySection
                    category={cat}
                    responsesMap={responsesMap}
                    notesMap={notesMap}
                    onSave={saveResponse}
                    disabled={isCompleted}
                  />
                </TabsContent>
              ))}
            </Tabs>

            {/* Overall Notes */}
            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Overall Audit Notes</CardTitle>
                <CardDescription>General observations, surveyor feedback, or corrective action summary</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  defaultValue={activeAudit?.overallNotes || ""}
                  disabled={isCompleted}
                  rows={4}
                  placeholder="Add overall notes, corrective actions, or surveyor observations…"
                  onBlur={e => notesMutation.mutate({ id: activeAuditId!, notes: e.target.value })}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category, responsesMap, notesMap, onSave, disabled,
}: {
  category: ChecklistCategory;
  responsesMap: Record<string, ItemStatus>;
  notesMap: Record<string, string>;
  onSave: (item: ChecklistItem, catId: string, status: ItemStatus, notes: string) => void;
  disabled: boolean;
}) {
  const cs = categoryStats(category.id, responsesMap);
  const Icon = category.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Icon size={18} className="text-muted-foreground" />
            <CardTitle className="text-base">{category.label}</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-green-600 font-medium">{cs.pass} Pass</span>
            <span>·</span>
            <span className="text-red-500 font-medium">{cs.fail} Deficient</span>
            <span>·</span>
            <span>{cs.reviewed}/{cs.total} reviewed</span>
          </div>
        </div>
        <Progress value={cs.total > 0 ? (cs.reviewed / cs.total) * 100 : 0} className="h-1.5 mt-1" />
      </CardHeader>
      <CardContent className="space-y-2">
        {category.items.map(item => (
          <AuditItem
            key={item.key}
            item={item}
            catId={category.id}
            status={responsesMap[item.key] || "pending"}
            notes={notesMap[item.key] || ""}
            onSave={onSave}
            disabled={disabled}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Audit Item ───────────────────────────────────────────────────────────────

function AuditItem({
  item, catId, status, notes, onSave, disabled,
}: {
  item: ChecklistItem;
  catId: string;
  status: ItemStatus;
  notes: string;
  onSave: (item: ChecklistItem, catId: string, status: ItemStatus, notes: string) => void;
  disabled: boolean;
}) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [expanded, setExpanded] = useState(false);

  // sync notes from parent
  useState(() => { setLocalNotes(notes); });

  const handleStatus = (newStatus: ItemStatus) => {
    if (disabled) return;
    onSave(item, catId, newStatus, localNotes);
    if (newStatus === "fail" && !expanded) setExpanded(true);
  };

  const handleNotesBlur = () => {
    if (disabled) return;
    onSave(item, catId, status, localNotes);
  };

  const borderColor = status === "pass" ? "border-l-green-400" :
    status === "fail" ? "border-l-red-400" :
    status === "na" ? "border-l-gray-300" : "border-l-yellow-300";

  return (
    <div className={`border-l-4 ${borderColor} bg-muted/30 rounded-r-lg px-3 py-2.5 transition-colors`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="mt-0.5 shrink-0">{getStatusIcon(status)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-snug">{item.label}</p>
            {item.reference && (
              <p className="text-xs text-muted-foreground mt-0.5">Reg. § {item.reference}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(["pass", "fail", "na"] as ItemStatus[]).map(s => (
            <button
              key={s}
              disabled={disabled}
              onClick={() => handleStatus(s)}
              title={s === "pass" ? "Pass" : s === "fail" ? "Deficient" : "N/A"}
              className={`w-7 h-7 rounded flex items-center justify-center border transition-all
                ${status === s ? "opacity-100 scale-100" : "opacity-40 hover:opacity-80"}
                ${disabled ? "cursor-not-allowed" : "cursor-pointer"}
                ${s === "pass" ? "border-green-300 bg-green-50 dark:bg-green-900/20" :
                  s === "fail" ? "border-red-300 bg-red-50 dark:bg-red-900/20" :
                  "border-gray-300 bg-gray-50 dark:bg-gray-800"}`}
            >
              {s === "pass" ? <CheckCircle2 size={14} className="text-green-500" /> :
               s === "fail" ? <XCircle size={14} className="text-red-500" /> :
               <MinusCircle size={14} className="text-gray-400" />}
            </button>
          ))}
          <button
            onClick={() => setExpanded(p => !p)}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 pl-6">
          <Textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            onBlur={handleNotesBlur}
            disabled={disabled}
            rows={2}
            placeholder="Add notes, documentation references, or corrective action…"
            className="text-sm resize-none"
          />
        </div>
      )}
      {!expanded && localNotes && (
        <p className="mt-1 pl-6 text-xs text-muted-foreground truncate italic">"{localNotes}"</p>
      )}
    </div>
  );
}
