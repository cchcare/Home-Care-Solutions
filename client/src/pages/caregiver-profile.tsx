import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { PersonCombobox } from "@/components/ui/person-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { EmployeeDocumentsTab } from "@/components/employee-documents-tab";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { parseDateOnlyInput, toDateOnlyInputValue, formatDateOnly } from "@/lib/dateOnly";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Building, 
  Award,
  FileText,
  Upload,
  Trash2,
  Download,
  Edit,
  Save,
  X,
  Eye,
  Clock,
  DollarSign,
  Heart,
  CalendarDays,
  ClipboardList,
  Star,
  CheckCircle,
  History,
  MoreHorizontal,
  Wallet,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  AlertTriangle,
  MapPin,
  Briefcase,
  GraduationCap,
  Shield,
  CreditCard,
  Receipt,
  Users,
  MessageSquare,
  ArrowRightLeft,
  Search,
  FileSignature,
  Loader2,
  Play
} from "lucide-react";
import type { Caregiver, User as UserType, Document, Office, Client, ComplianceItem, Coordinator, CaregiverCompliance, LetterTemplate } from "@shared/schema";
import { EmailDocumentDialog } from "@/components/email-document-dialog";
import { AddressInput } from "@/components/address-input";

type EnrichedCaregiver = Caregiver & { firstName?: string | null; lastName?: string | null; email?: string | null };

const DOCUMENT_CATEGORIES = [
  { value: "employment_verification", label: "Employment Verification" },
  { value: "id_card", label: "ID Card" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "social_security", label: "Social Security Card" },
  { value: "certification", label: "Certification" },
  { value: "training", label: "Training Certificate" },
  { value: "background_check", label: "Background Check" },
  { value: "physical_exam", label: "Physical Exam" },
  { value: "tb_test", label: "TB Test" },
  { value: "cpr_certification", label: "CPR Certification" },
  { value: "other", label: "Other" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// -9 Requirements (PA State Form Requirements)
const REQUIREMENT_9_TYPES = [
  { value: "application", label: "Application Form" },
  { value: "fingerprinting", label: "Fingerprinting" },
  { value: "dhs_verification", label: "DHS Verification" },
  { value: "form_submission", label: "Form -9 Submission" },
  { value: "approval", label: "Final Approval" },
];

// Background Check Types
const BACKGROUND_CHECK_TYPES = [
  { value: "fbi", label: "FBI Background Check" },
  { value: "pa_state", label: "PA State Police Check" },
  { value: "child_abuse", label: "Child Abuse Clearance" },
  { value: "adult_abuse", label: "Adult Protective Services" },
];

// Medical Requirement Types
const MEDICAL_REQUIREMENT_TYPES = [
  { value: "tb_test", label: "TB Test" },
  { value: "physical_exam", label: "Physical Exam" },
  { value: "drug_test", label: "Drug Test" },
  { value: "hepatitis_b", label: "Hepatitis B Vaccine" },
  { value: "flu_shot", label: "Flu Shot" },
  { value: "covid_vaccine", label: "COVID-19 Vaccine" },
];

// Background Check Results
const BACKGROUND_CHECK_RESULTS = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "pending", label: "Pending" },
  { value: "conditional", label: "Conditional" },
];

// Compliance Status Options
const COMPLIANCE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "compliant", label: "Compliant" },
  { value: "expired", label: "Expired" },
  { value: "non_compliant", label: "Non-Compliant" },
];

import { EmployeeWriteUpsSection } from "@/components/employee-write-ups-section";
import { CaregiverCompetencyReviewsSection } from "@/components/caregiver-competency-reviews-section";
import { CaregiverNotesSection } from "@/components/caregiver-notes-section";
import { CaregiverPreferencesSection } from "@/components/caregiver-preferences-section";
import { CaregiverAbsencesSection } from "@/components/caregiver-absences-section";
import { CaregiverAvailabilitySection } from "@/components/caregiver-availability-section";
import { CaregiverRatesSection } from "@/components/caregiver-rates-section";
import { CaregiverExpensesSection } from "@/components/caregiver-expenses-section";
import { CaregiverInServicesSection } from "@/components/caregiver-in-services-section";
import { CaregiverOfficeMovesSection } from "@/components/caregiver-office-moves-section";
import { CaregiverPayrollInfoSection } from "@/components/caregiver-payroll-info-section";
import { CoordinatorHistorySection } from "@/components/coordinator-history-section";

const CAREGIVER_MENU_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "coordinators", label: "Coordinators", icon: Users },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "exclusion", label: "Exclusion Check", icon: AlertTriangle },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "visits", label: "Visits", icon: Clock },
  { id: "in-service", label: "In Service", icon: GraduationCap },
  { id: "competency", label: "Competency Reviews", icon: Award },
  { id: "rates", label: "Rates", icon: DollarSign },
  { id: "notes", label: "Notes", icon: MessageSquare },
  { id: "preferences", label: "Preferences", icon: Heart },
  { id: "absence", label: "Absence/Restriction", icon: AlertTriangle },
  { id: "availability", label: "Availability", icon: CalendarDays },
  { id: "payroll-info", label: "Payroll Info", icon: CreditCard },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "paychecks", label: "Pay Check", icon: Wallet },
  { id: "member-history", label: "Member History", icon: History },
  { id: "others", label: "Others", icon: MoreHorizontal },
  { id: "documents", label: "Document Management", icon: FileText },
  { id: "reviews", label: "Performance Reviews", icon: ClipboardList },
  { id: "office-move", label: "Office Move", icon: ArrowRightLeft },
  { id: "import-history", label: "Import History", icon: Upload },
];

