import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Shield, 
  RefreshCw, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Users,
  FileText,
  Loader2,
  Database,
  Search,
  FileSpreadsheet,
  Calendar,
  Eye,
  Trash2,
  Check,
  X,
  BarChart3,
  AlertCircle,
} from "lucide-react";

interface DashboardStats {
  pendingReviews: number;
  confirmedExclusions: number;
  falsePositives: number;
  totalOigRecords: number;
  totalMedicheckRecords: number;
  totalSamRecords: number;
}

interface DataSource {
  id: string;
  name: string;
  type: "oig" | "medicheck" | "sam";
  lastRefreshDate: string | null;
  recordCount: number;
  status: "active" | "stale" | "error";
}

interface ExclusionCheck {
  id: string;
  caregiverId: string;
  caregiverName: string;
  source: "oig" | "medicheck" | "sam";
  matchedName: string;
  matchScore: number;
  matchReason: "npi" | "license_number" | "name_exact" | "name_fuzzy" | null;
  matchedIdentifier: string | null;
  status: "possible_match" | "confirmed" | "false_positive" | "cleared";
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  notes: string | null;
}

interface FalsePositive {
  id: string;
  caregiverId: string;
  caregiverName: string;
  source: "oig" | "medicheck" | "sam";
  excludedName: string;
  reason: string;
  createdAt: string;
  createdBy: string;
}

interface ExclusionReport {
  id: string;
  month: string;
  year: number;
  generatedAt: string;
  totalChecked: number;
  possibleMatches: number;
  confirmedExclusions: number;
  falsePositives: number;
  status: "completed" | "pending";
}

interface ImportResultState {
  source: "medicheck" | "sam";
  ok: boolean;
  status: number;
  recordCount: number;
  warnings: string[];
  errors: string[];
}

