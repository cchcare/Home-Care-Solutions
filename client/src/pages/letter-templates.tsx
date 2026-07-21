import { useState } from "react";
import DOMPurify from "dompurify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLetterTemplateSchema, type LetterTemplate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit, Trash2, Eye, FileText, Shield, Search, Copy, Tags } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { z } from "zod";
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

const templateFormSchema = insertLetterTemplateSchema.pick({
  name: true,
  description: true,
  scope: true,
  category: true,
  status: true,
  htmlContent: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  htmlContent: z.string().min(1, "HTML content is required"),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface Placeholder {
  key: string;
  description: string;
  example?: string;
}

export default function LetterTemplates() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = (user as any)?.role === "super_admin" || 
                  (user as any)?.role === "admin" || 
                  (user as any)?.role === "office_admin";

  const { data: templates = [], isLoading } = useQuery<LetterTemplate[]>({
    queryKey: ["/api/letter-templates"],
    enabled: isAdmin,
  });

  const createForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      scope: "general",
      category: "",
      status: "draft",
      htmlContent: "",
    },
  });

  const editForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      scope: "general",
      category: "",
      status: "draft",
      htmlContent: "",
    },
  });

  const watchedScope = createForm.watch("scope");
  const editWatchedScope = editForm.watch("scope");

  const { data: placeholders = [] } = useQuery<Placeholder[]>({
    queryKey: ["/api/letter-templates/placeholders", watchedScope || "general"],
    enabled: createOpen && !!watchedScope,
  });

  const { data: editPlaceholders = [] } = useQuery<Placeholder[]>({
    queryKey: ["/api/letter-templates/placeholders", editWatchedScope || "general"],
    enabled: editOpen && !!editWatchedScope,
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return apiRequest("POST", "/api/letter-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/letter-templates"] });
      setCreateOpen(false);
      createForm.reset();
      toast({ title: "Success", description: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormData }) => {
      return apiRequest("PATCH", `/api/letter-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/letter-templates"] });
      setEditOpen(false);
      setSelectedTemplate(null);
      toast({ title: "Success", description: "Template updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/letter-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/letter-templates"] });
      setDeleteOpen(false);
      setSelectedTemplate(null);
      toast({ title: "Success", description: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/letter-templates/seed-defaults", {});
    },
    onSuccess: async (res: Response) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/letter-templates"] });
      if (result.created?.length) {
        toast({ title: `Added ${result.created.length} default letter template(s)`, description: result.created.join(", ") });
      } else {
        toast({ title: "All default letter templates already exist" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add default letter templates", variant: "destructive" });
    },
  });

  const onCreateSubmit = (data: TemplateFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: TemplateFormData) => {
    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, data });
    }
  };

  const handleEdit = (template: LetterTemplate) => {
    setSelectedTemplate(template);
    editForm.reset({
      name: template.name,
      description: template.description || "",
      scope: template.scope || "general",
      category: template.category || "",
      status: template.status || "draft",
      htmlContent: template.htmlContent,
    });
    setEditOpen(true);
  };

  const handleDelete = (template: LetterTemplate) => {
    setSelectedTemplate(template);
    setDeleteOpen(true);
  };

  const handlePreview = (template: LetterTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTemplate) {
      deleteMutation.mutate(selectedTemplate.id);
    }
  };

  const insertPlaceholder = (placeholder: string, formType: "create" | "edit") => {
    const form = formType === "create" ? createForm : editForm;
    const currentContent = form.getValues("htmlContent");
    form.setValue("htmlContent", currentContent + `{{${placeholder}}}`);
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.category?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesScope = scopeFilter === "all" || template.scope === scopeFilter;
    const matchesStatus = statusFilter === "all" || template.status === statusFilter;
    return matchesSearch && matchesScope && matchesStatus;
  });

  const getScopeBadge = (scope: string | null) => {
    const colors: Record<string, string> = {
      caregiver: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      client: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      staff: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
      general: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
    };
    return <Badge className={colors[scope || "general"]}>{scope || "general"}</Badge>;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Published</Badge>;
      case "archived":
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const PlaceholderSidebar = ({ placeholderList, formType }: { placeholderList: Placeholder[], formType: "create" | "edit" }) => (
    <div className="w-64 border-l pl-4 space-y-4">
      <div>
        <h4 className="font-medium text-sm mb-2">Available Placeholders</h4>
        <p className="text-xs text-muted-foreground mb-3">Click to insert into content</p>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {placeholderList.length === 0 ? (
          <p className="text-xs text-muted-foreground">No placeholders available for this scope</p>
        ) : (
          placeholderList.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => insertPlaceholder(p.key, formType)}
              className="w-full text-left p-2 rounded border hover:bg-muted transition-colors"
              data-testid={`button-placeholder-${p.key}`}
            >
              <div className="flex items-center gap-2">
                <Copy className="h-3 w-3 text-muted-foreground" />
                <code className="text-xs font-mono">{`{{${p.key}}}`}</code>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Letter Templates" subtitle="Template management" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">Access Denied</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You don't have permission to access letter templates. Only administrators can manage templates.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Letter Templates" subtitle="Manage document templates" />
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Letter Templates</h1>
                <p className="text-muted-foreground">Create and manage document templates with placeholders</p>
              </div>
              <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => seedDefaultsMutation.mutate()}
                disabled={seedDefaultsMutation.isPending}
                title="Adds Employment Verification, Employee Warning, Employment Termination, Client Service Termination, and General Letter templates (skips any that already exist)"
                data-testid="button-seed-default-letters"
              >
                <FileText className="mr-2 h-4 w-4" />
                {seedDefaultsMutation.isPending ? "Adding..." : "Add Default Letter Set"}
              </Button>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-template">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Template</DialogTitle>
                    <DialogDescription>
                      Create a new letter template with HTML content and placeholders
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                      <div className="flex gap-6">
                        <div className="flex-1 space-y-4">
                          <FormField
                            control={createForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Template name" {...field} data-testid="input-template-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={createForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Template description" 
                                    {...field} 
                                    value={field.value || ""}
                                    data-testid="input-template-description" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FormField
                              control={createForm.control}
                              name="scope"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Scope</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || "general"}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-template-scope">
                                        <SelectValue placeholder="Select scope" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="general">General</SelectItem>
                                      <SelectItem value="caregiver">Caregiver</SelectItem>
                                      <SelectItem value="client">Client</SelectItem>
                                      <SelectItem value="staff">Staff</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={createForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="e.g., welcome_letter" 
                                      {...field} 
                                      value={field.value || ""}
                                      data-testid="input-template-category" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={createForm.control}
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || "draft"}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-template-status">
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="draft">Draft</SelectItem>
                                      <SelectItem value="published">Published</SelectItem>
                                      <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={createForm.control}
                            name="htmlContent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Template Content *</FormLabel>
                                <FormControl>
                                  <RichTextEditor
                                    content={field.value || ""}
                                    onChange={field.onChange}
                                    placeholder="Start typing your letter template content..."
                                    data-testid="input-template-content"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <PlaceholderSidebar placeholderList={placeholders} formType="create" />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-template">
                          {createMutation.isPending ? "Creating..." : "Create Template"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Templates
                </CardTitle>
                <CardDescription>Manage your letter templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-templates"
                    />
                  </div>
                  <Select value={scopeFilter} onValueChange={setScopeFilter}>
                    <SelectTrigger className="w-40" data-testid="select-filter-scope">
                      <SelectValue placeholder="Filter by scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scopes</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="caregiver">Caregiver</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-filter-status">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {templates.length === 0 ? "No templates yet. Create your first template!" : "No templates match your filters."}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.map((template) => (
                        <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>{getScopeBadge(template.scope)}</TableCell>
                          <TableCell>{template.category || "-"}</TableCell>
                          <TableCell>{getStatusBadge(template.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePreview(template)}
                                data-testid={`button-preview-${template.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(template)}
                                data-testid={`button-edit-${template.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(template)}
                                data-testid={`button-delete-${template.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
          </div>
        </div>
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the template content and settings
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="flex gap-6">
                <div className="flex-1 space-y-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Template name" {...field} data-testid="input-edit-template-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Template description" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-edit-template-description" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={editForm.control}
                      name="scope"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scope</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "general"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-template-scope">
                                <SelectValue placeholder="Select scope" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="caregiver">Caregiver</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., welcome_letter" 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-edit-template-category" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "draft"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-template-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="htmlContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Content *</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            content={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Start typing your letter template content..."
                            data-testid="input-edit-template-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <PlaceholderSidebar placeholderList={editPlaceholders} formType="edit" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-template">
                  {updateMutation.isPending ? "Updating..." : "Update Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              HTML content preview (placeholders shown as-is)
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedTemplate?.htmlContent || "") }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
