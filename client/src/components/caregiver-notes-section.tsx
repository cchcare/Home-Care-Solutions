import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const NOTE_TYPES = [
  { value: "general", label: "General" },
  { value: "performance", label: "Performance" },
  { value: "disciplinary", label: "Disciplinary" },
  { value: "commendation", label: "Commendation" },
];

interface CaregiverNote {
  id: string;
  noteType: string;
  subject?: string | null;
  content: string;
  isPrivate?: boolean | null;
  createdAt?: string | null;
}

export function CaregiverNotesSection({ caregiverId }: { caregiverId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaregiverNote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ noteType: "general", subject: "", content: "", isPrivate: false });

  const queryKey = ["/api/caregivers", caregiverId, "notes"] as const;
  const { data: notes = [], isLoading } = useQuery<CaregiverNote[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/caregivers/${caregiverId}/notes`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load notes");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { noteType: form.noteType, subject: form.subject || undefined, content: form.content, isPrivate: form.isPrivate };
      if (editing) return apiRequest("PUT", `/api/caregiver-notes/${editing.id}`, payload);
      return apiRequest("POST", `/api/caregivers/${caregiverId}/notes`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Note updated" : "Note added" });
      invalidate();
      setOpen(false); setEditing(null);
      setForm({ noteType: "general", subject: "", content: "", isPrivate: false });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/caregiver-notes/${id}`),
    onSuccess: () => { toast({ title: "Note deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm({ noteType: "general", subject: "", content: "", isPrivate: false }); setOpen(true); };
  const openEdit = (note: CaregiverNote) => {
    setEditing(note);
    setForm({ noteType: note.noteType || "general", subject: note.subject || "", content: note.content, isPrivate: !!note.isPrivate });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />Notes</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="button-add-note">
            <Plus className="w-4 h-4 mr-2" />Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No notes found</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="p-4 border rounded-lg" data-testid={`card-note-${note.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{note.noteType}</Badge>
                    {note.subject && <span className="font-medium">{note.subject}</span>}
                    {note.isPrivate && <Badge variant="secondary" className="text-xs">Private</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground mr-2">
                      {note.createdAt ? format(new Date(note.createdAt), "MMM d, yyyy") : ""}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(note)} data-testid={`button-edit-note-${note.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(note.id)} data-testid={`button-delete-note-${note.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Note" : "Add Note"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.noteType} onValueChange={(v) => setForm((f) => ({ ...f, noteType: v }))}>
                <SelectTrigger data-testid="select-note-type"><SelectValue /></SelectTrigger>
                <SelectContent>{NOTE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} data-testid="input-note-subject" />
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea rows={4} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} data-testid="textarea-note-content" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isPrivate} onCheckedChange={(c) => setForm((f) => ({ ...f, isPrivate: c === true }))} data-testid="checkbox-note-private" />
              <Label>Private (visible to admins only)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.content.trim()} data-testid="button-save-note">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Note?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-note">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
