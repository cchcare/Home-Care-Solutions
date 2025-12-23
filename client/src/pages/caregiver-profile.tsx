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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
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
  Eye
} from "lucide-react";
import type { Caregiver, User as UserType, Document, Office } from "@shared/schema";

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

export default function CaregiverProfile() {
  const [, params] = useRoute("/caregivers/:id");
  const caregiverId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: caregiver, isLoading: caregiverLoading } = useQuery<Caregiver>({
    queryKey: ["/api/caregivers", caregiverId],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/users", caregiver?.userId],
    queryFn: () => fetch(`/api/users/${caregiver?.userId}`).then(r => r.json()),
    enabled: !!caregiver?.userId,
  });

  const { data: office } = useQuery<Office>({
    queryKey: ["/api/offices", caregiver?.officeId],
    queryFn: () => fetch(`/api/offices/${caregiver?.officeId}`).then(r => r.json()),
    enabled: !!caregiver?.officeId,
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/caregivers", caregiverId, "documents"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/documents`).then(r => r.json()),
    enabled: !!caregiverId,
  });

  const { data: certifications = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", caregiverId, "certifications"],
    queryFn: () => fetch(`/api/caregivers/${caregiverId}/certifications`).then(r => r.json()),
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
          title="Caregiver Profile"
          subtitle={`${user?.firstName || ""} ${user?.lastName || ""}`}
        />
        
        <header className="bg-card border-b border-border h-16 flex items-center px-6 flex-shrink-0">
          <Link href="/caregivers">
            <Button variant="ghost" size="sm" data-testid="button-back-caregivers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Caregivers
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
                <Badge variant={caregiver.isActive ? "default" : "secondary"}>
                  {caregiver.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Full Name</Label>
                    <p className="font-medium" data-testid="text-caregiver-name">
                      {user?.firstName} {user?.middleName} {user?.lastName}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Employee ID</Label>
                    <p className="font-medium" data-testid="text-employee-id">
                      {caregiver.employeeId || "N/A"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </Label>
                    <p className="font-medium" data-testid="text-caregiver-email">
                      {user?.email || "N/A"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date of Birth
                    </Label>
                    <p className="font-medium" data-testid="text-caregiver-dob">
                      {user?.dateOfBirth ? format(new Date(user.dateOfBirth), "MMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Gender</Label>
                    <p className="font-medium capitalize" data-testid="text-caregiver-gender">
                      {caregiver.gender?.replace(/_/g, " ") || "N/A"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm flex items-center gap-1">
                      <Building className="w-3 h-3" /> Office Location
                    </Label>
                    <p className="font-medium" data-testid="text-caregiver-office">
                      {office?.name || "N/A"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Hire Date</Label>
                    <p className="font-medium" data-testid="text-hire-date">
                      {caregiver.hireDate ? format(new Date(caregiver.hireDate), "MMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Start Date</Label>
                    <p className="font-medium" data-testid="text-start-date">
                      {caregiver.startDate ? format(new Date(caregiver.startDate), "MMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Experience</Label>
                    <p className="font-medium" data-testid="text-experience">
                      {caregiver.experienceYears ? `${caregiver.experienceYears} years` : "N/A"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Hourly Wage</Label>
                    <p className="font-medium" data-testid="text-hourly-wage">
                      {caregiver.hourlyWage ? `$${caregiver.hourlyWage}` : "N/A"}
                    </p>
                  </div>
                  
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-muted-foreground text-sm">Specializations</Label>
                    <div className="flex flex-wrap gap-2" data-testid="text-specializations">
                      {caregiver.specializations?.length ? (
                        caregiver.specializations.map((spec, i) => (
                          <Badge key={i} variant="outline">{spec}</Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">None specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {certifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {certifications.map((cert) => (
                      <div key={cert.id} className="p-4 border rounded-lg" data-testid={`card-certification-${cert.id}`}>
                        <p className="font-medium">{cert.certificationType}</p>
                        <p className="text-sm text-muted-foreground">
                          {cert.issuingOrganization}
                        </p>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>Issued: {cert.issueDate ? format(new Date(cert.issueDate), "MMM yyyy") : "N/A"}</span>
                          <span>Expires: {cert.expirationDate ? format(new Date(cert.expirationDate), "MMM yyyy") : "N/A"}</span>
                        </div>
                        <Badge 
                          variant={cert.status === "active" ? "default" : "secondary"} 
                          className="mt-2"
                        >
                          {cert.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
