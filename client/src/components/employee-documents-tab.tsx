import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Upload,
  Eye,
  Download,
  ShieldCheck,
  ClipboardSignature,
  FileSignature,
  AlertTriangle,
  Send,
} from "lucide-react";

export const DOCUMENT_CATEGORIES: { value: string; label: string }[] = [
  { value: "id", label: "ID / Personal" },
  { value: "tax_form", label: "Tax Form" },
  { value: "certification", label: "Certification" },
  { value: "training", label: "Training Certificate" },
  { value: "background_check", label: "Background Check" },
  { value: "medical", label: "Medical / Health" },
  { value: "signed_policy", label: "Signed Policy" },
  { value: "performance_review", label: "Performance Review" },
  { value: "write_up", label: "Write-Up / Discipline" },
  { value: "employment_verification", label: "Employment Verification" },
  { value: "other", label: "Other" },
];

type EmployeeKind = "user" | "caregiver";

type LibraryItem = {
  source: "document" | "generated_letter" | "esignature" | "policy_ack";
  id: string;
  title: string;
  category: string;
  createdAt: string | null;
  expiresAt: string | null;
  viewUrl?: string | null;
  downloadUrl?: string | null;
  documentId?: string | null;
  status?: string;
  signedAt?: string | null;
  policyId?: string;
  policyVersion?: string | null;
  method?: string | null;
};

type PolicyStatus = {
  policyId: string;
  title: string;
  category: string | null;
  version: string | null;
  status: string | null;
  dueAt: string | null;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  ackMethod: string | null;
  assigned: boolean;
  lastReminderAt: string | null;
  recentlyReminded: boolean;
};

const sourceLabels: Record<LibraryItem["source"], string> = {
  document: "Document",
  generated_letter: "Generated Letter",
  esignature: "E-Signature",
  policy_ack: "Policy Acknowledgment",
};

const sourceIcons: Record<LibraryItem["source"], JSX.Element> = {
  document: <FileText className="w-4 h-4" />,
  generated_letter: <FileSignature className="w-4 h-4" />,
  esignature: <ClipboardSignature className="w-4 h-4" />,
  policy_ack: <ShieldCheck className="w-4 h-4" />,
};

export function EmployeeDocumentsTab({
  kind,
  employeeId,
}: {
  kind: EmployeeKind;
  employeeId: string;
}) {
  const { toast } = useToast();
  const [uploadCategory, setUploadCategory] = useState("other");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const libraryKey = ["/api/employees", kind, employeeId, "documents"] as const;
  const policyKey = ["/api/employees/user", employeeId, "policy-status"] as const;

  const { data: items = [], isLoading } = useQuery<LibraryItem[]>({
    queryKey: libraryKey,
    queryFn: async () => {
      const res = await fetch(`/api/employees/${kind}/${employeeId}/documents`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
  });

  const { data: policyStatus = [], isLoading: policyLoading } = useQuery<PolicyStatus[]>({
    queryKey: policyKey,
    enabled: kind === "user",
    queryFn: async () => {
      const res = await fetch(`/api/employees/user/${employeeId}/policy-status`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load policy status");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("documentCategory", uploadCategory);
      fd.append("documentType", uploadCategory);
      if (expiresAt) fd.append("expiresAt", expiresAt);
      if (kind === "caregiver") fd.append("caregiverId", employeeId);
      else fd.append("userId", employeeId);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      setSelectedFile(null);
      setExpiresAt("");
      toast({ title: "Document uploaded" });
      queryClient.invalidateQueries({ queryKey: libraryKey });
    },
    onError: (e: any) =>
      toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const remindMutation = useMutation({
    mutationFn: async (policyId: string) => {
      return apiRequest(
        "POST",
        `/api/policy-documents/${policyId}/remind/${employeeId}`,
        {},
      );
    },
    onSuccess: () => {
      toast({ title: "Reminder sent" });
      queryClient.invalidateQueries({ queryKey: policyKey });
    },
    onError: (e: any) =>
      toast({
        title: "Reminder not sent",
        description: e?.message || "Failed",
        variant: "destructive",
      }),
  });

  const filtered = items.filter((i) => sourceFilter === "all" || i.source === sourceFilter);

  const now = Date.now();
  const expiringSoon = items.filter((i) => {
    if (!i.expiresAt) return false;
    const t = new Date(i.expiresAt).getTime();
    return t >= now && t - now < 30 * 86400 * 1000;
  });

  return (
    <div className="space-y-6" data-testid="employee-documents-tab">
      {expiringSoon.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-4 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>
              <strong>{expiringSoon.length}</strong> document
              {expiringSoon.length === 1 ? "" : "s"} expiring within 30 days. They will appear
              in the Expiration Alerts dashboard.
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-4 h-4" /> Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger data-testid="select-employee-doc-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Expires on (optional)</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                data-testid="input-employee-doc-expires"
              />
            </div>
            <div>
              <Label className="text-xs">File</Label>
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                data-testid="input-employee-doc-file"
              />
            </div>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!selectedFile || uploadMutation.isPending}
              data-testid="button-employee-doc-upload"
            >
              {uploadMutation.isPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Document Library
            </CardTitle>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-employee-doc-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="generated_letter">Generated Letters</SelectItem>
                <SelectItem value="esignature">E-Signatures</SelectItem>
                <SelectItem value="policy_ack">Policy Acknowledgments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-employee-docs-empty">
              No documents in this view.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((it) => {
                  const expired =
                    it.expiresAt && new Date(it.expiresAt).getTime() < now;
                  return (
                    <TableRow key={`${it.source}-${it.id}`} data-testid={`row-employee-doc-${it.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          {sourceIcons[it.source]}
                          <span>{sourceLabels[it.source]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{it.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{it.category || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {it.createdAt ? format(new Date(it.createdAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {it.expiresAt ? (
                          <Badge variant={expired ? "destructive" : "secondary"}>
                            {format(new Date(it.expiresAt), "MMM d, yyyy")}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {it.viewUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(it.viewUrl!, "_blank")}
                              data-testid={`button-view-${it.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {it.downloadUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const a = document.createElement("a");
                                a.href = it.downloadUrl!;
                                a.download = it.title;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                              data-testid={`button-download-${it.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {kind === "user" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Policy Acknowledgments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {policyLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : policyStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No policies assigned or acknowledged yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policyStatus.map((p) => (
                    <TableRow key={p.policyId} data-testid={`row-policy-${p.policyId}`}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell className="text-sm">v{p.version || "?"}</TableCell>
                      <TableCell>
                        {p.acknowledged ? (
                          <Badge variant="default">
                            Signed{" "}
                            {p.acknowledgedAt
                              ? format(new Date(p.acknowledgedAt), "MMM d, yyyy")
                              : ""}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Outstanding</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.dueAt ? format(new Date(p.dueAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {!p.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={p.recentlyReminded || remindMutation.isPending}
                            onClick={() => remindMutation.mutate(p.policyId)}
                            data-testid={`button-remind-policy-${p.policyId}`}
                            title={
                              p.recentlyReminded
                                ? `Reminder sent ${
                                    p.lastReminderAt
                                      ? format(new Date(p.lastReminderAt), "MMM d, h:mm a")
                                      : "recently"
                                  } — next available after 24h`
                                : "Send reminder email"
                            }
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            {p.recentlyReminded ? "Reminded" : "Remind"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
