import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useOffice } from "@/context/office-context";
import { useToast } from "@/hooks/use-toast";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import ExcelJS from "exceljs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Download,
  Filter,
  PieChart,
  BarChart3,
  Calendar,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend
} from "recharts";

interface FinancialReportData {
  revenueSummary: {
    totalRevenueCurrentMonth: number;
    lastYearRevenue: number;
    yoyChange: number;
    totalBilled: number;
    totalApproved: number;
    totalPaid: number;
    totalClaims: number;
  };
  revenueByMco: { mcoId: string; mcoName: string; revenue: number; claims: number }[];
  revenueByOffice: { officeId: string; officeName: string; revenue: number; claims: number }[];
  arAging: {
    current: { count: number; amount: number };
    days30: { count: number; amount: number };
    days60: { count: number; amount: number };
    days90: { count: number; amount: number };
    over90: { count: number; amount: number };
  };
  arAgingByMco: {
    mcoId: string;
    mcoName: string;
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    total: number;
  }[];
  monthlyRevenue: { month: string; revenue: number; claims: number }[];
  profitabilityByMco: {
    mcoId: string;
    mcoName: string;
    revenue: number;
    estimatedCost: number;
    margin: number;
    marginPercent: number;
  }[];
  claimsByStatus: { status: string; count: number; amount: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
};

export default function FinancialReports() {
  const { selectedOfficeId, setSelectedOfficeId } = useOffice();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedMcoId, setSelectedMcoId] = useState<string>("all");

  const officeQuery = selectedOfficeId !== "all" ? `officeId=${selectedOfficeId}` : "";
  const mcoQuery = selectedMcoId !== "all" ? `mcoId=${selectedMcoId}` : "";
  const dateQuery = `startDate=${startDate}&endDate=${endDate}`;
  const queryParams = [officeQuery, mcoQuery, dateQuery].filter(Boolean).join("&");