async function uploadExclusionCsv(
  url: string,
  file: File,
): Promise<Omit<ImportResultState, "source">> {
  const formData = new FormData();
  formData.append("file", file);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch (networkErr: any) {
    return {
      ok: false,
      status: 0,
      recordCount: 0,
      warnings: [],
      errors: [networkErr?.message || "Network error while uploading"],
    };
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const errors: string[] = Array.isArray(body?.errors)
    ? body.errors.filter((e: unknown): e is string => typeof e === "string")
    : [];
  const warnings: string[] = Array.isArray(body?.warnings)
    ? body.warnings.filter((w: unknown): w is string => typeof w === "string")
    : [];
  if (!res.ok && errors.length === 0) {
    errors.push(
      typeof body?.message === "string" && body.message
        ? body.message
        : `Upload failed (HTTP ${res.status})`,
    );
  }
  const recordCount =
    typeof body?.recordCount === "number" ? body.recordCount : 0;
  const ok = res.ok && body?.success !== false;
  return { ok, status: res.status, recordCount, warnings, errors };
}

export default function ExclusionVerification() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<ExclusionCheck | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<string>("");
  const medicheckFileRef = useRef<HTMLInputElement>(null);
  const samFileRef = useRef<HTMLInputElement>(null);
  const [medicheckRecordsOpen, setMedicheckRecordsOpen] = useState(false);
  const [samRecordsOpen, setSamRecordsOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResultState | null>(null);

  const { data: dashboardStats, isLoading: loadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/exclusions/dashboard"],
  });

  const { data: dataSources = [], isLoading: loadingSources } = useQuery<DataSource[]>({
    queryKey: ["/api/exclusions/sources"],
  });

  const { data: pendingChecks = [], isLoading: loadingChecks } = useQuery<ExclusionCheck[]>({
    queryKey: ["/api/exclusions/checks", { status: "possible_match" }],
  });

  const { data: falsePositives = [], isLoading: loadingFalsePositives } = useQuery<FalsePositive[]>({
    queryKey: ["/api/exclusions/false-positives"],
  });

  const { data: reports = [], isLoading: loadingReports } = useQuery<ExclusionReport[]>({
    queryKey: ["/api/exclusions/reports"],
  });

  const refreshOigMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/exclusions/refresh/oig");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/dashboard"] });
      toast({ title: "Success", description: "OIG data refreshed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to refresh OIG data", variant: "destructive" });
    },
  });

  const uploadMedicheckMutation = useMutation({
    mutationFn: (file: File) =>
      uploadExclusionCsv("/api/exclusions/upload/medicheck", file),
    onSuccess: (result) => {
      // Only refetch the dependent lists when the import actually changed
      // server-side state — failed uploads leave the source untouched.
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/exclusions/sources"] });
        queryClient.invalidateQueries({ queryKey: ["/api/exclusions/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/exclusions/records", { sourceType: "medicheck" }] });
      }
      setImportResult({ source: "medicheck", ...result });
    },
    onError: (err: any) => {
      // Defensive: uploadExclusionCsv catches network errors itself, but if
      // anything ever throws we still surface the result panel so the user
      // never loses feedback.
      setImportResult({
        source: "medicheck",
        ok: false,
        status: 0,
        recordCount: 0,
        warnings: [],
        errors: [err?.message || "Unknown error"],
      });
    },
  });

  const uploadSamMutation = useMutation({
    mutationFn: (file: File) =>
      uploadExclusionCsv("/api/exclusions/upload/sam", file),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/exclusions/sources"] });
        queryClient.invalidateQueries({ queryKey: ["/api/exclusions/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/exclusions/records", { sourceType: "sam" }] });
      }
      setImportResult({ source: "sam", ...result });
    },
    onError: (err: any) => {
      // See comment above — fallback panel for unexpected throws only.
      setImportResult({
        source: "sam",
        ok: false,
        status: 0,
        recordCount: 0,
        warnings: [],
        errors: [err?.message || "Unknown error"],
      });
    },
  });

  const runCheckMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/exclusions/run-check");
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/checks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/dashboard"] });
      toast({ 
        title: "Check Complete", 
        description: `Checked ${result.totalChecked} caregivers. Found ${result.possibleMatches} possible matches.` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to run exclusion check", variant: "destructive" });
    },
  });

  const updateCheckMutation = useMutation({
    mutationFn: async ({ checkId, status, notes }: { checkId: string; status: string; notes: string }) => {
      const response = await apiRequest("PATCH", `/api/exclusions/checks/${checkId}`, { status, notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/checks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/false-positives"] });
      setReviewDialogOpen(false);
      setSelectedCheck(null);
      setReviewNotes("");
      setReviewStatus("");
      toast({ title: "Success", description: "Review saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save review", variant: "destructive" });
    },
  });

  const deleteFalsePositiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/exclusions/false-positives/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/false-positives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/dashboard"] });
      toast({ title: "Success", description: "False positive removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove false positive", variant: "destructive" });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/exclusions/reports/generate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/reports"] });
      toast({ title: "Success", description: "Report generated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate report", variant: "destructive" });
    },
  });

  const handleFileUpload = (type: "medicheck" | "sam", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (type === "medicheck") {
        uploadMedicheckMutation.mutate(file);
      } else {
        uploadSamMutation.mutate(file);
      }
    }
    event.target.value = "";
  };

  const openReviewDialog = (check: ExclusionCheck) => {
    setSelectedCheck(check);
    setReviewNotes(check.notes || "");
    setReviewStatus("");
    setReviewDialogOpen(true);
  };

  const handleReviewSubmit = () => {
    if (selectedCheck && reviewStatus) {
      updateCheckMutation.mutate({
        checkId: selectedCheck.id,
        status: reviewStatus,
        notes: reviewNotes,
      });
    }
  };

  const getMatchReasonBadge = (check: ExclusionCheck) => {
    const id = check.matchedIdentifier || "";
    const score = typeof check.matchScore === "number" ? Math.round(check.matchScore) : 0;
    switch (check.matchReason) {
      case "npi":
        return (
          <Badge className="bg-red-100 text-red-800" data-testid={`badge-reason-npi-${check.id}`}>
            NPI {id || "match"} (exact)
          </Badge>
        );
      case "license_number":
        return (
          <Badge className="bg-red-100 text-red-800" data-testid={`badge-reason-license-${check.id}`}>
            License {id || "match"} (exact)
          </Badge>
        );
      case "name_exact":
        return (
          <Badge className="bg-amber-100 text-amber-800" data-testid={`badge-reason-name-exact-${check.id}`}>
            Name match — exact
          </Badge>
        );
      case "name_fuzzy":
        return (
          <Badge variant="outline" data-testid={`badge-reason-name-fuzzy-${check.id}`}>
            Name match — {score}%
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" data-testid={`badge-reason-unknown-${check.id}`}>
            {score ? `Name match — ${score}%` : "Match"}
          </Badge>
        );
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "oig":
        return <Badge className="bg-blue-100 text-blue-800">OIG</Badge>;
      case "medicheck":
        return <Badge className="bg-purple-100 text-purple-800">Medicheck</Badge>;
      case "sam":
        return <Badge className="bg-orange-100 text-orange-800">SAM.gov</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "stale":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Stale</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case "possible_match":
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case "confirmed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case "false_positive":
        return <Badge className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />False Positive</Badge>;
      case "cleared":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Cleared</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-page-title">Exclusion Verification</h1>
                <p className="text-muted-foreground">Manage caregiver exclusion checks against OIG, Medicheck, and SAM.gov databases</p>
              </div>
              <Button
                onClick={() => runCheckMutation.mutate()}
                disabled={runCheckMutation.isPending}
                data-testid="button-run-check"
              >
                {runCheckMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Run Exclusion Check
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="sources" data-testid="tab-sources">
                  <Database className="w-4 h-4 mr-2" />
                  Data Sources
                </TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Pending Reviews
                  {pendingChecks.length > 0 && (
                    <Badge variant="destructive" className="ml-2">{pendingChecks.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="false-positives" data-testid="tab-false-positives">
                  <Check className="w-4 h-4 mr-2" />
                  False Positives
                </TabsTrigger>
                <TabsTrigger value="reports" data-testid="tab-reports">
                  <FileText className="w-4 h-4 mr-2" />
                  Reports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-4">
                {loadingStats ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card data-testid="card-pending-reviews">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats?.pendingReviews || 0}</div>
                        <p className="text-xs text-muted-foreground">Caregivers requiring review</p>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-confirmed-exclusions">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Confirmed Exclusions</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats?.confirmedExclusions || 0}</div>
                        <p className="text-xs text-muted-foreground">Caregivers with confirmed exclusions</p>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-false-positives">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">False Positives</CardTitle>
                        <Check className="h-4 w-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats?.falsePositives || 0}</div>
                        <p className="text-xs text-muted-foreground">Marked as false positive</p>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-oig-records">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">OIG Records</CardTitle>
                        <Database className="h-4 w-4 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats?.totalOigRecords || 0}</div>
                        <p className="text-xs text-muted-foreground">Total exclusion records</p>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-medicheck-records">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Medicheck Records</CardTitle>
                        <Database className="h-4 w-4 text-purple-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats?.totalMedicheckRecords || 0}</div>
                        <p className="text-xs text-muted-foreground">Total exclusion records</p>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-sam-records">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">SAM.gov Records</CardTitle>
                        <Database className="h-4 w-4 text-orange-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats?.totalSamRecords || 0}</div>
                        <p className="text-xs text-muted-foreground">Total exclusion records</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sources" className="space-y-4">
                <input
                  type="file"
                  ref={medicheckFileRef}
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => handleFileUpload("medicheck", e)}
                  data-testid="input-medicheck-file"
                />
                <input
                  type="file"
                  ref={samFileRef}
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => handleFileUpload("sam", e)}
                  data-testid="input-sam-file"
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <Card data-testid="card-source-oig">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-600" />
                          OIG LEIE
                        </CardTitle>
                        {getStatusBadge(dataSources.find(s => s.type === "oig")?.status || "stale")}
                      </div>
                      <CardDescription>
                        Office of Inspector General List of Excluded Individuals/Entities
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Records:</span>
                          <span className="font-medium">{dataSources.find(s => s.type === "oig")?.recordCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Refresh:</span>
                          <span className="font-medium">
                            {dataSources.find(s => s.type === "oig")?.lastRefreshDate
                              ? format(new Date(dataSources.find(s => s.type === "oig")!.lastRefreshDate!), "MMM d, yyyy")
                              : "Never"}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => refreshOigMutation.mutate()}
                        disabled={refreshOigMutation.isPending}
                        data-testid="button-refresh-oig"
                      >
                        {refreshOigMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Refresh from OIG
                      </Button>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-source-medicheck">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                          Medicheck
                        </CardTitle>
                        {getStatusBadge(dataSources.find(s => s.type === "medicheck")?.status || "stale")}
                      </div>
                      <CardDescription>
                        Medicheck exclusion database
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Records:</span>
                          <span className="font-medium">{dataSources.find(s => s.type === "medicheck")?.recordCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Upload:</span>
                          <span className="font-medium">
                            {dataSources.find(s => s.type === "medicheck")?.lastRefreshDate
                              ? format(new Date(dataSources.find(s => s.type === "medicheck")!.lastRefreshDate!), "MMM d, yyyy")
                              : "Never"}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => medicheckFileRef.current?.click()}
                        disabled={uploadMedicheckMutation.isPending}
                        data-testid="button-upload-medicheck"
                      >
                        {uploadMedicheckMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload CSV
                      </Button>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setMedicheckRecordsOpen(true)}
                        disabled={(dataSources.find(s => s.type === "medicheck")?.recordCount || 0) === 0}
                        data-testid="button-view-medicheck-records"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Records
                      </Button>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-source-sam">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Database className="w-5 h-5 text-orange-600" />
                          SAM.gov
                        </CardTitle>
                        {getStatusBadge(dataSources.find(s => s.type === "sam")?.status || "stale")}
                      </div>
                      <CardDescription>
                        System for Award Management exclusions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Records:</span>
                          <span className="font-medium">{dataSources.find(s => s.type === "sam")?.recordCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Upload:</span>
                          <span className="font-medium">
                            {dataSources.find(s => s.type === "sam")?.lastRefreshDate
                              ? format(new Date(dataSources.find(s => s.type === "sam")!.lastRefreshDate!), "MMM d, yyyy")
                              : "Never"}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => samFileRef.current?.click()}
                        disabled={uploadSamMutation.isPending}
                        data-testid="button-upload-sam"
                      >
                        {uploadSamMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload CSV
                      </Button>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setSamRecordsOpen(true)}
                        disabled={(dataSources.find(s => s.type === "sam")?.recordCount || 0) === 0}
                        data-testid="button-view-sam-records"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Records
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="pending" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Reviews</CardTitle>
                    <CardDescription>
                      Caregivers with possible matches requiring manual review
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingChecks ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    ) : pendingChecks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                        <p>No pending reviews. All caregivers have been verified.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Caregiver</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Matched Name</TableHead>
                            <TableHead>Match Reason</TableHead>
                            <TableHead>Date Found</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingChecks.map((check) => (
                            <TableRow key={check.id} data-testid={`row-check-${check.id}`}>
                              <TableCell className="font-medium">{check.caregiverName}</TableCell>
                              <TableCell>{getSourceBadge(check.source)}</TableCell>
                              <TableCell>{check.matchedName}</TableCell>
                              <TableCell>{getMatchReasonBadge(check)}</TableCell>
                              <TableCell>{check.createdAt ? format(new Date(check.createdAt), "MMM d, yyyy") : ""}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openReviewDialog(check)}
                                  data-testid={`button-review-${check.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review
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

              <TabsContent value="false-positives" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>False Positives</CardTitle>
                    <CardDescription>
                      Caregivers marked as false positive matches
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingFalsePositives ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    ) : falsePositives.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4" />
                        <p>No false positives recorded.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Caregiver</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Excluded Name</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {falsePositives.map((fp) => (
                            <TableRow key={fp.id} data-testid={`row-false-positive-${fp.id}`}>
                              <TableCell className="font-medium">{fp.caregiverName}</TableCell>
                              <TableCell>{getSourceBadge(fp.source)}</TableCell>
                              <TableCell>{fp.excludedName}</TableCell>
                              <TableCell className="max-w-xs truncate">{fp.reason}</TableCell>
                              <TableCell>{format(new Date(fp.createdAt), "MMM d, yyyy")}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteFalsePositiveMutation.mutate(fp.id)}
                                  disabled={deleteFalsePositiveMutation.isPending}
                                  data-testid={`button-delete-fp-${fp.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
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

              <TabsContent value="reports" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Monthly Reports</CardTitle>
                      <CardDescription>
                        View and generate exclusion verification reports
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => generateReportMutation.mutate()}
                      disabled={generateReportMutation.isPending}
                      data-testid="button-generate-report"
                    >
                      {generateReportMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                      Generate Report
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loadingReports ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    ) : reports.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-4" />
                        <p>No reports generated yet. Click "Generate Report" to create one.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Generated</TableHead>
                            <TableHead>Total Checked</TableHead>
                            <TableHead>Possible Matches</TableHead>
                            <TableHead>Confirmed</TableHead>
                            <TableHead>False Positives</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reports.map((report) => (
                            <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                              <TableCell className="font-medium">{report.month} {report.year}</TableCell>
                              <TableCell>{format(new Date(report.generatedAt), "MMM d, yyyy HH:mm")}</TableCell>
                              <TableCell>{report.totalChecked}</TableCell>
                              <TableCell>{report.possibleMatches}</TableCell>
                              <TableCell>{report.confirmedExclusions}</TableCell>
                              <TableCell>{report.falsePositives}</TableCell>
                              <TableCell>
                                <Badge className={report.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                                  {report.status}
                                </Badge>
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
        </main>
      </div>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Exclusion Match</DialogTitle>
            <DialogDescription>
              Review the potential match and determine if this is a true exclusion or false positive.
            </DialogDescription>
          </DialogHeader>
          {selectedCheck && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Caregiver Name</Label>
                  <p className="font-medium">{selectedCheck.caregiverName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Matched Name</Label>
                  <p className="font-medium">{selectedCheck.matchedName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Source</Label>
                  <p>{getSourceBadge(selectedCheck.source)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Match Score</Label>
                  <Badge variant={selectedCheck.matchScore >= 90 ? "destructive" : "outline"}>
                    {selectedCheck.matchScore}%
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Decision</Label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger data-testid="select-review-status">
                    <SelectValue placeholder="Select a decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed Exclusion</SelectItem>
                    <SelectItem value="false_positive">False Positive</SelectItem>
                    <SelectItem value="cleared">Cleared</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this review..."
                  rows={3}
                  data-testid="textarea-review-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} data-testid="button-cancel-review">
              Cancel
            </Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={!reviewStatus || updateCheckMutation.isPending}
              data-testid="button-submit-review"
            >
              {updateCheckMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExclusionRecordsDialog
        open={medicheckRecordsOpen}
        onOpenChange={setMedicheckRecordsOpen}
        sourceType="medicheck"
      />

      <ExclusionRecordsDialog
        open={samRecordsOpen}
        onOpenChange={setSamRecordsOpen}
        sourceType="sam"
      />

      <ImportResultDialog
        result={importResult}
        onOpenChange={(open) => {
          if (!open) setImportResult(null);
        }}
      />
    </div>
  );
}

function ImportResultDialog({
  result,
  onOpenChange,
}: {
  result: ImportResultState | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = result !== null;
  const sourceLabel = result?.source === "sam" ? "SAM.gov" : "MediCheck";
  const isSuccess = result?.ok ?? false;
  const recordCount = result?.recordCount ?? 0;
  const warnings = result?.warnings ?? [];
  const errors = result?.errors ?? [];
  const hasIssues = warnings.length > 0 || errors.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto"
        data-testid="dialog-import-result"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span data-testid="text-import-result-title">
              {isSuccess
                ? `${sourceLabel} CSV uploaded`
                : `${sourceLabel} CSV upload failed`}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isSuccess ? (
              <span data-testid="text-import-result-summary">
                Imported {recordCount} record{recordCount === 1 ? "" : "s"}
                {hasIssues
                  ? `. Review the warnings${errors.length ? " and errors" : ""} below.`
                  : "."}
              </span>
            ) : (
              <span data-testid="text-import-result-summary">
                The import was rejected. No records were changed for this source.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Badge
              variant="outline"
              data-testid="badge-import-record-count"
            >
              {recordCount} record{recordCount === 1 ? "" : "s"} imported
            </Badge>
            {result?.status ? (
              <Badge
                variant="outline"
                data-testid="badge-import-status-code"
              >
                HTTP {result.status}
              </Badge>
            ) : null}
          </div>

          {errors.length > 0 ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 p-3"
              data-testid="section-import-errors"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900 text-sm">
                  Errors ({errors.length})
                </span>
              </div>
              <ScrollArea className="max-h-48 pr-3">
                <ul className="space-y-1 text-sm text-red-900">
                  {errors.map((err, idx) => (
                    <li
                      key={idx}
                      className="leading-snug whitespace-pre-wrap break-words"
                      data-testid={`item-import-error-${idx}`}
                    >
                      • {err}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div
              className="rounded-md border border-amber-200 bg-amber-50 p-3"
              data-testid="section-import-warnings"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-900 text-sm">
                  Warnings ({warnings.length})
                </span>
              </div>
              <ScrollArea className="max-h-48 pr-3">
                <ul className="space-y-1 text-sm text-amber-900">
                  {warnings.map((warn, idx) => (
                    <li
                      key={idx}
                      className="leading-snug whitespace-pre-wrap break-words"
                      data-testid={`item-import-warning-${idx}`}
                    >
                      • {warn}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          ) : null}

          {isSuccess && !hasIssues ? (
            <div className="text-sm text-muted-foreground" data-testid="text-import-clean">
              No warnings or errors were reported. All rows were accepted.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            data-testid="button-close-import-result"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ExclusionRecordRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  businessName: string | null;
  npi: string | null;
  licenseNumber: string | null;
  externalIdentifier: string | null;
  fein: string | null;
  exclusionType: string | null;
  exclusionStatus: string | null;
  exclusionDate: string | null;
  reinstateDate: string | null;
  city: string | null;
  state: string | null;
}

const RECORDS_DIALOG_CONFIG = {
  medicheck: {
    title: "Medicheck Records",
    sourceLabel: "Medicheck",
    testIdPrefix: "medicheck",
    secondColumnHeader: "Business Name",
    identifierHeader: "License Number",
    statusHeader: "Status",
    beginDateHeader: "Begin Date",
    endDateHeader: "End Date",
  },
  sam: {
    title: "SAM.gov Records",
    sourceLabel: "SAM.gov",
    testIdPrefix: "sam",
    secondColumnHeader: "City / State",
    identifierHeader: "SAM Number",
    statusHeader: "Exclusion Type",
    beginDateHeader: "Exclusion Date",
    endDateHeader: "Termination Date",
  },
} as const;

function ExclusionRecordsDialog({
  open,
  onOpenChange,
  sourceType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: "medicheck" | "sam";
}) {
  const config = RECORDS_DIALOG_CONFIG[sourceType];
  const { data: records = [], isLoading } = useQuery<ExclusionRecordRow[]>({
    queryKey: ["/api/exclusions/records", { sourceType }],
    queryFn: async () => {
      const res = await fetch(
        `/api/exclusions/records?sourceType=${sourceType}&limit=200`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`Failed to load ${config.sourceLabel} records`);
      return res.json();
    },
    enabled: open,
  });

  const formatPersonName = (r: ExclusionRecordRow) => {
    const parts = [r.lastName, r.firstName].filter(Boolean).join(", ");
    if (parts) return parts;
    return "—";
  };

  // SAM rows rarely have a businessName; fall back to City / State so the
  // row is still recognizable. MediCheck rows almost always have a business
  // name when present, so we use it directly.
  const formatSecondColumn = (r: ExclusionRecordRow) => {
    if (sourceType === "medicheck") {
      return r.businessName || "—";
    }
    if (r.businessName) return r.businessName;
    const cityState = [r.city, r.state].filter(Boolean).join(", ");
    return cityState || "—";
  };

  // MediCheck stores license # in licenseNumber; SAM stores SAM_Number /
  // CAGE_Code in externalIdentifier. Pick whichever the source uses.
  const formatIdentifier = (r: ExclusionRecordRow) => {
    if (sourceType === "medicheck") return r.licenseNumber || "—";
    return r.externalIdentifier || "—";
  };

  // MediCheck reports a separate exclusionStatus field; SAM reports
  // exclusionType (e.g. "Reciprocal", "Procurement").
  const formatStatus = (r: ExclusionRecordRow) => {
    const value = sourceType === "medicheck" ? r.exclusionStatus : r.exclusionType;
    return value ? <Badge variant="outline">{value}</Badge> : "—";
  };

  const formatDate = (d: string | null) => (d ? format(new Date(d), "MMM d, yyyy") : "—");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            Most recent {records.length} record{records.length === 1 ? "" : "s"} imported from
            the {config.sourceLabel} CSV.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No records yet. Upload a {config.sourceLabel} CSV to populate this list.
          </div>
        ) : (
          <Table data-testid={`table-${config.testIdPrefix}-records`}>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>{config.secondColumnHeader}</TableHead>
                <TableHead>{config.identifierHeader}</TableHead>
                <TableHead>NPI</TableHead>
                <TableHead>{config.statusHeader}</TableHead>
                <TableHead>{config.beginDateHeader}</TableHead>
                <TableHead>{config.endDateHeader}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} data-testid={`row-${config.testIdPrefix}-${r.id}`}>
                  <TableCell className="font-medium" data-testid={`cell-${config.testIdPrefix}-name-${r.id}`}>
                    {formatPersonName(r)}
                  </TableCell>
                  <TableCell data-testid={`cell-${config.testIdPrefix}-business-${r.id}`}>
                    {formatSecondColumn(r)}
                  </TableCell>
                  <TableCell>{formatIdentifier(r)}</TableCell>
                  <TableCell>{r.npi || "—"}</TableCell>
                  <TableCell>{formatStatus(r)}</TableCell>
                  <TableCell>{formatDate(r.exclusionDate)}</TableCell>
                  <TableCell>{formatDate(r.reinstateDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
