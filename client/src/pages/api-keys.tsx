import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FeatureGate } from "@/components/FeatureGate";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Copy, Key, AlertTriangle, Check, Loader2 } from "lucide-react";
import type { ApiKey } from "@shared/schema";

const AVAILABLE_SCOPES = [
  { value: "read:clients", label: "Read Clients" },
  { value: "write:clients", label: "Write Clients" },
  { value: "read:caregivers", label: "Read Caregivers" },
  { value: "write:caregivers", label: "Write Caregivers" },
  { value: "read:schedules", label: "Read Schedules" },
  { value: "write:schedules", label: "Write Schedules" },
  { value: "read:reports", label: "Read Reports" },
];

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
});

type CreateApiKeyFormData = z.infer<typeof createApiKeySchema>;

type ApiKeyWithoutHash = Omit<ApiKey, "keyHash">;

interface CreatedKeyResponse extends ApiKeyWithoutHash {
  key: string;
}

function ApiKeysContent() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: apiKeys = [], isLoading } = useQuery<ApiKeyWithoutHash[]>({
    queryKey: ["/api/api-keys"],
  });

  const form = useForm<CreateApiKeyFormData>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { name: "", scopes: [] },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateApiKeyFormData) => {
      const res = await apiRequest("POST", "/api/api-keys", data);
      return res.json() as Promise<CreatedKeyResponse>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setCreatedKey(data.key);
      form.reset();
      toast({ title: "API key created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create API key", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API key revoked successfully" });
    },
    onError: () => {
      toast({ title: "Failed to revoke API key", variant: "destructive" });
    },
  });

  const onSubmit = (data: CreateApiKeyFormData) => {
    createMutation.mutate(data);
  };

  const handleCopyKey = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "API key copied to clipboard" });
    }
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreatedKey(null);
    setCopied(false);
    form.reset();
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">API Keys</h1>
              <p className="text-muted-foreground">Manage API keys for external integrations</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              if (!open) handleCloseCreateDialog();
              else setIsCreateDialogOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-api-key">
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                {createdKey ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-500" />
                        API Key Created
                      </DialogTitle>
                      <DialogDescription>
                        Copy your API key now. You won't be able to see it again!
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          This is the only time you'll see this key. Store it securely.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <code
                          className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono break-all"
                          data-testid="text-created-api-key"
                        >
                          {createdKey}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyKey}
                          data-testid="button-copy-api-key"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCloseCreateDialog} data-testid="button-done-api-key">
                        Done
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Create API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key for external integrations
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Production Integration"
                                  {...field}
                                  data-testid="input-api-key-name"
                                />
                              </FormControl>
                              <FormDescription>
                                A friendly name to identify this API key
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="scopes"
                          render={() => (
                            <FormItem>
                              <FormLabel>Scopes</FormLabel>
                              <FormDescription>
                                Select the permissions for this API key
                              </FormDescription>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {AVAILABLE_SCOPES.map((scope) => (
                                  <FormField
                                    key={scope.value}
                                    control={form.control}
                                    name="scopes"
                                    render={({ field }) => (
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(scope.value)}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                field.onChange([...field.value, scope.value]);
                                              } else {
                                                field.onChange(
                                                  field.value?.filter((v) => v !== scope.value)
                                                );
                                              }
                                            }}
                                            data-testid={`checkbox-scope-${scope.value}`}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          {scope.label}
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={createMutation.isPending}
                            data-testid="button-submit-api-key"
                          >
                            {createMutation.isPending && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Create Key
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Your API Keys
              </CardTitle>
              <CardDescription>
                API keys allow external applications to access your organization's data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3" data-testid="loading-api-keys">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div
                  className="text-center py-12 text-muted-foreground"
                  data-testid="empty-state-api-keys"
                >
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No API Keys</h3>
                  <p className="mb-4">Create your first API key to get started with integrations</p>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    data-testid="button-create-first-api-key"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((apiKey) => (
                      <TableRow key={apiKey.id} data-testid={`row-api-key-${apiKey.id}`}>
                        <TableCell className="font-medium">{apiKey.name}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {apiKey.keyPrefix}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {apiKey.scopes?.slice(0, 2).map((scope) => (
                              <Badge key={scope} variant="secondary" className="text-xs">
                                {scope}
                              </Badge>
                            ))}
                            {apiKey.scopes && apiKey.scopes.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{apiKey.scopes.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(apiKey.createdAt)}</TableCell>
                        <TableCell>{formatDate(apiKey.lastUsedAt)}</TableCell>
                        <TableCell>{apiKey.requestCount || 0}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-api-key-${apiKey.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke "{apiKey.name}"? Any applications
                                  using this key will immediately lose access. This action cannot be
                                  undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-delete-api-key">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(apiKey.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid="button-confirm-delete-api-key"
                                >
                                  Revoke Key
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function ApiKeys() {
  return (
    <FeatureGate feature="api_access">
      <ApiKeysContent />
    </FeatureGate>
  );
}
