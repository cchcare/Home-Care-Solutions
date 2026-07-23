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
import { Receipt, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const EXPENSE_TYPES = [
  { value: "mileage", label: "Mileage" },
  { value: "supplies", label: "Supplies" },
  { value: "training", label: "Training" },
  { value: "uniform", label: "Uniform" },
  { value: "other", label: "Other" },
];

interface CaregiverExpense {
  id: string;
  expenseDate: string;
  expenseType: string;
  amount: string;
  description?: string | null;
  status: string;
  mileage?: string | null;
  mileageRate?: string | null;
}

const emptyForm = { expenseDate: format(new Date(), "yyyy-MM-dd"), expenseType: "mileage", amount: "", description: "", status: "pending", mileage: "", mileageRate: "" };

export function CaregiverExpensesSection({ caregiverId }: { caregiverId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaregiverExpense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/caregivers", caregiverId, "expenses"] as const;
  const { data: expenses = [], isLoading } = useQuery<CaregiverExpense[]>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/caregivers/${caregiverId}/expenses`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load expenses");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const isMileage = form.expenseType === "mileage";

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        expenseDate: new Date(form.expenseDate).toISOString(),
        expenseType: form.expenseType,
        amount: form.amount,
        description: form.description || undefined,
        status: form.status,
        mileage: isMileage && form.mileage ? form.mileage : undefined,
        mileageRate: isMileage && form.mileageRate ? form.mileageRate : undefined,
      };
      if (editing) return apiRequest("PUT", `/api/caregiver-expenses/${editing.id}`, payload);
      return apiRequest("POST", `/api/caregivers/${caregiverId}/expenses`, payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Expense updated" : "Expense added" });
      invalidate();
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/caregiver-expenses/${id}`),
    onSuccess: () => { toast({ title: "Expense deleted" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (expense: CaregiverExpense) => {
    setEditing(expense);
    setForm({
      expenseDate: expense.expenseDate.slice(0, 10),
      expenseType: expense.expenseType,
      amount: String(expense.amount),
      description: expense.description || "",
      status: expense.status,
      mileage: expense.mileage ? String(expense.mileage) : "",
      mileageRate: expense.mileageRate ? String(expense.mileageRate) : "",
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" />Expenses</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="button-add-expense">
            <Plus className="w-4 h-4 mr-2" />Add Expense
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : expenses.length === 0 ? (
          <p className="text-muted-foreground text-sm">No expenses recorded</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                  <TableCell>{format(new Date(expense.expenseDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="capitalize">{expense.expenseType?.replace(/_/g, " ")}</TableCell>
                  <TableCell>${parseFloat(expense.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      expense.status === "paid" ? "default" :
                      expense.status === "approved" ? "secondary" :
                      expense.status === "pending" ? "outline" : "destructive"
                    }>
                      {expense.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{expense.description || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(expense)} data-testid={`button-edit-expense-${expense.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(expense.id)} data-testid={`button-delete-expense-${expense.id}`}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} data-testid="input-expense-date" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.expenseType} onValueChange={(v) => setForm((f) => ({ ...f, expenseType: v }))}>
                  <SelectTrigger data-testid="select-expense-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {isMileage && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Miles</Label>
                  <Input type="number" step="0.1" min="0" value={form.mileage} onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))} data-testid="input-expense-mileage" />
                </div>
                <div className="space-y-2">
                  <Label>Rate per Mile</Label>
                  <Input type="number" step="0.0001" min="0" value={form.mileageRate} onChange={(e) => setForm((f) => ({ ...f, mileageRate: e.target.value }))} data-testid="input-expense-mileage-rate" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} data-testid="input-expense-amount" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} data-testid="textarea-expense-description" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-expense-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.amount || !form.expenseDate} data-testid="button-save-expense">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Expense?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-expense">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
