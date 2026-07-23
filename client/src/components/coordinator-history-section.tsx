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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { parseDateOnlyInput, toDateOnlyInputValue, formatDateOnly } from "@/lib/dateOnly";
import type { Coordinator, ClientCoordinator, CaregiverCoordinator } from "@shared/schema";

type HistoryRow = ClientCoordinator | CaregiverCoordinator;

const emptyForm = {
  coordinatorId: "",
  startDate: format(new Date(), "yyyy-MM-dd"),
  endDate: "",
  isPrimary: false,
  status: "active",
  notes: "",
};

interface CoordinatorHistorySectionProps {
  entityType: "client" | "caregiver";
  entityId: string;
}

export function CoordinatorHistorySection({ entityType, entityId }: CoordinatorHistorySectionProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HistoryRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const entityPlural = entityType === "client" ? "clients" : "caregivers";
  const flatResource = entityType === "client" ? "client-coordinators" : "caregiver-coordinators";

  const queryKey = ["/api", entityPlural, entityId, "coordinators"] as const;
  const { data: rows = [], isLoading } = useQuery<HistoryRow[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/${entityPlural}/${entityId}/coordinators`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load coordinator history");
      return r.json();
    },
  });

  const { data: coordinators = [] } = useQuery<Coordinator[]>({ queryKey: ["/api/coordinators"] });
  const coordinatorName = (id: string) => {
    const c = coordinators.find((c) => c.id === id);
    return c ? `${c.firstName} ${c.lastName}` : "Unknown";
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKey as any });
    queryClient.invalidateQueries({ queryKey: ["/api", entityPlural, entityId] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        coordinatorId: form.coordinatorId,
        startDate: parseDateOnlyInput(form.startDate)?.toISOString(),
        endDate: form.endDate ? parseDateOnlyInput(form.endDate)?.toISOString() : null,
        isPrimary: form.isPrimary,
        status: form.status,
        notes: form.notes || undefined,
      };
      if (editing) return apiRequest("PUT", `/api/${flatResource}/${editing.id}`, payload);
      return apiRequest("POST", `/api/${entityPlural}/${entityId}/coordinators`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Coordinator assignment updated" : "Coordinator assigned" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/${flatResource}/${id}`),
    onSuccess: () => { toast({ title: "Coordinator assignment deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (row: HistoryRow) => {
    setEditing(row);
    setForm({
      coordinatorId: row.coordinatorId,
      startDate: toDateOnlyInputValue(row.startDate),
      endDate: row.endDate ? toDateOnlyInputValue(row.endDate) : "",
      isPrimary: !!row.isPrimary,
      status: row.status || "active",
      notes: row.notes || "",
    });
    setOpen(true);
  };

  const label = entityType === "client" ? "caregiver(s) serving this client" : "client(s) this caregiver serves";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Coordinator Assignments</CardTitle>
            <CardDescription>
              Coordinator history — supports more than one coordinator over time. Changing the active
              coordinator here automatically syncs to any linked {label}.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} data-testid="button-add-coordinator-assignment">
            <Plus className="w-4 h-4 mr-2" />Assign Coordinator
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No coordinator assignments on file</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coordinator</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} data-testid={`row-coordinator-assignment-${row.id}`}>
                  <TableCell className="font-medium">{coordinatorName(row.coordinatorId)}</TableCell>
                  <TableCell className="text-sm">{formatDateOnly(row.startDate, (d) => format(d, "MMM d, yyyy"))}</TableCell>
                  <TableCell className="text-sm">{row.endDate ? formatDateOnly(row.endDate, (d) => format(d, "MMM d, yyyy")) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={!row.endDate && row.status === "active" ? "default" : "secondary"}>
                      {row.endDate ? "ended" : (row.status || "active")}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.isPrimary ? <Badge variant="outline">Primary</Badge> : "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)} data-testid={`button-edit-coordinator-assignment-${row.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(row.id)} data-testid={`button-delete-coordinator-assignment-${row.id}`}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Coordinator Assignment" : "Assign Coordinator"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Coordinator *</Label>
              <Select value={form.coordinatorId} onValueChange={(v) => setForm((f) => ({ ...f, coordinatorId: v }))}>
                <SelectTrigger data-testid="select-coordinator-assignment-coordinator"><SelectValue placeholder="Select coordinator" /></SelectTrigger>
                <SelectContent>
                  {coordinators.map((c) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} data-testid="input-coordinator-assignment-start-date" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} data-testid="input-coordinator-assignment-end-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-coordinator-assignment-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isPrimary} onCheckedChange={(v) => setForm((f) => ({ ...f, isPrimary: !!v }))} data-testid="checkbox-coordinator-assignment-primary" />
              <Label className="cursor-pointer" onClick={() => setForm((f) => ({ ...f, isPrimary: !f.isPrimary }))}>Primary coordinator</Label>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} data-testid="textarea-coordinator-assignment-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.coordinatorId || !form.startDate} data-testid="button-save-coordinator-assignment">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Assign Coordinator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Coordinator Assignment?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-coordinator-assignment">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
