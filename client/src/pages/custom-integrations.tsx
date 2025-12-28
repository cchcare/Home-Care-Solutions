import { useState } from "react";
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
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { FeatureGate } from "@/components/FeatureGate";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomIntegrationSchema, type CustomIntegration } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings, Trash2, Play, Edit, Clock, AlertCircle, CheckCircle, Plug } from "lucide-react";
import { format } from "date-fns";
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

const integrationFormSchema = insertCustomIntegrationSchema.pick({
  name: true,
  type: true,
  syncFrequency: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  config: z.string().optional(),
});

type IntegrationFormData = z.infer<typeof integrationFormSchema>;

export default function CustomIntegrationsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<CustomIntegration | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery<CustomIntegration[]>({
    queryKey: ["/api/custom-integrations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: IntegrationFormData) => {
      const config = data.config ? JSON.parse(data.config) : {};
      return apiRequest("POST", "/api/custom-integrations", {
        name: data.name,
        type: data.type,
        syncFrequency: data.syncFrequency,
        config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-integrations"] });
      setCreateOpen(false);
      createForm.reset();
      toast({ title: "Success", description: "Integration created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create integration", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IntegrationFormData }) => {
      const config = data.config ? JSON.parse(data.config) : {};
      return apiRequest("PUT", `/api/custom-integrations/${id}`, {
        name: data.name,
        type: data.type,
        syncFrequency: data.syncFrequency,
        config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-integrations"] });
      setEditOpen(false);
      setSelectedIntegration(null);
      toast({ title: "Success", description: "Integration updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update integration", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/custom-integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-integrations"] });
      setDeleteOpen(false);
      setSelectedIntegration(null);
      toast({ title: "Success", description: "Integration deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete integration", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/custom-integrations/${id}/test`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-integrations"] });
      toast({ title: "Success", description: "Integration test successful" });
    },
    onError: () => {
      toast({ title: "Error", description: "Integration test failed", variant: "destructive" });
    },
  });

  const createForm = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      name: "",
      type: "webhook",
      syncFrequency: "daily",
      config: "{}",
    },
  });

  const editForm = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      name: "",
      type: "webhook",
      syncFrequency: "daily",
      config: "{}",
    },
  });

  const onCreateSubmit = (data: IntegrationFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: IntegrationFormData) => {
    if (selectedIntegration) {
      updateMutation.mutate({ id: selectedIntegration.id, data });
    }
  };

  const handleEdit = (integration: CustomIntegration) => {
    setSelectedIntegration(integration);
    editForm.reset({
      name: integration.name,
      type: integration.type,
      syncFrequency: integration.syncFrequency || "daily",
      config: integration.config ? JSON.stringify(integration.config, null, 2) : "{}",
    });
    setEditOpen(true);
  };

  const handleDelete = (integration: CustomIntegration) => {
    setSelectedIntegration(integration);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedIntegration) {
      deleteMutation.mutate(selectedIntegration.id);
    }
  };

  const handleTest = (integration: CustomIntegration) => {
    testMutation.mutate(integration.id);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      case "disabled":
        return <Badge variant="secondary">Disabled</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      webhook: "Webhook",
      sftp: "SFTP",
      api: "REST API",
      ehr: "EHR System",
    };
    return labels[type] || type;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Custom Integrations" subtitle="Enterprise integration management" />
        <div className="flex-1 overflow-auto p-6 bg-background">
          <FeatureGate feature="custom_integrations">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Custom Integrations</h1>
                  <p className="text-muted-foreground">Connect your external systems and services</p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-integration">
                      <Plus className="mr-2 h-4 w-4" />
                      New Integration
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create Integration</DialogTitle>
                      <DialogDescription>
                        Set up a new integration with an external system
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createForm}>
                      <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                        <FormField
                          control={createForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Integration name"
                                  {...field}
                                  data-testid="input-integration-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-integration-type">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="webhook">Webhook</SelectItem>
                                  <SelectItem value="sftp">SFTP</SelectItem>
                                  <SelectItem value="api">REST API</SelectItem>
                                  <SelectItem value="ehr">EHR System</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createForm.control}
                          name="syncFrequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sync Frequency</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || "daily"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-sync-frequency">
                                    <SelectValue placeholder="Select frequency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="realtime">Real-time</SelectItem>
                                  <SelectItem value="hourly">Hourly</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createForm.control}
                          name="config"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Configuration (JSON)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder='{"endpoint": "https://..."}'
                                  rows={4}
                                  {...field}
                                  data-testid="input-integration-config"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCreateOpen(false)}
                            data-testid="button-cancel-create"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createMutation.isPending}
                            data-testid="button-submit-create"
                          >
                            {createMutation.isPending ? "Creating..." : "Create Integration"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoading ? (
                <div className="text-center py-8" data-testid="loading-state">
                  <p className="text-muted-foreground">Loading integrations...</p>
                </div>
              ) : integrations.length === 0 ? (
                <Card data-testid="empty-state">
                  <CardContent className="py-12 text-center">
                    <Plug className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Integrations</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't set up any custom integrations yet.
                    </p>
                    <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-integration">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Integration
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {integrations.map((integration) => (
                    <Card key={integration.id} data-testid={`integration-card-${integration.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Settings className="h-5 w-5 text-muted-foreground" />
                              <h3 className="font-medium" data-testid={`text-integration-name-${integration.id}`}>
                                {integration.name}
                              </h3>
                              {getStatusBadge(integration.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span data-testid={`text-integration-type-${integration.id}`}>
                                Type: {getTypeLabel(integration.type)}
                              </span>
                              <span>
                                Sync: {integration.syncFrequency || "N/A"}
                              </span>
                              {integration.lastSyncAt && (
                                <span className="flex items-center gap-1" data-testid={`text-last-sync-${integration.id}`}>
                                  <Clock className="h-3 w-3" />
                                  Last sync: {format(new Date(integration.lastSyncAt), "PPp")}
                                </span>
                              )}
                            </div>
                            {integration.lastError && (
                              <p className="text-sm text-destructive mt-2" data-testid={`text-error-${integration.id}`}>
                                Error: {integration.lastError}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTest(integration)}
                              disabled={testMutation.isPending}
                              data-testid={`button-test-${integration.id}`}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Test
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(integration)}
                              data-testid={`button-edit-${integration.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(integration)}
                              data-testid={`button-delete-${integration.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </FeatureGate>
        </div>
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Integration</DialogTitle>
            <DialogDescription>
              Update integration settings
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Integration name"
                        {...field}
                        data-testid="input-edit-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="webhook">Webhook</SelectItem>
                        <SelectItem value="sftp">SFTP</SelectItem>
                        <SelectItem value="api">REST API</SelectItem>
                        <SelectItem value="ehr">EHR System</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="syncFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sync Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "daily"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-frequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="config"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Configuration (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"endpoint": "https://..."}'
                        rows={4}
                        {...field}
                        data-testid="input-edit-config"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedIntegration?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
