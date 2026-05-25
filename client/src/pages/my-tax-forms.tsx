import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { FileSignature, Download, Plus, Receipt } from "lucide-react";

interface TaxForm {
  id: string;
  formType: string;
  documentId: string | null;
  signedAt: string | null;
  effectiveDate: string | null;
  isCurrent: boolean;
  notes: string | null;
  createdAt: string;
}
interface ChangeRequest {
  id: string;
  formType: string;
  reason: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

const FORM_LABELS: Record<string, string> = {
  w4: "W-4 (Federal Withholding)",
  direct_deposit: "Direct Deposit",
  state_withholding: "State Withholding",
};

export default function MyTaxFormsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formType, setFormType] = useState<string>("w4");
  const [reason, setReason] = useState("");

  const { data: forms = [], isLoading } = useQuery<TaxForm[]>({
    queryKey: ["/api/my-tax-forms"],
  });
  const { data: requests = [] } = useQuery<ChangeRequest[]>({
    queryKey: ["/api/my-tax-forms/change-requests"],
  });

  const submit = useMutation({
    mutationFn: () => apiRequest("POST", "/api/my-tax-forms/change-request", { formType, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-tax-forms/change-requests"] });
      toast({ title: "Request submitted", description: "HR has been notified. They'll follow up with the updated form." });
      setOpen(false);
      setReason("");
    },
    onError: () => toast({ title: "Could not submit request", variant: "destructive" }),
  });

  const current = (type: string) => forms.find(f => f.formType === type && f.isCurrent);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="My Tax Forms" subtitle="W-4, direct deposit, and other tax documents on file" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-request-change">
                  <Plus className="h-4 w-4 mr-1" /> Request a change
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request a tax-form change</DialogTitle>
                  <DialogDescription>
                    HR will receive a high-priority task and follow up with the form for you to sign.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Form type</Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger data-testid="select-form-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="w4">W-4 (Federal Withholding)</SelectItem>
                        <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                        <SelectItem value="state_withholding">State Withholding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reason (optional)</Label>
                    <Textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="e.g. New bank account, marital status changed…"
                      data-testid="input-reason"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => submit.mutate()}
                    disabled={submit.isPending}
                    data-testid="button-submit-change-request"
                  >
                    {submit.isPending ? "Submitting…" : "Submit request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {["w4", "direct_deposit", "state_withholding"].map(type => {
              const f = current(type);
              return (
                <Card key={type} data-testid={`card-tax-form-${type}`}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileSignature className="h-4 w-4" /> {FORM_LABELS[type]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {f ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Signed</span>
                          <span>{f.signedAt ? format(new Date(f.signedAt), "MMM d, yyyy") : "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Effective</span>
                          <span>{f.effectiveDate ? format(new Date(f.effectiveDate), "MMM d, yyyy") : "—"}</span>
                        </div>
                        {f.documentId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => window.open(`/api/documents/${f.documentId}/download`, "_blank")}
                            data-testid={`button-download-${type}`}
                          >
                            <Download className="h-4 w-4 mr-1" /> Download PDF
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2">
                        No {FORM_LABELS[type]} on file yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" /> My change requests
              </CardTitle>
              <CardDescription>Status of any tax-form changes you've requested.</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground" data-testid="text-no-change-requests">
                  No change requests yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map(r => (
                    <div key={r.id} className="border rounded-md p-3" data-testid={`row-change-request-${r.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{FORM_LABELS[r.formType] || r.formType}</p>
                          <p className="text-xs text-muted-foreground">
                            Submitted {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "—"}
                          </p>
                        </div>
                        <Badge
                          variant={r.status === "completed" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}
                        >
                          {r.status}
                        </Badge>
                      </div>
                      {r.reason && <p className="text-sm mt-2">{r.reason}</p>}
                      {r.reviewNotes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">HR: {r.reviewNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
