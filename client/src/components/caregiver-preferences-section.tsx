import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Heart, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const PREFERENCE_TYPES = [
  { value: "work_area", label: "Work Area" },
  { value: "client_type", label: "Client Type" },
  { value: "schedule", label: "Schedule" },
  { value: "language", label: "Language" },
  { value: "other", label: "Other" },
];

interface CaregiverPreference {
  id: string;
  preferenceType: string;
  preferenceValue: string;
  priority?: number | null;
  notes?: string | null;
}

export function CaregiverPreferencesSection({ caregiverId }: { caregiverId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaregiverPreference | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ preferenceType: "work_area", preferenceValue: "", priority: "1", notes: "" });

  const queryKey = ["/api/caregivers", caregiverId, "preferences"] as const;
  const { data: preferences = [], isLoading } = useQuery<CaregiverPreference[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/caregivers/${caregiverId}/preferences`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load preferences");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        preferenceType: form.preferenceType,
        preferenceValue: form.preferenceValue,
        priority: parseInt(form.priority, 10),
        notes: form.notes || undefined,
      };
      if (editing) return apiRequest("PUT", `/api/caregiver-preferences/${editing.id}`, payload);
      return apiRequest("POST", `/api/caregivers/${caregiverId}/preferences`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Preference updated" : "Preference added" });
      invalidate();
      setOpen(false); setEditing(null);
      setForm({ preferenceType: "work_area", preferenceValue: "", priority: "1", notes: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/caregiver-preferences/${id}`),
    onSuccess: () => { toast({ title: "Preference deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm({ preferenceType: "work_area", preferenceValue: "", priority: "1", notes: "" }); setOpen(true); };
  const openEdit = (pref: CaregiverPreference) => {
    setEditing(pref);
    setForm({ preferenceType: pref.preferenceType, preferenceValue: pref.preferenceValue, priority: String(pref.priority ?? 1), notes: pref.notes || "" });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5" />Work Preferences</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="button-add-preference">
            <Plus className="w-4 h-4 mr-2" />Add Preference
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : preferences.length === 0 ? (
          <p className="text-muted-foreground text-sm">No preferences set</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {preferences.map((pref) => (
                <TableRow key={pref.id} data-testid={`row-preference-${pref.id}`}>
                  <TableCell className="font-medium capitalize">{pref.preferenceType?.replace(/_/g, " ")}</TableCell>
                  <TableCell>{pref.preferenceValue}</TableCell>
                  <TableCell>
                    <Badge variant={pref.priority === 1 ? "default" : pref.priority === 2 ? "secondary" : "outline"}>
                      {pref.priority === 1 ? "High" : pref.priority === 2 ? "Medium" : "Low"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{pref.notes || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pref)} data-testid={`button-edit-preference-${pref.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(pref.id)} data-testid={`button-delete-preference-${pref.id}`}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Preference" : "Add Preference"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.preferenceType} onValueChange={(v) => setForm((f) => ({ ...f, preferenceType: v }))}>
                <SelectTrigger data-testid="select-preference-type"><SelectValue /></SelectTrigger>
                <SelectContent>{PREFERENCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value *</Label>
              <Input value={form.preferenceValue} onChange={(e) => setForm((f) => ({ ...f, preferenceValue: e.target.value }))} data-testid="input-preference-value" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger data-testid="select-preference-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">High</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} data-testid="textarea-preference-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.preferenceValue.trim()} data-testid="button-save-preference">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Preference"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Preference?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-preference">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
