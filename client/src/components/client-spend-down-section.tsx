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
import { Wallet, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface ClientSpendDown {
  id: string;
  periodStart: string;
  periodEnd: string;
  spendDownAmount: string;
  amountMet?: string | null;
  status: string;
  metDate?: string | null;
  notes?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  not_met: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  partially_met: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  met: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const emptyForm = {
  periodStart: format(new Date(), "yyyy-MM-01"),
  periodEnd: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd"),
  spendDownAmount: "", amountMet: "0", status: "not_met", metDate: "", notes: "",
};

export function ClientSpendDownSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientSpendDown | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/clients", clientId, "spend-downs"] as const;
  const { data: spendDowns = [], isLoading } = useQuery<ClientSpendDown[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}/spend-downs`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load spend-down records");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        periodStart: new Date(form.periodStart).toISOString(),
        periodEnd: new Date(form.periodEnd).toISOString(),
        spendDownAmount: form.spendDownAmount,
        amountMet: form.amountMet || "0",
        status: form.status,
        metDate: form.metDate ? new Date(form.metDate).toISOString() : undefined,
        notes: form.notes || undefined,
      };
      if (editing) return apiRequest("PUT", `/api/client-spend-downs/${editing.id}`, payload);
      return apiRequest("POST", `/api/clients/${clientId}/spend-downs`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Spend-down updated" : "Spend-down added" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/client-spend-downs/${id}`),
    onSuccess: () => { toast({ title: "Spend-down deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (sd: ClientSpendDown) => {
    setEditing(sd);
    setForm({
      periodStart: sd.periodStart.slice(0, 10),
      periodEnd: sd.periodEnd.slice(0, 10),
      spendDownAmount: String(sd.spendDownAmount),
      amountMet: sd.amountMet ? String(sd.amountMet) : "0",
      status: sd.status,
      metDate: sd.metDate ? sd.metDate.slice(0, 10) : "",
      notes: sd.notes || "",
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" />Spend Down</CardTitle>
            <CardDescription>PA Medicaid excess-income "spend-down" tracking — the amount this client must incur in medical expenses each period before Medicaid coverage activates.</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} data-testid="button-add-spend-down">
            <Plus className="w-4 h-4 mr-2" />Add Period
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : spendDowns.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No spend-down periods tracked</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Spend-Down Amount</TableHead>
                <TableHead>Amount Met</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {spendDowns.map((sd) => (
                <TableRow key={sd.id} data-testid={`row-spend-down-${sd.id}`}>
                  <TableCell className="text-sm">
                    {format(new Date(sd.periodStart), "MMM d")} – {format(new Date(sd.periodEnd), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>${parseFloat(sd.spendDownAmount).toFixed(2)}</TableCell>
                  <TableCell>${parseFloat(sd.amountMet || "0").toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${STATUS_STYLES[sd.status]}`}>{sd.status.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(sd)} data-testid={`button-edit-spend-down-${sd.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(sd.id)} data-testid={`button-delete-spend-down-${sd.id}`}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Spend-Down Period" : "Add Spend-Down Period"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start *</Label>
                <Input type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} data-testid="input-spend-down-start" />
              </div>
              <div className="space-y-2">
                <Label>Period End *</Label>
                <Input type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} data-testid="input-spend-down-end" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Spend-Down Amount *</Label>
                <Input type="number" step="0.01" min="0" value={form.spendDownAmount} onChange={(e) => setForm((f) => ({ ...f, spendDownAmount: e.target.value }))} data-testid="input-spend-down-amount" />
              </div>
              <div className="space-y-2">
                <Label>Amount Met</Label>
                <Input type="number" step="0.01" min="0" value={form.amountMet} onChange={(e) => setForm((f) => ({ ...f, amountMet: e.target.value }))} data-testid="input-spend-down-met" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-spend-down-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_met">Not Met</SelectItem>
                    <SelectItem value="partially_met">Partially Met</SelectItem>
                    <SelectItem value="met">Met</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Met Date</Label>
                <Input type="date" value={form.metDate} onChange={(e) => setForm((f) => ({ ...f, metDate: e.target.value }))} data-testid="input-spend-down-met-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} data-testid="textarea-spend-down-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.spendDownAmount || !form.periodStart || !form.periodEnd} data-testid="button-save-spend-down">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Spend-Down Period?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-spend-down">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
