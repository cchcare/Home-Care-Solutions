import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfYear, endOfYear, eachMonthOfInterval, addDays, parseISO, isValid } from "date-fns";
import { 
  DollarSign, 
  Calendar, 
  Printer, 
  Plus, 
  Settings,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  Users
} from "lucide-react";
import type { Office, BillingRecord, PayrollRun, OfficePayrollConfig } from "@shared/schema";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BillingPayroll() {
  const queryClient = useQueryClient();
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [payrollFrequency, setPayrollFrequency] = useState("biweekly");
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const { data: billingRecords = [] } = useQuery<BillingRecord[]>({
    queryKey: ["/api/billing", selectedOfficeId],
    queryFn: () => fetch(`/api/billing${selectedOfficeId ? `?officeId=${selectedOfficeId}` : ""}`).then(r => r.json()),
  });

  const { data: payrollRuns = [] } = useQuery<PayrollRun[]>({
    queryKey: ["/api/payroll", selectedOfficeId],
    queryFn: () => fetch(`/api/payroll${selectedOfficeId ? `?officeId=${selectedOfficeId}` : ""}`).then(r => r.json()),
  });

  const { data: payrollConfig } = useQuery<OfficePayrollConfig | null>({
    queryKey: ["/api/offices", selectedOfficeId, "payroll-config"],
    queryFn: () => selectedOfficeId ? fetch(`/api/offices/${selectedOfficeId}/payroll-config`).then(r => r.json()) : null,
    enabled: !!selectedOfficeId,
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/offices/${selectedOfficeId}/payroll-config`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", selectedOfficeId, "payroll-config"] });
      setShowConfigDialog(false);
    },
  });

  const selectedOffice = offices.find(o => o.id === selectedOfficeId);

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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Billing & Payroll"
          subtitle="Manage billing records and payroll"
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
                      <SelectItem value="">All Offices</SelectItem>
                      {offices.map(office => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedOfficeId && (
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
              )}
            </div>

            <Tabs defaultValue="billing" className="w-full">
              <TabsList>
                <TabsTrigger value="billing" data-testid="tab-billing">
                  <FileText className="w-4 h-4 mr-2" />
                  Billing History
                </TabsTrigger>
                <TabsTrigger value="payroll" data-testid="tab-payroll">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Payroll History
                </TabsTrigger>
                <TabsTrigger value="calendar" data-testid="tab-calendar">
                  <Calendar className="w-4 h-4 mr-2" />
                  Payroll Calendar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="billing" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Billing Records
                    </CardTitle>
                    <CardDescription>View and manage billing history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {billingRecords.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No billing records found</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-3 text-sm font-medium">Invoice #</th>
                              <th className="text-left p-3 text-sm font-medium">Service Period</th>
                              <th className="text-left p-3 text-sm font-medium">Amount</th>
                              <th className="text-left p-3 text-sm font-medium">Status</th>
                              <th className="text-left p-3 text-sm font-medium">Due Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {billingRecords.map((record) => (
                              <tr key={record.id} data-testid={`billing-row-${record.id}`}>
                                <td className="p-3 font-mono">{record.invoiceNumber || "-"}</td>
                                <td className="p-3">
                                  {record.servicePeriodStart && record.servicePeriodEnd ? (
                                    <>
                                      {format(new Date(record.servicePeriodStart), "MMM d")} - {format(new Date(record.servicePeriodEnd), "MMM d, yyyy")}
                                    </>
                                  ) : "-"}
                                </td>
                                <td className="p-3 font-medium">${record.amount}</td>
                                <td className="p-3">{getStatusBadge(record.status || "pending")}</td>
                                <td className="p-3">
                                  {record.dueDate ? format(new Date(record.dueDate), "MMM d, yyyy") : "-"}
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
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Payroll Runs
                    </CardTitle>
                    <CardDescription>View payroll history and details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {payrollRuns.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No payroll runs found</p>
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

                      {!selectedOfficeId ? (
                        <p className="text-center text-muted-foreground py-8">Please select an office to view the payroll calendar</p>
                      ) : payrollDates.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No payroll dates configured. Use the Payroll Settings button to add dates.</p>
                      ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                          {MONTHS.map((month, index) => {
                            const monthDates = payrollDates.filter(d => d.getMonth() === index);
                            return (
                              <div key={month} className="border rounded-lg p-3">
                                <h4 className="font-medium text-center mb-2 text-primary">{month}</h4>
                                <div className="space-y-1">
                                  {monthDates.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center">-</p>
                                  ) : (
                                    monthDates.map(date => (
                                      <div 
                                        key={date.toISOString()} 
                                        className="text-sm text-center bg-primary/10 rounded px-2 py-1"
                                      >
                                        {format(date, "MMM d")}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {payrollDates.length > 0 && (
                        <div className="mt-6 border-t pt-4">
                          <h4 className="font-medium mb-2">All Payroll Dates for {selectedYear}</h4>
                          <div className="flex flex-wrap gap-2">
                            {payrollDates.map(date => (
                              <Badge key={date.toISOString()} variant="outline">
                                {format(date, "EEEE, MMMM d, yyyy")}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Total payroll dates: {payrollDates.length}
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
