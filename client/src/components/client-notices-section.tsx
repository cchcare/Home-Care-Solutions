import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
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
import { ShieldCheck, Plus, Trash2, AlertTriangle } from "lucide-react";
import type { ClientNotice } from "@shared/schema";

// 28 Pa. Code § 611.57 consumer-protection notices.
const NOTICE_TYPES = [
  { value: "information_packet", label: "Pre-Service Information Packet" },
  { value: "dcw_status_notice", label: "Consumer Notice of Direct Care Worker Status" },
  { value: "service_termination_notice", label: "Service Termination Notice" },
  { value: "rate_change_notice", label: "Rate Change Notice" },
  { value: "other", label: "Other" },
];

const METHODS = [
  { value: "in_person", label: "In Person" },
  { value: "mail", label: "Mail" },
  { value: "email", label: "Email" },
  { value: "esignature", label: "E-Signature" },
];

// § 611.57 requires at least 10 calendar days' advance written notice before
// terminating services.
const MIN_TERMINATION_NOTICE_DAYS = 10;

function formatLabel(v: string, options: { value: string; label: string }[]) {
  return options.find((o) => o.value === v)?.label || v;
}

interface Props {
  clientId: string;
}

export function ClientNoticesSection({ clientId }: Props) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const queryKey = ["/api/clients", clientId, "notices"] as const;
  const { data: notices = [], isLoading } = useQuery<ClientNotice[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}/notices`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load client notices");
      return r.json();
    },
    enabled: !!clientId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/client-notices/${id}`),
    onSuccess: () => {
      toast({ title: "Notice deleted" });
      invalidate();
    },
    onError: (e: any) =>
      toast({ title: "Could not delete", description: e?.message, variant: "destructive" }),
  });

  const hasInfoPacket = notices.some((n) => n.noticeType === "information_packet");
  const hasDcwNotice = notices.some((n) => n.noticeType === "dcw_status_notice");

  return (
    <Card data-testid="client-notices-section">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> Client Rights & Notices
            </CardTitle>
            <CardDescription>
              28 Pa. Code § 611.57 consumer-protection notices — the pre-service information
              packet, Consumer Notice of Direct Care Worker Status, and the 10-day advance
              written service-termination notice.
            </CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-new-client-notice">
                <Plus className="h-4 w-4 mr-1" /> Record Notice
              </Button>
            </DialogTrigger>
            <NoticeFormDialog
              clientId={clientId}
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
        {(!hasInfoPacket || !hasDcwNotice) && (
          <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Missing required notice{!hasInfoPacket && !hasDcwNotice ? "s" : ""}:{" "}
            {[!hasInfoPacket && "pre-service information packet", !hasDcwNotice && "Direct Care Worker status notice"]
              .filter(Boolean)
              .join(" and ")}.
          </div>
        )}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : notices.length === 0 ? (
          <div className="text-sm text-muted-foreground">No notices on file.</div>
        ) : (
          notices.map((n) => {
            const daysNotice =
              n.noticeType === "service_termination_notice" && n.effectiveDate
                ? Math.round(
                    (new Date(n.effectiveDate).getTime() - new Date(n.providedAt).getTime()) / 86_400_000,
                  )
                : null;
            const shortNotice = daysNotice !== null && daysNotice < MIN_TERMINATION_NOTICE_DAYS;
            return (
              <div
                key={n.id}
                className="border rounded-md p-3 space-y-2"
                data-testid={`client-notice-card-${n.id}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{formatLabel(n.noticeType, NOTICE_TYPES)}</Badge>
                  <Badge variant="outline">{formatLabel(n.method || "in_person", METHODS)}</Badge>
                  {shortNotice && (
                    <Badge variant="destructive">
                      Only {daysNotice} day{daysNotice === 1 ? "" : "s"} notice — below the 10-day minimum
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {format(new Date(n.providedAt), "PP")}
                  </span>
                </div>
                {n.effectiveDate && (
                  <div className="text-xs text-muted-foreground">
                    Effective {format(new Date(n.effectiveDate), "PP")}
                  </div>
                )}
                {n.notes && <div className="text-sm whitespace-pre-wrap">{n.notes}</div>}
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMut.mutate(n.id)}
                    disabled={deleteMut.isPending}
                    data-testid={`button-delete-client-notice-${n.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function NoticeFormDialog({
  clientId,
  onClose,
  onCreated,
}: {
  clientId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    noticeType: "information_packet",
    providedAt: format(new Date(), "yyyy-MM-dd"),
    method: "in_person",
    effectiveDate: "",
    notes: "",
  });

  const daysNotice =
    form.noticeType === "service_termination_notice" && form.effectiveDate
      ? Math.round(
          (new Date(form.effectiveDate).getTime() - new Date(form.providedAt).getTime()) / 86_400_000,
        )
      : null;

  const createMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        noticeType: form.noticeType,
        providedAt: new Date(form.providedAt).toISOString(),
        method: form.method,
        effectiveDate: form.effectiveDate ? new Date(form.effectiveDate).toISOString() : undefined,
        notes: form.notes || undefined,
      };
      return apiRequest("POST", `/api/clients/${clientId}/notices`, payload);
    },
    onSuccess: () => {
      toast({ title: "Notice recorded" });
      onCreated();
    },
    onError: (e: any) =>
      toast({ title: "Failed to record notice", description: e?.message, variant: "destructive" }),
  });

  return (
    <DialogContent className="max-w-xl" data-testid="dialog-client-notice-form">
      <DialogHeader>
        <DialogTitle>Record Client Notice</DialogTitle>
        <DialogDescription>
          Documents delivery of a required consumer-protection notice, per 28 Pa. Code § 611.57.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label>Notice type</Label>
          <Select
            value={form.noticeType}
            onValueChange={(v) => setForm((f) => ({ ...f, noticeType: v }))}
          >
            <SelectTrigger data-testid="select-notice-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {NOTICE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Provided on</Label>
            <Input
              type="date"
              value={form.providedAt}
              onChange={(e) => setForm((f) => ({ ...f, providedAt: e.target.value }))}
              data-testid="input-provided-at"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select
              value={form.method}
              onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}
            >
              <SelectTrigger data-testid="select-notice-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {form.noticeType === "service_termination_notice" && (
          <div className="space-y-1.5">
            <Label>Services end (effective date)</Label>
            <Input
              type="date"
              min={format(addDays(new Date(form.providedAt || new Date()), 0), "yyyy-MM-dd")}
              value={form.effectiveDate}
              onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              data-testid="input-effective-date"
            />
            {daysNotice !== null && (
              <p className={`text-xs ${daysNotice < MIN_TERMINATION_NOTICE_DAYS ? "text-destructive" : "text-muted-foreground"}`}>
                {daysNotice} day{daysNotice === 1 ? "" : "s"} notice
                {daysNotice < MIN_TERMINATION_NOTICE_DAYS ? " — below the 10-calendar-day minimum required by § 611.57." : "."}
              </p>
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            data-testid="textarea-notice-notes"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          data-testid="button-save-client-notice"
        >
          {createMut.isPending ? "Saving…" : "Save Notice"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
