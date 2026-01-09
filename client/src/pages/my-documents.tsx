import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { FileText, Download, Eye, Search, File, FileImage, FileSpreadsheet } from "lucide-react";

interface Document {
  id: string;
  name: string;
  category: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  expirationDate: string | null;
  status: string;
}

export default function MyDocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/my-documents"],
  });

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCategory = (category: string) => {
    return category
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes("image")) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (fileType?.includes("spreadsheet") || fileType?.includes("excel")) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (fileType?.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const handleDownload = (doc: Document) => {
    window.open(`/api/my-documents/${doc.id}/download`, "_blank");
  };

  const handleView = (doc: Document) => {
    window.open(`/api/my-documents/${doc.id}/view`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Forms & Documents
              </h1>
              <p className="text-muted-foreground">View and download your documents and forms</p>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>My Documents</CardTitle>
                    <CardDescription>{documents.length} documents available</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredDocuments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {searchQuery ? "No documents match your search." : "No documents found."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {getFileIcon(doc.fileType)}
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {formatCategory(doc.category)}
                              </Badge>
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span>Uploaded {format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.expirationDate && (
                            <Badge variant="secondary" className="mr-2">
                              Expires: {format(new Date(doc.expirationDate), "MMM d, yyyy")}
                            </Badge>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleView(doc)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
