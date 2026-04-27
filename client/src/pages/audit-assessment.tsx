import { useState, useRef, useCallback } from "react";
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
  Printer, Upload, Paperclip, Download, X, File, Image, Sheet, FileBadge2,
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

interface AuditDocument {
  id: string;
  auditId: string;
  fileName: string;
  originalName: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedBy: string | null;
  itemKey: string | null;
  notes: string | null;
  createdAt: string;
}

interface AuditCustomItem {
  id: string;
  auditId: string;
  category: string;
  label: string;
  createdAt: string;
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
  documents?: AuditDocument[];
  customItems?: AuditCustomItem[];
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

function computeStats(responses: Record<string, ItemStatus>, customItems: AuditCustomItem[]) {
  const builtInTotal = CHECKLIST.reduce((a, c) => a + c.items.length, 0);
  const totalItems = builtInTotal + customItems.length;
  const pass = Object.values(responses).filter(s => s === "pass").length;
  const fail = Object.values(responses).filter(s => s === "fail").length;
  const na = Object.values(responses).filter(s => s === "na").length;
  const reviewed = pass + fail + na;
  const pct = totalItems > 0 ? Math.round((reviewed / totalItems) * 100) : 0;
  const scorePct = (pass + fail) > 0 ? Math.round((pass / (pass + fail)) * 100) : 0;
  return { pass, fail, na, reviewed, totalItems, pct, scorePct };
}

function categoryStats(catId: string, responsesMap: Record<string, ItemStatus>, customItems: AuditCustomItem[]) {
  const cat = CHECKLIST.find(c => c.id === catId)!;
  const builtInItems = cat.items;
  const customCatItems = customItems.filter(i => i.category === catId);
  const allKeys = [...builtInItems.map(i => i.key), ...customCatItems.map(i => i.id)];
  const pass = allKeys.filter(k => responsesMap[k] === "pass").length;
  const fail = allKeys.filter(k => responsesMap[k] === "fail").length;
  const na = allKeys.filter(k => responsesMap[k] === "na").length;
  const reviewed = pass + fail + na;
  return { pass, fail, na, reviewed, total: allKeys.length };
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File size={16} className="text-gray-400" />;
  if (mimeType.startsWith("image/")) return <Image size={16} className="text-blue-400" />;
  if (mimeType === "application/pdf") return <FileText size={16} className="text-red-400" />;
  if (mimeType.includes("word")) return <FileText size={16} className="text-blue-600" />;
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return <Sheet size={16} className="text-green-600" />;
  return <File size={16} className="text-gray-400" />;
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

  const { data: offices = [] } = useQuery<Office[]>({ queryKey: ["/api/offices"] });

  const effectiveOfficeId = newOfficeId || officeId;

  const { data: audits = [], isLoading: listLoading } = useQuery<AuditAssessment[]>({
    queryKey: ["/api/doh-audits", officeId],
    queryFn: async () => {
      if (!officeId) return [];
      const res = await fetch(`/api/doh-audits?officeId=${officeId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!officeId,
  });

  const { data: activeAudit, isLoading: auditLoading } = useQuery<AuditAssessment & { responses: AuditResponse[]; documents: AuditDocument[]; customItems: AuditCustomItem[] }>({
    queryKey: ["/api/doh-audits", activeAuditId],
    enabled: !!activeAuditId,
  });

  const responsesMap: Record<string, ItemStatus> = {};
  const notesMap: Record<string, string> = {};
  (activeAudit?.responses || []).forEach(r => {
    responsesMap[r.itemKey] = r.status;
    notesMap[r.itemKey] = r.notes || "";
  });
  const customItems: AuditCustomItem[] = activeAudit?.customItems || [];
  const auditDocuments: AuditDocument[] = activeAudit?.documents || [];

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/doh-audits/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", officeId] });
      setDeleteAuditId(null);
      if (activeAuditId === deleteAuditId) setActiveAuditId(null);
      toast({ title: "Audit deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete audit.", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/doh-audits/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] }),
    onError: () => toast({ title: "Error", description: "Failed to update status.", variant: "destructive" }),
  });

  const notesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiRequest("PATCH", `/api/doh-audits/${id}`, { overallNotes: notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] }),
  });

  const responseMutation = useMutation({
    mutationFn: ({ auditId, itemKey, category, status, notes }: any) =>
      apiRequest("PUT", `/api/doh-audits/${auditId}/responses`, { itemKey, category, status, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] }),
  });

  const addCustomItemMutation = useMutation({
    mutationFn: ({ auditId, category, label }: { auditId: string; category: string; label: string }) =>
      apiRequest("POST", `/api/doh-audits/${auditId}/custom-items`, { category, label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] });
      toast({ title: "Custom item added" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add custom item.", variant: "destructive" }),
  });

  const deleteCustomItemMutation = useMutation({
    mutationFn: ({ auditId, itemId }: { auditId: string; itemId: string }) =>
      apiRequest("DELETE", `/api/doh-audits/${auditId}/custom-items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] });
    },
    onError: () => toast({ title: "Error", description: "Failed to remove item.", variant: "destructive" }),
  });

  const [uploadingItemKey, setUploadingItemKey] = useState<string | null>(null);

  const uploadDocMutation = useMutation({
    mutationFn: async ({ auditId, file, notes, itemKey }: { auditId: string; file: File; notes?: string; itemKey?: string | null }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (notes) formData.append("notes", notes);
      if (itemKey) formData.append("itemKey", itemKey);
      const res = await fetch(`/api/doh-audits/${auditId}/documents/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] });
      setUploadingItemKey(null);
      toast({ title: "File attached successfully" });
    },
    onError: () => {
      setUploadingItemKey(null);
      toast({ title: "Upload failed", description: "Unable to upload file. Check size and format.", variant: "destructive" });
    },
  });

  const attachToItem = useCallback((itemKey: string, file: File) => {
    if (!activeAuditId) return;
    setUploadingItemKey(itemKey);
    uploadDocMutation.mutate({ auditId: activeAuditId, file, itemKey });
  }, [activeAuditId]);

  const deleteDocMutation = useMutation({
    mutationFn: ({ auditId, docId }: { auditId: string; docId: string }) =>
      apiRequest("DELETE", `/api/doh-audits/${auditId}/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] });
      toast({ title: "File deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete file.", variant: "destructive" }),
  });

  const saveResponse = useCallback((itemKey: string, category: string, status: ItemStatus, notes: string) => {
    if (!activeAuditId) return;
    responseMutation.mutate({ auditId: activeAuditId, itemKey, category, status, notes });
  }, [activeAuditId]);

  const isCompleted = activeAudit?.status === "completed";
  const stats = computeStats(responsesMap, customItems);

  // ─── List view ────────────────────────────────────────────────────────────

  if (!activeAuditId) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ClipboardCheck size={24} /> DOH Audit Assessment
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Manage DOH home care audit readiness checklists for your agency
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus size={16} /> New Audit
              </Button>
            </div>

            {listLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-24" />)}
              </div>
            ) : audits.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <ClipboardCheck size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground">No audits yet. Create your first audit to get started.</p>
                  <Button className="mt-4 gap-2" onClick={() => setCreateDialogOpen(true)}>
                    <Plus size={15} /> Create First Audit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {audits.map(audit => (
                  <Card
                    key={audit.id}
                    className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                    onClick={() => setActiveAuditId(audit.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg shrink-0">
                            <ClipboardCheck size={20} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold truncate">{audit.title}</h3>
                              {audit.status === "completed" ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300">
                                  <CheckCircle2 size={11} className="mr-1" /> Completed
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                                  <Clock size={11} className="mr-1" /> In Progress
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              {audit.surveyPeriod && <span>Period: {audit.surveyPeriod}</span>}
                              <span>Created: {new Date(audit.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={e => { e.stopPropagation(); setDeleteAuditId(audit.id); }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New DOH Audit Assessment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Audit Title</Label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. 2025 Annual DOH Survey Prep"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Survey Period <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={newPeriod}
                  onChange={e => setNewPeriod(e.target.value)}
                  placeholder="e.g. Q1 2025 or Jan–Mar 2025"
                  className="mt-1"
                />
              </div>
              {offices.length > 1 && (
                <div>
                  <Label>Office</Label>
                  <Select value={newOfficeId || officeId} onValueChange={setNewOfficeId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      {offices.map(o => (
                        <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  title: newTitle.trim(),
                  surveyPeriod: newPeriod.trim() || null,
                  officeId: effectiveOfficeId,
                  status: "in_progress",
                  createdBy: (user as any)?.id,
                })}
              >
                {createMutation.isPending ? "Creating…" : "Create Audit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={!!deleteAuditId} onOpenChange={() => setDeleteAuditId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this audit?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the audit and all its responses. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
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

  // ─── Detail view ──────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setActiveAuditId(null)} className="mt-0.5 shrink-0">
              <ArrowLeft size={18} />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold truncate">{activeAudit?.title || "Loading…"}</h1>
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

            {/* Category Tabs + Documents tab */}
            <Tabs defaultValue={CHECKLIST[0].id}>
              <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-muted p-1">
                {CHECKLIST.map(cat => {
                  const cs = categoryStats(cat.id, responsesMap, customItems);
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
                <TabsTrigger value="documents" className="gap-1.5 text-xs py-1.5 px-3">
                  <Paperclip size={13} />
                  <span className="hidden sm:inline">Documents</span>
                  {auditDocuments.length > 0 && (
                    <Badge className="bg-gray-100 text-gray-600 text-xs px-1 py-0 ml-1">{auditDocuments.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {CHECKLIST.map(cat => (
                <TabsContent key={cat.id} value={cat.id}>
                  <CategorySection
                    category={cat}
                    responsesMap={responsesMap}
                    notesMap={notesMap}
                    customItems={customItems.filter(i => i.category === cat.id)}
                    auditDocuments={auditDocuments}
                    onSave={saveResponse}
                    disabled={isCompleted}
                    onAddCustomItem={label => addCustomItemMutation.mutate({ auditId: activeAuditId!, category: cat.id, label })}
                    onDeleteCustomItem={itemId => deleteCustomItemMutation.mutate({ auditId: activeAuditId!, itemId })}
                    onAttachToItem={attachToItem}
                    onDeleteDoc={docId => deleteDocMutation.mutate({ auditId: activeAuditId!, docId })}
                    uploadingItemKey={uploadingItemKey}
                  />
                </TabsContent>
              ))}

              <TabsContent value="documents">
                <DocumentsSection
                  auditId={activeAuditId!}
                  documents={auditDocuments}
                  customItems={customItems}
                  disabled={isCompleted}
                  onUpload={(file, notes) => uploadDocMutation.mutate({ auditId: activeAuditId!, file, notes })}
                  onDelete={docId => deleteDocMutation.mutate({ auditId: activeAuditId!, docId })}
                  uploading={uploadDocMutation.isPending}
                />
              </TabsContent>
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
  category, responsesMap, notesMap, customItems, auditDocuments, onSave, disabled,
  onAddCustomItem, onDeleteCustomItem, onAttachToItem, onDeleteDoc, uploadingItemKey,
}: {
  category: ChecklistCategory;
  responsesMap: Record<string, ItemStatus>;
  notesMap: Record<string, string>;
  customItems: AuditCustomItem[];
  auditDocuments: AuditDocument[];
  onSave: (itemKey: string, catId: string, status: ItemStatus, notes: string) => void;
  disabled: boolean;
  onAddCustomItem: (label: string) => void;
  onDeleteCustomItem: (itemId: string) => void;
  onAttachToItem: (itemKey: string, file: File) => void;
  onDeleteDoc: (docId: string) => void;
  uploadingItemKey: string | null;
}) {
  const cs = categoryStats(category.id, responsesMap, customItems);
  const Icon = category.icon;
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    onAddCustomItem(newLabel.trim());
    setNewLabel("");
    setAddOpen(false);
  };

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
            itemKey={item.key}
            label={item.label}
            reference={item.reference}
            catId={category.id}
            status={responsesMap[item.key] || "pending"}
            notes={notesMap[item.key] || ""}
            onSave={onSave}
            disabled={disabled}
            itemDocs={auditDocuments.filter(d => d.itemKey === item.key)}
            onAttach={file => onAttachToItem(item.key, file)}
            onDeleteDoc={onDeleteDoc}
            uploading={uploadingItemKey === item.key}
          />
        ))}

        {customItems.map(item => (
          <AuditItem
            key={item.id}
            itemKey={item.id}
            label={item.label}
            catId={category.id}
            status={responsesMap[item.id] || "pending"}
            notes={notesMap[item.id] || ""}
            onSave={onSave}
            disabled={disabled}
            isCustom
            onDelete={() => onDeleteCustomItem(item.id)}
            itemDocs={auditDocuments.filter(d => d.itemKey === item.id)}
            onAttach={file => onAttachToItem(item.id, file)}
            onDeleteDoc={onDeleteDoc}
            uploading={uploadingItemKey === item.id}
          />
        ))}

        {!disabled && (
          <div className="pt-2">
            {addOpen ? (
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                <Input
                  autoFocus
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Enter custom checklist item…"
                  className="flex-1 h-8 text-sm"
                  onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAddOpen(false); setNewLabel(""); } }}
                />
                <Button size="sm" className="h-8 px-3" onClick={handleAdd} disabled={!newLabel.trim()}>Add</Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setAddOpen(false); setNewLabel(""); }}>
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground w-full justify-start border border-dashed"
                onClick={() => setAddOpen(true)}
              >
                <Plus size={14} /> Add custom item
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Audit Item ───────────────────────────────────────────────────────────────

function AuditItem({
  itemKey, label, reference, catId, status, notes, onSave, disabled, isCustom, onDelete,
  itemDocs, onAttach, onDeleteDoc, uploading,
}: {
  itemKey: string;
  label: string;
  reference?: string;
  catId: string;
  status: ItemStatus;
  notes: string;
  onSave: (itemKey: string, catId: string, status: ItemStatus, notes: string) => void;
  disabled: boolean;
  isCustom?: boolean;
  onDelete?: () => void;
  itemDocs?: AuditDocument[];
  onAttach?: (file: File) => void;
  onDeleteDoc?: (docId: string) => void;
  uploading?: boolean;
}) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docs = itemDocs || [];

  const handleStatus = (newStatus: ItemStatus) => {
    if (disabled) return;
    onSave(itemKey, catId, newStatus, localNotes);
    if (newStatus === "fail" && !expanded) setExpanded(true);
  };

  const handleNotesBlur = () => {
    if (disabled) return;
    onSave(itemKey, catId, status, localNotes);
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
            <p className="text-sm leading-snug">
              {label}
              {isCustom && (
                <Badge className="ml-1.5 text-xs px-1 py-0 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400">
                  custom
                </Badge>
              )}
            </p>
            {reference && (
              <p className="text-xs text-muted-foreground mt-0.5">Reg. § {reference}</p>
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

          {/* Attach button */}
          {onAttach && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={e => {
                  if (!e.target.files) return;
                  Array.from(e.target.files).forEach(f => onAttach(f));
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => !uploading && fileInputRef.current?.click()}
                title={docs.length > 0 ? `${docs.length} file${docs.length > 1 ? "s" : ""} attached — click to add more` : "Attach file"}
                className={`relative w-7 h-7 rounded flex items-center justify-center border transition-all
                  ${docs.length > 0 ? "border-blue-300 bg-blue-50 text-blue-500 dark:bg-blue-900/20" : "border-gray-200 bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"}
                  ${uploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {uploading
                  ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  : <Paperclip size={13} />
                }
                {docs.length > 0 && !uploading && (
                  <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                    {docs.length}
                  </span>
                )}
              </button>
            </>
          )}

          <button
            onClick={() => setExpanded(p => !p)}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {isCustom && onDelete && !disabled && (
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
              title="Remove custom item"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded: notes + attached files */}
      {expanded && (
        <div className="mt-2 pl-6 space-y-2">
          <Textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            onBlur={handleNotesBlur}
            disabled={disabled}
            rows={2}
            placeholder="Add notes, documentation references, or corrective action…"
            className="text-sm resize-none"
          />
          {docs.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Attached files:</p>
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 text-xs bg-background border rounded px-2 py-1">
                  <span className="shrink-0">{getFileIcon(doc.mimeType)}</span>
                  <span className="flex-1 truncate text-foreground">{doc.originalName}</span>
                  <span className="text-muted-foreground shrink-0">{formatFileSize(doc.fileSize)}</span>
                  <a
                    href={`/api/doh-audits/${doc.auditId}/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    title="View / Download"
                  >
                    <Download size={13} />
                  </a>
                  {!disabled && onDeleteDoc && (
                    <button
                      onClick={() => onDeleteDoc(doc.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      title="Remove file"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsed preview: notes snippet + file count */}
      {!expanded && (localNotes || docs.length > 0) && (
        <div className="mt-1 pl-6 flex items-center gap-3">
          {localNotes && (
            <p className="text-xs text-muted-foreground truncate italic flex-1">"{localNotes}"</p>
          )}
          {docs.length > 0 && (
            <span className="text-xs text-blue-500 shrink-0 flex items-center gap-0.5">
              <Paperclip size={11} /> {docs.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Documents Section ────────────────────────────────────────────────────────

function resolveItemLabel(itemKey: string | null, customItems: AuditCustomItem[]): string | null {
  if (!itemKey) return null;
  for (const cat of CHECKLIST) {
    const found = cat.items.find(i => i.key === itemKey);
    if (found) return found.label;
  }
  const custom = customItems.find(i => i.id === itemKey);
  if (custom) return custom.label;
  return null;
}

function DocumentsSection({
  auditId, documents, customItems, disabled, onUpload, onDelete, uploading,
}: {
  auditId: string;
  documents: AuditDocument[];
  customItems: AuditCustomItem[];
  disabled: boolean;
  onUpload: (file: File, notes?: string) => void;
  onDelete: (docId: string) => void;
  uploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => onUpload(f));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip size={18} className="text-muted-foreground" />
            <CardTitle className="text-base">Supporting Documents</CardTitle>
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            {documents.length} {documents.length === 1 ? "file" : "files"}
          </Badge>
        </div>
        <CardDescription>
          Upload photos, PDFs, Word documents, or Excel files as supporting evidence for this audit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        {!disabled && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload size={28} className="opacity-50" />
                <p className="text-sm font-medium">Drop files here or click to browse</p>
                <p className="text-xs">Photos, PDF, Word, Excel · Max 25 MB each</p>
              </div>
            )}
          </div>
        )}

        {/* File list */}
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No documents attached yet</p>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => {
              const linkedLabel = resolveItemLabel(doc.itemKey, customItems);
              return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="shrink-0">{getFileIcon(doc.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.fileSize)}
                    {doc.createdAt && ` · ${new Date(doc.createdAt).toLocaleDateString()}`}
                  </p>
                  {linkedLabel && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1 truncate">
                      <Paperclip size={10} className="shrink-0" />
                      <span className="truncate">{linkedLabel}</span>
                    </p>
                  )}
                  {doc.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{doc.notes}"</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/api/doh-audits/${auditId}/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="View / Download"
                  >
                    <Download size={15} />
                  </a>
                  {!disabled && (
                    <button
                      onClick={() => setDeleteDocId(doc.id)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                      title="Delete file"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the file. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (deleteDocId) { onDelete(deleteDocId); setDeleteDocId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
