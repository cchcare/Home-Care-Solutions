import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
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
  FileSignature
} from "lucide-react";
import type { Caregiver, User as UserType, Document, Office, Client, ComplianceItem, Coordinator, CaregiverCompliance, LetterTemplate } from "@shared/schema";

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

const CAREGIVER_MENU_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "exclusion", label: "Exclusion Check", icon: AlertTriangle },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "visits", label: "Visits", icon: Clock },
  { id: "in-service", label: "In Service", icon: GraduationCap },
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
  { id: "office-move", label: "Office Move", icon: ArrowRightLeft },
];

export default function CaregiverProfile() {
  const [, params] = useRoute("/caregivers/:id");
  const caregiverId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Caregiver>>({});
  const [uploadCategory, setUploadCategory] = useState("other");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeSection, setActiveSection] = useState("profile");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dialogType, setDialogType] = useState<string>("");
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

  const { data: notes = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "notes"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/notes`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: preferences = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "preferences"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/preferences`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: absences = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "absences"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/absences`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: availability = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "availability"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/availability`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: payrollInfo } = useQuery<any>({
    queryKey: ["/api/caregivers", caregiverId, "payroll-info"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/payroll-info`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "expenses"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/expenses`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: paychecks = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "paychecks"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/paychecks`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: rates = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "rates"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/rates`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: inServices = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "in-services"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/in-services`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: officeMoves = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "office-moves"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/office-moves`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: schedules = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "schedules"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/schedules`).then(r => r.json()),
    enabled: !!caregiverId,
  });

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
    mutationFn: async (templateId: string) => {
      const response = await apiRequest("POST", `/api/letter-templates/${templateId}/generate`, {
        scope: "caregiver",
        targetId: caregiverId,
        saveToDocuments: true,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", caregiverId, "documents"] });
      toast({ title: "Success", description: "Document generated successfully from template" });
      setShowTemplateDialog(false);
      setSelectedTemplateId(null);
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
      setIsEditing(false);
      toast({ title: "Success", description: "Caregiver updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update caregiver", variant: "destructive" });
    },
  });

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
        specializations: caregiver.specializations || [],
        officeId: caregiver.officeId,
        address: caregiver.address || "",
        address2: caregiver.address2 || "",
        city: caregiver.city || "",
        state: caregiver.state || "",
        zipCode: caregiver.zipCode || "",
        county: caregiver.county || "",
        hhaxCaregiverCode: caregiver.hhaxCaregiverCode || "",
        adpCode: caregiver.adpCode || "",
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
          showBackButton 
          backUrl="/caregivers"
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
                      <Button variant="outline" onClick={handleStartEditing} data-testid="button-edit-profile">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
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
                          <Label className="text-muted-foreground text-sm">Gender</Label>
                          {isEditing ? (
                            <Select
                              value={editFormData.gender || ""}
                              onValueChange={(value) => setEditFormData({ ...editFormData, gender: value })}
                            >
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
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
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Address</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.address || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                              data-testid="input-address"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-address">{caregiver.address || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Address 2</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.address2 || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, address2: e.target.value })}
                              data-testid="input-address2"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-address2">{caregiver.address2 || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">City</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.city || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                              data-testid="input-city"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-city">{caregiver.city || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">State</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.state || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                              data-testid="input-state"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-state">{caregiver.state || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Zip Code</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.zipCode || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, zipCode: e.target.value })}
                              data-testid="input-zip-code"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-zip-code">{caregiver.zipCode || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">County</Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.county || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, county: e.target.value })}
                              data-testid="input-county"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-county">{caregiver.county || "N/A"}</p>
                          )}
                        </div>
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
                              value={editFormData.hireDate ? new Date(editFormData.hireDate).toISOString().split('T')[0] : ""}
                              onChange={(e) => setEditFormData({ ...editFormData, hireDate: e.target.value ? new Date(e.target.value) : undefined })}
                              data-testid="input-hire-date"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-hire-date">
                              {caregiver.hireDate ? format(new Date(caregiver.hireDate), "MMM d, yyyy") : "N/A"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Start Date</Label>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editFormData.startDate ? new Date(editFormData.startDate).toISOString().split('T')[0] : ""}
                              onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value ? new Date(e.target.value) : undefined })}
                              data-testid="input-start-date"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-start-date">
                              {caregiver.startDate ? format(new Date(caregiver.startDate), "MMM d, yyyy") : "N/A"}
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
                            (s) => format(new Date(s.scheduledDate), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
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
                                {daySchedules.slice(0, 2).map((schedule) => (
                                  <div
                                    key={schedule.id}
                                    className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                                  >
                                    {schedule.startTime} - {schedule.endTime}
                                  </div>
                                ))}
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
                              <TableHead>Time</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Clock In/Out</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {schedules.slice(0, 20).map((schedule) => (
                              <TableRow key={schedule.id} data-testid={`row-visit-${schedule.id}`}>
                                <TableCell>{format(new Date(schedule.scheduledDate), "MMM d, yyyy")}</TableCell>
                                <TableCell>{schedule.startTime} - {schedule.endTime}</TableCell>
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
                                    <span className="text-sm">
                                      {format(new Date(schedule.clockInTime), "HH:mm")} - {format(new Date(schedule.clockOutTime), "HH:mm")}
                                    </span>
                                  ) : schedule.clockInTime ? (
                                    <span className="text-sm">{format(new Date(schedule.clockInTime), "HH:mm")} - Pending</span>
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

              {activeSection === "in-service" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5" />
                          In-Service Training Records
                        </CardTitle>
                        <Button size="sm" onClick={() => { setDialogType("in-service"); setShowAddDialog(true); }} data-testid="button-add-in-service">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Training
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {inServices.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No in-service training records found</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Training</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Hours</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inServices.map((service) => (
                              <TableRow key={service.id} data-testid={`row-in-service-${service.id}`}>
                                <TableCell className="font-medium">{service.title}</TableCell>
                                <TableCell>{format(new Date(service.trainingDate), "MMM d, yyyy")}</TableCell>
                                <TableCell>{service.hours || "N/A"}</TableCell>
                                <TableCell>
                                  <Badge variant={service.status === "completed" ? "default" : "secondary"}>
                                    {service.status}
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

              {activeSection === "rates" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          Pay Rates
                        </CardTitle>
                        <Button size="sm" onClick={() => { setDialogType("rate"); setShowAddDialog(true); }} data-testid="button-add-rate">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Rate
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Base Hourly Wage</p>
                        <p className="text-2xl font-bold" data-testid="text-base-wage">
                          {caregiver.hourlyWage ? `$${parseFloat(caregiver.hourlyWage).toFixed(2)}/hr` : "Not set"}
                        </p>
                      </div>
                      {rates.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No additional rates configured</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Service Type</TableHead>
                              <TableHead>Rate</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Effective</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rates.map((rate) => (
                              <TableRow key={rate.id} data-testid={`row-rate-${rate.id}`}>
                                <TableCell className="font-medium capitalize">{rate.serviceType?.replace(/_/g, " ")}</TableCell>
                                <TableCell>${parseFloat(rate.rate).toFixed(2)}</TableCell>
                                <TableCell className="capitalize">{rate.rateType}</TableCell>
                                <TableCell>
                                  {rate.effectiveFrom ? format(new Date(rate.effectiveFrom), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={rate.isActive ? "default" : "secondary"}>
                                    {rate.isActive ? "Active" : "Inactive"}
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

              {activeSection === "notes" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Notes
                        </CardTitle>
                        <Button size="sm" onClick={() => { setDialogType("note"); setShowAddDialog(true); }} data-testid="button-add-note">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Note
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {notes.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No notes found</p>
                      ) : (
                        <div className="space-y-4">
                          {notes.map((note) => (
                            <div key={note.id} className="p-4 border rounded-lg" data-testid={`card-note-${note.id}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="capitalize">{note.noteType}</Badge>
                                  {note.subject && <span className="font-medium">{note.subject}</span>}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(note.createdAt), "MMM d, yyyy")}
                                </span>
                              </div>
                              <p className="text-sm">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "preferences" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="w-5 h-5" />
                          Work Preferences
                        </CardTitle>
                        <Button size="sm" onClick={() => { setDialogType("preference"); setShowAddDialog(true); }} data-testid="button-add-preference">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Preference
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {preferences.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No preferences set</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Value</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {preferences.map((pref) => (
                              <TableRow key={pref.id} data-testid={`row-preference-${pref.id}`}>
                                <TableCell className="font-medium capitalize">{pref.preferenceType?.replace(/_/g, " ")}</TableCell>
                                <TableCell>{pref.preferenceValue}</TableCell>
                                <TableCell>
                                  <Badge variant={pref.priority === 1 ? "default" : pref.priority === 2 ? "secondary" : "outline"}>
                                    {pref.priority === 1 ? "High" : pref.priority === 2 ? "Medium" : "Low"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{pref.notes || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "absence" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          Absences & Restrictions
                        </CardTitle>
                        <Button size="sm" onClick={() => { setDialogType("absence"); setShowAddDialog(true); }} data-testid="button-add-absence">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Absence
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {absences.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No absences or restrictions recorded</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {absences.map((absence) => (
                              <TableRow key={absence.id} data-testid={`row-absence-${absence.id}`}>
                                <TableCell className="font-medium capitalize">{absence.absenceType?.replace(/_/g, " ")}</TableCell>
                                <TableCell>{format(new Date(absence.startDate), "MMM d, yyyy")}</TableCell>
                                <TableCell>
                                  {absence.endDate ? format(new Date(absence.endDate), "MMM d, yyyy") : "Ongoing"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    absence.status === "approved" ? "default" :
                                    absence.status === "pending" ? "secondary" : "destructive"
                                  }>
                                    {absence.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{absence.reason || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "availability" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <CalendarDays className="w-5 h-5" />
                          Weekly Availability
                        </CardTitle>
                        <Button size="sm" onClick={() => { setDialogType("availability"); setShowAddDialog(true); }} data-testid="button-add-availability">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Slot
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {availability.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No availability set</p>
                      ) : (
                        <div className="grid grid-cols-7 gap-2">
                          {DAY_NAMES.map((day, idx) => {
                            const daySlots = availability.filter((a) => a.dayOfWeek === idx);
                            return (
                              <div key={day} className="border rounded-lg p-2">
                                <h4 className="font-medium text-sm text-center border-b pb-1 mb-2">{day}</h4>
                                {daySlots.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center">Not set</p>
                                ) : (
                                  <div className="space-y-1">
                                    {daySlots.map((slot) => (
                                      <div
                                        key={slot.id}
                                        className={`text-xs p-1 rounded text-center ${
                                          slot.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                        }`}
                                      >
                                        {slot.startTime} - {slot.endTime}
                                      </div>
                                    ))}
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

              {activeSection === "payroll-info" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Payroll Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!payrollInfo ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">No payroll information configured</p>
                          <Button onClick={() => { setDialogType("payroll-info"); setShowAddDialog(true); }} data-testid="button-setup-payroll">
                            <Plus className="w-4 h-4 mr-2" />
                            Setup Payroll Info
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm">Payment Method</Label>
                            <p className="font-medium capitalize" data-testid="text-payment-method">
                              {payrollInfo.paymentMethod?.replace(/_/g, " ") || "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm">Bank Name</Label>
                            <p className="font-medium" data-testid="text-bank-name">{payrollInfo.bankName || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm">Account Type</Label>
                            <p className="font-medium capitalize" data-testid="text-account-type">{payrollInfo.accountType || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm">Tax Filing Status</Label>
                            <p className="font-medium capitalize" data-testid="text-tax-status">
                              {payrollInfo.taxFilingStatus?.replace(/_/g, " ") || "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm">W-4 On File</Label>
                            <Badge variant={payrollInfo.w4OnFile ? "default" : "secondary"} data-testid="badge-w4">
                              {payrollInfo.w4OnFile ? "Yes" : "No"}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm">I-9 On File</Label>
                            <Badge variant={payrollInfo.i9OnFile ? "default" : "secondary"} data-testid="badge-i9">
                              {payrollInfo.i9OnFile ? "Yes" : "No"}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "expenses" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Receipt className="w-5 h-5" />
                          Expenses
                        </CardTitle>
                        <Button size="sm" onClick={() => { setDialogType("expense"); setShowAddDialog(true); }} data-testid="button-add-expense">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Expense
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {expenses.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No expenses recorded</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {expenses.map((expense) => (
                              <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                                <TableCell>{format(new Date(expense.expenseDate), "MMM d, yyyy")}</TableCell>
                                <TableCell className="capitalize">{expense.expenseType?.replace(/_/g, " ")}</TableCell>
                                <TableCell>${parseFloat(expense.amount).toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    expense.status === "paid" ? "default" :
                                    expense.status === "approved" ? "secondary" :
                                    expense.status === "pending" ? "outline" : "destructive"
                                  }>
                                    {expense.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{expense.description || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Document Management
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

              {activeSection === "office-move" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <ArrowRightLeft className="w-5 h-5" />
                          Office Transfer History
                        </CardTitle>
                        <Button size="sm" onClick={() => { setDialogType("office-move"); setShowAddDialog(true); }} data-testid="button-add-office-move">
                          <Plus className="w-4 h-4 mr-2" />
                          Record Transfer
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Current Office</p>
                        <p className="text-lg font-medium" data-testid="text-current-office">{office?.name || "Not assigned"}</p>
                      </div>
                      {officeMoves.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No transfer history</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>From</TableHead>
                              <TableHead>To</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {officeMoves.map((move) => (
                              <TableRow key={move.id} data-testid={`row-office-move-${move.id}`}>
                                <TableCell>{format(new Date(move.moveDate), "MMM d, yyyy")}</TableCell>
                                <TableCell>{offices.find(o => o.id === move.fromOfficeId)?.name || "N/A"}</TableCell>
                                <TableCell>{offices.find(o => o.id === move.toOfficeId)?.name || "N/A"}</TableCell>
                                <TableCell>
                                  <Badge variant={move.status === "completed" ? "default" : "secondary"}>
                                    {move.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{move.reason || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "exclusion" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          Exclusion Verification Status
                        </CardTitle>
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
                      </div>
                      <CardDescription>
                        Checks against OIG, PA Medicheck, and SAM.gov exclusion databases
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
            </div>
          </div>
        </div>
      </main>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "note" && "Add Note"}
              {dialogType === "preference" && "Add Preference"}
              {dialogType === "absence" && "Add Absence"}
              {dialogType === "availability" && "Add Availability Slot"}
              {dialogType === "expense" && "Add Expense"}
              {dialogType === "rate" && "Add Rate"}
              {dialogType === "in-service" && "Add In-Service Training"}
              {dialogType === "office-move" && "Record Office Transfer"}
              {dialogType === "payroll-info" && "Setup Payroll Info"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Form for adding {dialogType} would be implemented here with proper validation and API calls.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Select value={selectedClientId} onValueChange={setSelectedClientId} data-testid="select-client">
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Choose a client to assign" />
                </SelectTrigger>
                <SelectContent>
                  {allClients
                    .filter((client) => !assignedClients.some((ac) => ac.id === client.id))
                    .map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName} {client.lastName} {client.memberId ? `(${client.memberId})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
                <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
                  generateFromTemplateMutation.mutate(selectedTemplateId);
                }
              }}
              disabled={!selectedTemplateId || generateFromTemplateMutation.isPending}
              data-testid="button-confirm-generate"
            >
              {generateFromTemplateMutation.isPending ? "Generating..." : "Generate Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
