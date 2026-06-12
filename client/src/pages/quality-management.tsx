import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useOfficeScope } from "@/context/office-context";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import {
  ShieldCheck,
  Target,
  AlertTriangle,
  Phone,
  ThumbsUp,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Activity,
  ClipboardList,
  Calendar,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2
} from "lucide-react";

interface DashboardOutcome {
  name: string;
  target: number;
  actual: number;
  unit: string;
  status: string;
}

interface DashboardData {
  outcomes: DashboardOutcome[];
  rawData: {
    totalIncidents: number;
    investigatedIncidents: number;
    totalComplaints: number;
    totalSurveys: number;
    totalCaregivers: number;
    trainedCaregivers: number;
  };
}

const planSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  effectiveDate: z.string().min(1, "Effective date is required"),
  revision: z.string().optional(),
  nextReviewDate: z.string().optional(),
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

const reviewSchema = z.object({
  quarter: z.coerce.number().min(1).max(4),
  year: z.coerce.number().min(2000).max(2100),
  dueDate: z.string().min(1, "Due date is required"),
  reviewDate: z.string().optional(),
  findings: z.string().optional(),
  actionItems: z.string().optional(),
  status: z.enum(["pending", "in_review", "completed", "overdue"]).default("pending"),
  completedAt: z.string().optional(),
});

type PlanForm = z.infer<typeof planSchema>;
type ReviewForm = z.infer<typeof reviewSchema>;

const CHECKLIST_ITEMS = [
  "Review measurable outcomes and performance data",
  "Evaluate incident investigation timeliness",
  "Review consumer complaint resolution rates",
  "Assess return-call response times",
  "Analyze quality care survey results",
  "Check annual staff training completion",
  "Review OADRI cycle progress",
  "Update QMP objectives if needed",
  "Document findings and action items",
  "Set next review date",
];

