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
import { ArrowRightLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { Office } from "@shared/schema";

interface CaregiverOfficeMove {
  id: string;
  fromOfficeId?: string | null;
  toOfficeId: string;
  moveDate: string;
  reason?: string | null;
  status: string;
  notes?: string | null;
}

interface Props {
  caregiverId: string;
  currentOfficeName?: string | null;
  currentOfficeId?: string | null;
  offices: Office[];
}

const emptyForm = { toOfficeId: "", moveDate: format(new Date(), "yyyy-MM-dd"), reason: "", status: "completed", notes: "" };

export function CaregiverOfficeMovesSection({ caregiverId, currentOfficeName, currentOfficeId, offices }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaregiverOfficeMove | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/caregivers", caregiverId, "office-moves"] as const;
  const { data: officeMoves = [], isLoading } = useQuery<CaregiverOfficeMove[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/caregivers/${caregiverId}/office-moves`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load office moves");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        fromOfficeId: currentOfficeId || undefined,
        toOfficeId: form.toOfficeId,
        moveDate: new Date(form.moveDate).toISOString(),
        reason: form.reason || undefined,
        status: form.status,
        notes: form.notes || undefined,
      };
      if (editing) return apiRequest("PUT", `/api/caregiver-office-moves/${editing.id}`, payload);
      return apiRequest("POST", `/api/caregivers/${caregiverId}/office-moves`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Transfer updated" : "Transfer recorded" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/caregiver-office-moves/${id}`),
    onSuccess: () => { toast({ title: "Transfer record deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (move: CaregiverOfficeMove) => {
    setEditing(move);
    setForm({
      toOfficeId: move.toOfficeId,
      moveDate: move.moveDate.slice(0, 10),
      reason: move.reason || "",
      status: move.status,
      notes: move.notes || "",
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" />Office Transfer History</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="button-add-office-move">
            <Plus className="w-4 h-4 mr-2" />Record Transfer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Current Office</p>
          <p className="text-lg font-medium" data-testid="text-current-office">{currentOfficeName || "Not assigned"}</p>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : officeMoves.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transfer history</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {officeMoves.map((move) => (
                <TableRow key={move.id} data-testid={`row-office-move-${move.id}`}>
                  <TableCell>{format(new Date(move.moveDate), "MMM d, yyyy")}</TableCell>
                  <TableCell>{offices.find((o) => o.id === move.fromOfficeId)?.name || "N/A"}</TableCell>
                  <TableCell>{offices.find((o) => o.id === move.toOfficeId)?.name || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={move.status === "completed" ? "default" : "secondary"}>{move.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{move.reason || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(move)} data-testid={`button-edit-office-move-${move.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(move.id)} data-testid={`button-delete-office-move-${move.id}`}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Office Transfer" : "Record Office Transfer"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>To Office *</Label>
              <Select value={form.toOfficeId} onValueChange={(v) => setForm((f) => ({ ...f, toOfficeId: v }))}>
                <SelectTrigger data-testid="select-office-move-to"><SelectValue placeholder="Select office" /></SelectTrigger>
                <SelectContent>
                  {offices.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Move Date *</Label>
                <Input type="date" value={form.moveDate} onChange={(e) => setForm((f) => ({ ...f, moveDate: e.target.value }))} data-testid="input-office-move-date" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-office-move-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} data-testid="textarea-office-move-reason" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} data-testid="textarea-office-move-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.toOfficeId || !form.moveDate} data-testid="button-save-office-move">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Record Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Transfer Record?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-office-move">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
