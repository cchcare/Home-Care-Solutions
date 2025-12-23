import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO, isValid, startOfMonth, endOfMonth, subMonths, addDays, getDaysInMonth, getDay } from "date-fns";
import { 
  DollarSign, 
  Calendar, 
  Printer, 
  Plus, 
  Settings,
  FileText,
  Users,
  Building2,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Send
} from "lucide-react";
import type { Office, BillingRecord, PayrollRun, OfficePayrollConfig, Mco, OfficeMcoBillingRate, Client, Caregiver } from "@shared/schema";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const billingFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  caregiverId: z.string().optional(),
  mcoId: z.string().optional(),
  serviceCode: z.string().optional(),
  servicePeriodStart: z.string().min(1, "Start date is required"),
  servicePeriodEnd: z.string().min(1, "End date is required"),
  hoursOrUnits: z.string().optional(),
  rate: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

const payrollFormSchema = z.object({
  payPeriodStart: z.string().min(1, "Pay period start is required"),
  payPeriodEnd: z.string().min(1, "Pay period end is required"),
  paycheckDate: z.string().min(1, "Paycheck date is required"),
  notes: z.string().optional(),
});

const mcoRateFormSchema = z.object({
  mcoId: z.string().min(1, "MCO is required"),
  serviceCode: z.string().min(1, "Service code is required"),
  serviceName: z.string().optional(),
  rate: z.string().min(1, "Rate is required"),
  rateType: z.string().default("hourly"),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  notes: z.string().optional(),
});

