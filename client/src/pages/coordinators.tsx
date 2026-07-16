import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit, Trash2, Users, X } from "lucide-react";
import type { Coordinator, Caregiver, Office } from "@shared/schema";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  coordinatorRate: string;
  officeId: string;
}

const emptyForm: FormState = { firstName: "", lastName: "", email: "", phone: "", title: "", coordinatorRate: "", officeId: "" };

export default function Coordinators() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coordinator | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [assignFor, setAssignFor] = useState<Coordinator | null>(null);

  const isManager = ["super_admin", "admin", "office_admin", "supervisor", "manager"].includes((user as any)?.role || "");
  const isSuperAdmin = (user as any)?.role === "super_admin";

  const { data: coordinators = [], isLoading } = useQuery<Coordinator[]>({ queryKey: ["/api/coordinators"] });
  const { data: offices = [] } = useQuery<Office[]>({ queryKey: ["/api/offices"], enabled: isSuperAdmin });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/coordinators"] });

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const payload: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        title: data.title || null,
        coordinatorRate: data.coordinatorRate === "" ? null : data.coordinatorRate,
      };
      if (isSuperAdmin && data.officeId) payload.officeId = data.officeId;
      if (editing) {
        await apiRequest("PUT", `/api/coordinators/${editing.id}`, payload);
      } else {
        await apiRequest("POST", "/api/coordinators", payload);
      }
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast({ title: editing ? "Coordinator updated" : "Coordinator added" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/coordinators/${id}`); },
    onSuccess: () => { invalidate(); toast({ title: "Coordinator deleted" }); },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: Coordinator) => {
    setEditing(c);
    setForm({
      firstName: c.firstName || "", lastName: c.lastName || "", email: c.email || "",
      phone: c.phone || "", title: c.title || "",
      coordinatorRate: c.coordinatorRate != null ? String(c.coordinatorRate) : "",
      officeId: c.officeId || "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Coordinators</h1>
              <p className="text-sm text-muted-foreground">Manage coordinators, their compensation rate, and assigned caregivers.</p>
            </div>
            {isManager && (
              <Button onClick={openCreate} data-testid="button-add-coordinator">
                <Plus className="mr-2 h-4 w-4" /> Add Coordinator
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Coordinator Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : coordinators.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No coordinators yet. Add one to get started.</TableCell></TableRow>
                  ) : coordinators.map((c) => (
                    <TableRow key={c.id} data-testid={`row-coordinator-${c.id}`}>
                      <TableCell className="font-medium">{c.firstName} {c.lastName}</TableCell>
                      <TableCell>{c.title || "—"}</TableCell>
                      <TableCell>{c.email || "—"}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.coordinatorRate != null ? `$${Number(c.coordinatorRate).toFixed(2)}/hr` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setAssignFor(c)} title="Assigned caregivers" data-testid={`button-assign-${c.id}`}>
                          <Users className="h-4 w-4" />
                        </Button>
                        {isManager && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)} data-testid={`button-edit-${c.id}`}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete coordinator ${c.firstName} ${c.lastName}?`)) deleteMutation.mutate(c.id); }} data-testid={`button-delete-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Coordinator" : "Add Coordinator"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First name</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} data-testid="input-firstName" /></div>
            <div><Label>Last name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} data-testid="input-lastName" /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-email" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-phone" /></div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-title" /></div>
            <div>
              <Label>Coordinator rate ($/hr)</Label>
              <Input type="number" step="0.01" min="0" value={form.coordinatorRate} onChange={(e) => setForm({ ...form, coordinatorRate: e.target.value })} data-testid="input-rate" placeholder="e.g. 16.00" />
            </div>
            {isSuperAdmin && (
              <div className="col-span-2">
                <Label>Office</Label>
                <Select value={form.officeId} onValueChange={(v) => setForm({ ...form, officeId: v })}>
                  <SelectTrigger data-testid="select-office"><SelectValue placeholder="Select office" /></SelectTrigger>
                  <SelectContent>{offices.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.firstName || !form.lastName} data-testid="button-save">
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {assignFor && <AssignCaregiversDialog coordinator={assignFor} onClose={() => setAssignFor(null)} canEdit={isManager} />}
    </div>
  );
}

function AssignCaregiversDialog({ coordinator, onClose, canEdit }: { coordinator: Coordinator; onClose: () => void; canEdit: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("");

  const { data: assigned = [] } = useQuery<Caregiver[]>({ queryKey: ["/api/coordinators", coordinator.id, "caregivers"] });
  const { data: allCaregivers = [] } = useQuery<Caregiver[]>({ queryKey: ["/api/caregivers"] });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/coordinators", coordinator.id, "caregivers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
  };

  const setCoordinator = useMutation({
    mutationFn: async ({ caregiverId, coordinatorId }: { caregiverId: string; coordinatorId: string | null }) => {
      await apiRequest("PUT", `/api/caregivers/${caregiverId}`, { coordinatorId });
    },
    onSuccess: () => { refresh(); },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const assignedIds = new Set(assigned.map((c) => c.id));
  const unassigned = allCaregivers.filter((c) => !assignedIds.has(c.id) && (c as any).coordinatorId !== coordinator.id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Caregivers for {coordinator.firstName} {coordinator.lastName}</DialogTitle></DialogHeader>
        {canEdit && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Assign a caregiver</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger data-testid="select-caregiver-assign"><SelectValue placeholder="Select caregiver" /></SelectTrigger>
                <SelectContent>
                  {unassigned.length === 0 ? <div className="px-2 py-1.5 text-sm text-muted-foreground">No unassigned caregivers</div> :
                    unassigned.map((c) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!selected || setCoordinator.isPending} onClick={() => { setCoordinator.mutate({ caregiverId: selected, coordinatorId: coordinator.id }); setSelected(""); }} data-testid="button-do-assign">Assign</Button>
          </div>
        )}
        <div className="mt-2 max-h-72 overflow-y-auto divide-y">
          {assigned.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No caregivers assigned.</p> :
            assigned.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2" data-testid={`assigned-${c.id}`}>
                <span>{c.firstName} {c.lastName}{c.hourlyWage != null ? <span className="text-muted-foreground text-sm"> · ${Number(c.hourlyWage).toFixed(2)}/hr</span> : null}</span>
                {canEdit && (
                  <Button variant="ghost" size="icon" title="Unassign" onClick={() => setCoordinator.mutate({ caregiverId: c.id, coordinatorId: null })} data-testid={`button-unassign-${c.id}`}><X className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
