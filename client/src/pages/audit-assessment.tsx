import { useState, useRef, useCallback, useEffect } from "react";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardCheck, Plus, ArrowLeft, CheckCircle2, XCircle,
  MinusCircle, Clock, Trash2, FileText,
  Users, UserCheck, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp,
  Printer, Upload, Paperclip, Download, X, File, Image, Sheet,
  MoreVertical, Archive, ArchiveRestore, FileSpreadsheet, User,
  ArrowLeftRight, TrendingUp, TrendingDown, Minus, Link2,
} from "lucide-react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Office } from "@shared/schema";
import cchcLogo from "@assets/15A8EB0D-1FA3-4805-BF3C-7810910EC966_1767496211498.png";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

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

const BUILTIN_TOTAL = CHECKLIST.reduce((a, c) => a + c.items.length, 0);

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

type CorrectiveActionStatus = "open" | "in_progress" | "resolved";

interface AuditCorrectiveAction {
  id: string;
  auditId: string;
  itemKey: string;
  responsibleParty: string | null;
  targetDate: string | null;
  completionDate: string | null;
  actionSteps: string | null;
  status: CorrectiveActionStatus;
  createdAt: string;
  updatedAt: string;
}

interface AuditAssessment {
  id: string;
  officeId: string;
  title: string;
  surveyPeriod: string | null;
  surveyorName: string | null;
  auditDate: string | null;
  status: "in_progress" | "completed" | "archived";
  createdBy: string | null;
  completedAt: string | null;
  overallNotes: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedCount?: number;
  failCount?: number;
  customItemCount?: number;
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

function computeStats(responses: Record<string, ItemStatus>, customItems: AuditCustomItem[]) {
  const totalItems = BUILTIN_TOTAL + customItems.length;
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

function resolveItemReference(itemKey: string | null): string | null {
  if (!itemKey) return null;
  for (const cat of CHECKLIST) {
    const found = cat.items.find(i => i.key === itemKey);
    if (found) return found.reference || null;
  }
  return null;
}

function resolveItemCategory(itemKey: string, customItems: AuditCustomItem[]): string {
  for (const cat of CHECKLIST) {
    if (cat.items.some(i => i.key === itemKey)) return cat.label;
  }
  const custom = customItems.find(i => i.id === itemKey);
  if (custom) {
    const cat = CHECKLIST.find(c => c.id === custom.category);
    return cat ? cat.label : "Custom";
  }
  return "Unknown";
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

async function exportAuditToExcel(
  audit: AuditAssessment,
  responsesMap: Record<string, ItemStatus>,
  notesMap: Record<string, string>,
  customItems: AuditCustomItem[],
  documents: AuditDocument[],
  correctiveActions: AuditCorrectiveAction[] = [],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CCHC Solutions";
  workbook.created = new Date();

  const headerFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FF1e40af" },
  };
  const defFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" },
  };
  const passFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" },
  };
  const pendFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" },
  };
  const naFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" },
  };
  const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const boldFont = { bold: true, size: 10 };

  function statusLabel(s: ItemStatus) {
    if (s === "pass") return "Pass";
    if (s === "fail") return "Deficient";
    if (s === "na") return "N/A";
    return "Pending";
  }

  function rowFill(s: ItemStatus) {
    if (s === "pass") return passFill;
    if (s === "fail") return defFill;
    if (s === "na") return naFill;
    return pendFill;
  }

  // ── Sheet 1: Full Checklist ──────────────────────────────────────────────
  const ws1 = workbook.addWorksheet("Full Checklist");
  ws1.columns = [
    { header: "Category", key: "category", width: 22 },
    { header: "Item", key: "item", width: 55 },
    { header: "Regulation", key: "ref", width: 14 },
    { header: "Status", key: "status", width: 12 },
    { header: "Notes", key: "notes", width: 40 },
    { header: "Files", key: "files", width: 8 },
  ];

  const h1Row = ws1.getRow(1);
  h1Row.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle" };
  });
  h1Row.height = 20;

  for (const cat of CHECKLIST) {
    for (const item of cat.items) {
      const status = responsesMap[item.key] || "pending";
      const notes = notesMap[item.key] || "";
      const fileCount = documents.filter(d => d.itemKey === item.key).length;
      const row = ws1.addRow({
        category: cat.label,
        item: item.label,
        ref: item.reference ? `§ ${item.reference}` : "",
        status: statusLabel(status),
        notes,
        files: fileCount || "",
      });
      row.eachCell(cell => {
        cell.fill = rowFill(status);
        cell.font = { size: 10 };
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    }
    const customCatItems = customItems.filter(i => i.category === cat.id);
    for (const item of customCatItems) {
      const status = responsesMap[item.id] || "pending";
      const notes = notesMap[item.id] || "";
      const fileCount = documents.filter(d => d.itemKey === item.id).length;
      const row = ws1.addRow({
        category: `${cat.label} (custom)`,
        item: item.label,
        ref: "",
        status: statusLabel(status),
        notes,
        files: fileCount || "",
      });
      row.eachCell(cell => {
        cell.fill = rowFill(status);
        cell.font = { size: 10 };
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    }
  }

  // ── Sheet 2: Deficiencies ───────────────────────────────────────────────
  const ws2 = workbook.addWorksheet("Deficiencies");
  ws2.columns = [
    { header: "Category", key: "category", width: 22 },
    { header: "Deficient Item", key: "item", width: 55 },
    { header: "Regulation", key: "ref", width: 14 },
    { header: "Notes / Findings", key: "notes", width: 45 },
    { header: "Files", key: "files", width: 8 },
  ];

  const h2Row = ws2.getRow(1);
  h2Row.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
    cell.font = headerFont;
    cell.alignment = { vertical: "middle" };
  });
  h2Row.height = 20;

  let hasDeficiencies = false;
  for (const cat of CHECKLIST) {
    for (const item of cat.items) {
      if ((responsesMap[item.key] || "pending") !== "fail") continue;
      hasDeficiencies = true;
      const notes = notesMap[item.key] || "";
      const fileCount = documents.filter(d => d.itemKey === item.key).length;
      const row = ws2.addRow({
        category: cat.label,
        item: item.label,
        ref: item.reference ? `§ ${item.reference}` : "",
        notes,
        files: fileCount || "",
      });
      row.eachCell(cell => {
        cell.fill = defFill;
        cell.font = { size: 10 };
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    }
    const customCatItems = customItems.filter(i => i.category === cat.id);
    for (const item of customCatItems) {
      if ((responsesMap[item.id] || "pending") !== "fail") continue;
      hasDeficiencies = true;
      const notes = notesMap[item.id] || "";
      const fileCount = documents.filter(d => d.itemKey === item.id).length;
      const row = ws2.addRow({
        category: `${cat.label} (custom)`,
        item: item.label,
        ref: "",
        notes,
        files: fileCount || "",
      });
      row.eachCell(cell => {
        cell.fill = defFill;
        cell.font = { size: 10 };
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    }
  }

  if (!hasDeficiencies) {
    ws2.addRow({ category: "No deficiencies found", item: "", ref: "", notes: "", files: "" });
  }

  // ── Sheet 3: Corrective Actions ─────────────────────────────────────────
  const ws3 = workbook.addWorksheet("Corrective Actions");
  ws3.columns = [
    { header: "Category", key: "category", width: 22 },
    { header: "Deficient Item", key: "item", width: 45 },
    { header: "Responsible Party", key: "responsible", width: 22 },
    { header: "Target Date", key: "targetDate", width: 14 },
    { header: "Completion Date", key: "completionDate", width: 16 },
    { header: "Status", key: "status", width: 14 },
    { header: "Action Steps", key: "steps", width: 50 },
  ];

  const h3Row = ws3.getRow(1);
  h3Row.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1e3a5f" } };
    cell.font = headerFont;
    cell.alignment = { vertical: "middle" };
  });
  h3Row.height = 20;

  const caStatusLabel: Record<string, string> = { open: "Open", in_progress: "In Progress", resolved: "Resolved" };

  const caMap = new Map(correctiveActions.map(ca => [ca.itemKey, ca]));

  let hasCaRows = false;
  for (const cat of CHECKLIST) {
    for (const item of cat.items) {
      if ((responsesMap[item.key] || "pending") !== "fail") continue;
      const ca = caMap.get(item.key);
      hasCaRows = true;
      ws3.addRow({
        category: cat.label,
        item: item.label,
        responsible: ca?.responsibleParty || "",
        targetDate: ca?.targetDate || "",
        completionDate: ca?.completionDate || "",
        status: ca ? caStatusLabel[ca.status] || ca.status : "Open",
        steps: ca?.actionSteps || "",
      }).eachCell(cell => {
        cell.font = { size: 10 };
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    }
    const customCatItems = customItems.filter(i => i.category === cat.id);
    for (const item of customCatItems) {
      if ((responsesMap[item.id] || "pending") !== "fail") continue;
      const ca = caMap.get(item.id);
      hasCaRows = true;
      ws3.addRow({
        category: `${cat.label} (custom)`,
        item: item.label,
        responsible: ca?.responsibleParty || "",
        targetDate: ca?.targetDate || "",
        completionDate: ca?.completionDate || "",
        status: ca ? caStatusLabel[ca.status] || ca.status : "Open",
        steps: ca?.actionSteps || "",
      }).eachCell(cell => {
        cell.font = { size: 10 };
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    }
  }

  if (!hasCaRows) {
    ws3.addRow({ category: "No deficiencies requiring corrective action", item: "", responsible: "", targetDate: "", completionDate: "", status: "", steps: "" });
  }

  // Metadata header above sheet 1 data — prepend rows
  ws1.spliceRows(1, 0,
    [`DOH Audit Assessment — ${audit.title}`],
    [`Status: ${audit.status === "completed" ? "Completed" : audit.status === "archived" ? "Archived" : "In Progress"}${audit.surveyPeriod ? `  |  Period: ${audit.surveyPeriod}` : ""}${audit.surveyorName ? `  |  Surveyor: ${audit.surveyorName}` : ""}${audit.auditDate ? `  |  Audit Date: ${audit.auditDate}` : ""}`],
    [],
  );
  const titleRow1 = ws1.getRow(1);
  titleRow1.getCell(1).font = { bold: true, size: 13 };
  titleRow1.height = 22;
  ws1.getRow(2).getCell(1).font = { size: 10, italic: true, color: { argb: "FF555555" } };

  // Download
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const safeName = audit.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_").slice(0, 40);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `DOH_Audit_${safeName}_${dateStr}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function statusLabel(s: ItemStatus) {
  if (s === "pass") return "Pass";
  if (s === "fail") return "Deficient";
  if (s === "na") return "N/A";
  return "Pending";
}

async function loadImageForPdf(
  url: string,
): Promise<{ dataUrl: string; width: number; height: number; format: "PNG" | "JPEG" } | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    const mime = (blob.type || "").toLowerCase();
    const format: "PNG" | "JPEG" = mime.includes("jpeg") || mime.includes("jpg") ? "JPEG" : "PNG";
    return { dataUrl, width: dims.width, height: dims.height, format };
  } catch {
    return null;
  }
}

async function exportAuditToPDF(
  audit: AuditAssessment,
  responsesMap: Record<string, ItemStatus>,
  notesMap: Record<string, string>,
  customItems: AuditCustomItem[],
  correctiveActions: AuditCorrectiveAction[],
  officeName: string,
  officeLogoUrl?: string,
  fallbackLogoUrl?: string,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = W - margin * 2;

  const NAVY = [30, 64, 175] as [number, number, number];
  const RED_DARK = [153, 27, 27] as [number, number, number];
  const GREEN = [21, 128, 61] as [number, number, number];
  const GRAY = [107, 114, 128] as [number, number, number];
  const LIGHT_GRAY = [243, 244, 246] as [number, number, number];
  const RED_LIGHT = [254, 226, 226] as [number, number, number];
  const GREEN_LIGHT = [209, 250, 229] as [number, number, number];
  const YELLOW_LIGHT = [254, 243, 199] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];

  const auditDateStr = audit.auditDate ? format(new Date(audit.auditDate), "MMMM d, yyyy") : "";
  const generatedStr = format(new Date(), "MMMM d, yyyy 'at' h:mm a");

  // Try to load the agency logo (fallback to CCHC wordmark) for the cover header.
  // We collect candidates and try each one through addImage too, so that an
  // unsupported image format (e.g. SVG) for the office logo still falls back
  // to the bundled CCHC wordmark instead of leaving the header logo-less.
  const logoCandidates: string[] = [];
  if (officeLogoUrl) logoCandidates.push(officeLogoUrl);
  if (fallbackLogoUrl && fallbackLogoUrl !== officeLogoUrl) logoCandidates.push(fallbackLogoUrl);

  // ── Page 1: Cover ──────────────────────────────────────────────────────────
  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 48, "F");

  // Logo (upper-left, on a white pad so dark logos remain readable on the navy band)
  for (const url of logoCandidates) {
    const logo = await loadImageForPdf(url);
    if (!logo) continue;
    const maxW = 28;
    const maxH = 20;
    const ratio = logo.width / logo.height;
    let lw = maxW;
    let lh = lw / ratio;
    if (lh > maxH) { lh = maxH; lw = lh * ratio; }
    const pad = 1.5;
    const lx = margin;
    const ly = (48 - lh) / 2;
    doc.setFillColor(...WHITE);
    doc.roundedRect(lx - pad, ly - pad, lw + pad * 2, lh + pad * 2, 1.5, 1.5, "F");
    try {
      doc.addImage(logo.dataUrl, logo.format, lx, ly, lw, lh);
      break;
    } catch {
      // Cover the white pad back with navy and try the next candidate.
      doc.setFillColor(...NAVY);
      doc.rect(lx - pad, ly - pad, lw + pad * 2, lh + pad * 2, "F");
    }
  }

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("DOH Audit Assessment Report", W / 2, 22, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Department of Health Compliance Checklist", W / 2, 32, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Generated ${generatedStr}`, W / 2, 41, { align: "center" });

  // Info card
  let y = 62;
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin, y, contentW, 72, 3, 3, "F");
  y += 10;

  const infoRows: [string, string][] = [
    ["Agency", officeName || "—"],
    ["Audit Title", audit.title],
    ["Surveyor", audit.surveyorName || "—"],
    ["Audit Date", auditDateStr || "—"],
    ["Survey Period", audit.surveyPeriod || "—"],
    ["Status", audit.status === "completed" ? "Completed" : audit.status === "archived" ? "Archived" : "In Progress"],
  ];

  doc.setTextColor(30, 30, 30);
  for (const [label, value] of infoRows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${label}:`, margin + 6, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 42, y);
    y += 10;
  }

  // Scorecard
  y = 148;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("Summary Scorecard", margin, y);
  y += 6;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentW, y);
  y += 8;

  const totalItems = BUILTIN_TOTAL + customItems.length;
  const pass = Object.values(responsesMap).filter(s => s === "pass").length;
  const fail = Object.values(responsesMap).filter(s => s === "fail").length;
  const na = Object.values(responsesMap).filter(s => s === "na").length;
  const reviewed = pass + fail + na;
  const pct = totalItems > 0 ? Math.round((reviewed / totalItems) * 100) : 0;
  const scorePct = (pass + fail) > 0 ? Math.round((pass / (pass + fail)) * 100) : 0;

  // Score tiles (4 across)
  const tiles: { label: string; value: string | number; color: [number, number, number]; bg: [number, number, number] }[] = [
    { label: "Compliance Score", value: `${scorePct}%`, color: scorePct >= 80 ? GREEN : RED_DARK, bg: scorePct >= 80 ? GREEN_LIGHT : RED_LIGHT },
    { label: "Pass", value: pass, color: GREEN, bg: GREEN_LIGHT },
    { label: "Deficient", value: fail, color: RED_DARK, bg: RED_LIGHT },
    { label: "N/A", value: na, color: GRAY, bg: LIGHT_GRAY },
  ];

  const tileW = (contentW - 9) / 4;
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const tx = margin + i * (tileW + 3);
    doc.setFillColor(...t.bg);
    doc.roundedRect(tx, y, tileW, 28, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...t.color);
    doc.text(String(t.value), tx + tileW / 2, y + 15, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(t.label, tx + tileW / 2, y + 23, { align: "center" });
  }
  y += 36;

  // Progress bar
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text(`${reviewed} of ${totalItems} items reviewed (${pct}% complete)`, margin, y);
  y += 4;
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(margin, y, contentW, 4, "F");
  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentW * (pct / 100), 4, "F");
  y += 12;

  // Per-category scorecard table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Category Breakdown", margin, y);
  y += 4;

  const catRows: (string | number)[][] = CHECKLIST.map(cat => {
    const builtInItems = cat.items;
    const customCatItems = customItems.filter(i => i.category === cat.id);
    const allKeys = [...builtInItems.map(i => i.key), ...customCatItems.map(i => i.id)];
    const p = allKeys.filter(k => responsesMap[k] === "pass").length;
    const f = allKeys.filter(k => responsesMap[k] === "fail").length;
    const n = allKeys.filter(k => responsesMap[k] === "na").length;
    const rev = p + f + n;
    const sc = (p + f) > 0 ? `${Math.round((p / (p + f)) * 100)}%` : "—";
    return [cat.label, allKeys.length, p, f, n, `${rev}/${allKeys.length}`, sc];
  });

  autoTable(doc, {
    startY: y,
    head: [["Category", "Total", "Pass", "Deficient", "N/A", "Reviewed", "Score"]],
    body: catRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { halign: "center", cellWidth: 14 },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "center", cellWidth: 18 },
      4: { halign: "center", cellWidth: 14 },
      5: { halign: "center", cellWidth: 22 },
      6: { halign: "center", cellWidth: 16 },
    },
  });

  // ── Page 2+: Full Checklist by Category ──────────────────────────────────
  doc.addPage();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("Full Checklist", margin, 9.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${audit.title}  ·  ${officeName}`, W - margin, 9.5, { align: "right" });

  let startY = 20;

  for (const cat of CHECKLIST) {
    const builtInItems = cat.items;
    const customCatItems = customItems.filter(i => i.category === cat.id);
    const allItems: { key: string; label: string; reference?: string; isCustom?: boolean }[] = [
      ...builtInItems,
      ...customCatItems.map(i => ({ key: i.id, label: i.label, isCustom: true })),
    ];

    const tableBody: (string | { content: string; styles: object })[][] = allItems.map(item => {
      const status = responsesMap[item.key] || "pending";
      const note = notesMap[item.key] || "";
      const refStr = item.reference ? `§ ${item.reference}` : (item.isCustom ? "Custom" : "");
      return [
        item.label,
        refStr,
        statusLabel(status),
        note,
      ];
    });

    autoTable(doc, {
      startY,
      head: [[{ content: cat.label, colSpan: 4, styles: { halign: "left", fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 9 } }],
             ["Requirement", "Regulation", "Status", "Notes / Findings"]],
      body: tableBody,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
      headStyles: { fillColor: [51, 65, 85] as [number, number, number], textColor: WHITE, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 22, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: "auto" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const statusVal = data.cell.raw as string;
          if (statusVal === "Pass") {
            data.cell.styles.fillColor = GREEN_LIGHT;
            data.cell.styles.textColor = [21, 128, 61] as [number, number, number];
            data.cell.styles.fontStyle = "bold";
          } else if (statusVal === "Deficient") {
            data.cell.styles.fillColor = RED_LIGHT;
            data.cell.styles.textColor = [153, 27, 27] as [number, number, number];
            data.cell.styles.fontStyle = "bold";
          } else if (statusVal === "N/A") {
            data.cell.styles.fillColor = LIGHT_GRAY;
            data.cell.styles.textColor = GRAY;
          } else {
            data.cell.styles.fillColor = YELLOW_LIGHT;
            data.cell.styles.textColor = [120, 80, 0] as [number, number, number];
          }
        }
      },
      didDrawPage: () => {
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, W, 14, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...WHITE);
        doc.text("Full Checklist", margin, 9.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`${audit.title}  ·  ${officeName}`, W - margin, 9.5, { align: "right" });
      },
    });

    startY = doc.lastAutoTable.finalY + 6;
  }

  // ── Final Page: Deficiencies ──────────────────────────────────────────────
  doc.addPage();

  doc.setFillColor(...RED_DARK);
  doc.rect(0, 0, W, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("Deficiencies", margin, 9.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${audit.title}  ·  ${officeName}`, W - margin, 9.5, { align: "right" });

  const caMap = new Map(correctiveActions.map(ca => [ca.itemKey, ca]));
  const caStatusLabel: Record<string, string> = { open: "Open", in_progress: "In Progress", resolved: "Resolved" };

  const defRows: (string | { content: string; styles?: object })[][] = [];

  for (const cat of CHECKLIST) {
    for (const item of cat.items) {
      if ((responsesMap[item.key] || "pending") !== "fail") continue;
      const note = notesMap[item.key] || "";
      const ca = caMap.get(item.key);
      defRows.push([
        cat.label,
        item.label,
        item.reference ? `§ ${item.reference}` : "",
        note,
        ca?.responsibleParty || "",
        ca?.targetDate || "",
        ca ? caStatusLabel[ca.status] || ca.status : "Open",
      ]);
    }
    const customCatItems = customItems.filter(i => i.category === cat.id);
    for (const item of customCatItems) {
      if ((responsesMap[item.id] || "pending") !== "fail") continue;
      const note = notesMap[item.id] || "";
      const ca = caMap.get(item.id);
      defRows.push([
        `${cat.label} (custom)`,
        item.label,
        "",
        note,
        ca?.responsibleParty || "",
        ca?.targetDate || "",
        ca ? caStatusLabel[ca.status] || ca.status : "Open",
      ]);
    }
  }

  if (defRows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...GREEN);
    doc.text("No deficiencies found — all reviewed items passed.", margin, 30);
  } else {
    autoTable(doc, {
      startY: 20,
      head: [["Category", "Deficient Item", "Regulation", "Notes / Findings", "Responsible Party", "Target Date", "CA Status"]],
      body: defRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak", fillColor: RED_LIGHT as [number, number, number] },
      headStyles: { fillColor: RED_DARK, textColor: WHITE, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 60 },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: "auto" },
        4: { cellWidth: 24 },
        5: { cellWidth: 18, halign: "center" },
        6: { cellWidth: 18, halign: "center" },
      },
      didDrawPage: () => {
        doc.setFillColor(...RED_DARK);
        doc.rect(0, 0, W, 14, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...WHITE);
        doc.text("Deficiencies", margin, 9.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`${audit.title}  ·  ${officeName}`, W - margin, 9.5, { align: "right" });
      },
    });
  }

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(`Page ${i} of ${totalPages}`, W / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
    doc.text("CCHC Solutions — Confidential", margin, doc.internal.pageSize.getHeight() - 6);
  }

  // Download
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const safeName = audit.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_").slice(0, 40);
  doc.save(`DOH_Audit_${safeName}_${dateStr}.pdf`);
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
  const [newSurveyorName, setNewSurveyorName] = useState("");
  const [newAuditDate, setNewAuditDate] = useState("");
  const [newOfficeId, setNewOfficeId] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareViewIds, setCompareViewIds] = useState<[string, string] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compareParam = params.get("compare");
    if (compareParam) {
      const ids = compareParam.split(",").map(s => s.trim()).filter(Boolean);
      if (ids.length === 2) {
        setCompareViewIds([ids[0], ids[1]]);
      }
    }
  }, []);

  const enterCompareView = (id1: string, id2: string) => {
    setCompareViewIds([id1, id2]);
    const url = new URL(window.location.href);
    url.searchParams.set("compare", `${id1},${id2}`);
    window.history.pushState({}, "", url.toString());
  };

  const exitCompareView = () => {
    setCompareViewIds(null);
    setCompareMode(false);
    setSelectedForCompare([]);
    const url = new URL(window.location.href);
    url.searchParams.delete("compare");
    window.history.pushState({}, "", url.toString());
  };

  const toggleSelectForCompare = (auditId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(auditId)) return prev.filter(id => id !== auditId);
      if (prev.length >= 2) return prev;
      return [...prev, auditId];
    });
  };

  const officeId = selectedOfficeId && selectedOfficeId !== "all"
    ? selectedOfficeId : (user as any)?.primaryOfficeId || "";

  const { data: offices = [] } = useQuery<Office[]>({ queryKey: ["/api/offices"] });

  const effectiveOfficeId = newOfficeId || officeId;

  const { data: audits = [], isLoading: listLoading } = useQuery<AuditAssessment[]>({
    queryKey: ["/api/doh-audits", officeId],
    queryFn: async () => {
      if (!officeId) return [];
      const res = await fetch(`/api/doh-audits?officeId=${officeId}`, { credentials: "include" });
      if (!res.ok) throw new Error(res.statusText);
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

  const { data: correctiveActions = [] } = useQuery<AuditCorrectiveAction[]>({
    queryKey: ["/api/doh-audits", activeAuditId, "corrective-actions"],
    queryFn: async () => {
      if (!activeAuditId) return [];
      const res = await fetch(`/api/doh-audits/${activeAuditId}/corrective-actions`, { credentials: "include" });
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
    enabled: !!activeAuditId,
  });

  const correctiveActionMutation = useMutation({
    mutationFn: (data: { itemKey: string; responsibleParty?: string; targetDate?: string; completionDate?: string; actionSteps?: string; status?: string }) =>
      apiRequest("PUT", `/api/doh-audits/${activeAuditId}/corrective-actions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId, "corrective-actions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to save corrective action.", variant: "destructive" }),
  });

  const deleteCorrectiveActionMutation = useMutation({
    mutationFn: (actionId: string) =>
      apiRequest("DELETE", `/api/doh-audits/${activeAuditId}/corrective-actions/${actionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId, "corrective-actions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete corrective action.", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/doh-audits", data),
    onSuccess: async (newAudit: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", officeId] });
      setCreateDialogOpen(false);
      setNewTitle("");
      setNewPeriod("");
      setNewSurveyorName("");
      setNewAuditDate("");
      setNewOfficeId("");
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
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] });
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", officeId] });
      if (vars.status === "archived") toast({ title: "Audit archived" });
      if (vars.status === "in_progress") toast({ title: "Audit reopened" });
    },
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

  // File upload — sequential queue state
  const [uploadingItemKey, setUploadingItemKey] = useState<string | null>(null);
  const uploadQueue = useRef<{ auditId: string; file: File; itemKey?: string | null }[]>([]);
  const isUploadingRef = useRef(false);

  const processUploadQueue = useCallback(async () => {
    if (isUploadingRef.current || uploadQueue.current.length === 0) return;
    isUploadingRef.current = true;
    while (uploadQueue.current.length > 0) {
      const job = uploadQueue.current.shift()!;
      if (job.itemKey) setUploadingItemKey(job.itemKey);
      const formData = new FormData();
      formData.append("file", job.file);
      if (job.itemKey) formData.append("itemKey", job.itemKey);
      try {
        const res = await fetch(`/api/doh-audits/${job.auditId}/documents/upload`, {
          method: "POST", body: formData, credentials: "include",
        });
        if (!res.ok) throw new Error("Upload failed");
        queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", job.auditId] });
        toast({ title: "File attached" });
      } catch {
        toast({ title: "Upload failed", description: "Check file size and format.", variant: "destructive" });
      }
    }
    isUploadingRef.current = false;
    setUploadingItemKey(null);
  }, [queryClient, toast]);

  const enqueueUpload = useCallback((auditId: string, file: File, itemKey?: string | null) => {
    uploadQueue.current.push({ auditId, file, itemKey });
    processUploadQueue();
  }, [processUploadQueue]);

  const attachToItem = useCallback((itemKey: string, file: File) => {
    if (!activeAuditId) return;
    setUploadingItemKey(itemKey);
    enqueueUpload(activeAuditId, file, itemKey);
  }, [activeAuditId, enqueueUpload]);

  const uploadDocMutation = useMutation({
    mutationFn: async ({ auditId, file, notes }: { auditId: string; file: File; notes?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (notes) formData.append("notes", notes);
      const res = await fetch(`/api/doh-audits/${auditId}/documents/upload`, {
        method: "POST", body: formData, credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-audits", activeAuditId] });
      toast({ title: "File uploaded" });
    },
    onError: () => toast({ title: "Upload failed", description: "Unable to upload file. Check size and format.", variant: "destructive" }),
  });

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

  const handleExport = async () => {
    if (!activeAudit || !activeAuditId) return;
    setExportingId(activeAuditId);
    try {
      await exportAuditToExcel(activeAudit, responsesMap, notesMap, customItems, auditDocuments, correctiveActions);
      toast({ title: "Export complete" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExportingId(null);
    }
  };

  const handleExportPDF = async () => {
    if (!activeAudit || !activeAuditId) return;
    setExportingPdfId(activeAuditId);
    try {
      const currentOffice = offices.find((o: Office) => o.id === (activeAudit.officeId || officeId));
      const currentOfficeName = currentOffice?.name || "";
      const officeLogoUrl = currentOffice?.logoFileName ? `/uploads/${currentOffice.logoFileName}` : undefined;
      await exportAuditToPDF(
        activeAudit,
        responsesMap,
        notesMap,
        customItems,
        correctiveActions,
        currentOfficeName,
        officeLogoUrl,
        cchcLogo,
      );
      toast({ title: "PDF exported" });
    } catch {
      toast({ title: "PDF export failed", variant: "destructive" });
    } finally {
      setExportingPdfId(null);
    }
  };

  const isCompleted = activeAudit?.status === "completed";
  const isArchived = activeAudit?.status === "archived";
  const isLocked = isCompleted || isArchived;
  const stats = computeStats(responsesMap, customItems);

  const visibleAudits = audits.filter(a => showArchived ? a.status === "archived" : a.status !== "archived");

  // ─── Compare view ─────────────────────────────────────────────────────────

  if (compareViewIds) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <CompareView
          auditId1={compareViewIds[0]}
          auditId2={compareViewIds[1]}
          onBack={exitCompareView}
        />
      </div>
    );
  }

  // ─── List view ────────────────────────────────────────────────────────────

  if (!activeAuditId) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ClipboardCheck size={24} /> DOH Audit Assessment
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Manage DOH home care audit readiness checklists for your agency
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!compareMode && visibleAudits.length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => { setCompareMode(true); setSelectedForCompare([]); }}
                  >
                    <ArrowLeftRight size={15} /> Compare
                  </Button>
                )}
                {!compareMode && (
                  <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                    <Plus size={16} /> New Audit
                  </Button>
                )}
                {compareMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setCompareMode(false); setSelectedForCompare([]); }}
                  >
                    <X size={14} className="mr-1" /> Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* Compare mode banner */}
            {compareMode && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <ArrowLeftRight size={16} />
                  <span>
                    {selectedForCompare.length === 0
                      ? "Select 2 audits to compare side-by-side"
                      : selectedForCompare.length === 1
                      ? "Select one more audit to compare"
                      : "Ready to compare — click Compare below"}
                  </span>
                </div>
                {selectedForCompare.length === 2 && (
                  <Button
                    size="sm"
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => enterCompareView(selectedForCompare[0], selectedForCompare[1])}
                  >
                    <ArrowLeftRight size={14} /> Compare Selected
                  </Button>
                )}
              </div>
            )}

            {/* Archived toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setShowArchived(false)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${!showArchived ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                Active
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${showArchived ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Archive size={13} /> Archived
                {audits.filter(a => a.status === "archived").length > 0 && (
                  <Badge className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0 ml-0.5">
                    {audits.filter(a => a.status === "archived").length}
                  </Badge>
                )}
              </button>
            </div>

            {listLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-24" />)}
              </div>
            ) : visibleAudits.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  {showArchived ? (
                    <>
                      <Archive size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
                      <p className="text-muted-foreground">No archived audits.</p>
                    </>
                  ) : (
                    <>
                      <ClipboardCheck size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
                      <p className="text-muted-foreground">No audits yet. Create your first audit to get started.</p>
                      <Button className="mt-4 gap-2" onClick={() => setCreateDialogOpen(true)}>
                        <Plus size={15} /> Create First Audit
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {visibleAudits.map(audit => {
                  const reviewed = audit.reviewedCount ?? 0;
                  const fails = audit.failCount ?? 0;
                  const totalItems = BUILTIN_TOTAL + (audit.customItemCount ?? 0);
                  const pct = Math.round((reviewed / totalItems) * 100);
                  const isSelectedForCompare = selectedForCompare.includes(audit.id);
                  const compareSelectionOrder = selectedForCompare.indexOf(audit.id);
                  return (
                    <Card
                      key={audit.id}
                      className={`transition-all ${compareMode
                        ? isSelectedForCompare
                          ? "border-blue-400 ring-2 ring-blue-300 dark:ring-blue-700 shadow-md cursor-pointer"
                          : selectedForCompare.length >= 2
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-blue-300 hover:shadow-sm cursor-pointer"
                        : "cursor-pointer hover:shadow-md hover:border-primary/30"}`}
                      onClick={() => {
                        if (compareMode) {
                          if (isSelectedForCompare || selectedForCompare.length < 2) {
                            toggleSelectForCompare(audit.id);
                          }
                        } else {
                          setActiveAuditId(audit.id);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          {compareMode && (
                            <div className="shrink-0 mt-1">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                                ${isSelectedForCompare
                                  ? "bg-blue-500 border-blue-500"
                                  : "border-gray-300 dark:border-gray-600"}`}
                              >
                                {isSelectedForCompare && (
                                  <span className="text-white text-[10px] font-bold leading-none">
                                    {compareSelectionOrder + 1}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-2.5 rounded-lg shrink-0 ${audit.status === "archived" ? "bg-gray-100 dark:bg-gray-800" : "bg-blue-50 dark:bg-blue-900/20"}`}>
                              {audit.status === "archived"
                                ? <Archive size={20} className="text-gray-500 dark:text-gray-400" />
                                : <ClipboardCheck size={20} className="text-blue-600 dark:text-blue-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold truncate">{audit.title}</h3>
                                {audit.status === "completed" && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300">
                                    <CheckCircle2 size={11} className="mr-1" /> Completed
                                  </Badge>
                                )}
                                {audit.status === "archived" && (
                                  <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400">
                                    <Archive size={11} className="mr-1" /> Archived
                                  </Badge>
                                )}
                                {audit.status === "in_progress" && (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                                    <Clock size={11} className="mr-1" /> In Progress
                                  </Badge>
                                )}
                                {fails > 0 && (
                                  <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                                    {fails} {fails === 1 ? "deficiency" : "deficiencies"}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                                {audit.surveyPeriod && <span>Period: {audit.surveyPeriod}</span>}
                                {audit.surveyorName && (
                                  <span className="flex items-center gap-0.5"><User size={11} /> {audit.surveyorName}</span>
                                )}
                                {audit.auditDate && <span>Date: {audit.auditDate}</span>}
                                <span>Created: {new Date(audit.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <Progress value={pct} className="h-1.5 flex-1" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                  {reviewed}/{totalItems} reviewed
                                </span>
                              </div>
                            </div>
                          </div>
                          {!compareMode && (
                          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                                  <MoreVertical size={15} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {audit.status !== "archived" ? (
                                  <DropdownMenuItem
                                    onClick={() => statusMutation.mutate({ id: audit.id, status: "archived" })}
                                    className="gap-2 text-muted-foreground"
                                  >
                                    <Archive size={14} /> Archive
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => statusMutation.mutate({ id: audit.id, status: "in_progress" })}
                                    className="gap-2"
                                  >
                                    <ArchiveRestore size={14} /> Unarchive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteAuditId(audit.id)}
                                  className="gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 size={14} /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
                <Label>Audit Title <span className="text-destructive">*</span></Label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. 2025 Annual DOH Survey Prep"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Survey Period <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    value={newPeriod}
                    onChange={e => setNewPeriod(e.target.value)}
                    placeholder="e.g. Q1 2025"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Audit Date <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    type="date"
                    value={newAuditDate}
                    onChange={e => setNewAuditDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Surveyor Name <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={newSurveyorName}
                  onChange={e => setNewSurveyorName(e.target.value)}
                  placeholder="Name of DOH surveyor"
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
                  surveyorName: newSurveyorName.trim() || null,
                  auditDate: newAuditDate || null,
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
                {isArchived && (
                  <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400">
                    <Archive size={11} className="mr-1" /> Archived
                  </Badge>
                )}
                {isCompleted && !isArchived && (
                  <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300">
                    <CheckCircle2 size={11} className="mr-1" /> Completed
                  </Badge>
                )}
                {!isCompleted && !isArchived && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                    <Clock size={11} className="mr-1" /> In Progress
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                {activeAudit?.surveyPeriod && <span>Period: {activeAudit.surveyPeriod}</span>}
                {activeAudit?.surveyorName && (
                  <span className="flex items-center gap-1"><User size={11} /> {activeAudit.surveyorName}</span>
                )}
                {activeAudit?.auditDate && <span>Audit Date: {activeAudit.auditDate}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={exportingId === activeAuditId || auditLoading}
              onClick={handleExport}
            >
              <FileSpreadsheet size={14} />
              {exportingId === activeAuditId ? "Exporting…" : "Export"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={exportingPdfId === activeAuditId || auditLoading}
              onClick={handleExportPDF}
            >
              <FileText size={14} />
              {exportingPdfId === activeAuditId ? "Generating…" : "Export PDF"}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </Button>
            {isArchived ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => statusMutation.mutate({ id: activeAuditId!, status: "in_progress" })}
              >
                <ArchiveRestore size={14} /> Unarchive
              </Button>
            ) : isCompleted ? (
              <>
                <Button variant="outline" size="sm" onClick={() => statusMutation.mutate({ id: activeAuditId!, status: "in_progress" })}>
                  Reopen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-muted-foreground"
                  onClick={() => statusMutation.mutate({ id: activeAuditId!, status: "archived" })}
                >
                  <Archive size={14} /> Archive
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => statusMutation.mutate({ id: activeAuditId!, status: "completed" })}
                >
                  <CheckCircle2 size={15} /> Mark Complete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-muted-foreground"
                  onClick={() => statusMutation.mutate({ id: activeAuditId!, status: "archived" })}
                >
                  <Archive size={14} /> Archive
                </Button>
              </>
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

            {/* Category Tabs + Deficiencies + Documents tab */}
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
                      {cs.fail === 0 && cs.reviewed === cs.total && cs.total > 0 && (
                        <CheckCircle2 size={12} className="text-green-500 ml-1" />
                      )}
                    </TabsTrigger>
                  );
                })}
                <TabsTrigger value="deficiencies" className="gap-1.5 text-xs py-1.5 px-3">
                  <XCircle size={13} className={stats.fail > 0 ? "text-red-500" : "text-muted-foreground"} />
                  <span className="hidden sm:inline">Deficiencies</span>
                  {stats.fail > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-1 py-0 ml-1">{stats.fail}</Badge>
                  )}
                </TabsTrigger>
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
                    disabled={isLocked}
                    onAddCustomItem={label => addCustomItemMutation.mutate({ auditId: activeAuditId!, category: cat.id, label })}
                    onDeleteCustomItem={itemId => deleteCustomItemMutation.mutate({ auditId: activeAuditId!, itemId })}
                    onAttachToItem={attachToItem}
                    onDeleteDoc={docId => deleteDocMutation.mutate({ auditId: activeAuditId!, docId })}
                    uploadingItemKey={uploadingItemKey}
                  />
                </TabsContent>
              ))}

              <TabsContent value="deficiencies">
                <DeficienciesSection
                  responsesMap={responsesMap}
                  notesMap={notesMap}
                  customItems={customItems}
                  auditDocuments={auditDocuments}
                  auditId={activeAuditId!}
                  correctiveActions={correctiveActions}
                  onSaveCorrectiveAction={(data) => correctiveActionMutation.mutate(data)}
                  onDeleteCorrectiveAction={(actionId) => deleteCorrectiveActionMutation.mutate(actionId)}
                  isSaving={correctiveActionMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="documents">
                <DocumentsSection
                  auditId={activeAuditId!}
                  documents={auditDocuments}
                  customItems={customItems}
                  disabled={isLocked}
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
                  disabled={isLocked}
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
                  Array.from(e.target.files).forEach(file => onAttach(file));
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

// ─── Deficiencies Section ─────────────────────────────────────────────────────

function CorrectiveActionPanel({
  itemKey,
  existingAction,
  onSave,
  onDelete,
  isSaving,
}: {
  itemKey: string;
  existingAction: AuditCorrectiveAction | null;
  onSave: (data: { itemKey: string; responsibleParty?: string; targetDate?: string; completionDate?: string; actionSteps?: string; status?: string }) => void;
  onDelete: (actionId: string) => void;
  isSaving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [responsibleParty, setResponsibleParty] = useState(existingAction?.responsibleParty || "");
  const [targetDate, setTargetDate] = useState(existingAction?.targetDate || "");
  const [completionDate, setCompletionDate] = useState(existingAction?.completionDate || "");
  const [actionSteps, setActionSteps] = useState(existingAction?.actionSteps || "");
  const [status, setStatus] = useState<CorrectiveActionStatus>(existingAction?.status || "open");

  useEffect(() => {
    setResponsibleParty(existingAction?.responsibleParty || "");
    setTargetDate(existingAction?.targetDate || "");
    setCompletionDate(existingAction?.completionDate || "");
    setActionSteps(existingAction?.actionSteps || "");
    setStatus(existingAction?.status || "open");
  }, [existingAction]);

  const hasAction = !!existingAction;

  const statusColor: Record<CorrectiveActionStatus, string> = {
    open: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    in_progress: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    resolved: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  };
  const statusLabel: Record<CorrectiveActionStatus, string> = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
  };

  const handleSave = () => {
    onSave({ itemKey, responsibleParty: responsibleParty || undefined, targetDate: targetDate || undefined, completionDate: completionDate || undefined, actionSteps: actionSteps || undefined, status });
    setExpanded(false);
  };

  return (
    <div className="mt-2">
      {/* Interactive toggle button — hidden during print */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="print:hidden flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {hasAction ? (
          <>
            Corrective Action
            <span className={`inline-flex items-center border rounded px-1.5 py-0 text-[10px] font-semibold ${statusColor[existingAction!.status]}`}>
              {statusLabel[existingAction!.status]}
            </span>
            {existingAction?.responsibleParty && (
              <span className="text-muted-foreground font-normal">— {existingAction.responsibleParty}</span>
            )}
          </>
        ) : (
          <>+ Add Corrective Action</>
        )}
      </button>

      {/* Interactive expanded form — hidden during print */}
      {expanded && (
        <div className="print:hidden mt-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Responsible Party</Label>
              <Input
                value={responsibleParty}
                onChange={e => setResponsibleParty(e.target.value)}
                placeholder="Name or role"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CorrectiveActionStatus)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target Date</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Completion Date</Label>
              <Input
                type="date"
                value={completionDate}
                onChange={e => setCompletionDate(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Action Steps</Label>
            <Textarea
              value={actionSteps}
              onChange={e => setActionSteps(e.target.value)}
              placeholder="Describe the steps to correct this deficiency..."
              className="text-xs min-h-[70px] resize-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
            {hasAction && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-red-500 hover:text-red-700 ml-auto"
                onClick={() => { onDelete(existingAction!.id); setExpanded(false); }}
              >
                <Trash2 size={12} className="mr-1" /> Remove
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Print-only static corrective action summary */}
      {hasAction ? (
        <div className="hidden print:block mt-2 p-2 border border-gray-300 rounded text-xs">
          <p className="font-semibold text-gray-700 mb-1">Corrective Action Plan</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span>
              <span className="font-medium">Status: </span>
              {statusLabel[existingAction!.status]}
            </span>
            {existingAction?.responsibleParty && (
              <span>
                <span className="font-medium">Responsible: </span>
                {existingAction.responsibleParty}
              </span>
            )}
            {existingAction?.targetDate && (
              <span>
                <span className="font-medium">Target Date: </span>
                {existingAction.targetDate}
              </span>
            )}
            {existingAction?.completionDate && (
              <span>
                <span className="font-medium">Completed: </span>
                {existingAction.completionDate}
              </span>
            )}
          </div>
          {existingAction?.actionSteps && (
            <p className="mt-1 text-gray-600">
              <span className="font-medium">Steps: </span>
              {existingAction.actionSteps}
            </p>
          )}
        </div>
      ) : (
        <div className="hidden print:block mt-1">
          <p className="text-xs text-gray-400 italic">No corrective action plan on file.</p>
        </div>
      )}
    </div>
  );
}

function DeficienciesSection({
  responsesMap, notesMap, customItems, auditDocuments, auditId,
  correctiveActions, onSaveCorrectiveAction, onDeleteCorrectiveAction, isSaving,
}: {
  responsesMap: Record<string, ItemStatus>;
  notesMap: Record<string, string>;
  customItems: AuditCustomItem[];
  auditDocuments: AuditDocument[];
  auditId: string;
  correctiveActions: AuditCorrectiveAction[];
  onSaveCorrectiveAction: (data: { itemKey: string; responsibleParty?: string; targetDate?: string; completionDate?: string; actionSteps?: string; status?: string }) => void;
  onDeleteCorrectiveAction: (actionId: string) => void;
  isSaving: boolean;
}) {
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "in_progress" | "resolved">("all");

  const deficientItems: Array<{
    key: string;
    label: string;
    reference?: string;
    category: string;
    notes: string;
    docs: AuditDocument[];
  }> = [];

  for (const cat of CHECKLIST) {
    for (const item of cat.items) {
      if ((responsesMap[item.key] || "pending") === "fail") {
        deficientItems.push({
          key: item.key,
          label: item.label,
          reference: item.reference,
          category: cat.label,
          notes: notesMap[item.key] || "",
          docs: auditDocuments.filter(d => d.itemKey === item.key),
        });
      }
    }
    const customCatItems = customItems.filter(i => i.category === cat.id);
    for (const item of customCatItems) {
      if ((responsesMap[item.id] || "pending") === "fail") {
        deficientItems.push({
          key: item.id,
          label: item.label,
          category: `${cat.label} (custom)`,
          notes: notesMap[item.id] || "",
          docs: auditDocuments.filter(d => d.itemKey === item.id),
        });
      }
    }
  }

  if (deficientItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 size={36} className="mx-auto mb-3 text-green-500 opacity-60" />
          <p className="text-muted-foreground">No deficiencies found.</p>
        </CardContent>
      </Card>
    );
  }

  const deficientKeys = new Set(deficientItems.map(i => i.key));
  const caMap = new Map(correctiveActions.map(ca => [ca.itemKey, ca]));

  // Only count corrective actions that still correspond to a current deficiency
  const relevantCAs = correctiveActions.filter(ca => deficientKeys.has(ca.itemKey));
  const inProgressCount = relevantCAs.filter(ca => ca.status === "in_progress").length;
  const resolvedCount = relevantCAs.filter(ca => ca.status === "resolved").length;
  const openOrUnaddressedCount = deficientItems.length - inProgressCount - resolvedCount;

  const getItemCaStatus = (itemKey: string): "open" | "in_progress" | "resolved" => {
    const ca = caMap.get(itemKey);
    if (!ca) return "open";
    if (ca.status === "in_progress") return "in_progress";
    if (ca.status === "resolved") return "resolved";
    return "open";
  };

  const filteredItems = filterStatus === "all"
    ? deficientItems
    : deficientItems.filter(item => getItemCaStatus(item.key) === filterStatus);

  return (
    <div className="space-y-3">
      {/* Summary counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{openOrUnaddressedCount}</p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 font-medium mt-0.5">Open / Unaddressed</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{inProgressCount}</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium mt-0.5">In Progress</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resolvedCount}</p>
          <p className="text-xs text-green-600/80 dark:text-green-400/80 font-medium mt-0.5">Resolved</p>
        </div>
        <div className="bg-muted border rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{deficientItems.length}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Total Deficiencies</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-500" />
            <CardTitle className="text-base">Deficiencies — {deficientItems.length} item{deficientItems.length !== 1 ? "s" : ""}</CardTitle>
          </div>
          <CardDescription>Expand each deficiency to add or update a corrective action plan.</CardDescription>
          {/* Filter toggles */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {([
              { value: "all", label: "All", count: deficientItems.length },
              { value: "open", label: "Open / Unaddressed", count: openOrUnaddressedCount },
              { value: "in_progress", label: "In Progress", count: inProgressCount },
              { value: "resolved", label: "Resolved", count: resolvedCount },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className={[
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  filterStatus === opt.value
                    ? opt.value === "all"
                      ? "bg-foreground text-background border-foreground"
                      : opt.value === "open"
                      ? "bg-red-500 text-white border-red-500"
                      : opt.value === "in_progress"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-green-500 text-white border-green-500"
                    : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
                ].join(" ")}
              >
                {opt.label}
                <span className={[
                  "rounded-full px-1.5 py-0 text-[10px] font-bold",
                  filterStatus === opt.value ? "bg-white/20" : "bg-muted",
                ].join(" ")}>
                  {opt.count}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No deficiencies match the selected filter.</p>
          )}
          {filteredItems.map((item, idx) => (
            <div key={item.key} className="border-l-4 border-l-red-400 bg-red-50/40 dark:bg-red-950/20 rounded-r-lg px-3 py-3">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 rounded px-1.5 py-0.5 shrink-0 mt-0.5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{item.label}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <Badge className="text-xs px-1.5 py-0 bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400">
                          {item.category}
                        </Badge>
                        {item.reference && (
                          <span className="text-xs text-muted-foreground">§ {item.reference}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {item.notes && (
                    <div className="mt-2 p-2 bg-white dark:bg-background border rounded text-xs text-muted-foreground italic">
                      "{item.notes}"
                    </div>
                  )}
                  {item.docs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.docs.map(doc => (
                        <a
                          key={doc.id}
                          href={`/api/doh-audits/${auditId}/documents/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs bg-white dark:bg-background border rounded px-2 py-1 hover:bg-muted transition-colors"
                          title="View / Download"
                        >
                          {getFileIcon(doc.mimeType)}
                          <span className="truncate max-w-[140px]">{doc.originalName}</span>
                          <Download size={11} className="text-muted-foreground shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                  <CorrectiveActionPanel
                    itemKey={item.key}
                    existingAction={caMap.get(item.key) || null}
                    onSave={onSaveCorrectiveAction}
                    onDelete={onDeleteCorrectiveAction}
                    isSaving={isSaving}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Compare View ─────────────────────────────────────────────────────────────

type DiffResult = "improved" | "regressed" | "unchanged_pass" | "unchanged_fail" | "unchanged_other";

async function exportComparisonToExcel(
  audit1: AuditAssessment,
  audit2: AuditAssessment,
  map1: Record<string, ItemStatus>,
  map2: Record<string, ItemStatus>,
  customItems1: AuditCustomItem[],
  customItems2: AuditCustomItem[],
  stats1: { pass: number; fail: number; scorePct: number },
  stats2: { pass: number; fail: number; scorePct: number },
  diffCounts: { improved: number; regressed: number; unchangedFail: number; unchangedPass: number },
  passRateDiff: number,
  notesMap1: Record<string, string> = {},
  notesMap2: Record<string, string> = {},
  correctiveActions2: AuditCorrectiveAction[] = [],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CCHC Solutions";
  workbook.created = new Date();

  const headerFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" },
  };
  const audit1HeaderFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" },
  };
  const audit2HeaderFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" },
  };
  const improvedFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" },
  };
  const regressedFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" },
  };
  const stillFailFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" },
  };
  const unchangedPassFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" },
  };
  const grayFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" },
  };
  const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

  function statusLabel(s: ItemStatus) {
    if (s === "pass") return "Pass";
    if (s === "fail") return "Deficient";
    if (s === "na") return "N/A";
    return "Pending";
  }

  function diffLabel(diff: DiffResult) {
    if (diff === "improved") return "Improved";
    if (diff === "regressed") return "Regressed";
    if (diff === "unchanged_fail") return "Still Deficient";
    if (diff === "unchanged_pass") return "Unchanged (Pass)";
    return "—";
  }

  function diffFill(diff: DiffResult): ExcelJS.FillPattern {
    if (diff === "improved") return improvedFill;
    if (diff === "regressed") return regressedFill;
    if (diff === "unchanged_fail") return stillFailFill;
    if (diff === "unchanged_pass") return unchangedPassFill;
    return grayFill;
  }

  // ── Sheet 1: Summary ────────────────────────────────────────────────────────
  const wsSummary = workbook.addWorksheet("Summary");
  wsSummary.columns = [
    { key: "label", width: 30 },
    { key: "audit1", width: 28 },
    { key: "audit2", width: 28 },
  ];

  const titleRow = wsSummary.addRow(["Audit Comparison Report", "", ""]);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
  titleRow.getCell(1).alignment = { horizontal: "left" };
  wsSummary.mergeCells(`A1:C1`);

  wsSummary.addRow([]);

  const headerRow = wsSummary.addRow(["", "Audit 1", "Audit 2"]);
  headerRow.getCell(1).fill = headerFill;
  headerRow.getCell(1).font = headerFont;
  headerRow.getCell(2).fill = audit1HeaderFill;
  headerRow.getCell(2).font = headerFont;
  headerRow.getCell(3).fill = audit2HeaderFill;
  headerRow.getCell(3).font = headerFont;
  headerRow.height = 20;

  const metaRows: [string, string, string][] = [
    ["Title", audit1.title, audit2.title],
    ["Date", audit1.auditDate || "—", audit2.auditDate || "—"],
    ["Survey Period", audit1.surveyPeriod || "—", audit2.surveyPeriod || "—"],
    ["Surveyor", audit1.surveyorName || "—", audit2.surveyorName || "—"],
    ["Status", audit1.status === "completed" ? "Completed" : "In Progress", audit2.status === "completed" ? "Completed" : "In Progress"],
  ];
  for (const [label, v1, v2] of metaRows) {
    const r = wsSummary.addRow([label, v1, v2]);
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(2).font = { size: 10 };
    r.getCell(3).font = { size: 10 };
    r.eachCell(cell => { cell.alignment = { wrapText: true, vertical: "top" }; });
  }

  wsSummary.addRow([]);

  const statsHeaderRow = wsSummary.addRow(["Score Summary", "Audit 1", "Audit 2"]);
  statsHeaderRow.getCell(1).fill = headerFill;
  statsHeaderRow.getCell(1).font = headerFont;
  statsHeaderRow.getCell(2).fill = audit1HeaderFill;
  statsHeaderRow.getCell(2).font = headerFont;
  statsHeaderRow.getCell(3).fill = audit2HeaderFill;
  statsHeaderRow.getCell(3).font = headerFont;
  statsHeaderRow.height = 18;

  const scoreRow = wsSummary.addRow([
    "Pass Rate",
    stats1.pass + stats1.fail > 0 ? `${stats1.scorePct}%` : "—",
    stats2.pass + stats2.fail > 0 ? `${stats2.scorePct}%` : "—",
  ]);
  scoreRow.getCell(1).font = { bold: true, size: 10 };
  scoreRow.getCell(2).font = { size: 10 };
  scoreRow.getCell(3).font = { size: 10 };
  scoreRow.getCell(3).font = {
    size: 10,
    color: { argb: passRateDiff > 0 ? "FF15803D" : passRateDiff < 0 ? "FFDC2626" : "FF6B7280" },
  };

  const trendRow = wsSummary.addRow([
    "Pass Rate Trend",
    "",
    passRateDiff > 0 ? `+${passRateDiff}%` : passRateDiff < 0 ? `${passRateDiff}%` : "No change",
  ]);
  trendRow.getCell(1).font = { bold: true, size: 10 };
  trendRow.getCell(3).font = {
    bold: true, size: 10,
    color: { argb: passRateDiff > 0 ? "FF15803D" : passRateDiff < 0 ? "FFDC2626" : "FF6B7280" },
  };

  wsSummary.addRow([]);

  const changesHeaderRow = wsSummary.addRow(["Change Summary", "Count", ""]);
  changesHeaderRow.getCell(1).fill = headerFill;
  changesHeaderRow.getCell(1).font = headerFont;
  changesHeaderRow.getCell(2).fill = headerFill;
  changesHeaderRow.getCell(2).font = headerFont;
  changesHeaderRow.height = 18;

  const changeRows: [string, number, ExcelJS.FillPattern][] = [
    ["Items Improved", diffCounts.improved, improvedFill],
    ["Items Regressed", diffCounts.regressed, regressedFill],
    ["Still Deficient", diffCounts.unchangedFail, stillFailFill],
    ["Unchanged (Pass)", diffCounts.unchangedPass, unchangedPassFill],
  ];
  for (const [label, count, fill] of changeRows) {
    const r = wsSummary.addRow([label, count, ""]);
    r.getCell(1).fill = fill;
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(2).fill = fill;
    r.getCell(2).font = { size: 10 };
  }

  // ── Sheet 2: Full Comparison ─────────────────────────────────────────────────
  const wsComp = workbook.addWorksheet("Full Comparison");
  wsComp.columns = [
    { header: "Category", key: "category", width: 22 },
    { header: "Item", key: "item", width: 50 },
    { header: "Regulation", key: "ref", width: 13 },
    { header: "Audit 1 Status", key: "status1", width: 14 },
    { header: "Audit 2 Status", key: "status2", width: 14 },
    { header: "Change", key: "change", width: 16 },
    { header: "Audit 1 Notes", key: "notes1", width: 40 },
    { header: "Audit 2 Notes", key: "notes2", width: 40 },
  ];

  const compHeader = wsComp.getRow(1);
  compHeader.getCell(1).fill = headerFill;
  compHeader.getCell(1).font = headerFont;
  compHeader.getCell(2).fill = headerFill;
  compHeader.getCell(2).font = headerFont;
  compHeader.getCell(3).fill = headerFill;
  compHeader.getCell(3).font = headerFont;
  compHeader.getCell(4).fill = audit1HeaderFill;
  compHeader.getCell(4).font = headerFont;
  compHeader.getCell(5).fill = audit2HeaderFill;
  compHeader.getCell(5).font = headerFont;
  compHeader.getCell(6).fill = headerFill;
  compHeader.getCell(6).font = headerFont;
  compHeader.getCell(7).fill = audit1HeaderFill;
  compHeader.getCell(7).font = headerFont;
  compHeader.getCell(8).fill = audit2HeaderFill;
  compHeader.getCell(8).font = headerFont;
  compHeader.height = 20;

  for (const cat of CHECKLIST) {
    for (const item of cat.items) {
      const s1 = map1[item.key] || "pending";
      const s2 = map2[item.key] || "pending";
      const diff = getDiff(s1, s2);
      const fill = diffFill(diff);
      const row = wsComp.addRow({
        category: cat.label,
        item: item.label,
        ref: item.reference ? `§ ${item.reference}` : "",
        status1: statusLabel(s1),
        status2: statusLabel(s2),
        change: diffLabel(diff),
        notes1: notesMap1[item.key] || "",
        notes2: notesMap2[item.key] || "",
      });
      row.eachCell(cell => {
        cell.fill = fill;
        cell.font = { size: 10 };
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    }
    const customRows = getCustomCompareItems(cat.id, customItems1, customItems2, map1, map2);
    for (const cr of customRows) {
      const diff = getDiff(cr.s1, cr.s2);
      const fill = diffFill(diff);
      const row = wsComp.addRow({
        category: `${cat.label} (custom)`,
        item: cr.label,
        ref: "",
        status1: statusLabel(cr.s1),
        status2: statusLabel(cr.s2),
        change: diffLabel(diff),
        notes1: notesMap1[cr.id] || "",
        notes2: notesMap2[cr.id] || "",
      });
      row.eachCell(cell => {
        cell.fill = fill;
        cell.font = { size: 10 };
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    }
  }

  // ── Sheet 3 (optional): Audit 2 Corrective Actions ───────────────────────────
  if (correctiveActions2.length > 0) {
    const wsCa = workbook.addWorksheet("Audit 2 Corrective Actions");
    wsCa.columns = [
      { header: "Category", key: "category", width: 22 },
      { header: "Deficient Item", key: "item", width: 45 },
      { header: "Responsible Party", key: "responsible", width: 22 },
      { header: "Target Date", key: "targetDate", width: 14 },
      { header: "Completion Date", key: "completionDate", width: 16 },
      { header: "Status", key: "status", width: 14 },
      { header: "Action Steps", key: "steps", width: 50 },
    ];

    const caHeaderRow = wsCa.getRow(1);
    caHeaderRow.eachCell(cell => {
      cell.fill = audit2HeaderFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle" };
    });
    caHeaderRow.height = 20;

    const caStatusLabel: Record<string, string> = { open: "Open", in_progress: "In Progress", resolved: "Resolved" };
    const caMap = new Map(correctiveActions2.map(ca => [ca.itemKey, ca]));

    let hasCaRows = false;
    for (const cat of CHECKLIST) {
      for (const item of cat.items) {
        if ((map2[item.key] || "pending") !== "fail") continue;
        const ca = caMap.get(item.key);
        if (!ca) continue;
        hasCaRows = true;
        wsCa.addRow({
          category: cat.label,
          item: item.label,
          responsible: ca.responsibleParty || "",
          targetDate: ca.targetDate || "",
          completionDate: ca.completionDate || "",
          status: caStatusLabel[ca.status] || ca.status,
          steps: ca.actionSteps || "",
        }).eachCell(cell => {
          cell.font = { size: 10 };
          cell.alignment = { wrapText: true, vertical: "top" };
        });
      }
      const customCatItems = customItems2.filter(i => i.category === cat.id);
      for (const item of customCatItems) {
        if ((map2[item.id] || "pending") !== "fail") continue;
        const ca = caMap.get(item.id);
        if (!ca) continue;
        hasCaRows = true;
        wsCa.addRow({
          category: `${cat.label} (custom)`,
          item: item.label,
          responsible: ca.responsibleParty || "",
          targetDate: ca.targetDate || "",
          completionDate: ca.completionDate || "",
          status: caStatusLabel[ca.status] || ca.status,
          steps: ca.actionSteps || "",
        }).eachCell(cell => {
          cell.font = { size: 10 };
          cell.alignment = { wrapText: true, vertical: "top" };
        });
      }
    }

    if (!hasCaRows) {
      wsCa.addRow({ category: "No corrective actions on file for current Audit 2 deficiencies", item: "", responsible: "", targetDate: "", completionDate: "", status: "", steps: "" });
    }
  }

  // ── Download ─────────────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const title1 = audit1.title.replace(/[^a-z0-9]/gi, "_").slice(0, 30);
  const title2 = audit2.title.replace(/[^a-z0-9]/gi, "_").slice(0, 30);
  a.href = url;
  a.download = `Comparison_${title1}_vs_${title2}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function getDiff(s1: ItemStatus, s2: ItemStatus): DiffResult {
  if (s2 === "pass" && s1 !== "pass") return "improved";
  if (s2 === "fail" && s1 !== "fail") return "regressed";
  if (s1 === "fail" && s2 === "fail") return "unchanged_fail";
  if (s1 === "pass" && s2 === "pass") return "unchanged_pass";
  return "unchanged_other";
}

function getCustomCompareItems(
  catId: string,
  customItems1: AuditCustomItem[],
  customItems2: AuditCustomItem[],
  map1: Record<string, ItemStatus>,
  map2: Record<string, ItemStatus>,
): Array<{ id: string; label: string; s1: ItemStatus; s2: ItemStatus }> {
  const cat1 = customItems1.filter(i => i.category === catId);
  const cat2 = customItems2.filter(i => i.category === catId);
  const result: Array<{ id: string; label: string; s1: ItemStatus; s2: ItemStatus }> = [];
  const seen = new Set<string>();

  for (const item of cat1) {
    const key = item.label.toLowerCase().trim();
    const match = cat2.find(i => i.label.toLowerCase().trim() === key);
    result.push({ id: item.id, label: item.label, s1: map1[item.id] || "pending", s2: match ? (map2[match.id] || "pending") : "pending" });
    seen.add(key);
  }
  for (const item of cat2) {
    const key = item.label.toLowerCase().trim();
    if (!seen.has(key)) {
      result.push({ id: item.id, label: item.label, s1: "pending", s2: map2[item.id] || "pending" });
    }
  }
  return result;
}

function diffBorderColor(diff: DiffResult): string {
  if (diff === "improved") return "border-l-green-400";
  if (diff === "regressed") return "border-l-red-400";
  if (diff === "unchanged_fail") return "border-l-amber-400";
  if (diff === "unchanged_pass") return "border-l-green-200";
  return "border-l-gray-200";
}

function diffBgColor(diff: DiffResult): string {
  if (diff === "improved") return "bg-green-50/60 dark:bg-green-950/20";
  if (diff === "regressed") return "bg-red-50/60 dark:bg-red-950/20";
  if (diff === "unchanged_fail") return "bg-amber-50/40 dark:bg-amber-950/20";
  return "bg-muted/20";
}

function DiffBadge({ diff }: { diff: DiffResult }) {
  if (diff === "improved") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 rounded px-1.5 py-0.5 shrink-0">
      <TrendingUp size={10} /> Improved
    </span>
  );
  if (diff === "regressed") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 rounded px-1.5 py-0.5 shrink-0">
      <TrendingDown size={10} /> Regressed
    </span>
  );
  if (diff === "unchanged_fail") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5 shrink-0">
      <Minus size={10} /> Still Deficient
    </span>
  );
  return null;
}

function CompareStatusPill({ status }: { status: ItemStatus }) {
  if (status === "pass") return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-700 dark:text-green-400">
      <CheckCircle2 size={12} /> Pass
    </span>
  );
  if (status === "fail") return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
      <XCircle size={12} /> Deficient
    </span>
  );
  if (status === "na") return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
      <MinusCircle size={12} /> N/A
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
      <Clock size={12} /> Pending
    </span>
  );
}

function CompareView({
  auditId1,
  auditId2,
  onBack,
}: {
  auditId1: string;
  auditId2: string;
  onBack: () => void;
}) {
  const { data: audit1, isLoading: loading1 } = useQuery<AuditAssessment & { responses: AuditResponse[]; customItems: AuditCustomItem[] }>({
    queryKey: ["/api/doh-audits", auditId1],
    enabled: !!auditId1,
  });

  const { data: audit2, isLoading: loading2 } = useQuery<AuditAssessment & { responses: AuditResponse[]; customItems: AuditCustomItem[] }>({
    queryKey: ["/api/doh-audits", auditId2],
    enabled: !!auditId2,
  });

  const { data: correctiveActions2 = [] } = useQuery<AuditCorrectiveAction[]>({
    queryKey: ["/api/doh-audits", auditId2, "corrective-actions"],
    enabled: !!auditId2,
    queryFn: async () => {
      const res = await fetch(`/api/doh-audits/${auditId2}/corrective-actions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const loading = loading1 || loading2;
  const [exporting, setExporting] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const { toast } = useToast();

  function handleCopyLink() {
    const url = `${window.location.origin}/audit-assessment?compare=${auditId1},${auditId2}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyingLink(true);
      toast({ title: "Link copied!", description: "Shareable comparison link copied to clipboard." });
      setTimeout(() => setCopyingLink(false), 2000);
    }).catch(() => {
      toast({ title: "Copy failed", description: "Could not copy link to clipboard.", variant: "destructive" });
    });
  }

  const map1: Record<string, ItemStatus> = {};
  const map2: Record<string, ItemStatus> = {};
  const notesMap1: Record<string, string> = {};
  const notesMap2: Record<string, string> = {};
  (audit1?.responses || []).forEach(r => {
    map1[r.itemKey] = r.status;
    notesMap1[r.itemKey] = r.notes || "";
  });
  (audit2?.responses || []).forEach(r => {
    map2[r.itemKey] = r.status;
    notesMap2[r.itemKey] = r.notes || "";
  });

  const customItems1: AuditCustomItem[] = audit1?.customItems || [];
  const customItems2: AuditCustomItem[] = audit2?.customItems || [];

  const stats1 = computeStats(map1, customItems1);
  const stats2 = computeStats(map2, customItems2);

  const passRateDiff = stats2.scorePct - stats1.scorePct;

  const diffCounts = { improved: 0, regressed: 0, unchangedFail: 0, unchangedPass: 0 };
  for (const cat of CHECKLIST) {
    for (const item of cat.items) {
      const s1 = map1[item.key] || "pending";
      const s2 = map2[item.key] || "pending";
      const d = getDiff(s1, s2);
      if (d === "improved") diffCounts.improved++;
      else if (d === "regressed") diffCounts.regressed++;
      else if (d === "unchanged_fail") diffCounts.unchangedFail++;
      else if (d === "unchanged_pass") diffCounts.unchangedPass++;
    }
    const customRows = getCustomCompareItems(cat.id, customItems1, customItems2, map1, map2);
    for (const row of customRows) {
      const d = getDiff(row.s1, row.s2);
      if (d === "improved") diffCounts.improved++;
      else if (d === "regressed") diffCounts.regressed++;
      else if (d === "unchanged_fail") diffCounts.unchangedFail++;
      else if (d === "unchanged_pass") diffCounts.unchangedPass++;
    }
  }

  async function handleExport() {
    if (!audit1 || !audit2) return;
    setExporting(true);
    try {
      await exportComparisonToExcel(audit1, audit2, map1, map2, customItems1, customItems2, stats1, stats2, diffCounts, passRateDiff, notesMap1, notesMap2, correctiveActions2);
      toast({ title: "Export complete", description: "Comparison report downloaded successfully." });
    } catch {
      toast({ title: "Export failed", description: "Could not generate the comparison report.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ArrowLeftRight size={20} /> Audit Comparison
          </h1>
          {!loading && audit1 && audit2 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Comparing <span className="font-medium text-foreground">{audit1.title}</span> → <span className="font-medium text-foreground">{audit2.title}</span>
            </p>
          )}
        </div>
        {!loading && audit1 && audit2 && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleCopyLink}
              disabled={copyingLink}
            >
              <Link2 size={15} />
              {copyingLink ? "Copied!" : "Copy link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExport}
              disabled={exporting}
            >
              <FileSpreadsheet size={15} />
              {exporting ? "Exporting…" : "Export Excel"}
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-24" />)}
        </div>
      ) : !audit1 || !audit2 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">One or both audits could not be loaded.</p>
            <Button className="mt-4" onClick={onBack}>Back to list</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Audit labels */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[audit1, audit2].map((audit, idx) => (
              <Card key={idx} className={`border-2 ${idx === 0 ? "border-blue-200 dark:border-blue-800" : "border-purple-200 dark:border-purple-800"}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${idx === 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"}`}>
                      Audit {idx + 1}
                    </span>
                    {audit.status === "completed" && (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Completed</Badge>
                    )}
                    {audit.status === "in_progress" && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">In Progress</Badge>
                    )}
                  </div>
                  <p className="font-semibold text-sm truncate">{audit.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {audit.auditDate && <span>Date: {audit.auditDate}</span>}
                    {audit.surveyPeriod && <span>Period: {audit.surveyPeriod}</span>}
                    {audit.surveyorName && <span>{audit.surveyorName}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {stats1.pass + stats1.fail > 0 ? `${stats1.scorePct}%` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Audit 1</p>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {stats2.pass + stats2.fail > 0 ? `${stats2.scorePct}%` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Audit 2</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Pass Rate</p>
                {stats1.pass + stats1.fail > 0 && stats2.pass + stats2.fail > 0 && (
                  <p className={`text-xs font-semibold mt-1 flex items-center justify-center gap-0.5 ${passRateDiff > 0 ? "text-green-600" : passRateDiff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {passRateDiff > 0 ? <TrendingUp size={12} /> : passRateDiff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {passRateDiff > 0 ? `+${passRateDiff}%` : passRateDiff < 0 ? `${passRateDiff}%` : "No change"}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-green-50/60 dark:bg-green-950/20 border-green-100 dark:border-green-900">
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{diffCounts.improved}</p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5 flex items-center justify-center gap-0.5">
                  <TrendingUp size={11} /> Items Improved
                </p>
              </CardContent>
            </Card>
            <Card className="bg-red-50/60 dark:bg-red-950/20 border-red-100 dark:border-red-900">
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{diffCounts.regressed}</p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5 flex items-center justify-center gap-0.5">
                  <TrendingDown size={11} /> Items Regressed
                </p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900">
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{diffCounts.unchangedFail}</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5 flex items-center justify-center gap-0.5">
                  <Minus size={11} /> Still Deficient
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium">Legend:</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Improved</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Regressed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Still deficient</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-200 inline-block" /> Unchanged pass</span>
          </div>

          {/* Per-category comparisons */}
          <div className="space-y-4">
            {CHECKLIST.map(cat => {
              const Icon = cat.icon;
              const catItems = cat.items;
              const catCustomRows = getCustomCompareItems(cat.id, customItems1, customItems2, map1, map2);
              const catImproved = catItems.filter(i => getDiff(map1[i.key] || "pending", map2[i.key] || "pending") === "improved").length + catCustomRows.filter(r => getDiff(r.s1, r.s2) === "improved").length;
              const catRegressed = catItems.filter(i => getDiff(map1[i.key] || "pending", map2[i.key] || "pending") === "regressed").length + catCustomRows.filter(r => getDiff(r.s1, r.s2) === "regressed").length;
              const catStillFail = catItems.filter(i => getDiff(map1[i.key] || "pending", map2[i.key] || "pending") === "unchanged_fail").length + catCustomRows.filter(r => getDiff(r.s1, r.s2) === "unchanged_fail").length;

              return (
                <Card key={cat.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Icon size={17} className="text-muted-foreground" />
                        <CardTitle className="text-sm">{cat.label}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {catImproved > 0 && (
                          <span className="flex items-center gap-0.5 text-green-600 font-medium">
                            <TrendingUp size={11} /> {catImproved}
                          </span>
                        )}
                        {catRegressed > 0 && (
                          <span className="flex items-center gap-0.5 text-red-500 font-medium">
                            <TrendingDown size={11} /> {catRegressed}
                          </span>
                        )}
                        {catStillFail > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                            <Minus size={11} /> {catStillFail} still deficient
                          </span>
                        )}
                        {catImproved === 0 && catRegressed === 0 && catStillFail === 0 && (
                          <span className="text-muted-foreground">No changes</span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {/* Column header */}
                    <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-2 pb-1 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      <span>Item</span>
                      <span className="text-center text-blue-600 dark:text-blue-400">Audit 1</span>
                      <span className="text-center text-purple-600 dark:text-purple-400">Audit 2</span>
                    </div>
                    {catItems.map(item => {
                      const s1 = map1[item.key] || "pending";
                      const s2 = map2[item.key] || "pending";
                      const diff = getDiff(s1, s2);
                      return (
                        <div
                          key={item.key}
                          className={`grid grid-cols-[1fr_80px_80px] gap-2 items-center border-l-4 ${diffBorderColor(diff)} ${diffBgColor(diff)} rounded-r px-2 py-2`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs leading-snug">{item.label}</p>
                            {item.reference && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">§ {item.reference}</p>
                            )}
                            {diff !== "unchanged_pass" && diff !== "unchanged_other" && (
                              <div className="mt-0.5">
                                <DiffBadge diff={diff} />
                              </div>
                            )}
                          </div>
                          <div className="flex justify-center">
                            <CompareStatusPill status={s1} />
                          </div>
                          <div className="flex justify-center">
                            <CompareStatusPill status={s2} />
                          </div>
                        </div>
                      );
                    })}
                    {catCustomRows.map(row => {
                      const diff = getDiff(row.s1, row.s2);
                      return (
                        <div
                          key={row.id}
                          className={`grid grid-cols-[1fr_80px_80px] gap-2 items-center border-l-4 ${diffBorderColor(diff)} ${diffBgColor(diff)} rounded-r px-2 py-2`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs leading-snug">{row.label}</p>
                              <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400">custom</Badge>
                            </div>
                            {diff !== "unchanged_pass" && diff !== "unchanged_other" && (
                              <div className="mt-0.5">
                                <DiffBadge diff={diff} />
                              </div>
                            )}
                          </div>
                          <div className="flex justify-center">
                            <CompareStatusPill status={row.s1} />
                          </div>
                          <div className="flex justify-center">
                            <CompareStatusPill status={row.s2} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Documents Section ────────────────────────────────────────────────────────

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
