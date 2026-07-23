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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface CaregiverAbsence {
  id: string;
  absenceType: string;
  startDate: string;
  endDate?: string | null;
  isAllDay?: boolean | null;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  status: string;
}

const emptyForm = { absenceType: "vacation", startDate: "", endDate: "", isAllDay: true, startTime: "", endTime: "", reason: "", status: "pending" };

export function CaregiverAbsencesSection({ caregiverId }: { caregiverId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaregiverAbsence | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/caregivers", caregiverId, "absences"] as const;
  const { data: absences = [], isLoading } = useQuery<CaregiverAbsence[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/caregivers/${caregiverId}/absences`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load absences");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        absenceType: form.absenceType,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        isAllDay: form.isAllDay,
        startTime: form.isAllDay ? null : (form.startTime || null),
        endTime: form.isAllDay ? null : (form.endTime || null),
        reason: form.reason || null,
        status: form.status,
      };
      if (editing) return apiRequest("PUT", `/api/caregiver-absences/${editing.id}`, payload);
      return apiRequest("POST", `/api/caregivers/${caregiverId}/absences`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Absence updated" : "Absence added" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/caregiver-absences/${id}`),
    onSuccess: () => { toast({ title: "Absence deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (absence: CaregiverAbsence) => {
    setEditing(absence);
    setForm({
      absenceType: absence.absenceType,
      startDate: absence.startDate ? absence.startDate.slice(0, 10) : "",
      endDate: absence.endDate ? absence.endDate.slice(0, 10) : "",
      isAllDay: absence.isAllDay ?? true,
      startTime: absence.startTime || "",
      endTime: absence.endTime || "",
      reason: absence.reason || "",
      status: absence.status,
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Absences & Restrictions</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="button-add-absence">
            <Plus className="w-4 h-4 mr-2" />Add Absence
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : absences.length === 0 ? (
          <p className="text-muted-foreground text-sm">No absences or restrictions recorded</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {absences.map((absence) => (
                <TableRow key={absence.id} data-testid={`row-absence-${absence.id}`}>
                  <TableCell className="font-medium capitalize">{absence.absenceType?.replace(/_/g, " ")}</TableCell>
                  <TableCell>{format(new Date(absence.startDate), "MMM d, yyyy")}</TableCell>
                  <TableCell>{absence.endDate ? format(new Date(absence.endDate), "MMM d, yyyy") : "Ongoing"}</TableCell>
                  <TableCell>
                    <Badge variant={absence.status === "approved" ? "default" : absence.status === "pending" ? "secondary" : "destructive"}>
                      {absence.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{absence.reason || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(absence)} data-testid={`button-edit-absence-${absence.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(absence.id)} data-testid={`button-delete-absence-${absence.id}`}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Absence" : "Add Absence"}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Absence Type</Label>
              <Select value={form.absenceType} onValueChange={(v) => setForm((f) => ({ ...f, absenceType: v }))}>
                <SelectTrigger data-testid="select-absence-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="fmla">FMLA</SelectItem>
                  <SelectItem value="restriction">Restriction</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} data-testid="input-absence-start-date" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} data-testid="input-absence-end-date" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isAllDay} onCheckedChange={(c) => setForm((f) => ({ ...f, isAllDay: c === true }))} data-testid="checkbox-absence-all-day" />
              <Label>All Day</Label>
            </div>
            {!form.isAllDay && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time (HH:MM)</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} data-testid="input-absence-start-time" />
                </div>
                <div className="space-y-2">
                  <Label>End Time (HH:MM)</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} data-testid="input-absence-end-time" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Enter reason for absence..." data-testid="textarea-absence-reason" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-absence-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.startDate} data-testid="button-save-absence">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Absence?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-absence">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
