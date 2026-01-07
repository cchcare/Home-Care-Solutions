import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, FileSignature, Pencil, Trash2, Eye, Send } from "lucide-react";
import type { ESignatureTemplate } from "@shared/schema";
import { useOffice } from "@/context/office-context";
import { ESignatureSendDialog } from "@/components/esignature-send-dialog";

interface SignatureField {
  id: string;
  label: string;
  required: boolean;
  type: "signature" | "initials" | "date" | "text";
}

export default function ESignatureTemplates() {
  const { toast } = useToast();
  const { selectedOffice } = useOffice();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ESignatureTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content: "",
    status: "draft" as "draft" | "active" | "archived",
    signatureFields: [] as SignatureField[],
  });

  const { data: templates, isLoading } = useQuery<ESignatureTemplate[]>({
    queryKey: ["/api/esignature/templates", selectedOffice?.id],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("/api/esignature/templates", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        officeId: selectedOffice?.id,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esignature/templates"] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: "Template created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) => 
      apiRequest(`/api/esignature/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esignature/templates"] });
      setIsEditOpen(false);
      setSelectedTemplate(null);
      resetForm();
      toast({ title: "Template updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/esignature/templates/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esignature/templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      content: "",
      status: "draft",
      signatureFields: [],
    });
  };

  const handleEdit = (template: ESignatureTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      content: template.content,
      status: template.status || "draft",
      signatureFields: (template.signatureFields as SignatureField[]) || [],
    });
    setIsEditOpen(true);
  };

  const handlePreview = (template: ESignatureTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleSend = (template: ESignatureTemplate) => {
    setSelectedTemplate(template);
    setIsSendOpen(true);
  };

  const addSignatureField = () => {
    const newField: SignatureField = {
      id: `field_${Date.now()}`,
      label: "Signature",
      required: true,
      type: "signature",
    };
    setFormData(prev => ({
      ...prev,
      signatureFields: [...prev.signatureFields, newField],
    }));
  };

  const updateSignatureField = (index: number, updates: Partial<SignatureField>) => {
    setFormData(prev => ({
      ...prev,
      signatureFields: prev.signatureFields.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      ),
    }));
  };

  const removeSignatureField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      signatureFields: prev.signatureFields.filter((_, i) => i !== index),
    }));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      draft: "secondary",
      archived: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="page-title">
                  E-Signature Templates
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Create and manage document templates for electronic signatures
                </p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-template">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Templates
                </CardTitle>
                <CardDescription>
                  Manage your e-signature document templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8" data-testid="loading-templates">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                  </div>
                ) : templates && templates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fields</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {template.description || "—"}
                          </TableCell>
                          <TableCell>{getStatusBadge(template.status || "draft")}</TableCell>
                          <TableCell>
                            {(template.signatureFields as SignatureField[] || []).length} fields
                          </TableCell>
                          <TableCell>
                            {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`button-actions-${template.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePreview(template)} data-testid={`menu-preview-${template.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(template)} data-testid={`menu-edit-${template.id}`}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {template.status === "active" && (
                                  <DropdownMenuItem onClick={() => handleSend(template)} data-testid={`menu-send-${template.id}`}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send for Signature
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => deleteMutation.mutate(template.id)}
                                  className="text-red-600"
                                  data-testid={`menu-delete-${template.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500" data-testid="empty-templates">
                    <FileSignature className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No templates yet. Create your first template to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Create/Edit Template Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setSelectedTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">
              {isEditOpen ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {isEditOpen ? "Update your e-signature template" : "Create a new e-signature document template"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: "draft" | "active" | "archived") => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter template description"
                data-testid="input-template-description"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Document Content (HTML)</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter document HTML content..."
                className="min-h-[200px] font-mono text-sm"
                data-testid="textarea-template-content"
              />
              <p className="text-xs text-gray-500">
                Use HTML to format your document. Signature placeholders will be rendered where fields are placed.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Signature Fields</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addSignatureField}
                  data-testid="button-add-field"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>
              
              {formData.signatureFields.length > 0 ? (
                <div className="space-y-2">
                  {formData.signatureFields.map((field, index) => (
                    <div 
                      key={field.id} 
                      className="flex items-center gap-2 p-2 border rounded-lg"
                      data-testid={`field-${index}`}
                    >
                      <Input
                        value={field.label}
                        onChange={(e) => updateSignatureField(index, { label: e.target.value })}
                        placeholder="Field label"
                        className="flex-1"
                        data-testid={`input-field-label-${index}`}
                      />
                      <Select
                        value={field.type}
                        onValueChange={(value: SignatureField["type"]) => 
                          updateSignatureField(index, { type: value })
                        }
                      >
                        <SelectTrigger className="w-[130px]" data-testid={`select-field-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="signature">Signature</SelectItem>
                          <SelectItem value="initials">Initials</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSignatureField(index)}
                        data-testid={`button-remove-field-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-2">
                  No signature fields added. Click "Add Field" to add signature, initials, date, or text fields.
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
                setSelectedTemplate(null);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (isEditOpen && selectedTemplate) {
                  updateMutation.mutate({ id: selectedTemplate.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
              disabled={!formData.name || !formData.content || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="preview-title">{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>Template Preview</DialogDescription>
          </DialogHeader>
          <div 
            className="prose max-w-none dark:prose-invert border rounded-lg p-6 bg-white dark:bg-gray-800"
            dangerouslySetInnerHTML={{ __html: selectedTemplate?.content || "" }}
            data-testid="preview-content"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)} data-testid="button-close-preview">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send for Signature Dialog */}
      {selectedTemplate && (
        <ESignatureSendDialog
          open={isSendOpen}
          onOpenChange={setIsSendOpen}
          template={selectedTemplate}
        />
      )}
    </div>
  );
}