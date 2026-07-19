import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { MasterWeekTemplateModal } from "@/components/master-week-template-modal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { parseDateOnlyInput, toDateOnlyInputValue, formatDateOnly } from "@/lib/dateOnly";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Calendar, 
  Building, 
  MapPin,
  Heart,
  AlertCircle,
  FileText,
  Upload,
  Trash2,
  Download,
  Pill,
  Stethoscope,
  DollarSign,
  CalendarDays,
  MessageSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  RotateCcw,
  Users,
  Eye,
  X,
  Edit,
  Save,
  Shield,
  UserCheck,
  ClipboardList,
  Star,
  CheckCircle,
  History,
  MoreHorizontal,
  Wallet,
  UserPlus,
  Search,
  ExternalLink,
  Globe,
  FileSignature,
  Mail,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Client, Document, Office, Mco, User as UserType, ClientCommunication, OfficeMcoBillingRate, ClientSchedule, MasterWeekTemplate, MasterWeekSlot, Caregiver, ClientMco, Coordinator, EligibilityCheck, LetterTemplate } from "@shared/schema";
import { EmailDocumentDialog } from "@/components/email-document-dialog";
import { AddressInput } from "@/components/address-input";
import { ClientNoticesSection } from "@/components/client-notices-section";

const DOCUMENT_CATEGORIES = [
  { value: "id_card", label: "ID Card" },
  { value: "insurance_card", label: "Insurance Card" },
  { value: "medicaid_card", label: "Medicaid Card" },
  { value: "care_plan", label: "Care Plan" },
  { value: "physician_order", label: "Physician Order" },
  { value: "assessment", label: "Assessment" },
  { value: "consent_form", label: "Consent Form" },
  { value: "medical_record", label: "Medical Record" },
  { value: "other", label: "Other" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CLIENT_MENU_ITEMS = [
  { id: "general", label: "General", icon: Heart },
  { id: "mcos", label: "MCOs/Insurance", icon: Shield },
  { id: "spend-down", label: "Spend Down", icon: Wallet },
  { id: "referral", label: "Referral Member Info", icon: UserPlus },
  { id: "profile", label: "Profile", icon: User },
  { id: "eligibility", label: "Eligibility Check", icon: CheckCircle },
  { id: "auth-orders", label: "Auth/Orders", icon: ClipboardList },
  { id: "special-requests", label: "Special Requests", icon: Star },
  { id: "master-week", label: "Master Week", icon: CalendarDays },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "visits", label: "Visits", icon: Clock },
  { id: "poc", label: "POC", icon: FileText },
  { id: "caregiver-history", label: "Caregiver History", icon: History },
  { id: "emergency-plan", label: "Emergency Plan", icon: ShieldAlert },
  { id: "notices", label: "Rights & Notices", icon: ShieldCheck },
  { id: "others", label: "Others", icon: MoreHorizontal },
];

export default function ClientProfile() {
  const [, params] = useRoute("/clients/:id");
  const clientId = params?.id;
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState("note");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMasterWeekEditor, setShowMasterWeekEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("edit") === "1";
  });
  const [editFormData, setEditFormData] = useState<Partial<Client>>({});
  const [activeSection, setActiveSection] = useState("general");
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMcoDialog, setShowMcoDialog] = useState(false);
  const [editingMco, setEditingMco] = useState<ClientMco | null>(null);
  const [showAssignCaregiverDialog, setShowAssignCaregiverDialog] = useState(false);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState("");
  const [mcoFormData, setMcoFormData] = useState<{
    mcoId: string;
    startDate: string;
    dischargeDate: string;
    dischargeReason: string;
    dischargeNotes: string;
    isPrimary: boolean;
    status: string;
  }>({
    mcoId: "",
    startDate: "",
    dischargeDate: "",
    dischargeReason: "none",
    dischargeNotes: "",
    isPrimary: false,
    status: "active",
  });
  const [showEligibilityDialog, setShowEligibilityDialog] = useState(false);
  const [editingEligibility, setEditingEligibility] = useState<EligibilityCheck | null>(null);
  const [eligibilityFormData, setEligibilityFormData] = useState({
    mcoId: "",
    memberId: "",
    checkDate: new Date().toISOString().split('T')[0],
    status: "pending",
    eligibilityStatus: "",
    coverageStartDate: "",
    coverageEndDate: "",
    verificationSource: "promise_portal",
    notes: "",
    expirationDate: "",
  });

  // Template generation state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [emailAfterGenerate, setEmailAfterGenerate] = useState(false);
  const [generateEmailRecipient, setGenerateEmailRecipient] = useState("");
  const [emailDocTarget, setEmailDocTarget] = useState<Document | null>(null);

  // Master week template state
  const [showMasterWeekModal, setShowMasterWeekModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MasterWeekTemplate | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applyFromDate, setApplyFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [applyToDate, setApplyToDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 28);
    return date.toISOString().split('T')[0];
  });
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<MasterWeekTemplate | null>(null);

  // Drag and drop state for schedule calendar
  const [activeSchedule, setActiveSchedule] = useState<ClientSchedule | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    queryFn: () => fetch(`/api/clients/${clientId}`).then(r => r.json()),
    enabled: !!clientId,
  });

  const { data: office } = useQuery<Office>({
    queryKey: ["/api/offices", client?.officeId],
    queryFn: () => fetch(`/api/offices/${client?.officeId}`).then(r => r.json()),
    enabled: !!client?.officeId,
  });

  const { data: allOffices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const { data: mco } = useQuery<Mco>({
    queryKey: ["/api/mcos", client?.mcoId],
    queryFn: () => fetch(`/api/mcos/${client?.mcoId}`).then(r => r.json()),
    enabled: !!client?.mcoId,
  });

  const { data: coordinator } = useQuery<Coordinator>({
    queryKey: ["/api/coordinators", client?.coordinatorId],
    queryFn: () => fetch(`/api/coordinators/${client?.coordinatorId}`).then(r => r.json()),
    enabled: !!client?.coordinatorId,
  });

  const { data: allCoordinators = [] } = useQuery<Coordinator[]>({
    queryKey: ["/api/coordinators"],
    queryFn: () => fetch(`/api/coordinators`).then(r => r.json()),
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/clients", clientId, "documents"],
    queryFn: () => fetch(`/api/clients/${clientId}/documents`).then(r => r.json()),
    enabled: !!clientId,
  });

  const { data: caregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/clients", clientId, "caregivers"],
    queryFn: () => fetch(`/api/clients/${clientId}/caregivers`).then(r => r.json()),
    enabled: !!clientId,
  });

  const { data: communications = [] } = useQuery<ClientCommunication[]>({
    queryKey: ["/api/clients", clientId, "communications"],
    queryFn: () => fetch(`/api/clients/${clientId}/communications`).then(r => r.json()),
    enabled: !!clientId,
  });

  const { data: billingRates = [] } = useQuery<OfficeMcoBillingRate[]>({
    queryKey: ["/api/offices", client?.officeId, "billing-rates", client?.mcoId],
    queryFn: () => fetch(`/api/offices/${client?.officeId}/billing-rates?mcoId=${client?.mcoId}`).then(r => r.json()),
    enabled: !!client?.officeId && !!client?.mcoId,
  });

  const { data: officeMcos = [] } = useQuery<Mco[]>({
    queryKey: ["/api/offices", client?.officeId, "mcos"],
    queryFn: () => fetch(`/api/offices/${client?.officeId}/mcos`).then(r => r.json()),
    enabled: !!client?.officeId,
  });

  const { data: allMcoRates = [] } = useQuery<OfficeMcoBillingRate[]>({
    queryKey: ["/api/offices", client?.officeId, "mco-rates"],
    queryFn: () => fetch(`/api/offices/${client?.officeId}/mco-rates`).then(r => r.json()),
    enabled: !!client?.officeId,
  });

  const { data: schedules = [] } = useQuery<ClientSchedule[]>({
    queryKey: ["/api/clients", clientId, "schedules"],
    queryFn: () => fetch(`/api/clients/${clientId}/schedules`).then(r => r.json()),
    enabled: !!clientId,
  });

  const { data: masterWeekTemplates = [] } = useQuery<MasterWeekTemplate[]>({
    queryKey: ["/api/clients", clientId, "master-week"],
    queryFn: () => fetch(`/api/clients/${clientId}/master-week`).then(r => r.json()),
    enabled: !!clientId,
  });

  const { data: allCaregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
    queryFn: () => fetch(`/api/caregivers`).then(r => r.json()),
  });

  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => fetch(`/api/clients`).then(r => r.json()),
  });

  const { data: clientMcos = [] } = useQuery<ClientMco[]>({
    queryKey: ["/api/clients", clientId, "mcos"],
    queryFn: () => fetch(`/api/clients/${clientId}/mcos`).then(r => r.json()),
    enabled: !!clientId,
  });

  const { data: allMcos = [] } = useQuery<Mco[]>({
    queryKey: ["/api/mcos"],
    queryFn: () => fetch(`/api/mcos`).then(r => r.json()),
  });

  const { data: eligibilityChecks = [] } = useQuery<EligibilityCheck[]>({
    queryKey: ["/api/clients", clientId, "eligibility-checks"],
    queryFn: () => fetch(`/api/clients/${clientId}/eligibility-checks`).then(r => r.json()),
    enabled: !!clientId,
  });

  const { data: letterTemplates = [] } = useQuery<LetterTemplate[]>({
    queryKey: ["/api/letter-templates/scope/client"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      setSelectedFile(null);
      toast({ title: "Success", description: "Document uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      toast({ title: "Success", description: "Document deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    },
  });

  const createCommunicationMutation = useMutation({
    mutationFn: async (data: { message: string; communicationType: string }) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/communications`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "communications"] });
      setNewMessage("");
      toast({ title: "Success", description: "Communication added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add communication", variant: "destructive" });
    },
  });

  const rolloverMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/schedules/rollover`, { days: 30 });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "schedules"] });
      toast({ title: "Success", description: "Schedule rolled over for 30 days" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to rollover schedule", variant: "destructive" });
    },
  });

  const createMasterWeekMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/master-week`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "master-week"] });
      toast({ title: "Success", description: "Master week template created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    },
  });

  const applyToCalendarMutation = useMutation({
    mutationFn: async ({ templateId, fromDate, toDate }: { templateId: string; fromDate: string; toDate: string }) => {
      const response = await apiRequest("POST", `/api/master-week-templates/${templateId}/apply`, { fromDate, toDate });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "schedules"] });
      setShowApplyDialog(false);
      setSelectedTemplateForApply(null);
      toast({ 
        title: "Success", 
        description: `Created ${data.schedules?.length || 0} schedule entries from master week template` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply template to calendar", variant: "destructive" });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async (data: Partial<Client>) => {
      return await apiRequest("PUT", `/api/clients/${clientId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsEditing(false);
      toast({ title: "Success", description: "Client updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update client", variant: "destructive" });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({ title: "Success", description: "Client deleted successfully" });
      navigate("/clients");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete client", variant: "destructive" });
    },
  });

  const canDeleteClient = currentUser && ["super_admin", "admin", "office_admin"].includes(currentUser.role);

  // ─── Emergency Plan ───────────────────────────────────────────────────────
  const [emergencyPlan, setEmergencyPlan] = useState<any>({
    evacuationRoute: "", shelterInPlaceInstructions: "", medicalConditions: "",
    medications: "", specialEquipment: "", preferredHospital: "",
    doNotResuscitate: false, powerDependentEquipment: false,
    mobilityAssistance: false, utilityCompanyNotified: false,
    lastReviewedAt: "", nextReviewDue: "",
    primaryEmergencyContact: { name: "", relationship: "", phone: "", altPhone: "" },
    secondaryEmergencyContact: { name: "", relationship: "", phone: "", altPhone: "" },
  });
  useQuery({
    queryKey: ["/api/clients", clientId, "emergency-plan"],
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}/emergency-plan`);
      if (!r.ok) return null;
      const plan = await r.json();
      if (plan) {
        setEmergencyPlan({
          evacuationRoute: plan.evacuationRoute || "",
          shelterInPlaceInstructions: plan.shelterInPlaceInstructions || "",
          medicalConditions: plan.medicalConditions || "",
          medications: plan.medications || "",
          specialEquipment: plan.specialEquipment || "",
          preferredHospital: plan.preferredHospital || "",
          doNotResuscitate: plan.doNotResuscitate ?? false,
          powerDependentEquipment: plan.powerDependentEquipment ?? false,
          mobilityAssistance: plan.mobilityAssistance ?? false,
          utilityCompanyNotified: plan.utilityCompanyNotified ?? false,
          lastReviewedAt: plan.lastReviewedAt || "",
          nextReviewDue: plan.nextReviewDue || "",
          primaryEmergencyContact: plan.primaryEmergencyContact || { name: "", relationship: "", phone: "", altPhone: "" },
          secondaryEmergencyContact: plan.secondaryEmergencyContact || { name: "", relationship: "", phone: "", altPhone: "" },
        });
      }
      return plan;
    },
    enabled: !!clientId,
  });

  const saveEmergencyPlanMutation = useMutation({
    mutationFn: async (officeId: string) => {
      return apiRequest("PUT", `/api/clients/${clientId}/emergency-plan`, {
        ...emergencyPlan,
        officeId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "emergency-plan"] });
      toast({ title: "Emergency plan saved", description: "Client emergency plan updated successfully." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save emergency plan", variant: "destructive" }),
  });

  const createClientMcoMutation = useMutation({
    mutationFn: async (data: typeof mcoFormData) => {
      return await apiRequest("POST", `/api/clients/${clientId}/mcos`, {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dischargeDate: data.dischargeDate ? new Date(data.dischargeDate) : null,
        dischargeReason: data.dischargeReason === "none" ? null : data.dischargeReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "mcos"] });
      setShowMcoDialog(false);
      resetMcoForm();
      toast({ title: "Success", description: "MCO added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add MCO", variant: "destructive" });
    },
  });

  const updateClientMcoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof mcoFormData }) => {
      return await apiRequest("PUT", `/api/client-mcos/${id}`, {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dischargeDate: data.dischargeDate ? new Date(data.dischargeDate) : null,
        dischargeReason: data.dischargeReason === "none" ? null : data.dischargeReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "mcos"] });
      setShowMcoDialog(false);
      setEditingMco(null);
      resetMcoForm();
      toast({ title: "Success", description: "MCO updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update MCO", variant: "destructive" });
    },
  });

  const deleteClientMcoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/client-mcos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "mcos"] });
      toast({ title: "Success", description: "MCO removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove MCO", variant: "destructive" });
    },
  });

  const createEligibilityCheckMutation = useMutation({
    mutationFn: async (data: typeof eligibilityFormData) => {
      return await apiRequest("POST", `/api/clients/${clientId}/eligibility-checks`, {
        ...data,
        officeId: client?.officeId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "eligibility-checks"] });
      setShowEligibilityDialog(false);
      resetEligibilityForm();
      toast({ title: "Success", description: "Eligibility check recorded successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to record eligibility check", variant: "destructive" });
    },
  });

  const updateEligibilityCheckMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof eligibilityFormData }) => {
      return await apiRequest("PUT", `/api/eligibility-checks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "eligibility-checks"] });
      setShowEligibilityDialog(false);
      setEditingEligibility(null);
      resetEligibilityForm();
      toast({ title: "Success", description: "Eligibility check updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update eligibility check", variant: "destructive" });
    },
  });

  const deleteEligibilityCheckMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/eligibility-checks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "eligibility-checks"] });
      toast({ title: "Success", description: "Eligibility check deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete eligibility check", variant: "destructive" });
    },
  });

  const assignCaregiverMutation = useMutation({
    mutationFn: async (caregiverId: string) => {
      return await apiRequest("POST", `/api/clients/${clientId}/caregivers`, { caregiverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "caregivers"] });
      setShowAssignCaregiverDialog(false);
      setSelectedCaregiverId("");
      toast({ title: "Success", description: "Caregiver assigned successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign caregiver", variant: "destructive" });
    },
  });

  const unassignCaregiverMutation = useMutation({
    mutationFn: async (caregiverId: string) => {
      return await apiRequest("DELETE", `/api/clients/${clientId}/caregivers/${caregiverId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "caregivers"] });
      toast({ title: "Success", description: "Caregiver unassigned successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unassign caregiver", variant: "destructive" });
    },
  });

  const generateFromTemplateMutation = useMutation({
    mutationFn: async ({ templateId, emailTo }: { templateId: string; emailTo?: string }) => {
      const response = await apiRequest("POST", `/api/letter-templates/${templateId}/generate`, {
        scope: "client",
        targetId: clientId,
        saveToDocuments: true,
        ...(emailTo ? { emailTo } : {}),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
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

  // Mutation for moving a schedule to a different date via drag and drop
  const moveScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, newDate }: { scheduleId: string; newDate: Date }) => {
      return await apiRequest("PUT", `/api/client-schedules/${scheduleId}`, {
        scheduledDate: newDate,
        reason: "Schedule moved via drag and drop"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "schedules"] });
      toast({ title: "Success", description: "Schedule moved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to move schedule", variant: "destructive" });
    },
  });

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const schedule = schedules.find(s => s.id === active.id);
    setActiveSchedule(schedule || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSchedule(null);
    
    if (!over || !active) return;
    
    // The droppable id is the date string (yyyy-MM-dd)
    const newDateStr = over.id as string;
    const scheduleId = active.id as string;
    
    // Find the schedule being moved
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    // Check if the schedule is being dropped on the same day
    const currentDate = format(new Date(schedule.scheduledDate), "yyyy-MM-dd");
    if (currentDate === newDateStr) return;
    
    // Move the schedule to the new date
    moveScheduleMutation.mutate({
      scheduleId,
      newDate: new Date(newDateStr),
    });
  };

  const resetMcoForm = () => {
    setMcoFormData({
      mcoId: "",
      startDate: "",
      dischargeDate: "",
      dischargeReason: "none",
      dischargeNotes: "",
      isPrimary: false,
      status: "active",
    });
  };

  const handleOpenMcoDialog = (mco?: ClientMco) => {
    if (mco) {
      setEditingMco(mco);
      setMcoFormData({
        mcoId: mco.mcoId || "",
        startDate: mco.startDate ? format(new Date(mco.startDate), "yyyy-MM-dd") : "",
        dischargeDate: mco.dischargeDate ? format(new Date(mco.dischargeDate), "yyyy-MM-dd") : "",
        dischargeReason: mco.dischargeReason || "none",
        dischargeNotes: mco.dischargeNotes || "",
        isPrimary: mco.isPrimary || false,
        status: mco.status || "active",
      });
    } else {
      setEditingMco(null);
      resetMcoForm();
    }
    setShowMcoDialog(true);
  };

  const handleSaveMco = () => {
    if (!mcoFormData.mcoId) {
      toast({ title: "Error", description: "Please select an MCO", variant: "destructive" });
      return;
    }
    if (editingMco) {
      updateClientMcoMutation.mutate({ id: editingMco.id, data: mcoFormData });
    } else {
      createClientMcoMutation.mutate(mcoFormData);
    }
  };

  const resetEligibilityForm = () => {
    setEligibilityFormData({
      mcoId: "",
      memberId: "",
      checkDate: new Date().toISOString().split('T')[0],
      status: "pending",
      eligibilityStatus: "",
      coverageStartDate: "",
      coverageEndDate: "",
      verificationSource: "promise_portal",
      notes: "",
      expirationDate: "",
    });
  };

  const handleOpenEligibilityDialog = (check?: EligibilityCheck) => {
    if (check) {
      setEditingEligibility(check);
      setEligibilityFormData({
        mcoId: check.mcoId || "",
        memberId: check.memberId || "",
        checkDate: check.checkDate ? format(new Date(check.checkDate), "yyyy-MM-dd") : "",
        status: check.status || "pending",
        eligibilityStatus: check.eligibilityStatus || "",
        coverageStartDate: check.coverageStartDate ? format(new Date(check.coverageStartDate), "yyyy-MM-dd") : "",
        coverageEndDate: check.coverageEndDate ? format(new Date(check.coverageEndDate), "yyyy-MM-dd") : "",
        verificationSource: check.verificationSource || "promise_portal",
        notes: check.notes || "",
        expirationDate: check.expirationDate ? format(new Date(check.expirationDate), "yyyy-MM-dd") : "",
      });
    } else {
      setEditingEligibility(null);
      resetEligibilityForm();
      // Pre-fill with client's current MCO if available
      if (client?.mcoId) {
        setEligibilityFormData(prev => ({ ...prev, mcoId: client.mcoId || "" }));
      }
      if (client?.memberId) {
        setEligibilityFormData(prev => ({ ...prev, memberId: client.memberId || "" }));
      }
    }
    setShowEligibilityDialog(true);
  };

  const handleSaveEligibility = () => {
    if (!eligibilityFormData.checkDate) {
      toast({ title: "Error", description: "Please enter a check date", variant: "destructive" });
      return;
    }
    if (editingEligibility) {
      updateEligibilityCheckMutation.mutate({ id: editingEligibility.id, data: eligibilityFormData });
    } else {
      createEligibilityCheckMutation.mutate(eligibilityFormData);
    }
  };

  const openPromisePortal = () => {
    window.open("https://promise.dhs.pa.gov/portal/provider/Home/tabid/135/Default.aspx", "_blank");
  };

  const handleStartEditing = () => {
    if (client) {
      setEditFormData({
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        phone: client.phone || "",
        email: (client as any).email || "",
        address: client.address || "",
        address2: client.address2 || "",
        city: client.city || "",
        state: client.state || "",
        zipCode: client.zipCode || "",
        county: client.county || "",
        hhaxAdmissionId: client.hhaxAdmissionId || "",
        dateOfBirth: client.dateOfBirth,
        memberId: client.memberId || "",
        serviceStartDate: client.serviceStartDate,
        lastServiceDate: (client as any).lastServiceDate,
        emergencyContactName: client.emergencyContactName || "",
        emergencyContactPhone: client.emergencyContactPhone || "",
        emergencyContactRelation: client.emergencyContactRelation || "",
        primaryDiagnosis: client.primaryDiagnosis || "",
        primaryPhysician: client.primaryPhysician || "",
        allergies: client.allergies || "",
        medications: client.medications || "",
        status: client.status,
        officeId: client.officeId || "",
        mcoId: client.mcoId || "",
        coordinatorId: client.coordinatorId || "",
        // SNAP fields
        snapStatus: client.snapStatus || "unknown",
        snapRenewalDate: client.snapRenewalDate,
        snapExpiryDate: client.snapExpiryDate,
        snapNotes: client.snapNotes || "",
        // Medicaid fields
        medicaidStatus: client.medicaidStatus || "unknown",
        medicaidRenewalDate: client.medicaidRenewalDate,
        medicaidExpiryDate: client.medicaidExpiryDate,
        medicaidNotes: client.medicaidNotes || "",
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdits = () => {
    updateClientMutation.mutate(editFormData);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditFormData({});
  };

  const handleFileUpload = () => {
    if (!selectedFile || !clientId) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("clientId", clientId);
    formData.append("documentType", uploadCategory);
    uploadMutation.mutate(formData);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    createCommunicationMutation.mutate({
      message: newMessage,
      communicationType: messageType,
    });
  };

  const groupedDocuments = DOCUMENT_CATEGORIES.reduce((acc, category) => {
    acc[category.value] = documents.filter(doc => doc.documentType === category.value);
    return acc;
  }, {} as Record<string, Document[]>);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSchedulesForDay = (date: Date) => {
    return schedules.filter(s => {
      const scheduleDate = new Date(s.scheduledDate);
      return scheduleDate.toDateString() === date.toDateString();
    });
  };

  const getCaregiverName = (caregiverId: string | null | undefined) => {
    if (!caregiverId) return null;
    const caregiver = allCaregivers.find(c => c.id === caregiverId);
    if (!caregiver) return null;
    return `${caregiver.firstName} ${caregiver.lastName}`.trim();
  };

  // Draggable schedule item component for drag and drop
  const DraggableScheduleItem = ({ schedule, caregiverName }: { schedule: ClientSchedule; caregiverName: string | null }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: schedule.id,
    });
    
    const style = {
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.5 : 1,
    };
    
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="text-xs p-1 bg-primary/20 rounded truncate cursor-grab active:cursor-grabbing hover:bg-primary/30 transition-colors"
        title={`${schedule.startTime} - ${schedule.endTime}${caregiverName ? ` (${caregiverName})` : ''} - Drag to move`}
        data-testid={`draggable-schedule-${schedule.id}`}
      >
        <div>{schedule.startTime}</div>
        {caregiverName && (
          <div className="text-[10px] text-muted-foreground truncate">{caregiverName}</div>
        )}
      </div>
    );
  };

  // Droppable day cell component for drag and drop
  const DroppableDay = ({ 
    dateStr, 
    isToday: isTodayDate, 
    isSameMonth: isSameMonthDate, 
    dayNumber, 
    children 
  }: { 
    dateStr: string; 
    isToday: boolean; 
    isSameMonth: boolean; 
    dayNumber: string; 
    children: ReactNode;
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: dateStr,
    });
    
    return (
      <div
        ref={setNodeRef}
        className={`p-2 min-h-[80px] border rounded-lg transition-colors ${
          isTodayDate ? "bg-primary/10 border-primary" : "bg-card"
        } ${!isSameMonthDate ? "opacity-50" : ""} ${
          isOver ? "bg-primary/20 border-primary border-2" : ""
        }`}
        data-testid={`calendar-day-${dateStr}`}
      >
        <div className="text-sm font-medium mb-1">{dayNumber}</div>
        {children}
      </div>
    );
  };

  if (clientLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-4">Client not found</p>
          <Link href="/clients">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
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
          title="Client Profile"
          subtitle={`${client.firstName} ${client.lastName}`}
        />
        
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
          <Link href="/clients">
            <Button variant="ghost" size="sm" data-testid="button-back-clients">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant={client.status === "active" ? "default" : "secondary"}>
              {client.status || "active"}
            </Badge>
            {isEditing ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEditing} data-testid="button-cancel-edit">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdits} disabled={updateClientMutation.isPending} data-testid="button-save-client">
                  <Save className="w-4 h-4 mr-2" />
                  {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleStartEditing} data-testid="button-edit-client">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {canDeleteClient && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setShowDeleteDialog(true)}
                    data-testid="button-delete-client"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Menu */}
          <aside className="w-56 border-r border-border bg-card flex-shrink-0 overflow-y-auto">
            <div className="p-2 border-b">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={() => setShowSearchDialog(true)}
                data-testid="button-search-client"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Client
              </Button>
            </div>
            <nav className="p-2 space-y-1">
              {CLIENT_MENU_ITEMS.map((item) => {
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

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-5xl">
              {/* General Section */}
              {activeSection === "general" && (
                <div className="space-y-6">
                {/* Client Overview Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Client Overview
                    </CardTitle>
                    <CardDescription>Basic client identification information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-muted-foreground text-sm">Full Name</Label>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Input
                              value={editFormData.firstName || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                              placeholder="First Name"
                              data-testid="input-first-name"
                            />
                            <Input
                              value={editFormData.lastName || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                              placeholder="Last Name"
                              data-testid="input-last-name"
                            />
                          </div>
                        ) : (
                          <p className="font-medium text-lg" data-testid="text-client-full-name">
                            {client.firstName} {client.lastName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Date of Birth
                        </Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={toDateOnlyInputValue(editFormData.dateOfBirth)}
                            onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: parseDateOnlyInput(e.target.value) ?? undefined })}
                            data-testid="input-date-of-birth"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-client-dob">
                            {formatDateOnly(client.dateOfBirth, (d) => format(d, "MMM d, yyyy")) || "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Status</Label>
                        {isEditing ? (
                          <Select
                            value={editFormData.status || "active"}
                            onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                          >
                            <SelectTrigger data-testid="select-client-status">
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="discharged">Discharged</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge 
                            variant={client.status === "active" ? "default" : client.status === "pending" ? "secondary" : "destructive"}
                            data-testid="badge-client-status"
                          >
                            {client.status || "Active"}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Medicaid ID</Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.memberId || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, memberId: e.target.value })}
                            data-testid="input-member-id"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-medicaid-id">
                            {client.memberId || "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">HHAX ID</Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.hhaxAdmissionId || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, hhaxAdmissionId: e.target.value })}
                            data-testid="input-hhax-admission-id"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-client-hhax-id">
                            {client.hhaxAdmissionId || "N/A"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Service Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Service Information
                    </CardTitle>
                    <CardDescription>Service dates and care coordination</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Start Date</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editFormData.serviceStartDate ? new Date(editFormData.serviceStartDate).toISOString().split('T')[0] : ""}
                            onChange={(e) => setEditFormData({ ...editFormData, serviceStartDate: e.target.value ? new Date(e.target.value) : undefined })}
                            data-testid="input-service-start-date"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-service-start-date">
                            {client.serviceStartDate ? format(new Date(client.serviceStartDate), "MMM d, yyyy") : "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Last Service Date</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editFormData.lastServiceDate ? new Date(editFormData.lastServiceDate).toISOString().split('T')[0] : ""}
                            onChange={(e) => setEditFormData({ ...editFormData, lastServiceDate: e.target.value ? new Date(e.target.value) : undefined })}
                            data-testid="input-last-service-date"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-last-service-date">
                            {(client as any).lastServiceDate ? format(new Date((client as any).lastServiceDate), "MMM d, yyyy") : "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">MCO</Label>
                        {isEditing ? (
                          <Select
                            value={editFormData.mcoId || "__none__"}
                            onValueChange={(value) => setEditFormData({ ...editFormData, mcoId: value === "__none__" ? "" : value })}
                          >
                            <SelectTrigger data-testid="select-client-mco">
                              <SelectValue placeholder="Select MCO" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {allMcos.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="font-medium" data-testid="text-client-mco">
                            {mco?.name || "N/A"}
                          </p>
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
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Contact Information
                    </CardTitle>
                    <CardDescription>Home address and contact details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Home Address
                        </Label>
                        {isEditing ? (
                          <AddressInput
                            streetAddress={editFormData.address || ""}
                            streetAddress2={editFormData.address2 || ""}
                            city={editFormData.city || ""}
                            state={editFormData.state || ""}
                            zipCode={editFormData.zipCode || ""}
                            county={editFormData.county || ""}
                            onChange={(field, value) => setEditFormData({ ...editFormData, [field]: value })}
                          />
                        ) : (
                          <div data-testid="text-client-full-address">
                            <p className="font-medium">{client.address || "N/A"}</p>
                            {client.address2 && <p className="font-medium">{client.address2}</p>}
                            <p className="font-medium">
                              {[client.city, client.state, client.zipCode].filter(Boolean).join(", ") || ""}
                            </p>
                            {client.county && (
                              <p className="text-sm text-muted-foreground">{client.county} County</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Phone Number
                          </Label>
                          {isEditing ? (
                            <Input
                              value={editFormData.phone || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                              data-testid="input-phone"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-client-phone">
                              {client.phone || "N/A"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email
                          </Label>
                          {isEditing ? (
                            <Input
                              type="email"
                              value={editFormData.email || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                              data-testid="input-email"
                            />
                          ) : (
                            <p className="font-medium" data-testid="text-client-email">
                              {(client as any).email || "N/A"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contact Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Emergency Contact
                    </CardTitle>
                    <CardDescription>Primary emergency contact information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Contact Name</Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.emergencyContactName || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, emergencyContactName: e.target.value })}
                            data-testid="input-emergency-contact-name"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-emergency-contact-name">
                            {client.emergencyContactName || "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Contact Phone</Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.emergencyContactPhone || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, emergencyContactPhone: e.target.value })}
                            data-testid="input-emergency-contact-phone"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-emergency-contact-phone">
                            {client.emergencyContactPhone || "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Relationship</Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.emergencyContactRelation || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, emergencyContactRelation: e.target.value })}
                            data-testid="input-emergency-contact-relation"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-emergency-contact-relation">
                            {client.emergencyContactRelation || "N/A"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Office Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Office Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-sm">Office Location</Label>
                      {isEditing ? (
                        <Select
                          value={editFormData.officeId || ""}
                          onValueChange={(value) => setEditFormData({ ...editFormData, officeId: value })}
                        >
                          <SelectTrigger data-testid="select-client-office" className="w-full max-w-xs">
                            <SelectValue placeholder="Select office" />
                          </SelectTrigger>
                          <SelectContent>
                            {allOffices.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium" data-testid="text-client-office">
                          {office?.name || "N/A"}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Medical Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" /> Primary Diagnosis
                        </Label>
                        {isEditing ? (
                          <Textarea
                            value={editFormData.primaryDiagnosis || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, primaryDiagnosis: e.target.value })}
                            rows={2}
                            data-testid="input-diagnosis"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-diagnosis">
                            {client.primaryDiagnosis || "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Primary Physician</Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.primaryPhysician || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, primaryPhysician: e.target.value })}
                            data-testid="input-physician"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-physician">
                            {client.primaryPhysician || "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Allergies</Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.allergies || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
                            data-testid="input-allergies"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-allergies">
                            {client.allergies || "None reported"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <Pill className="w-3 h-3" /> Medications
                        </Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.medications || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, medications: e.target.value })}
                            data-testid="input-medications"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-medications">
                            {client.medications || "None reported"}
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
                      Assigned Caregivers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {caregivers.length === 0 ? (
                      <p className="text-muted-foreground">No caregivers assigned</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {caregivers.map((cg) => {
                          const name = [(cg as any).firstName, (cg as any).lastName].filter(Boolean).join(" ").trim();
                          const displayName = name || (cg.employeeId ? `Employee #${cg.employeeId}` : `Caregiver ${cg.id.slice(0, 8)}`);
                          return (
                            <Badge key={cg.id} variant="secondary" data-testid={`badge-caregiver-${cg.id}`}>
                              {displayName}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Communications
                    </CardTitle>
                    <CardDescription>Notes and communications between office and client</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                      <div className="flex gap-4 mb-3">
                        <Select value={messageType} onValueChange={setMessageType}>
                          <SelectTrigger className="w-[150px]" data-testid="select-communication-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="call">Phone Call</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="visit">Visit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea 
                        placeholder="Add a note or communication..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="mb-3"
                        data-testid="input-communication-message"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || createCommunicationMutation.isPending}
                        data-testid="button-send-communication"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Add Communication
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {communications.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No communications yet</p>
                      ) : (
                        communications.map((comm) => (
                          <div key={comm.id} className="p-3 border rounded-lg" data-testid={`communication-${comm.id}`}>
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">{comm.communicationType}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {comm.createdAt ? format(new Date(comm.createdAt), "MMM d, yyyy h:mm a") : ""}
                              </span>
                            </div>
                            <p className="text-sm">{comm.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
                </div>
              )}

              {/* MCOs/Insurance Section */}
              {activeSection === "mcos" && (
                <div className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        MCO Assignments
                      </CardTitle>
                      <CardDescription>Manage insurance and MCO enrollments for this client</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenMcoDialog()} data-testid="button-add-mco">
                      <Plus className="w-4 h-4 mr-2" />
                      Add MCO
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 border rounded-lg mb-6 bg-muted/50">
                      <Label className="text-muted-foreground text-sm">Member ID</Label>
                      <p className="font-medium text-lg">{client.memberId || "N/A"}</p>
                    </div>

                    {clientMcos.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No MCOs assigned to this client. Click "Add MCO" to add one.
                      </p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 text-sm font-medium">MCO</th>
                              <th className="text-left p-3 text-sm font-medium">Start Date</th>
                              <th className="text-left p-3 text-sm font-medium">Discharge Date</th>
                              <th className="text-left p-3 text-sm font-medium">Discharge Reason</th>
                              <th className="text-left p-3 text-sm font-medium">Status</th>
                              <th className="text-left p-3 text-sm font-medium">Primary</th>
                              <th className="text-left p-3 text-sm font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {clientMcos.map((clientMco) => {
                              const mcoInfo = allMcos.find(m => m.id === clientMco.mcoId);
                              return (
                                <tr key={clientMco.id} data-testid={`client-mco-${clientMco.id}`}>
                                  <td className="p-3 font-medium">{mcoInfo?.name || "Unknown MCO"}</td>
                                  <td className="p-3">
                                    {clientMco.startDate ? format(new Date(clientMco.startDate), "MMM d, yyyy") : "-"}
                                  </td>
                                  <td className="p-3">
                                    {clientMco.dischargeDate ? format(new Date(clientMco.dischargeDate), "MMM d, yyyy") : "-"}
                                  </td>
                                  <td className="p-3">{clientMco.dischargeReason || "-"}</td>
                                  <td className="p-3">
                                    <Badge variant={clientMco.status === "active" ? "default" : "secondary"}>
                                      {clientMco.status || "active"}
                                    </Badge>
                                  </td>
                                  <td className="p-3">
                                    {clientMco.isPrimary && (
                                      <Badge variant="outline" className="bg-primary/10">Primary</Badge>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenMcoDialog(clientMco)}
                                        data-testid={`button-edit-mco-${clientMco.id}`}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          if (confirm("Are you sure you want to remove this MCO?")) {
                                            deleteClientMcoMutation.mutate(clientMco.id);
                                          }
                                        }}
                                        data-testid={`button-delete-mco-${clientMco.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Billing Rates
                    </CardTitle>
                    <CardDescription>MCO billing rates for {office?.name || "this office"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {billingRates.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No billing rates configured for this MCO at this office
                      </p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 text-sm font-medium">Service Code</th>
                              <th className="text-left p-3 text-sm font-medium">Service Name</th>
                              <th className="text-left p-3 text-sm font-medium">Rate</th>
                              <th className="text-left p-3 text-sm font-medium">Type</th>
                              <th className="text-left p-3 text-sm font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {billingRates.map((rate) => (
                              <tr key={rate.id} data-testid={`billing-rate-${rate.id}`}>
                                <td className="p-3 font-mono">{rate.serviceCode}</td>
                                <td className="p-3">{rate.serviceName || "-"}</td>
                                <td className="p-3 font-medium">${rate.rate}</td>
                                <td className="p-3 capitalize">{rate.rateType}</td>
                                <td className="p-3">
                                  <Badge variant={rate.isActive ? "default" : "secondary"}>
                                    {rate.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>
              )}

              {/* Calendar Section */}
              {activeSection === "calendar" && (
                <div className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" />
                        Monthly Schedule
                      </CardTitle>
                      <CardDescription>View and manage client schedules</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => rolloverMutation.mutate()}
                        disabled={rolloverMutation.isPending}
                        data-testid="button-rollover-schedule"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Roll Over 30 Days
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowMasterWeekEditor(true)}
                        data-testid="button-edit-master-week"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Master Week
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        data-testid="button-prev-month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <h3 className="text-lg font-medium">
                        {format(currentMonth, "MMMM yyyy")}
                      </h3>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        data-testid="button-next-month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">
                      Drag and drop schedules to move them to different dates
                    </p>
                    <DndContext
                      sensors={sensors}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="grid grid-cols-7 gap-1">
                        {DAY_NAMES.map((day) => (
                          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                            {day}
                          </div>
                        ))}
                        
                        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                          <div key={`empty-${i}`} className="p-2 min-h-[80px]" />
                        ))}

                        {daysInMonth.map((day) => {
                          const daySchedules = getSchedulesForDay(day);
                          const dateStr = format(day, "yyyy-MM-dd");
                          return (
                            <DroppableDay
                              key={day.toISOString()}
                              dateStr={dateStr}
                              isToday={isToday(day)}
                              isSameMonth={isSameMonth(day, currentMonth)}
                              dayNumber={format(day, "d")}
                            >
                              <div className="space-y-1">
                                {daySchedules.slice(0, 2).map((schedule) => {
                                  const caregiverName = getCaregiverName(schedule.caregiverId);
                                  return (
                                    <DraggableScheduleItem
                                      key={schedule.id}
                                      schedule={schedule}
                                      caregiverName={caregiverName}
                                    />
                                  );
                                })}
                                {daySchedules.length > 2 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{daySchedules.length - 2} more
                                  </div>
                                )}
                              </div>
                            </DroppableDay>
                          );
                        })}
                      </div>
                      
                      <DragOverlay>
                        {activeSchedule ? (
                          <div className="text-xs p-1 bg-primary/40 rounded truncate shadow-lg border-2 border-primary">
                            <div>{activeSchedule.startTime}</div>
                            {getCaregiverName(activeSchedule.caregiverId) && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                {getCaregiverName(activeSchedule.caregiverId)}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </CardContent>
                </Card>

                {showMasterWeekEditor && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          Master Week Template
                        </CardTitle>
                        <CardDescription>Define the recurring weekly schedule</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMasterWeekEditor(false)}
                      >
                        Close
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {masterWeekTemplates.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">No master week template defined</p>
                          <Button
                            onClick={() => createMasterWeekMutation.mutate({ name: "Default Schedule" })}
                            disabled={createMasterWeekMutation.isPending}
                            data-testid="button-create-master-week"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Master Week Template
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="grid grid-cols-7 gap-2">
                            {DAY_NAMES.map((day, index) => (
                              <div key={day} className="border rounded-lg p-3">
                                <h4 className="font-medium text-center mb-2">{day}</h4>
                                <div className="text-center text-xs text-muted-foreground">
                                  Day {index}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-4 text-center">
                            Template: {masterWeekTemplates[0]?.name}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                </div>
              )}

              {/* Master Week Section */}
              {activeSection === "master-week" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarDays className="w-5 h-5" />
                          Master Week Templates
                        </CardTitle>
                        <CardDescription>Define recurring weekly schedules for this client</CardDescription>
                      </div>
                      <Button
                        onClick={() => {
                          setEditingTemplate(null);
                          setShowMasterWeekModal(true);
                        }}
                        data-testid="button-create-master-week"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Template
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {masterWeekTemplates.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No master week templates defined. Click "New Template" to get started.</p>
                      ) : (
                        <div className="space-y-4">
                          {masterWeekTemplates.map((template) => (
                            <div key={template.id} className="p-4 border rounded-lg bg-muted/30" data-testid={`template-card-${template.id}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{template.name}</h4>
                                    <Badge variant={template.isActive ? "default" : "secondary"}>
                                      {template.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{template.description || "Weekly schedule template"}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    {template.startDate && (
                                      <span>From: {format(new Date(template.startDate), "MMM d, yyyy")}</span>
                                    )}
                                    {template.endDate && (
                                      <span>To: {format(new Date(template.endDate), "MMM d, yyyy")}</span>
                                    )}
                                    {template.recurrenceWeeks && (
                                      <span>Every {template.recurrenceWeeks} week(s)</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingTemplate(template);
                                      setShowMasterWeekModal(true);
                                    }}
                                    data-testid={`button-edit-template-${template.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTemplateForApply(template);
                                      setShowApplyDialog(true);
                                    }}
                                    data-testid={`button-apply-template-${template.id}`}
                                  >
                                    <Calendar className="w-4 h-4 mr-1" />
                                    Apply
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Apply to Calendar Dialog */}
              <Dialog open={showApplyDialog} onOpenChange={(open) => {
                setShowApplyDialog(open);
                if (!open) setSelectedTemplateForApply(null);
              }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Apply Master Week to Calendar</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {selectedTemplateForApply && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium">Template: {selectedTemplateForApply.name}</p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Select the date range for which you want to generate schedules. 
                      This will create calendar entries for each day based on the master week template.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Date</Label>
                        <Input
                          type="date"
                          value={applyFromDate}
                          onChange={(e) => setApplyFromDate(e.target.value)}
                          data-testid="input-apply-from-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>To Date</Label>
                        <Input
                          type="date"
                          value={applyToDate}
                          onChange={(e) => setApplyToDate(e.target.value)}
                          data-testid="input-apply-to-date"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedTemplateForApply?.id) {
                          applyToCalendarMutation.mutate({
                            templateId: selectedTemplateForApply.id,
                            fromDate: applyFromDate,
                            toDate: applyToDate,
                          });
                        }
                      }}
                      disabled={applyToCalendarMutation.isPending || !selectedTemplateForApply || !applyFromDate || !applyToDate || applyFromDate > applyToDate}
                      data-testid="button-confirm-apply"
                    >
                      {applyToCalendarMutation.isPending ? "Applying..." : "Apply to Calendar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Visits Section */}
              {activeSection === "visits" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Visits
                      </CardTitle>
                      <CardDescription>View and manage client visits</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-8">Visits tracking coming soon</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* POC Section */}
              {activeSection === "poc" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Plan of Care (POC)
                      </CardTitle>
                      <CardDescription>Manage client's plan of care documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-medium mb-3">Upload New Document</h4>
                        <div className="flex flex-wrap gap-4 items-end">
                          <div className="flex-1 min-w-[200px]">
                            <Label>Document Category</Label>
                            <Select value={uploadCategory} onValueChange={setUploadCategory}>
                              <SelectTrigger data-testid="select-document-category">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_CATEGORIES.map(cat => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <Label>Select File</Label>
                            <Input 
                              type="file" 
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              data-testid="input-document-file"
                            />
                          </div>
                          <Button 
                            onClick={handleFileUpload} 
                            disabled={!selectedFile || uploadMutation.isPending}
                            data-testid="button-upload-document"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadMutation.isPending ? "Uploading..." : "Upload"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowTemplateDialog(true)}
                            data-testid="button-generate-from-template"
                          >
                            <FileSignature className="w-4 h-4 mr-2" />
                            Generate From Template
                          </Button>
                        </div>
                      </div>

                      <Tabs defaultValue="all" className="w-full">
                        <TabsList className="flex-wrap h-auto">
                          <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
                          {DOCUMENT_CATEGORIES.filter(cat => groupedDocuments[cat.value]?.length > 0).map(cat => (
                            <TabsTrigger key={cat.value} value={cat.value}>
                              {cat.label} ({groupedDocuments[cat.value]?.length || 0})
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        
                        <TabsContent value="all" className="mt-4">
                          {documents.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No documents uploaded yet</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {documents.map(doc => (
                                <DocumentCard 
                                  key={doc.id} 
                                  document={doc} 
                                  onDelete={() => deleteMutation.mutate(doc.id)} 
                                  onEmail={() => setEmailDocTarget(doc)}
                                />
                              ))}
                            </div>
                          )}
                        </TabsContent>
                        
                        {DOCUMENT_CATEGORIES.map(cat => (
                          <TabsContent key={cat.value} value={cat.value} className="mt-4">
                            {(groupedDocuments[cat.value]?.length || 0) === 0 ? (
                              <p className="text-muted-foreground text-center py-8">No {cat.label.toLowerCase()} documents</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedDocuments[cat.value]?.map(doc => (
                                  <DocumentCard 
                                    key={doc.id} 
                                    document={doc} 
                                    onDelete={() => deleteMutation.mutate(doc.id)} 
                                    onEmail={() => setEmailDocTarget(doc)}
                                  />
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        ))}
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Spend Down Section */}
              {activeSection === "spend-down" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5" />
                        Spend Down
                      </CardTitle>
                      <CardDescription>Track client spend down information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-8">Spend down tracking coming soon</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Referral Member Info Section */}
              {activeSection === "referral" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Referral Member Info
                      </CardTitle>
                      <CardDescription>Manage referral and member information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-8">Referral member information coming soon</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Profile Section */}
              {activeSection === "profile" && (
                <div className="space-y-6">
                  {/* Personal Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Personal Information
                      </CardTitle>
                      <CardDescription>Full client identity and contact details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">First Name</Label>
                          {isEditing ? (
                            <Input value={editFormData.firstName || ""} onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })} />
                          ) : (
                            <p className="font-medium">{client?.firstName || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Last Name</Label>
                          {isEditing ? (
                            <Input value={editFormData.lastName || ""} onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })} />
                          ) : (
                            <p className="font-medium">{client?.lastName || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Date of Birth</Label>
                          {isEditing ? (
                            <Input type="date" value={toDateOnlyInputValue(editFormData.dateOfBirth)} onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: parseDateOnlyInput(e.target.value) ?? undefined })} />
                          ) : (
                            <p className="font-medium">{formatDateOnly(client?.dateOfBirth, (d) => format(d, "MMM d, yyyy")) || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number</Label>
                          {isEditing ? (
                            <Input value={editFormData.phone || ""} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} placeholder="(555) 000-0000" />
                          ) : (
                            <p className="font-medium">{client?.phone || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
                          {isEditing ? (
                            <Input type="email" value={editFormData.email || ""} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
                          ) : (
                            <p className="font-medium">{(client as any)?.email || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Status</Label>
                          {isEditing ? (
                            <Select value={editFormData.status || "active"} onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="discharged">Discharged</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={client?.status === "active" ? "default" : client?.status === "discharged" ? "destructive" : "secondary"}>
                              {client?.status ? client.status.charAt(0).toUpperCase() + client.status.slice(1) : "N/A"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1"><MapPin className="w-3 h-3" /> Home Address</Label>
                        {isEditing ? (
                          <AddressInput
                            streetAddress={editFormData.address || ""}
                            streetAddress2={editFormData.address2 || ""}
                            city={editFormData.city || ""}
                            state={editFormData.state || ""}
                            zipCode={editFormData.zipCode || ""}
                            county={editFormData.county || ""}
                            onChange={(field, value) => setEditFormData({ ...editFormData, [field]: value })}
                          />
                        ) : (
                          <div>
                            <p className="font-medium">{client?.address || "N/A"}</p>
                            {client?.address2 && <p className="font-medium">{client.address2}</p>}
                            <p className="font-medium text-muted-foreground">{[client?.city, client?.state, client?.zipCode].filter(Boolean).join(", ")}</p>
                            {client?.county && (
                              <p className="text-sm text-muted-foreground">{client.county} County</p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* ID & Service Dates */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        IDs & Service Dates
                      </CardTitle>
                      <CardDescription>Identifiers and care service timeline</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Member ID</Label>
                          {isEditing ? (
                            <Input value={editFormData.memberId || ""} onChange={(e) => setEditFormData({ ...editFormData, memberId: e.target.value })} />
                          ) : (
                            <p className="font-medium">{client?.memberId || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">HHAX Admission ID</Label>
                          {isEditing ? (
                            <Input value={editFormData.hhaxAdmissionId || ""} onChange={(e) => setEditFormData({ ...editFormData, hhaxAdmissionId: e.target.value })} />
                          ) : (
                            <p className="font-medium">{client?.hhaxAdmissionId || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Service Start Date</Label>
                          {isEditing ? (
                            <Input type="date" value={editFormData.serviceStartDate ? new Date(editFormData.serviceStartDate).toISOString().split('T')[0] : ""} onChange={(e) => setEditFormData({ ...editFormData, serviceStartDate: e.target.value ? new Date(e.target.value) : undefined })} />
                          ) : (
                            <p className="font-medium">{client?.serviceStartDate ? format(new Date(client.serviceStartDate), "MMM d, yyyy") : "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Last Service Date</Label>
                          {isEditing ? (
                            <Input type="date" value={editFormData.lastServiceDate ? new Date(editFormData.lastServiceDate).toISOString().split('T')[0] : ""} onChange={(e) => setEditFormData({ ...editFormData, lastServiceDate: e.target.value ? new Date(e.target.value) : undefined })} />
                          ) : (
                            <p className="font-medium">{(client as any)?.lastServiceDate ? format(new Date((client as any).lastServiceDate), "MMM d, yyyy") : "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">MCO / Insurance</Label>
                          {isEditing ? (
                            <Select value={editFormData.mcoId || "__none__"} onValueChange={(v) => setEditFormData({ ...editFormData, mcoId: v === "__none__" ? "" : v })}>
                              <SelectTrigger><SelectValue placeholder="Select MCO" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {allMcos.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="font-medium">{mco?.name || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Coordinator</Label>
                          {isEditing ? (
                            <Select value={editFormData.coordinatorId || "__none__"} onValueChange={(v) => setEditFormData({ ...editFormData, coordinatorId: v === "__none__" ? null : v })}>
                              <SelectTrigger><SelectValue placeholder="Select Coordinator" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {allCoordinators.filter(c => c.isActive).map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="font-medium">{coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : "N/A"}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Medical Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500" />
                        Medical Information
                      </CardTitle>
                      <CardDescription>Diagnosis, allergies, medications, and physician</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Primary Diagnosis</Label>
                          {isEditing ? (
                            <Textarea rows={3} value={editFormData.primaryDiagnosis || ""} onChange={(e) => setEditFormData({ ...editFormData, primaryDiagnosis: e.target.value })} placeholder="Enter primary diagnosis" />
                          ) : (
                            <p className="font-medium whitespace-pre-line">{client?.primaryDiagnosis || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Primary Physician</Label>
                          {isEditing ? (
                            <Input value={editFormData.primaryPhysician || ""} onChange={(e) => setEditFormData({ ...editFormData, primaryPhysician: e.target.value })} placeholder="Dr. Name" />
                          ) : (
                            <p className="font-medium">{client?.primaryPhysician || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Allergies</Label>
                          {isEditing ? (
                            <Textarea rows={3} value={editFormData.allergies || ""} onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })} placeholder="List known allergies" />
                          ) : (
                            <p className="font-medium whitespace-pre-line">{client?.allergies || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Current Medications</Label>
                          {isEditing ? (
                            <Textarea rows={3} value={editFormData.medications || ""} onChange={(e) => setEditFormData({ ...editFormData, medications: e.target.value })} placeholder="List current medications" />
                          ) : (
                            <p className="font-medium whitespace-pre-line">{client?.medications || "N/A"}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Emergency Contact */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-orange-500" />
                        Emergency Contact
                      </CardTitle>
                      <CardDescription>Who to contact in an emergency</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Contact Name</Label>
                          {isEditing ? (
                            <Input value={editFormData.emergencyContactName || ""} onChange={(e) => setEditFormData({ ...editFormData, emergencyContactName: e.target.value })} placeholder="Full name" />
                          ) : (
                            <p className="font-medium">{client?.emergencyContactName || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Relationship</Label>
                          {isEditing ? (
                            <Input value={editFormData.emergencyContactRelation || ""} onChange={(e) => setEditFormData({ ...editFormData, emergencyContactRelation: e.target.value })} placeholder="e.g. Daughter, Son" />
                          ) : (
                            <p className="font-medium">{client?.emergencyContactRelation || "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Contact Phone</Label>
                          {isEditing ? (
                            <Input value={editFormData.emergencyContactPhone || ""} onChange={(e) => setEditFormData({ ...editFormData, emergencyContactPhone: e.target.value })} placeholder="(555) 000-0000" />
                          ) : (
                            <p className="font-medium">{client?.emergencyContactPhone || "N/A"}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {isEditing && (
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={handleCancelEditing}>Cancel</Button>
                      <Button onClick={handleSaveEdits} disabled={updateClientMutation.isPending}>
                        {updateClientMutation.isPending ? "Saving..." : "Save Profile"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Eligibility Check Section */}
              {activeSection === "eligibility" && (
                <div className="space-y-6">
                  {/* SNAP and Medicaid Tracking Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* SNAP Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Wallet className="w-5 h-5 text-green-600" />
                          SNAP Benefits
                        </CardTitle>
                        <CardDescription>Supplemental Nutrition Assistance Program</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-muted-foreground">Status</Label>
                          {isEditing ? (
                            <Select
                              value={editFormData.snapStatus || "unknown"}
                              onValueChange={(value) => setEditFormData({ ...editFormData, snapStatus: value })}
                            >
                              <SelectTrigger className="w-40" data-testid="select-snap-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge 
                              variant={client?.snapStatus === "active" ? "default" : client?.snapStatus === "expired" ? "destructive" : "secondary"}
                              data-testid="badge-snap-status"
                            >
                              {client?.snapStatus === "active" ? "Active" : 
                               client?.snapStatus === "pending" ? "Pending" : 
                               client?.snapStatus === "expired" ? "Expired" : 
                               client?.snapStatus === "not_enrolled" ? "Not Enrolled" : "Unknown"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-muted-foreground">Renewal Date</Label>
                          {isEditing ? (
                            <Input
                              type="date"
                              className="w-40"
                              value={editFormData.snapRenewalDate ? format(new Date(editFormData.snapRenewalDate), "yyyy-MM-dd") : ""}
                              onChange={(e) => setEditFormData({ ...editFormData, snapRenewalDate: e.target.value ? new Date(e.target.value) : undefined })}
                              data-testid="input-snap-renewal-date"
                            />
                          ) : (
                            <span className="font-medium" data-testid="text-snap-renewal-date">
                              {client?.snapRenewalDate ? format(new Date(client.snapRenewalDate), "MMM d, yyyy") : "Not set"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-muted-foreground">Expiry Date</Label>
                          {isEditing ? (
                            <Input
                              type="date"
                              className="w-40"
                              value={editFormData.snapExpiryDate ? format(new Date(editFormData.snapExpiryDate), "yyyy-MM-dd") : ""}
                              onChange={(e) => setEditFormData({ ...editFormData, snapExpiryDate: e.target.value ? new Date(e.target.value) : undefined })}
                              data-testid="input-snap-expiry-date"
                            />
                          ) : (
                            <span className={`font-medium ${client?.snapExpiryDate && new Date(client.snapExpiryDate) < new Date() ? "text-destructive" : ""}`} data-testid="text-snap-expiry-date">
                              {client?.snapExpiryDate ? format(new Date(client.snapExpiryDate), "MMM d, yyyy") : "Not set"}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Notes</Label>
                          {isEditing ? (
                            <Textarea
                              value={editFormData.snapNotes || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, snapNotes: e.target.value })}
                              placeholder="Add SNAP-related notes..."
                              rows={2}
                              data-testid="input-snap-notes"
                            />
                          ) : (
                            <p className="text-sm" data-testid="text-snap-notes">{client?.snapNotes || "No notes"}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Medicaid Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Shield className="w-5 h-5 text-blue-600" />
                          Medicaid
                        </CardTitle>
                        <CardDescription>Medical Assistance Program</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-muted-foreground">Status</Label>
                          {isEditing ? (
                            <Select
                              value={editFormData.medicaidStatus || "unknown"}
                              onValueChange={(value) => setEditFormData({ ...editFormData, medicaidStatus: value })}
                            >
                              <SelectTrigger className="w-40" data-testid="select-medicaid-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge 
                              variant={client?.medicaidStatus === "active" ? "default" : client?.medicaidStatus === "expired" ? "destructive" : "secondary"}
                              data-testid="badge-medicaid-status"
                            >
                              {client?.medicaidStatus === "active" ? "Active" : 
                               client?.medicaidStatus === "pending" ? "Pending" : 
                               client?.medicaidStatus === "expired" ? "Expired" : 
                               client?.medicaidStatus === "not_enrolled" ? "Not Enrolled" : "Unknown"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-muted-foreground">Renewal Date</Label>
                          {isEditing ? (
                            <Input
                              type="date"
                              className="w-40"
                              value={editFormData.medicaidRenewalDate ? format(new Date(editFormData.medicaidRenewalDate), "yyyy-MM-dd") : ""}
                              onChange={(e) => setEditFormData({ ...editFormData, medicaidRenewalDate: e.target.value ? new Date(e.target.value) : undefined })}
                              data-testid="input-medicaid-renewal-date"
                            />
                          ) : (
                            <span className="font-medium" data-testid="text-medicaid-renewal-date">
                              {client?.medicaidRenewalDate ? format(new Date(client.medicaidRenewalDate), "MMM d, yyyy") : "Not set"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-muted-foreground">Expiry Date</Label>
                          {isEditing ? (
                            <Input
                              type="date"
                              className="w-40"
                              value={editFormData.medicaidExpiryDate ? format(new Date(editFormData.medicaidExpiryDate), "yyyy-MM-dd") : ""}
                              onChange={(e) => setEditFormData({ ...editFormData, medicaidExpiryDate: e.target.value ? new Date(e.target.value) : undefined })}
                              data-testid="input-medicaid-expiry-date"
                            />
                          ) : (
                            <span className={`font-medium ${client?.medicaidExpiryDate && new Date(client.medicaidExpiryDate) < new Date() ? "text-destructive" : ""}`} data-testid="text-medicaid-expiry-date">
                              {client?.medicaidExpiryDate ? format(new Date(client.medicaidExpiryDate), "MMM d, yyyy") : "Not set"}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Notes</Label>
                          {isEditing ? (
                            <Textarea
                              value={editFormData.medicaidNotes || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, medicaidNotes: e.target.value })}
                              placeholder="Add Medicaid-related notes..."
                              rows={2}
                              data-testid="input-medicaid-notes"
                            />
                          ) : (
                            <p className="text-sm" data-testid="text-medicaid-notes">{client?.medicaidNotes || "No notes"}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Eligibility Verification Card */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          Eligibility Verification
                        </CardTitle>
                        <CardDescription>Check and track client eligibility via PA DHS PROMISe portal</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={openPromisePortal}
                          data-testid="button-open-promise-portal"
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          Open PROMISe Portal
                          <ExternalLink className="w-3 h-3 ml-2" />
                        </Button>
                        <Button onClick={() => handleOpenEligibilityDialog()} data-testid="button-add-eligibility-check">
                          <Plus className="w-4 h-4 mr-2" />
                          Record Check
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100">PA DHS PROMISe Portal</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              Click "Open PROMISe Portal" to verify eligibility on the official PA DHS system. 
                              After verification, click "Record Check" to save the results here.
                            </p>
                            <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                              <strong>Member ID:</strong> {client?.memberId || "Not set"} | 
                              <strong className="ml-2">MCO:</strong> {mco?.name || "Not assigned"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {eligibilityChecks.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No eligibility checks recorded. Use the PROMISe portal to verify eligibility, then record the results here.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left p-3 text-sm font-medium">Check Date</th>
                                <th className="text-left p-3 text-sm font-medium">MCO</th>
                                <th className="text-left p-3 text-sm font-medium">Status</th>
                                <th className="text-left p-3 text-sm font-medium">Eligibility</th>
                                <th className="text-left p-3 text-sm font-medium">Coverage</th>
                                <th className="text-left p-3 text-sm font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {eligibilityChecks.map((check) => {
                                const checkMco = allMcos.find(m => m.id === check.mcoId);
                                return (
                                  <tr key={check.id} data-testid={`eligibility-check-${check.id}`}>
                                    <td className="p-3">{check.checkDate ? format(new Date(check.checkDate), "MM/dd/yyyy") : "-"}</td>
                                    <td className="p-3">{checkMco?.name || "N/A"}</td>
                                    <td className="p-3">
                                      <Badge variant={check.status === "active" ? "default" : check.status === "error" || check.status === "not_found" ? "destructive" : "secondary"}>
                                        {check.status || "pending"}
                                      </Badge>
                                    </td>
                                    <td className="p-3">
                                      <Badge variant={check.eligibilityStatus === "eligible" ? "default" : check.eligibilityStatus === "ineligible" ? "destructive" : "outline"}>
                                        {check.eligibilityStatus || "Unknown"}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-sm">
                                      {check.coverageStartDate && check.coverageEndDate ? (
                                        <>{format(new Date(check.coverageStartDate), "MM/dd/yy")} - {format(new Date(check.coverageEndDate), "MM/dd/yy")}</>
                                      ) : "-"}
                                    </td>
                                    <td className="p-3">
                                      <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenEligibilityDialog(check)} data-testid={`button-edit-eligibility-${check.id}`}>
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => {
                                            if (confirm("Delete this eligibility check?")) {
                                              deleteEligibilityCheckMutation.mutate(check.id);
                                            }
                                          }}
                                          data-testid={`button-delete-eligibility-${check.id}`}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Auth/Orders Section */}
              {activeSection === "auth-orders" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Authorizations & Orders
                      </CardTitle>
                      <CardDescription>Manage client authorizations and orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-8">Authorizations and orders management coming soon</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Special Requests Section */}
              {activeSection === "special-requests" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Special Requests
                      </CardTitle>
                      <CardDescription>Manage special requests for this client</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-8">Special requests management coming soon</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Caregiver History Section */}
              {activeSection === "caregiver-history" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5" />
                            Caregiver History
                          </CardTitle>
                          <CardDescription>View history of caregivers assigned to this client</CardDescription>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => setShowAssignCaregiverDialog(true)}
                          data-testid="button-assign-caregiver"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Assign Caregiver
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {caregivers.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No caregivers assigned yet</p>
                      ) : (
                        <div className="space-y-3">
                          {caregivers.map((cg) => (
                            <div key={cg.id} className="p-3 border rounded-lg flex items-center justify-between">
                              <div>
                                <p className="font-medium">{(cg as any).firstName} {(cg as any).lastName}</p>
                                <p className="text-sm text-muted-foreground">Employee ID: {cg.employeeId || "N/A"}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={cg.isActive ? "default" : "secondary"}>
                                  {cg.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => unassignCaregiverMutation.mutate(cg.id)}
                                  disabled={unassignCaregiverMutation.isPending}
                                  data-testid={`button-unassign-caregiver-${cg.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
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

              {/* Emergency Plan Section */}
              {activeSection === "emergency-plan" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-orange-500" />
                        Emergency Preparedness Plan
                      </CardTitle>
                      <CardDescription>Client-specific emergency plan for DOH compliance. This information is required for all active clients.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Emergency Contacts */}
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Emergency Contacts</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(["primaryEmergencyContact", "secondaryEmergencyContact"] as const).map((key, idx) => (
                            <div key={key} className="border rounded-lg p-4 space-y-3">
                              <p className="text-sm font-medium">{idx === 0 ? "Primary" : "Secondary"} Contact</p>
                              {(["name", "relationship", "phone", "altPhone"] as const).map(field => (
                                <div key={field}>
                                  <Label className="text-xs capitalize">{field === "altPhone" ? "Alt Phone" : field.charAt(0).toUpperCase() + field.slice(1)}</Label>
                                  <Input
                                    value={emergencyPlan[key]?.[field] || ""}
                                    onChange={e => setEmergencyPlan((p: any) => ({ ...p, [key]: { ...p[key], [field]: e.target.value } }))}
                                    placeholder={field === "name" ? "Full name" : field === "relationship" ? "Daughter, son, spouse..." : "Phone number"}
                                    className="h-8 text-sm mt-1"
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Medical & Equipment Flags */}
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Medical & Equipment Flags</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {([
                            { key: "doNotResuscitate", label: "DNR on File", desc: "Do Not Resuscitate" },
                            { key: "powerDependentEquipment", label: "Power-Dependent Equipment", desc: "Requires electricity" },
                            { key: "mobilityAssistance", label: "Mobility Assistance", desc: "Needs help moving" },
                            { key: "utilityCompanyNotified", label: "Utility Co. Notified", desc: "Notified of medical need" },
                          ] as { key: string; label: string; desc: string }[]).map(flag => (
                            <div key={flag.key} className="border rounded-lg p-3 flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-medium leading-tight">{flag.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{flag.desc}</p>
                              </div>
                              <Switch
                                checked={emergencyPlan[flag.key] ?? false}
                                onCheckedChange={v => setEmergencyPlan((p: any) => ({ ...p, [flag.key]: v }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Evacuation & Shelter */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Evacuation Route</Label>
                          <Textarea
                            value={emergencyPlan.evacuationRoute}
                            onChange={e => setEmergencyPlan((p: any) => ({ ...p, evacuationRoute: e.target.value }))}
                            placeholder="Primary evacuation route and instructions..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Shelter-in-Place Instructions</Label>
                          <Textarea
                            value={emergencyPlan.shelterInPlaceInstructions}
                            onChange={e => setEmergencyPlan((p: any) => ({ ...p, shelterInPlaceInstructions: e.target.value }))}
                            placeholder="Instructions if evacuation is not possible..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Medical Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Medical Conditions</Label>
                          <Textarea
                            value={emergencyPlan.medicalConditions}
                            onChange={e => setEmergencyPlan((p: any) => ({ ...p, medicalConditions: e.target.value }))}
                            placeholder="Chronic conditions, allergies, diagnoses..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Current Medications</Label>
                          <Textarea
                            value={emergencyPlan.medications}
                            onChange={e => setEmergencyPlan((p: any) => ({ ...p, medications: e.target.value }))}
                            placeholder="List of medications and dosages..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Special Equipment</Label>
                          <Input
                            value={emergencyPlan.specialEquipment}
                            onChange={e => setEmergencyPlan((p: any) => ({ ...p, specialEquipment: e.target.value }))}
                            placeholder="Wheelchair, oxygen, ventilator..."
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Preferred Hospital</Label>
                          <Input
                            value={emergencyPlan.preferredHospital}
                            onChange={e => setEmergencyPlan((p: any) => ({ ...p, preferredHospital: e.target.value }))}
                            placeholder="Hospital name"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Review Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Last Reviewed Date</Label>
                          <Input
                            type="date"
                            value={emergencyPlan.lastReviewedAt}
                            onChange={e => setEmergencyPlan((p: any) => ({ ...p, lastReviewedAt: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Next Review Due</Label>
                          <Input
                            type="date"
                            value={emergencyPlan.nextReviewDue}
                            onChange={e => setEmergencyPlan((p: any) => ({ ...p, nextReviewDue: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => saveEmergencyPlanMutation.mutate(client?.officeId || "")}
                          disabled={saveEmergencyPlanMutation.isPending || !client?.officeId}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {saveEmergencyPlanMutation.isPending ? "Saving..." : "Save Emergency Plan"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "notices" && clientId && (
                <div className="space-y-6">
                  <ClientNoticesSection clientId={clientId} />
                </div>
              )}

              {/* Others Section */}
              {activeSection === "others" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MoreHorizontal className="w-5 h-5" />
                        Other Information
                      </CardTitle>
                      <CardDescription>Additional client information and notes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-8">Additional features coming soon</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Dialog open={showMcoDialog} onOpenChange={(open) => {
        setShowMcoDialog(open);
        if (!open) {
          setEditingMco(null);
          resetMcoForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {editingMco ? "Edit MCO" : "Add MCO"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>MCO *</Label>
              <Select
                value={mcoFormData.mcoId}
                onValueChange={(value) => setMcoFormData({ ...mcoFormData, mcoId: value })}
              >
                <SelectTrigger data-testid="select-mco">
                  <SelectValue placeholder="Select MCO" />
                </SelectTrigger>
                <SelectContent>
                  {allMcos.length > 0 ? (
                    allMcos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      No MCOs found. Please add MCOs under Office Settings.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={mcoFormData.startDate}
                  onChange={(e) => setMcoFormData({ ...mcoFormData, startDate: e.target.value })}
                  data-testid="input-mco-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Discharge Date</Label>
                <Input
                  type="date"
                  value={mcoFormData.dischargeDate}
                  onChange={(e) => setMcoFormData({ ...mcoFormData, dischargeDate: e.target.value })}
                  data-testid="input-mco-discharge-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Discharge Reason</Label>
              <Select
                value={mcoFormData.dischargeReason}
                onValueChange={(value) => setMcoFormData({ ...mcoFormData, dischargeReason: value })}
              >
                <SelectTrigger data-testid="select-discharge-reason">
                  <SelectValue placeholder="Select reason (if discharged)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                  <SelectItem value="moved_out_of_area">Moved Out of Area</SelectItem>
                  <SelectItem value="transferred">Transferred to Another Agency</SelectItem>
                  <SelectItem value="lost_eligibility">Lost Eligibility</SelectItem>
                  <SelectItem value="voluntary">Voluntary Discharge</SelectItem>
                  <SelectItem value="hospitalized">Hospitalized</SelectItem>
                  <SelectItem value="nursing_facility">Nursing Facility Placement</SelectItem>
                  <SelectItem value="no_longer_needs_services">No Longer Needs Services</SelectItem>
                  <SelectItem value="non_compliance">Non-Compliance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Discharge Notes</Label>
              <Textarea
                value={mcoFormData.dischargeNotes}
                onChange={(e) => setMcoFormData({ ...mcoFormData, dischargeNotes: e.target.value })}
                placeholder="Additional notes about the discharge..."
                data-testid="input-discharge-notes"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={mcoFormData.status}
                  onValueChange={(value) => setMcoFormData({ ...mcoFormData, status: value })}
                >
                  <SelectTrigger data-testid="select-mco-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="discharged">Discharged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={mcoFormData.isPrimary}
                  onChange={(e) => setMcoFormData({ ...mcoFormData, isPrimary: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                  data-testid="checkbox-is-primary"
                />
                <Label htmlFor="isPrimary">Primary MCO</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMcoDialog(false);
                  setEditingMco(null);
                  resetMcoForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveMco}
                disabled={createClientMcoMutation.isPending || updateClientMcoMutation.isPending}
                data-testid="button-save-mco"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingMco ? "Update" : "Add"} MCO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEligibilityDialog} onOpenChange={(open) => {
        setShowEligibilityDialog(open);
        if (!open) {
          setEditingEligibility(null);
          resetEligibilityForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {editingEligibility ? "Edit Eligibility Check" : "Record Eligibility Check"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <Button variant="link" className="p-0 h-auto text-blue-600" onClick={openPromisePortal}>
                  Open PROMISe Portal <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check Date *</Label>
                <Input
                  type="date"
                  value={eligibilityFormData.checkDate}
                  onChange={(e) => setEligibilityFormData({ ...eligibilityFormData, checkDate: e.target.value })}
                  data-testid="input-eligibility-check-date"
                />
              </div>
              <div className="space-y-2">
                <Label>MCO</Label>
                <Select
                  value={eligibilityFormData.mcoId}
                  onValueChange={(value) => setEligibilityFormData({ ...eligibilityFormData, mcoId: value })}
                >
                  <SelectTrigger data-testid="select-eligibility-mco">
                    <SelectValue placeholder="Select MCO" />
                  </SelectTrigger>
                  <SelectContent>
                    {officeMcos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Member ID</Label>
              <Input
                value={eligibilityFormData.memberId}
                onChange={(e) => setEligibilityFormData({ ...eligibilityFormData, memberId: e.target.value })}
                placeholder="Enter member ID used for verification"
                data-testid="input-eligibility-member-id"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Verification Status</Label>
                <Select
                  value={eligibilityFormData.status}
                  onValueChange={(value) => setEligibilityFormData({ ...eligibilityFormData, status: value })}
                >
                  <SelectTrigger data-testid="select-eligibility-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Eligibility Result</Label>
                <Select
                  value={eligibilityFormData.eligibilityStatus}
                  onValueChange={(value) => setEligibilityFormData({ ...eligibilityFormData, eligibilityStatus: value })}
                >
                  <SelectTrigger data-testid="select-eligibility-result">
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eligible">Eligible</SelectItem>
                    <SelectItem value="ineligible">Ineligible</SelectItem>
                    <SelectItem value="partial">Partial Coverage</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coverage Start Date</Label>
                <Input
                  type="date"
                  value={eligibilityFormData.coverageStartDate}
                  onChange={(e) => setEligibilityFormData({ ...eligibilityFormData, coverageStartDate: e.target.value })}
                  data-testid="input-coverage-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Coverage End Date</Label>
                <Input
                  type="date"
                  value={eligibilityFormData.coverageEndDate}
                  onChange={(e) => setEligibilityFormData({ ...eligibilityFormData, coverageEndDate: e.target.value })}
                  data-testid="input-coverage-end-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Verification Expiration</Label>
              <Input
                type="date"
                value={eligibilityFormData.expirationDate}
                onChange={(e) => setEligibilityFormData({ ...eligibilityFormData, expirationDate: e.target.value })}
                data-testid="input-eligibility-expiration"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={eligibilityFormData.notes}
                onChange={(e) => setEligibilityFormData({ ...eligibilityFormData, notes: e.target.value })}
                placeholder="Add any notes from the verification..."
                rows={3}
                data-testid="input-eligibility-notes"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEligibilityDialog(false);
                  setEditingEligibility(null);
                  resetEligibilityForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEligibility}
                disabled={createEligibilityCheckMutation.isPending || updateEligibilityCheckMutation.isPending}
                data-testid="button-save-eligibility"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingEligibility ? "Update" : "Save"} Check
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Client
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              placeholder="Search by name or Medicaid ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-client"
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {allClients
                .filter((cl) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  const name = `${cl.firstName || ""} ${cl.lastName || ""}`.toLowerCase();
                  const memberId = (cl.memberId || "").toLowerCase();
                  return name.includes(query) || memberId.includes(query);
                })
                .slice(0, 10)
                .map((cl) => (
                  <Link 
                    key={cl.id} 
                    href={`/clients/${cl.id}`}
                    onClick={() => {
                      setShowSearchDialog(false);
                      setSearchQuery("");
                    }}
                  >
                    <div 
                      className="flex items-center gap-3 p-3 rounded-md hover:bg-muted cursor-pointer border"
                      data-testid={`search-result-client-${cl.id}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{cl.firstName} {cl.lastName}</p>
                        <p className="text-sm text-muted-foreground">{cl.memberId || "No Member ID"}</p>
                      </div>
                      <Badge variant={cl.status === "active" ? "default" : "secondary"} className="flex-shrink-0">
                        {cl.status || "active"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              {allClients.filter((cl) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const name = `${cl.firstName || ""} ${cl.lastName || ""}`.toLowerCase();
                const memberId = (cl.memberId || "").toLowerCase();
                return name.includes(query) || memberId.includes(query);
              }).length === 0 && (
                <p className="text-muted-foreground text-center py-4">No clients found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showAssignCaregiverDialog} 
        onOpenChange={(open) => {
          setShowAssignCaregiverDialog(open);
          if (!open) {
            setSelectedCaregiverId("");
          }
        }}
        data-testid="dialog-assign-caregiver"
      >
        <DialogContent className="max-w-md" data-testid="dialog-assign-caregiver">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Assign Caregiver
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Select Caregiver *</Label>
              <Select
                value={selectedCaregiverId}
                onValueChange={setSelectedCaregiverId}
              >
                <SelectTrigger data-testid="select-caregiver">
                  <SelectValue placeholder="Select a caregiver" />
                </SelectTrigger>
                <SelectContent>
                  {allCaregivers
                    .filter((cg) => !caregivers.some((assigned) => assigned.id === cg.id))
                    .map((cg) => (
                      <SelectItem key={cg.id} value={cg.id}>
                        {(cg as any).firstName || ""} {(cg as any).lastName || ""} {cg.employeeId ? `(${cg.employeeId})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignCaregiverDialog(false);
                  setSelectedCaregiverId("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedCaregiverId) {
                    assignCaregiverMutation.mutate(selectedCaregiverId);
                  }
                }}
                disabled={!selectedCaregiverId || assignCaregiverMutation.isPending}
                data-testid="button-confirm-assign"
              >
                {assignCaregiverMutation.isPending ? "Assigning..." : "Assign Caregiver"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Document From Template</DialogTitle>
            <DialogDescription>
              Select a template to generate a document for this client.
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
                      setGenerateEmailRecipient(client?.email || "");
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
        defaultRecipient={client?.email || ""}
        open={!!emailDocTarget}
        onOpenChange={(open) => !open && setEmailDocTarget(null)}
      />

      {/* Master Week Template Modal */}
      {client && (
        <MasterWeekTemplateModal
          isOpen={showMasterWeekModal}
          onClose={() => {
            setShowMasterWeekModal(false);
            setEditingTemplate(null);
          }}
          client={client}
          template={editingTemplate}
          caregivers={allCaregivers}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {client?.firstName} {client?.lastName}? This action cannot be undone and will permanently remove all associated data including documents, schedules, and communications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClientMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClientMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DocumentCard({ document, onDelete, onEmail }: { document: Document; onDelete: () => void; onEmail?: () => void }) {
  const [showViewer, setShowViewer] = useState(false);
  const categoryLabel = DOCUMENT_CATEGORIES.find(c => c.value === document.documentType)?.label || document.documentType;
  const isPdf = document.fileName?.toLowerCase().endsWith('.pdf') || document.originalName?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(document.fileName || document.originalName || '');
  const fileUrl = `/uploads/${document.fileName}`;
  
  return (
    <>
      <div className="p-4 border rounded-lg" data-testid={`card-document-${document.id}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{document.originalName}</p>
            <p className="text-sm text-muted-foreground">{categoryLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {document.createdAt ? format(new Date(document.createdAt), "MMM d, yyyy") : ""}
            </p>
          </div>
          <div className="flex gap-1 ml-2">
            {(isPdf || isImage) && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setShowViewer(true)}
                data-testid={`button-view-${document.id}`}
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => window.open(fileUrl, '_blank')}
              data-testid={`button-download-${document.id}`}
            >
              <Download className="w-4 h-4" />
            </Button>
            {onEmail && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onEmail}
                title="Email this document as an attachment"
                data-testid={`button-email-${document.id}`}
              >
                <Mail className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive"
              onClick={onDelete}
              data-testid={`button-delete-${document.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="truncate">{document.originalName}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-lg bg-muted">
            {isPdf ? (
              <iframe
                src={fileUrl}
                className="w-full h-full border-0"
                title={document.originalName || "PDF Document"}
              />
            ) : isImage ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img 
                  src={fileUrl} 
                  alt={document.originalName || "Document"} 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
