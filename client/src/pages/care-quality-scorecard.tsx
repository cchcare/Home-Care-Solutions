import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { OfficeSelector } from "@/components/office-selector";
import { useOffice } from "@/context/office-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  CheckCircle,
  Clock,
  Star,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  Filter,
  Users,
  FileWarning,
  Download,
} from "lucide-react";

interface CareQualityMetrics {
  summary: {
    visitCompletionRate: number;
    evvComplianceRate: number;
    avgSatisfactionScore: number;
    punctualityRate: number;
    totalScheduled: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  visitStatusBreakdown: {
    completed: number;
    cancelled: number;
    noShow: number;
    scheduled: number;
    inProgress: number;
  };
  monthlyTrends: Array<{
    month: string;
    completionRate: number;
    evvRate: number;
    totalVisits: number;
  }>;
  metricsByOffice: Array<{
    officeId: string;
    officeName: string;
    visitCompletionRate: number;
    evvComplianceRate: number;
    totalVisits: number;
  }>;
  topPerformers: Array<{
    caregiverId: string;
    caregiverName: string;
    totalVisits: number;
    completedVisits: number;
    completionRate: number;
  }>;
  clientsNeedingAttention: Array<{
    clientId: string;
    clientName: string;
    totalVisits: number;
    missedVisits: number;
    avgSatisfaction: number | null;
    needsAttention: boolean;
  }>;
  recentIncidents: Array<{
    id: string;
    incidentDate: string;
    incidentType: string;
    severity: string;
    status: string;
    entityType: string;
  }>;
}

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"];

export default function CareQualityScorecard() {
  const { selectedOfficeId, setSelectedOfficeId } = useOffice();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 180), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedCaregiverId, setSelectedCaregiverId] = useState("all");

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedOfficeId && selectedOfficeId !== "all") {
      params.append("officeId", selectedOfficeId);
    }
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (selectedCaregiverId && selectedCaregiverId !== "all") {
      params.append("caregiverId", selectedCaregiverId);
    }
    return params.toString();
  };

  const { data: metrics, isLoading: metricsLoading } = useQuery<CareQualityMetrics>({
    queryKey: ["/api/admin/care-quality-metrics", selectedOfficeId, startDate, endDate, selectedCaregiverId],
    queryFn: () => fetch(`/api/admin/care-quality-metrics?${buildQueryParams()}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: caregivers = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", selectedOfficeId],
    queryFn: () => {
      const params = selectedOfficeId && selectedOfficeId !== "all" ? `?officeId=${selectedOfficeId}` : "";
      return fetch(`/api/caregivers${params}`, { credentials: "include" }).then(r => r.json());
    },
  });

  const pieData = metrics?.visitStatusBreakdown
    ? [
        { name: "Completed", value: metrics.visitStatusBreakdown.completed },
        { name: "Cancelled", value: metrics.visitStatusBreakdown.cancelled },
        { name: "No Show", value: metrics.visitStatusBreakdown.noShow },
        { name: "Scheduled", value: metrics.visitStatusBreakdown.scheduled },
        { name: "In Progress", value: metrics.visitStatusBreakdown.inProgress },
      ].filter(item => item.value > 0)
    : [];

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return <Badge variant="destructive" data-testid={`badge-severity-${severity}`}>Critical</Badge>;
      case "high":
        return <Badge variant="destructive" data-testid={`badge-severity-${severity}`}>High</Badge>;
      case "medium":
        return <Badge variant="secondary" data-testid={`badge-severity-${severity}`}>Medium</Badge>;
      case "low":
        return <Badge variant="outline" data-testid={`badge-severity-${severity}`}>Low</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-severity-${severity}`}>{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return <Badge variant="destructive" data-testid={`badge-status-${status}`}>Open</Badge>;
      case "under_investigation":
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Investigating</Badge>;
      case "resolved":
        return <Badge variant="default" data-testid={`badge-status-${status}`}>Resolved</Badge>;
      case "closed":
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>Closed</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Care Quality Scorecard"
          subtitle="Monitor and analyze care quality metrics"
        />
        
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="office-filter">Office</Label>
                    <OfficeSelector
                      selectedOfficeId={selectedOfficeId === "all" ? undefined : selectedOfficeId}
                      onOfficeChange={setSelectedOfficeId}
                      showAllOption={true}
                      data-testid="select-office-filter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      data-testid="input-end-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caregiver-filter">Caregiver</Label>
                    <Select 
                      value={selectedCaregiverId} 
                      onValueChange={setSelectedCaregiverId}
                    >
                      <SelectTrigger data-testid="select-caregiver-filter">
                        <SelectValue placeholder="All Caregivers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Caregivers</SelectItem>
                        {caregivers.map((cg: any) => (
                          <SelectItem key={cg.id} value={cg.id}>
                            {cg.firstName} {cg.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {metricsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card data-testid="card-visit-completion">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Visit Completion Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {metrics?.summary.visitCompletionRate ?? 0}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metrics?.summary.completed ?? 0} of {metrics?.summary.totalScheduled ?? 0} visits
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-evv-compliance">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      EVV Compliance Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {metrics?.summary.evvComplianceRate ?? 0}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Proper clock-in/out verification
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-satisfaction-score">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Avg. Satisfaction Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600">
                      {metrics?.summary.avgSatisfactionScore ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Out of 5 stars
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-punctuality-rate">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-purple-500" />
                      Punctuality Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      {metrics?.summary.punctualityRate ?? 0}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      On-time arrivals (within 15 min)
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-monthly-trends">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Visit Completion Trend (6 Months)
                  </CardTitle>
                  <CardDescription>Monthly completion and EVV compliance rates</CardDescription>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={metrics?.monthlyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="completionRate"
                          stroke="#22c55e"
                          strokeWidth={2}
                          name="Completion Rate (%)"
                        />
                        <Line
                          type="monotone"
                          dataKey="evvRate"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="EVV Compliance (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-visit-status">
                <CardHeader>
                  <CardTitle>Visit Status Breakdown</CardTitle>
                  <CardDescription>Distribution of visit outcomes</CardDescription>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : pieData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No visit data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-office-comparison">
              <CardHeader>
                <CardTitle>Metrics by Office</CardTitle>
                <CardDescription>Compare performance across offices</CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : !metrics?.metricsByOffice?.length ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No office data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.metricsByOffice}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="officeName" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="visitCompletionRate" fill="#22c55e" name="Completion Rate (%)" />
                      <Bar dataKey="evvComplianceRate" fill="#3b82f6" name="EVV Compliance (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="top-performers" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="top-performers" data-testid="tab-top-performers">
                  <Users className="h-4 w-4 mr-2" />
                  Top Performers
                </TabsTrigger>
                <TabsTrigger value="attention-needed" data-testid="tab-attention-needed">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Needs Attention
                </TabsTrigger>
                <TabsTrigger value="incidents" data-testid="tab-incidents">
                  <FileWarning className="h-4 w-4 mr-2" />
                  Incidents
                </TabsTrigger>
              </TabsList>

              <TabsContent value="top-performers">
                <Card data-testid="card-top-performers">
                  <CardHeader>
                    <CardTitle>Top Performing Caregivers</CardTitle>
                    <CardDescription>Caregivers with highest completion rates (minimum 5 visits)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {metricsLoading ? (
                      <Skeleton className="h-[200px] w-full" />
                    ) : !metrics?.topPerformers?.length ? (
                      <div className="py-8 text-center text-muted-foreground">
                        No caregiver data available
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Caregiver</TableHead>
                            <TableHead className="text-right">Total Visits</TableHead>
                            <TableHead className="text-right">Completed</TableHead>
                            <TableHead className="text-right">Completion Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metrics.topPerformers.map((cg, index) => (
                            <TableRow key={cg.caregiverId} data-testid={`row-caregiver-${cg.caregiverId}`}>
                              <TableCell className="font-medium">
                                {index < 3 && <span className="mr-2">🏆</span>}
                                {cg.caregiverName || "Unknown"}
                              </TableCell>
                              <TableCell className="text-right">{cg.totalVisits}</TableCell>
                              <TableCell className="text-right">{cg.completedVisits}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={cg.completionRate >= 90 ? "default" : "secondary"}>
                                  {cg.completionRate.toFixed(1)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attention-needed">
                <Card data-testid="card-clients-attention">
                  <CardHeader>
                    <CardTitle>Clients Needing Attention</CardTitle>
                    <CardDescription>Clients with low satisfaction or missed visits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {metricsLoading ? (
                      <Skeleton className="h-[200px] w-full" />
                    ) : !metrics?.clientsNeedingAttention?.length ? (
                      <div className="py-8 text-center text-muted-foreground">
                        All clients are in good standing
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead className="text-right">Total Visits</TableHead>
                            <TableHead className="text-right">Missed Visits</TableHead>
                            <TableHead className="text-right">Satisfaction</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metrics.clientsNeedingAttention.map((cl) => (
                            <TableRow key={cl.clientId} data-testid={`row-client-${cl.clientId}`}>
                              <TableCell className="font-medium">
                                <span className="mr-2">⚠️</span>
                                {cl.clientName}
                              </TableCell>
                              <TableCell className="text-right">{cl.totalVisits}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={cl.missedVisits > 3 ? "destructive" : "secondary"}>
                                  {cl.missedVisits}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {cl.avgSatisfaction !== null ? (
                                  <span className={cl.avgSatisfaction < 3 ? "text-red-500" : ""}>
                                    {cl.avgSatisfaction.toFixed(1)} / 5
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="incidents">
                <Card data-testid="card-recent-incidents">
                  <CardHeader>
                    <CardTitle>Recent Incidents</CardTitle>
                    <CardDescription>Summary of recent incident reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {metricsLoading ? (
                      <Skeleton className="h-[200px] w-full" />
                    ) : !metrics?.recentIncidents?.length ? (
                      <div className="py-8 text-center text-muted-foreground">
                        No incidents in selected period
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metrics.recentIncidents.map((incident) => (
                            <TableRow key={incident.id} data-testid={`row-incident-${incident.id}`}>
                              <TableCell>
                                {incident.incidentDate
                                  ? format(new Date(incident.incidentDate), "MMM d, yyyy")
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {incident.incidentType?.replace(/_/g, " ") || "Unknown"}
                              </TableCell>
                              <TableCell className="capitalize">{incident.entityType}</TableCell>
                              <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                              <TableCell>{getStatusBadge(incident.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
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
