import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCoordinatorPayRecordSchema, type CoordinatorPayRecord, type Coordinator, type Office } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit, Trash2, FileUp, DollarSign, Calendar, Filter, Download, Upload } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const payRecordFormSchema = z.object({
  coordinatorId: z.string().min(1, "Coordinator is required"),
  officeId: z.string().optional(),
  year: z.coerce.number().min(2000).max(2100),
  quarter: z.coerce.number().min(1).max(4),
  payDateStart: z.string().min(1, "Start date is required"),
  payDateEnd: z.string().min(1, "End date is required"),
  totalBilledHours: z.coerce.number().min(0).default(0),
  totalPayrollHours: z.coerce.number().min(0).default(0),
  accrualAmount: z.coerce.number().min(0).default(0),
  quarterlyBonus: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0).default(0),
  balanceRemaining: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type PayRecordFormData = z.infer<typeof payRecordFormSchema>;

export default function CoordinatorPayRecords() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CoordinatorPayRecord | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [quarterFilter, setQuarterFilter] = useState<string>("all");
  const [officeFilter, setOfficeFilter] = useState<string>("all");
  const [createSelectedFile, setCreateSelectedFile] = useState<File | null>(null);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = (user as any)?.role === "super_admin" || 
                  (user as any)?.role === "admin" || 
                  (user as any)?.role === "office_admin" ||
                  (user as any)?.role === "supervisor";

  const { data: records = [], isLoading } = useQuery<CoordinatorPayRecord[]>({
    queryKey: ["/api/coordinator-pay-records"],
  });

  const { data: coordinators = [] } = useQuery<Coordinator[]>({
    queryKey: ["/api/coordinators"],
  });

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const createForm = useForm<PayRecordFormData>({
    resolver: zodResolver(payRecordFormSchema),
    defaultValues: {
      coordinatorId: "",
      officeId: "",
      year: new Date().getFullYear(),
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      payDateStart: "",
      payDateEnd: "",
      totalBilledHours: 0,
      totalPayrollHours: 0,
      accrualAmount: 0,
      quarterlyBonus: 0,
      amountPaid: 0,
      balanceRemaining: 0,
      notes: "",
    },
  });

  const editForm = useForm<PayRecordFormData>({
    resolver: zodResolver(payRecordFormSchema),
    defaultValues: {
      coordinatorId: "",
      officeId: "",
      year: new Date().getFullYear(),
      quarter: 1,
      payDateStart: "",
      payDateEnd: "",
      totalBilledHours: 0,
      totalPayrollHours: 0,
      accrualAmount: 0,
      quarterlyBonus: 0,
      amountPaid: 0,
      balanceRemaining: 0,
      notes: "",
    },
  });

  const uploadDocument = async (file: File, coordinatorId: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("coordinatorId", coordinatorId);
    formData.append("documentType", "coordinator_pay_record");
    
    const response = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error("Document upload failed");
    }
    
    const doc = await response.json();
    return doc.id;
  };

  const createMutation = useMutation({
    mutationFn: async (data: PayRecordFormData) => {
      let documentId: string | null = null;
      
      if (createSelectedFile) {
        documentId = await uploadDocument(createSelectedFile, data.coordinatorId);
      }
      
      return apiRequest("POST", "/api/coordinator-pay-records", {
        ...data,
        payDateStart: new Date(data.payDateStart).toISOString(),
        payDateEnd: new Date(data.payDateEnd).toISOString(),
        documentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator-pay-records"] });
      setCreateOpen(false);
      setCreateSelectedFile(null);
      createForm.reset();
      toast({ title: "Success", description: "Pay record created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create pay record", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PayRecordFormData) => {
      let documentId: string | undefined = undefined;
      
      if (editSelectedFile) {
        documentId = (await uploadDocument(editSelectedFile, data.coordinatorId)) || undefined;
      }
      
      const updateData: any = {
        ...data,
        payDateStart: new Date(data.payDateStart).toISOString(),
        payDateEnd: new Date(data.payDateEnd).toISOString(),
      };
      
      if (documentId !== undefined) {
        updateData.documentId = documentId;
      }
      
      return apiRequest("PATCH", `/api/coordinator-pay-records/${selectedRecord?.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator-pay-records"] });
      setEditOpen(false);
      setEditSelectedFile(null);
      setSelectedRecord(null);
      toast({ title: "Success", description: "Pay record updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update pay record", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/coordinator-pay-records/${selectedRecord?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator-pay-records"] });
      setDeleteOpen(false);
      setSelectedRecord(null);
      toast({ title: "Success", description: "Pay record deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete pay record", variant: "destructive" });
    },
  });

  const handleEdit = (record: CoordinatorPayRecord) => {
    setSelectedRecord(record);
    setEditSelectedFile(null);
    editForm.reset({
      coordinatorId: record.coordinatorId,
      officeId: record.officeId || "",
      year: record.year,
      quarter: record.quarter,
      payDateStart: record.payDateStart ? format(new Date(record.payDateStart), "yyyy-MM-dd") : "",
      payDateEnd: record.payDateEnd ? format(new Date(record.payDateEnd), "yyyy-MM-dd") : "",
      totalBilledHours: parseFloat(record.totalBilledHours as string) || 0,
      totalPayrollHours: parseFloat(record.totalPayrollHours as string) || 0,
      accrualAmount: parseFloat(record.accrualAmount as string) || 0,
      quarterlyBonus: parseFloat(record.quarterlyBonus as string) || 0,
      amountPaid: parseFloat(record.amountPaid as string) || 0,
      balanceRemaining: parseFloat(record.balanceRemaining as string) || 0,
      notes: record.notes || "",
    });
    setEditOpen(true);
  };

  const handleDelete = (record: CoordinatorPayRecord) => {
    setSelectedRecord(record);
    setDeleteOpen(true);
  };

  const getCoordinatorName = (coordinatorId: string) => {
    const coordinator = coordinators.find(c => c.id === coordinatorId);
    return coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : "Unknown";
  };

  const getOfficeName = (officeId: string | null) => {
    if (!officeId) return "-";
    const office = offices.find(o => o.id === officeId);
    return office ? office.name : "-";
  };

  const filteredRecords = records.filter(record => {
    if (yearFilter !== "all" && record.year !== parseInt(yearFilter)) return false;
    if (quarterFilter !== "all" && record.quarter !== parseInt(quarterFilter)) return false;
    if (officeFilter !== "all" && record.officeId !== officeFilter) return false;
    return true;
  });

  const years = Array.from(new Set(records.map(r => r.year))).sort((a, b) => b - a);

  const formatCurrency = (value: string | number | null) => {
    const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatHours = (value: string | number | null) => {
    const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
    return num.toFixed(2);
  };

  const PayRecordForm = ({ 
    form, 
    onSubmit, 
    isPending,
    selectedFile,
    onFileChange,
    existingDocumentId 
  }: { 
    form: any, 
    onSubmit: (data: PayRecordFormData) => void, 
    isPending: boolean,
    selectedFile: File | null,
    onFileChange: (file: File | null) => void,
    existingDocumentId?: string | null
  }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="coordinatorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Care Coordinator</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-coordinator">
                      <SelectValue placeholder="Select coordinator" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {coordinators.map((coordinator) => (
                      <SelectItem key={coordinator.id} value={coordinator.id}>
                        {coordinator.firstName} {coordinator.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="officeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Office</FormLabel>
                <Select 
                  onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-office">
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No office</SelectItem>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input type="number" {...field} data-testid="input-year" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quarter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quarter</FormLabel>
                <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger data-testid="select-quarter">
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="payDateStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pay Date Start</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-pay-date-start" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="payDateEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pay Date End</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-pay-date-end" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="totalBilledHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Billed Hours</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-billed-hours" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="totalPayrollHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Payroll Hours</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-payroll-hours" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="accrualAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accrual Amount ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-accrual-amount" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quarterlyBonus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quarterly Bonus ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-quarterly-bonus" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amountPaid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Paid ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-amount-paid" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="balanceRemaining"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Balance Remaining ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-balance-remaining" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Additional notes..." data-testid="textarea-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <FileUp className="h-4 w-4" />
            <span className="font-medium">Document Attachment</span>
          </div>
          {existingDocumentId && !selectedFile && (
            <p className="text-sm text-muted-foreground mb-2">
              A document is already attached. Upload a new file to replace it.
            </p>
          )}
          <div className="flex items-center gap-4">
            <Input 
              type="file" 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              data-testid="input-document-file"
              className="flex-1"
            />
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{selectedFile.name}</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onFileChange(null)}
                  data-testid="button-clear-file"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Attach supporting documents such as payroll summaries, timesheets, or bonus calculations.
          </p>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Coordinator Pay Records" />
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Care Coordinator Pay Records
                  </CardTitle>
                  <CardDescription>
                    Track biweekly pay for care coordinators including hours, bonuses, and balances
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-record">
                        <Plus className="h-4 w-4 mr-2" />
                        New Pay Record
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create Pay Record</DialogTitle>
                        <DialogDescription>
                          Add a new biweekly pay record for a care coordinator
                        </DialogDescription>
                      </DialogHeader>
                      <PayRecordForm 
                        form={createForm} 
                        onSubmit={(data) => createMutation.mutate(data)} 
                        isPending={createMutation.isPending}
                        selectedFile={createSelectedFile}
                        onFileChange={setCreateSelectedFile}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Filters:</span>
                </div>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-32" data-testid="filter-year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={quarterFilter} onValueChange={setQuarterFilter}>
                  <SelectTrigger className="w-32" data-testid="filter-quarter">
                    <SelectValue placeholder="Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quarters</SelectItem>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={officeFilter} onValueChange={setOfficeFilter}>
                  <SelectTrigger className="w-40" data-testid="filter-office">
                    <SelectValue placeholder="Office" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {offices.map(office => (
                      <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No pay records found</p>
                  {isAdmin && <p className="text-sm">Click "New Pay Record" to add one</p>}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>Quarter</TableHead>
                        <TableHead>Coordinator</TableHead>
                        <TableHead>Pay Period</TableHead>
                        <TableHead className="text-right">Billed Hrs</TableHead>
                        <TableHead className="text-right">Payroll Hrs</TableHead>
                        <TableHead className="text-right">Accrual</TableHead>
                        <TableHead className="text-right">Bonus</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Notes</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow key={record.id} data-testid={`row-record-${record.id}`}>
                          <TableCell>{record.year}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Q{record.quarter}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {getCoordinatorName(record.coordinatorId)}
                          </TableCell>
                          <TableCell>
                            {record.payDateStart && record.payDateEnd ? (
                              <span className="text-sm">
                                {format(new Date(record.payDateStart), "MM/dd")} - {format(new Date(record.payDateEnd), "MM/dd/yyyy")}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right">{formatHours(record.totalBilledHours)}</TableCell>
                          <TableCell className="text-right">{formatHours(record.totalPayrollHours)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(record.accrualAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(record.quarterlyBonus)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(record.amountPaid)}</TableCell>
                          <TableCell className="text-right">
                            <span className={parseFloat(record.balanceRemaining as string) > 0 ? "text-orange-600 font-medium" : ""}>
                              {formatCurrency(record.balanceRemaining)}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={record.notes || ""}>
                            {record.notes || "-"}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(record)}
                                  data-testid={`button-edit-${record.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(record)}
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-${record.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pay Record</DialogTitle>
            <DialogDescription>
              Update the pay record details
            </DialogDescription>
          </DialogHeader>
          <PayRecordForm 
            form={editForm} 
            onSubmit={(data) => updateMutation.mutate(data)} 
            isPending={updateMutation.isPending}
            selectedFile={editSelectedFile}
            onFileChange={setEditSelectedFile}
            existingDocumentId={selectedRecord?.documentId}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pay Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the pay record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
