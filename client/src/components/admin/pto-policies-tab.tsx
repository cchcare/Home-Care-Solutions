import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface PtoPolicy {
  id: string;
  name: string;
  ptoType: "vacation" | "sick" | "personal";
  role: string | null;
  officeId: string | null;
  hoursPerPeriod: string;
  capHours: string | null;
  accrualFrequency: string;
  isActive: boolean;
}

const PTO_TYPES = ["vacation", "sick", "personal"] as const;
const FREQUENCIES = ["weekly", "biweekly", "semi_monthly", "monthly"] as const;

const emptyPolicy = (): Partial<PtoPolicy> => ({
  name: "",
  ptoType: "vacation",
  role: null,
  officeId: null,
  hoursPerPeriod: "3.08",
  capHours: null,
  accrualFrequency: "biweekly",
  isActive: true,
});

export default function PtoPoliciesTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<PtoPolicy> | null>(null);

  const { data: policies = [], isLoading } = useQuery<PtoPolicy[]>({ queryKey: ["/api/pto-policies"] });
  const { data: offices = [] } = useQuery<any[]>({ queryKey: ["/api/offices"] });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<PtoPolicy>) => {
      if (data.id) return apiRequest("PUT", `/api/pto-policies/${data.id}`, data);
      return apiRequest("POST", "/api/pto-policies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pto-policies"] });
      setOpen(false);
      setEditing(null);
      toast({ title: "Policy saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/pto-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pto-policies"] });
      toast({ title: "Policy deleted" });
    },
  });

  const openEdit = (p?: PtoPolicy) => {
    setEditing(p ? { ...p } : emptyPolicy());
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">PTO Accrual Policies</h3>
          <p className="text-sm text-muted-foreground">Define hours-per-period accrual rules per PTO type, optionally scoped to office and/or role.</p>
        </div>
        <Button onClick={() => openEdit()} data-testid="button-new-policy">
          <Plus className="h-4 w-4 mr-2" />New Policy
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : policies.length === 0 ? (
        <p className="text-muted-foreground">No policies yet. Add one to start accruing.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Office</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Hours/Period</TableHead>
              <TableHead className="text-right">Cap</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map(p => (
              <TableRow key={p.id} data-testid={`row-policy-${p.id}`}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><Badge variant="outline">{p.ptoType}</Badge></TableCell>
                <TableCell>{offices.find((o: any) => o.id === p.officeId)?.name ?? <span className="text-muted-foreground">Any</span>}</TableCell>
                <TableCell>{p.role ?? <span className="text-muted-foreground">Any</span>}</TableCell>
                <TableCell className="text-right">{parseFloat(p.hoursPerPeriod).toFixed(2)}</TableCell>
                <TableCell className="text-right">{p.capHours ? parseFloat(p.capHours).toFixed(2) : "—"}</TableCell>
                <TableCell>{p.accrualFrequency}</TableCell>
                <TableCell>{p.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} data-testid={`button-edit-${p.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(p.id)} data-testid={`button-delete-${p.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Policy" : "New Policy"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} data-testid="input-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>PTO Type</Label>
                  <Select value={editing.ptoType} onValueChange={v => setEditing({ ...editing, ptoType: v as any })}>
                    <SelectTrigger data-testid="select-pto-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PTO_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Accrual Frequency</Label>
                  <Select value={editing.accrualFrequency ?? "biweekly"} onValueChange={v => setEditing({ ...editing, accrualFrequency: v })}>
                    <SelectTrigger data-testid="select-frequency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Office (optional)</Label>
                  <Select value={editing.officeId ?? "__any__"} onValueChange={v => setEditing({ ...editing, officeId: v === "__any__" ? null : v })}>
                    <SelectTrigger data-testid="select-office"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any office</SelectItem>
                      {offices.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Role (optional)</Label>
                  <Input value={editing.role ?? ""} placeholder="e.g. caregiver" onChange={e => setEditing({ ...editing, role: e.target.value || null })} data-testid="input-role" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hours per Period</Label>
                  <Input type="number" step="0.01" value={editing.hoursPerPeriod ?? ""} onChange={e => setEditing({ ...editing, hoursPerPeriod: e.target.value })} data-testid="input-hours-per-period" />
                </div>
                <div>
                  <Label>Cap (hours, optional)</Label>
                  <Input type="number" step="0.01" value={editing.capHours ?? ""} onChange={e => setEditing({ ...editing, capHours: e.target.value || null })} data-testid="input-cap" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editing.isActive} onCheckedChange={v => setEditing({ ...editing, isActive: v })} data-testid="switch-active" />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => editing && saveMutation.mutate(editing)} disabled={saveMutation.isPending} data-testid="button-save-policy">
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
