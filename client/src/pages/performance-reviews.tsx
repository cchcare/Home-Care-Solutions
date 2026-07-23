import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Send, Save, Trash2, ClipboardList, CheckCircle2, Clock, FileText } from "lucide-react";
import type { PerformanceReview, PerformanceMetric, Caregiver, Office, User } from "@shared/schema";
import { format } from "date-fns";

const REVIEW_TYPES = [
  { value: "annual", label: "Annual" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "quarterly", label: "Quarterly" },
  { value: "probationary", label: "90-Day / Probationary" },
  { value: "improvement_plan", label: "Improvement Plan" },
];

const METRIC_NAMES = [
  "attendance", "punctuality", "client_satisfaction", "documentation",
  "communication", "teamwork", "skills", "professionalism",
] as const;

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-700",
};

function statusLabel(r: PerformanceReview) {
  if (r.acknowledgedAt) return "Acknowledged";
  if (r.status === "in_progress") return "Awaiting Acknowledgement";
  if (r.status === "completed") return "Complete";
  return r.status ? r.status.replace(/_/g, " ") : "—";
}

function statusBadgeClass(r: PerformanceReview) {
  if (r.acknowledgedAt) return "bg-green-100 text-green-800";
  return STATUS_COLORS[r.status || "scheduled"] || "bg-gray-100 text-gray-700";
}

