import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Users, 
  UserCheck, 
  AlertTriangle, 
  Calendar,
  GraduationCap,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  FileText,
  Eye
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("30");
  const [selectedOffice, setSelectedOffice] = useState("all");

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: caregivers = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers"],
  });

  const { data: incidents = [] } = useQuery<any[]>({
    queryKey: ["/api/incident-reports"],
  });

  const { data: offices = [] } = useQuery<any[]>({
    queryKey: ["/api/offices"],
  });

  const { data: trainings = [] } = useQuery<any[]>({
    queryKey: ["/api/trainings"],
  });

  const { data: trainingRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/training-records"],
  });

  const { data: certifications = [] } = useQuery<any[]>({
    queryKey: ["/api/certifications"],
  });

  // Helper function to filter data by date range
  const filterByDateRange = (data: any[], dateField: string) => {
    const days = parseInt(dateRange);
    const cutoffDate = subDays(new Date(), days);
    return data.filter(item => new Date(item[dateField]) >= cutoffDate);
  };

  // Helper function to filter by office
  const filterByOffice = (data: any[]) => {
    if (selectedOffice === "all") return data;
    return data.filter(item => item.officeId === selectedOffice || item.primaryOfficeId === selectedOffice);
  };

  // Client Census Report Data
  const getClientCensusData = () => {
    const filteredClients = filterByOffice(clients);
    const activeClients = filteredClients.filter(c => c.status === "active");
    const inactiveClients = filteredClients.filter(c => c.status === "inactive");
    const newClients = filterByDateRange(filteredClients, "createdAt");

    return {
      total: filteredClients.length,
      active: activeClients.length,
      inactive: inactiveClients.length,
      newThisPeriod: newClients.length,
      byServiceType: filteredClients.reduce((acc: any, client) => {
        const type = client.serviceType || "Unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      byOffice: offices.map(office => ({
        name: office.name,
        count: filteredClients.filter(c => c.officeId === office.id).length
      }))
    };
  };

  // Caregiver Credential Compliance Data
  const getCaregiverComplianceData = () => {
    const filteredCaregivers = filterByOffice(caregivers);
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const caregiverCerts = filteredCaregivers.map(caregiver => {
      const certs = certifications.filter(c => c.caregiverId === caregiver.id);
      const expiredCerts = certs.filter(c => new Date(c.expirationDate) < now);
      const expiringSoon = certs.filter(c => 
        new Date(c.expirationDate) >= now && 
        new Date(c.expirationDate) <= thirtyDaysFromNow
      );
      const validCerts = certs.filter(c => new Date(c.expirationDate) > thirtyDaysFromNow);

      return {
        ...caregiver,
        totalCerts: certs.length,
        expiredCerts: expiredCerts.length,
        expiringSoon: expiringSoon.length,
        validCerts: validCerts.length,
        complianceStatus: expiredCerts.length > 0 ? "non-compliant" : 
                         expiringSoon.length > 0 ? "warning" : "compliant"
      };
    });

    return {
      total: filteredCaregivers.length,
      compliant: caregiverCerts.filter(c => c.complianceStatus === "compliant").length,
      warning: caregiverCerts.filter(c => c.complianceStatus === "warning").length,
      nonCompliant: caregiverCerts.filter(c => c.complianceStatus === "non-compliant").length,
      caregivers: caregiverCerts
    };
  };

  // Incident Trends Data
  const getIncidentTrendsData = () => {
    const filteredIncidents = filterByDateRange(filterByOffice(incidents), "createdAt");
    
    const bySeverity = filteredIncidents.reduce((acc: any, incident) => {
      const severity = incident.severity || "Unknown";
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});

    const byType = filteredIncidents.reduce((acc: any, incident) => {
      const type = incident.incidentType || "Unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const byStatus = filteredIncidents.reduce((acc: any, incident) => {
      const status = incident.status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: filteredIncidents.length,
      bySeverity,
      byType,
      byStatus,
      recentIncidents: filteredIncidents.slice(0, 10)
    };
  };

  // Caregiver Hire Report Data
  const getCaregiverHireData = () => {
    const filteredCaregivers = filterByOffice(caregivers);
    const newHires = filterByDateRange(filteredCaregivers, "hireDate");
    
    const byMonth = newHires.reduce((acc: any, caregiver) => {
      const month = format(new Date(caregiver.hireDate), "MMM yyyy");
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const activeHires = filteredCaregivers.filter(c => c.status === "active");
    const inactiveHires = filteredCaregivers.filter(c => c.status === "inactive");

    return {
      totalHires: filteredCaregivers.length,
      newHires: newHires.length,
      activeHires: activeHires.length,
      inactiveHires: inactiveHires.length,
      byMonth,
      recentHires: newHires.slice(0, 10)
    };
  };

  // Staff Training Report Data
  const getTrainingData = () => {
    const filteredRecords = filterByDateRange(trainingRecords, "completedAt");
    
    const completedTrainings = filteredRecords.filter(r => r.status === "completed");
    const inProgressTrainings = filteredRecords.filter(r => r.status === "in_progress");
    const notStartedTrainings = filteredRecords.filter(r => r.status === "not_started");

    const byTraining = completedTrainings.reduce((acc: any, record) => {
      const training = trainings.find(t => t.id === record.trainingId);
      const name = training?.title || "Unknown";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    return {
      totalRecords: filteredRecords.length,
      completed: completedTrainings.length,
      inProgress: inProgressTrainings.length,
      notStarted: notStartedTrainings.length,
      byTraining,
      recentCompletions: completedTrainings.slice(0, 10)
    };
  };

  const clientCensus = getClientCensusData();
  const caregiverCompliance = getCaregiverComplianceData();
  const incidentTrends = getIncidentTrendsData();
  const caregiverHires = getCaregiverHireData();
  const trainingData = getTrainingData();

  const exportToCSV = (data: any[], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(data[0]).join(",") + "\n"
      + data.map(row => Object.values(row).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Analytics & Reports"
          subtitle="Generate comprehensive reports and analytics"
        />
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive reporting and analytics for your care agency
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Office</label>
              <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                <SelectTrigger data-testid="select-office-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  {offices.map((office: any) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="client-census" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="client-census" data-testid="tab-client-census">Client Census</TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
          <TabsTrigger value="incidents" data-testid="tab-incidents">Incidents</TabsTrigger>
          <TabsTrigger value="hires" data-testid="tab-hires">Hires</TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training">Training</TabsTrigger>
        </TabsList>

        {/* Client Census Report */}
        <TabsContent value="client-census" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Client Census Report</h2>
            <Button 
              onClick={() => exportToCSV(clients, "client-census")}
              className="flex items-center gap-2"
              data-testid="button-export-client-census"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientCensus.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{clientCensus.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Inactive Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{clientCensus.inactive}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New This Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{clientCensus.newThisPeriod}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Clients by Service Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(clientCensus.byServiceType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span>{type}</span>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clients by Office</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {clientCensus.byOffice.map((office: any) => (
                    <div key={office.name} className="flex justify-between items-center">
                      <span>{office.name}</span>
                      <Badge variant="outline">{office.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Caregiver Credential Compliance Report */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Caregiver Credential Compliance</h2>
            <Button 
              onClick={() => exportToCSV(caregiverCompliance.caregivers, "compliance-report")}
              className="flex items-center gap-2"
              data-testid="button-export-compliance"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Caregivers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{caregiverCompliance.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Compliant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{caregiverCompliance.compliant}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{caregiverCompliance.warning}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{caregiverCompliance.nonCompliant}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Caregiver Compliance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {caregiverCompliance.caregivers.slice(0, 10).map((caregiver: any) => (
                  <div key={caregiver.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{caregiver.firstName} {caregiver.lastName}</p>
                      <p className="text-sm text-muted-foreground">
                        {caregiver.totalCerts} certifications • {caregiver.validCerts} valid • {caregiver.expiringSoon} expiring • {caregiver.expiredCerts} expired
                      </p>
                    </div>
                    <Badge variant={
                      caregiver.complianceStatus === "compliant" ? "default" :
                      caregiver.complianceStatus === "warning" ? "secondary" : "destructive"
                    }>
                      {caregiver.complianceStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incident Trends Report */}
        <TabsContent value="incidents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Incident Trends</h2>
            <Button 
              onClick={() => exportToCSV(incidents, "incident-trends")}
              className="flex items-center gap-2"
              data-testid="button-export-incidents"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{incidentTrends.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{incidentTrends.bySeverity.high || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Medium Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{incidentTrends.bySeverity.medium || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Low Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{incidentTrends.bySeverity.low || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>By Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(incidentTrends.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span>{type}</span>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(incidentTrends.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span>{status}</span>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {incidentTrends.recentIncidents.map((incident: any) => (
                    <div key={incident.id} className="text-sm">
                      <p className="font-medium">{incident.incidentType}</p>
                      <p className="text-muted-foreground">{format(new Date(incident.createdAt), "MMM d, yyyy")}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Caregiver Hire Report */}
        <TabsContent value="hires" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Caregiver Hire Report</h2>
            <Button 
              onClick={() => exportToCSV(caregivers, "caregiver-hires")}
              className="flex items-center gap-2"
              data-testid="button-export-hires"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Hires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{caregiverHires.totalHires}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New Hires This Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{caregiverHires.newHires}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Caregivers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{caregiverHires.activeHires}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Inactive Caregivers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{caregiverHires.inactiveHires}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Hires by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(caregiverHires.byMonth).map(([month, count]) => (
                    <div key={month} className="flex justify-between items-center">
                      <span>{month}</span>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Hires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {caregiverHires.recentHires.map((hire: any) => (
                    <div key={hire.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{hire.firstName} {hire.lastName}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(hire.hireDate), "MMM d, yyyy")}</p>
                      </div>
                      <Badge variant={hire.status === "active" ? "default" : "secondary"}>
                        {hire.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Staff Training Report */}
        <TabsContent value="training" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Staff Training Report</h2>
            <Button 
              onClick={() => exportToCSV(trainingRecords, "training-report")}
              className="flex items-center gap-2"
              data-testid="button-export-training"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trainingData.totalRecords}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{trainingData.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{trainingData.inProgress}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Not Started</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{trainingData.notStarted}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Completions by Training</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(trainingData.byTraining).map(([training, count]) => (
                    <div key={training} className="flex justify-between items-center">
                      <span className="truncate">{training}</span>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Completions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {trainingData.recentCompletions.map((record: any) => {
                    const training = trainings.find(t => t.id === record.trainingId);
                    return (
                      <div key={record.id} className="text-sm">
                        <p className="font-medium">{training?.title || "Unknown Training"}</p>
                        <p className="text-muted-foreground">
                          Completed {format(new Date(record.completedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}