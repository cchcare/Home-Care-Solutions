import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  Mail,
  Plus,
  Save,
  Send,
  Eye,
  Trash2,
  Edit,
  Copy,
  CheckCircle,
  XCircle,
  Code,
  Palette,
  FileText,
  Settings,
  RefreshCw,
  Info,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  placeholders: any;
  themeSettings: any;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Placeholder {
  key: string;
  label: string;
  example: string;
}

const EMAIL_TEMPLATE_TYPES = [
  { value: "password_reset", label: "Password Reset" },
  { value: "welcome", label: "Welcome Email" },
  { value: "birthday_client", label: "Birthday - Client" },
  { value: "birthday_caregiver", label: "Birthday - Caregiver" },
  { value: "schedule_change", label: "Schedule Change" },
  { value: "schedule_reminder", label: "Schedule Reminder" },
  { value: "compliance_alert", label: "Compliance Alert" },
  { value: "general", label: "General" },
];

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #0066cc; padding: 20px; text-align: center; }
    .header img { max-height: 50px; }
    .header h1 { color: #ffffff; margin: 10px 0 0 0; font-size: 24px; }
    .content { padding: 30px; }
    .content h2 { color: #333333; margin-top: 0; }
    .content p { color: #666666; line-height: 1.6; }
    .button { display: inline-block; background-color: #0066cc; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{companyName}}</h1>
    </div>
    <div class="content">
      <h2>Hello {{firstName}},</h2>
      <p>Your email content goes here.</p>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{companyName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

export default function EmailTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  
  const [formData, setFormData] = useState({
    type: "general" as string,
    name: "",
    subject: "",
    htmlContent: DEFAULT_TEMPLATE,
    textContent: "",
    isActive: true,
    isDefault: false,
    themeSettings: {
      primaryColor: "#0066cc",
      backgroundColor: "#f5f5f5",
      fontFamily: "Arial, sans-serif",
    },
  });

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const { data: placeholders = [] } = useQuery<Placeholder[]>({
    queryKey: ["/api/email-templates/placeholders", formData.type],
    queryFn: async () => {
      const response = await fetch(`/api/email-templates/placeholders/${formData.type}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch placeholders");
      return response.json();
    },
    enabled: !!formData.type,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/email-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Template created successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/email-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Template updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Template deleted successfully" });
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async ({ id, testEmail, testData }: { id: string; testEmail: string; testData: any }) => {
      return apiRequest("POST", `/api/email-templates/${id}/test`, { testEmail, testData });
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Test email sent successfully", description: `Check ${testEmail}` });
      } else {
        toast({ title: "Failed to send test email", description: data.error, variant: "destructive" });
      }
      setShowTestDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      type: "general",
      name: "",
      subject: "",
      htmlContent: DEFAULT_TEMPLATE,
      textContent: "",
      isActive: true,
      isDefault: false,
      themeSettings: {
        primaryColor: "#0066cc",
        backgroundColor: "#f5f5f5",
        fontFamily: "Arial, sans-serif",
      },
    });
    setSelectedTemplate(null);
    setIsEditing(false);
    setActiveTab("templates");
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      type: template.type,
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || "",
      isActive: template.isActive,
      isDefault: template.isDefault,
      themeSettings: template.themeSettings || {
        primaryColor: "#0066cc",
        backgroundColor: "#f5f5f5",
        fontFamily: "Arial, sans-serif",
      },
    });
    setIsEditing(true);
    setActiveTab("editor");
  };

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.htmlContent) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDuplicate = (template: EmailTemplate) => {
    setFormData({
      type: template.type,
      name: `${template.name} (Copy)`,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || "",
      isActive: false,
      isDefault: false,
      themeSettings: template.themeSettings || {
        primaryColor: "#0066cc",
        backgroundColor: "#f5f5f5",
        fontFamily: "Arial, sans-serif",
      },
    });
    setSelectedTemplate(null);
    setIsEditing(false);
    setActiveTab("editor");
  };

  const insertPlaceholder = (key: string) => {
    const placeholder = `{{${key}}}`;
    setFormData({ ...formData, htmlContent: formData.htmlContent + placeholder });
  };

  const getPreviewHtml = () => {
    let html = formData.htmlContent;
    placeholders.forEach((p) => {
      const regex = new RegExp(`{{${p.key}}}`, "g");
      html = html.replace(regex, p.example);
    });
    return html;
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar title="System Email Templates" />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-6 w-6" />
                  System Email Templates
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Design and manage email templates for system notifications
                </p>
              </div>
              <Button 
                onClick={() => { resetForm(); setActiveTab("editor"); }}
                className="flex items-center gap-2"
                data-testid="button-create-template"
              >
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="editor" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Editor
                </TabsTrigger>
              </TabsList>

              <TabsContent value="templates">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>
                      Manage your system email templates. Active templates will be used for sending emails.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-8">Loading templates...</div>
                    ) : templates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No email templates yet.</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setActiveTab("editor")}
                        >
                          Create your first template
                        </Button>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {templates.map((template) => (
                            <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                              <TableCell className="font-medium">{template.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {EMAIL_TEMPLATE_TYPES.find(t => t.value === template.type)?.label || template.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {template.isActive ? (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                      <CheckCircle className="h-3 w-3 mr-1" /> Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      <XCircle className="h-3 w-3 mr-1" /> Inactive
                                    </Badge>
                                  )}
                                  {template.isDefault && (
                                    <Badge variant="outline">Default</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {format(new Date(template.updatedAt), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEdit(template)}
                                    data-testid={`button-edit-${template.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDuplicate(template)}
                                    data-testid={`button-duplicate-${template.id}`}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => { setSelectedTemplate(template); setShowTestDialog(true); }}
                                    data-testid={`button-test-${template.id}`}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => { setSelectedTemplate(template); setShowDeleteDialog(true); }}
                                    className="text-red-600 hover:text-red-700"
                                    data-testid={`button-delete-${template.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
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
              </TabsContent>

              <TabsContent value="editor">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Template Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="template-type">Template Type *</Label>
                            <Select 
                              value={formData.type} 
                              onValueChange={(v) => setFormData({ ...formData, type: v })}
                            >
                              <SelectTrigger data-testid="select-template-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {EMAIL_TEMPLATE_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="template-name">Template Name *</Label>
                            <Input
                              id="template-name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="e.g., Password Reset Email"
                              data-testid="input-template-name"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="template-subject">Email Subject *</Label>
                          <Input
                            id="template-subject"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            placeholder="e.g., Reset Your Password"
                            data-testid="input-template-subject"
                          />
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Switch
                              id="is-active"
                              checked={formData.isActive}
                              onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                              data-testid="switch-active"
                            />
                            <Label htmlFor="is-active">Active</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="is-default"
                              checked={formData.isDefault}
                              onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })}
                              data-testid="switch-default"
                            />
                            <Label htmlFor="is-default">Default for this type</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Code className="h-5 w-5" />
                            HTML Content
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPreview(!showPreview)}
                            data-testid="button-toggle-preview"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {showPreview ? "Hide Preview" : "Show Preview"}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {showPreview ? (
                          <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium">
                              Preview
                            </div>
                            <iframe
                              srcDoc={getPreviewHtml()}
                              className="w-full h-[500px] bg-white"
                              title="Email Preview"
                              data-testid="iframe-preview"
                            />
                          </div>
                        ) : (
                          <Textarea
                            value={formData.htmlContent}
                            onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                            className="font-mono text-sm min-h-[500px]"
                            placeholder="Enter HTML content..."
                            data-testid="textarea-html-content"
                          />
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Plain Text Content (Optional)
                        </CardTitle>
                        <CardDescription>
                          Fallback text for email clients that don't support HTML
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={formData.textContent}
                          onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                          className="min-h-[150px]"
                          placeholder="Enter plain text content..."
                          data-testid="textarea-text-content"
                        />
                      </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                      <Button variant="outline" onClick={resetForm} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSave}
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-save-template"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {selectedTemplate ? "Update Template" : "Create Template"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Info className="h-5 w-5" />
                          Available Placeholders
                        </CardTitle>
                        <CardDescription>
                          Click to insert into your template. These will be replaced with actual values when sending.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {placeholders.map((p) => (
                              <div
                                key={p.key}
                                className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                onClick={() => insertPlaceholder(p.key)}
                              >
                                <div className="flex items-center justify-between">
                                  <code className="text-sm font-mono text-blue-600 dark:text-blue-400">
                                    {`{{${p.key}}}`}
                                  </code>
                                  <Button variant="ghost" size="sm" className="h-6 px-2">
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {p.label}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Example: {p.example}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Palette className="h-5 w-5" />
                          Theme Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Primary Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.themeSettings.primaryColor}
                              onChange={(e) => setFormData({
                                ...formData,
                                themeSettings: { ...formData.themeSettings, primaryColor: e.target.value }
                              })}
                              className="w-10 h-10 rounded cursor-pointer"
                              data-testid="input-primary-color"
                            />
                            <Input
                              value={formData.themeSettings.primaryColor}
                              onChange={(e) => setFormData({
                                ...formData,
                                themeSettings: { ...formData.themeSettings, primaryColor: e.target.value }
                              })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Background Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.themeSettings.backgroundColor}
                              onChange={(e) => setFormData({
                                ...formData,
                                themeSettings: { ...formData.themeSettings, backgroundColor: e.target.value }
                              })}
                              className="w-10 h-10 rounded cursor-pointer"
                              data-testid="input-background-color"
                            />
                            <Input
                              value={formData.themeSettings.backgroundColor}
                              onChange={(e) => setFormData({
                                ...formData,
                                themeSettings: { ...formData.themeSettings, backgroundColor: e.target.value }
                              })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Font Family</Label>
                          <Select
                            value={formData.themeSettings.fontFamily}
                            onValueChange={(v) => setFormData({
                              ...formData,
                              themeSettings: { ...formData.themeSettings, fontFamily: v }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                              <SelectItem value="Georgia, serif">Georgia</SelectItem>
                              <SelectItem value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</SelectItem>
                              <SelectItem value="'Times New Roman', Times, serif">Times New Roman</SelectItem>
                              <SelectItem value="Verdana, Geneva, sans-serif">Verdana</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify how your template looks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                data-testid="input-test-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplate) {
                  testMutation.mutate({
                    id: selectedTemplate.id,
                    testEmail,
                    testData: placeholders.reduce((acc, p) => ({ ...acc, [p.key]: p.example }), {}),
                  });
                }
              }}
              disabled={!testEmail || testMutation.isPending}
              data-testid="button-send-test"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
