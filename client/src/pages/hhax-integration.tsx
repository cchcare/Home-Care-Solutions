import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  AlertCircle,
  Building,
  Users,
  Calendar,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Link as LinkIcon,
  Eye,
  FileWarning,
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

type ImportTarget = "caregivers" | "clients" | "schedules";

interface ImportResultPayload {
  success: boolean;
  recordsTotal: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: string[];
  fileName?: string | null;
  unrecognizedHeaders?: string[];
  dryRun?: boolean;
  syncLogId?: string;
}

interface ImportResultState {
  target: ImportTarget | "full-sync";
  label: string;
  result: ImportResultPayload;
  /** Optional secondary results for the full-sync flow. */
  extraStages?: { label: string; result: ImportResultPayload }[];
}

interface OutboxFile {
  name: string;
  size: number;
  modifyTime: string;
}

const TARGET_LABEL: Record<ImportTarget, string> = {
  caregivers: "Caregivers",
  clients: "Clients",
  schedules: "Schedules",
};

export default function HhaxIntegration() {
  const { toast } = useToast();
  const [addMappingOpen, setAddMappingOpen] = useState(false);
  const [fallbackOfficeId, setFallbackOfficeId] = useState<string>("");
  const [importResult, setImportResult] = useState<ImportResultState | null>(null);
  const [activeLog, setActiveLog] = useState<HhaxSyncLog | null>(null);
  const validateFileRef = useRef<HTMLInputElement>(null);
  const [validateTarget, setValidateTarget] = useState<ImportTarget>("caregivers");

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

  // Inline Outbox listing on the Import tab — auto-loads so the user can see
  // immediately what files HHAX has actually placed there.
  const {
    data: outboxFiles = [],
    isLoading: loadingFiles,
    refetch: refreshFiles,
    isFetching: refetchingFiles,
    error: outboxError,
  } = useQuery<OutboxFile[]>({
    queryKey: ["/api/hhax/files"],
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
    mutationFn: async (type: ImportTarget): Promise<{ type: ImportTarget; payload: ImportResultPayload }> => {
      const response = await apiRequest("POST", `/api/hhax/import/${type}`, {
        fallbackOfficeId: fallbackOfficeId || undefined,
      });
      const payload = (await response.json()) as ImportResultPayload;
      return { type, payload };
    },
    onSuccess: ({ type, payload }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hhax/sync-logs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/${type}`] });
      setImportResult({
        target: type,
        label: `${TARGET_LABEL[type]} import`,
        result: payload,
      });
    },
    onError: (error: any, type) => {
      setImportResult({
        target: (type as ImportTarget) || "caregivers",
        label: `${TARGET_LABEL[(type as ImportTarget) || "caregivers"]} import`,
        result: {
          success: false,
          recordsTotal: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          recordsFailed: 0,
          errors: [error?.message || "Import request failed"],
        },
      });
    },
  });

  const fullSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/hhax/sync-all", {
        fallbackOfficeId: fallbackOfficeId || undefined,
      });
      return response.json() as Promise<{
        results: { caregivers: ImportResultPayload; clients: ImportResultPayload; schedules: ImportResultPayload };
      }>;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hhax/sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      const { caregivers, clients, schedules } = response.results;
      // Show all 3 stages together; show clients first (they ran first server-side).
      setImportResult({
        target: "full-sync",
        label: "Full sync",
        result: clients,
        extraStages: [
          { label: "Caregivers", result: caregivers },
          { label: "Schedules", result: schedules },
        ],
      });
    },
    onError: (error: any) => {
      setImportResult({
        target: "full-sync",
        label: "Full sync",
        result: {
          success: false,
          recordsTotal: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          recordsFailed: 0,
          errors: [error?.message || "Full sync request failed"],
        },
      });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: ImportTarget }): Promise<{ type: ImportTarget; payload: ImportResultPayload }> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const response = await fetch("/api/hhax/validate-file", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      let payload: ImportResultPayload;
      try {
        payload = await response.json();
      } catch {
        payload = {
          success: false,
          recordsTotal: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          recordsFailed: 0,
          errors: [`Validation failed (HTTP ${response.status})`],
        };
      }
      if (!response.ok && (!payload.errors || payload.errors.length === 0)) {
        payload.errors = [(payload as any)?.message || `Validation failed (HTTP ${response.status})`];
        payload.success = false;
      }
      return { type, payload };
    },
    onSuccess: ({ type, payload }) => {
      setImportResult({
        target: type,
        label: `${TARGET_LABEL[type]} sample validation (dry run — no records were saved)`,
        result: { ...payload, dryRun: true },
      });
    },
    onError: (error: any) => {
      setImportResult({
        target: validateTarget,
        label: `${TARGET_LABEL[validateTarget]} sample validation (dry run — no records were saved)`,
        result: {
          success: false,
          recordsTotal: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          recordsFailed: 0,
          errors: [error?.message || "Validation request failed"],
        },
      });
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

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) validateMutation.mutate({ file, type: validateTarget });
    event.target.value = "";
  };

  const noMappings = officeMappings.length === 0;
  const noFallback = !fallbackOfficeId;
  const showRoutingWarning = noMappings && noFallback;

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
          {showRoutingWarning && (
            <Card className="border-amber-300 bg-amber-50" data-testid="card-routing-warning">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold">No routing configured</p>
                    <p>
                      You haven't added any HHAeXchange Branch → office mappings, and no fallback office is selected.
                      Imported records will be created without an office assignment, and they'll be invisible to office-scoped users.
                      Add at least one mapping under <strong>Branch Mapping</strong>, or pick a fallback office below before importing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Inline Outbox listing — answers "is HHAX even putting files there?" */}
          <Card data-testid="card-outbox-summary">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  HHAeXchange Outbox
                </CardTitle>
                <CardDescription>
                  Files currently sitting in <code className="font-mono text-xs">/Outbox</code> on the SFTP server
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshFiles()}
                disabled={loadingFiles || refetchingFiles}
                data-testid="button-refresh-outbox"
              >
                {(loadingFiles || refetchingFiles) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingFiles ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : outboxError ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900" data-testid="text-outbox-error">
                  Couldn't list /Outbox: {(outboxError as any)?.message || "Unknown error"}
                </div>
              ) : outboxFiles.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2" data-testid="text-outbox-empty">
                  <div className="flex items-center gap-2 font-semibold">
                    <FileWarning className="w-4 h-4" />
                    /Outbox is empty
                  </div>
                  <p>
                    The SFTP connection is working but HHAeXchange hasn't dropped any export files yet.
                    Imports will not pull anything until files appear here.
                  </p>
                  <p className="font-semibold mt-2">On the HHAX side, ask your HHAeXchange admin to:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open <strong>Admin → Data Exchange → SFTP</strong>.</li>
                    <li>Enable scheduled exports for <em>Caregivers</em>, <em>Patients/Clients</em>, and <em>Schedules</em> (or trigger an on-demand export).</li>
                    <li>Confirm the destination folder is <code className="font-mono text-xs">/Outbox</code> on the same SFTP account.</li>
                    <li>Wait for the scheduled run, then click <strong>Refresh</strong> above.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2">
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
                        <TableRow key={index} data-testid={`row-outbox-${index}`}>
                          <TableCell className="font-mono text-sm">{file.name}</TableCell>
                          <TableCell>{(file.size / 1024).toFixed(1)} KB</TableCell>
                          <TableCell>{format(new Date(file.modifyTime), "MMM d, yyyy HH:mm")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground">
                    The importer picks the most recently modified file whose name contains any of:
                    <span className="font-mono"> caregiver / aide / employee / staff / worker</span> (caregivers),
                    <span className="font-mono"> patient / client / member / admission</span> (clients), or
                    <span className="font-mono"> schedule / visit / shift / authorization / plan</span> (schedules).
                    Matching is case-insensitive.
                  </p>
                </div>
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
                  {importMutation.isPending && importMutation.variables === "caregivers"
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Download className="w-4 h-4 mr-2" />}
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
                  {importMutation.isPending && importMutation.variables === "clients"
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Download className="w-4 h-4 mr-2" />}
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
                  {importMutation.isPending && importMutation.variables === "schedules"
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Download className="w-4 h-4 mr-2" />}
                  Import Schedules
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Validate sample file — lets the user dry-run a CSV they have on hand */}
          <Card data-testid="card-validate-sample">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Validate sample file
              </CardTitle>
              <CardDescription>
                Upload a CSV exported from HHAeXchange to see exactly which rows would import — no data is written. Useful for checking column names before scheduling the real export.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <Select value={validateTarget} onValueChange={(v) => setValidateTarget(v as ImportTarget)}>
                  <SelectTrigger className="w-full md:w-[220px]" data-testid="select-validate-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caregivers">Caregiver export</SelectItem>
                    <SelectItem value="clients">Patient / Client export</SelectItem>
                    <SelectItem value="schedules">Schedule export</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  ref={validateFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileSelected}
                  data-testid="input-validate-file"
                />
                <Button
                  variant="outline"
                  onClick={() => validateFileRef.current?.click()}
                  disabled={validateMutation.isPending}
                  data-testid="button-validate-upload"
                >
                  {validateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Choose CSV…
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The dry run reports how many rows would be created vs. updated, plus any unrecognized column headers and per-row errors — exactly the same checks the real import runs.
              </p>
            </CardContent>
          </Card>
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
                      <TableHead>File</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Failed</TableHead>
                      <TableHead className="w-[110px]">Details</TableHead>
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
                        <TableCell className="font-mono text-xs">{log.fileName || "—"}</TableCell>
                        <TableCell>{log.recordsTotal}</TableCell>
                        <TableCell className="text-green-600">{log.recordsCreated}</TableCell>
                        <TableCell className="text-blue-600">{log.recordsUpdated}</TableCell>
                        <TableCell className="text-red-600">{log.recordsFailed}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveLog(log)}
                            data-testid={`button-view-synclog-${log.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
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

        <TabsContent value="files">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SFTP Outbox Files</CardTitle>
                <CardDescription>Files available for import from HHAeXchange</CardDescription>
              </div>
              <Button variant="outline" onClick={() => refreshFiles()} disabled={loadingFiles || refetchingFiles} data-testid="button-refresh-files">
                {(loadingFiles || refetchingFiles) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
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
                  <p>The /Outbox directory is empty.</p>
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

      <ImportResultDialog
        state={importResult}
        onOpenChange={(open) => { if (!open) setImportResult(null); }}
      />

      <SyncLogDetailsDialog
        log={activeLog}
        onOpenChange={(open) => { if (!open) setActiveLog(null); }}
      />
    </div>
  );
}

// ==================== Import Result Dialog ====================

function StageResultPanel({ label, payload }: { label: string; payload: ImportResultPayload }) {
  const isSuccess = payload.success && payload.recordsFailed === 0;
  const isPartial = payload.success && payload.recordsFailed > 0;
  return (
    <div
      className="rounded-md border p-3 space-y-3"
      data-testid={`panel-stage-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : isPartial ? (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <span className="font-semibold text-sm">{label}</span>
          {payload.dryRun ? (
            <Badge variant="outline" className="text-xs">Dry run</Badge>
          ) : null}
        </div>
        <span className="text-xs font-mono text-muted-foreground" data-testid={`text-stage-file-${label.toLowerCase().replace(/\s+/g, "-")}`}>
          {payload.fileName || "—"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
        <Stat label="Total" value={payload.recordsTotal} />
        <Stat label="Created" value={payload.recordsCreated} className="text-green-700" />
        <Stat label="Updated" value={payload.recordsUpdated} className="text-blue-700" />
        <Stat label="Skipped" value={payload.recordsSkipped} className="text-muted-foreground" />
        <Stat label="Failed" value={payload.recordsFailed} className="text-red-700" />
      </div>

      {payload.unrecognizedHeaders && payload.unrecognizedHeaders.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900" data-testid="section-unrecognized-headers">
          <div className="flex items-center gap-1 font-semibold mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Unrecognized columns ({payload.unrecognizedHeaders.length})
          </div>
          <p className="mb-1">
            These columns from the CSV were ignored. Check the header names if you expected them to map to caregiver/patient fields.
          </p>
          <code className="block whitespace-pre-wrap break-words">
            {payload.unrecognizedHeaders.join(", ")}
          </code>
        </div>
      ) : null}

      {payload.errors.length > 0 ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-900" data-testid="section-stage-errors">
          <div className="flex items-center gap-1 font-semibold mb-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Errors ({payload.errors.length})
          </div>
          <ScrollArea className="max-h-40 pr-2">
            <ul className="space-y-1">
              {payload.errors.map((err, idx) => (
                <li key={idx} className="leading-snug whitespace-pre-wrap break-words" data-testid={`item-stage-error-${idx}`}>
                  • {err}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      ) : null}

      {isSuccess && payload.errors.length === 0 && (!payload.unrecognizedHeaders || payload.unrecognizedHeaders.length === 0) ? (
        <p className="text-xs text-muted-foreground">No warnings or errors. All rows processed cleanly.</p>
      ) : null}
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold ${className || ""}`}>{value}</span>
    </div>
  );
}

function ImportResultDialog({
  state,
  onOpenChange,
}: {
  state: ImportResultState | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = state !== null;
  if (!state) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent className="hidden" />
      </Dialog>
    );
  }
  const primaryLabel =
    state.target === "full-sync"
      ? "Clients"
      : TARGET_LABEL[state.target as ImportTarget];
  const stages: { label: string; payload: ImportResultPayload }[] = [
    { label: primaryLabel, payload: state.result },
    ...((state.extraStages || []).map((s) => ({ label: s.label, payload: s.result }))),
  ];
  const overallOk = stages.every((s) => s.payload.success && s.payload.recordsFailed === 0);
  const anyFailed = stages.some((s) => !s.payload.success);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto" data-testid="dialog-import-result">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {overallOk ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : anyFailed ? (
              <XCircle className="w-5 h-5 text-red-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <span data-testid="text-import-result-title">{state.label}</span>
          </DialogTitle>
          <DialogDescription>
            {state.result.dryRun
              ? "Dry run — no records were created, updated, or deleted."
              : "Review per-stage counts and errors below."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {stages.map((s, i) => (
            <StageResultPanel key={i} label={s.label} payload={s.payload} />
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} data-testid="button-close-import-result">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Sync Log Details Dialog ====================

function SyncLogDetailsDialog({
  log,
  onOpenChange,
}: {
  log: HhaxSyncLog | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = log !== null;
  if (!log) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent className="hidden" />
      </Dialog>
    );
  }
  // errorDetails can be: null | string[] (legacy) | { errors: string[]; unrecognizedHeaders: string[] }
  const raw = log.errorDetails as unknown;
  let errors: string[] = [];
  let unrecognizedHeaders: string[] = [];
  if (Array.isArray(raw)) {
    errors = raw.filter((e): e is string => typeof e === "string");
  } else if (raw && typeof raw === "object") {
    const obj = raw as { errors?: unknown; unrecognizedHeaders?: unknown };
    if (Array.isArray(obj.errors)) errors = obj.errors.filter((e): e is string => typeof e === "string");
    if (Array.isArray(obj.unrecognizedHeaders))
      unrecognizedHeaders = obj.unrecognizedHeaders.filter((h): h is string => typeof h === "string");
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto" data-testid="dialog-synclog-details">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {log.syncType} sync — {log.status}
          </DialogTitle>
          <DialogDescription>
            {log.startedAt ? `Started ${format(new Date(log.startedAt), "MMM d, yyyy HH:mm:ss")}` : null}
            {log.completedAt ? ` · Finished ${format(new Date(log.completedAt), "HH:mm:ss")}` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {log.fileName ? (
            <div className="text-sm">
              <span className="text-muted-foreground">Source file:</span>{" "}
              <code className="font-mono text-xs">{log.fileName}</code>
            </div>
          ) : null}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
            <Stat label="Total" value={log.recordsTotal ?? 0} />
            <Stat label="Created" value={log.recordsCreated ?? 0} className="text-green-700" />
            <Stat label="Updated" value={log.recordsUpdated ?? 0} className="text-blue-700" />
            <Stat label="Skipped" value={log.recordsSkipped ?? 0} className="text-muted-foreground" />
            <Stat label="Failed" value={log.recordsFailed ?? 0} className="text-red-700" />
          </div>

          {unrecognizedHeaders.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-center gap-1 font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" />
                Unrecognized columns ({unrecognizedHeaders.length})
              </div>
              <code className="text-xs block whitespace-pre-wrap break-words">
                {unrecognizedHeaders.join(", ")}
              </code>
            </div>
          ) : null}

          {errors.length > 0 ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <div className="flex items-center gap-1 font-semibold mb-2">
                <AlertCircle className="w-4 h-4" />
                Errors ({errors.length})
              </div>
              <ScrollArea className="max-h-64 pr-3">
                <ul className="space-y-1 text-xs">
                  {errors.map((err, idx) => (
                    <li key={idx} className="leading-snug whitespace-pre-wrap break-words" data-testid={`item-log-error-${idx}`}>
                      • {err}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No errors were recorded for this run.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} data-testid="button-close-synclog-details">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
