import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, CalendarRange } from "lucide-react";
import type { EnrollmentWindow } from "@shared/schema";

const WINDOW_TYPES = ["open_enrollment", "new_hire", "qualifying_life_event"] as const;

export default function BenefitsWindowsPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<EnrollmentWindow | null>(null);
  const [form, setForm] = useState<any>({
    name: "", windowType: "open_enrollment", employeeUserId: "",
    reasonCode: "", startsAt: "", endsAt: "", coverageEffectiveDate: "", notes: "",
  });

  const { data: windows = [] } = useQuery<EnrollmentWindow[]>({ queryKey: ["/api/enrollment-windows"] });
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: () => fetch("/api/users").then(r => r.ok ? r.json() : []),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/enrollment-windows", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/enrollment-windows"] }); setIsOpen(false); toast({ title: "Window created" }); },
    onError: (e: any) => toast({ title: e?.message || "Failed", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/enrollment-windows/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/enrollment-windows"] }); setIsOpen(false); setEditing(null); toast({ title: "Window updated" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/enrollment-windows/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/enrollment-windows"] }); toast({ title: "Deleted" }); },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", windowType: "open_enrollment", employeeUserId: "", reasonCode: "", startsAt: "", endsAt: "", coverageEffectiveDate: "", notes: "" });
    setIsOpen(true);
  };
  const openEdit = (w: EnrollmentWindow) => {
    setEditing(w);
    setForm({
      name: w.name, windowType: w.windowType, employeeUserId: w.employeeUserId || "",
      reasonCode: w.reasonCode || "", startsAt: w.startsAt as any, endsAt: w.endsAt as any,
      coverageEffectiveDate: (w.coverageEffectiveDate as any) || "", notes: w.notes || "",
    });
    setIsOpen(true);
  };
  const submit = () => {
    if (!form.name || !form.startsAt || !form.endsAt) {
      toast({ title: "Name, start, and end are required", variant: "destructive" });
      return;
    }
    if (form.windowType === "qualifying_life_event" && !form.employeeUserId) {
      toast({ title: "Pick an employee for QLE windows", variant: "destructive" });
      return;
    }
    const payload: any = { ...form };
    if (!payload.employeeUserId) payload.employeeUserId = null;
    if (!payload.reasonCode) payload.reasonCode = null;
    if (!payload.coverageEffectiveDate) payload.coverageEffectiveDate = null;
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const empName = (id: string | null) => {
    if (!id) return "All employees";
    const u = employees.find((e: any) => e.id === id);
    return u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email : id;
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="container mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarRange className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold">Enrollment Windows</h1>
                <p className="text-muted-foreground">Schedule open enrollment, new-hire, and qualifying-life-event windows.</p>
              </div>
            </div>
            <Button onClick={openCreate} data-testid="button-add-window"><Plus className="h-4 w-4 mr-2" />Add Window</Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Coverage Effective</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {windows.map(w => {
                    const active = (w.startsAt as any) <= today && (w.endsAt as any) >= today;
                    return (
                      <TableRow key={w.id} data-testid={`row-window-${w.id}`}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell><Badge variant="outline">{w.windowType.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell>{empName(w.employeeUserId)}</TableCell>
                        <TableCell>{w.reasonCode || "—"}</TableCell>
                        <TableCell>{String(w.startsAt)} → {String(w.endsAt)}</TableCell>
                        <TableCell>{w.coverageEffectiveDate ? String(w.coverageEffectiveDate) : "—"}</TableCell>
                        <TableCell><Badge variant={active ? "default" : "secondary"}>{active ? "Open" : "Closed"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete window?")) deleteMutation.mutate(w.id); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {windows.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No enrollment windows yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Enrollment Window</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="2026 Open Enrollment" data-testid="input-window-name" /></div>
                <div><Label>Window Type *</Label>
                  <Select value={form.windowType} onValueChange={v => setForm((f: any) => ({ ...f, windowType: v }))}>
                    <SelectTrigger data-testid="select-window-type"><SelectValue /></SelectTrigger>
                    <SelectContent>{WINDOW_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Employee {form.windowType === "qualifying_life_event" && <span className="text-red-500">*</span>}</Label>
                  <Select value={form.employeeUserId || "__all__"} onValueChange={v => setForm((f: any) => ({ ...f, employeeUserId: v === "__all__" ? "" : v }))}>
                    <SelectTrigger data-testid="select-window-employee"><SelectValue placeholder="All employees" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All employees (org-wide)</SelectItem>
                      {employees.map((u: any) => <SelectItem key={u.id} value={u.id}>{`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.windowType === "qualifying_life_event" && (
                  <div className="col-span-2"><Label>Reason Code</Label>
                    <Select value={form.reasonCode || "__none__"} onValueChange={v => setForm((f: any) => ({ ...f, reasonCode: v === "__none__" ? "" : v }))}>
                      <SelectTrigger data-testid="select-reason-code"><SelectValue placeholder="Select a reason" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Not specified —</SelectItem>
                        <SelectItem value="marriage">Marriage</SelectItem>
                        <SelectItem value="divorce">Divorce</SelectItem>
                        <SelectItem value="birth">Birth or adoption of a child</SelectItem>
                        <SelectItem value="death">Death of dependent</SelectItem>
                        <SelectItem value="loss_of_coverage">Loss of other coverage</SelectItem>
                        <SelectItem value="gain_of_coverage">Gain of other coverage</SelectItem>
                        <SelectItem value="address_change">Address change</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Starts At *</Label><Input type="date" value={form.startsAt} onChange={e => setForm((f: any) => ({ ...f, startsAt: e.target.value }))} data-testid="input-starts-at" /></div>
                <div><Label>Ends At *</Label><Input type="date" value={form.endsAt} onChange={e => setForm((f: any) => ({ ...f, endsAt: e.target.value }))} data-testid="input-ends-at" /></div>
                <div className="col-span-2"><Label>Coverage Effective Date</Label><Input type="date" value={form.coverageEffectiveDate} onChange={e => setForm((f: any) => ({ ...f, coverageEffectiveDate: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={submit} data-testid="button-save-window">Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
