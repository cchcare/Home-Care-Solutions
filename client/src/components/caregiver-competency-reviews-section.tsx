import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Award, Plus, Trash2, AlertTriangle } from "lucide-react";
import type { CaregiverCompetencyReview } from "@shared/schema";

const METHODS = [
  { value: "direct_observation", label: "Direct Observation" },
  { value: "competency_test", label: "Competency Test" },
  { value: "training_completion", label: "Training Completion" },
  { value: "consumer_feedback", label: "Consumer Feedback" },
];

const OUTCOMES = [
  { value: "satisfactory", label: "Satisfactory" },
  { value: "needs_improvement", label: "Needs Improvement" },
  { value: "unsatisfactory", label: "Unsatisfactory" },
];

const outcomeVariant: Record<string, "secondary" | "default" | "destructive"> = {
  satisfactory: "secondary",
  needs_improvement: "default",
  unsatisfactory: "destructive",
};

function formatLabel(v: string, options: { value: string; label: string }[]) {
  return options.find((o) => o.value === v)?.label || v;
}

interface Props {
  caregiverId: string;
}

export function CaregiverCompetencyReviewsSection({ caregiverId }: Props) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const queryKey = ["/api/caregivers", caregiverId, "competency-reviews"] as const;
  const { data: reviews = [], isLoading } = useQuery<CaregiverCompetencyReview[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/caregivers/${caregiverId}/competency-reviews`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to load competency reviews");
      return r.json();
    },
    enabled: !!caregiverId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/competency-reviews/${id}`),
    onSuccess: () => {
      toast({ title: "Review deleted" });
      invalidate();
    },
    onError: (e: any) =>
      toast({ title: "Could not delete", description: e?.message, variant: "destructive" }),
  });

  const mostRecent = reviews[0];
  const overdue = mostRecent?.nextReviewDue && new Date(mostRecent.nextReviewDue).getTime() < Date.now();
  const noReviewYet = reviews.length === 0;

  return (
    <Card data-testid="competency-reviews-section">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" /> Competency Reviews
            </CardTitle>
            <CardDescription>
              28 Pa. Code § 611.55 requires direct care worker competency to be reviewed
              at least annually — via direct observation, a competency test, training
              completion, or consumer feedback.
            </CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-new-competency-review">
                <Plus className="h-4 w-4 mr-1" /> New Review
              </Button>
            </DialogTrigger>
            <CompetencyReviewFormDialog
              caregiverId={caregiverId}
              onClose={() => setCreateOpen(false)}
              onCreated={() => {
                invalidate();
                setCreateOpen(false);
              }}
            />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(noReviewYet || overdue) && (
          <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {noReviewYet
              ? "No competency review on file yet. PA requires at least one annual review."
              : `Next review was due ${format(new Date(mostRecent!.nextReviewDue!), "MMM d, yyyy")}.`}
          </div>
        )}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : reviews.length === 0 ? (
          <div className="text-sm text-muted-foreground">No competency reviews on file.</div>
        ) : (
          reviews.map((r) => (
            <div
              key={r.id}
              className="border rounded-md p-3 space-y-2"
              data-testid={`competency-review-card-${r.id}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{formatLabel(r.method, METHODS)}</Badge>
                <Badge variant={outcomeVariant[r.outcome] ?? "secondary"}>
                  {formatLabel(r.outcome, OUTCOMES)}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {format(new Date(r.reviewDate), "PP")}
                </span>
              </div>
              {r.topicsCovered && (
                <div className="text-sm">
                  <span className="font-medium">Topics covered: </span>
                  <span className="whitespace-pre-wrap">{r.topicsCovered}</span>
                </div>
              )}
              {r.developmentPlan && (
                <div className="text-sm">
                  <span className="font-medium">Development plan: </span>
                  <span className="whitespace-pre-wrap">{r.developmentPlan}</span>
                </div>
              )}
              {r.notes && <div className="text-sm whitespace-pre-wrap">{r.notes}</div>}
              {r.nextReviewDue && (
                <div className="text-xs text-muted-foreground">
                  Next review due {format(new Date(r.nextReviewDue), "PP")}
                </div>
              )}
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMut.mutate(r.id)}
                  disabled={deleteMut.isPending}
                  data-testid={`button-delete-competency-review-${r.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function CompetencyReviewFormDialog({
  caregiverId,
  onClose,
  onCreated,
}: {
  caregiverId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    reviewDate: format(new Date(), "yyyy-MM-dd"),
    method: "direct_observation",
    outcome: "satisfactory",
    topicsCovered: "",
    developmentPlan: "",
    nextReviewDue: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), "yyyy-MM-dd"),
    notes: "",
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        reviewDate: new Date(form.reviewDate).toISOString(),
        method: form.method,
        outcome: form.outcome,
        topicsCovered: form.topicsCovered || undefined,
        developmentPlan: form.developmentPlan || undefined,
        nextReviewDue: form.nextReviewDue ? new Date(form.nextReviewDue).toISOString() : undefined,
        notes: form.notes || undefined,
      };
      return apiRequest("POST", `/api/caregivers/${caregiverId}/competency-reviews`, payload);
    },
    onSuccess: () => {
      toast({ title: "Competency review recorded" });
      onCreated();
    },
    onError: (e: any) =>
      toast({ title: "Failed to record review", description: e?.message, variant: "destructive" }),
  });

  return (
    <DialogContent className="max-w-xl" data-testid="dialog-competency-review-form">
      <DialogHeader>
        <DialogTitle>New Competency Review</DialogTitle>
        <DialogDescription>
          Records how competency was established for this review cycle, per 28 Pa. Code § 611.55.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Review date</Label>
            <Input
              type="date"
              value={form.reviewDate}
              onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))}
              data-testid="input-review-date"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Next review due</Label>
            <Input
              type="date"
              value={form.nextReviewDue}
              onChange={(e) => setForm((f) => ({ ...f, nextReviewDue: e.target.value }))}
              data-testid="input-next-review-due"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select
              value={form.method}
              onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}
            >
              <SelectTrigger data-testid="select-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select
              value={form.outcome}
              onValueChange={(v) => setForm((f) => ({ ...f, outcome: v }))}
            >
              <SelectTrigger data-testid="select-outcome"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Topics covered</Label>
          <Textarea
            rows={2}
            value={form.topicsCovered}
            onChange={(e) => setForm((f) => ({ ...f, topicsCovered: e.target.value }))}
            placeholder="Skills/topics assessed this cycle"
            data-testid="textarea-topics-covered"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Development plan</Label>
          <Textarea
            rows={2}
            value={form.developmentPlan}
            onChange={(e) => setForm((f) => ({ ...f, developmentPlan: e.target.value }))}
            placeholder="Follow-up training or coaching needed, if any"
            data-testid="textarea-development-plan"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            data-testid="textarea-notes"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          data-testid="button-save-competency-review"
        >
          {createMut.isPending ? "Saving…" : "Save Review"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
