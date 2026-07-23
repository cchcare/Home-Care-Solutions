import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserPlus, Pencil, Loader2 } from "lucide-react";
import { parseDateOnlyInput, toDateOnlyInputValue, formatDateOnly } from "@/lib/dateOnly";
import type { ClientReferral, ReferralSource } from "@shared/schema";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  qualified: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  converted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const emptyForm = {
  referralSourceId: "", referralDate: format(new Date(), "yyyy-MM-dd"),
  referralNotes: "", status: "converted", assignedTo: "",
};

export function ClientReferralSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/clients", clientId, "referral"] as const;
  const { data: referral, isLoading } = useQuery<ClientReferral | null>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}/referral`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load referral info");
      return r.json();
    },
  });

  const { data: sources = [] } = useQuery<ReferralSource[]>({ queryKey: ["/api/referral-sources"] });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        referralSourceId: form.referralSourceId,
        referralDate: parseDateOnlyInput(form.referralDate)?.toISOString(),
        referralNotes: form.referralNotes || undefined,
        status: form.status,
        assignedTo: form.assignedTo || undefined,
      };
      if (referral) return apiRequest("PATCH", `/api/client-referrals/${referral.id}`, payload);
      return apiRequest("POST", "/api/client-referrals", { ...payload, clientId, convertedToClient: true, conversionDate: new Date().toISOString() });
    },
    onSuccess: () => {
      toast({ title: referral ? "Referral info updated" : "Referral info recorded" });
      invalidate();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openForm = () => {
    if (referral) {
      setForm({
        referralSourceId: referral.referralSourceId,
        referralDate: referral.referralDate ? toDateOnlyInputValue(referral.referralDate) : format(new Date(), "yyyy-MM-dd"),
        referralNotes: referral.referralNotes || "",
        status: referral.status || "converted",
        assignedTo: referral.assignedTo || "",
      });
    } else {
      setForm(emptyForm);
    }
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" />Referral Member Info</CardTitle>
            <CardDescription>How this client was referred to the agency.</CardDescription>
          </div>
          <Button size="sm" variant={referral ? "outline" : "default"} onClick={openForm} data-testid="button-edit-referral">
            {referral ? <><Pencil className="w-4 h-4 mr-2" />Edit</> : <><UserPlus className="w-4 h-4 mr-2" />Record Referral</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !referral ? (
          <p className="text-muted-foreground text-sm text-center py-8">No referral source recorded for this client</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Referral Source</Label>
              <p className="font-medium" data-testid="text-referral-source">
                {sources.find((s) => s.id === referral.referralSourceId)?.name || "Unknown"}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Referral Date</Label>
              <p className="font-medium" data-testid="text-referral-date">
                {referral.referralDate ? formatDateOnly(referral.referralDate, (d) => format(d, "MMM d, yyyy")) : "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Status</Label>
              <Badge className={`border-0 ${STATUS_STYLES[referral.status || "converted"]}`}>{referral.status}</Badge>
            </div>
            {referral.referralNotes && (
              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <Label className="text-muted-foreground text-sm">Notes</Label>
                <p className="text-sm whitespace-pre-wrap">{referral.referralNotes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{referral ? "Edit Referral Info" : "Record Referral"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Referral Source *</Label>
              <Select value={form.referralSourceId} onValueChange={(v) => setForm((f) => ({ ...f, referralSourceId: v }))}>
                <SelectTrigger data-testid="select-referral-source"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Referral Date</Label>
                <Input type="date" value={form.referralDate} onChange={(e) => setForm((f) => ({ ...f, referralDate: e.target.value }))} data-testid="input-referral-date" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-referral-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.referralNotes} onChange={(e) => setForm((f) => ({ ...f, referralNotes: e.target.value }))} data-testid="textarea-referral-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.referralSourceId} data-testid="button-save-referral">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