export default function PerformanceReviewsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentUserId = (user as any)?.id as string | undefined;

  const [launchOpen, setLaunchOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery<PerformanceReview[]>({
    queryKey: ["/api/performance-reviews"],
  });
  const { data: caregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
  });
  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const caregiverName = (id: string | null | undefined) => {
    if (!id) return "—";
    const c = caregivers.find(x => x.id === id);
    if (c) return `${c.firstName || ""} ${c.lastName || ""}`.trim() || id;
    const u = users.find(x => x.id === id);
    if (u) return `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || id;
    return id;
  };
  const reviewerName = (id: string) => {
    const u = users.find(x => x.id === id);
    if (!u) return id;
    return `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || id;
  };

  // Group reviews into cycles by (reviewType, scheduledDate-day)
  const cycles = useMemo(() => {
    const map = new Map<string, { key: string; reviewType: string; scheduledDate: string; reviews: PerformanceReview[] }>();
    for (const r of reviews) {
      if (!r.scheduledDate) continue;
      const d = format(new Date(r.scheduledDate), "yyyy-MM-dd");
      const key = `${r.reviewType}__${d}`;
      if (!map.has(key)) map.set(key, { key, reviewType: r.reviewType, scheduledDate: d, reviews: [] });
      map.get(key)!.reviews.push(r);
    }
    return Array.from(map.values()).sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  }, [reviews]);

  const myQueue = useMemo(() => {
    if (!currentUserId) return [];
    return reviews.filter(r => r.reviewerId === currentUserId && r.status !== "completed" && r.status !== "cancelled");
  }, [reviews, currentUserId]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <ClipboardList className="w-7 h-7" /> Performance Reviews
              </h1>
              <p className="text-muted-foreground">Run review cycles, complete evaluations, and track acknowledgement.</p>
            </div>
            <Button onClick={() => setLaunchOpen(true)} data-testid="button-launch-cycle">
              <Plus className="w-4 h-4 mr-2" /> Launch new cycle
            </Button>
          </div>

          <Tabs defaultValue="my-queue">
            <TabsList>
              <TabsTrigger value="cycles" data-testid="tab-cycles">Active Cycles</TabsTrigger>
              <TabsTrigger value="my-queue" data-testid="tab-my-queue">My Reviews to Complete ({myQueue.length})</TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all">All Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="cycles" className="space-y-4">
              {isLoading && <Loader2 className="w-6 h-6 animate-spin" />}
              {!isLoading && cycles.length === 0 && (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No review cycles yet. Launch one to get started.</CardContent></Card>
              )}
              {cycles.map(c => {
                const counts = {
                  scheduled: c.reviews.filter(r => r.status === "scheduled").length,
                  in_progress: c.reviews.filter(r => r.status === "in_progress" && !r.acknowledgedAt).length,
                  awaiting_ack: c.reviews.filter(r => r.status === "in_progress" && !r.acknowledgedAt).length,
                  complete: c.reviews.filter(r => r.status === "completed" || r.acknowledgedAt).length,
                };
                return (
                  <Card key={c.key} data-testid={`cycle-${c.key}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{REVIEW_TYPES.find(t => t.value === c.reviewType)?.label || c.reviewType} — {format(new Date(c.scheduledDate), "MMM d, yyyy")}</span>
                        <Badge variant="outline">{c.reviews.length} reviews</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="rounded border p-3 text-center">
                          <div className="text-2xl font-bold text-blue-600">{counts.scheduled}</div>
                          <div className="text-xs text-muted-foreground">Scheduled</div>
                        </div>
                        <div className="rounded border p-3 text-center">
                          <div className="text-2xl font-bold text-yellow-600">{counts.in_progress}</div>
                          <div className="text-xs text-muted-foreground">In Progress / Awaiting Ack</div>
                        </div>
                        <div className="rounded border p-3 text-center">
                          <div className="text-2xl font-bold text-green-600">{counts.complete}</div>
                          <div className="text-xs text-muted-foreground">Complete</div>
                        </div>
                        <div className="rounded border p-3 text-center">
                          <div className="text-2xl font-bold">{Math.round((counts.complete / Math.max(1, c.reviews.length)) * 100)}%</div>
                          <div className="text-xs text-muted-foreground">Progress</div>
                        </div>
                      </div>
                      <ReviewTable
                        reviews={c.reviews}
                        caregiverName={caregiverName}
                        reviewerName={reviewerName}
                        onOpen={(id) => { setSelectedReviewId(id); setReviewOpen(true); }}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="my-queue">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Reviews assigned to you</CardTitle>
                  <CardDescription>Open one to fill in ratings and send to the employee for acknowledgement.</CardDescription>
                </CardHeader>
                <CardContent>
                  {myQueue.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">You have no open reviews. Nice!</p>
                  ) : (
                    <ReviewTable
                      reviews={myQueue}
                      caregiverName={caregiverName}
                      reviewerName={reviewerName}
                      onOpen={(id) => { setSelectedReviewId(id); setReviewOpen(true); }}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>All Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReviewTable
                    reviews={reviews}
                    caregiverName={caregiverName}
                    reviewerName={reviewerName}
                    onOpen={(id) => { setSelectedReviewId(id); setReviewOpen(true); }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <LaunchCycleDialog open={launchOpen} onOpenChange={setLaunchOpen} offices={offices} caregivers={caregivers} toast={toast} />

      {selectedReviewId && (
        <ReviewFormDialog
          open={reviewOpen}
          onOpenChange={(v) => { setReviewOpen(v); if (!v) setSelectedReviewId(null); }}
          reviewId={selectedReviewId}
          caregiverName={caregiverName}
          toast={toast}
        />
      )}
    </div>
  );
}

function ReviewTable({
  reviews, caregiverName, reviewerName, onOpen,
}: {
  reviews: PerformanceReview[];
  caregiverName: (id: string | null | undefined) => string;
  reviewerName: (id: string) => string;
  onOpen: (id: string) => void;
}) {
  if (reviews.length === 0) return <p className="text-sm text-muted-foreground py-4">No reviews.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Reviewer</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Scheduled</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reviews.map(r => (
          <TableRow key={r.id} data-testid={`row-review-${r.id}`}>
            <TableCell>{caregiverName(r.caregiverId ?? r.userId)}</TableCell>
            <TableCell>{reviewerName(r.reviewerId)}</TableCell>
            <TableCell className="capitalize">{(r.reviewType || "").replace(/_/g, " ")}</TableCell>
            <TableCell>{r.scheduledDate ? format(new Date(r.scheduledDate), "MMM d, yyyy") : "—"}</TableCell>
            <TableCell><Badge className={statusBadgeClass(r)}>{statusLabel(r)}</Badge></TableCell>
            <TableCell>{r.overallRating ?? "—"}</TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline" onClick={() => onOpen(r.id)} data-testid={`button-open-${r.id}`}>Open</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LaunchCycleDialog({
  open, onOpenChange, offices, caregivers, toast,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  offices: Office[];
  caregivers: Caregiver[];
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [reviewType, setReviewType] = useState("annual");
  const [scheduledDate, setScheduledDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [officeId, setOfficeId] = useState<string>("all");
  const [targetMode, setTargetMode] = useState<"office" | "role" | "custom">("office");
  const [specialization, setSpecialization] = useState<string>("");
  const [selectedCaregiverIds, setSelectedCaregiverIds] = useState<string[]>([]);
  const [caregiverSearch, setCaregiverSearch] = useState("");

  const allSpecializations = useMemo(() => {
    const set = new Set<string>();
    for (const c of caregivers) {
      (c.specializations || []).forEach((s: string) => s && set.add(s));
    }
    return Array.from(set).sort();
  }, [caregivers]);

  const filteredCaregivers = useMemo(() => {
    const q = caregiverSearch.toLowerCase();
    return caregivers.filter(c => {
      if (officeId !== "all" && c.officeId !== officeId) return false;
      if (!q) return true;
      const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [caregivers, officeId, caregiverSearch]);

  const launchMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        reviewType,
        scheduledDate,
        reviewPeriodStart: periodStart || null,
        reviewPeriodEnd: periodEnd || null,
        officeId: officeId === "all" ? null : officeId,
        targetMode,
      };
      if (targetMode === "role") payload.specialization = specialization;
      if (targetMode === "custom") payload.caregiverIds = selectedCaregiverIds;
      return await apiRequest("POST", "/api/performance-reviews/launch-cycle", payload);
    },
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/performance-reviews"] });
      toast({
        title: "Cycle launched",
        description: `Created ${data.createdCount} review${data.createdCount === 1 ? "" : "s"}${data.skippedCount ? `, ${data.skippedCount} skipped` : ""}.`,
      });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Failed to launch", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Launch new review cycle</DialogTitle>
          <DialogDescription>
            Creates one review per active caregiver in the target group, with their manager set as the reviewer.
            Caregivers without a manager will be assigned to you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Review type</Label>
            <Select value={reviewType} onValueChange={setReviewType}>
              <SelectTrigger data-testid="select-review-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target office</Label>
            <Select value={officeId} onValueChange={setOfficeId}>
              <SelectTrigger data-testid="select-office"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target group</Label>
            <Select value={targetMode} onValueChange={(v) => setTargetMode(v as any)}>
              <SelectTrigger data-testid="select-target-mode"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="office">Everyone in target office</SelectItem>
                <SelectItem value="role">By role / specialization</SelectItem>
                <SelectItem value="custom">Pick specific caregivers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {targetMode === "role" && (
            <div>
              <Label>Role / specialization</Label>
              <Select value={specialization} onValueChange={setSpecialization}>
                <SelectTrigger data-testid="select-specialization"><SelectValue placeholder="Select a role..." /></SelectTrigger>
                <SelectContent>
                  {allSpecializations.length === 0 && <SelectItem value="__none" disabled>No specializations on file</SelectItem>}
                  {allSpecializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {targetMode === "custom" && (
            <div>
              <Label>Pick caregivers ({selectedCaregiverIds.length} selected)</Label>
              <Input
                placeholder="Search caregivers..."
                value={caregiverSearch}
                onChange={(e) => setCaregiverSearch(e.target.value)}
                className="mb-2"
                data-testid="input-caregiver-search"
              />
              <div className="border rounded max-h-48 overflow-y-auto p-2 space-y-1">
                {filteredCaregivers.length === 0 && <p className="text-sm text-muted-foreground p-2">No caregivers match.</p>}
                {filteredCaregivers.map(c => (
                  <label key={c.id} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer" data-testid={`caregiver-option-${c.id}`}>
                    <Checkbox
                      checked={selectedCaregiverIds.includes(c.id)}
                      onCheckedChange={(checked) => {
                        setSelectedCaregiverIds(prev =>
                          checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                        );
                      }}
                    />
                    <span className="text-sm">{`${c.firstName || ""} ${c.lastName || ""}`.trim()}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Scheduled date</Label>
              <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} data-testid="input-scheduled" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Period start (optional)</Label>
              <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Period end (optional)</Label>
              <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => launchMutation.mutate()}
            disabled={
              !scheduledDate ||
              launchMutation.isPending ||
              (targetMode === "role" && !specialization) ||
              (targetMode === "custom" && selectedCaregiverIds.length === 0)
            }
            data-testid="button-confirm-launch"
          >
            {launchMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Launch cycle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewFormDialog({
  open, onOpenChange, reviewId, caregiverName, toast,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reviewId: string;
  caregiverName: (id: string | null | undefined) => string;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const { data: review } = useQuery<PerformanceReview>({
    queryKey: ["/api/performance-reviews", reviewId],
    queryFn: () => fetch(`/api/performance-reviews/${reviewId}`).then(r => r.json()),
    enabled: open && !!reviewId,
  });
  const { data: metrics = [] } = useQuery<PerformanceMetric[]>({
    queryKey: ["/api/performance-reviews", reviewId, "metrics"],
    queryFn: () => fetch(`/api/performance-reviews/${reviewId}/metrics`).then(r => r.json()),
    enabled: open && !!reviewId,
  });

  const [form, setForm] = useState({
    overallRating: 3,
    strengths: "",
    areasForImprovement: "",
    goals: "",
    actionItems: "",
    reviewerComments: "",
  });
  const [metricEdits, setMetricEdits] = useState<Record<string, { rating: number; comments: string }>>({});
  const [newMetric, setNewMetric] = useState<{ metricName: string; rating: number; comments: string }>({
    metricName: "attendance", rating: 3, comments: "",
  });

  useEffect(() => {
    if (review) {
      setForm({
        overallRating: review.overallRating ?? 3,
        strengths: review.strengths || "",
        areasForImprovement: review.areasForImprovement || "",
        goals: review.goals || "",
        actionItems: review.actionItems || "",
        reviewerComments: review.reviewerComments || "",
      });
    }
  }, [review]);

  useEffect(() => {
    const next: Record<string, { rating: number; comments: string }> = {};
    for (const m of metrics) next[m.id] = { rating: m.rating, comments: m.comments || "" };
    setMetricEdits(next);
  }, [metrics]);

  const saveReviewMutation = useMutation({
    mutationFn: async (payload: any) => apiRequest("PATCH", `/api/performance-reviews/${reviewId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/performance-reviews", reviewId] });
    },
  });

  const saveMetricMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/performance-metrics/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/performance-reviews", reviewId, "metrics"] }),
  });
  const addMetricMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", `/api/performance-reviews/${reviewId}/metrics`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance-reviews", reviewId, "metrics"] });
      setNewMetric({ metricName: "attendance", rating: 3, comments: "" });
    },
  });
  const deleteMetricMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/performance-metrics/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/performance-reviews", reviewId, "metrics"] }),
  });
  const sendMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/performance-reviews/${reviewId}/send-for-acknowledgement`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance-reviews"] });
      toast({ title: "Sent for acknowledgement", description: "Employee has been emailed a signing link." });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Failed to send", description: e?.message, variant: "destructive" }),
  });

  const handleSaveDraft = async () => {
    // Save all metric edits
    for (const m of metrics) {
      const e = metricEdits[m.id];
      if (e && (e.rating !== m.rating || e.comments !== (m.comments || ""))) {
        await saveMetricMutation.mutateAsync({ id: m.id, data: { rating: e.rating, comments: e.comments } });
      }
    }
    await saveReviewMutation.mutateAsync({ ...form });
    toast({ title: "Draft saved" });
  };

  const handleSubmit = async () => {
    await handleSaveDraft();
    await saveReviewMutation.mutateAsync({ status: "completed", completedDate: new Date().toISOString() });
    await sendMutation.mutateAsync();
  };

  if (!review) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><Loader2 className="w-6 h-6 animate-spin mx-auto" /></DialogContent>
      </Dialog>
    );
  }

  const acknowledged = !!review.acknowledgedAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review — {caregiverName(review.caregiverId ?? review.userId)}</DialogTitle>
          <DialogDescription>
            {REVIEW_TYPES.find(t => t.value === review.reviewType)?.label} •{" "}
            {review.scheduledDate ? format(new Date(review.scheduledDate), "MMM d, yyyy") : "—"} •{" "}
            <Badge className={statusBadgeClass(review)}>{statusLabel(review)}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Metrics */}
          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Metrics</h3>
            <div className="space-y-3">
              {metrics.map(m => {
                const e = metricEdits[m.id] || { rating: m.rating, comments: m.comments || "" };
                return (
                  <div key={m.id} className="border rounded p-3" data-testid={`metric-${m.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="capitalize">{m.metricName.replace(/_/g, " ")}</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono w-8 text-center">{e.rating}/5</span>
                        <Button size="icon" variant="ghost" onClick={() => deleteMetricMutation.mutate(m.id)} disabled={acknowledged}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Slider
                      value={[e.rating]}
                      min={1}
                      max={5}
                      step={1}
                      disabled={acknowledged}
                      onValueChange={(v) => setMetricEdits(prev => ({ ...prev, [m.id]: { ...e, rating: v[0] } }))}
                    />
                    <Textarea
                      className="mt-2"
                      placeholder="Comments..."
                      value={e.comments}
                      disabled={acknowledged}
                      onChange={(ev) => setMetricEdits(prev => ({ ...prev, [m.id]: { ...e, comments: ev.target.value } }))}
                    />
                  </div>
                );
              })}

              {!acknowledged && (
                <div className="border-dashed border rounded p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={newMetric.metricName} onValueChange={(v) => setNewMetric(prev => ({ ...prev, metricName: v }))}>
                      <SelectTrigger className="flex-1" data-testid="select-new-metric"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {METRIC_NAMES.map(n => <SelectItem key={n} value={n} className="capitalize">{n.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min={1} max={5}
                      className="w-20"
                      value={newMetric.rating}
                      onChange={(e) => setNewMetric(prev => ({ ...prev, rating: Math.max(1, Math.min(5, Number(e.target.value) || 3)) }))}
                    />
                    <Button onClick={() => addMetricMutation.mutate(newMetric)} disabled={addMetricMutation.isPending}>
                      <Plus className="w-4 h-4 mr-1" /> Add metric
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Overall + comments */}
          <section className="space-y-3">
            <div>
              <Label>Overall rating: {form.overallRating}/5</Label>
              <Slider
                value={[form.overallRating]} min={1} max={5} step={1}
                disabled={acknowledged}
                onValueChange={(v) => setForm(prev => ({ ...prev, overallRating: v[0] }))}
              />
            </div>
            <div>
              <Label>Strengths</Label>
              <Textarea value={form.strengths} disabled={acknowledged} onChange={(e) => setForm(prev => ({ ...prev, strengths: e.target.value }))} />
            </div>
            <div>
              <Label>Areas for improvement</Label>
              <Textarea value={form.areasForImprovement} disabled={acknowledged} onChange={(e) => setForm(prev => ({ ...prev, areasForImprovement: e.target.value }))} />
            </div>
            <div>
              <Label>Goals</Label>
              <Textarea value={form.goals} disabled={acknowledged} onChange={(e) => setForm(prev => ({ ...prev, goals: e.target.value }))} />
            </div>
            <div>
              <Label>Action items</Label>
              <Textarea value={form.actionItems} disabled={acknowledged} onChange={(e) => setForm(prev => ({ ...prev, actionItems: e.target.value }))} />
            </div>
            <div>
              <Label>Reviewer comments</Label>
              <Textarea value={form.reviewerComments} disabled={acknowledged} onChange={(e) => setForm(prev => ({ ...prev, reviewerComments: e.target.value }))} />
            </div>
          </section>

          {acknowledged && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded">
              <CheckCircle2 className="w-5 h-5" />
              <span>Acknowledged on {format(new Date(review.acknowledgedAt!), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {!acknowledged && (
            <>
              <Button variant="secondary" onClick={handleSaveDraft} disabled={saveReviewMutation.isPending} data-testid="button-save-draft">
                <Save className="w-4 h-4 mr-2" /> Save draft
              </Button>
              <Button onClick={handleSubmit} disabled={sendMutation.isPending} data-testid="button-submit-ack">
                {sendMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Send className="w-4 h-4 mr-2" /> Submit for acknowledgement
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
