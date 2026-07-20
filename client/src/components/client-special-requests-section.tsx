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
import { Star, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface ClientSpecialRequest {
  id: string;
  category: string;
  description: string;
  requestedDate: string;
  requestedBy?: string | null;
  priority?: string | null;
  status: string;
  resolutionNotes?: string | null;
}

const CATEGORIES = [
  { value: "dietary", label: "Dietary" },
  { value: "scheduling", label: "Scheduling" },
  { value: "communication", label: "Communication" },
  { value: "care_preference", label: "Care Preference" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  declined: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const emptyForm = {
  category: "other", description: "", requestedDate: format(new Date(), "yyyy-MM-dd"),
  requestedBy: "", priority: "medium", status: "open", resolutionNotes: "",
};

export function ClientSpecialRequestsSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientSpecialRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/clients", clientId, "special-requests"] as const;
  const { data: requests = [], isLoading } = useQuery<ClientSpecialRequest[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}/special-requests`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load special requests");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        category: form.category,
        description: form.description,
        requestedDate: new Date(form.requestedDate).toISOString(),
        requestedBy: form.requestedBy || undefined,
        priority: form.priority,
        status: form.status,
        resolutionNotes: form.resolutionNotes || undefined,
      };
      if (editing) return apiRequest("PUT", `/api/client-special-requests/${editing.id}`, payload);
      return apiRequest("POST", `/api/clients/${clientId}/special-requests`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Request updated" : "Request added" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/client-special-requests/${id}`),
    onSuccess: () => { toast({ title: "Request deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (req: ClientSpecialRequest) => {
    setEditing(req);
    setForm({
      category: req.category,
      description: req.description,
      requestedDate: req.requestedDate.slice(0, 10),
      requestedBy: req.requestedBy || "",
      priority: req.priority || "medium",
      status: req.status,
      resolutionNotes: req.resolutionNotes || "",
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5" />Special Requests</CardTitle>
            <CardDescription>Ad hoc requests from the client or family — dietary, scheduling, equipment, etc.</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} data-testid="button-add-special-request">
            <Plus className="w-4 h-4 mr-2" />Add Request
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No special requests on file</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="border rounded-md p-3 space-y-2" data-testid={`card-special-request-${req.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{CATEGORIES.find((c) => c.value === req.category)?.label || req.category}</Badge>
                  <Badge className={`border-0 ${PRIORITY_STYLES[req.priority || "medium"]}`}>{req.priority}</Badge>
                  <Badge className={`border-0 ${STATUS_STYLES[req.status]}`}>{req.status.replace(/_/g, " ")}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{format(new Date(req.requestedDate), "MMM d, yyyy")}</span>
                </div>
                <p className="text-sm">{req.description}</p>
                {req.requestedBy && <p className="text-xs text-muted-foreground">Requested by: {req.requestedBy}</p>}
                {req.resolutionNotes && <p className="text-xs text-muted-foreground">Resolution: {req.resolutionNotes}</p>}
                <div className="flex justify-end gap-1 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(req)} data-testid={`button-edit-special-request-${req.id}`}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(req.id)} data-testid={`button-delete-special-request-${req.id}`}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Special Request" : "Add Special Request"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-request-category"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger data-testid="select-request-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} data-testid="textarea-request-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Requested Date</Label>
                <Input type="date" value={form.requestedDate} onChange={(e) => setForm((f) => ({ ...f, requestedDate: e.target.value }))} data-testid="input-request-date" />
              </div>
              <div className="space-y-2">
                <Label>Requested By</Label>
                <Input value={form.requestedBy} onChange={(e) => setForm((f) => ({ ...f, requestedBy: e.target.value }))} placeholder="Client, family member..." data-testid="input-request-by" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-request-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea rows={2} value={form.resolutionNotes} onChange={(e) => setForm((f) => ({ ...f, resolutionNotes: e.target.value }))} data-testid="textarea-request-resolution" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.description.trim()} data-testid="button-save-special-request">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Special Request?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-special-request">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
