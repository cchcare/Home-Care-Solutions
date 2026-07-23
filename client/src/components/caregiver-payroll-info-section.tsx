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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Plus, Pencil, Loader2 } from "lucide-react";

interface CaregiverPayrollInfo {
  paymentMethod?: string | null;
  bankName?: string | null;
  accountType?: string | null;
  accountNumberLast4?: string | null;
  routingNumberLast4?: string | null;
  taxFilingStatus?: string | null;
  federalWithholding?: number | null;
  stateWithholding?: number | null;
  additionalWithholding?: string | null;
  ssn_last4?: string | null;
  w4OnFile?: boolean | null;
  i9OnFile?: boolean | null;
}

const emptyForm = {
  paymentMethod: "direct_deposit", bankName: "", accountType: "checking", accountNumberLast4: "",
  routingNumberLast4: "", taxFilingStatus: "single", federalWithholding: "0", stateWithholding: "0",
  additionalWithholding: "", ssn_last4: "", w4OnFile: false, i9OnFile: false,
};

export function CaregiverPayrollInfoSection({ caregiverId }: { caregiverId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["/api/caregivers", caregiverId, "payroll-info"] as const;
  const { data: payrollInfo, isLoading } = useQuery<CaregiverPayrollInfo | null>({
    queryKey: queryKey as any,
    queryFn: async () => {
      const r = await fetch(`/api/caregivers/${caregiverId}/payroll-info`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load payroll info");
      return r.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey as any });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/caregivers/${caregiverId}/payroll-info`, {
      paymentMethod: form.paymentMethod,
      bankName: form.bankName || undefined,
      accountType: form.accountType,
      accountNumberLast4: form.accountNumberLast4 || undefined,
      routingNumberLast4: form.routingNumberLast4 || undefined,
      taxFilingStatus: form.taxFilingStatus,
      federalWithholding: parseInt(form.federalWithholding || "0", 10),
      stateWithholding: parseInt(form.stateWithholding || "0", 10),
      additionalWithholding: form.additionalWithholding || undefined,
      ssn_last4: form.ssn_last4 || undefined,
      w4OnFile: form.w4OnFile,
      i9OnFile: form.i9OnFile,
    }),
    onSuccess: () => {
      toast({ title: "Payroll info saved" });
      invalidate();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openForm = () => {
    if (payrollInfo) {
      setForm({
        paymentMethod: payrollInfo.paymentMethod || "direct_deposit",
        bankName: payrollInfo.bankName || "",
        accountType: payrollInfo.accountType || "checking",
        accountNumberLast4: payrollInfo.accountNumberLast4 || "",
        routingNumberLast4: payrollInfo.routingNumberLast4 || "",
        taxFilingStatus: payrollInfo.taxFilingStatus || "single",
        federalWithholding: String(payrollInfo.federalWithholding ?? 0),
        stateWithholding: String(payrollInfo.stateWithholding ?? 0),
        additionalWithholding: payrollInfo.additionalWithholding || "",
        ssn_last4: payrollInfo.ssn_last4 || "",
        w4OnFile: !!payrollInfo.w4OnFile,
        i9OnFile: !!payrollInfo.i9OnFile,
      });
    } else {
      setForm(emptyForm);
    }
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Payroll Information</CardTitle>
          {payrollInfo && (
            <Button size="sm" variant="outline" onClick={openForm} data-testid="button-edit-payroll">
              <Pencil className="w-4 h-4 mr-2" />Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !payrollInfo ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No payroll information configured</p>
            <Button onClick={openForm} data-testid="button-setup-payroll">
              <Plus className="w-4 h-4 mr-2" />Setup Payroll Info
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Payment Method</Label>
              <p className="font-medium capitalize" data-testid="text-payment-method">{payrollInfo.paymentMethod?.replace(/_/g, " ") || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Bank Name</Label>
              <p className="font-medium" data-testid="text-bank-name">{payrollInfo.bankName || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Account Type</Label>
              <p className="font-medium capitalize" data-testid="text-account-type">{payrollInfo.accountType || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Tax Filing Status</Label>
              <p className="font-medium capitalize" data-testid="text-tax-status">{payrollInfo.taxFilingStatus?.replace(/_/g, " ") || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">W-4 On File</Label>
              <Badge variant={payrollInfo.w4OnFile ? "default" : "secondary"} data-testid="badge-w4">{payrollInfo.w4OnFile ? "Yes" : "No"}</Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">I-9 On File</Label>
              <Badge variant={payrollInfo.i9OnFile ? "default" : "secondary"} data-testid="badge-i9">{payrollInfo.i9OnFile ? "Yes" : "No"}</Badge>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{payrollInfo ? "Edit Payroll Info" : "Setup Payroll Info"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="paycard">Paycard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={form.accountType} onValueChange={(v) => setForm((f) => ({ ...f, accountType: v }))}>
                  <SelectTrigger data-testid="select-account-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} data-testid="input-bank-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account # (last 4)</Label>
                <Input maxLength={4} value={form.accountNumberLast4} onChange={(e) => setForm((f) => ({ ...f, accountNumberLast4: e.target.value }))} data-testid="input-account-last4" />
              </div>
              <div className="space-y-2">
                <Label>Routing # (last 4)</Label>
                <Input maxLength={4} value={form.routingNumberLast4} onChange={(e) => setForm((f) => ({ ...f, routingNumberLast4: e.target.value }))} data-testid="input-routing-last4" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>SSN (last 4)</Label>
              <Input maxLength={4} value={form.ssn_last4} onChange={(e) => setForm((f) => ({ ...f, ssn_last4: e.target.value }))} data-testid="input-ssn-last4" />
            </div>
            <div className="space-y-2">
              <Label>Tax Filing Status</Label>
              <Select value={form.taxFilingStatus} onValueChange={(v) => setForm((f) => ({ ...f, taxFilingStatus: v }))}>
                <SelectTrigger data-testid="select-tax-filing-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married_filing_jointly">Married Filing Jointly</SelectItem>
                  <SelectItem value="married_filing_separately">Married Filing Separately</SelectItem>
                  <SelectItem value="head_of_household">Head of Household</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Federal Withholding</Label>
                <Input type="number" min="0" value={form.federalWithholding} onChange={(e) => setForm((f) => ({ ...f, federalWithholding: e.target.value }))} data-testid="input-federal-withholding" />
              </div>
              <div className="space-y-2">
                <Label>State Withholding</Label>
                <Input type="number" min="0" value={form.stateWithholding} onChange={(e) => setForm((f) => ({ ...f, stateWithholding: e.target.value }))} data-testid="input-state-withholding" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Additional Withholding ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.additionalWithholding} onChange={(e) => setForm((f) => ({ ...f, additionalWithholding: e.target.value }))} data-testid="input-additional-withholding" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox checked={form.w4OnFile} onCheckedChange={(c) => setForm((f) => ({ ...f, w4OnFile: c === true }))} data-testid="checkbox-w4-on-file" />
                <Label>W-4 On File</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.i9OnFile} onCheckedChange={(c) => setForm((f) => ({ ...f, i9OnFile: c === true }))} data-testid="checkbox-i9-on-file" />
                <Label>I-9 On File</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-payroll">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