export default function QualityManagement() {
  const { selectedOfficeId, canMutate } = useOfficeScope();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"dashboard" | "plans" | "reviews">("dashboard");

  const [planDialog, setPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean[]>>({});

  const planForm = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { title: "", description: "", effectiveDate: "", revision: "1.0", status: "active" },
  });

  const reviewForm = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { quarter: 1, year: new Date().getFullYear(), dueDate: "", status: "pending" },
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ["/api/qmp-dashboard", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return { outcomes: [], rawData: { totalIncidents: 0, investigatedIncidents: 0, totalComplaints: 0, totalSurveys: 0, totalCaregivers: 0, trainedCaregivers: 0 } };
      const r = await fetch(`/api/qmp-dashboard?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error("Failed to load dashboard");
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/quality-management-plans", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/quality-management-plans?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error("Failed to load plans");
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: ["/api/qmp-quarterly-reviews", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/qmp-quarterly-reviews?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error("Failed to load reviews");
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery<any[]>({
    queryKey: ["/api/qmp-oadri-cycles", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/qmp-oadri-cycles?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error("Failed to load cycles");
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const createPlan = useMutation({
    mutationFn: (data: PlanForm) => apiRequest("POST", "/api/quality-management-plans", { ...data, officeId: selectedOfficeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-management-plans"] });
      setPlanDialog(false);
      planForm.reset();
      toast({ title: "Plan created", description: "Quality management plan created successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlanForm> }) => apiRequest("PATCH", `/api/quality-management-plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-management-plans"] });
      setPlanDialog(false);
      setEditingPlan(null);
      planForm.reset();
      toast({ title: "Plan updated", description: "Quality management plan updated successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePlan = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quality-management-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-management-plans"] });
      toast({ title: "Plan deleted", description: "Quality management plan deleted." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createReview = useMutation({
    mutationFn: (data: ReviewForm) => apiRequest("POST", "/api/qmp-quarterly-reviews", { ...data, officeId: selectedOfficeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qmp-quarterly-reviews"] });
      setReviewDialog(false);
      reviewForm.reset();
      toast({ title: "Review created", description: "Quarterly review created successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateReview = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ReviewForm> }) => apiRequest("PATCH", `/api/qmp-quarterly-reviews/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qmp-quarterly-reviews"] });
      setReviewDialog(false);
      setEditingReview(null);
      reviewForm.reset();
      toast({ title: "Review updated", description: "Quarterly review updated successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteReview = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/qmp-quarterly-reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qmp-quarterly-reviews"] });
      toast({ title: "Review deleted", description: "Quarterly review deleted." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openPlanEdit = (plan: any) => {
    setEditingPlan(plan);
    planForm.reset({
      title: plan.title,
      description: plan.description || "",
      effectiveDate: plan.effectiveDate || "",
      revision: plan.revision || "1.0",
      nextReviewDate: plan.nextReviewDate || "",
      status: plan.status,
    });
    setPlanDialog(true);
  };

  const openPlanCreate = () => {
    setEditingPlan(null);
    planForm.reset({ title: "", description: "", effectiveDate: "", revision: "1.0", status: "active" });
    setPlanDialog(true);
  };

  const openReviewEdit = (review: any) => {
    setEditingReview(review);
    reviewForm.reset({
      quarter: review.quarter,
      year: review.year,
      dueDate: review.dueDate || "",
      reviewDate: review.reviewDate || "",
      findings: review.findings || "",
      actionItems: review.actionItems || "",
      status: review.status,
      completedAt: review.completedAt || "",
    });
    setReviewDialog(true);
  };

  const openReviewCreate = () => {
    setEditingReview(null);
    const now = new Date();
    const currentQ = Math.floor(now.getMonth() / 3) + 1;
    const due = new Date(now.getFullYear(), (currentQ - 1) * 3 + 1, 10);
    reviewForm.reset({
      quarter: currentQ,
      year: now.getFullYear(),
      dueDate: due.toISOString().split("T")[0],
      status: "pending",
    });
    setReviewDialog(true);
  };

  const onPlanSubmit = (data: PlanForm) => {
    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, data });
    } else {
      createPlan.mutate(data);
    }
  };

  const onReviewSubmit = (data: ReviewForm) => {
    if (editingReview) {
      updateReview.mutate({ id: editingReview.id, data });
    } else {
      createReview.mutate(data);
    }
  };

  const toggleChecklist = (reviewId: string, index: number) => {
    setChecklist((prev) => {
      const current = prev[reviewId] || new Array(CHECKLIST_ITEMS.length).fill(false);
      const next = [...current];
      next[index] = !next[index];
      return { ...prev, [reviewId]: next };
    });
  };

  const getChecklistProgress = (reviewId: string) => {
    const checked = checklist[reviewId] || [];
    const count = checked.filter(Boolean).length;
    return Math.round((count / CHECKLIST_ITEMS.length) * 100);
  };

  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const currentYear = now.getFullYear();
  const quarterDueDate = new Date(currentYear, (currentQuarter - 1) * 3 + 1, 10);
  const daysUntilDue = Math.ceil((quarterDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const outcomeIcons: Record<string, any> = {
    "Critical Incident Investigation": AlertTriangle,
    "Consumer Complaint Resolution": ThumbsUp,
    "Return Consumer Call": Phone,
    "Quality Care Survey Satisfaction": Target,
    "Annual Staff Training": GraduationCap,
  };

  const outcomeColors: Record<string, string> = {
    "Critical Incident Investigation": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    "Consumer Complaint Resolution": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    "Return Consumer Call": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    "Quality Care Survey Satisfaction": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "Annual Staff Training": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                  Quality Management Plan
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  OADRI cycle monitoring and measurable outcomes tracking
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={daysUntilDue <= 0 ? "destructive" : daysUntilDue <= 7 ? "default" : "outline"}>
                  <Calendar className="h-3 w-3 mr-1" />
                  Q{currentQuarter} Review Due: {quarterDueDate.toLocaleDateString()}
                  {daysUntilDue <= 0 ? " (OVERDUE)" : daysUntilDue <= 7 ? ` (${daysUntilDue}d left)` : ""}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
              {["dashboard", "plans", "reviews"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "dashboard" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {dashLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <Card key={i}><CardContent className="p-4"><Skeleton className="h-24" /></CardContent></Card>
                    ))
                  ) : dashboard?.outcomes?.map((outcome) => {
                    const Icon = outcomeIcons[outcome.name] || Target;
                    const colorClass = outcomeColors[outcome.name] || "bg-gray-100 text-gray-700";
                    const pct = Math.min(100, Math.round((outcome.actual / outcome.target) * 100));
                    const isMet = outcome.status === "met";
                    return (
                      <Card key={outcome.name} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-lg ${colorClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <Badge variant={isMet ? "default" : "destructive"} className="text-xs">
                              {isMet ? "Met" : "Needs Improvement"}
                            </Badge>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{outcome.name}</h3>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{outcome.actual}</span>
                            <span className="text-xs text-gray-500">/ {outcome.target}{outcome.unit}</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                            {isMet ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                            {pct}% of target
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Link href="/patient-complaints">
                    <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Patient Complaints</p>
                          <p className="text-xs text-gray-500">Manage complaints & track resolution</p>
                        </div>
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/quality-management-logs">
                    <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">QM System Logs</p>
                          <p className="text-xs text-gray-500">Log entries from the policy form</p>
                        </div>
                        <ClipboardList className="h-5 w-5 text-blue-500" />
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/oadri-cycle">
                    <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">OADRI Cycle</p>
                          <p className="text-xs text-gray-500">Track 5-phase improvement cycle</p>
                        </div>
                        <Activity className="h-5 w-5 text-green-500" />
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/qapi">
                    <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">QAPI Meetings</p>
                          <p className="text-xs text-gray-500">Performance improvement meetings</p>
                        </div>
                        <BarChart3 className="h-5 w-5 text-purple-500" />
                      </CardContent>
                    </Card>
                  </Link>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      OADRI Cycle Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cyclesLoading ? (
                      <Skeleton className="h-20" />
                    ) : cycles.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <p>No active OADRI cycles found.</p>
                        <Link href="/oadri-cycle">
                          <Button variant="outline" className="mt-2">Create OADRI Cycle</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cycles.slice(0, 3).map((cycle: any) => (
                          <div key={cycle.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{cycle.cycleName}</p>
                              <p className="text-xs text-gray-500">Overall: {cycle.overallStatus?.replace("_", " ")}</p>
                            </div>
                            <div className="flex gap-1">
                              {["objectives", "approach", "deployment", "results", "improvement"].map((phase) => {
                                const status = cycle[`${phase}Status`];
                                const color = status === "completed" ? "bg-green-500" : status === "in_progress" ? "bg-blue-500" : status === "needs_improvement" ? "bg-amber-500" : "bg-gray-300";
                                return (
                                  <div key={phase} className="flex flex-col items-center gap-1">
                                    <div className={`w-3 h-3 rounded-full ${color}`} title={`${phase}: ${status}`} />
                                    <span className="text-[10px] text-gray-500 capitalize">{phase.slice(0, 3)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "plans" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Management Plans</h2>
                  {canMutate && (
                    <Button onClick={openPlanCreate} size="sm">
                      <Plus className="h-4 w-4 mr-1" /> New Plan
                    </Button>
                  )}
                </div>
                {plansLoading ? (
                  <Skeleton className="h-32" />
                ) : plans.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No quality management plans found for this office.</p>
                    </CardContent>
                  </Card>
                ) : (
                  plans.map((plan: any) => (
                    <Card key={plan.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{plan.title}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={plan.status === "active" ? "default" : "outline"}>{plan.status}</Badge>
                            {canMutate && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPlanEdit(plan)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deletePlan.mutate(plan.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300">{plan.description || "No description"}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span>Effective: {plan.effectiveDate ? new Date(plan.effectiveDate).toLocaleDateString() : "N/A"}</span>
                          <span>Revision: {plan.revision || "1.0"}</span>
                          <span>Next Review: {plan.nextReviewDate ? new Date(plan.nextReviewDate).toLocaleDateString() : "Not set"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quarterly Reviews</h2>
                  {canMutate && (
                    <Button onClick={openReviewCreate} size="sm">
                      <Plus className="h-4 w-4 mr-1" /> New Review
                    </Button>
                  )}
                </div>
                {reviewsLoading ? (
                  <Skeleton className="h-32" />
                ) : reviews.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No quarterly reviews found.</p>
                    </CardContent>
                  </Card>
                ) : (
                  reviews.map((review: any) => (
                    <Card key={review.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Q{review.quarter} {review.year} Review</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={review.status === "completed" ? "default" : review.status === "overdue" ? "destructive" : "outline"}>
                              {review.status}
                            </Badge>
                            {canMutate && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openReviewEdit(review)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteReview.mutate(review.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span>Due: {review.dueDate ? new Date(review.dueDate).toLocaleDateString() : "N/A"}</span>
                          <span>Reviewed: {review.reviewDate ? new Date(review.reviewDate).toLocaleDateString() : "Pending"}</span>
                          {review.completedAt && <span>Completed: {new Date(review.completedAt).toLocaleDateString()}</span>}
                        </div>
                        {review.findings && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">{review.findings}</p>
                        )}
                        {review.actionItems && (
                          <div className="text-sm">
                            <span className="font-medium">Action Items:</span>
                            <p className="text-gray-600 dark:text-gray-300">{review.actionItems}</p>
                          </div>
                        )}

                        {/* Review Checklist */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Review Checklist</span>
                            <span className="text-xs text-gray-500">{getChecklistProgress(review.id)}% complete</span>
                          </div>
                          <Progress value={getChecklistProgress(review.id)} className="h-1.5 mb-3" />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {CHECKLIST_ITEMS.map((item, idx) => {
                              const checked = (checklist[review.id] || [])[idx] || false;
                              return (
                                <div key={idx} className="flex items-start gap-2">
                                  <Checkbox
                                    id={`chk-${review.id}-${idx}`}
                                    checked={checked}
                                    onCheckedChange={() => toggleChecklist(review.id, idx)}
                                  />
                                  <label htmlFor={`chk-${review.id}-${idx}`} className={`text-xs cursor-pointer ${checked ? "text-gray-500 line-through" : "text-gray-700 dark:text-gray-300"}`}>
                                    {item}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Plan Dialog */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "New Quality Management Plan"}</DialogTitle>
          </DialogHeader>
          <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit(onPlanSubmit)} className="space-y-4">
              <FormField control={planForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="Plan title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={planForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Plan description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={planForm.control} name="effectiveDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={planForm.control} name="nextReviewDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Review Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={planForm.control} name="revision" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revision</FormLabel>
                    <FormControl><Input {...field} placeholder="1.0" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={planForm.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPlanDialog(false)}>Cancel</Button>
                <Button type="submit">{editingPlan ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReview ? "Edit Quarterly Review" : "New Quarterly Review"}</DialogTitle>
          </DialogHeader>
          <Form {...reviewForm}>
            <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={reviewForm.control} name="quarter" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quarter</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={reviewForm.control} name="year" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={reviewForm.control} name="dueDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={reviewForm.control} name="reviewDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={reviewForm.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={reviewForm.control} name="findings" render={({ field }) => (
                <FormItem>
                  <FormLabel>Findings</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} placeholder="Key findings from the review" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={reviewForm.control} name="actionItems" render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Items</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} placeholder="Action items from the review" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReviewDialog(false)}>Cancel</Button>
                <Button type="submit">{editingReview ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
