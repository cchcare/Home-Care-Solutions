import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { OfficeSelector } from "@/components/office-selector";
import { useOffice } from "@/context/office-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Calendar,
  Clock,
  Users,
  UserCheck,
  RefreshCw
} from "lucide-react";
import { format, subDays } from "date-fns";

interface OverlapShift {
  id: string;
  clientId?: string;
  clientName?: string;
  caregiverId?: string;
  caregiverName?: string;
  startTime: string;
  endTime: string;
  effectiveStart: string;
  effectiveEnd: string;
}

interface OverlapDetail {
  caregiverId?: string;
  caregiverName?: string;
  clientId?: string;
  clientName?: string;
  date: string;
  shift1: OverlapShift;
  shift2: OverlapShift;
  overlapDurationMinutes: number;
  overlapDurationFormatted: string;
}

interface GroupedOverlaps {
  name: string;
  overlaps: OverlapDetail[];
}

interface ScheduleOverlapReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalCaregiverOverlaps: number;
    totalClientOverlaps: number;
    caregiversAffected: number;
    clientsAffected: number;
    totalOverlapMinutes: number;
  };
  caregiverOverlaps: GroupedOverlaps[];
  clientOverlaps: GroupedOverlaps[];
  rawCaregiverOverlaps: OverlapDetail[];
  rawClientOverlaps: OverlapDetail[];
}

export default function ScheduleOverlapReport() {
  const { selectedOfficeId, setSelectedOfficeId } = useOffice();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const queryParams = new URLSearchParams();
  queryParams.set('startDate', startDate);
  queryParams.set('endDate', endDate);
  if (selectedOfficeId !== "all") {
    queryParams.set('officeId', selectedOfficeId);
  }

  const { data, isLoading, refetch, isFetching } = useQuery<ScheduleOverlapReport>({
    queryKey: ['/api/reports/schedule-overlaps', startDate, endDate, selectedOfficeId],
    queryFn: () => fetch(`/api/reports/schedule-overlaps?${queryParams.toString()}`, { 
      credentials: "include" 
    }).then(r => r.json()),
  });

  const formatTotalTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="page-title">
                  Schedule Overlap Report
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Identify overlapping shifts for caregivers and clients
                </p>
              </div>
              <div className="flex items-center gap-4">
                <OfficeSelector 
                  selectedOfficeId={selectedOfficeId}
                  onOfficeChange={setSelectedOfficeId}
                  showAllOption={true}
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Date Range Filter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
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
                      className="w-40"
                      data-testid="input-end-date"
                    />
                  </div>
                  <Button 
                    onClick={() => refetch()} 
                    disabled={isFetching}
                    data-testid="button-refresh"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
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
            ) : data ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Total Overlaps
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold" data-testid="stat-total-overlaps">
                        {data.summary.totalCaregiverOverlaps + data.summary.totalClientOverlaps}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-blue-500" />
                        Caregivers Affected
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold" data-testid="stat-caregivers-affected">
                        {data.summary.caregiversAffected}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-500" />
                        Clients Affected
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold" data-testid="stat-clients-affected">
                        {data.summary.clientsAffected}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-500" />
                        Total Overlap Time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold" data-testid="stat-total-time">
                        {formatTotalTime(data.summary.totalOverlapMinutes)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="caregivers" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="caregivers" data-testid="tab-caregivers">
                      Caregiver Overlaps ({data.summary.totalCaregiverOverlaps})
                    </TabsTrigger>
                    <TabsTrigger value="clients" data-testid="tab-clients">
                      Client Overlaps ({data.summary.totalClientOverlaps})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="caregivers">
                    {data.caregiverOverlaps.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            No Caregiver Overlaps Found
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mt-2">
                            No caregivers have overlapping shifts with different clients in the selected date range.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {data.caregiverOverlaps.map((group) => (
                          <Card key={group.overlaps[0]?.caregiverId} data-testid={`card-caregiver-${group.overlaps[0]?.caregiverId}`}>
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <span>{group.name}</span>
                                <Badge variant="destructive">
                                  {group.overlaps.length} overlap{group.overlaps.length !== 1 ? 's' : ''}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Shift 1 (Client)</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Shift 2 (Client)</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Overlap</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.overlaps.map((overlap, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{format(new Date(overlap.date), 'MMM d, yyyy')}</TableCell>
                                      <TableCell>{overlap.shift1.clientName}</TableCell>
                                      <TableCell>
                                        {overlap.shift1.effectiveStart} - {overlap.shift1.effectiveEnd}
                                      </TableCell>
                                      <TableCell>{overlap.shift2.clientName}</TableCell>
                                      <TableCell>
                                        {overlap.shift2.effectiveStart} - {overlap.shift2.effectiveEnd}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                                          {overlap.overlapDurationFormatted}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="clients">
                    {data.clientOverlaps.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            No Client Overlaps Found
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mt-2">
                            No clients have overlapping visits from different caregivers in the selected date range.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {data.clientOverlaps.map((group) => (
                          <Card key={group.overlaps[0]?.clientId} data-testid={`card-client-${group.overlaps[0]?.clientId}`}>
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <span>{group.name}</span>
                                <Badge variant="destructive">
                                  {group.overlaps.length} overlap{group.overlaps.length !== 1 ? 's' : ''}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Shift 1 (Caregiver)</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Shift 2 (Caregiver)</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Overlap</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.overlaps.map((overlap, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{format(new Date(overlap.date), 'MMM d, yyyy')}</TableCell>
                                      <TableCell>{overlap.shift1.caregiverName}</TableCell>
                                      <TableCell>
                                        {overlap.shift1.effectiveStart} - {overlap.shift1.effectiveEnd}
                                      </TableCell>
                                      <TableCell>{overlap.shift2.caregiverName}</TableCell>
                                      <TableCell>
                                        {overlap.shift2.effectiveStart} - {overlap.shift2.effectiveEnd}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                                          {overlap.overlapDurationFormatted}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
