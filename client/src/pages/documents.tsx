import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { FileUpload } from "@/components/file-upload";
import { DocumentPreview } from "@/components/document-preview";
import { OfficeSelector } from "@/components/office-selector";
import { useOfficeScope } from "@/context/office-context";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Upload, 
  Search, 
  Download, 
  Eye, 
  FileText, 
  Shield, 
  Calendar,
  User,
  Filter,
  Plus,
  Folder,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import type { Document } from "@shared/schema";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOfficeId, setSelectedOfficeId, isAllOffices, canMutate, viewOnlyMessage } = useOfficeScope();
  const officeQuery = selectedOfficeId !== "all" ? `?officeId=${selectedOfficeId}` : "";

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", selectedOfficeId],
    queryFn: () => fetch(`/api/documents${officeQuery}`, { credentials: "include" }).then(r => r.json()),
    retry: false,
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    retry: false,
  });

  const documentTypes = [
    { value: "all", label: "All Documents" },
    { value: "insurance_card", label: "Insurance Cards" },
    { value: "id_card", label: "Photo IDs" },
    { value: "care_plan", label: "Care Plans" },
    { value: "incident_report", label: "Incident Reports" },
    { value: "physician_order", label: "Physician Orders" },
    { value: "assessment", label: "Assessments" },
    { value: "general", label: "General Documents" },
  ];

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/documents/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedOfficeId] });
      toast({
        title: "Success",
        description: "Document updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive",
      });
    },
  });

  const filteredDocuments = documents?.filter((doc: Document) => {
    const matchesSearch = searchTerm === "" || 
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedDocumentType === "all" || doc.documentType === selectedDocumentType;
    
    return matchesSearch && matchesType;
  }) || [];

  const getDocumentIcon = (documentType: string) => {
    switch (documentType) {
      case "insurance_card":
        return <Shield className="w-5 h-5 text-primary" />;
      case "care_plan":
        return <FileText className="w-5 h-5 text-accent" />;
      case "incident_report":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (document: Document) => {
    if (document.isSignatureRequired) {
      if (document.isSigned) {
        return <Badge variant="default" className="text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Signed
        </Badge>;
      } else {
        return <Badge variant="destructive" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Signature Required
        </Badge>;
      }
    }
    return <Badge variant="secondary" className="text-xs">No Signature Required</Badge>;
  };

  const getDocumentTypeBadge = (type: string) => {
    const typeLabel = documentTypes.find(t => t.value === type)?.label || type;
    return <Badge variant="outline" className="text-xs">{typeLabel}</Badge>;
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "Not assigned";
    const client = clients?.find((c: any) => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  };

  const handleSignDocument = (documentId: string) => {
    updateDocumentMutation.mutate({
      id: documentId,
      data: { isSigned: true, signedAt: new Date() }
    });
  };

  // Document statistics
  const totalDocuments = documents?.length || 0;
  const signedDocuments = documents?.filter((d: Document) => d.isSigned).length || 0;
  const pendingSignatures = documents?.filter((d: Document) => d.isSignatureRequired && !d.isSigned).length || 0;
  const recentUploads = documents?.filter((d: Document) => {
    const uploadDate = new Date(d.createdAt!);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return uploadDate > sevenDaysAgo;
  }).length || 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Forms & Documents"
          subtitle="Manage document storage and forms"
        />
        
        {/* Header */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <OfficeSelector
              selectedOfficeId={selectedOfficeId === "all" ? undefined : selectedOfficeId}
              onOfficeChange={setSelectedOfficeId}
              showAllOption={true}
            />
          </div>
          <Button 
            onClick={() => setShowUploadModal(true)} 
            data-testid="button-upload-document"
            disabled={!canMutate}
            title={!canMutate ? viewOnlyMessage : undefined}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {isAllOffices && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-md text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {viewOnlyMessage}
              </div>
            )}
            
            {/* Document Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-documents">
                        {totalDocuments}
                      </p>
                    </div>
                    <Folder className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Signed Documents</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-signed-documents">
                        {signedDocuments}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Signatures</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-pending-signatures">
                        {pendingSignatures}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Recent Uploads</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-recent-uploads">
                        {recentUploads}
                      </p>
                    </div>
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search documents by name or type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-documents"
                    />
                  </div>
                  <select
                    value={selectedDocumentType}
                    onChange={(e) => setSelectedDocumentType(e.target.value)}
                    className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    data-testid="select-document-type"
                  >
                    {documentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <Button 
                    variant="outline"
                    onClick={() => toast({ title: "Advanced Filter", description: "Advanced filtering coming soon" })}
                    data-testid="button-advanced-filter"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Advanced Filter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upload Area Modal */}
            {showUploadModal && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Upload New Documents</CardTitle>
                    <Button variant="ghost" onClick={() => setShowUploadModal(false)} data-testid="button-close-upload">
                      ×
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    documentType="general"
                    officeId={selectedOfficeId !== "all" ? selectedOfficeId : undefined}
                    onUploadComplete={() => {
                      setShowUploadModal(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedOfficeId] });
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Documents Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Documents</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Document</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Upload Date</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Loading documents...
                          </td>
                        </tr>
                      ) : filteredDocuments.length > 0 ? (
                        filteredDocuments.map((document: Document) => (
                          <tr key={document.id} className="hover:bg-muted/25 transition-colors" data-testid={`row-document-${document.id}`}>
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                  {getDocumentIcon(document.documentType || "general")}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground" data-testid={`text-document-name-${document.id}`}>
                                    {document.originalName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {(document.fileSize! / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              {getDocumentTypeBadge(document.documentType || "general")}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">
                                  {getClientName(document.clientId)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">
                                  {new Date(document.createdAt!).toLocaleDateString()}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              {getStatusBadge(document)}
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setPreviewDocument(document)}
                                  title="View document"
                                  data-testid={`button-view-document-${document.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    const link = window.document.createElement("a");
                                    link.href = `/api/documents/${document.id}/download`;
                                    link.download = document.originalName;
                                    window.document.body.appendChild(link);
                                    link.click();
                                    window.document.body.removeChild(link);
                                  }}
                                  title="Download document"
                                  data-testid={`button-download-document-${document.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                {document.isSignatureRequired && !document.isSigned && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleSignDocument(document.id)}
                                    disabled={!canMutate || updateDocumentMutation.isPending}
                                    title={!canMutate ? viewOnlyMessage : undefined}
                                    data-testid={`button-sign-document-${document.id}`}
                                  >
                                    Sign
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            {searchTerm || selectedDocumentType !== "all" 
                              ? "No documents found matching your criteria" 
                              : "No documents uploaded yet"
                            }
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Bulk Upload</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload multiple documents at once
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => setShowUploadModal(true)} 
                    data-testid="button-bulk-upload"
                    disabled={!canMutate}
                    title={!canMutate ? viewOnlyMessage : undefined}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Start Bulk Upload
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Digital Signatures</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage electronic signatures
                  </p>
                  <Button variant="outline" className="w-full" data-testid="button-manage-signatures">
                    Manage Signatures
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">HIPAA Compliance</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    View encryption and audit logs
                  </p>
                  <Button variant="outline" className="w-full" data-testid="button-view-audit-logs">
                    View Audit Logs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <DocumentPreview
        document={previewDocument}
        isOpen={previewDocument !== null}
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
}
