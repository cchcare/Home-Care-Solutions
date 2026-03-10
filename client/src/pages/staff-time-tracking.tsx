import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Clock, LogIn, LogOut, History, AlertTriangle, Calendar, ChevronDown,
  TrendingUp, Timer, Users, CheckCircle2, FileBarChart,
} from "lucide-react";
import { format, differenceInMinutes, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function calcWorkedMinutes(clockIn: string, clockOut: string | null, breakMinutes: number): number {
  if (!clockOut) return differenceInMinutes(new Date(), new Date(clockIn));
  return Math.max(0, differenceInMinutes(new Date(clockOut), new Date(clockIn)) - (breakMinutes || 0));
}

function calcWorkedHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export default function StaffTimeTracking() {
  const { toast } = useToast();
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [clockOutBreak, setClockOutBreak] = useState("0");
  const [clockInNotes, setClockInNotes] = useState("");
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [historyStart, setHistoryStart] = useState(
    format(subWeeks(new Date(), 4), "yyyy-MM-dd")
  );
  const [historyEnd, setHistoryEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [otStart, setOtStart] = useState(format(subWeeks(new Date(), 8), "yyyy-MM-dd"));
  const [otEnd, setOtEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [liveElapsed, setLiveElapsed] = useState(0);

  const { data: activeRecord, isLoading: activeLoading } = useQuery<any>({
    queryKey: ["/api/staff/time-records/active"],
    refetchInterval: 30000,
  });

  const { data: timeRecords = [], isLoading: recordsLoading } = useQuery<any[]>({
    queryKey: ["/api/staff/time-records", historyStart, historyEnd],
    queryFn: () =>
      fetch(`/api/staff/time-records?startDate=${historyStart}&endDate=${historyEnd}`, {
        credentials: "include",
      }).then((r) => r.json()),
  });

  const { data: otReport = [], isLoading: otLoading } = useQuery<any[]>({
    queryKey: ["/api/staff/ot-report", otStart, otEnd],
    queryFn: () =>
      fetch(`/api/staff/ot-report?startDate=${otStart}&endDate=${otEnd}`, {
        credentials: "include",
      }).then((r) => r.json()),
  });

  const clockInMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/staff/clock-in", { notes: clockInNotes }),
    onSuccess: () => {
      toast({ title: "Clocked In", description: "You are now clocked in." });
      setClockInNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clockOutMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/staff/clock-out", {
        notes: clockOutNotes,
        breakMinutes: parseInt(clockOutBreak) || 0,
      }),
    onSuccess: () => {
      toast({ title: "Clocked Out", description: "You have been clocked out successfully." });
      setClockOutOpen(false);
      setClockOutNotes("");
      setClockOutBreak("0");
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/ot-report"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isClockedIn = !!activeRecord;
  const elapsedMinutes = activeRecord
    ? calcWorkedMinutes(activeRecord.clockInTime, null, 0)
    : 0;

  const totalHoursThisWeek = timeRecords
    .filter((r) => {
      const d = new Date(r.clockInTime);
      const ws = startOfWeek(new Date());
      const we = endOfWeek(new Date());
      return d >= ws && d <= we;
    })
    .reduce((sum, r) => sum + calcWorkedHours(calcWorkedMinutes(r.clockInTime, r.clockOutTime, r.breakMinutes || 0)), 0);

  const otHoursThisWeek = Math.max(0, totalHoursThisWeek - 40);

  const totalRecordsShown = timeRecords.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Time Tracking</h1>
          <p className="text-muted-foreground mt-1">Track work hours, manage attendance, and monitor overtime</p>
        </div>
        <div className="flex items-center gap-3">
          {isClockedIn ? (
            <Badge variant="default" className="bg-green-500 text-white flex items-center gap-1 px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Clocked In
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
              <Clock className="w-3.5 h-3.5" />
              Off Clock
            </Badge>
          )}
        </div>
      </div>

      {/* Clock In/Out Status Card */}
      <Card className={isClockedIn ? "border-green-500 dark:border-green-600" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isClockedIn ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                <Clock className={`w-8 h-8 ${isClockedIn ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                {isClockedIn ? (
                  <>
                    <p className="text-sm text-muted-foreground">Clocked in since</p>
                    <p className="text-xl font-bold text-foreground">
                      {format(new Date(activeRecord.clockInTime), "h:mm a")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activeRecord.clockInTime), "EEEE, MMM d")} &bull; Elapsed: {formatDuration(elapsedMinutes)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-foreground">Not Clocked In</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(), "EEEE, MMMM d, yyyy")}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isClockedIn ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    placeholder="Optional note for this shift..."
                    value={clockInNotes}
                    onChange={(e) => setClockInNotes(e.target.value)}
                    className="h-16 text-sm resize-none w-64"
                  />
                  <Button
                    onClick={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                  </Button>
                </div>
              ) : (
                <Dialog open={clockOutOpen} onOpenChange={setClockOutOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="lg">
                      <LogOut className="w-5 h-5 mr-2" />
                      Clock Out
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Clock Out</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-muted rounded-lg p-4 text-sm">
                        <p className="font-medium">Session Summary</p>
                        <p className="text-muted-foreground">
                          Clocked in at {format(new Date(activeRecord.clockInTime), "h:mm a")} &bull; Elapsed: {formatDuration(elapsedMinutes)}
                        </p>
                      </div>
                      <div>
                        <Label>Break Time (minutes)</Label>
                        <Select value={clockOutBreak} onValueChange={setClockOutBreak}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No break</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Notes (optional)</Label>
                        <Textarea
                          placeholder="Any notes about this shift..."
                          value={clockOutNotes}
                          onChange={(e) => setClockOutNotes(e.target.value)}
                          className="mt-1 h-20 resize-none"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setClockOutOpen(false)}>Cancel</Button>
                        <Button
                          variant="destructive"
                          onClick={() => clockOutMutation.mutate()}
                          disabled={clockOutMutation.isPending}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {clockOutMutation.isPending ? "Processing..." : "Confirm Clock Out"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hours This Week</p>
              <p className="text-2xl font-bold text-foreground">{totalHoursThisWeek.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${otHoursThisWeek > 0 ? "bg-orange-100 dark:bg-orange-900" : "bg-muted"}`}>
              <AlertTriangle className={`w-5 h-5 ${otHoursThisWeek > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">OT This Week</p>
              <p className={`text-2xl font-bold ${otHoursThisWeek > 0 ? "text-orange-600 dark:text-orange-400" : "text-foreground"}`}>
                {otHoursThisWeek.toFixed(1)}h
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Records Shown</p>
              <p className="text-2xl font-bold text-foreground">{totalRecordsShown}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Work History
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule History
          </TabsTrigger>
          <TabsTrigger value="ot" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            OT Tracking
          </TabsTrigger>
        </TabsList>

        {/* Work History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Work History
              </CardTitle>
              <CardDescription>Your clock-in/out records and hours worked</CardDescription>
              <div className="flex gap-3 flex-wrap pt-2">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={historyStart}
                    onChange={(e) => setHistoryStart(e.target.value)}
                    className="w-40 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={historyEnd}
                    onChange={(e) => setHistoryEnd(e.target.value)}
                    className="w-40 mt-1"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">Loading records...</div>
              ) : timeRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <History className="w-8 h-8 opacity-30" />
                  <p>No time records found for this period</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeRecords.map((record: any) => {
                      const workedMins = calcWorkedMinutes(record.clockInTime, record.clockOutTime, record.breakMinutes || 0);
                      const workedHours = calcWorkedHours(workedMins);
                      const isActive = !record.clockOutTime;
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {format(new Date(record.clockInTime), "EEE, MMM d, yyyy")}
                          </TableCell>
                          <TableCell>{format(new Date(record.clockInTime), "h:mm a")}</TableCell>
                          <TableCell>
                            {record.clockOutTime
                              ? format(new Date(record.clockOutTime), "h:mm a")
                              : <span className="text-green-600 font-medium text-sm">Active</span>}
                          </TableCell>
                          <TableCell>{record.breakMinutes ? `${record.breakMinutes}m` : "—"}</TableCell>
                          <TableCell>
                            <span className={workedHours > 8 ? "text-orange-600 font-semibold" : "font-medium"}>
                              {workedHours.toFixed(2)}h
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-500 text-white" : ""}>
                              {isActive ? "Active" : "Completed"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-32 truncate">
                            {record.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule History Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule History
              </CardTitle>
              <CardDescription>Your assigned shifts and scheduled time records</CardDescription>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
              ) : timeRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <Calendar className="w-8 h-8 opacity-30" />
                  <p>No schedule records found for this period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const grouped: Record<string, any[]> = {};
                    timeRecords.forEach((r: any) => {
                      const week = format(startOfWeek(new Date(r.clockInTime)), "MMM d, yyyy");
                      if (!grouped[week]) grouped[week] = [];
                      grouped[week].push(r);
                    });
                    return Object.entries(grouped).map(([week, records]) => {
                      const totalHours = records.reduce((s, r) => s + calcWorkedHours(calcWorkedMinutes(r.clockInTime, r.clockOutTime, r.breakMinutes || 0)), 0);
                      return (
                        <div key={week} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted px-4 py-2 flex items-center justify-between">
                            <span className="font-semibold text-sm">Week of {week}</span>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground">{records.length} day(s)</span>
                              <span className={`font-medium ${totalHours > 40 ? "text-orange-600" : ""}`}>
                                {totalHours.toFixed(1)}h total
                              </span>
                              {totalHours > 40 && (
                                <Badge variant="outline" className="text-orange-600 border-orange-400 text-xs">
                                  OT: {(totalHours - 40).toFixed(1)}h
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="divide-y">
                            {records.map((r: any) => {
                              const mins = calcWorkedMinutes(r.clockInTime, r.clockOutTime, r.breakMinutes || 0);
                              return (
                                <div key={r.id} className="px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                                  <div>
                                    <p className="font-medium text-sm">
                                      {format(new Date(r.clockInTime), "EEEE, MMM d")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(r.clockInTime), "h:mm a")} –{" "}
                                      {r.clockOutTime ? format(new Date(r.clockOutTime), "h:mm a") : "Active"}
                                      {r.breakMinutes ? ` (${r.breakMinutes}m break)` : ""}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">{calcWorkedHours(mins).toFixed(2)}h</span>
                                    <Badge variant={!r.clockOutTime ? "default" : "secondary"} className={!r.clockOutTime ? "bg-green-500 text-white text-xs" : "text-xs"}>
                                      {!r.clockOutTime ? "Active" : "Done"}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OT Tracking Tab */}
        <TabsContent value="ot">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Overtime Tracking Report
              </CardTitle>
              <CardDescription>
                Weekly breakdown of regular vs. overtime hours (OT = hours over 40/week)
              </CardDescription>
              <div className="flex gap-3 flex-wrap pt-2">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={otStart}
                    onChange={(e) => setOtStart(e.target.value)}
                    className="w-40 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={otEnd}
                    onChange={(e) => setOtEnd(e.target.value)}
                    className="w-40 mt-1"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {otLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">Generating report...</div>
              ) : otReport.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <FileBarChart className="w-8 h-8 opacity-30" />
                  <p>No overtime data found for this period</p>
                  <p className="text-xs">Clock in and out to generate time data</p>
                </div>
              ) : (
                <>
                  {otReport.some((r: any) => r.otHours > 0) && (
                    <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-orange-700 dark:text-orange-300">
                        <span className="font-semibold">Overtime detected</span> — one or more weeks exceed 40 hours.
                        OT hours are highlighted below.
                      </div>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Week Starting</TableHead>
                        <TableHead>Days Worked</TableHead>
                        <TableHead>Regular Hours</TableHead>
                        <TableHead>OT Hours</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otReport.map((row: any, i: number) => (
                        <TableRow key={i} className={row.otHours > 0 ? "bg-orange-50 dark:bg-orange-950" : ""}>
                          <TableCell className="font-medium">{row.userName || "You"}</TableCell>
                          <TableCell>{format(new Date(row.weekStart + "T00:00:00"), "MMM d, yyyy")}</TableCell>
                          <TableCell>{row.days?.length ?? 0}</TableCell>
                          <TableCell>{row.regularHours.toFixed(2)}h</TableCell>
                          <TableCell>
                            {row.otHours > 0 ? (
                              <span className="font-bold text-orange-600 dark:text-orange-400">
                                {row.otHours.toFixed(2)}h
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0.00h</span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">{row.totalHours.toFixed(2)}h</TableCell>
                          <TableCell>
                            {row.otHours > 0 ? (
                              <Badge variant="outline" className="text-orange-600 border-orange-400">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Overtime
                              </Badge>
                            ) : row.totalHours >= 40 ? (
                              <Badge variant="secondary">Full Week</Badge>
                            ) : (
                              <Badge variant="secondary">Regular</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Total Regular Hours</p>
                        <p className="text-xl font-bold">
                          {otReport.reduce((s: number, r: any) => s + r.regularHours, 0).toFixed(1)}h
                        </p>
                      </CardContent>
                    </Card>
                    <Card className={otReport.some((r: any) => r.otHours > 0) ? "bg-orange-50 dark:bg-orange-950" : "bg-muted/30"}>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Total OT Hours</p>
                        <p className={`text-xl font-bold ${otReport.some((r: any) => r.otHours > 0) ? "text-orange-600 dark:text-orange-400" : ""}`}>
                          {otReport.reduce((s: number, r: any) => s + r.otHours, 0).toFixed(1)}h
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Total Hours (Period)</p>
                        <p className="text-xl font-bold">
                          {otReport.reduce((s: number, r: any) => s + r.totalHours, 0).toFixed(1)}h
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
