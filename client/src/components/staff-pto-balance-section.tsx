import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Wallet, Pencil, Loader2 } from "lucide-react";
import type { PtoBalance } from "@shared/schema";

const PTO_TYPES = [
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick" },
  { value: "personal", label: "Personal" },
];

const emptyForm = { ptoType: "vacation", accrued: "0", used: "0", available: "0" };

export function StaffPtoBalanceSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const year = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PtoBalance | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/users", userId, "pto-balance", year] as const;
  const { data: balances = [], isLoading } = useQuery<PtoBalance[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/users/${userId}/pto-balance?year=${year}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load PTO balance");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (balance: PtoBalance) => {
    setEditing(balance);
    setForm({
      ptoType: balance.ptoType,
      accrued: String(balance.accrued ?? "0"),
      used: String(balance.used ?? "0"),
      available: String(balance.available ?? "0"),
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/users/${userId}/pto-balance`, {
      ptoType: form.ptoType,
      year,
      accrued: form.accrued,
      used: form.used,
      available: form.available,
    }),
    onSuccess: () => {
      toast({ title: editing ? "PTO balance updated" : "PTO balance added" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" />PTO Balances ({year})</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="button-add-staff-pto">
            <Pencil className="w-4 h-4 mr-2" />Set Balance
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Staff PTO balances are tracked manually here. Field caregivers use the automatic accrual ledger under PTO Balances.
        </p>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : balances.length === 0 ? (
          <p className="text-muted-foreground text-sm">No PTO balance on file for {year}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Accrued</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((b) => (
                <TableRow key={b.id} data-testid={`row-staff-pto-${b.id}`}>
                  <TableCell className="capitalize">{b.ptoType}</TableCell>
                  <TableCell>{parseFloat(String(b.accrued ?? 0)).toFixed(2)}h</TableCell>
                  <TableCell>{parseFloat(String(b.used ?? 0)).toFixed(2)}h</TableCell>
                  <TableCell className="font-medium">{parseFloat(String(b.available ?? 0)).toFixed(2)}h</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)} data-testid={`button-edit-staff-pto-${b.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit PTO Balance" : "Set PTO Balance"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>PTO Type</Label>
              <Select value={form.ptoType} onValueChange={(v) => setForm(f => ({ ...f, ptoType: v }))} disabled={!!editing}>
                <SelectTrigger data-testid="select-staff-pto-type"><SelectValue /></SelectTrigger>
                <SelectContent>{PTO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Accrued (h)</Label>
                <Input type="number" step="0.01" min="0" value={form.accrued} onChange={(e) => setForm(f => ({ ...f, accrued: e.target.value }))} data-testid="input-staff-pto-accrued" />
              </div>
              <div className="space-y-2">
                <Label>Used (h)</Label>
                <Input type="number" step="0.01" min="0" value={form.used} onChange={(e) => setForm(f => ({ ...f, used: e.target.value }))} data-testid="input-staff-pto-used" />
              </div>
              <div className="space-y-2">
                <Label>Available (h)</Label>
                <Input type="number" step="0.01" min="0" value={form.available} onChange={(e) => setForm(f => ({ ...f, available: e.target.value }))} data-testid="input-staff-pto-available" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-staff-pto">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
