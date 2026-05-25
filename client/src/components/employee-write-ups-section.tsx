import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
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
import {
  AlertOctagon,
  CheckCircle2,
  FileSignature,
  Paperclip,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";

type EmployeeNote = {
  id: string;
  noteType: string;
  severity?: string | null;
  subject?: string | null;
  summary: string;
  incidentDate?: string | null;
  actionPlan?: string | null;
  followUpDate?: string | null;
  followUpStatus?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  acknowledgedAt?: string | null;
  acknowledgmentSignatureName?: string | null;
  authorId?: string | null;
  employeeType: string;
  employeeId: string;
  attachmentDocumentIds?: string[] | null;
  createdAt?: string | null;
};

const NOTE_TYPES = [
  { value: "coaching", label: "Coaching" },
  { value: "verbal_warning", label: "Verbal Warning" },
  { value: "written_warning", label: "Written Warning" },
  { value: "final_warning", label: "Final Warning" },
  { value: "pip", label: "Performance Improvement Plan" },
  { value: "commendation", label: "Commendation" },
  { value: "performance", label: "Performance" },
  { value: "general", label: "General" },
];

const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const severityVariant: Record<string, "secondary" | "default" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
  critical: "destructive",
};

function formatTypeLabel(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  employeeType: "caregiver" | "user";
  employeeId: string;
  selfView?: boolean;
  title?: string;
  description?: string;
}