  const { data: reportData, isLoading, error } = useQuery<FinancialReportData>({
    queryKey: ["/api/admin/financial-reports", selectedOfficeId, selectedMcoId, startDate, endDate],
    queryFn: () => fetch(`/api/admin/financial-reports?${queryParams}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: offices = [] } = useQuery<any[]>({
    queryKey: ["/api/offices"],
  });

  const { data: mcos = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/mcos"],
  });

  const exportToExcel = async (data: any[], sheetName: string, filename: string) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        worksheet.columns = headers.map(key => ({
          header: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          key,
          width: 20
        }));

        data.forEach(item => {
          const row: Record<string, any> = {};
          headers.forEach(key => {
            let value = item[key];
            if (typeof value === 'number' && (key.includes('revenue') || key.includes('amount') || key.includes('cost') || key.includes('margin'))) {
              value = formatCurrency(value);
            }
            row[key] = value;
          });
          worksheet.addRow(row);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export Successful", description: `Exported ${data.length} records to ${filename}.xlsx` });
    } catch (err) {
      toast({ title: "Export Failed", description: "Failed to export data", variant: "destructive" });
    }
  };

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Financial Reports" subtitle="Error loading report data" />
          <div className="flex-1 flex items-center justify-center">
            <Card className="p-6">
              <CardTitle className="text-destructive">Error Loading Reports</CardTitle>
              <CardDescription>Failed to load financial report data. Please try again.</CardDescription>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const totalArAmount = reportData?.arAging 
    ? reportData.arAging.current.amount + reportData.arAging.days30.amount + 
      reportData.arAging.days60.amount + reportData.arAging.days90.amount + reportData.arAging.over90.amount
    : 0;

  const arAgingChartData = reportData?.arAging ? [
    { name: 'Current', value: reportData.arAging.current.amount, color: '#22c55e' },
    { name: '1-30 Days', value: reportData.arAging.days30.amount, color: '#eab308' },
    { name: '31-60 Days', value: reportData.arAging.days60.amount, color: '#f97316' },
    { name: '61-90 Days', value: reportData.arAging.days90.amount, color: '#ef4444' },
    { name: '90+ Days', value: reportData.arAging.over90.amount, color: '#991b1b' },
  ] : [];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Financial Reports"
          subtitle="Comprehensive financial analysis and reporting"
        />
        
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Report Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Office</Label>
                    <Select value={selectedOfficeId} onValueChange={setSelectedOfficeId} data-testid="select-office">
                      <SelectTrigger data-testid="select-office-trigger">
                        <SelectValue placeholder="All Offices" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Offices</SelectItem>
                        {offices.map((office: any) => (
                          <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>MCO</Label>
                    <Select value={selectedMcoId} onValueChange={setSelectedMcoId} data-testid="select-mco">
                      <SelectTrigger data-testid="select-mco-trigger">
                        <SelectValue placeholder="All MCOs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All MCOs</SelectItem>
                        {mcos.map((mco: any) => (
                          <SelectItem key={mco.id} value={mco.id}>{mco.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card data-testid="card-total-revenue">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        Total Revenue (This Month)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600" data-testid="text-total-revenue">
                        {formatCurrency(reportData?.revenueSummary.totalRevenueCurrentMonth || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {reportData?.revenueSummary.totalClaims || 0} claims processed
                      </p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-yoy-comparison">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {(reportData?.revenueSummary.yoyChange || 0) >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        Year-over-Year
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${(reportData?.revenueSummary.yoyChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-yoy-change">
                        {(reportData?.revenueSummary.yoyChange || 0) >= 0 ? '+' : ''}{(reportData?.revenueSummary.yoyChange || 0).toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        vs. {formatCurrency(reportData?.revenueSummary.lastYearRevenue || 0)} last year
                      </p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-total-billed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        Total Billed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600" data-testid="text-total-billed">
                        {formatCurrency(reportData?.revenueSummary.totalBilled || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(reportData?.revenueSummary.totalApproved || 0)} approved
                      </p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-ar-total">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Outstanding AR
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600" data-testid="text-ar-total">
                        {formatCurrency(totalArAmount)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pending collection
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="revenue" className="space-y-4">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue Analysis</TabsTrigger>
                    <TabsTrigger value="ar-aging" data-testid="tab-ar-aging">AR Aging</TabsTrigger>
                    <TabsTrigger value="profitability" data-testid="tab-profitability">Profitability</TabsTrigger>
                    <TabsTrigger value="charts" data-testid="tab-charts">Charts</TabsTrigger>
                  </TabsList>

                  <TabsContent value="revenue" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Revenue Analysis</h2>
                      <Button 
                        variant="outline" 
                        onClick={() => exportToExcel(reportData?.revenueByMco || [], 'Revenue by MCO', 'revenue_by_mco')}
                        data-testid="button-export-revenue-mco"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export MCO Data
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Revenue by MCO
                          </CardTitle>
                          <CardDescription>Breakdown of revenue by managed care organization</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {reportData?.revenueByMco.length === 0 ? (
                              <p className="text-muted-foreground text-center py-4">No revenue data available</p>
                            ) : (
                              reportData?.revenueByMco.map((mco, index) => (
                                <div key={mco.mcoId} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg" data-testid={`row-mco-revenue-${index}`}>
                                  <div>
                                    <p className="font-medium">{mco.mcoName}</p>
                                    <p className="text-sm text-muted-foreground">{mco.claims} claims</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-green-600">{formatCurrency(mco.revenue)}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              Revenue by Office
                            </CardTitle>
                            <CardDescription>Breakdown of revenue by office location</CardDescription>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => exportToExcel(reportData?.revenueByOffice || [], 'Revenue by Office', 'revenue_by_office')}
                            data-testid="button-export-revenue-office"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {reportData?.revenueByOffice.length === 0 ? (
                              <p className="text-muted-foreground text-center py-4">No revenue data available</p>
                            ) : (
                              reportData?.revenueByOffice.map((office, index) => (
                                <div key={office.officeId} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg" data-testid={`row-office-revenue-${index}`}>
                                  <div>
                                    <p className="font-medium">{office.officeName}</p>
                                    <p className="text-sm text-muted-foreground">{office.claims} claims</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-green-600">{formatCurrency(office.revenue)}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="ar-aging" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Accounts Receivable Aging</h2>
                      <Button 
                        variant="outline" 
                        onClick={() => exportToExcel(reportData?.arAgingByMco || [], 'AR Aging by MCO', 'ar_aging_by_mco')}
                        data-testid="button-export-ar-aging"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export AR Aging
                      </Button>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Overall AR Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-5 gap-4">
                          <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
                            <p className="text-sm text-muted-foreground">Current</p>
                            <p className="text-xl font-bold text-green-600" data-testid="text-ar-current">{formatCurrency(reportData?.arAging.current.amount || 0)}</p>
                            <Badge variant="outline" className="mt-1 bg-green-100 text-green-800">{reportData?.arAging.current.count || 0} claims</Badge>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                            <p className="text-sm text-muted-foreground">1-30 Days</p>
                            <p className="text-xl font-bold text-yellow-600" data-testid="text-ar-30">{formatCurrency(reportData?.arAging.days30.amount || 0)}</p>
                            <Badge variant="outline" className="mt-1 bg-yellow-100 text-yellow-800">{reportData?.arAging.days30.count || 0} claims</Badge>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950">
                            <p className="text-sm text-muted-foreground">31-60 Days</p>
                            <p className="text-xl font-bold text-orange-600" data-testid="text-ar-60">{formatCurrency(reportData?.arAging.days60.amount || 0)}</p>
                            <Badge variant="outline" className="mt-1 bg-orange-100 text-orange-800">{reportData?.arAging.days60.count || 0} claims</Badge>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
                            <p className="text-sm text-muted-foreground">61-90 Days</p>
                            <p className="text-xl font-bold text-red-600" data-testid="text-ar-90">{formatCurrency(reportData?.arAging.days90.amount || 0)}</p>
                            <Badge variant="outline" className="mt-1 bg-red-100 text-red-800">{reportData?.arAging.days90.count || 0} claims</Badge>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-red-100 dark:bg-red-900">
                            <p className="text-sm text-muted-foreground">90+ Days</p>
                            <p className="text-xl font-bold text-red-800" data-testid="text-ar-over90">{formatCurrency(reportData?.arAging.over90.amount || 0)}</p>
                            <Badge variant="destructive" className="mt-1">{reportData?.arAging.over90.count || 0} claims</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>AR Aging by MCO</CardTitle>
                        <CardDescription>Outstanding receivables grouped by managed care organization</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>MCO</TableHead>
                              <TableHead className="text-right">Current</TableHead>
                              <TableHead className="text-right">1-30 Days</TableHead>
                              <TableHead className="text-right">31-60 Days</TableHead>
                              <TableHead className="text-right">61-90 Days</TableHead>
                              <TableHead className="text-right">90+ Days</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData?.arAgingByMco.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                  No outstanding receivables
                                </TableCell>
                              </TableRow>
                            ) : (
                              reportData?.arAgingByMco.map((mco, index) => (
                                <TableRow key={mco.mcoId} data-testid={`row-ar-mco-${index}`}>
                                  <TableCell className="font-medium">{mco.mcoName}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(mco.current)}</TableCell>
                                  <TableCell className="text-right">
                                    {mco.days30 > 0 && <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{formatCurrency(mco.days30)}</Badge>}
                                    {mco.days30 === 0 && '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {mco.days60 > 0 && <Badge variant="outline" className="bg-orange-100 text-orange-800">{formatCurrency(mco.days60)}</Badge>}
                                    {mco.days60 === 0 && '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {mco.days90 > 0 && <Badge variant="outline" className="bg-red-100 text-red-800">{formatCurrency(mco.days90)}</Badge>}
                                    {mco.days90 === 0 && '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {mco.over90 > 0 && <Badge variant="destructive">{formatCurrency(mco.over90)}</Badge>}
                                    {mco.over90 === 0 && '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-bold">{formatCurrency(mco.total)}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="profitability" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Profitability Analysis</h2>
                      <Button 
                        variant="outline" 
                        onClick={() => exportToExcel(reportData?.profitabilityByMco || [], 'Profitability', 'profitability_analysis')}
                        data-testid="button-export-profitability"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Profitability
                      </Button>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue vs Cost by MCO</CardTitle>
                        <CardDescription>Estimated profitability based on caregiver costs</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>MCO</TableHead>
                              <TableHead className="text-right">Revenue</TableHead>
                              <TableHead className="text-right">Est. Cost</TableHead>
                              <TableHead className="text-right">Margin</TableHead>
                              <TableHead className="text-right">Margin %</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData?.profitabilityByMco.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                  No profitability data available
                                </TableCell>
                              </TableRow>
                            ) : (
                              reportData?.profitabilityByMco.map((mco, index) => (
                                <TableRow key={mco.mcoId} data-testid={`row-profitability-${index}`}>
                                  <TableCell className="font-medium">{mco.mcoName}</TableCell>
                                  <TableCell className="text-right text-green-600">{formatCurrency(mco.revenue)}</TableCell>
                                  <TableCell className="text-right text-red-600">{formatCurrency(mco.estimatedCost)}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={mco.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                                      {formatCurrency(mco.margin)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={mco.marginPercent >= 20 ? 'default' : mco.marginPercent >= 0 ? 'secondary' : 'destructive'}>
                                      {mco.marginPercent.toFixed(1)}%
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Top Profitable MCOs</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {reportData?.profitabilityByMco
                              .filter(m => m.marginPercent > 0)
                              .sort((a, b) => b.marginPercent - a.marginPercent)
                              .slice(0, 5)
                              .map((mco, index) => (
                                <div key={mco.mcoId} className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg" data-testid={`row-top-profitable-${index}`}>
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">{mco.mcoName}</span>
                                  </div>
                                  <Badge className="bg-green-600">{mco.marginPercent.toFixed(1)}% margin</Badge>
                                </div>
                              ))}
                            {reportData?.profitabilityByMco.filter(m => m.marginPercent > 0).length === 0 && (
                              <p className="text-muted-foreground text-center py-4">No profitable MCOs found</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Claims by Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {reportData?.claimsByStatus.map((item, index) => (
                              <div key={item.status} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg" data-testid={`row-claims-status-${index}`}>
                                <div>
                                  <Badge variant={
                                    item.status === 'paid' ? 'default' :
                                    item.status === 'approved' ? 'secondary' :
                                    item.status === 'denied' ? 'destructive' : 'outline'
                                  }>
                                    {item.status}
                                  </Badge>
                                  <span className="ml-2 text-sm text-muted-foreground">{item.count} claims</span>
                                </div>
                                <span className="font-bold">{formatCurrency(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="charts" className="space-y-4">
                    <h2 className="text-2xl font-bold">Financial Charts</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Monthly Revenue Trend
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={reportData?.monthlyRevenue || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                                <Tooltip 
                                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                  labelFormatter={(label) => `Month: ${label}`}
                                />
                                <Bar dataKey="revenue" fill="#22c55e" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Revenue by MCO
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            {reportData?.revenueByMco.length === 0 ? (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                No data available
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                  <Pie
                                    data={reportData?.revenueByMco}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="revenue"
                                    nameKey="mcoName"
                                    label={({ mcoName, percent }) => `${mcoName}: ${(percent * 100).toFixed(0)}%`}
                                  >
                                    {reportData?.revenueByMco.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                  <Legend />
                                </RechartsPie>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="md:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            AR Aging Distribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            {totalArAmount === 0 ? (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                No outstanding receivables
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                  <Pie
                                    data={arAgingChartData.filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  >
                                    {arAgingChartData.filter(d => d.value > 0).map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                  <Legend />
                                </RechartsPie>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
