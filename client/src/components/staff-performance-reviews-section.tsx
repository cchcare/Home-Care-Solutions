import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { parseDateOnlyInput, formatDateOnly } from "@/lib/dateOnly";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ClipboardList, Plus, Loader2 } from "lucide-react";
import type { PerformanceReview, User } from "@shared/schema";

const REVIEW_TYPES = [
  { value: "annual", label: "Annual" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "quarterly", label: "Quarterly" },
  { value: "probationary", label: "90-Day / Probationary" },
  { value: "improvement_plan", label: "Improvement Plan" },
];

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

export function StaffPerformanceReviewsSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reviewType: "annual", scheduledDate: "", reviewerId: "" });

  const queryKey = ["/api/users", userId, "performance-reviews"] as const;
  const { data: reviews = [], isLoading } = useQuery<PerformanceReview[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/users/${userId}/performance-reviews`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load performance reviews");
      return r.json();
    },
  });

  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const reviewerName = (id: string) => {
    const u = users.find(x => x.id === id);
    if (!u) return id;
    return `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || id;
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const openCreate = () => {
    setForm({ reviewType: "annual", scheduledDate: "", reviewerId: (currentUser as any)?.id || "" });
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/performance-reviews", {
      userId,
      reviewerId: form.reviewerId,
      reviewType: form.reviewType,
      scheduledDate: parseDateOnlyInput(form.scheduledDate)?.toISOString(),
      status: "scheduled",
    }),
    onSuccess: () => {
      toast({ title: "Review scheduled" });
      invalidate();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" />Performance Reviews</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="button-add-staff-review">
            <Plus className="w-4 h-4 mr-2" />Schedule Review
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">No performance reviews on file</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reviewer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map(r => (
                <TableRow key={r.id} data-testid={`row-staff-review-${r.id}`}>
                  <TableCell>{reviewerName(r.reviewerId)}</TableCell>
                  <TableCell className="capitalize">{(r.reviewType || "").replace(/_/g, " ")}</TableCell>
                  <TableCell>{r.scheduledDate ? formatDateOnly(r.scheduledDate, (d) => format(d, "MMM d, yyyy")) : "—"}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[r.status || "scheduled"] || "bg-gray-100 text-gray-700"}>{statusLabel(r)}</Badge></TableCell>
                  <TableCell>{r.overallRating ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="mt-4">
          <Link href="/performance-reviews" className="text-sm text-primary hover:underline">
            Open full Performance Reviews workspace →
          </Link>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Performance Review</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Review Type</Label>
              <Select value={form.reviewType} onValueChange={(v) => setForm(f => ({ ...f, reviewType: v }))}>
                <SelectTrigger data-testid="select-staff-review-type"><SelectValue /></SelectTrigger>
                <SelectContent>{REVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date *</Label>
              <Input type="date" value={form.scheduledDate} onChange={(e) => setForm(f => ({ ...f, scheduledDate: e.target.value }))} data-testid="input-staff-review-date" />
            </div>
            <div className="space-y-2">
              <Label>Reviewer</Label>
              <Select value={form.reviewerId} onValueChange={(v) => setForm(f => ({ ...f, reviewerId: v }))}>
                <SelectTrigger data-testid="select-staff-review-reviewer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.scheduledDate || !form.reviewerId}
              data-testid="button-save-staff-review"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
