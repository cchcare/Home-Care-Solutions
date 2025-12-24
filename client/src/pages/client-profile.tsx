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
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
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
  Search
} from "lucide-react";
import type { Client, Document, Office, Mco, User as UserType, ClientCommunication, OfficeMcoBillingRate, ClientSchedule, MasterWeekTemplate, MasterWeekSlot, Caregiver, ClientMco, Coordinator } from "@shared/schema";

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
  { id: "others", label: "Others", icon: MoreHorizontal },
];

export default function ClientProfile() {
  const [, params] = useRoute("/clients/:id");
  const clientId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadCategory, setUploadCategory] = useState("other");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState("note");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMasterWeekEditor, setShowMasterWeekEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Client>>({});
  const [activeSection, setActiveSection] = useState("general");
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMcoDialog, setShowMcoDialog] = useState(false);
  const [editingMco, setEditingMco] = useState<ClientMco | null>(null);
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

  const { data: offices = [] } = useQuery<Office[]>({
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

  const updateClientMutation = useMutation({
    mutationFn: async (data: Partial<Client>) => {
      return await apiRequest("PUT", `/api/clients/${clientId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      setIsEditing(false);
      toast({ title: "Success", description: "Client updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update client", variant: "destructive" });
    },
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

  const handleStartEditing = () => {
    if (client) {
      setEditFormData({
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        phone: client.phone || "",
        address: client.address || "",
        dateOfBirth: client.dateOfBirth,
        memberId: client.memberId || "",
        serviceStartDate: client.serviceStartDate,
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
              <Button variant="outline" size="sm" onClick={handleStartEditing} data-testid="button-edit-client">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Service Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Service Start Date
                        </Label>
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
                        <Label className="text-muted-foreground text-sm">MCO</Label>
                        {isEditing ? (
                          <Select
                            value={editFormData.mcoId || ""}
                            onValueChange={(value) => setEditFormData({ ...editFormData, mcoId: value })}
                          >
                            <SelectTrigger data-testid="select-client-mco">
                              <SelectValue placeholder="Select MCO" />
                            </SelectTrigger>
                            <SelectContent>
                              {officeMcos.map((m) => (
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
                        <Label className="text-muted-foreground text-sm">Member ID</Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.memberId || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, memberId: e.target.value })}
                            data-testid="input-member-id"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-member-id">
                            {client.memberId || "N/A"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                          <p className="font-medium" data-testid="text-client-first-name">
                            {client.firstName}
                          </p>
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
                          <p className="font-medium" data-testid="text-client-last-name">
                            {client.lastName}
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
                            value={editFormData.dateOfBirth ? new Date(editFormData.dateOfBirth).toISOString().split('T')[0] : ""}
                            onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value ? new Date(e.target.value) : undefined })}
                            data-testid="input-date-of-birth"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-client-dob">
                            {client.dateOfBirth ? format(new Date(client.dateOfBirth), "MMM d, yyyy") : "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Phone
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
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Address
                        </Label>
                        {isEditing ? (
                          <Textarea
                            value={editFormData.address || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                            rows={2}
                            data-testid="input-address"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-client-address">
                            {client.address || "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <Building className="w-3 h-3" /> Office Location
                        </Label>
                        {isEditing ? (
                          <Select
                            value={editFormData.officeId || ""}
                            onValueChange={(value) => setEditFormData({ ...editFormData, officeId: value })}
                          >
                            <SelectTrigger data-testid="select-client-office">
                              <SelectValue placeholder="Select office" />
                            </SelectTrigger>
                            <SelectContent>
                              {offices.map((o) => (
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
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Emergency Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Name</Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.emergencyContactName || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, emergencyContactName: e.target.value })}
                            data-testid="input-emergency-name"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-emergency-name">
                            {client.emergencyContactName || "N/A"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Phone</Label>
                        {isEditing ? (
                          <Input
                            value={editFormData.emergencyContactPhone || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, emergencyContactPhone: e.target.value })}
                            data-testid="input-emergency-phone"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-emergency-phone">
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
                            data-testid="input-emergency-relation"
                          />
                        ) : (
                          <p className="font-medium" data-testid="text-emergency-relation">
                            {client.emergencyContactRelation || "N/A"}
                          </p>
                        )}
                      </div>
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
                        {caregivers.map((cg) => (
                          <Badge key={cg.id} variant="secondary">
                            Employee #{cg.employeeId}
                          </Badge>
                        ))}
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
                        return (
                          <div
                            key={day.toISOString()}
                            className={`p-2 min-h-[80px] border rounded-lg ${
                              isToday(day) ? "bg-primary/10 border-primary" : "bg-card"
                            } ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""}`}
                            data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                          >
                            <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                            <div className="space-y-1">
                              {daySchedules.slice(0, 2).map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className="text-xs p-1 bg-primary/20 rounded truncate"
                                  title={`${schedule.startTime} - ${schedule.endTime}`}
                                >
                                  {schedule.startTime}
                                </div>
                              ))}
                              {daySchedules.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{daySchedules.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                          Master Week Template
                        </CardTitle>
                        <CardDescription>Define the standard weekly schedule for this client</CardDescription>
                      </div>
                      <Button
                        onClick={() => createMasterWeekMutation.mutate({ name: "Default Schedule" })}
                        disabled={createMasterWeekMutation.isPending || masterWeekTemplates.length > 0}
                        data-testid="button-create-master-week"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {masterWeekTemplates.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No master week template defined. Click "Create Template" to get started.</p>
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
                </div>
              )}

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
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Client Profile
                      </CardTitle>
                      <CardDescription>View and edit client profile details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-8">Full profile details coming soon</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Eligibility Check Section */}
              {activeSection === "eligibility" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Eligibility Check
                      </CardTitle>
                      <CardDescription>Check client eligibility status</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-8">Eligibility check coming soon</p>
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
                      <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Caregiver History
                      </CardTitle>
                      <CardDescription>View history of caregivers assigned to this client</CardDescription>
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
                              <Badge variant={cg.isActive ? "default" : "secondary"}>
                                {cg.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
                  {allMcos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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
                  const medicaidId = (cl.medicaidId || "").toLowerCase();
                  return name.includes(query) || medicaidId.includes(query);
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
                        <p className="text-sm text-muted-foreground">{cl.medicaidId || "No Medicaid ID"}</p>
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
                const medicaidId = (cl.medicaidId || "").toLowerCase();
                return name.includes(query) || medicaidId.includes(query);
              }).length === 0 && (
                <p className="text-muted-foreground text-center py-4">No clients found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentCard({ document, onDelete }: { document: Document; onDelete: () => void }) {
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
