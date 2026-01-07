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
  Send,
  Upload,
  FileUp,
  AlertCircle,
  Loader2,
  AlertTriangle
} from "lucide-react";
import type { Office, BillingRecord, PayrollRun, OfficePayrollConfig, Mco, OfficeMcoBillingRate, Client, Caregiver, PayrollHoliday } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { QuickBooksExport } from "@/components/quickbooks-export";
import { useAuth } from "@/hooks/useAuth";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const parseLocalDate = (dateValue: unknown): Date => {
  if (!dateValue) return new Date();
  const dateStr = typeof dateValue === 'string' ? dateValue : String(dateValue);
  const cleanStr = dateStr.split('T')[0];
  const [year, month, day] = cleanStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getUSHolidays = (year: number): { date: Date; name: string }[] => {
  const holidays: { date: Date; name: string }[] = [];
  
  holidays.push({ date: new Date(year, 0, 1), name: "New Year's Day" });
  
  const janFirst = new Date(year, 0, 1);
  let mlkDay = new Date(year, 0, 15 + ((8 - janFirst.getDay()) % 7));
  holidays.push({ date: mlkDay, name: "MLK Jr. Day" });
  
  const febFirst = new Date(year, 1, 1);
  let presidentsDay = new Date(year, 1, 15 + ((8 - febFirst.getDay()) % 7));
  holidays.push({ date: presidentsDay, name: "Presidents' Day" });
  
  const mayFirst = new Date(year, 4, 1);
  let memorialDay = new Date(year, 4, 31);
  while (memorialDay.getDay() !== 1) memorialDay.setDate(memorialDay.getDate() - 1);
  holidays.push({ date: memorialDay, name: "Memorial Day" });
  
  holidays.push({ date: new Date(year, 6, 4), name: "Independence Day" });
  
  const sepFirst = new Date(year, 8, 1);
  let laborDay = new Date(year, 8, 1 + ((8 - sepFirst.getDay()) % 7));
  holidays.push({ date: laborDay, name: "Labor Day" });
  
  const octFirst = new Date(year, 9, 1);
  let columbusDay = new Date(year, 9, 8 + ((8 - octFirst.getDay()) % 7));
  holidays.push({ date: columbusDay, name: "Columbus Day" });
  
  holidays.push({ date: new Date(year, 10, 11), name: "Veterans Day" });
  
  const novFirst = new Date(year, 10, 1);
  let thanksgiving = new Date(year, 10, 22 + ((11 - novFirst.getDay()) % 7));
  holidays.push({ date: thanksgiving, name: "Thanksgiving" });
  
  holidays.push({ date: new Date(year, 11, 25), name: "Christmas Day" });
  
  return holidays;
};

const billingFormSchema = z.object({
  mcoId: z.string().min(1, "MCO is required"),
  serviceStartDate: z.string().min(1, "Service start date is required"),
  serviceEndDate: z.string().min(1, "Service end date is required"),
  serviceCode: z.string().optional(),
  hours: z.string().optional(),
  rate: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  billDate: z.string().min(1, "Bill date is required"),
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
  const { user } = useAuth();
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [showMcoRateDialog, setShowMcoRateDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<OfficeMcoBillingRate | null>(null);
  const [editingPayrollRun, setEditingPayrollRun] = useState<PayrollRun | null>(null);
  const [payrollFrequency, setPayrollFrequency] = useState("biweekly");
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [showMcoDialog, setShowMcoDialog] = useState(false);
  const [newMcoName, setNewMcoName] = useState("");
  const [newMcoTypeId, setNewMcoTypeId] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  
  // Billing hours import state
  const [showImportHoursDialog, setShowImportHoursDialog] = useState(false);
  const [selectedPayrollRunForImport, setSelectedPayrollRunForImport] = useState<PayrollRun | null>(null);
  const [importHoursFile, setImportHoursFile] = useState<File | null>(null);
  const [importHoursResults, setImportHoursResults] = useState<{
    summary: { total: number; matched: number; unmatched: number; errors: number };
    results: Array<{
      row: number;
      status: "matched" | "unmatched" | "error";
      clientHhaxId?: string;
      caregiverAssignmentId?: string;
      date?: string;
      hours?: number;
      message?: string;
    }>;
  } | null>(null);
  const [isImportingHours, setIsImportingHours] = useState(false);
  const [isCalculatingOvertime, setIsCalculatingOvertime] = useState<string | null>(null);
  const importHoursFileInputRef = useRef<HTMLInputElement>(null);
  
  // Bulk paystub upload state
  const [showBulkPaystubDialog, setShowBulkPaystubDialog] = useState(false);
  const [bulkPaystubFile, setBulkPaystubFile] = useState<File | null>(null);
  const [bulkPaystubResults, setBulkPaystubResults] = useState<{
    summary: { totalPages: number; matched: number; unmatched: number; notPaystub: number; errors: number };
    results: Array<{
      pageNumber: number;
      status: "matched" | "unmatched" | "not_paystub" | "error";
      caregiverId?: string;
      caregiverName?: string;
      extractedName?: string;
      payPeriod?: { start?: string; end?: string };
      grossPay?: number;
      netPay?: number;
      message?: string;
      paycheckId?: string;
    }>;
  } | null>(null);
  const [isUploadingPaystubs, setIsUploadingPaystubs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAllOffices = selectedOfficeId === "all";
  const canMutate = !isAllOffices;
  const viewOnlyMessage = "Select a specific office to add, edit, or delete items.";
  const actualOfficeId = selectedOfficeId === "all" ? "" : selectedOfficeId;

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  // Fetch MCOs from admin settings for the MCO Rate dropdown
  const { data: mcos = [] } = useQuery<Mco[]>({
    queryKey: ["/api/admin/mcos"],
  });

  const { data: allMcos = [] } = useQuery<Mco[]>({
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
    queryFn: () => fetch(`/api/billing${actualOfficeId ? `?officeId=${actualOfficeId}` : ""}`, { credentials: "include" }).then(r => r.json()),
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

  const { data: holidays = [] } = useQuery<PayrollHoliday[]>({
    queryKey: ["/api/payroll-holidays", actualOfficeId, selectedYear],
    queryFn: () => actualOfficeId ? fetch(`/api/payroll-holidays?officeId=${actualOfficeId}&year=${selectedYear}`).then(r => r.json()) : [],
    enabled: !!actualOfficeId,
  });

  const { data: mcoTypes = [] } = useQuery<{id: string; name: string}[]>({
    queryKey: ["/api/admin/mco-types"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/billing", selectedOfficeId] });
      setShowBillingDialog(false);
      billingForm.reset();
      toast({ title: "Billing record created" });
    },
    onError: () => {
      toast({ title: "Failed to create billing record", variant: "destructive" });
    },
  });

  const savePayrollMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingPayrollRun) {
        const response = await apiRequest("PUT", `/api/payroll/${editingPayrollRun.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/payroll", {
          ...data,
          officeId: actualOfficeId,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      setShowPayrollDialog(false);
      setEditingPayrollRun(null);
      payrollForm.reset();
      toast({ title: editingPayrollRun ? "Payroll run updated" : "Payroll run created" });
    },
    onError: () => {
      toast({ title: editingPayrollRun ? "Failed to update payroll run" : "Failed to create payroll run", variant: "destructive" });
    },
  });

  const deletePayrollMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payroll/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll run deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete payroll run", variant: "destructive" });
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

  const createMcoMutation = useMutation({
    mutationFn: async (data: { name: string; typeId?: string }) => {
      const response = await apiRequest("POST", `/api/offices/${actualOfficeId}/mcos`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", actualOfficeId, "mcos"] });
      setShowMcoDialog(false);
      setNewMcoName("");
      setNewMcoTypeId("");
      toast({ title: "MCO added" });
    },
    onError: () => {
      toast({ title: "Failed to add MCO", variant: "destructive" });
    },
  });

  const deleteMcoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/offices/${actualOfficeId}/mcos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", actualOfficeId, "mcos"] });
      toast({ title: "MCO removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove MCO", variant: "destructive" });
    },
  });

  const createHolidayMutation = useMutation({
    mutationFn: async (data: { name: string; date: string; officeId: string; year: number }) => {
      const response = await apiRequest("POST", "/api/payroll-holidays", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-holidays"] });
      setShowHolidayDialog(false);
      setNewHolidayName("");
      setNewHolidayDate("");
      toast({ title: "Holiday added" });
    },
    onError: () => {
      toast({ title: "Failed to add holiday", variant: "destructive" });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payroll-holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-holidays"] });
      toast({ title: "Holiday removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove holiday", variant: "destructive" });
    },
  });

  const billingForm = useForm({
    resolver: zodResolver(billingFormSchema),
    defaultValues: {
      mcoId: "",
      serviceStartDate: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
      serviceEndDate: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
      serviceCode: "",
      hours: "",
      rate: "",
      totalAmount: "",
      billDate: format(new Date(), "yyyy-MM-dd"),
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
      parseLocalDate(b.payPeriodEnd).getTime() - parseLocalDate(a.payPeriodEnd).getTime()
    );
    
    if (sortedRuns.length > 0) {
      const lastRun = sortedRuns[0];
      const lastPeriodEnd = parseLocalDate(lastRun.payPeriodEnd);
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
    setEditingPayrollRun(null);
    const nextDates = getNextBiweeklyDates();
    payrollForm.reset(nextDates);
    setShowPayrollDialog(true);
  };

  const handleEditPayrollRun = (run: PayrollRun) => {
    setEditingPayrollRun(run);
    payrollForm.reset({
      payPeriodStart: format(parseLocalDate(run.payPeriodStart), "yyyy-MM-dd"),
      payPeriodEnd: format(parseLocalDate(run.payPeriodEnd), "yyyy-MM-dd"),
      paycheckDate: format(parseLocalDate(run.paycheckDate), "yyyy-MM-dd"),
      notes: run.notes || "",
    });
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

  const handleBulkPaystubUpload = async () => {
    if (!bulkPaystubFile || !actualOfficeId) return;
    
    setIsUploadingPaystubs(true);
    setBulkPaystubResults(null);
    
    try {
      const formData = new FormData();
      formData.append("file", bulkPaystubFile);
      formData.append("officeId", actualOfficeId);
      
      const response = await fetch("/api/bulk-paystub-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process paystubs");
      }
      
      const data = await response.json();
      setBulkPaystubResults(data);
      
      if (data.summary.matched > 0) {
        toast({
          title: "Paystubs processed",
          description: `${data.summary.matched} paychecks created, ${data.summary.unmatched} unmatched`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process paystub file",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPaystubs(false);
    }
  };

  const resetBulkPaystubUpload = () => {
    setBulkPaystubFile(null);
    setBulkPaystubResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportHours = async () => {
    if (!importHoursFile || !selectedPayrollRunForImport) return;
    
    setIsImportingHours(true);
    setImportHoursResults(null);
    
    try {
      const formData = new FormData();
      formData.append("file", importHoursFile);
      
      const response = await fetch(`/api/payroll/${selectedPayrollRunForImport.id}/import-hours`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import hours");
      }
      
      const data = await response.json();
      setImportHoursResults(data);
      
      toast({
        title: "Hours imported",
        description: `${data.summary.matched} matched, ${data.summary.unmatched} unmatched, ${data.summary.errors} errors`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import hours",
        variant: "destructive",
      });
    } finally {
      setIsImportingHours(false);
    }
  };

  const resetImportHours = () => {
    setImportHoursFile(null);
    setImportHoursResults(null);
    if (importHoursFileInputRef.current) {
      importHoursFileInputRef.current.value = "";
    }
  };

  const handleOpenImportDialog = (run: PayrollRun) => {
    setSelectedPayrollRunForImport(run);
    resetImportHours();
    setShowImportHoursDialog(true);
  };

  const handleExportHours = async (runId: string) => {
    try {
      const response = await fetch(`/api/payroll/${runId}/export-hours`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to export hours");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-hours-${runId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Hours exported successfully" });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export hours",
        variant: "destructive",
      });
    }
  };

  const handleCalculateOvertime = async (runId: string) => {
    setIsCalculatingOvertime(runId);
    
    try {
      const response = await fetch(`/api/payroll/${runId}/calculate-overtime`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to calculate overtime");
      }
      
      toast({ title: "Overtime calculated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
    } catch (error: any) {
      toast({
        title: "Calculation failed",
        description: error.message || "Failed to calculate overtime",
        variant: "destructive",
      });
    } finally {
      setIsCalculatingOvertime(null);
    }
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
    const mco = allMcos.find(m => m.id === mcoId);
    return mco?.name || "-";
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "-";
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "-";
  };

  const totalBilled = billingRecords.reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0);
  const totalPaid = billingRecords.filter(r => r.status === "paid").reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0);
  const totalPending = billingRecords.filter(r => r.status === "pending" || r.status === "invoiced").reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0);

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
                  {user && ["admin", "office_admin", "super_admin"].includes(user.role) && (
                    <QuickBooksExport variant="dialog" selectedOfficeId={actualOfficeId} />
                  )}
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

            {isAllOffices && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-md text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {viewOnlyMessage}
              </div>
            )}

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
                    <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          disabled={!canMutate}
                          title={!canMutate ? viewOnlyMessage : undefined}
                          data-testid="button-create-billing"
                        >
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
                              <FormField
                                control={billingForm.control}
                                name="mcoId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>MCO *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-billing-mco">
                                          <SelectValue placeholder="Select MCO" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {allMcos.map(mco => (
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
                                  control={billingForm.control}
                                  name="serviceStartDate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Service Start Date *</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} data-testid="input-billing-start" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={billingForm.control}
                                  name="serviceEndDate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Service End Date *</FormLabel>
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
                                  name="hours"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Hours</FormLabel>
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
                                  name="totalAmount"
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
                                  name="billDate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Bill Date *</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} data-testid="input-bill-date" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Due date is automatically calculated based on MCO: UPMC (7 days), PA Health and Wellness (14 days), Amerihealth (24 days)
                              </p>
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
                  </CardHeader>
                  <CardContent>
                    {billingRecords.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No billing records found. Create your first billing record.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-3 text-sm font-medium">MCO</th>
                              <th className="text-left p-3 text-sm font-medium">Service Period</th>
                              <th className="text-left p-3 text-sm font-medium">Code</th>
                              <th className="text-left p-3 text-sm font-medium">Hours</th>
                              <th className="text-left p-3 text-sm font-medium">Amount</th>
                              <th className="text-left p-3 text-sm font-medium">Bill Date</th>
                              <th className="text-left p-3 text-sm font-medium">Due Date</th>
                              <th className="text-left p-3 text-sm font-medium">Status</th>
                              <th className="text-left p-3 text-sm font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {billingRecords.map((record) => (
                              <tr key={record.id} data-testid={`billing-row-${record.id}`}>
                                <td className="p-3">{getMcoName(record.mcoId)}</td>
                                <td className="p-3">
                                  {record.serviceStartDate && record.serviceEndDate ? (
                                    <>
                                      {format(new Date(record.serviceStartDate), "MMM d")} - {format(new Date(record.serviceEndDate), "MMM d, yyyy")}
                                    </>
                                  ) : "-"}
                                </td>
                                <td className="p-3 font-mono">{record.serviceCode || "-"}</td>
                                <td className="p-3">{record.hours || "-"}</td>
                                <td className="p-3 font-medium">${record.totalAmount}</td>
                                <td className="p-3">{record.billDate ? format(new Date(record.billDate), "MMM d, yyyy") : "-"}</td>
                                <td className="p-3">{record.dueDate ? format(new Date(record.dueDate), "MMM d, yyyy") : "-"}</td>
                                <td className="p-3">{getStatusBadge(record.status || "pending")}</td>
                                <td className="p-3">
                                  <div className="flex gap-1">
                                    {record.status === "pending" && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => updateBillingStatusMutation.mutate({ id: record.id, status: "invoiced" })}
                                        disabled={!canMutate}
                                        title={!canMutate ? viewOnlyMessage : undefined}
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
                                        disabled={!canMutate}
                                        title={!canMutate ? viewOnlyMessage : undefined}
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
                      <div className="flex gap-2">
                        <Dialog open={showImportHoursDialog} onOpenChange={(open) => {
                          setShowImportHoursDialog(open);
                          if (!open) {
                            setSelectedPayrollRunForImport(null);
                            resetImportHours();
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              disabled={!canMutate}
                              title={!canMutate ? viewOnlyMessage : undefined}
                              data-testid="button-import-billing-hours"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Import Billing Hours
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Import Billing Hours</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label>Select Payroll Run</Label>
                                <Select 
                                  value={selectedPayrollRunForImport?.id || ""} 
                                  onValueChange={(value) => {
                                    const run = payrollRuns.find(r => r.id === value);
                                    if (run) setSelectedPayrollRunForImport(run);
                                  }}
                                >
                                  <SelectTrigger data-testid="select-payroll-run-import">
                                    <SelectValue placeholder="Select payroll run" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {payrollRuns.map(run => (
                                      <SelectItem key={run.id} value={run.id}>
                                        {format(parseLocalDate(run.payPeriodStart), "MMM d")} - {format(parseLocalDate(run.payPeriodEnd), "MMM d, yyyy")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {selectedPayrollRunForImport && (
                                <>
                                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                    <input
                                      ref={importHoursFileInputRef}
                                      type="file"
                                      accept=".xlsx,.xls"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setImportHoursFile(file);
                                          setImportHoursResults(null);
                                        }
                                      }}
                                      data-testid="input-import-hours-file"
                                    />
                                    
                                    {!importHoursFile ? (
                                      <div className="space-y-4">
                                        <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                                        <div>
                                          <p className="text-lg font-medium">Upload Excel file</p>
                                          <p className="text-sm text-muted-foreground">
                                            Required columns: Client HHAX ID, Caregiver Assignment ID, Date, Hours
                                          </p>
                                        </div>
                                        <Button
                                          variant="outline"
                                          onClick={() => importHoursFileInputRef.current?.click()}
                                          data-testid="button-browse-import-hours"
                                        >
                                          Browse Files
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        <FileText className="w-12 h-12 mx-auto text-primary" />
                                        <div>
                                          <p className="text-lg font-medium">{importHoursFile.name}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {(importHoursFile.size / 1024).toFixed(2)} KB
                                          </p>
                                        </div>
                                        <div className="flex gap-2 justify-center">
                                          <Button
                                            onClick={handleImportHours}
                                            disabled={isImportingHours}
                                            data-testid="button-submit-import-hours"
                                          >
                                            {isImportingHours ? (
                                              <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Importing...
                                              </>
                                            ) : (
                                              <>
                                                <Upload className="w-4 h-4 mr-2" />
                                                Import Hours
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            variant="outline"
                                            onClick={resetImportHours}
                                            disabled={isImportingHours}
                                            data-testid="button-reset-import-hours"
                                          >
                                            Clear
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {importHoursResults && (
                                    <div className="space-y-4">
                                      <Separator />
                                      <div className="grid grid-cols-4 gap-4">
                                        <div className="text-center p-4 bg-muted rounded-lg">
                                          <p className="text-2xl font-bold">{importHoursResults.summary.total}</p>
                                          <p className="text-sm text-muted-foreground">Total Rows</p>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                                          <p className="text-2xl font-bold text-green-700">{importHoursResults.summary.matched}</p>
                                          <p className="text-sm text-green-600">Matched</p>
                                        </div>
                                        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                          <p className="text-2xl font-bold text-yellow-700">{importHoursResults.summary.unmatched}</p>
                                          <p className="text-sm text-yellow-600">Unmatched</p>
                                        </div>
                                        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                                          <p className="text-2xl font-bold text-red-700">{importHoursResults.summary.errors}</p>
                                          <p className="text-sm text-red-600">Errors</p>
                                        </div>
                                      </div>

                                      {importHoursResults.results.length > 0 && (
                                        <div className="max-h-64 overflow-y-auto">
                                          <table className="w-full">
                                            <thead className="border-b bg-muted/50 sticky top-0">
                                              <tr>
                                                <th className="text-left p-2 text-sm font-medium">Row</th>
                                                <th className="text-left p-2 text-sm font-medium">Status</th>
                                                <th className="text-left p-2 text-sm font-medium">Client HHAX ID</th>
                                                <th className="text-left p-2 text-sm font-medium">Assignment ID</th>
                                                <th className="text-left p-2 text-sm font-medium">Date</th>
                                                <th className="text-left p-2 text-sm font-medium">Hours</th>
                                                <th className="text-left p-2 text-sm font-medium">Message</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                              {importHoursResults.results.map((result, idx) => (
                                                <tr key={idx} data-testid={`import-result-row-${idx}`}>
                                                  <td className="p-2 text-sm">{result.row}</td>
                                                  <td className="p-2">
                                                    {result.status === "matched" && (
                                                      <Badge variant="default">Matched</Badge>
                                                    )}
                                                    {result.status === "unmatched" && (
                                                      <Badge variant="secondary">Unmatched</Badge>
                                                    )}
                                                    {result.status === "error" && (
                                                      <Badge variant="destructive">Error</Badge>
                                                    )}
                                                  </td>
                                                  <td className="p-2 text-sm font-mono">{result.clientHhaxId || "-"}</td>
                                                  <td className="p-2 text-sm font-mono">{result.caregiverAssignmentId || "-"}</td>
                                                  <td className="p-2 text-sm">{result.date || "-"}</td>
                                                  <td className="p-2 text-sm">{result.hours || "-"}</td>
                                                  <td className="p-2 text-sm text-muted-foreground">{result.message || "-"}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={showPayrollDialog} onOpenChange={(open) => {
                          setShowPayrollDialog(open);
                          if (!open) {
                            setEditingPayrollRun(null);
                            payrollForm.reset();
                          }
                        }}>
                          <Button 
                            onClick={handleOpenPayrollDialog} 
                            disabled={!canMutate}
                            title={!canMutate ? viewOnlyMessage : undefined}
                            data-testid="button-create-payroll"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Payroll Run
                          </Button>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>{editingPayrollRun ? "Edit Payroll Run" : "Create Payroll Run"}</DialogTitle>
                          </DialogHeader>
                          <Form {...payrollForm}>
                            <form onSubmit={payrollForm.handleSubmit((data) => savePayrollMutation.mutate(data))} className="space-y-4">
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
                                <Button type="submit" disabled={savePayrollMutation.isPending} data-testid="button-submit-payroll">
                                  {savePayrollMutation.isPending ? "Saving..." : editingPayrollRun ? "Update Payroll Run" : "Create Payroll Run"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                        </Dialog>
                      </div>
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
                                      {format(parseLocalDate(run.payPeriodStart), "MMM d")} - {format(parseLocalDate(run.payPeriodEnd), "MMM d, yyyy")}
                                    </>
                                  ) : "-"}
                                </td>
                                <td className="p-3 font-medium">
                                  {run.paycheckDate ? format(parseLocalDate(run.paycheckDate), "MMM d, yyyy") : "-"}
                                </td>
                                <td className="p-3">{run.employeeCount || 0}</td>
                                <td className="p-3">${run.totalGross || "0.00"}</td>
                                <td className="p-3 font-medium">${run.totalNet || "0.00"}</td>
                                <td className="p-3">{getStatusBadge(run.status || "draft")}</td>
                                <td className="p-3">
                                  <div className="flex gap-1 flex-wrap">
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => handleEditPayrollRun(run)}
                                      disabled={!canMutate}
                                      data-testid={`button-edit-payroll-${run.id}`}
                                      title={!canMutate ? viewOnlyMessage : "Edit payroll run"}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleOpenImportDialog(run)}
                                      disabled={!canMutate}
                                      data-testid={`button-import-hours-${run.id}`}
                                      title={!canMutate ? viewOnlyMessage : "Import hours"}
                                    >
                                      <Upload className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleExportHours(run.id)}
                                      disabled={!canMutate}
                                      data-testid={`button-export-hours-${run.id}`}
                                      title={!canMutate ? viewOnlyMessage : "Export hours"}
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleCalculateOvertime(run.id)}
                                      disabled={!canMutate || isCalculatingOvertime === run.id}
                                      data-testid={`button-calculate-overtime-${run.id}`}
                                      title={!canMutate ? viewOnlyMessage : "Calculate overtime"}
                                    >
                                      {isCalculatingOvertime === run.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Clock className="w-3 h-3" />
                                      )}
                                    </Button>
                                    {run.status === "draft" && (
                                      <>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => updatePayrollStatusMutation.mutate({ id: run.id, status: "approved" })}
                                          disabled={!canMutate}
                                          data-testid={`button-approve-${run.id}`}
                                          title={!canMutate ? viewOnlyMessage : "Approve"}
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          onClick={() => deletePayrollMutation.mutate(run.id)}
                                          disabled={!canMutate}
                                          data-testid={`button-delete-payroll-${run.id}`}
                                          title={!canMutate ? viewOnlyMessage : "Delete payroll run"}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </>
                                    )}
                                    {run.status === "approved" && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => updatePayrollStatusMutation.mutate({ id: run.id, status: "paid" })}
                                        disabled={!canMutate}
                                        data-testid={`button-pay-${run.id}`}
                                        title={!canMutate ? viewOnlyMessage : "Mark as paid"}
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

                {/* Bulk Paystub Upload Section */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileUp className="w-5 h-5" />
                      Bulk Paystub Upload
                    </CardTitle>
                    <CardDescription>
                      Upload a PDF containing multiple paystubs to automatically extract and match them to caregivers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!actualOfficeId ? (
                      <p className="text-center text-muted-foreground py-8">Select an office to upload paystubs</p>
                    ) : (
                      <div className="space-y-6">
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setBulkPaystubFile(file);
                                setBulkPaystubResults(null);
                              }
                            }}
                            data-testid="input-paystub-file"
                          />
                          
                          {!bulkPaystubFile ? (
                            <div className="space-y-4">
                              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                              <div>
                                <p className="text-lg font-medium">Drop your paystub PDF here</p>
                                <p className="text-sm text-muted-foreground">or click to browse</p>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!canMutate}
                                title={!canMutate ? viewOnlyMessage : undefined}
                                data-testid="button-browse-paystub"
                              >
                                Browse Files
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <FileText className="w-12 h-12 mx-auto text-primary" />
                              <div>
                                <p className="text-lg font-medium">{bulkPaystubFile.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(bulkPaystubFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div className="flex gap-2 justify-center">
                                <Button
                                  onClick={handleBulkPaystubUpload}
                                  disabled={!canMutate || isUploadingPaystubs}
                                  title={!canMutate ? viewOnlyMessage : undefined}
                                  data-testid="button-upload-paystubs"
                                >
                                  {isUploadingPaystubs ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Extract Paystubs
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={resetBulkPaystubUpload}
                                  disabled={isUploadingPaystubs}
                                  data-testid="button-reset-paystub"
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Results */}
                        {bulkPaystubResults && (
                          <div className="space-y-4">
                            <Separator />
                            <div className="grid grid-cols-4 gap-4">
                              <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-2xl font-bold">{bulkPaystubResults.summary.totalPages}</p>
                                <p className="text-sm text-muted-foreground">Total Pages</p>
                              </div>
                              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-2xl font-bold text-green-700">{bulkPaystubResults.summary.matched}</p>
                                <p className="text-sm text-green-600">Matched</p>
                              </div>
                              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <p className="text-2xl font-bold text-yellow-700">{bulkPaystubResults.summary.unmatched}</p>
                                <p className="text-sm text-yellow-600">Unmatched</p>
                              </div>
                              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-2xl font-bold text-gray-700">{bulkPaystubResults.summary.notPaystub}</p>
                                <p className="text-sm text-gray-600">Not Paystubs</p>
                              </div>
                            </div>

                            {/* Detailed Results Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="border-b bg-muted/50">
                                  <tr>
                                    <th className="text-left p-3 text-sm font-medium">Page</th>
                                    <th className="text-left p-3 text-sm font-medium">Status</th>
                                    <th className="text-left p-3 text-sm font-medium">Employee Name</th>
                                    <th className="text-left p-3 text-sm font-medium">Matched To</th>
                                    <th className="text-left p-3 text-sm font-medium">Pay Period</th>
                                    <th className="text-left p-3 text-sm font-medium">Gross Pay</th>
                                    <th className="text-left p-3 text-sm font-medium">Net Pay</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {bulkPaystubResults.results.map((result, idx) => (
                                    <tr key={idx} data-testid={`paystub-result-${result.pageNumber}`}>
                                      <td className="p-3">{result.pageNumber}</td>
                                      <td className="p-3">
                                        {result.status === "matched" && (
                                          <Badge className="bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Matched
                                          </Badge>
                                        )}
                                        {result.status === "unmatched" && (
                                          <Badge className="bg-yellow-100 text-yellow-800">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            Unmatched
                                          </Badge>
                                        )}
                                        {result.status === "not_paystub" && (
                                          <Badge variant="secondary">Not Paystub</Badge>
                                        )}
                                        {result.status === "error" && (
                                          <Badge variant="destructive">
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Error
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="p-3">{result.extractedName || "-"}</td>
                                      <td className="p-3 font-medium">{result.caregiverName || "-"}</td>
                                      <td className="p-3">
                                        {result.payPeriod?.start && result.payPeriod?.end
                                          ? `${result.payPeriod.start} - ${result.payPeriod.end}`
                                          : "-"}
                                      </td>
                                      <td className="p-3">{result.grossPay ? `$${result.grossPay.toFixed(2)}` : "-"}</td>
                                      <td className="p-3 font-medium">{result.netPay ? `$${result.netPay.toFixed(2)}` : "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mco-rates" className="mt-6 space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        MCOs (Managed Care Organizations)
                      </CardTitle>
                      <CardDescription>Manage MCOs for this office</CardDescription>
                    </div>
                    {actualOfficeId && (
                      <Dialog open={showMcoDialog} onOpenChange={setShowMcoDialog}>
                        <DialogTrigger asChild>
                          <Button data-testid="button-add-mco">
                            <Plus className="w-4 h-4 mr-2" />
                            Add MCO
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add MCO</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>MCO Name *</Label>
                              <Input
                                value={newMcoName}
                                onChange={(e) => setNewMcoName(e.target.value)}
                                placeholder="e.g., AmeriHealth, UPMC"
                                data-testid="input-mco-name"
                              />
                            </div>
                            <div>
                              <Label>MCO Type</Label>
                              <Select value={newMcoTypeId} onValueChange={setNewMcoTypeId}>
                                <SelectTrigger data-testid="select-mco-type">
                                  <SelectValue placeholder="Select MCO type (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  {mcoTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowMcoDialog(false)}>Cancel</Button>
                            <Button
                              onClick={() => {
                                if (newMcoName) {
                                  createMcoMutation.mutate({ 
                                    name: newMcoName, 
                                    typeId: newMcoTypeId || undefined 
                                  });
                                }
                              }}
                              disabled={!newMcoName || createMcoMutation.isPending}
                              data-testid="button-save-mco"
                            >
                              {createMcoMutation.isPending ? "Adding..." : "Add MCO"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!actualOfficeId ? (
                      <p className="text-center text-muted-foreground py-4">Please select an office to manage MCOs</p>
                    ) : mcos.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No MCOs configured for this office. Click "Add MCO" to get started.</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {mcos.map(mco => (
                          <div key={mco.id} className="flex items-center justify-between p-3 border rounded-lg group hover:bg-muted/50">
                            <span className="font-medium">{mco.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => deleteMcoMutation.mutate(mco.id)}
                              data-testid={`button-delete-mco-${mco.id}`}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
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
                        Print / Export PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div ref={printRef} className="print-area">
                      <style>{`
                        @media print {
                          @page {
                            size: 8.5in 11in;
                            margin: 0.25in;
                          }
                          body * { visibility: hidden; }
                          .print-area, .print-area * { visibility: visible; }
                          .print-area { 
                            position: absolute; 
                            left: 0; 
                            top: 0; 
                            width: 8in !important;
                            padding: 0 !important;
                            margin: 0 !important;
                          }
                          .no-print { display: none !important; }
                          .print-header { 
                            margin-bottom: 8px !important; 
                            padding-bottom: 4px !important;
                          }
                          .print-header h2 { 
                            font-size: 16pt !important; 
                            margin: 0 !important;
                          }
                          .print-header p { 
                            font-size: 11pt !important; 
                            margin: 2px 0 0 0 !important;
                          }
                          .print-legend { 
                            margin-bottom: 6px !important; 
                            gap: 12px !important;
                          }
                          .print-legend span { 
                            font-size: 8pt !important; 
                          }
                          .print-legend .legend-dot { 
                            width: 10px !important; 
                            height: 10px !important; 
                          }
                          .print-calendar-grid { 
                            grid-template-columns: repeat(3, 1fr) !important; 
                            gap: 8px !important;
                          }
                          .print-month { 
                            border: 1px solid #ccc !important; 
                            padding: 4px !important;
                            border-radius: 4px !important;
                            break-inside: avoid !important;
                          }
                          .print-month h4 { 
                            font-size: 9pt !important; 
                            margin-bottom: 3px !important;
                          }
                          .print-day-header { 
                            font-size: 6pt !important; 
                            padding: 1px !important;
                          }
                          .print-day { 
                            font-size: 7pt !important; 
                            padding: 2px 1px !important;
                            line-height: 1.1 !important;
                          }
                          .print-holidays {
                            margin-top: 6px !important;
                            padding: 4px !important;
                            font-size: 7pt !important;
                          }
                          .print-holidays h4 {
                            font-size: 8pt !important;
                            margin-bottom: 3px !important;
                          }
                          .print-holidays .grid {
                            grid-template-columns: repeat(5, 1fr) !important;
                            gap: 2px !important;
                          }
                          .print-schedule { display: none !important; }
                        }
                      `}</style>
                      
                      <div className="text-center mb-6 print:mb-2 print-header">
                        <h2 className="text-2xl font-bold">{payrollConfig?.companyName || selectedOffice?.name || "Company Name"}</h2>
                        <p className="text-lg text-muted-foreground">Payroll Calendar {selectedYear}</p>
                      </div>

                      {!actualOfficeId ? (
                        <p className="text-center text-muted-foreground py-8">Please select an office to view the payroll calendar</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-4 mb-4 justify-center print-legend">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500 legend-dot"></div>
                              <span className="text-sm">Pay Period Start</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-blue-500 legend-dot"></div>
                              <span className="text-sm">Pay Period End</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-purple-500 legend-dot"></div>
                              <span className="text-sm">Paycheck Date</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-red-500 legend-dot"></div>
                              <span className="text-sm">Holiday</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print-calendar-grid">
                            {MONTHS.map((month, monthIndex) => {
                              const firstDayOfMonth = new Date(selectedYear, monthIndex, 1);
                              const daysInMonth = getDaysInMonth(firstDayOfMonth);
                              const startingDayOfWeek = getDay(firstDayOfMonth);
                              
                              const monthHolidays = holidays
                                .filter(h => parseLocalDate(h.date).getMonth() === monthIndex)
                                .reduce((acc, h) => {
                                  acc[parseLocalDate(h.date).getDate()] = h.name;
                                  return acc;
                                }, {} as Record<number, string>);
                              
                              const payPeriodStarts = payrollRuns
                                .filter(run => {
                                  const d = parseLocalDate(run.payPeriodStart);
                                  return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
                                })
                                .map(run => parseLocalDate(run.payPeriodStart).getDate());
                              
                              const payPeriodEnds = payrollRuns
                                .filter(run => {
                                  const d = parseLocalDate(run.payPeriodEnd);
                                  return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
                                })
                                .map(run => parseLocalDate(run.payPeriodEnd).getDate());
                              
                              const paycheckDates = payrollRuns
                                .filter(run => {
                                  const d = parseLocalDate(run.paycheckDate);
                                  return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
                                })
                                .map(run => parseLocalDate(run.paycheckDate).getDate());
                              
                              return (
                                <div key={month} className="border rounded-lg p-2 print-month">
                                  <h4 className="font-medium text-center mb-2 text-primary">{month}</h4>
                                  <div className="grid grid-cols-7 gap-0.5 text-xs">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                      <div key={i} className="text-center font-medium text-muted-foreground p-1 print-day-header">
                                        {day}
                                      </div>
                                    ))}
                                    {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                                      <div key={`empty-${i}`} className="p-1 print-day"></div>
                                    ))}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                      const day = i + 1;
                                      const isStart = payPeriodStarts.includes(day);
                                      const isEnd = payPeriodEnds.includes(day);
                                      const isPaycheck = paycheckDates.includes(day);
                                      const isHoliday = day in monthHolidays;
                                      const holidayName = monthHolidays[day];
                                      
                                      let bgClass = "";
                                      let title = "";
                                      if (isPaycheck) { bgClass = "bg-purple-500 text-white"; title = "Paycheck Date"; }
                                      else if (isEnd) { bgClass = "bg-blue-500 text-white"; title = "Pay Period End"; }
                                      else if (isStart) { bgClass = "bg-green-500 text-white"; title = "Pay Period Start"; }
                                      else if (isHoliday) { bgClass = "bg-red-500 text-white"; title = holidayName; }
                                      
                                      return (
                                        <div 
                                          key={day} 
                                          className={`text-center p-1 rounded print-day ${bgClass}`}
                                          title={title}
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
                          
                          <div className="mt-4 border rounded-lg p-3 print-holidays">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-center flex-1">Holidays - {selectedYear}</h4>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setShowHolidayDialog(true)}
                                className="print:hidden"
                                data-testid="button-add-holiday"
                              >
                                <Plus className="w-4 h-4 mr-1" /> Add Holiday
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                              {holidays.map((holiday) => (
                                <div key={holiday.id} className="flex items-center gap-2 group">
                                  <div className="w-3 h-3 rounded bg-red-500 flex-shrink-0"></div>
                                  <span className="font-medium">{format(parseLocalDate(holiday.date), 'MMM d')}</span>
                                  <span className="text-muted-foreground truncate">- {holiday.name}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 print:hidden"
                                    onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                                    data-testid={`button-delete-holiday-${holiday.id}`}
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <Dialog open={showHolidayDialog} onOpenChange={setShowHolidayDialog}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Custom Holiday</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Holiday Name</Label>
                                  <Input
                                    value={newHolidayName}
                                    onChange={(e) => setNewHolidayName(e.target.value)}
                                    placeholder="e.g., Company Holiday"
                                    data-testid="input-holiday-name"
                                  />
                                </div>
                                <div>
                                  <Label>Date</Label>
                                  <Input
                                    type="date"
                                    value={newHolidayDate}
                                    onChange={(e) => setNewHolidayDate(e.target.value)}
                                    data-testid="input-holiday-date"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowHolidayDialog(false)}>Cancel</Button>
                                <Button
                                  onClick={() => {
                                    if (newHolidayName && newHolidayDate) {
                                      createHolidayMutation.mutate({
                                        name: newHolidayName,
                                        date: newHolidayDate,
                                        officeId: actualOfficeId,
                                        year: selectedYear,
                                      });
                                    }
                                  }}
                                  disabled={!newHolidayName || !newHolidayDate || createHolidayMutation.isPending}
                                  data-testid="button-save-holiday"
                                >
                                  {createHolidayMutation.isPending ? "Adding..." : "Add Holiday"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}

                      {actualOfficeId && (
                        <div className="mt-6 border-t pt-4 print-schedule">
                          <h4 className="font-medium mb-3 text-lg">Payroll Dates Schedule</h4>
                          {payrollRuns.filter(run => parseLocalDate(run.payPeriodStart).getFullYear() === selectedYear).length === 0 ? (
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
                                    .filter(run => parseLocalDate(run.payPeriodStart).getFullYear() === selectedYear)
                                    .sort((a, b) => parseLocalDate(a.payPeriodStart).getTime() - parseLocalDate(b.payPeriodStart).getTime())
                                    .map((run, index) => (
                                      <tr key={run.id} className="hover:bg-muted/50">
                                        <td className="p-2 text-muted-foreground">{index + 1}</td>
                                        <td className="p-2">
                                          <Badge className="bg-green-500 hover:bg-green-600">
                                            {format(parseLocalDate(run.payPeriodStart), "EEEE, MMM d, yyyy")}
                                          </Badge>
                                        </td>
                                        <td className="p-2">
                                          <Badge className="bg-blue-500 hover:bg-blue-600">
                                            {format(parseLocalDate(run.payPeriodEnd), "EEEE, MMM d, yyyy")}
                                          </Badge>
                                        </td>
                                        <td className="p-2">
                                          <Badge className="bg-purple-500 hover:bg-purple-600">
                                            {format(parseLocalDate(run.paycheckDate), "EEEE, MMM d, yyyy")}
                                          </Badge>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground mt-3">
                            Total payroll periods: {payrollRuns.filter(run => parseLocalDate(run.payPeriodStart).getFullYear() === selectedYear).length}
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