export default function BillingPayroll() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [showMcoRateDialog, setShowMcoRateDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<OfficeMcoBillingRate | null>(null);
  const [payrollFrequency, setPayrollFrequency] = useState("biweekly");
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const actualOfficeId = selectedOfficeId === "all" ? "" : selectedOfficeId;

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const { data: mcos = [] } = useQuery<Mco[]>({
    queryKey: ["/api/mcos"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients", actualOfficeId],
    queryFn: () => fetch(`/api/clients${actualOfficeId ? `?officeId=${actualOfficeId}` : ""}`).then(r => r.json()),
  });

  const { data: caregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers", actualOfficeId],
    queryFn: () => fetch(`/api/caregivers${actualOfficeId ? `?officeId=${actualOfficeId}` : ""}`).then(r => r.json()),
  });

  const { data: billingRecords = [] } = useQuery<BillingRecord[]>({
    queryKey: ["/api/billing", actualOfficeId],
    queryFn: () => fetch(`/api/billing${actualOfficeId ? `?officeId=${actualOfficeId}` : ""}`).then(r => r.json()),
  });

  const { data: payrollRuns = [] } = useQuery<PayrollRun[]>({
    queryKey: ["/api/payroll", actualOfficeId],
    queryFn: () => fetch(`/api/payroll${actualOfficeId ? `?officeId=${actualOfficeId}` : ""}`).then(r => r.json()),
  });

  const { data: payrollConfig } = useQuery<OfficePayrollConfig | null>({
    queryKey: ["/api/offices", actualOfficeId, "payroll-config"],
    queryFn: () => actualOfficeId ? fetch(`/api/offices/${actualOfficeId}/payroll-config`).then(r => r.json()) : null,
    enabled: !!actualOfficeId,
  });

  const { data: mcoRates = [] } = useQuery<OfficeMcoBillingRate[]>({
    queryKey: ["/api/offices", actualOfficeId, "mco-rates"],
    queryFn: () => actualOfficeId ? fetch(`/api/offices/${actualOfficeId}/mco-rates`).then(r => r.json()) : [],
    enabled: !!actualOfficeId,
  });

  const selectedOffice = offices.find(o => o.id === actualOfficeId);

  useEffect(() => {
    if (payrollConfig) {
      setPayrollFrequency(payrollConfig.payrollFrequency || "biweekly");
      setCompanyName(payrollConfig.companyName || "");
      if (payrollConfig.customPayrollDates) {
        setCustomDates(payrollConfig.customPayrollDates as string[]);
      }
    }
  }, [payrollConfig]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/offices/${actualOfficeId}/payroll-config`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", actualOfficeId, "payroll-config"] });
      setShowConfigDialog(false);
      toast({ title: "Payroll configuration saved" });
    },
    onError: () => {
      toast({ title: "Failed to save configuration", variant: "destructive" });
    },
  });

  const createBillingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/billing", {
        ...data,
        officeId: actualOfficeId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      setShowBillingDialog(false);
      billingForm.reset();
      toast({ title: "Billing record created" });
    },
    onError: () => {
      toast({ title: "Failed to create billing record", variant: "destructive" });
    },
  });

  const createPayrollMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/payroll", {
        ...data,
        officeId: actualOfficeId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      setShowPayrollDialog(false);
      payrollForm.reset();
      toast({ title: "Payroll run created" });
    },
    onError: () => {
      toast({ title: "Failed to create payroll run", variant: "destructive" });
    },
  });

  const updatePayrollStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/payroll/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll status updated" });
    },
  });

  const updateBillingStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/billing/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      toast({ title: "Billing status updated" });
    },
  });

  const saveMcoRateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingRate) {
        const response = await apiRequest("PUT", `/api/offices/${actualOfficeId}/mco-rates/${editingRate.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", `/api/offices/${actualOfficeId}/mco-rates`, data);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", actualOfficeId, "mco-rates"] });
      setShowMcoRateDialog(false);
      setEditingRate(null);
      mcoRateForm.reset();
      toast({ title: editingRate ? "MCO rate updated" : "MCO rate created" });
    },
    onError: () => {
      toast({ title: "Failed to save MCO rate", variant: "destructive" });
    },
  });

  const deleteMcoRateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/offices/${actualOfficeId}/mco-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", actualOfficeId, "mco-rates"] });
      toast({ title: "MCO rate deleted" });
    },
  });

  const billingForm = useForm({
    resolver: zodResolver(billingFormSchema),
    defaultValues: {
      clientId: "",
      caregiverId: "",
      mcoId: "",
      serviceCode: "",
      servicePeriodStart: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
      servicePeriodEnd: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
      hoursOrUnits: "",
      rate: "",
      amount: "",
      dueDate: "",
      notes: "",
    },
  });

  const payrollForm = useForm({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      payPeriodStart: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
      payPeriodEnd: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
      paycheckDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const getNextBiweeklyDates = () => {
    const sortedRuns = [...payrollRuns].sort((a, b) => 
      new Date(b.payPeriodEnd).getTime() - new Date(a.payPeriodEnd).getTime()
    );
    
    if (sortedRuns.length > 0) {
      const lastRun = sortedRuns[0];
      const endDateValue = lastRun.payPeriodEnd as unknown;
      const lastPeriodEndStr = typeof endDateValue === 'string' 
        ? endDateValue.split('T')[0] 
        : format(new Date(endDateValue as Date), "yyyy-MM-dd");
      const [year, month, day] = lastPeriodEndStr.split('-').map(Number);
      const lastPeriodEnd = new Date(year, month - 1, day);
      const nextPeriodStart = addDays(lastPeriodEnd, 1);
      const nextPeriodEnd = addDays(nextPeriodStart, 13);
      const nextPaycheckDate = addDays(nextPeriodEnd, 5);
      
      return {
        payPeriodStart: format(nextPeriodStart, "yyyy-MM-dd"),
        payPeriodEnd: format(nextPeriodEnd, "yyyy-MM-dd"),
        paycheckDate: format(nextPaycheckDate, "yyyy-MM-dd"),
        notes: "",
      };
    }
    
    const today = new Date();
    const periodStart = today;
    const periodEnd = addDays(periodStart, 13);
    const paycheckDate = addDays(periodEnd, 5);
    
    return {
      payPeriodStart: format(periodStart, "yyyy-MM-dd"),
      payPeriodEnd: format(periodEnd, "yyyy-MM-dd"),
      paycheckDate: format(paycheckDate, "yyyy-MM-dd"),
      notes: "",
    };
  };

  const handleOpenPayrollDialog = () => {
    const nextDates = getNextBiweeklyDates();
    payrollForm.reset(nextDates);
    setShowPayrollDialog(true);
  };

  const mcoRateForm = useForm({
    resolver: zodResolver(mcoRateFormSchema),
    defaultValues: {
      mcoId: "",
      serviceCode: "",
      serviceName: "",
      rate: "",
      rateType: "hourly",
      effectiveFrom: "",
      effectiveTo: "",
      notes: "",
    },
  });

  const handleSaveConfig = () => {
    saveConfigMutation.mutate({
      payrollFrequency,
      customPayrollDates: customDates,
      companyName,
    });
  };

  const handleAddDate = (dateStr: string) => {
    if (dateStr && !customDates.includes(dateStr)) {
      setCustomDates([...customDates, dateStr].sort());
    }
  };

  const handleRemoveDate = (dateStr: string) => {
    setCustomDates(customDates.filter(d => d !== dateStr));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEditRate = (rate: OfficeMcoBillingRate) => {
    setEditingRate(rate);
    mcoRateForm.reset({
      mcoId: rate.mcoId,
      serviceCode: rate.serviceCode,
      serviceName: rate.serviceName || "",
      rate: rate.rate,
      rateType: rate.rateType || "hourly",
      effectiveFrom: rate.effectiveFrom ? format(new Date(rate.effectiveFrom), "yyyy-MM-dd") : "",
      effectiveTo: rate.effectiveTo ? format(new Date(rate.effectiveTo), "yyyy-MM-dd") : "",
      notes: rate.notes || "",
    });
    setShowMcoRateDialog(true);
  };

  const getPayrollDatesForYear = () => {
    const dates: Date[] = [];
    if (payrollConfig?.customPayrollDates) {
      const configDates = payrollConfig.customPayrollDates as string[];
      configDates.forEach(dateStr => {
        const parsed = parseISO(dateStr);
        if (isValid(parsed) && parsed.getFullYear() === selectedYear) {
          dates.push(parsed);
        }
      });
    }
    return dates.sort((a, b) => a.getTime() - b.getTime());
  };

  const payrollDates = getPayrollDatesForYear();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      approved: "secondary",
      draft: "outline",
      pending: "outline",
      invoiced: "secondary",
      overdue: "destructive",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getMcoName = (mcoId: string | null) => {
    if (!mcoId) return "-";
    const mco = mcos.find(m => m.id === mcoId);
    return mco?.name || "-";
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "-";
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "-";
  };

  const totalBilled = billingRecords.reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);
  const totalPaid = billingRecords.filter(r => r.status === "paid").reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);
  const totalPending = billingRecords.filter(r => r.status === "pending" || r.status === "invoiced").reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Billing & Payroll"
          subtitle="Manage billing records, MCO rates, and payroll"
        />
        
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-64">
                  <Label>Select Office</Label>
                  <Select value={selectedOfficeId} onValueChange={setSelectedOfficeId}>
                    <SelectTrigger data-testid="select-office">
                      <SelectValue placeholder="All Offices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Offices</SelectItem>
                      {offices.map(office => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {actualOfficeId && (
                <div className="flex gap-2">
                  <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-payroll-settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Payroll Settings
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Payroll Configuration - {selectedOffice?.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Company Name (for calendar)</Label>
                          <Input 
                            value={companyName} 
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Enter company name"
                            data-testid="input-company-name"
                          />
                        </div>
                        <div>
                          <Label>Payroll Frequency</Label>
                          <Select value={payrollFrequency} onValueChange={setPayrollFrequency}>
                            <SelectTrigger data-testid="select-payroll-frequency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                              <SelectItem value="semi_monthly">Semi-Monthly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Custom Payroll Dates</Label>
                          <p className="text-sm text-muted-foreground mb-2">Add specific payroll dates for the year</p>
                          <div className="flex gap-2 mb-2">
                            <Input 
                              type="date"
                              id="newPayrollDate"
                              data-testid="input-new-payroll-date"
                            />
                            <Button 
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const input = document.getElementById('newPayrollDate') as HTMLInputElement;
                                if (input.value) {
                                  handleAddDate(input.value);
                                  input.value = '';
                                }
                              }}
                              data-testid="button-add-date"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {customDates.map(date => (
                              <Badge 
                                key={date} 
                                variant="secondary" 
                                className="cursor-pointer"
                                onClick={() => handleRemoveDate(date)}
                              >
                                {format(parseISO(date), "MMM d, yyyy")} ×
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button 
                          onClick={handleSaveConfig}
                          disabled={saveConfigMutation.isPending}
                          className="w-full"
                          data-testid="button-save-config"
                        >
                          Save Configuration
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                      <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Billed</p>
                      <p className="text-2xl font-bold">${totalBilled.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                      <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payroll Runs</p>
                      <p className="text-2xl font-bold">{payrollRuns.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="billing" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="billing" data-testid="tab-billing">
                  <FileText className="w-4 h-4 mr-2" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="payroll" data-testid="tab-payroll">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Payroll
                </TabsTrigger>
                <TabsTrigger value="mco-rates" data-testid="tab-mco-rates">
                  <Building2 className="w-4 h-4 mr-2" />
                  MCO Rates
                </TabsTrigger>
                <TabsTrigger value="calendar" data-testid="tab-calendar">
                  <Calendar className="w-4 h-4 mr-2" />
                  Calendar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="billing" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Billing Records
                      </CardTitle>
                      <CardDescription>Create and manage billing invoices</CardDescription>
                    </div>
                    {actualOfficeId && (
                      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
                        <DialogTrigger asChild>
                          <Button data-testid="button-create-billing">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Billing
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Create Billing Record</DialogTitle>
                          </DialogHeader>
                          <Form {...billingForm}>
                            <form onSubmit={billingForm.handleSubmit((data) => createBillingMutation.mutate(data))} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={billingForm.control}
                                  name="clientId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Client *</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-billing-client">
                                            <SelectValue placeholder="Select client" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {clients.map(client => (
                                            <SelectItem key={client.id} value={client.id}>
                                              {client.firstName} {client.lastName}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={billingForm.control}
                                  name="mcoId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>MCO (Payer)</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-billing-mco">
                                            <SelectValue placeholder="Select MCO" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="private">Private Pay</SelectItem>
                                          {mcos.map(mco => (
                                            <SelectItem key={mco.id} value={mco.id}>
                                              {mco.name}
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
                                  control={billingForm.control}
                                  name="servicePeriodStart"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Service Period Start *</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} data-testid="input-billing-start" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={billingForm.control}
                                  name="servicePeriodEnd"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Service Period End *</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} data-testid="input-billing-end" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <FormField
                                  control={billingForm.control}
                                  name="serviceCode"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Service Code</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., S5125" data-testid="input-service-code" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={billingForm.control}
                                  name="hoursOrUnits"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Hours/Units</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.25" {...field} data-testid="input-hours" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={billingForm.control}
                                  name="rate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Rate ($)</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.01" {...field} data-testid="input-rate" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={billingForm.control}
                                  name="amount"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Total Amount *</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.01" {...field} data-testid="input-amount" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={billingForm.control}
                                  name="dueDate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Due Date</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} data-testid="input-due-date" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={billingForm.control}
                                name="notes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={2} data-testid="input-billing-notes" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="submit" disabled={createBillingMutation.isPending} data-testid="button-submit-billing">
                                  {createBillingMutation.isPending ? "Creating..." : "Create Billing Record"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!actualOfficeId ? (
                      <p className="text-center text-muted-foreground py-8">Select an office to manage billing</p>
                    ) : billingRecords.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No billing records found. Create your first billing record.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-3 text-sm font-medium">Client</th>
                              <th className="text-left p-3 text-sm font-medium">MCO</th>
                              <th className="text-left p-3 text-sm font-medium">Service Period</th>
                              <th className="text-left p-3 text-sm font-medium">Code</th>
                              <th className="text-left p-3 text-sm font-medium">Amount</th>
                              <th className="text-left p-3 text-sm font-medium">Status</th>
                              <th className="text-left p-3 text-sm font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {billingRecords.map((record) => (
                              <tr key={record.id} data-testid={`billing-row-${record.id}`}>
                                <td className="p-3">{getClientName(record.clientId)}</td>
                                <td className="p-3">{getMcoName(record.mcoId)}</td>
                                <td className="p-3">
                                  {record.servicePeriodStart && record.servicePeriodEnd ? (
                                    <>
                                      {format(new Date(record.servicePeriodStart), "MMM d")} - {format(new Date(record.servicePeriodEnd), "MMM d, yyyy")}
                                    </>
                                  ) : "-"}
                                </td>
                                <td className="p-3 font-mono">{record.serviceCode || "-"}</td>
                                <td className="p-3 font-medium">${record.amount}</td>
                                <td className="p-3">{getStatusBadge(record.status || "pending")}</td>
                                <td className="p-3">
                                  <div className="flex gap-1">
                                    {record.status === "pending" && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => updateBillingStatusMutation.mutate({ id: record.id, status: "invoiced" })}
                                        data-testid={`button-invoice-${record.id}`}
                                      >
                                        <Send className="w-3 h-3" />
                                      </Button>
                                    )}
                                    {record.status === "invoiced" && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => updateBillingStatusMutation.mutate({ id: record.id, status: "paid" })}
                                        data-testid={`button-mark-paid-${record.id}`}
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payroll" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Payroll Runs
                      </CardTitle>
                      <CardDescription>Create and manage payroll cycles</CardDescription>
                    </div>
                    {actualOfficeId && (
                      <Dialog open={showPayrollDialog} onOpenChange={setShowPayrollDialog}>
                        <Button onClick={handleOpenPayrollDialog} data-testid="button-create-payroll">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Payroll Run
                        </Button>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Create Payroll Run</DialogTitle>
                          </DialogHeader>
                          <Form {...payrollForm}>
                            <form onSubmit={payrollForm.handleSubmit((data) => createPayrollMutation.mutate(data))} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={payrollForm.control}
                                  name="payPeriodStart"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Pay Period Start *</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} data-testid="input-payroll-start" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={payrollForm.control}
                                  name="payPeriodEnd"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Pay Period End *</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} data-testid="input-payroll-end" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={payrollForm.control}
                                name="paycheckDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Paycheck Date *</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} data-testid="input-paycheck-date" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={payrollForm.control}
                                name="notes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={2} data-testid="input-payroll-notes" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="submit" disabled={createPayrollMutation.isPending} data-testid="button-submit-payroll">
                                  {createPayrollMutation.isPending ? "Creating..." : "Create Payroll Run"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!actualOfficeId ? (
                      <p className="text-center text-muted-foreground py-8">Select an office to manage payroll</p>
                    ) : payrollRuns.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No payroll runs found. Create your first payroll run.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-3 text-sm font-medium">Pay Period</th>
                              <th className="text-left p-3 text-sm font-medium">Paycheck Date</th>
                              <th className="text-left p-3 text-sm font-medium">Employees</th>
                              <th className="text-left p-3 text-sm font-medium">Gross</th>
                              <th className="text-left p-3 text-sm font-medium">Net</th>
                              <th className="text-left p-3 text-sm font-medium">Status</th>
                              <th className="text-left p-3 text-sm font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {payrollRuns.map((run) => (
                              <tr key={run.id} data-testid={`payroll-row-${run.id}`}>
                                <td className="p-3">
                                  {run.payPeriodStart && run.payPeriodEnd ? (
                                    <>
                                      {format(new Date(run.payPeriodStart), "MMM d")} - {format(new Date(run.payPeriodEnd), "MMM d, yyyy")}
                                    </>
                                  ) : "-"}
                                </td>
                                <td className="p-3 font-medium">
                                  {run.paycheckDate ? format(new Date(run.paycheckDate), "MMM d, yyyy") : "-"}
                                </td>
                                <td className="p-3">{run.employeeCount || 0}</td>
                                <td className="p-3">${run.totalGross || "0.00"}</td>
                                <td className="p-3 font-medium">${run.totalNet || "0.00"}</td>
                                <td className="p-3">{getStatusBadge(run.status || "draft")}</td>
                                <td className="p-3">
                                  <div className="flex gap-1">
                                    {run.status === "draft" && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => updatePayrollStatusMutation.mutate({ id: run.id, status: "approved" })}
                                        data-testid={`button-approve-${run.id}`}
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                      </Button>
                                    )}
                                    {run.status === "approved" && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => updatePayrollStatusMutation.mutate({ id: run.id, status: "paid" })}
                                        data-testid={`button-pay-${run.id}`}
                                      >
                                        <DollarSign className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mco-rates" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        MCO Billing Rates
                      </CardTitle>
                      <CardDescription>Configure billing rates for each MCO at this office</CardDescription>
                    </div>
                    {actualOfficeId && (
                      <Dialog open={showMcoRateDialog} onOpenChange={(open) => {
                        setShowMcoRateDialog(open);
                        if (!open) {
                          setEditingRate(null);
                          mcoRateForm.reset();
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button data-testid="button-add-mco-rate">
                            <Plus className="w-4 h-4 mr-2" />
                            Add MCO Rate
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>{editingRate ? "Edit MCO Rate" : "Add MCO Rate"}</DialogTitle>
                          </DialogHeader>
                          <Form {...mcoRateForm}>
                            <form onSubmit={mcoRateForm.handleSubmit((data) => saveMcoRateMutation.mutate(data))} className="space-y-4">
                              <FormField
                                control={mcoRateForm.control}
                                name="mcoId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>MCO *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-rate-mco">
                                          <SelectValue placeholder="Select MCO" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {mcos.map(mco => (
                                          <SelectItem key={mco.id} value={mco.id}>
                                            {mco.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={mcoRateForm.control}
                                  name="serviceCode"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Service Code *</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., S5125" data-testid="input-rate-code" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={mcoRateForm.control}
                                  name="serviceName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Service Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., Attendant Care" data-testid="input-rate-name" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={mcoRateForm.control}
                                  name="rate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Rate ($) *</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.01" {...field} data-testid="input-rate-amount" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={mcoRateForm.control}
                                  name="rateType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Rate Type</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-rate-type">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="hourly">Per Hour</SelectItem>
                                          <SelectItem value="per_visit">Per Visit</SelectItem>
                                          <SelectItem value="daily">Daily</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={mcoRateForm.control}
                                  name="effectiveFrom"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Effective From</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} data-testid="input-effective-from" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={mcoRateForm.control}
                                  name="effectiveTo"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Effective To</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} data-testid="input-effective-to" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={mcoRateForm.control}
                                name="notes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={2} data-testid="input-rate-notes" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="submit" disabled={saveMcoRateMutation.isPending} data-testid="button-submit-rate">
                                  {saveMcoRateMutation.isPending ? "Saving..." : editingRate ? "Update Rate" : "Add Rate"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!actualOfficeId ? (
                      <p className="text-center text-muted-foreground py-8">Select an office to configure MCO rates</p>
                    ) : mcoRates.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No MCO rates configured. Add rates to enable billing calculations.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-3 text-sm font-medium">MCO</th>
                              <th className="text-left p-3 text-sm font-medium">Service Code</th>
                              <th className="text-left p-3 text-sm font-medium">Service Name</th>
                              <th className="text-left p-3 text-sm font-medium">Rate</th>
                              <th className="text-left p-3 text-sm font-medium">Type</th>
                              <th className="text-left p-3 text-sm font-medium">Effective</th>
                              <th className="text-left p-3 text-sm font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {mcoRates.map((rate) => (
                              <tr key={rate.id} data-testid={`rate-row-${rate.id}`}>
                                <td className="p-3">{getMcoName(rate.mcoId)}</td>
                                <td className="p-3 font-mono">{rate.serviceCode}</td>
                                <td className="p-3">{rate.serviceName || "-"}</td>
                                <td className="p-3 font-medium">${rate.rate}</td>
                                <td className="p-3">
                                  <Badge variant="outline">{rate.rateType}</Badge>
                                </td>
                                <td className="p-3 text-sm">
                                  {rate.effectiveFrom ? format(new Date(rate.effectiveFrom), "MMM d, yyyy") : "No start"} - 
                                  {rate.effectiveTo ? format(new Date(rate.effectiveTo), "MMM d, yyyy") : "Ongoing"}
                                </td>
                                <td className="p-3">
                                  <div className="flex gap-1">
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => handleEditRate(rate)}
                                      data-testid={`button-edit-rate-${rate.id}`}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => deleteMcoRateMutation.mutate(rate.id)}
                                      data-testid={`button-delete-rate-${rate.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calendar" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Payroll Calendar {selectedYear}
                      </CardTitle>
                      <CardDescription>
                        {selectedOffice ? `${selectedOffice.name} - ${payrollConfig?.companyName || companyName || ""}` : "Select an office to view payroll calendar"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-32" data-testid="select-year">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026].map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={handlePrint} data-testid="button-print-calendar">
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div ref={printRef} className="print-area">
                      <style>{`
                        @media print {
                          body * { visibility: hidden; }
                          .print-area, .print-area * { visibility: visible; }
                          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                          .no-print { display: none !important; }
                        }
                      `}</style>
                      
                      <div className="text-center mb-6 print:mb-4">
                        <h2 className="text-2xl font-bold">{payrollConfig?.companyName || selectedOffice?.name || "Company Name"}</h2>
                        <p className="text-lg text-muted-foreground">Payroll Calendar {selectedYear}</p>
                      </div>

                      {!actualOfficeId ? (
                        <p className="text-center text-muted-foreground py-8">Please select an office to view the payroll calendar</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-4 mb-4 justify-center">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500"></div>
                              <span className="text-sm">Pay Period Start</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-blue-500"></div>
                              <span className="text-sm">Pay Period End</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-purple-500"></div>
                              <span className="text-sm">Paycheck Date</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {MONTHS.map((month, monthIndex) => {
                              const firstDayOfMonth = new Date(selectedYear, monthIndex, 1);
                              const daysInMonth = getDaysInMonth(firstDayOfMonth);
                              const startingDayOfWeek = getDay(firstDayOfMonth);
                              
                              const payPeriodStarts = payrollRuns
                                .filter(run => {
                                  const d = new Date(run.payPeriodStart);
                                  return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
                                })
                                .map(run => new Date(run.payPeriodStart).getDate());
                              
                              const payPeriodEnds = payrollRuns
                                .filter(run => {
                                  const d = new Date(run.payPeriodEnd);
                                  return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
                                })
                                .map(run => new Date(run.payPeriodEnd).getDate());
                              
                              const paycheckDates = payrollRuns
                                .filter(run => {
                                  const d = new Date(run.paycheckDate);
                                  return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
                                })
                                .map(run => new Date(run.paycheckDate).getDate());
                              
                              return (
                                <div key={month} className="border rounded-lg p-2">
                                  <h4 className="font-medium text-center mb-2 text-primary">{month}</h4>
                                  <div className="grid grid-cols-7 gap-0.5 text-xs">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                      <div key={i} className="text-center font-medium text-muted-foreground p-1">
                                        {day}
                                      </div>
                                    ))}
                                    {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                                      <div key={`empty-${i}`} className="p-1"></div>
                                    ))}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                      const day = i + 1;
                                      const isStart = payPeriodStarts.includes(day);
                                      const isEnd = payPeriodEnds.includes(day);
                                      const isPaycheck = paycheckDates.includes(day);
                                      
                                      let bgClass = "";
                                      if (isPaycheck) bgClass = "bg-purple-500 text-white";
                                      else if (isEnd) bgClass = "bg-blue-500 text-white";
                                      else if (isStart) bgClass = "bg-green-500 text-white";
                                      
                                      return (
                                        <div 
                                          key={day} 
                                          className={`text-center p-1 rounded ${bgClass}`}
                                          title={
                                            isPaycheck ? "Paycheck Date" : 
                                            isEnd ? "Pay Period End" : 
                                            isStart ? "Pay Period Start" : ""
                                          }
                                        >
                                          {day}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {actualOfficeId && (
                        <div className="mt-6 border-t pt-4">
                          <h4 className="font-medium mb-3 text-lg">Payroll Dates Schedule</h4>
                          {payrollRuns.filter(run => new Date(run.payPeriodStart).getFullYear() === selectedYear).length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">No payroll runs scheduled for {selectedYear}. Create a payroll run in the Payroll tab.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2 font-medium">#</th>
                                    <th className="text-left p-2 font-medium">
                                      <span className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded bg-green-500"></div>
                                        Pay Period Start
                                      </span>
                                    </th>
                                    <th className="text-left p-2 font-medium">
                                      <span className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded bg-blue-500"></div>
                                        Pay Period End
                                      </span>
                                    </th>
                                    <th className="text-left p-2 font-medium">
                                      <span className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded bg-purple-500"></div>
                                        Paycheck Date
                                      </span>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {payrollRuns
                                    .filter(run => new Date(run.payPeriodStart).getFullYear() === selectedYear)
                                    .sort((a, b) => new Date(a.payPeriodStart).getTime() - new Date(b.payPeriodStart).getTime())
                                    .map((run, index) => (
                                      <tr key={run.id} className="hover:bg-muted/50">
                                        <td className="p-2 text-muted-foreground">{index + 1}</td>
                                        <td className="p-2">
                                          <Badge className="bg-green-500 hover:bg-green-600">
                                            {format(new Date(run.payPeriodStart), "EEEE, MMM d, yyyy")}
                                          </Badge>
                                        </td>
                                        <td className="p-2">
                                          <Badge className="bg-blue-500 hover:bg-blue-600">
                                            {format(new Date(run.payPeriodEnd), "EEEE, MMM d, yyyy")}
                                          </Badge>
                                        </td>
                                        <td className="p-2">
                                          <Badge className="bg-purple-500 hover:bg-purple-600">
                                            {format(new Date(run.paycheckDate), "EEEE, MMM d, yyyy")}
                                          </Badge>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground mt-3">
                            Total payroll periods: {payrollRuns.filter(run => new Date(run.payPeriodStart).getFullYear() === selectedYear).length}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
