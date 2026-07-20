import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { DollarSign, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const SERVICE_TYPES = [
  { value: "personal_care", label: "Personal Care" },
  { value: "companion", label: "Companion" },
  { value: "respite", label: "Respite" },
  { value: "live_in", label: "Live-In" },
  { value: "other", label: "Other" },
];

interface CaregiverRate {
  id: string;
  serviceType: string;
  rate: string;
  rateType?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive?: boolean | null;
  notes?: string | null;
}

const emptyForm = { serviceType: "personal_care", rate: "", rateType: "hourly", effectiveFrom: "", effectiveTo: "", isActive: true, notes: "" };

export function CaregiverRatesSection({ caregiverId, baseWage }: { caregiverId: string; baseWage?: string | null }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaregiverRate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/caregivers", caregiverId, "rates"] as const;
  const { data: rates = [], isLoading } = useQuery<CaregiverRate[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/caregivers/${caregiverId}/rates`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load rates");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        serviceType: form.serviceType,
        rate: form.rate,
        rateType: form.rateType,
        effectiveFrom: form.effectiveFrom ? new Date(form.effectiveFrom).toISOString() : undefined,
        effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : undefined,
        isActive: form.isActive,
        notes: form.notes || undefined,
      };
      if (editing) return apiRequest("PUT", `/api/caregiver-rates/${editing.id}`, payload);
      return apiRequest("POST", `/api/caregivers/${caregiverId}/rates`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Rate updated" : "Rate added" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/caregiver-rates/${id}`),
    onSuccess: () => { toast({ title: "Rate deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (rate: CaregiverRate) => {
    setEditing(rate);
    setForm({
      serviceType: rate.serviceType,
      rate: String(rate.rate),
      rateType: rate.rateType || "hourly",
      effectiveFrom: rate.effectiveFrom ? rate.effectiveFrom.slice(0, 10) : "",
      effectiveTo: rate.effectiveTo ? rate.effectiveTo.slice(0, 10) : "",
      isActive: rate.isActive ?? true,
      notes: rate.notes || "",
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" />Pay Rates</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="button-add-rate">
            <Plus className="w-4 h-4 mr-2" />Add Rate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Base Hourly Wage</p>
          <p className="text-2xl font-bold" data-testid="text-base-wage">
            {baseWage ? `$${parseFloat(baseWage).toFixed(2)}/hr` : "Not set"}
          </p>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : rates.length === 0 ? (
          <p className="text-muted-foreground text-sm">No additional rates configured</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Type</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id} data-testid={`row-rate-${rate.id}`}>
                  <TableCell className="font-medium capitalize">{rate.serviceType?.replace(/_/g, " ")}</TableCell>
                  <TableCell>${parseFloat(rate.rate).toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{rate.rateType}</TableCell>
                  <TableCell>{rate.effectiveFrom ? format(new Date(rate.effectiveFrom), "MMM d, yyyy") : "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={rate.isActive ? "default" : "secondary"}>{rate.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rate)} data-testid={`button-edit-rate-${rate.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(rate.id)} data-testid={`button-delete-rate-${rate.id}`}>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Rate" : "Add Rate"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={form.serviceType} onValueChange={(v) => setForm((f) => ({ ...f, serviceType: v }))}>
                <SelectTrigger data-testid="select-rate-service-type"><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate *</Label>
                <Input type="number" step="0.01" min="0" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} data-testid="input-rate-amount" />
              </div>
              <div className="space-y-2">
                <Label>Rate Type</Label>
                <Select value={form.rateType} onValueChange={(v) => setForm((f) => ({ ...f, rateType: v }))}>
                  <SelectTrigger data-testid="select-rate-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="per_visit">Per Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective From</Label>
                <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} data-testid="input-rate-effective-from" />
              </div>
              <div className="space-y-2">
                <Label>Effective To</Label>
                <Input type="date" value={form.effectiveTo} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} data-testid="input-rate-effective-to" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} data-testid="textarea-rate-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.rate} data-testid="button-save-rate">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Rate?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-rate">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
