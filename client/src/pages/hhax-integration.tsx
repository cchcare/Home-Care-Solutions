import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Server, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Building,
  Users,
  Calendar,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Link as LinkIcon
} from "lucide-react";
import { format } from "date-fns";
import type { Office, HhaxOfficeMapping, HhaxSyncLog } from "@shared/schema";

const officeMappingSchema = z.object({
  officeId: z.string().min(1, "Please select an office"),
  hhaxOfficeName: z.string().min(1, "HHAX Branch name is required"),
  hhaxOfficeCode: z.string().optional(),
});

type OfficeMappingFormData = z.infer<typeof officeMappingSchema>;

interface ConnectionTestResult {
  success: boolean;
  message: string;
  directories?: string[];
}

export default function HhaxIntegration() {
  const { toast } = useToast();
  const [addMappingOpen, setAddMappingOpen] = useState(false);
  const [fallbackOfficeId, setFallbackOfficeId] = useState<string>("");

  const { data: connectionTest, isLoading: testingConnection, refetch: testConnection } = useQuery<ConnectionTestResult>({
    queryKey: ["/api/hhax/test-connection"],
    enabled: false,
    retry: false,
  });

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const { data: officeMappings = [], isLoading: loadingMappings } = useQuery<HhaxOfficeMapping[]>({
    queryKey: ["/api/hhax/office-mappings"],
  });

  const { data: syncLogs = [], isLoading: loadingSyncLogs } = useQuery<HhaxSyncLog[]>({
    queryKey: ["/api/hhax/sync-logs"],
  });

  const { data: outboxFiles = [], isLoading: loadingFiles, refetch: refreshFiles } = useQuery<{ name: string; size: number; modifyTime: string }[]>({
    queryKey: ["/api/hhax/files"],
    enabled: false,
    retry: false,
  });

  const form = useForm<OfficeMappingFormData>({
    resolver: zodResolver(officeMappingSchema),
    defaultValues: {
      officeId: "",
      hhaxOfficeName: "",
      hhaxOfficeCode: "",
    },
  });

  const createMappingMutation = useMutation({
    mutationFn: async (data: OfficeMappingFormData) => {
      const response = await apiRequest("POST", "/api/hhax/office-mappings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hhax/office-mappings"] });
      setAddMappingOpen(false);
      form.reset();
      toast({ title: "Success", description: "Office mapping created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create office mapping", variant: "destructive" });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/hhax/office-mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hhax/office-mappings"] });
      toast({ title: "Success", description: "Office mapping deleted" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (type: "caregivers" | "clients" | "schedules") => {
      const response = await apiRequest("POST", `/api/hhax/import/${type}`, {
        fallbackOfficeId: fallbackOfficeId || undefined,
      });
      return response.json();
    },
    onSuccess: (result, type) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hhax/sync-logs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/${type}`] });
      toast({
        title: "Import Complete",
        description: `Created: ${result.recordsCreated}, Updated: ${result.recordsUpdated}, Failed: ${result.recordsFailed}`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });

  const fullSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/hhax/sync-all", {
        fallbackOfficeId: fallbackOfficeId || undefined,
      });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hhax/sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Full Sync Complete",
        description: `Clients: ${result.results.clients.recordsCreated + result.results.clients.recordsUpdated}, Caregivers: ${result.results.caregivers.recordsCreated + result.results.caregivers.recordsUpdated}, Schedules: ${result.results.schedules.recordsCreated}`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOfficeName = (officeId: string) => {
    const office = offices.find(o => o.id === officeId);
    return office?.name || officeId;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">HHAeXchange Integration</h1>
          <p className="text-muted-foreground">Import caregivers, clients, and schedules from HHAeXchange</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => testConnection()}
            disabled={testingConnection}
            data-testid="button-test-connection"
          >
            {testingConnection ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Server className="w-4 h-4 mr-2" />}
            Test Connection
          </Button>
          <Button
            onClick={() => fullSyncMutation.mutate()}
            disabled={fullSyncMutation.isPending}
            data-testid="button-full-sync"
          >
            {fullSyncMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Full Sync
          </Button>
        </div>
      </div>

      {connectionTest && (
        <Card className={connectionTest.success ? "border-green-500" : "border-red-500"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {connectionTest.success ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-700">Connection successful</span>
                  {connectionTest.directories && (
                    <span className="text-muted-foreground ml-2">
                      Directories: {connectionTest.directories.join(", ")}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700">{connectionTest.message}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import" data-testid="tab-import">Import Data</TabsTrigger>
          <TabsTrigger value="mappings" data-testid="tab-mappings">Branch Mapping</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">Sync History</TabsTrigger>
          <TabsTrigger value="files" data-testid="tab-files">SFTP Files</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fallback Office</CardTitle>
              <CardDescription>
                Select a default office for records when Branch mapping is not found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={fallbackOfficeId || "__none__"} onValueChange={(v) => setFallbackOfficeId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full md:w-[300px]" data-testid="select-fallback-office">
                  <SelectValue placeholder="Select fallback office (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No fallback (skip unmatched)</SelectItem>
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fallbackOfficeId && (
                <p className="text-sm text-muted-foreground mt-2">
                  Records without a matching Branch mapping will be assigned to: <strong>{getOfficeName(fallbackOfficeId)}</strong>
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Import Caregivers
                </CardTitle>
                <CardDescription>
                  Import caregiver records from HHAeXchange export files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => importMutation.mutate("caregivers")}
                  disabled={importMutation.isPending}
                  className="w-full"
                  data-testid="button-import-caregivers"
                >
                  {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Import Caregivers
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Import Clients
                </CardTitle>
                <CardDescription>
                  Import patient/client records from HHAeXchange export files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => importMutation.mutate("clients")}
                  disabled={importMutation.isPending}
                  className="w-full"
                  data-testid="button-import-clients"
                >
                  {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Import Clients
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Import Schedules
                </CardTitle>
                <CardDescription>
                  Import schedule records from HHAeXchange export files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => importMutation.mutate("schedules")}
                  disabled={importMutation.isPending}
                  className="w-full"
                  data-testid="button-import-schedules"
                >
                  {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Import Schedules
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mappings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Branch to Office Mapping</CardTitle>
                <CardDescription>
                  Map HHAeXchange Branch names to your local offices
                </CardDescription>
              </div>
              <Dialog open={addMappingOpen} onOpenChange={setAddMappingOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-mapping">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Mapping
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Office Mapping</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => createMappingMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="officeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Local Office</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-office">
                                  <SelectValue placeholder="Select office" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {offices.map((office) => (
                                  <SelectItem key={office.id} value={office.id}>
                                    {office.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hhaxOfficeName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>HHAX Branch Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Pittsburgh" {...field} data-testid="input-hhax-office-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hhaxOfficeCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>HHAX Branch Code (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., PIT001" {...field} data-testid="input-hhax-office-code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createMappingMutation.isPending} className="w-full" data-testid="button-save-mapping">
                        {createMappingMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Mapping
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingMappings ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : officeMappings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No office mappings configured yet.</p>
                  <p className="text-sm">Add mappings to link HHAeXchange branches to your local offices.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Local Office</TableHead>
                      <TableHead>HHAX Branch</TableHead>
                      <TableHead>HHAX Branch Code</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {officeMappings.map((mapping) => (
                      <TableRow key={mapping.id} data-testid={`row-mapping-${mapping.id}`}>
                        <TableCell>{getOfficeName(mapping.officeId)}</TableCell>
                        <TableCell>{mapping.hhaxOfficeName}</TableCell>
                        <TableCell>{mapping.hhaxOfficeCode || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMappingMutation.mutate(mapping.id)}
                            data-testid={`button-delete-mapping-${mapping.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>Recent import and sync operations</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSyncLogs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : syncLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No sync history yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Failed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id} data-testid={`row-synclog-${log.id}`}>
                        <TableCell>
                          {log.startedAt ? format(new Date(log.startedAt), "MMM d, yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="capitalize">{log.syncType}</TableCell>
                        <TableCell>{getStatusBadge(log.status || "pending")}</TableCell>
                        <TableCell>{log.recordsTotal}</TableCell>
                        <TableCell className="text-green-600">{log.recordsCreated}</TableCell>
                        <TableCell className="text-blue-600">{log.recordsUpdated}</TableCell>
                        <TableCell className="text-red-600">{log.recordsFailed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SFTP Outbox Files</CardTitle>
                <CardDescription>Files available for import from HHAeXchange</CardDescription>
              </div>
              <Button variant="outline" onClick={() => refreshFiles()} disabled={loadingFiles} data-testid="button-refresh-files">
                {loadingFiles ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingFiles ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : outboxFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Refresh" to load files from the SFTP server.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Modified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outboxFiles.map((file, index) => (
                      <TableRow key={index} data-testid={`row-file-${index}`}>
                        <TableCell className="font-mono text-sm">{file.name}</TableCell>
                        <TableCell>{(file.size / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>
                          {format(new Date(file.modifyTime), "MMM d, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
