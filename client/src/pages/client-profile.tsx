import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
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
  Stethoscope
} from "lucide-react";
import type { Client, Document, Office, Mco } from "@shared/schema";

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

export default function ClientProfile() {
  const [, params] = useRoute("/clients/:id");
  const clientId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadCategory, setUploadCategory] = useState("other");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/clients", clientId, "documents"],
    queryFn: () => fetch(`/api/clients/${clientId}/documents`).then(r => r.json()),
    enabled: !!clientId,
  });

  const { data: caregivers = [] } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "caregivers"],
    queryFn: () => fetch(`/api/clients/${clientId}/caregivers`).then(r => r.json()),
    enabled: !!clientId,
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

  const handleFileUpload = () => {
    if (!selectedFile || !clientId) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("clientId", clientId);
    formData.append("documentType", uploadCategory);
    uploadMutation.mutate(formData);
  };

  const groupedDocuments = DOCUMENT_CATEGORIES.reduce((acc, category) => {
    acc[category.value] = documents.filter(doc => doc.documentType === category.value);
    return acc;
  }, {} as Record<string, Document[]>);

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
        
        <header className="bg-card border-b border-border h-16 flex items-center px-6 flex-shrink-0">
          <Link href="/clients">
            <Button variant="ghost" size="sm" data-testid="button-back-clients">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </Button>
          </Link>
        </header>

        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-6xl mx-auto space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <Badge variant={client.status === "active" ? "default" : "secondary"}>
                  {client.status || "active"}
                </Badge>
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
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">MCO</Label>
                    <p className="font-medium" data-testid="text-client-mco">
                      {mco?.name || "N/A"}
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
