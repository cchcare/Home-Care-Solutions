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
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Users
} from "lucide-react";
import type { Client, Document, Office, Mco, User as UserType, ClientCommunication, OfficeMcoBillingRate, ClientSchedule, MasterWeekTemplate, MasterWeekSlot, Caregiver } from "@shared/schema";

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

  const { data: mco } = useQuery<Mco>({
    queryKey: ["/api/mcos", client?.mcoId],
    queryFn: () => fetch(`/api/mcos/${client?.mcoId}`).then(r => r.json()),
    enabled: !!client?.mcoId,
  });

  const { data: coordinator } = useQuery<UserType>({
    queryKey: ["/api/users", client?.coordinatorId],
    queryFn: () => fetch(`/api/users/${client?.coordinatorId}`).then(r => r.json()),
    enabled: !!client?.coordinatorId,
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
          <Badge variant={client.status === "active" ? "default" : "secondary"}>
            {client.status || "active"}
          </Badge>
        </header>

        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="general" data-testid="tab-general">
                  <User className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="billing" data-testid="tab-billing">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="schedule" data-testid="tab-schedule">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Schedule
                </TabsTrigger>
                <TabsTrigger value="documents" data-testid="tab-documents">
                  <FileText className="w-4 h-4 mr-2" />
                  Documents
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
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
                        <p className="font-medium" data-testid="text-service-start-date">
                          {client.serviceStartDate ? format(new Date(client.serviceStartDate), "MMM d, yyyy") : "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Coordinator</Label>
                        <p className="font-medium" data-testid="text-coordinator">
                          {coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">MCO</Label>
                        <p className="font-medium" data-testid="text-client-mco">
                          {mco?.name || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Member ID</Label>
                        <p className="font-medium" data-testid="text-member-id">
                          {client.memberId || "N/A"}
                        </p>
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
                        <Label className="text-muted-foreground text-sm">Full Name</Label>
                        <p className="font-medium" data-testid="text-client-name">
                          {client.firstName} {client.lastName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Date of Birth
                        </Label>
                        <p className="font-medium" data-testid="text-client-dob">
                          {client.dateOfBirth ? format(new Date(client.dateOfBirth), "MMM d, yyyy") : "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Phone
                        </Label>
                        <p className="font-medium" data-testid="text-client-phone">
                          {client.phone || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Address
                        </Label>
                        <p className="font-medium" data-testid="text-client-address">
                          {client.address || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <Building className="w-3 h-3" /> Office Location
                        </Label>
                        <p className="font-medium" data-testid="text-client-office">
                          {office?.name || "N/A"}
                        </p>
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
                        <p className="font-medium" data-testid="text-emergency-name">
                          {client.emergencyContactName || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Phone</Label>
                        <p className="font-medium" data-testid="text-emergency-phone">
                          {client.emergencyContactPhone || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Relationship</Label>
                        <p className="font-medium" data-testid="text-emergency-relation">
                          {client.emergencyContactRelation || "N/A"}
                        </p>
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
                        <p className="font-medium" data-testid="text-diagnosis">
                          {client.primaryDiagnosis || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Primary Physician</Label>
                        <p className="font-medium" data-testid="text-physician">
                          {client.primaryPhysician || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Allergies</Label>
                        <p className="font-medium" data-testid="text-allergies">
                          {client.allergies || "None reported"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                          <Pill className="w-3 h-3" /> Medications
                        </Label>
                        <p className="font-medium" data-testid="text-medications">
                          {client.medications || "None reported"}
                        </p>
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
              </TabsContent>

              <TabsContent value="billing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Billing Information
                    </CardTitle>
                    <CardDescription>MCO billing rates for {office?.name || "this office"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 border rounded-lg">
                        <Label className="text-muted-foreground text-sm">MCO</Label>
                        <p className="font-medium text-lg">{mco?.name || "Not assigned"}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <Label className="text-muted-foreground text-sm">Member ID</Label>
                        <p className="font-medium text-lg">{client.memberId || "N/A"}</p>
                      </div>
                    </div>

                    <h4 className="font-medium mb-3">Billing Rates</h4>
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
              </TabsContent>

              <TabsContent value="schedule" className="space-y-6">
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
              </TabsContent>

              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documents
                    </CardTitle>
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

function DocumentCard({ document, onDelete }: { document: Document; onDelete: () => void }) {
  const categoryLabel = DOCUMENT_CATEGORIES.find(c => c.value === document.documentType)?.label || document.documentType;
  
  return (
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => window.open(`/uploads/${document.fileName}`, '_blank')}
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
  );
}
