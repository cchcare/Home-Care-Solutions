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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ClipboardList, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { ClientAuthorization, Mco, CarePlan } from "@shared/schema";

const SERVICE_TYPES = [
  { value: "personal_care", label: "Personal Care" },
  { value: "companion", label: "Companion" },
  { value: "respite", label: "Respite" },
  { value: "live_in", label: "Live-In" },
  { value: "homemaker", label: "Homemaker" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  authorizationNumber: "", serviceType: "personal_care", mcoId: "", carePlanId: "",
  approvedHours: "", usedHours: "0", frequencyPerWeek: "",
  startDate: format(new Date(), "yyyy-MM-dd"), endDate: "", renewalDate: "",
  status: "active", notes: "",
};

export function ClientAuthorizationsSection({ clientId, officeId }: { clientId: string; officeId?: string | null }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientAuthorization | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/clients", clientId, "authorizations"] as const;
  const { data: authorizations = [], isLoading } = useQuery<ClientAuthorization[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}/authorizations`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load authorizations");
      return r.json();
    },
  });

  const { data: mcos = [] } = useQuery<Mco[]>({ queryKey: ["/api/mcos"] });
  const { data: carePlans = [] } = useQuery<CarePlan[]>({
    queryKey: ["/api/clients", clientId, "care-plans"],
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}/care-plans`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load care plans");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        authorizationNumber: form.authorizationNumber,
        serviceType: form.serviceType,
        mcoId: form.mcoId || undefined,
        carePlanId: form.carePlanId || undefined,
        approvedHours: form.approvedHours || undefined,
        usedHours: form.usedHours || undefined,
        frequencyPerWeek: form.frequencyPerWeek ? parseInt(form.frequencyPerWeek, 10) : undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        renewalDate: form.renewalDate ? new Date(form.renewalDate).toISOString() : undefined,
        status: form.status,
        notes: form.notes || undefined,
        officeId: officeId || undefined,
      };
      if (editing) return apiRequest("PUT", `/api/authorizations/${editing.id}`, payload);
      return apiRequest("POST", `/api/clients/${clientId}/authorizations`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Authorization updated" : "Authorization added" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/authorizations/${id}`),
    onSuccess: () => { toast({ title: "Authorization deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (auth: ClientAuthorization) => {
    setEditing(auth);
    setForm({
      authorizationNumber: auth.authorizationNumber,
      serviceType: auth.serviceType,
      mcoId: auth.mcoId || "",
      carePlanId: auth.carePlanId || "",
      approvedHours: auth.approvedHours ? String(auth.approvedHours) : "",
      usedHours: auth.usedHours ? String(auth.usedHours) : "0",
      frequencyPerWeek: auth.frequencyPerWeek != null ? String(auth.frequencyPerWeek) : "",
      startDate: new Date(auth.startDate).toISOString().slice(0, 10),
      endDate: auth.endDate ? new Date(auth.endDate).toISOString().slice(0, 10) : "",
      renewalDate: auth.renewalDate ? new Date(auth.renewalDate).toISOString().slice(0, 10) : "",
      status: auth.status || "active",
      notes: auth.notes || "",
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" />Authorizations & Orders</CardTitle>
            <CardDescription>MCO-approved service authorizations and hours for this client.</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} data-testid="button-add-authorization">
            <Plus className="w-4 h-4 mr-2" />Add Authorization
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : authorizations.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No authorizations on file</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auth #</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>MCO</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {authorizations.map((auth) => (
                <TableRow key={auth.id} data-testid={`row-authorization-${auth.id}`}>
                  <TableCell className="font-medium">{auth.authorizationNumber}</TableCell>
                  <TableCell className="capitalize">{auth.serviceType?.replace(/_/g, " ")}</TableCell>
                  <TableCell>{mcos.find((m) => m.id === auth.mcoId)?.name || "—"}</TableCell>
                  <TableCell className="text-sm">{auth.usedHours || 0} / {auth.approvedHours || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(auth.startDate), "MMM d, yyyy")}
                    {auth.endDate ? ` – ${format(new Date(auth.endDate), "MMM d, yyyy")}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={auth.status === "active" ? "default" : "secondary"}>{auth.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(auth)} data-testid={`button-edit-authorization-${auth.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(auth.id)} data-testid={`button-delete-authorization-${auth.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Authorization" : "Add Authorization"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Authorization # *</Label>
                <Input value={form.authorizationNumber} onChange={(e) => setForm((f) => ({ ...f, authorizationNumber: e.target.value }))} data-testid="input-auth-number" />
              </div>
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={form.serviceType} onValueChange={(v) => setForm((f) => ({ ...f, serviceType: v }))}>
                  <SelectTrigger data-testid="select-auth-service-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>MCO</Label>
                <Select value={form.mcoId} onValueChange={(v) => setForm((f) => ({ ...f, mcoId: v }))}>
                  <SelectTrigger data-testid="select-auth-mco"><SelectValue placeholder="Select MCO" /></SelectTrigger>
                  <SelectContent>{mcos.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Linked Care Plan</Label>
                <Select value={form.carePlanId} onValueChange={(v) => setForm((f) => ({ ...f, carePlanId: v }))}>
                  <SelectTrigger data-testid="select-auth-care-plan"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {carePlans.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Approved Hours</Label>
                <Input type="number" step="0.25" min="0" value={form.approvedHours} onChange={(e) => setForm((f) => ({ ...f, approvedHours: e.target.value }))} data-testid="input-auth-approved-hours" />
              </div>
              <div className="space-y-2">
                <Label>Used Hours</Label>
                <Input type="number" step="0.25" min="0" value={form.usedHours} onChange={(e) => setForm((f) => ({ ...f, usedHours: e.target.value }))} data-testid="input-auth-used-hours" />
              </div>
              <div className="space-y-2">
                <Label>Freq/Week</Label>
                <Input type="number" min="0" value={form.frequencyPerWeek} onChange={(e) => setForm((f) => ({ ...f, frequencyPerWeek: e.target.value }))} data-testid="input-auth-frequency" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} data-testid="input-auth-start-date" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} data-testid="input-auth-end-date" />
              </div>
              <div className="space-y-2">
                <Label>Renewal Date</Label>
                <Input type="date" value={form.renewalDate} onChange={(e) => setForm((f) => ({ ...f, renewalDate: e.target.value }))} data-testid="input-auth-renewal-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-auth-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} data-testid="textarea-auth-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.authorizationNumber.trim() || !form.startDate} data-testid="button-save-authorization">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Authorization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Authorization?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-authorization">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