export default function CaregiverProfile() {
  const [, params] = useRoute("/caregivers/:id");
  const caregiverId = params?.id;
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Caregiver>>({});
  const [uploadCategory, setUploadCategory] = useState("other");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeSection, setActiveSection] = useState("profile");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignClientDialog, setShowAssignClientDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  const [complianceCategory, setComplianceCategory] = useState<"requirement_9" | "background_check" | "medical">("requirement_9");
  const [editingCompliance, setEditingCompliance] = useState<CaregiverCompliance | null>(null);
  const [complianceForm, setComplianceForm] = useState({
    category: "requirement_9" as string,
    itemType: "",
    status: "pending",
    expirationDate: "",
    performedDate: "",
    resultDate: "",
    result: "",
    notes: "",
  });
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [emailAfterGenerate, setEmailAfterGenerate] = useState(false);
  const [generateEmailRecipient, setGenerateEmailRecipient] = useState("");
  const [emailDocTarget, setEmailDocTarget] = useState<Document | null>(null);

  const { data: caregiver, isLoading: caregiverLoading } = useQuery<EnrichedCaregiver>({
    queryKey: ["/api/caregivers", caregiverId],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/users", caregiver?.userId],
    queryFn: () => fetch(`/api/users/${caregiver?.userId}`).then(r => r.json()),
    enabled: !!caregiver?.userId,
  });

  const caregiverName = caregiver?.firstName && caregiver?.lastName 
    ? `${caregiver.firstName} ${caregiver.lastName}` 
    : user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : "Caregiver";

  const { data: office } = useQuery<Office>({
    queryKey: ["/api/offices", caregiver?.officeId],
    queryFn: () => fetch(`/api/offices/${caregiver?.officeId}`).then(r => r.json()),
    enabled: !!caregiver?.officeId,
  });

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const { data: coordinator } = useQuery<Coordinator>({
    queryKey: ["/api/coordinators", caregiver?.coordinatorId],
    queryFn: () => fetch(`/api/coordinators/${caregiver?.coordinatorId}`).then(r => r.json()),
    enabled: !!caregiver?.coordinatorId,
  });

  const { data: allCoordinators = [] } = useQuery<Coordinator[]>({
    queryKey: ["/api/coordinators"],
    queryFn: () => fetch(`/api/coordinators`).then(r => r.json()),
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/caregivers", caregiverId, "documents"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/documents`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: letterTemplates = [] } = useQuery<LetterTemplate[]>({
    queryKey: ["/api/letter-templates/scope/caregiver"],
  });

  const { data: certifications = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "certifications"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/certifications`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: complianceItems = [] } = useQuery<ComplianceItem[]>({
    queryKey: ["/api/caregivers", caregiverId, "compliance"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/compliance`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: assignedClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/caregivers", caregiverId, "clients"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/clients`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: performanceReviewsList = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "performance-reviews"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/performance-reviews`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: performanceReviewDocs = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "documents", "performance-review"],
    queryFn: async () => {
      const all = await fetch(`/api/caregivers/${caregiverId}/documents`).then(r => r.json());
      return Array.isArray(all) ? all.filter((d: any) => d.documentType === "performance_review") : [];
    },
    enabled: !!caregiverId,
  });

  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: allMcos = [] } = useQuery<any[]>({
    queryKey: ["/api/mcos"],
    queryFn: () => fetch("/api/mcos").then(r => r.json()),
  });

  const { data: allCaregivers = [] } = useQuery<EnrichedCaregiver[]>({
    queryKey: ["/api/caregivers"],
    queryFn: () => fetch(`/api/caregivers`).then(r => r.json()),
  });

  const { data: paychecks = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "paychecks"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/paychecks`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: schedules = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "schedules"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/schedules`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const getClientName = (clientId?: string | null) => {
    if (!clientId) return null;
    const client = allClients.find((c) => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : null;
  };

  const { data: exclusionChecks = [], isLoading: exclusionLoading } = useQuery<any[]>({
    queryKey: ["/api/exclusions/caregiver", caregiverId],
    queryFn: () => fetch(`/api/exclusions/caregiver/${caregiverId}`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: exclusionSources = [] } = useQuery<any[]>({
    queryKey: ["/api/exclusions/sources"],
    queryFn: () => fetch("/api/exclusions/sources").then(r => r.json()),
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId, "documents"] });
      setSelectedFile(null);
      toast({ title: "Success", description: "Document uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    },
  });

  const generateVerificationLetterMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/caregivers/${caregiverId}/employment-verification-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to generate letter");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId, "documents"] });
      toast({ title: "Success", description: "Employment verification letter generated and saved to documents" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate employment verification letter", variant: "destructive" });
    },
  });

  const generateFromTemplateMutation = useMutation({
    mutationFn: async ({ templateId, emailTo }: { templateId: string; emailTo?: string }) => {
      const response = await apiRequest("POST", `/api/letter-templates/${templateId}/generate`, {
        scope: "caregiver",
        targetId: caregiverId,
        saveToDocuments: true,
        ...(emailTo ? { emailTo } : {}),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId, "documents"] });
      if (data.emailResult && !data.emailResult.success) {
        toast({ title: "Letter generated, but email failed", description: data.emailResult.error, variant: "destructive" });
      } else {
        toast({ title: "Success", description: data.message || "Document generated successfully from template" });
      }
      setShowTemplateDialog(false);
      setSelectedTemplateId(null);
      setEmailAfterGenerate(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to generate document", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId, "documents"] });
      toast({ title: "Success", description: "Document deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    },
  });

  const updateCaregiverMutation = useMutation({
    mutationFn: async (data: Partial<Caregiver>) => {
      return await apiRequest("PUT", `/api/caregivers/${caregiverId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId] });
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsEditing(false);
      toast({ title: "Success", description: "Caregiver updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update caregiver", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  const deleteCaregiverMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/caregivers/${caregiverId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({ title: "Success", description: "Caregiver deleted successfully" });
      navigate("/caregivers");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete caregiver", variant: "destructive" });
    },
  });

  const canDeleteCaregiver = currentUser && ["super_admin", "admin", "office_admin"].includes(currentUser.role);
  const canRunExclusionCheck = !!currentUser && ["super_admin", "admin", "supervisor"].includes(currentUser.role);

  type ExclusionMatch = {
    exclusionRecordId: string;
    sourceId: string;
    sourceName: string;
    matchType: string;
    matchScore: number;
    matchReason: "npi" | "license_number" | "name_exact" | "name_fuzzy" | null;
    matchedIdentifier: string | null;
    matchedFirstName: string;
    matchedLastName: string;
  };
  type ExclusionRunResult = {
    caregiverId: string;
    status: "clear" | "possible_match";
    totalMatches: number;
    matches: ExclusionMatch[];
    ranAt: string;
  };
  const [exclusionRunResult, setExclusionRunResult] = useState<ExclusionRunResult | null>(null);

  const runExclusionCheckMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(
        "POST",
        `/api/caregivers/${caregiverId}/exclusion-check`,
        {},
      );
    },
    onSuccess: async (response: any) => {
      const data = (typeof response?.json === "function"
        ? await response.json()
        : response) as Omit<ExclusionRunResult, "ranAt">;
      setExclusionRunResult({ ...data, ranAt: new Date().toISOString() });
      qc.invalidateQueries({ queryKey: ["/api/exclusions/caregiver", caregiverId] });
      toast({
        title: data.status === "clear" ? "Caregiver is clear" : "Possible matches found",
        description:
          data.status === "clear"
            ? "No matches were found in any exclusion source."
            : `Found ${data.totalMatches} possible match${data.totalMatches === 1 ? "" : "es"}. Review on the Pending Reviews tab.`,
        variant: data.status === "clear" ? "default" : "destructive",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Exclusion check failed",
        description: err?.message || "Unable to run exclusion check.",
        variant: "destructive",
      });
    },
  });

  const renderMatchReasonBadge = (m: ExclusionMatch, idx: number) => {
    const id = m.matchedIdentifier || "";
    const score = typeof m.matchScore === "number" ? Math.round(m.matchScore) : 0;
    switch (m.matchReason) {
      case "npi":
        return (
          <Badge className="bg-red-100 text-red-800" data-testid={`badge-run-reason-npi-${idx}`}>
            NPI {id || "match"} (exact)
          </Badge>
        );
      case "license_number":
        return (
          <Badge className="bg-red-100 text-red-800" data-testid={`badge-run-reason-license-${idx}`}>
            License {id || "match"} (exact)
          </Badge>
        );
      case "name_exact":
        return (
          <Badge className="bg-amber-100 text-amber-800" data-testid={`badge-run-reason-name-exact-${idx}`}>
            Name match — exact
          </Badge>
        );
      case "name_fuzzy":
        return (
          <Badge variant="outline" data-testid={`badge-run-reason-name-fuzzy-${idx}`}>
            Name match — {score}%
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" data-testid={`badge-run-reason-unknown-${idx}`}>
            {score ? `Name match — ${score}%` : "Match"}
          </Badge>
        );
    }
  };

  const assignClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await apiRequest("POST", `/api/caregivers/${caregiverId}/clients`, { clientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId, "clients"] });
      setShowAssignClientDialog(false);
      setSelectedClientId("");
      toast({ title: "Success", description: "Client assigned successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign client", variant: "destructive" });
    },
  });

  const unassignClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await apiRequest("DELETE", `/api/caregivers/${caregiverId}/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId, "clients"] });
      toast({ title: "Success", description: "Client unassigned successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unassign client", variant: "destructive" });
    },
  });

  const createComplianceMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/caregivers/${caregiverId}/compliance`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId, "compliance"] });
      setShowComplianceDialog(false);
      resetComplianceForm();
      toast({ title: "Success", description: "Compliance item added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add compliance item", variant: "destructive" });
    },
  });

  const updateComplianceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/caregiver-compliance/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId, "compliance"] });
      setShowComplianceDialog(false);
      setEditingCompliance(null);
      resetComplianceForm();
      toast({ title: "Success", description: "Compliance item updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update compliance item", variant: "destructive" });
    },
  });

  const deleteComplianceMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/caregiver-compliance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId, "compliance"] });
      toast({ title: "Success", description: "Compliance item deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete compliance item", variant: "destructive" });
    },
  });

  const resetComplianceForm = () => {
    setComplianceForm({
      category: "requirement_9",
      itemType: "",
      status: "pending",
      expirationDate: "",
      performedDate: "",
      resultDate: "",
      result: "",
      notes: "",
    });
    setEditingCompliance(null);
  };

  const handleAddCompliance = (category: "requirement_9" | "background_check" | "medical") => {
    resetComplianceForm();
    setComplianceForm(prev => ({ ...prev, category }));
    setComplianceCategory(category);
    setShowComplianceDialog(true);
  };

  const handleEditCompliance = (item: CaregiverCompliance) => {
    setEditingCompliance(item);
    setComplianceForm({
      category: item.category,
      itemType: item.itemType,
      status: item.status || "pending",
      expirationDate: item.expirationDate ? format(new Date(item.expirationDate), "yyyy-MM-dd") : "",
      performedDate: item.performedDate ? format(new Date(item.performedDate), "yyyy-MM-dd") : "",
      resultDate: item.resultDate ? format(new Date(item.resultDate), "yyyy-MM-dd") : "",
      result: item.result || "",
      notes: item.notes || "",
    });
    setComplianceCategory(item.category as "requirement_9" | "background_check" | "medical");
    setShowComplianceDialog(true);
  };

  const handleSaveCompliance = () => {
    const data = {
      ...complianceForm,
      officeId: caregiver?.officeId,
    };
    
    if (editingCompliance) {
      updateComplianceMutation.mutate({ id: editingCompliance.id, data });
    } else {
      createComplianceMutation.mutate(data);
    }
  };

  const getItemTypeOptions = (category: string) => {
    switch (category) {
      case "requirement_9":
        return REQUIREMENT_9_TYPES;
      case "background_check":
        return BACKGROUND_CHECK_TYPES;
      case "medical":
        return MEDICAL_REQUIREMENT_TYPES;
      default:
        return [];
    }
  };

  const getItemTypeLabel = (category: string, itemType: string) => {
    const options = getItemTypeOptions(category);
    return options.find(o => o.value === itemType)?.label || itemType;
  };

  // Filter compliance items by category
  const requirement9Items = complianceItems.filter((item: any) => item.category === "requirement_9");
  const backgroundCheckItems = complianceItems.filter((item: any) => item.category === "background_check");
  const medicalItems = complianceItems.filter((item: any) => item.category === "medical");

  const handleStartEditing = () => {
    if (caregiver) {
      setEditFormData({
        firstName: caregiver.firstName || "",
        middleName: caregiver.middleName || "",
        lastName: caregiver.lastName || "",
        employeeId: caregiver.employeeId || "",
        hourlyWage: caregiver.hourlyWage || undefined,
        experienceYears: caregiver.experienceYears ?? undefined,
        gender: caregiver.gender,
        isActive: caregiver.isActive,
        hireDate: caregiver.hireDate,
        startDate: caregiver.startDate,
        terminationDate: caregiver.terminationDate,
        specializations: caregiver.specializations || [],
        officeId: caregiver.officeId,
        address: caregiver.address || "",
        address2: caregiver.address2 || "",
        city: caregiver.city || "",
        state: caregiver.state || "",
        zipCode: caregiver.zipCode || "",
        county: caregiver.county || "",
        hhaxCaregiverCode: caregiver.hhaxCaregiverCode || "",
        npi: caregiver.npi || "",
        adpCode: caregiver.adpCode || "",
        coordinatorId: caregiver.coordinatorId || null,
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdits = () => {
    updateCaregiverMutation.mutate(editFormData);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditFormData({});
  };

  const handleFileUpload = () => {
    if (!selectedFile || !caregiverId) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("caregiverId", caregiverId);
    formData.append("documentType", uploadCategory);
    uploadMutation.mutate(formData);
  };

  const groupedDocuments = DOCUMENT_CATEGORIES.reduce((acc, category) => {
    acc[category.value] = documents.filter(doc => doc.documentType === category.value);
    return acc;
  }, {} as Record<string, Document[]>);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const paddedDays = Array(startDayOfWeek).fill(null).concat(daysInMonth);

  if (caregiverLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  if (!caregiver) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-4">Caregiver not found</p>
          <Link href="/caregivers">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Caregivers
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
        <TopBar 
          title={caregiverName}
        />

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-56 border-r bg-muted/30 overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate" data-testid="text-caregiver-name">{caregiverName}</p>
                  <Badge variant={caregiver.isActive ? "default" : "secondary"} className="mt-1" data-testid="badge-caregiver-status">
                    {caregiver.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <p className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {office?.name || "No office assigned"}
                </p>
                {caregiver.employeeId && (
                  <p className="flex items-center gap-1 mt-1">
                    <Briefcase className="w-3 h-3" />
                    ID: {caregiver.employeeId}
                  </p>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3" 
                onClick={() => setShowSearchDialog(true)}
                data-testid="button-search-caregiver"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Caregiver
              </Button>
            </div>

            <nav className="p-2 space-y-1">
              {CAREGIVER_MENU_ITEMS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`menu-${item.id}`}
                  >
                    <IconComponent className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-5xl">
              {activeSection === "profile" && (
                <div className="space-y-6">
                  <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={handleCancelEditing} data-testid="button-cancel-edit">
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSaveEdits} disabled={updateCaregiverMutation.isPending} data-testid="button-save-profile">
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={handleStartEditing} data-testid="button-edit-profile">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                        {canDeleteCaregiver && (
                          <Button 
                            variant="destructive" 
                            onClick={() => setShowDeleteDialog(true)}
                            data-testid="button-delete-caregiver"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">First Name</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.firstName || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                              data-testid="input-first-name"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-first-name">{caregiver.firstName || user?.firstName || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Middle Name</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.middleName || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, middleName: e.target.value })}
                              data-testid="input-middle-name"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-middle-name">{caregiver.middleName || user?.middleName || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Last Name</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.lastName || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                              data-testid="input-last-name"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-last-name">{caregiver.lastName || user?.lastName || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Email</Label>
                          <p className="font-medium" data-testid="text-caregiver-email">{caregiver.email || user?.email || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Employee ID</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.employeeId || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
                              data-testid="input-employee-id"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-employee-id">{caregiver.employeeId || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">NPI</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.npi || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, npi: e.target.value })}
                              placeholder="10-digit NPI (optional)"
                              maxLength={20}
                              data-testid="input-npi"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-npi">{caregiver.npi || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Gender</Label>
                          {isEditing ? (
                            <Select
                              value={editFormData.gender || ""}
                              onValueChange={(value) => setEditFormData({ ...editFormData, gender: value as "male" | "female" | "non_binary" | "prefer_not_to_say" | null })}
                            >
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="non_binary">Non-Binary</SelectItem>
                                <SelectItem value="prefer_not_to_say">Prefer Not to Say</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="font-medium capitalize" data-testid="text-gender">{caregiver.gender || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Office</Label>
                          {isEditing ? (
                            <Select
                              value={editFormData.officeId || ""}
                              onValueChange={(value) => setEditFormData({ ...editFormData, officeId: value })}
                            >
                              <SelectTrigger data-testid="select-office">
                                <SelectValue placeholder="Select office" />
                              </SelectTrigger>
                              <SelectContent>
                                {offices.map((o) => (
                                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="font-medium" data-testid="text-office">{office?.name || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Coordinator</Label>
                          {isEditing ? (
                            <Select
                              value={editFormData.coordinatorId || "__none__"}
                              onValueChange={(value) => setEditFormData({ ...editFormData, coordinatorId: value === "__none__" ? null : value })}
                            >
                              <SelectTrigger data-testid="select-coordinator">
                                <SelectValue placeholder="Select Coordinator" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {allCoordinators.filter(c => c.isActive).map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.firstName} {c.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="font-medium" data-testid="text-coordinator">
                              {coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : "N/A"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Status</Label>
                          {isEditing ? (
                            <Select
                              value={editFormData.isActive ? "active" : "inactive"}
                              onValueChange={(value) => setEditFormData({ ...editFormData, isActive: value === "active" })}
                            >
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={caregiver.isActive ? "default" : "secondary"} data-testid="badge-status">
                              {caregiver.isActive ? "Active" : "Inactive"}
                            </Badge>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="col-span-2">
                            <AddressInput
                              streetAddress={editFormData.address || ""}
                              streetAddress2={editFormData.address2 || ""}
                              city={editFormData.city || ""}
                              state={editFormData.state || ""}
                              zipCode={editFormData.zipCode || ""}
                              onChange={(field, value) => setEditFormData({ ...editFormData, [field]: value })}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-sm">Street Address</Label>
                              <p className="font-medium" data-testid="text-address">{caregiver.address || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-sm">Street Address 2</Label>
                              <p className="font-medium" data-testid="text-address2">{caregiver.address2 || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-sm">City</Label>
                              <p className="font-medium" data-testid="text-city">{caregiver.city || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-sm">State</Label>
                              <p className="font-medium" data-testid="text-state">{caregiver.state || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-sm">Zip Code</Label>
                              <p className="font-medium" data-testid="text-zip-code">{caregiver.zipCode || "N/A"}</p>
                            </div>
                          </>
                        )}
                        {!isEditing && (
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm">County</Label>
                            <p className="font-medium" data-testid="text-county">{caregiver.county || "N/A"}</p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">HHAX ID</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.hhaxCaregiverCode || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, hhaxCaregiverCode: e.target.value })}
                              data-testid="input-hhax-caregiver-code"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-hhax-caregiver-code">{caregiver.hhaxCaregiverCode || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">ADP Code</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.adpCode || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, adpCode: e.target.value })}
                              data-testid="input-adp-code"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-adp-code">{caregiver.adpCode || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">MCO (Auto-assigned from client)</Label>
                          <p className="font-medium" data-testid="text-mco">
                            {caregiver.mcoId 
                              ? allMcos.find(m => m.id === caregiver.mcoId)?.name || "Unknown MCO"
                              : "Not assigned"
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">
                            MCO is automatically assigned when caregiver is assigned to a client
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Employment Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Hire Date</Label>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editFormData.hireDate ? toDateOnlyInputValue(editFormData.hireDate) : ""}
                              onChange={(e) => setEditFormData({ ...editFormData, hireDate: e.target.value ? parseDateOnlyInput(e.target.value) ?? undefined : undefined })}
                              data-testid="input-hire-date"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-hire-date">
                              {caregiver.hireDate ? formatDateOnly(caregiver.hireDate, (d) => format(d, "MMM d, yyyy")) : "N/A"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Termination Date</Label>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editFormData.terminationDate ? toDateOnlyInputValue(editFormData.terminationDate) : ""}
                              onChange={(e) => setEditFormData({ ...editFormData, terminationDate: e.target.value ? parseDateOnlyInput(e.target.value) : null })}
                              data-testid="input-termination-date"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-termination-date">
                              {caregiver.terminationDate ? formatDateOnly(caregiver.terminationDate, (d) => format(d, "MMM d, yyyy")) : "N/A"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Start Date</Label>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editFormData.startDate ? toDateOnlyInputValue(editFormData.startDate) : ""}
                              onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value ? parseDateOnlyInput(e.target.value) ?? undefined : undefined })}
                              data-testid="input-start-date"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-start-date">
                              {caregiver.startDate ? formatDateOnly(caregiver.startDate, (d) => format(d, "MMM d, yyyy")) : "N/A"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Hourly Wage</Label>
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editFormData.hourlyWage || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, hourlyWage: e.target.value })}
                              data-testid="input-hourly-wage"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-hourly-wage">
                              {caregiver.hourlyWage ? `$${parseFloat(caregiver.hourlyWage).toFixed(2)}` : "N/A"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Experience (Years)</Label>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editFormData.experienceYears ?? ""}
                              onChange={(e) => setEditFormData({ ...editFormData, experienceYears: parseInt(e.target.value) || undefined })}
                              data-testid="input-experience-years"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-experience-years">
                              {caregiver.experienceYears !== null && caregiver.experienceYears !== undefined ? `${caregiver.experienceYears} years` : "N/A"}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Assigned Clients ({assignedClients.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {assignedClients.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No clients assigned</p>
                      ) : (
                        <div className="space-y-2">
                          {assignedClients.map((client) => (
                            <Link key={client.id} href={`/clients/${client.id}`}>
                              <div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted cursor-pointer" data-testid={`link-client-${client.id}`}>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{client.firstName} {client.lastName}</p>
                                  <p className="text-sm text-muted-foreground">{client.memberId || "No member ID"}</p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "coordinators" && caregiverId && (
                <CoordinatorHistorySection entityType="caregiver" entityId={caregiverId} />
              )}

              {activeSection === "compliance" && (
                <div className="space-y-6">
                  {/* -9 Requirements Section */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            -9 Requirements
                          </CardTitle>
                          <CardDescription>PA State Form -9 compliance requirements</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => handleAddCompliance("requirement_9")} data-testid="button-add-requirement-9">
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {requirement9Items.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No -9 requirements tracked</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Requirement</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Expiration Date</TableHead>
                              <TableHead>Notes</TableHead>
                              <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {requirement9Items.map((item: any) => (
                              <TableRow key={item.id} data-testid={`row-req9-${item.id}`}>
                                <TableCell className="font-medium">{getItemTypeLabel("requirement_9", item.itemType)}</TableCell>
                                <TableCell>
                                  <Badge variant={item.status === "compliant" ? "default" : item.status === "pending" ? "secondary" : "destructive"}>
                                    {item.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {item.expirationDate ? format(new Date(item.expirationDate), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{item.notes || "—"}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditCompliance(item)} data-testid={`button-edit-req9-${item.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteComplianceMutation.mutate(item.id)} data-testid={`button-delete-req9-${item.id}`}>
                                      <Trash2 className="w-4 h-4" />
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

                  {/* Background Checks Section */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Background Checks
                          </CardTitle>
                          <CardDescription>Criminal background and clearance checks</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => handleAddCompliance("background_check")} data-testid="button-add-background-check">
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {backgroundCheckItems.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No background checks tracked</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Check Type</TableHead>
                              <TableHead>Performed Date</TableHead>
                              <TableHead>Result Date</TableHead>
                              <TableHead>Result</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {backgroundCheckItems.map((item: any) => (
                              <TableRow key={item.id} data-testid={`row-bgcheck-${item.id}`}>
                                <TableCell className="font-medium">{getItemTypeLabel("background_check", item.itemType)}</TableCell>
                                <TableCell>
                                  {item.performedDate ? format(new Date(item.performedDate), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {item.resultDate ? format(new Date(item.resultDate), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {item.result && (
                                    <Badge variant={item.result === "pass" ? "default" : item.result === "fail" ? "destructive" : "secondary"}>
                                      {BACKGROUND_CHECK_RESULTS.find(r => r.value === item.result)?.label || item.result}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={item.status === "compliant" ? "default" : item.status === "pending" ? "secondary" : "destructive"}>
                                    {item.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditCompliance(item)} data-testid={`button-edit-bgcheck-${item.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteComplianceMutation.mutate(item.id)} data-testid={`button-delete-bgcheck-${item.id}`}>
                                      <Trash2 className="w-4 h-4" />
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

                  {/* Medical Requirements Section */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Heart className="w-5 h-5" />
                            Medical Requirements
                          </CardTitle>
                          <CardDescription>TB tests, physicals, and other medical requirements</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => handleAddCompliance("medical")} data-testid="button-add-medical">
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {medicalItems.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No medical requirements tracked</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Requirement</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Performed Date</TableHead>
                              <TableHead>Expiration Date</TableHead>
                              <TableHead>Result</TableHead>
                              <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {medicalItems.map((item: any) => (
                              <TableRow key={item.id} data-testid={`row-medical-${item.id}`}>
                                <TableCell className="font-medium">{getItemTypeLabel("medical", item.itemType)}</TableCell>
                                <TableCell>
                                  <Badge variant={item.status === "compliant" ? "default" : item.status === "pending" ? "secondary" : "destructive"}>
                                    {item.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {item.performedDate ? format(new Date(item.performedDate), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {item.expirationDate ? format(new Date(item.expirationDate), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {item.result && (
                                    <Badge variant={item.result === "pass" ? "default" : item.result === "fail" ? "destructive" : "secondary"}>
                                      {item.result}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditCompliance(item)} data-testid={`button-edit-medical-${item.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteComplianceMutation.mutate(item.id)} data-testid={`button-delete-medical-${item.id}`}>
                                      <Trash2 className="w-4 h-4" />
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

                  {/* Certifications Section (existing) */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Certifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {certifications.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No certifications found</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Certification</TableHead>
                              <TableHead>Issue Date</TableHead>
                              <TableHead>Expiration Date</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {certifications.map((cert) => (
                              <TableRow key={cert.id} data-testid={`row-cert-${cert.id}`}>
                                <TableCell className="font-medium">{cert.certificationName}</TableCell>
                                <TableCell>
                                  {cert.issueDate ? format(new Date(cert.issueDate), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {cert.expirationDate ? format(new Date(cert.expirationDate), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={cert.isValid ? "default" : "destructive"}>
                                    {cert.isValid ? "Valid" : "Expired"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "calendar" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Schedule Calendar
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} data-testid="button-prev-month">
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="font-medium min-w-[140px] text-center">
                            {format(currentMonth, "MMMM yyyy")}
                          </span>
                          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} data-testid="button-next-month">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-7 gap-1">
                        {DAY_NAMES.map((day) => (
                          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                            {day}
                          </div>
                        ))}
                        {paddedDays.map((day, idx) => {
                          if (!day) {
                            return <div key={`empty-${idx}`} className="h-24 bg-muted/20 rounded-md" />;
                          }
                          const daySchedules = schedules.filter(
                            (s) => toDateOnlyInputValue(s.scheduledDate) === format(day, "yyyy-MM-dd")
                          );
                          return (
                            <div
                              key={day.toISOString()}
                              className={`h-24 p-1 rounded-md border ${
                                isToday(day) ? "border-primary bg-primary/5" : "border-transparent hover:border-muted-foreground/20"
                              } ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""}`}
                            >
                              <div className={`text-sm ${isToday(day) ? "font-bold text-primary" : ""}`}>
                                {format(day, "d")}
                              </div>
                              <div className="space-y-0.5 mt-1">
                                {daySchedules.slice(0, 2).map((schedule) => {
                                  const clientName = getClientName(schedule.clientId);
                                  return (
                                    <div
                                      key={schedule.id}
                                      className="text-xs p-1 rounded bg-primary/10 text-primary truncate leading-tight"
                                      title={
                                        schedule.clockInTime && schedule.clockOutTime
                                          ? `Scheduled ${schedule.startTime}–${schedule.endTime} · Confirmed ${format(new Date(schedule.clockInTime), "HH:mm")}–${format(new Date(schedule.clockOutTime), "HH:mm")}${clientName ? ` (${clientName})` : ''}`
                                          : `Scheduled ${schedule.startTime}–${schedule.endTime}${clientName ? ` (${clientName})` : ''}`
                                      }
                                    >
                                      <div>S: {schedule.startTime}-{schedule.endTime}</div>
                                      {schedule.clockInTime && schedule.clockOutTime && (
                                        <div className="text-green-700 dark:text-green-400">
                                          C: {format(new Date(schedule.clockInTime), "HH:mm")}-{format(new Date(schedule.clockOutTime), "HH:mm")}
                                        </div>
                                      )}
                                      {clientName && schedule.clientId && (
                                        <div
                                          className="text-muted-foreground truncate hover:text-primary hover:underline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/clients/${schedule.clientId}`);
                                          }}
                                          data-testid={`link-schedule-client-${schedule.id}`}
                                        >
                                          {clientName}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {daySchedules.length > 2 && (
                                  <div className="text-xs text-muted-foreground">+{daySchedules.length - 2} more</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "visits" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Recent Visits
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {schedules.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No visits found</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead>S: Scheduled</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>C: Confirmed</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {schedules.slice(0, 20).map((schedule) => (
                              <TableRow key={schedule.id} data-testid={`row-visit-${schedule.id}`}>
                                <TableCell>{formatDateOnly(schedule.scheduledDate, (d) => format(d, "MMM d, yyyy"))}</TableCell>
                                <TableCell>
                                  {schedule.clientId ? (
                                    <Link href={`/clients/${schedule.clientId}`}>
                                      <span className="hover:text-primary hover:underline cursor-pointer" data-testid={`link-visit-client-${schedule.id}`}>
                                        {getClientName(schedule.clientId) || "Unknown"}
                                      </span>
                                    </Link>
                                  ) : (
                                    <span className="text-muted-foreground">Unassigned</span>
                                  )}
                                </TableCell>
                                <TableCell>S: {schedule.startTime} - {schedule.endTime}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    schedule.status === "completed" ? "default" :
                                    schedule.status === "in_progress" ? "secondary" :
                                    schedule.status === "cancelled" ? "destructive" : "outline"
                                  }>
                                    {schedule.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {schedule.clockInTime && schedule.clockOutTime ? (
                                    <span className="text-sm text-green-700 dark:text-green-400">
                                      C: {format(new Date(schedule.clockInTime), "HH:mm")} - {format(new Date(schedule.clockOutTime), "HH:mm")}
                                    </span>
                                  ) : schedule.clockInTime ? (
                                    <span className="text-sm text-green-700 dark:text-green-400">C: {format(new Date(schedule.clockInTime), "HH:mm")} - Pending</span>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">Not clocked</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "in-service" && caregiverId && (
                <div className="space-y-6">
                  <CaregiverInServicesSection caregiverId={caregiverId} />
                </div>
              )}

              {activeSection === "competency" && caregiverId && (
                <div className="space-y-6">
                  <CaregiverCompetencyReviewsSection caregiverId={caregiverId} />
                </div>
              )}

              {activeSection === "rates" && caregiverId && (
                <div className="space-y-6">
                  <CaregiverRatesSection caregiverId={caregiverId} baseWage={caregiver.hourlyWage} />
                </div>
              )}

              {activeSection === "notes" && caregiverId && (
                <div className="space-y-6">
                  <CaregiverNotesSection caregiverId={caregiverId} />
                  <EmployeeWriteUpsSection employeeType="caregiver" employeeId={caregiverId} />
                </div>
              )}

              {activeSection === "preferences" && caregiverId && (
                <div className="space-y-6">
                  <CaregiverPreferencesSection caregiverId={caregiverId} />
                </div>
              )}

              {activeSection === "absence" && caregiverId && (
                <div className="space-y-6">
                  <CaregiverAbsencesSection caregiverId={caregiverId} />
                </div>
              )}

              {activeSection === "availability" && caregiverId && (
                <div className="space-y-6">
                  <CaregiverAvailabilitySection caregiverId={caregiverId} />
                </div>
              )}

              {activeSection === "payroll-info" && caregiverId && (
                <div className="space-y-6">
                  <CaregiverPayrollInfoSection caregiverId={caregiverId} />
                </div>
              )}

              {activeSection === "expenses" && caregiverId && (
                <div className="space-y-6">
                  <CaregiverExpensesSection caregiverId={caregiverId} />
                </div>
              )}

              {activeSection === "paychecks" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5" />
                        Paycheck History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {paychecks.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No paychecks found</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Pay Date</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Hours</TableHead>
                              <TableHead>Gross</TableHead>
                              <TableHead>Net</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paychecks.map((paycheck) => (
                              <TableRow key={paycheck.id} data-testid={`row-paycheck-${paycheck.id}`}>
                                <TableCell>{format(new Date(paycheck.payDate), "MMM d, yyyy")}</TableCell>
                                <TableCell className="text-sm">
                                  {format(new Date(paycheck.payPeriodStart), "MMM d")} - {format(new Date(paycheck.payPeriodEnd), "MMM d")}
                                </TableCell>
                                <TableCell>
                                  {parseFloat(paycheck.regularHours || 0) + parseFloat(paycheck.overtimeHours || 0)}
                                </TableCell>
                                <TableCell>${parseFloat(paycheck.grossPay).toFixed(2)}</TableCell>
                                <TableCell className="font-medium">${parseFloat(paycheck.netPay).toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    paycheck.status === "paid" ? "default" :
                                    paycheck.status === "processed" ? "secondary" : "outline"
                                  }>
                                    {paycheck.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "member-history" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <History className="w-5 h-5" />
                          Client Assignment History
                        </CardTitle>
                        <Button 
                          onClick={() => setShowAssignClientDialog(true)}
                          data-testid="button-assign-client"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Assign Client
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {assignedClients.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No client history found</p>
                      ) : (
                        <div className="space-y-4">
                          {assignedClients.map((client) => (
                            <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`card-client-history-${client.id}`}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{client.firstName} {client.lastName}</p>
                                  <p className="text-sm text-muted-foreground">{client.memberId || "No member ID"}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="default">Current</Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => unassignClientMutation.mutate(client.id)}
                                  disabled={unassignClientMutation.isPending}
                                  data-testid={`button-unassign-client-${client.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "others" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MoreHorizontal className="w-5 h-5" />
                        Additional Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Specializations</Label>
                          <div className="flex flex-wrap gap-2">
                            {caregiver.specializations && caregiver.specializations.length > 0 ? (
                              caregiver.specializations.map((spec, idx) => (
                                <Badge key={idx} variant="outline">{spec}</Badge>
                              ))
                            ) : (
                              <p className="text-muted-foreground text-sm">No specializations listed</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Created At</Label>
                          <p className="font-medium">
                            {caregiver.createdAt ? format(new Date(caregiver.createdAt), "MMM d, yyyy HH:mm") : "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Last Updated</Label>
                          <p className="font-medium">
                            {caregiver.updatedAt ? format(new Date(caregiver.updatedAt), "MMM d, yyyy HH:mm") : "N/A"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "documents" && (
                <div className="space-y-6">
                  <EmployeeDocumentsTab kind="caregiver" employeeId={caregiverId!} />
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Document Management (legacy categories)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                        <h4 className="font-medium mb-3">Upload New Document</h4>
                        <div className="flex gap-4 items-end flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <Label className="text-sm">Document Type</Label>
                            <Select value={uploadCategory} onValueChange={setUploadCategory}>
                              <SelectTrigger data-testid="select-upload-category">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <Label className="text-sm">Select File</Label>
                            <Input
                              type="file"
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              data-testid="input-file-upload"
                            />
                          </div>
                          <Button
                            onClick={handleFileUpload}
                            disabled={!selectedFile || uploadMutation.isPending}
                            data-testid="button-upload-document"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                          </Button>
                        </div>
                      </div>

                      <div className="mb-6 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
                        <h4 className="font-medium mb-3">Generate Documents</h4>
                        <div className="flex gap-4 items-center flex-wrap">
                          <Button
                            onClick={() => generateVerificationLetterMutation.mutate()}
                            disabled={generateVerificationLetterMutation.isPending}
                            data-testid="button-generate-verification-letter"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            {generateVerificationLetterMutation.isPending ? "Generating..." : "Generate Employment Verification Letter"}
                          </Button>
                          <Button
                            onClick={() => setShowTemplateDialog(true)}
                            variant="outline"
                            data-testid="button-generate-from-template"
                          >
                            <FileSignature className="w-4 h-4 mr-2" />
                            Generate From Template
                          </Button>
                          <p className="text-sm text-muted-foreground">
                            Creates a PDF letter with caregiver's start date, hourly rate, and office contact info.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {DOCUMENT_CATEGORIES.map((category) => {
                          const categoryDocs = groupedDocuments[category.value] || [];
                          return (
                            <div key={category.value}>
                              <h4 className="font-medium mb-2">{category.label} ({categoryDocs.length})</h4>
                              {categoryDocs.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No documents</p>
                              ) : (
                                <div className="space-y-2">
                                  {categoryDocs.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`card-document-${doc.id}`}>
                                      <div className="flex items-center gap-3">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                          <p className="font-medium text-sm">{doc.originalName || doc.fileName}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {doc.createdAt ? format(new Date(doc.createdAt), "MMM d, yyyy") : ""}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => window.open(`/api/documents/${doc.id}/view`, '_blank')}
                                          data-testid={`button-view-doc-${doc.id}`}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = `/api/documents/${doc.id}/download`;
                                            link.download = doc.originalName || doc.fileName;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                          }}
                                          data-testid={`button-download-doc-${doc.id}`}
                                        >
                                          <Download className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setEmailDocTarget(doc)}
                                          title="Email this document as an attachment"
                                          data-testid={`button-email-doc-${doc.id}`}
                                        >
                                          <Mail className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => deleteMutation.mutate(doc.id)}
                                          data-testid={`button-delete-doc-${doc.id}`}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "office-move" && caregiverId && (
                <div className="space-y-6">
                  <CaregiverOfficeMovesSection
                    caregiverId={caregiverId}
                    currentOfficeName={office?.name}
                    currentOfficeId={caregiver.officeId}
                    offices={offices}
                  />
                </div>
              )}

              {activeSection === "import-history" && (
                <ImportHistorySection caregiverId={caregiverId!} />
              )}

              {activeSection === "exclusion" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          Exclusion Verification Status
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {exclusionChecks.length > 0 && (
                            <Badge
                              variant={exclusionChecks.some(c => c.status === 'confirmed_excluded') ? 'destructive' :
                                      exclusionChecks.some(c => c.status === 'possible_match') ? 'outline' : 'secondary'}
                              data-testid="badge-exclusion-status"
                            >
                              {exclusionChecks.some(c => c.status === 'confirmed_excluded') ? 'Excluded' :
                               exclusionChecks.some(c => c.status === 'possible_match') ? 'Pending Review' : 'Cleared'}
                            </Badge>
                          )}
                          {canRunExclusionCheck && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runExclusionCheckMutation.mutate()}
                              disabled={runExclusionCheckMutation.isPending}
                              data-testid="button-run-exclusion-check"
                            >
                              {runExclusionCheckMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Running...
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Run exclusion check
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      <CardDescription>
                        Checks against OIG, PA Medicheck, and SAM.gov exclusion databases
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {exclusionRunResult && (
                        <div
                          className={`mb-4 rounded-lg border p-4 ${
                            exclusionRunResult.status === 'clear'
                              ? 'border-green-200 bg-green-50'
                              : 'border-red-200 bg-red-50'
                          }`}
                          data-testid="panel-exclusion-run-result"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {exclusionRunResult.status === 'clear' ? (
                                <Shield className="w-5 h-5 text-green-700" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-red-700" />
                              )}
                              <span
                                className={`font-medium ${
                                  exclusionRunResult.status === 'clear' ? 'text-green-900' : 'text-red-900'
                                }`}
                                data-testid="text-exclusion-run-status"
                              >
                                {exclusionRunResult.status === 'clear'
                                  ? 'Clear — no matches found'
                                  : `${exclusionRunResult.totalMatches} possible match${exclusionRunResult.totalMatches === 1 ? '' : 'es'} found`}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Ran {format(new Date(exclusionRunResult.ranAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          {exclusionRunResult.matches.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {exclusionRunResult.matches.map((m, idx) => (
                                <div
                                  key={`${m.exclusionRecordId}-${idx}`}
                                  className="flex flex-wrap items-center gap-2 rounded border border-red-100 bg-white px-3 py-2 text-sm"
                                  data-testid={`row-exclusion-run-match-${idx}`}
                                >
                                  <Badge variant="outline">{m.sourceName}</Badge>
                                  {renderMatchReasonBadge(m, idx)}
                                  <span className="text-muted-foreground">
                                    {`${m.matchedFirstName || ''} ${m.matchedLastName || ''}`.trim() || '—'}
                                  </span>
                                </div>
                              ))}
                              <p className="text-xs text-muted-foreground mt-1">
                                These results have been recorded. Use the Pending Reviews tab in Exclusion Verification to mark each as a confirmed match or false positive.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {exclusionLoading ? (
                        <p className="text-muted-foreground">Loading exclusion status...</p>
                      ) : exclusionChecks.length === 0 ? (
                        <div className="text-center py-8">
                          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No exclusion checks have been run for this caregiver yet.</p>
                          <p className="text-sm text-muted-foreground mt-2">Run an exclusion check from the Exclusion Verification dashboard.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {exclusionSources.map(source => {
                            const sourceChecks = exclusionChecks.filter(c => c.sourceId === source.id);
                            const latestCheck = sourceChecks.sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())[0];
                            return (
                              <div key={source.id} className="border rounded-lg p-4" data-testid={`exclusion-source-${source.type}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">{source.name}</span>
                                  </div>
                                  {latestCheck ? (
                                    <Badge 
                                      variant={latestCheck.status === 'confirmed_excluded' ? 'destructive' : 
                                              latestCheck.status === 'possible_match' ? 'outline' : 
                                              latestCheck.status === 'false_positive' ? 'secondary' : 'secondary'}
                                      data-testid={`badge-${source.type}-status`}
                                    >
                                      {latestCheck.status === 'confirmed_excluded' ? 'Excluded' : 
                                       latestCheck.status === 'possible_match' ? 'Possible Match' : 
                                       latestCheck.status === 'false_positive' ? 'False Positive' : 'Cleared'}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Not Checked</Badge>
                                  )}
                                </div>
                                {latestCheck && (
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    <p>Last checked: {format(new Date(latestCheck.checkedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                                    {latestCheck.matchScore && (
                                      <p>Match score: {(latestCheck.matchScore * 100).toFixed(0)}%</p>
                                    )}
                                    {latestCheck.matchType && (
                                      <p>Match type: {latestCheck.matchType === 'exact' ? 'Exact name match' : 'Fuzzy match'}</p>
                                    )}
                                    {latestCheck.reviewNotes && (
                                      <p className="mt-1 italic">Notes: {latestCheck.reviewNotes}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "reviews" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <ClipboardList className="w-5 h-5" /> Performance Reviews
                        </CardTitle>
                        <Link href="/performance-reviews">
                          <Button size="sm" variant="outline" data-testid="button-go-perf-reviews">
                            Open Reviews Hub
                          </Button>
                        </Link>
                      </div>
                      <CardDescription>
                        All performance reviews for this caregiver, including completed evaluations and acknowledgement status.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {performanceReviewsList.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">No performance reviews yet.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Scheduled</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Overall Rating</TableHead>
                              <TableHead>Acknowledged</TableHead>
                              <TableHead>Signed Document</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {performanceReviewsList.map((r: any) => {
                              const matchingDoc = performanceReviewDocs.find((d: any) =>
                                d.fileName && d.fileName.startsWith(`performance-review-${r.id}-`)
                              );
                              return (
                                <TableRow key={r.id} data-testid={`row-perf-review-${r.id}`}>
                                  <TableCell className="capitalize">{(r.reviewType || "").replace(/_/g, " ")}</TableCell>
                                  <TableCell>
                                    {r.reviewPeriodStart ? formatDateOnly(r.reviewPeriodStart, (d) => format(d, "MMM d, yyyy")) : "—"}
                                    {" – "}
                                    {r.reviewPeriodEnd ? formatDateOnly(r.reviewPeriodEnd, (d) => format(d, "MMM d, yyyy")) : "—"}
                                  </TableCell>
                                  <TableCell>{r.scheduledDate ? formatDateOnly(r.scheduledDate, (d) => format(d, "MMM d, yyyy")) : "—"}</TableCell>
                                  <TableCell>
                                    <Badge variant={r.status === "completed" ? "default" : "secondary"}>
                                      {(r.status || "scheduled").replace(/_/g, " ")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{r.overallRating ?? "—"}</TableCell>
                                  <TableCell>
                                    {r.acknowledgedAt
                                      ? <Badge className="bg-green-100 text-green-800">{format(new Date(r.acknowledgedAt), "MMM d, yyyy")}</Badge>
                                      : <Badge variant="outline">Pending</Badge>}
                                  </TableCell>
                                  <TableCell>
                                    {matchingDoc ? (
                                      <a
                                        href={`/api/documents/${matchingDoc.id}/view`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                                        data-testid={`link-signed-doc-${r.id}`}
                                      >
                                        <FileText className="w-3.5 h-3.5" /> View
                                      </a>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
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


      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Caregiver
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              placeholder="Search by name or employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-caregiver"
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {allCaregivers
                .filter((cg) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  const name = `${cg.firstName || ""} ${cg.lastName || ""}`.toLowerCase();
                  const empId = (cg.employeeId || "").toLowerCase();
                  return name.includes(query) || empId.includes(query);
                })
                .slice(0, 10)
                .map((cg) => (
                  <Link 
                    key={cg.id} 
                    href={`/caregivers/${cg.id}`}
                    onClick={() => {
                      setShowSearchDialog(false);
                      setSearchQuery("");
                    }}
                  >
                    <div 
                      className="flex items-center gap-3 p-3 rounded-md hover:bg-muted cursor-pointer border"
                      data-testid={`search-result-caregiver-${cg.id}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{cg.firstName} {cg.lastName}</p>
                        <p className="text-sm text-muted-foreground">{cg.employeeId || "No ID"}</p>
                      </div>
                      <Badge variant={cg.isActive ? "default" : "secondary"} className="flex-shrink-0">
                        {cg.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              {allCaregivers.filter((cg) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const name = `${cg.firstName || ""} ${cg.lastName || ""}`.toLowerCase();
                const empId = (cg.employeeId || "").toLowerCase();
                return name.includes(query) || empId.includes(query);
              }).length === 0 && (
                <p className="text-muted-foreground text-center py-4">No caregivers found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignClientDialog} onOpenChange={setShowAssignClientDialog} data-testid="dialog-assign-client">
        <DialogContent className="max-w-md" data-testid="dialog-assign-client">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Assign Client
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Select Client</Label>
              <PersonCombobox
                people={allClients.filter((client) => !assignedClients.some((ac) => ac.id === client.id)) as any[]}
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                placeholder="Choose a client to assign"
                testId="select-client"
                renderExtra={(c: any) => c.memberId ? `(${c.memberId})` : null}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAssignClientDialog(false);
                setSelectedClientId("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => assignClientMutation.mutate(selectedClientId)}
              disabled={!selectedClientId || assignClientMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {assignClientMutation.isPending ? "Assigning..." : "Assign Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compliance Dialog */}
      <Dialog open={showComplianceDialog} onOpenChange={(open) => { setShowComplianceDialog(open); if (!open) resetComplianceForm(); }} data-testid="dialog-compliance">
        <DialogContent className="max-w-lg" data-testid="dialog-compliance-content">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {complianceCategory === "requirement_9" && <FileText className="w-5 h-5" />}
              {complianceCategory === "background_check" && <Shield className="w-5 h-5" />}
              {complianceCategory === "medical" && <Heart className="w-5 h-5" />}
              {editingCompliance ? "Edit" : "Add"} {
                complianceCategory === "requirement_9" ? "-9 Requirement" :
                complianceCategory === "background_check" ? "Background Check" :
                "Medical Requirement"
              }
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={complianceForm.itemType} onValueChange={(v) => setComplianceForm({ ...complianceForm, itemType: v })} data-testid="select-compliance-type">
                <SelectTrigger data-testid="select-compliance-type-trigger">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {getItemTypeOptions(complianceForm.category).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={complianceForm.status} onValueChange={(v) => setComplianceForm({ ...complianceForm, status: v })} data-testid="select-compliance-status">
                <SelectTrigger data-testid="select-compliance-status-trigger">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {complianceCategory === "background_check" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Performed Date</Label>
                    <Input 
                      type="date" 
                      value={complianceForm.performedDate} 
                      onChange={(e) => setComplianceForm({ ...complianceForm, performedDate: e.target.value })}
                      data-testid="input-performed-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Result Date</Label>
                    <Input 
                      type="date" 
                      value={complianceForm.resultDate} 
                      onChange={(e) => setComplianceForm({ ...complianceForm, resultDate: e.target.value })}
                      data-testid="input-result-date"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Result</Label>
                  <Select value={complianceForm.result} onValueChange={(v) => setComplianceForm({ ...complianceForm, result: v })} data-testid="select-result">
                    <SelectTrigger data-testid="select-result-trigger">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUND_CHECK_RESULTS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {complianceCategory === "medical" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Performed Date</Label>
                  <Input 
                    type="date" 
                    value={complianceForm.performedDate} 
                    onChange={(e) => setComplianceForm({ ...complianceForm, performedDate: e.target.value })}
                    data-testid="input-medical-performed-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiration Date</Label>
                  <Input 
                    type="date" 
                    value={complianceForm.expirationDate} 
                    onChange={(e) => setComplianceForm({ ...complianceForm, expirationDate: e.target.value })}
                    data-testid="input-medical-expiration-date"
                  />
                </div>
              </div>
            )}

            {complianceCategory === "requirement_9" && (
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Input 
                  type="date" 
                  value={complianceForm.expirationDate} 
                  onChange={(e) => setComplianceForm({ ...complianceForm, expirationDate: e.target.value })}
                  data-testid="input-req9-expiration-date"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={complianceForm.notes} 
                onChange={(e) => setComplianceForm({ ...complianceForm, notes: e.target.value })}
                placeholder="Add any additional notes..."
                data-testid="textarea-compliance-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setShowComplianceDialog(false); resetComplianceForm(); }}
              data-testid="button-cancel-compliance"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCompliance}
              disabled={!complianceForm.itemType || createComplianceMutation.isPending || updateComplianceMutation.isPending}
              data-testid="button-save-compliance"
            >
              {(createComplianceMutation.isPending || updateComplianceMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Document From Template</DialogTitle>
            <DialogDescription>
              Select a template to generate a document for this caregiver.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {letterTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No templates available. Create templates in Admin → Letter Templates.
              </p>
            ) : (
              <div className="space-y-2">
                {letterTemplates.filter(t => t.status === 'published').map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplateId === template.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                    data-testid={`template-option-${template.id}`}
                  >
                    <div className="font-medium">{template.name}</div>
                    {template.description && (
                      <div className="text-sm text-muted-foreground">{template.description}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Category: {template.category || "General"}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="border rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAfterGenerate}
                  onChange={(e) => {
                    setEmailAfterGenerate(e.target.checked);
                    if (e.target.checked && !generateEmailRecipient) {
                      setGenerateEmailRecipient(caregiver?.email || user?.email || "");
                    }
                  }}
                  data-testid="checkbox-email-after-generate"
                />
                Email the letter as a PDF attachment
              </label>
              {emailAfterGenerate && (
                <Input
                  type="email"
                  placeholder="Recipient email"
                  value={generateEmailRecipient}
                  onChange={(e) => setGenerateEmailRecipient(e.target.value)}
                  data-testid="input-generate-email-recipient"
                />
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplateDialog(false);
                setSelectedTemplateId(null);
              }}
              data-testid="button-cancel-template"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplateId) {
                  generateFromTemplateMutation.mutate({
                    templateId: selectedTemplateId,
                    emailTo: emailAfterGenerate && generateEmailRecipient ? generateEmailRecipient : undefined,
                  });
                }
              }}
              disabled={!selectedTemplateId || generateFromTemplateMutation.isPending || (emailAfterGenerate && !generateEmailRecipient)}
              data-testid="button-confirm-generate"
            >
              {generateFromTemplateMutation.isPending
                ? "Generating..."
                : emailAfterGenerate
                  ? "Generate & Email"
                  : "Generate Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EmailDocumentDialog
        document={emailDocTarget}
        defaultRecipient={caregiver?.email || user?.email || ""}
        open={!!emailDocTarget}
        onOpenChange={(open) => !open && setEmailDocTarget(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Caregiver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {caregiver?.firstName || user?.firstName} {caregiver?.lastName || user?.lastName}? This action cannot be undone and will permanently remove all associated data including documents, schedules, and compliance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCaregiverMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCaregiverMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteCaregiverMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type ImportHistoryEntry = {
  id: string;
  createdAt: string | null;
  caregiverId: string | null;
  uploaderId: string | null;
  uploaderFirstName: string | null;
  uploaderLastName: string | null;
  uploaderEmail: string | null;
  newValues: {
    employeeId?: string;
    email?: string;
    npi?: string;
    licenseNumber?: string;
    certificationType?: string;
  } | null;
  ipAddress: string | null;
};

type ImportHistoryUploader = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

function ImportHistorySection({ caregiverId }: { caregiverId: string }) {
  const [uploaderFilter, setUploaderFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<{
    history: ImportHistoryEntry[];
    uploaders: ImportHistoryUploader[];
  }>({
    queryKey: ["/api/caregivers", caregiverId, "import-history", uploaderFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (uploaderFilter !== "all") params.set("uploaderId", uploaderFilter);
      const qs = params.toString();
      return fetch(`/api/caregivers/${caregiverId}/import-history${qs ? `?${qs}` : ""}`).then(r => r.json());
    },
    enabled: !!caregiverId,
  });

  const history = data?.history || [];
  const uploaders = data?.uploaders || [];

  const formatUploader = (u: { firstName: string | null; lastName: string | null; email: string | null }) => {
    const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return name || u.email || "Unknown";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Identifier Import History
              </CardTitle>
              <CardDescription>
                Audit trail of NPI / license-number changes made via the bulk identifier importer.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Uploaded by</Label>
              <Select value={uploaderFilter} onValueChange={setUploaderFilter}>
                <SelectTrigger className="w-[220px]" data-testid="select-import-history-uploader">
                  <SelectValue placeholder="All uploaders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All uploaders</SelectItem>
                  {uploaders.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{formatUploader(u)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading import history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-import-history-empty">
              No identifier imports recorded for this caregiver.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>NPI</TableHead>
                  <TableHead>License #</TableHead>
                  <TableHead>Certification Type</TableHead>
                  <TableHead>Matched by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => {
                  const v = entry.newValues || {};
                  const matchedBy = [
                    v.employeeId ? `Employee ID: ${v.employeeId}` : null,
                    v.email ? `Email: ${v.email}` : null,
                  ].filter(Boolean).join(" / ");
                  return (
                    <TableRow key={entry.id} data-testid={`row-import-history-${entry.id}`}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {entry.createdAt ? format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a") : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.uploaderId ? (
                          <div>
                            <div>{formatUploader({ firstName: entry.uploaderFirstName, lastName: entry.uploaderLastName, email: entry.uploaderEmail })}</div>
                            {entry.uploaderEmail && (
                              <div className="text-xs text-muted-foreground">{entry.uploaderEmail}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{v.npi || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{v.licenseNumber || "—"}</TableCell>
                      <TableCell className="text-sm">{v.certificationType || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{matchedBy || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
