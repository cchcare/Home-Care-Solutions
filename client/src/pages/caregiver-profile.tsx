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
  Search
} from "lucide-react";
import type { Caregiver, User as UserType, Document, Office, Client, ComplianceItem, Coordinator } from "@shared/schema";

type EnrichedCaregiver = Caregiver & { firstName?: string | null; lastName?: string | null; email?: string | null };

const DOCUMENT_CATEGORIES = [
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

const CAREGIVER_MENU_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "compliance", label: "Compliance", icon: Shield },
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

  const handleStartEditing = () => {
    if (caregiver) {
      setEditFormData({
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
                          <Label className="text-muted-foreground text-sm">Full Name</Label>
                          <p className="font-medium" data-testid="text-caregiver-fullname">{caregiverName}</p>
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
                          <Label className="text-muted-foreground text-sm">HHAX Caregiver Code</Label>
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Compliance Items
                      </CardTitle>
                      <CardDescription>Track certifications, clearances, and compliance requirements</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {complianceItems.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No compliance items found</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Due Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {complianceItems.map((item) => (
                              <TableRow key={item.id} data-testid={`row-compliance-${item.id}`}>
                                <TableCell className="font-medium">{item.itemName}</TableCell>
                                <TableCell>{item.itemType}</TableCell>
                                <TableCell>
                                  <Badge variant={item.status === "compliant" ? "default" : item.status === "pending" ? "secondary" : "destructive"}>
                                    {item.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {item.dueDate ? format(new Date(item.dueDate), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

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
                                        <Button variant="ghost" size="icon" data-testid={`button-view-doc-${doc.id}`}>
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" data-testid={`button-download-doc-${doc.id}`}>
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
    </div>
  );
}
