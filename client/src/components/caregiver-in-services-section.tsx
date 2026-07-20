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
import { GraduationCap, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface CaregiverInService {
  id: string;
  title: string;
  description?: string | null;
  trainingDate: string;
  hours?: string | null;
  instructor?: string | null;
  location?: string | null;
  status: string;
  certificateNumber?: string | null;
  expirationDate?: string | null;
}

const emptyForm = {
  title: "", description: "", trainingDate: format(new Date(), "yyyy-MM-dd"), hours: "",
  instructor: "", location: "", status: "completed", certificateNumber: "", expirationDate: "",
};

export function CaregiverInServicesSection({ caregiverId }: { caregiverId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaregiverInService | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/caregivers", caregiverId, "in-services"] as const;
  const { data: inServices = [], isLoading } = useQuery<CaregiverInService[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/caregivers/${caregiverId}/in-services`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load in-service records");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        trainingDate: new Date(form.trainingDate).toISOString(),
        hours: form.hours || undefined,
        instructor: form.instructor || undefined,
        location: form.location || undefined,
        status: form.status,
        certificateNumber: form.certificateNumber || undefined,
        expirationDate: form.expirationDate ? new Date(form.expirationDate).toISOString() : undefined,
      };
      if (editing) return apiRequest("PUT", `/api/caregiver-in-services/${editing.id}`, payload);
      return apiRequest("POST", `/api/caregivers/${caregiverId}/in-services`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Training updated" : "Training added" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/caregiver-in-services/${id}`),
    onSuccess: () => { toast({ title: "Training deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (item: CaregiverInService) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description || "",
      trainingDate: item.trainingDate.slice(0, 10),
      hours: item.hours ? String(item.hours) : "",
      instructor: item.instructor || "",
      location: item.location || "",
      status: item.status,
      certificateNumber: item.certificateNumber || "",
      expirationDate: item.expirationDate ? item.expirationDate.slice(0, 10) : "",
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" />In-Service Training Records</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="button-add-in-service">
            <Plus className="w-4 h-4 mr-2" />Add Training
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : inServices.length === 0 ? (
          <p className="text-muted-foreground text-sm">No in-service training records found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Training</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inServices.map((service) => (
                <TableRow key={service.id} data-testid={`row-in-service-${service.id}`}>
                  <TableCell className="font-medium">{service.title}</TableCell>
                  <TableCell>{format(new Date(service.trainingDate), "MMM d, yyyy")}</TableCell>
                  <TableCell>{service.hours || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={service.status === "completed" ? "default" : "secondary"}>{service.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(service)} data-testid={`button-edit-in-service-${service.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(service.id)} data-testid={`button-delete-in-service-${service.id}`}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit In-Service Training" : "Add In-Service Training"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} data-testid="input-in-service-title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} data-testid="textarea-in-service-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Training Date *</Label>
                <Input type="date" value={form.trainingDate} onChange={(e) => setForm((f) => ({ ...f, trainingDate: e.target.value }))} data-testid="input-in-service-date" />
              </div>
              <div className="space-y-2">
                <Label>Hours</Label>
                <Input type="number" step="0.25" min="0" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} data-testid="input-in-service-hours" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instructor</Label>
                <Input value={form.instructor} onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))} data-testid="input-in-service-instructor" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} data-testid="input-in-service-location" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-in-service-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Certificate #</Label>
                <Input value={form.certificateNumber} onChange={(e) => setForm((f) => ({ ...f, certificateNumber: e.target.value }))} data-testid="input-in-service-certificate" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiration Date</Label>
              <Input type="date" value={form.expirationDate} onChange={(e) => setForm((f) => ({ ...f, expirationDate: e.target.value }))} data-testid="input-in-service-expiration" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title.trim() || !form.trainingDate} data-testid="button-save-in-service">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Training"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Training Record?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-in-service">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
