import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonCombobox } from "@/components/ui/person-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, subDays } from "date-fns";
import { 
  DollarSign, 
  Play, 
  Clock, 
  FileText, 
  Calculator, 
  CreditCard, 
  HeartPulse,
  Settings,
  AlertCircle,
  ChevronRight,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Upload,
  RefreshCw,
  Link2,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import type { Office, PayrollRun, Caregiver } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface ADPConfig {
  clientId: string;
  isConfigured: boolean;
  lastSync?: string;
}

interface PayrollAlert {
  id: string;
  type: "warning" | "info" | "error";
  title: string;
  description: string;
  actionUrl?: string;
}

export default function PayrollHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [runPayrollOpen, setRunPayrollOpen] = useState(false);
  const [offCycleOpen, setOffCycleOpen] = useState(false);
  const [importTimesheetsOpen, setImportTimesheetsOpen] = useState(false);
  const [manualCheckOpen, setManualCheckOpen] = useState(false);
  const [paymentOptionsOpen, setPaymentOptionsOpen] = useState(false);
  const [sickPayOpen, setSickPayOpen] = useState(false);
  const [manualCheckEmployeeId, setManualCheckEmployeeId] = useState<string>("");
  const [sickPayEmployeeId, setSickPayEmployeeId] = useState<string>("");
  const [adpSettingsOpen, setAdpSettingsOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<string>("all");

  const isAdmin = (user as any)?.role === "super_admin" || 
                  (user as any)?.role === "admin" || 
                  (user as any)?.role === "office_admin";

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const { data: payrollRuns = [] } = useQuery<PayrollRun[]>({
    queryKey: ["/api/payroll-runs"],
  });

  const { data: caregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
  });

  const { data: adpConfig } = useQuery<ADPConfig>({
    queryKey: ["/api/adp/config"],
    retry: false,
  });

  // Task #137: surface in-progress offboarding so payroll knows to expect a
  // final paycheck / COBRA notice before closing out the next run.
  const { data: offboardingInProgress = [] } = useQuery<any[]>({
    queryKey: ["/api/offboarding/instances", { status: "in_progress" }],
    queryFn: async () => {
      const r = await fetch("/api/offboarding/instances?status=in_progress", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const alerts: PayrollAlert[] = [
    ...(adpConfig && !adpConfig.isConfigured ? [{
      id: "adp-setup",
      type: "warning" as const,
      title: "ADP Integration Not Configured",
      description: "Set up ADP Workforce Now to enable full payroll functionality",
      actionUrl: "#settings"
    }] : []),
  ];

  const pendingPayrolls = payrollRuns.filter(p => p.status === "draft" || p.status === "approved");
  const completedPayrolls = payrollRuns.filter(p => p.status === "paid").slice(0, 5);

  const getNextPayDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    return addDays(today, daysUntilFriday);
  };

  const QuickActionCard = ({ 
    icon: Icon, 
    title, 
    description, 
    onClick,
    disabled = false
  }: { 
    icon: any; 
    title: string; 
    description: string; 
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onClick}
      data-testid={`action-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  const runPayrollMutation = useMutation({
    mutationFn: async (data: { officeId?: string; payPeriodStart: string; payPeriodEnd: string; paycheckDate: string }) => {
      return apiRequest("POST", "/api/payroll-runs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-runs"] });
      setRunPayrollOpen(false);
      toast({ title: "Success", description: "Payroll run initiated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to initiate payroll run", variant: "destructive" });
    },
  });

  const syncWithADPMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/adp/sync");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/adp/config"] });
      toast({ title: "Success", description: "Synced with ADP successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to sync with ADP. Check your configuration.", variant: "destructive" });
    },
  });

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Payroll" />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <DollarSign className="h-7 w-7" />
                  Payroll
                </h1>
                <p className="text-muted-foreground">
                  Manage payroll operations and ADP Workforce Now integration
                </p>
              </div>
              <div className="flex items-center gap-3">
                {adpConfig?.isConfigured && (
                  <Button 
                    variant="outline" 
                    onClick={() => syncWithADPMutation.mutate()}
                    disabled={syncWithADPMutation.isPending}
                    data-testid="button-sync-adp"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncWithADPMutation.isPending ? 'animate-spin' : ''}`} />
                    Sync with ADP
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setAdpSettingsOpen(true)}
                  data-testid="button-settings"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {alerts.length > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <span className="font-medium text-amber-800 dark:text-amber-200">Things to do</span>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                      {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {offboardingInProgress.length > 0 && (
              <Card
                className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 cursor-pointer hover:bg-orange-100/70 transition-colors"
                onClick={() => { window.location.href = "/offboarding"; }}
                data-testid="banner-offboarding-in-progress"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-orange-900 dark:text-orange-100">
                          Offboarding in progress
                        </div>
                        <div className="text-sm text-orange-800/80 dark:text-orange-200/80">
                          {offboardingInProgress.length} employee
                          {offboardingInProgress.length === 1 ? " is" : "s are"} mid-exit — final paycheck, COBRA notices, and exit interviews may be outstanding.
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                      {offboardingInProgress.length} active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickActionCard
                icon={Play}
                title="Run payroll"
                description="Run or continue your regular payroll."
                onClick={() => setRunPayrollOpen(true)}
              />
              <QuickActionCard
                icon={Clock}
                title="Run off-cycle payroll"
                description="Run or continue a payroll outside of your normal pay schedule."
                onClick={() => setOffCycleOpen(true)}
              />
              <QuickActionCard
                icon={Upload}
                title="Import timesheets"
                description="Import timesheet data into your payroll."
                onClick={() => setImportTimesheetsOpen(true)}
              />
            </div>

            <div className="space-y-4">
              <QuickActionCard
                icon={Calculator}
                title="Calculate manual checks"
                description="Record a hand-written check or calculate pay."
                onClick={() => setManualCheckOpen(true)}
              />
              <QuickActionCard
                icon={CreditCard}
                title="Check and payment options"
                description="Void and request payment refund, and update check numbers."
                onClick={() => setPaymentOptionsOpen(true)}
              />
              <QuickActionCard
                icon={HeartPulse}
                title="Record third-party sick pay"
                description="Record employee disability payments made by a third party."
                onClick={() => setSickPayOpen(true)}
              />
            </div>

            <Tabs defaultValue="pending" className="mt-8">
              <TabsList>
                <TabsTrigger value="pending" data-testid="tab-pending">
                  Pending Payrolls ({pendingPayrolls.length})
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">
                  Recent Completed
                </TabsTrigger>
                <TabsTrigger value="adp" data-testid="tab-adp">
                  ADP Integration
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Payroll Runs</CardTitle>
                    <CardDescription>Payroll runs that are in progress or awaiting processing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingPayrolls.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No pending payroll runs</p>
                        <p className="text-sm">Click "Run payroll" to start a new payroll cycle</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pay Period</TableHead>
                            <TableHead>Check Date</TableHead>
                            <TableHead>Office</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingPayrolls.map((run) => (
                            <TableRow key={run.id}>
                              <TableCell>
                                {format(new Date(run.payPeriodStart), "MMM d")} - {format(new Date(run.payPeriodEnd), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell>{format(new Date(run.paycheckDate), "MMM d, yyyy")}</TableCell>
                              <TableCell>
                                {offices.find(o => o.id === run.officeId)?.name || "All Offices"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={run.status === "approved" ? "default" : "secondary"}>
                                  {run.status === "draft" && <Clock className="h-3 w-3 mr-1" />}
                                  {run.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" data-testid={`continue-${run.id}`}>
                                  Continue
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="completed" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recently Completed Payrolls</CardTitle>
                    <CardDescription>Payroll runs that have been processed and completed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {completedPayrolls.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No completed payroll runs yet</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pay Period</TableHead>
                            <TableHead>Check Date</TableHead>
                            <TableHead>Office</TableHead>
                            <TableHead>Employees</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {completedPayrolls.map((run) => (
                            <TableRow key={run.id}>
                              <TableCell>
                                {format(new Date(run.payPeriodStart), "MMM d")} - {format(new Date(run.payPeriodEnd), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell>{format(new Date(run.paycheckDate), "MMM d, yyyy")}</TableCell>
                              <TableCell>
                                {offices.find(o => o.id === run.officeId)?.name || "All Offices"}
                              </TableCell>
                              <TableCell>-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="ghost" data-testid={`view-${run.id}`}>
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="adp" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="h-5 w-5" />
                      ADP Workforce Now Integration
                    </CardTitle>
                    <CardDescription>
                      Connect to ADP Workforce Now to sync employee data and run payroll
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {adpConfig?.isConfigured ? (
                      <div className="space-y-4">
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-800 dark:text-green-200">Connected</AlertTitle>
                          <AlertDescription className="text-green-700 dark:text-green-300">
                            Your ADP Workforce Now account is connected.
                            {adpConfig.lastSync && (
                              <span className="block mt-1 text-sm">
                                Last synced: {format(new Date(adpConfig.lastSync), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                        <div className="flex gap-3">
                          <Button 
                            onClick={() => syncWithADPMutation.mutate()}
                            disabled={syncWithADPMutation.isPending}
                            data-testid="button-sync"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncWithADPMutation.isPending ? 'animate-spin' : ''}`} />
                            Sync Now
                          </Button>
                          <Button variant="outline" onClick={() => setAdpSettingsOpen(true)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-800 dark:text-amber-200">Not Connected</AlertTitle>
                          <AlertDescription className="text-amber-700 dark:text-amber-300">
                            Connect your ADP Workforce Now account to enable seamless payroll processing.
                          </AlertDescription>
                        </Alert>
                        <div className="bg-muted/50 rounded-lg p-6">
                          <h4 className="font-semibold mb-2">To set up ADP integration, you'll need:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                            <li>ADP API Central subscription (contact your ADP representative)</li>
                            <li>Client ID and Client Secret from ADP Developer Portal</li>
                            <li>SSL certificate (.pem file) from ADP Professional Services</li>
                          </ul>
                          <div className="flex gap-3">
                            <Button onClick={() => setAdpSettingsOpen(true)} data-testid="button-configure-adp">
                              <Settings className="h-4 w-4 mr-2" />
                              Configure ADP
                            </Button>
                            <Button variant="outline" asChild>
                              <a href="https://developers.adp.com/" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                ADP Developer Portal
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <Dialog open={runPayrollOpen} onOpenChange={setRunPayrollOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Run Payroll</DialogTitle>
            <DialogDescription>Start a new regular payroll run</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Office</Label>
              <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                <SelectTrigger data-testid="select-office">
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Pay Period Start</Label>
                <Input 
                  type="date" 
                  defaultValue={format(subDays(new Date(), 14), "yyyy-MM-dd")}
                  data-testid="input-period-start"
                />
              </div>
              <div>
                <Label>Pay Period End</Label>
                <Input 
                  type="date" 
                  defaultValue={format(subDays(new Date(), 1), "yyyy-MM-dd")}
                  data-testid="input-period-end"
                />
              </div>
            </div>
            <div>
              <Label>Paycheck Date</Label>
              <Input 
                type="date" 
                defaultValue={format(getNextPayDate(), "yyyy-MM-dd")}
                data-testid="input-paycheck-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunPayrollOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                toast({ title: "Info", description: "ADP integration required to run payroll. Configure in Settings." });
              }}
              data-testid="button-start-payroll"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={offCycleOpen} onOpenChange={setOffCycleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Off-Cycle Payroll</DialogTitle>
            <DialogDescription>Process a payroll outside of the regular schedule</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Off-cycle payrolls are for special payments like bonuses, corrections, or termination pay.
              </AlertDescription>
            </Alert>
            <div>
              <Label>Reason for Off-Cycle</Label>
              <Select>
                <SelectTrigger data-testid="select-reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonus">Bonus Payment</SelectItem>
                  <SelectItem value="correction">Payroll Correction</SelectItem>
                  <SelectItem value="termination">Termination Pay</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paycheck Date</Label>
              <Input type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} data-testid="input-off-cycle-date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOffCycleOpen(false)}>Cancel</Button>
            <Button data-testid="button-start-off-cycle">Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importTimesheetsOpen} onOpenChange={setImportTimesheetsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Timesheets</DialogTitle>
            <DialogDescription>Import timesheet data for payroll processing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">Drop your timesheet file here</p>
              <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
              <Input type="file" accept=".csv,.xlsx,.xls" className="max-w-xs mx-auto" data-testid="input-timesheet-file" />
            </div>
            <div className="text-sm text-muted-foreground">
              Supported formats: CSV, Excel (.xlsx, .xls)
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportTimesheetsOpen(false)}>Cancel</Button>
            <Button data-testid="button-import">Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualCheckOpen} onOpenChange={setManualCheckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calculate Manual Check</DialogTitle>
            <DialogDescription>Record a hand-written check or calculate pay manually</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <PersonCombobox
                people={caregivers as any[]}
                value={manualCheckEmployeeId}
                onValueChange={setManualCheckEmployeeId}
                placeholder="Select employee"
                testId="select-employee"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Check Number</Label>
                <Input placeholder="Enter check number" data-testid="input-check-number" />
              </div>
              <div>
                <Label>Check Date</Label>
                <Input type="date" data-testid="input-check-date" />
              </div>
            </div>
            <div>
              <Label>Gross Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" data-testid="input-gross-amount" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualCheckOpen(false)}>Cancel</Button>
            <Button data-testid="button-calculate">Calculate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOptionsOpen} onOpenChange={setPaymentOptionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check and Payment Options</DialogTitle>
            <DialogDescription>Manage check numbers and payment refunds</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Button variant="outline" className="justify-start h-auto p-4" data-testid="button-void-check">
                <XCircle className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Void a Check</div>
                  <div className="text-sm text-muted-foreground">Cancel a printed check that was lost or damaged</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4" data-testid="button-refund">
                <RefreshCw className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Request Payment Refund</div>
                  <div className="text-sm text-muted-foreground">Request a refund for a direct deposit payment</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4" data-testid="button-update-check">
                <FileText className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Update Check Numbers</div>
                  <div className="text-sm text-muted-foreground">Update the starting check number for payroll</div>
                </div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOptionsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sickPayOpen} onOpenChange={setSickPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Third-Party Sick Pay</DialogTitle>
            <DialogDescription>Record employee disability payments made by a third party</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <PersonCombobox
                people={caregivers as any[]}
                value={sickPayEmployeeId}
                onValueChange={setSickPayEmployeeId}
                placeholder="Select employee"
                testId="select-sick-pay-employee"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" data-testid="input-sick-start" />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" data-testid="input-sick-end" />
              </div>
            </div>
            <div>
              <Label>Third-Party Payer</Label>
              <Input placeholder="Insurance company or payer name" data-testid="input-payer" />
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" data-testid="input-sick-amount" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSickPayOpen(false)}>Cancel</Button>
            <Button data-testid="button-record-sick-pay">Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adpSettingsOpen} onOpenChange={setAdpSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ADP Workforce Now Settings</DialogTitle>
            <DialogDescription>Configure your ADP integration credentials</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll need to purchase ADP API Central from the ADP Marketplace to get these credentials.
                <a 
                  href="https://apps.adp.com/en-US/apps/410612/adp-api-central-for-adp-workforce-now/overview" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline ml-1"
                >
                  Learn more
                </a>
              </AlertDescription>
            </Alert>
            <div>
              <Label>Client ID</Label>
              <Input 
                placeholder="Enter ADP Client ID" 
                type="password"
                data-testid="input-client-id"
              />
            </div>
            <div>
              <Label>Client Secret</Label>
              <Input 
                placeholder="Enter ADP Client Secret" 
                type="password"
                data-testid="input-client-secret"
              />
            </div>
            <div>
              <Label>SSL Certificate (.pem file)</Label>
              <Input 
                type="file" 
                accept=".pem"
                data-testid="input-cert-file"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload the SSL certificate provided by ADP Professional Services
              </p>
            </div>
            <div>
              <Label>API Environment</Label>
              <Select defaultValue="sandbox">
                <SelectTrigger data-testid="select-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdpSettingsOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                toast({ title: "Info", description: "ADP credentials will be saved. Please provide all required fields." });
              }}
              data-testid="button-save-adp"
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
