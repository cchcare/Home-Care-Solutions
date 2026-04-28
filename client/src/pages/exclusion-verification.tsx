import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  BarChart3
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
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiRequest("POST", "/api/exclusions/upload/medicheck", formData);
      return response.json() as Promise<{
        success: boolean;
        recordCount: number;
        errors: string[];
        warnings?: string[];
      }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/records", { sourceType: "medicheck" }] });
      // Defensive: a 2xx response with success=false should still be shown as
      // an error (the server should never do this, but guard so a future
      // regression cannot silently mask a failed import).
      if (result?.success === false) {
        toast({
          title: "Failed to upload Medicheck CSV",
          description: result.errors?.[0] || "Unknown error",
          variant: "destructive",
        });
        return;
      }
      const warnings = result?.warnings ?? [];
      const desc =
        `Imported ${result?.recordCount ?? 0} record${result?.recordCount === 1 ? "" : "s"}.` +
        (warnings.length ? ` ${warnings.join(" ")}` : "");
      toast({ title: "Medicheck CSV uploaded", description: desc });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to upload Medicheck CSV",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const uploadSamMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiRequest("POST", "/api/exclusions/upload/sam", formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions/dashboard"] });
      toast({ title: "Success", description: "SAM.gov CSV uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload SAM.gov CSV", variant: "destructive" });
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
                            <TableHead>Match Score</TableHead>
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
                              <TableCell>
                                <Badge variant={check.matchScore >= 90 ? "destructive" : "outline"}>
                                  {check.matchScore}%
                                </Badge>
                              </TableCell>
                              <TableCell>{format(new Date(check.createdAt), "MMM d, yyyy")}</TableCell>
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

      <MedicheckRecordsDialog
        open={medicheckRecordsOpen}
        onOpenChange={setMedicheckRecordsOpen}
      />
    </div>
  );
}

interface MedicheckRecord {
  id: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  businessName: string | null;
  npi: string | null;
  licenseNumber: string | null;
  fein: string | null;
  exclusionStatus: string | null;
  exclusionDate: string | null;
  reinstateDate: string | null;
}

function MedicheckRecordsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: records = [], isLoading } = useQuery<MedicheckRecord[]>({
    queryKey: ["/api/exclusions/records", { sourceType: "medicheck" }],
    queryFn: async () => {
      const res = await fetch("/api/exclusions/records?sourceType=medicheck&limit=200", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load Medicheck records");
      return res.json();
    },
    enabled: open,
  });

  const formatPersonName = (r: MedicheckRecord) => {
    const parts = [r.lastName, r.firstName].filter(Boolean).join(", ");
    if (parts) return parts;
    return "—";
  };

  const formatDate = (d: string | null) => (d ? format(new Date(d), "MMM d, yyyy") : "—");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Medicheck Records</DialogTitle>
          <DialogDescription>
            Most recent {records.length} record{records.length === 1 ? "" : "s"} imported from
            the Medicheck CSV.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No records yet. Upload a Medicheck CSV to populate this list.
          </div>
        ) : (
          <Table data-testid="table-medicheck-records">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>License Number</TableHead>
                <TableHead>NPI</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Begin Date</TableHead>
                <TableHead>End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} data-testid={`row-medicheck-${r.id}`}>
                  <TableCell className="font-medium" data-testid={`cell-medicheck-name-${r.id}`}>
                    {formatPersonName(r)}
                  </TableCell>
                  <TableCell data-testid={`cell-medicheck-business-${r.id}`}>
                    {r.businessName || "—"}
                  </TableCell>
                  <TableCell>{r.licenseNumber || "—"}</TableCell>
                  <TableCell>{r.npi || "—"}</TableCell>
                  <TableCell>
                    {r.exclusionStatus ? (
                      <Badge variant="outline">{r.exclusionStatus}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
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