export function EmployeeWriteUpsSection({
  employeeType,
  employeeId,
  selfView = false,
  title = "Write-Ups & Coaching",
  description = "Confidential disciplinary notes, coaching, and commendations on file for this employee.",
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState<EmployeeNote | null>(null);
  const [attachFor, setAttachFor] = useState<EmployeeNote | null>(null);

  const queryKey = ["/api/employees", employeeType, employeeId, "write-ups"] as const;
  const { data: notes = [], isLoading } = useQuery<EmployeeNote[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/employees/${employeeType}/${employeeId}/write-ups`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to load write-ups");
      return r.json();
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKey as any });
    queryClient.invalidateQueries({ queryKey: ["/api/write-ups/open-follow-ups"] });
    queryClient.invalidateQueries({ queryKey: ["/api/write-ups"] });
  };

  const sendForAckMut = useMutation({
    mutationFn: async (noteId: string) =>
      apiRequest("POST", `/api/write-ups/${noteId}/send-for-acknowledgement`, {}),
    onSuccess: (r: any) => {
      toast({
        title: "Sent for eSignature",
        description: r?.signUrl
          ? "Employee will receive an email with a signing link."
          : "Signing request created.",
      });
      invalidate();
    },
    onError: (e: any) =>
      toast({
        title: "Could not send",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const role = (user as any)?.role;
  const isHr = role === "super_admin" || role === "admin" || role === "office_admin";
  const canAdd = !selfView && (isHr || role === "manager" || role === "supervisor");

  return (
    <Card data-testid="employee-write-ups-section">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-amber-600" /> {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {canAdd && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-new-write-up">
                  <Plus className="h-4 w-4 mr-1" /> New Write-Up
                </Button>
              </DialogTrigger>
              <WriteUpFormDialog
                employeeType={employeeType}
                employeeId={employeeId}
                onClose={() => setCreateOpen(false)}
                onCreated={() => {
                  invalidate();
                  setCreateOpen(false);
                }}
              />
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="text-sm text-muted-foreground">No write-ups on file.</div>
        ) : (
          notes.map((n) => {
            const overdue =
              n.followUpStatus === "open" &&
              n.followUpDate &&
              new Date(n.followUpDate).getTime() < Date.now();
            const canManage =
              !selfView && (isHr || n.authorId === (user as any)?.id);
            return (
              <div
                key={n.id}
                className="border rounded-md p-3 space-y-2"
                data-testid={`write-up-card-${n.id}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{formatTypeLabel(n.noteType)}</Badge>
                  {n.severity && (
                    <Badge variant={severityVariant[n.severity] ?? "secondary"}>
                      {n.severity}
                    </Badge>
                  )}
                  {n.acknowledgedAt ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> eSigned
                    </Badge>
                  ) : (
                    <Badge variant="outline">Awaiting eSignature</Badge>
                  )}
                  {n.followUpStatus === "resolved" && (
                    <Badge variant="secondary">Resolved</Badge>
                  )}
                  {overdue && <Badge variant="destructive">Follow-up overdue</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {n.createdAt ? format(new Date(n.createdAt), "PP") : ""}
                  </span>
                </div>
                {n.subject && (
                  <div className="font-medium text-sm">{n.subject}</div>
                )}
                <div className="text-sm whitespace-pre-wrap">{n.summary}</div>
                {n.actionPlan && (
                  <div className="text-sm">
                    <span className="font-medium">Action plan: </span>
                    <span className="whitespace-pre-wrap">{n.actionPlan}</span>
                  </div>
                )}
                {n.followUpDate && (
                  <div className="text-xs text-muted-foreground">
                    Follow-up by {format(new Date(n.followUpDate), "PP")}
                  </div>
                )}
                {!!(n.attachmentDocumentIds && n.attachmentDocumentIds.length) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    {n.attachmentDocumentIds.map((docId) => (
                      <AttachmentChip
                        key={docId}
                        noteId={n.id}
                        docId={docId}
                        canRemove={canManage}
                        onChange={invalidate}
                      />
                    ))}
                  </div>
                )}
                {n.acknowledgedAt && (
                  <div className="text-xs text-muted-foreground">
                    eSigned by{" "}
                    <span className="font-medium">
                      {n.acknowledgmentSignatureName}
                    </span>{" "}
                    on {format(new Date(n.acknowledgedAt), "PPpp")}
                  </div>
                )}
                {n.resolvedAt && (
                  <div className="text-xs text-muted-foreground">
                    Resolved {format(new Date(n.resolvedAt), "PP")}
                    {n.resolutionNotes ? ` — ${n.resolutionNotes}` : ""}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {canManage && !n.acknowledgedAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendForAckMut.mutate(n.id)}
                      disabled={sendForAckMut.isPending}
                      data-testid={`button-send-for-esign-${n.id}`}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send for eSignature
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAttachFor(n)}
                      data-testid={`button-attach-${n.id}`}
                    >
                      <Paperclip className="h-4 w-4 mr-1" /> Add document
                    </Button>
                  )}
                  {canManage && n.followUpStatus === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setResolveOpen(n)}
                      data-testid={`button-resolve-${n.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Resolved
                    </Button>
                  )}
                  {selfView && !n.acknowledgedAt && (
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <FileSignature className="h-3 w-3" />
                      Check your email for an eSignature link.
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        <ResolveDialog
          note={resolveOpen}
          onClose={() => setResolveOpen(null)}
          onDone={() => {
            invalidate();
            setResolveOpen(null);
          }}
        />
        <AttachDocumentDialog
          note={attachFor}
          onClose={() => setAttachFor(null)}
          onDone={() => {
            invalidate();
            setAttachFor(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

function AttachmentChip({
  noteId,
  docId,
  canRemove,
  onChange,
}: {
  noteId: string;
  docId: string;
  canRemove: boolean;
  onChange: () => void;
}) {
  const { toast } = useToast();
  const detachMut = useMutation({
    mutationFn: async () =>
      apiRequest("DELETE", `/api/write-ups/${noteId}/attachments/${docId}`),
    onSuccess: () => {
      toast({ title: "Attachment removed" });
      onChange();
    },
    onError: (e: any) =>
      toast({
        title: "Could not remove",
        description: e?.message,
        variant: "destructive",
      }),
  });
  return (
    <span className="inline-flex items-center gap-1 border rounded px-2 py-0.5 bg-muted">
      <a
        className="text-blue-600 hover:underline"
        href={`/api/documents/${docId}/view`}
        target="_blank"
        rel="noreferrer"
        data-testid={`attachment-view-${docId}`}
      >
        Document {docId.slice(0, 6)}
      </a>
      {canRemove && (
        <button
          type="button"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => detachMut.mutate()}
          disabled={detachMut.isPending}
          data-testid={`attachment-remove-${docId}`}
          aria-label="Remove attachment"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function WriteUpFormDialog({
  employeeType,
  employeeId,
  onClose,
  onCreated,
}: {
  employeeType: string;
  employeeId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    noteType: "coaching",
    severity: "low",
    subject: "",
    summary: "",
    incidentDate: "",
    actionPlan: "",
    followUpDate: "",
  });
  const createMut = useMutation({
    mutationFn: async () => {
      if (!form.summary.trim()) {
        throw new Error("Summary is required");
      }
      const payload: any = {
        noteType: form.noteType,
        severity: form.severity,
        subject: form.subject || undefined,
        summary: form.summary,
        actionPlan: form.actionPlan || undefined,
        incidentDate: form.incidentDate ? new Date(form.incidentDate).toISOString() : undefined,
        followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
      };
      const created: any = await apiRequest(
        "POST",
        `/api/employees/${employeeType}/${employeeId}/write-ups`,
        payload,
      );
      // Upload each pending attachment, best-effort, and continue even on
      // failure of individual files.
      for (const f of pendingFiles) {
        try {
          const fd = new FormData();
          fd.append("file", f);
          const r = await fetch(`/api/write-ups/${created.id}/attachments`, {
            method: "POST",
            body: fd,
            credentials: "include",
          });
          if (!r.ok) throw new Error(`Upload failed for ${f.name}`);
        } catch (err: any) {
          toast({
            title: `Attachment failed: ${f.name}`,
            description: err?.message,
            variant: "destructive",
          });
        }
      }
      return created;
    },
    onSuccess: () => {
      toast({ title: "Write-up filed" });
      onCreated();
    },
    onError: (e: any) => {
      toast({ title: "Failed to file write-up", description: e?.message, variant: "destructive" });
    },
  });

  return (
    <DialogContent className="max-w-xl" data-testid="dialog-write-up-form">
      <DialogHeader>
        <DialogTitle>New Write-Up</DialogTitle>
        <DialogDescription>
          Formal disciplinary, coaching, or commendation note. Visible only to
          the employee, their manager chain, and HR. The employee will sign via
          the agency's eSignature workflow.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.noteType}
              onValueChange={(v) => setForm((f) => ({ ...f, noteType: v }))}
            >
              <SelectTrigger data-testid="select-note-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select
              value={form.severity}
              onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}
            >
              <SelectTrigger data-testid="select-severity"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Short headline (optional)"
            data-testid="input-subject"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Summary <span className="text-destructive">*</span></Label>
          <Textarea
            rows={4}
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            placeholder="What happened, observations, evidence…"
            data-testid="textarea-summary"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Action plan / expectations</Label>
          <Textarea
            rows={3}
            value={form.actionPlan}
            onChange={(e) => setForm((f) => ({ ...f, actionPlan: e.target.value }))}
            placeholder="Required corrective actions, expectations going forward"
            data-testid="textarea-action-plan"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Incident date</Label>
            <Input
              type="date"
              value={form.incidentDate}
              onChange={(e) => setForm((f) => ({ ...f, incidentDate: e.target.value }))}
              data-testid="input-incident-date"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Follow-up date</Label>
            <Input
              type="date"
              value={form.followUpDate}
              onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))}
              data-testid="input-follow-up-date"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Supporting documents</Label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            data-testid="input-write-up-files"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setPendingFiles((prev) => [...prev, ...files]);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-pick-files"
          >
            <Paperclip className="h-4 w-4 mr-1" /> Attach files
          </Button>
          {pendingFiles.length > 0 && (
            <ul className="text-xs space-y-1 mt-1">
              {pendingFiles.map((f, idx) => (
                <li key={`${f.name}-${idx}`} className="flex items-center gap-2">
                  <span>{f.name}</span>
                  <span className="text-muted-foreground">({Math.round(f.size / 1024)} KB)</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingFiles((p) => p.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Files are saved to the employee's HIPAA-managed document library and
            linked to this write-up.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending || !form.summary.trim()}
          data-testid="button-save-write-up"
        >
          {createMut.isPending ? "Saving…" : "File Write-Up"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AttachDocumentDialog({
  note,
  onClose,
  onDone,
}: {
  note: EmployeeNote | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!note || !file) throw new Error("Choose a file");
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/write-ups/${note.id}/attachments`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || "Upload failed");
      }
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Document attached" });
      setFile(null);
      onDone();
    },
    onError: (e: any) =>
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" }),
  });
  return (
    <Dialog open={!!note} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="dialog-attach-document">
        <DialogHeader>
          <DialogTitle>Attach Supporting Document</DialogTitle>
          <DialogDescription>
            File will be added to the employee's document library and linked to
            this write-up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            data-testid="input-attach-file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 mr-1" />
            {file ? "Change file" : "Choose file"}
          </Button>
          {file && (
            <div className="text-xs text-muted-foreground">
              {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => uploadMut.mutate()}
            disabled={uploadMut.isPending || !file}
            data-testid="button-upload-attachment"
          >
            {uploadMut.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResolveDialog({
  note,
  onClose,
  onDone,
}: {
  note: EmployeeNote | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [resolution, setResolution] = useState("");
  const mut = useMutation({
    mutationFn: async () => {
      if (!note) return;
      return apiRequest("POST", `/api/write-ups/${note.id}/resolve`, {
        resolutionNotes: resolution.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Follow-up marked resolved" });
      setResolution("");
      onDone();
    },
    onError: (e: any) =>
      toast({ title: "Failed to resolve", description: e?.message, variant: "destructive" }),
  });
  return (
    <Dialog open={!!note} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="dialog-resolve">
        <DialogHeader>
          <DialogTitle>Resolve Follow-Up</DialogTitle>
          <DialogDescription>
            Close out the follow-up obligation for this write-up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Resolution notes</Label>
          <Textarea
            rows={3}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            data-testid="textarea-resolution-notes"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            data-testid="button-confirm-resolve"
          >
            {mut.isPending ? "Saving…" : "Mark Resolved"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
