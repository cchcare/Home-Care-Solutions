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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable?: boolean | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
}

const emptyForm = { dayOfWeek: "1", startTime: "", endTime: "", isAvailable: true, notes: "" };

export function CaregiverAvailabilitySection({ caregiverId }: { caregiverId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AvailabilitySlot | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/caregivers", caregiverId, "availability"] as const;
  const { data: availability = [], isLoading } = useQuery<AvailabilitySlot[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/caregivers/${caregiverId}/availability`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load availability");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        dayOfWeek: parseInt(form.dayOfWeek, 10),
        startTime: form.startTime,
        endTime: form.endTime,
        isAvailable: form.isAvailable,
        notes: form.notes || undefined,
      };
      if (editing) return apiRequest("PUT", `/api/caregiver-availability/${editing.id}`, payload);
      return apiRequest("POST", `/api/caregivers/${caregiverId}/availability`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Slot updated" : "Slot added" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/caregiver-availability/${id}`),
    onSuccess: () => { toast({ title: "Slot deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = (dayOfWeek?: number) => {
    setEditing(null);
    setForm({ ...emptyForm, dayOfWeek: dayOfWeek != null ? String(dayOfWeek) : "1" });
    setOpen(true);
  };
  const openEdit = (slot: AvailabilitySlot) => {
    setEditing(slot);
    setForm({
      dayOfWeek: String(slot.dayOfWeek),
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.isAvailable ?? true,
      notes: slot.notes || "",
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" />Weekly Availability</CardTitle>
          <Button size="sm" onClick={() => openCreate()} data-testid="button-add-availability">
            <Plus className="w-4 h-4 mr-2" />Add Slot
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
            {DAY_NAMES.map((day, idx) => {
              const daySlots = availability.filter((a) => a.dayOfWeek === idx);
              return (
                <div key={day} className="border rounded-lg p-2">
                  <button
                    type="button"
                    onClick={() => openCreate(idx)}
                    className="w-full font-medium text-sm text-center border-b pb-1 mb-2 hover:text-primary"
                    data-testid={`button-add-availability-${day}`}
                  >
                    {day}
                  </button>
                  {daySlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center">Not set</p>
                  ) : (
                    <div className="space-y-1">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`text-xs p-1 rounded flex items-center justify-between gap-1 ${slot.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                          data-testid={`row-availability-${slot.id}`}
                        >
                          <span className="cursor-pointer" onClick={() => openEdit(slot)}>{slot.startTime} - {slot.endTime}</span>
                          <button type="button" onClick={() => setDeleteId(slot.id)} data-testid={`button-delete-availability-${slot.id}`}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Availability Slot" : "Add Availability Slot"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={form.dayOfWeek} onValueChange={(v) => setForm((f) => ({ ...f, dayOfWeek: v }))}>
                <SelectTrigger data-testid="select-availability-day"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_FULL_NAMES.map((d, idx) => <SelectItem key={d} value={String(idx)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} data-testid="input-availability-start" />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} data-testid="input-availability-end" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isAvailable} onCheckedChange={(c) => setForm((f) => ({ ...f, isAvailable: c === true }))} data-testid="checkbox-availability-available" />
              <Label>Available (uncheck for unavailable/blocked time)</Label>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} data-testid="textarea-availability-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.startTime || !form.endTime} data-testid="button-save-availability">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Slot?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-availability">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
