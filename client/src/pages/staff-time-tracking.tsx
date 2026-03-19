import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Clock, LogIn, LogOut, History, AlertTriangle, Calendar, TrendingUp,
  CheckCircle2, FileBarChart, MapPin, Shield, Users, Edit, Lock,
  Download, Flag, RefreshCw, Activity, Info, Eye,
} from "lucide-react";
import {
  format, differenceInMinutes, startOfWeek, subWeeks,
} from "date-fns";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(minutes: number) {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return `${h}h ${m}m`;
}

function workedMins(clockIn: string, clockOut: string | null, breakMin: number) {
  if (!clockOut) return differenceInMinutes(new Date(), new Date(clockIn));
  return Math.max(0, differenceInMinutes(new Date(clockOut), new Date(clockIn)) - (breakMin || 0));
}

function workedHrs(min: number) {
  return Math.round((min / 60) * 100) / 100;
}

function isManager(role: string) {
  return ["super_admin", "admin", "office_admin", "supervisor", "manager"].includes(role);
}

// ─── GPS Hook ────────────────────────────────────────────────────────────────

function useGPS() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    setLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported by this browser");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setGpsError(`GPS unavailable: ${err.message}`);
        setLoading(false);
      },
      { timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return { coords, gpsError, loading, getLocation };
}

// ─── Export Helpers ───────────────────────────────────────────────────────────

function exportToCSV(records: any[], filename: string) {
  const headers = ["Employee", "Date", "Clock In", "Clock In Address", "Clock Out", "Clock Out Address", "Break (min)", "Hours Worked", "Status", "Flagged", "GPS In", "IP Address", "Edited", "Edit Reason"];
  const rows = records.map((r: any) => {
    const mins = workedMins(r.clockInTime, r.clockOutTime, r.breakMinutes || 0);
    return [
      `${r.userName || ""} ${r.userLastName || ""}`.trim(),
      format(new Date(r.clockInTime), "MM/dd/yyyy"),
      format(new Date(r.clockInTime), "h:mm a"),
      r.clockInAddress || "",
      r.clockOutTime ? format(new Date(r.clockOutTime), "h:mm a") : "Active",
      r.clockOutAddress || "",
      r.breakMinutes || 0,
      workedHrs(mins).toFixed(2),
      r.status,
      r.isFlagged ? "Yes" : "No",
      r.clockInLatitude ? `${r.clockInLatitude},${r.clockInLongitude}` : "",
      r.clockInIpAddress || "",
      r.isEdited ? "Yes" : "No",
      r.editReason || "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaffTimeTracking() {
  const { toast } = useToast();
  const { user } = useAuth();
  const managerView = user ? isManager(user.role) : false;

  const [clockOutNotes, setClockOutNotes] = useState("");
  const [clockOutBreak, setClockOutBreak] = useState("0");
  const [clockInNotes, setClockInNotes] = useState("");
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ clockInTime: "", clockOutTime: "", breakMinutes: "0", notes: "", editReason: "" });
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagRecord, setFlagRecord] = useState<any | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [photoReviewRecord, setPhotoReviewRecord] = useState<any | null>(null);
  const [photoReviewOpen, setPhotoReviewOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockRange, setLockRange] = useState({ start: format(subWeeks(new Date(), 2), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") });
  const [historyStart, setHistoryStart] = useState(format(subWeeks(new Date(), 4), "yyyy-MM-dd"));
  const [historyEnd, setHistoryEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [otStart, setOtStart] = useState(format(subWeeks(new Date(), 8), "yyyy-MM-dd"));
  const [otEnd, setOtEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [elapsed, setElapsed] = useState(0);

  const inGps = useGPS();
  const outGps = useGPS();

  // Live elapsed timer
  const { data: activeRecord } = useQuery<any>({
    queryKey: ["/api/staff/time-records/active"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!activeRecord) { setElapsed(0); return; }
    const tick = () => setElapsed(workedMins(activeRecord.clockInTime, null, 0));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [activeRecord]);

  const { data: timeRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/staff/time-records", historyStart, historyEnd],
    queryFn: () =>
      fetch(`/api/staff/time-records?startDate=${historyStart}&endDate=${historyEnd}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: liveDashboard = [], refetch: refetchLive } = useQuery<any[]>({
    queryKey: ["/api/staff/live-dashboard"],
    enabled: managerView,
    refetchInterval: 60000,
  });

  const { data: otReport = [] } = useQuery<any[]>({
    queryKey: ["/api/staff/ot-report", otStart, otEnd],
    queryFn: () =>
      fetch(`/api/staff/ot-report?startDate=${otStart}&endDate=${otEnd}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/staff/audit-logs"],
    enabled: managerView,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const clockInMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/staff/clock-in", {
      notes: clockInNotes,
      latitude: inGps.coords?.lat,
      longitude: inGps.coords?.lng,
    }),
    onSuccess: (record: any) => {
      if (record?.isFlagged) {
        toast({ title: "Clocked In — Location Warning", description: record.flagReason || "You are outside the 500ft office boundary. Your manager will review this punch.", variant: "destructive" });
      } else {
        toast({ title: "Clocked In", description: "You are now clocked in." });
      }
      setClockInNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/live-dashboard"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clockOutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/staff/clock-out", {
      breakMinutes: parseInt(clockOutBreak) || 0,
      notes: clockOutNotes,
      latitude: outGps.coords?.lat,
      longitude: outGps.coords?.lng,
    }),
    onSuccess: () => {
      toast({ title: "Clocked Out", description: "Session recorded successfully." });
      setClockOutOpen(false);
      setClockOutNotes("");
      setClockOutBreak("0");
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/live-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/ot-report"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/staff/time-records/${editRecord?.id}`, editForm),
    onSuccess: () => {
      toast({ title: "Record Updated", description: "Time record edited and audit logged." });
      setEditOpen(false);
      setEditRecord(null);
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/audit-logs"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/staff/time-records/${id}/approve`, {}),
    onSuccess: () => {
      toast({ title: "Approved", description: "Record approved successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const flagMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/staff/time-records/${flagRecord?.id}/flag`, { reason: flagReason }),
    onSuccess: () => {
      toast({ title: "Flagged", description: "Record flagged for review." });
      setFlagOpen(false);
      setFlagRecord(null);
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/audit-logs"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const lockMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/staff/time-records/lock-payroll", { startDate: lockRange.start, endDate: lockRange.end }),
    onSuccess: (data: any) => {
      toast({ title: "Records Locked", description: data.message });
      setLockOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/staff/time-records"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Computed stats ───────────────────────────────────────────────────────────

  const isClockedIn = !!activeRecord;
  const hoursThisWeek = timeRecords
    .filter(r => new Date(r.clockInTime) >= startOfWeek(new Date()))
    .reduce((s, r) => s + workedHrs(workedMins(r.clockInTime, r.clockOutTime, r.breakMinutes || 0)), 0);
  const otThisWeek = Math.max(0, hoursThisWeek - 40);
  const flaggedCount = (timeRecords as any[]).filter((r: any) => r.isFlagged).length;

  function openEdit(r: any) {
    setEditRecord(r);
    setEditForm({
      clockInTime: r.clockInTime ? format(new Date(r.clockInTime), "yyyy-MM-dd'T'HH:mm") : "",
      clockOutTime: r.clockOutTime ? format(new Date(r.clockOutTime), "yyyy-MM-dd'T'HH:mm") : "",
      breakMinutes: String(r.breakMinutes || 0),
      notes: r.notes || "",
      editReason: "",
    });
    setEditOpen(true);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Time Tracking</h1>
          <p className="text-muted-foreground mt-1">Strict clock-in/out with GPS, audit logs, and overtime tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {isClockedIn ? (
            <Badge className="bg-green-500 text-white flex items-center gap-1 px-3 py-1.5">
              <Activity className="w-3.5 h-3.5" /> Clocked In
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
              <Clock className="w-3.5 h-3.5" /> Off Clock
            </Badge>
          )}
          {managerView && (
            <Button variant="outline" size="sm" onClick={() => exportToCSV(timeRecords, `staff-time-${historyStart}-${historyEnd}.csv`)}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          )}
          {managerView && (
            <Dialog open={lockOpen} onOpenChange={setLockOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Lock className="w-4 h-4 mr-2" /> Lock for Payroll
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Lock Records for Payroll</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Records in this date range will be marked as locked and cannot be edited after export.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>From</Label>
                      <Input type="date" value={lockRange.start} onChange={e => setLockRange(p => ({ ...p, start: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>To</Label>
                      <Input type="date" value={lockRange.end} onChange={e => setLockRange(p => ({ ...p, end: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setLockOpen(false)}>Cancel</Button>
                    <Button onClick={() => lockMutation.mutate()} disabled={lockMutation.isPending}>
                      <Lock className="w-4 h-4 mr-2" />
                      {lockMutation.isPending ? "Locking..." : "Lock Records"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Clock In/Out Card */}
      <Card className={isClockedIn ? "border-green-500" : ""}>
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
                    <p className="text-2xl font-bold">{format(new Date(activeRecord.clockInTime), "h:mm a")}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activeRecord.clockInTime), "EEE, MMM d")} &bull; Elapsed: {fmt(elapsed)}
                    </p>
                    {activeRecord.clockInLatitude && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> GPS recorded at clock-in
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold">Not Clocked In</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[200px]">
              {!isClockedIn ? (
                <>
                  <Textarea
                    placeholder="Optional shift note..."
                    value={clockInNotes}
                    onChange={e => setClockInNotes(e.target.value)}
                    className="h-14 text-sm resize-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={inGps.getLocation}
                    disabled={inGps.loading}
                    className={inGps.coords ? "border-green-500 text-green-600" : ""}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {inGps.loading ? "Getting GPS..." : inGps.coords ? "GPS Captured ✓" : "Capture GPS Location"}
                  </Button>
                  {inGps.gpsError && <p className="text-xs text-amber-600">{inGps.gpsError}</p>}
                  <Button
                    onClick={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                  </Button>
                </>
              ) : (
                <Dialog open={clockOutOpen} onOpenChange={setClockOutOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="lg">
                      <LogOut className="w-5 h-5 mr-2" /> Clock Out
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Clock Out</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-muted rounded-lg p-4 text-sm">
                        <p className="font-medium">Session Summary</p>
                        <p className="text-muted-foreground">In: {format(new Date(activeRecord.clockInTime), "h:mm a")} &bull; Elapsed: {fmt(elapsed)}</p>
                      </div>
                      <div>
                        <Label>Capture GPS Location (recommended)</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`mt-1 w-full ${outGps.coords ? "border-green-500 text-green-600" : ""}`}
                          onClick={outGps.getLocation}
                          disabled={outGps.loading}
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          {outGps.loading ? "Getting..." : outGps.coords ? "GPS Captured ✓" : "Get Location"}
                        </Button>
                        {outGps.gpsError && <p className="text-xs text-amber-600 mt-1">{outGps.gpsError}</p>}
                      </div>
                      <div>
                        <Label>Break Time</Label>
                        <Select value={clockOutBreak} onValueChange={setClockOutBreak}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                          value={clockOutNotes}
                          onChange={e => setClockOutNotes(e.target.value)}
                          className="mt-1 h-16 resize-none"
                          placeholder="Any notes about this shift..."
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setClockOutOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => clockOutMutation.mutate()} disabled={clockOutMutation.isPending}>
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Hours This Week", value: `${hoursThisWeek.toFixed(1)}h`, icon: Clock, color: "blue" },
          { label: "OT This Week", value: `${otThisWeek.toFixed(1)}h`, icon: AlertTriangle, color: otThisWeek > 0 ? "orange" : "gray" },
          { label: "Records Shown", value: String(timeRecords.length), icon: History, color: "purple" },
          { label: "Flagged Records", value: String(flaggedCount), icon: Flag, color: flaggedCount > 0 ? "red" : "gray" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-100 dark:bg-${color}-900`}>
                <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={managerView ? "live" : "history"}>
        <TabsList className={`grid w-full ${managerView ? "grid-cols-5" : "grid-cols-3"}`}>
          {managerView && (
            <TabsTrigger value="live" className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Live Dashboard
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="w-4 h-4" /> Work History
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> Schedule History
          </TabsTrigger>
          <TabsTrigger value="ot" className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> OT Tracking
          </TabsTrigger>
          {managerView && (
            <TabsTrigger value="audit" className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Audit Log
            </TabsTrigger>
          )}
        </TabsList>

        {/* Live Dashboard Tab (managers only) */}
        {managerView && (
          <TabsContent value="live">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Live Clock-In Dashboard</CardTitle>
                    <CardDescription>Staff currently clocked in — refreshes every 60 seconds</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchLive()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {liveDashboard.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                    <Users className="w-8 h-8 opacity-30" />
                    <p>No staff currently clocked in</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(liveDashboard as any[]).map((r: any) => (
                      <div key={r.id} className={`flex items-center justify-between p-4 rounded-lg border ${r.autoFlagged ? "border-orange-400 bg-orange-50 dark:bg-orange-950" : "border-border bg-card"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${r.autoFlagged ? "bg-orange-500" : "bg-green-500"} animate-pulse`} />
                          <div>
                            <p className="font-semibold">{r.userName} {r.userLastName}</p>
                            <p className="text-xs text-muted-foreground">
                              Clocked in at {format(new Date(r.clockInTime), "h:mm a")} &bull; {fmt(r.elapsedMinutes)} elapsed
                            </p>
                            {(r.clockInAddress || r.clockInLatitude) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {r.clockInAddress || `${Number(r.clockInLatitude).toFixed(4)}, ${Number(r.clockInLongitude).toFixed(4)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.autoFlagged && (
                            <Badge variant="outline" className="text-orange-600 border-orange-400 text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" /> {Math.floor(r.elapsedMinutes / 60)}h+ — Review
                            </Badge>
                          )}
                          {r.isFlagged && !r.autoFlagged && (
                            <Badge variant="outline" className="text-red-600 border-red-400 text-xs">
                              <Flag className="w-3 h-3 mr-1" /> Flagged
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Work History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Work History</CardTitle>
              <div className="flex gap-3 flex-wrap pt-2">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={historyStart} onChange={e => setHistoryStart(e.target.value)} className="w-40 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={historyEnd} onChange={e => setHistoryEnd(e.target.value)} className="w-40 mt-1" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {timeRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <History className="w-8 h-8 opacity-30" />
                  <p>No records for this period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Break</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        {managerView && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(timeRecords as any[]).map((r: any) => {
                        const mins = workedMins(r.clockInTime, r.clockOutTime, r.breakMinutes || 0);
                        const hrs = workedHrs(mins);
                        const active = !r.clockOutTime;
                        return (
                          <TableRow key={r.id} className={r.isFlagged ? "bg-red-50 dark:bg-red-950" : r.payrollLocked ? "bg-muted/30" : ""}>
                            <TableCell className="font-medium text-sm">{r.userName} {r.userLastName}</TableCell>
                            <TableCell className="text-sm">{format(new Date(r.clockInTime), "EEE, MMM d, yyyy")}</TableCell>
                            <TableCell className="text-sm">{format(new Date(r.clockInTime), "h:mm a")}</TableCell>
                            <TableCell className="text-sm">
                              {active ? <span className="text-green-600 font-medium">Active</span> : format(new Date(r.clockOutTime), "h:mm a")}
                            </TableCell>
                            <TableCell className="text-sm">{r.breakMinutes ? `${r.breakMinutes}m` : "—"}</TableCell>
                            <TableCell>
                              <span className={`font-semibold ${hrs > 8 ? "text-orange-600" : ""}`}>{hrs.toFixed(2)}h</span>
                            </TableCell>
                            <TableCell className="max-w-[180px]">
                              {r.clockInAddress ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-start gap-1 cursor-default">
                                      <MapPin className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                                      <span className="text-xs leading-tight line-clamp-2">{r.clockInAddress}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-xs">
                                    <p className="font-semibold mb-1">Clock-in: {r.clockInAddress}</p>
                                    {r.clockInLatitude && <p className="text-xs">GPS: {Number(r.clockInLatitude).toFixed(5)}, {Number(r.clockInLongitude).toFixed(5)}</p>}
                                    {r.clockOutAddress && <p className="mt-1 font-semibold">Clock-out: {r.clockOutAddress}</p>}
                                  </TooltipContent>
                                </Tooltip>
                              ) : r.clockInLatitude ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 cursor-default">
                                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                      <span className="text-xs text-muted-foreground">GPS only</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>{Number(r.clockInLatitude).toFixed(5)}, {Number(r.clockInLongitude).toFixed(5)}</TooltipContent>
                                </Tooltip>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant={active ? "default" : "secondary"} className={`text-xs ${active ? "bg-green-500 text-white" : ""}`}>
                                  {active ? "Active" : "Done"}
                                </Badge>
                                {r.isFlagged && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => { setPhotoReviewRecord(r); setPhotoReviewOpen(true); }}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs text-red-600 border-red-400 hover:bg-red-50 transition-colors">
                                        <Flag className="w-3 h-3" />Flagged
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{r.flagReason || "Flagged for review"}</TooltipContent>
                                  </Tooltip>
                                )}
                                {r.isEdited && <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs"><Edit className="w-3 h-3 mr-1" />Edited</Badge>}
                                {r.payrollLocked && <Badge variant="outline" className="text-gray-500 text-xs"><Lock className="w-3 h-3 mr-1" />Locked</Badge>}
                                {r.approvedBy && <Badge variant="outline" className="text-green-600 border-green-400 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>}
                              </div>
                            </TableCell>
                            {managerView && (
                              <TableCell>
                                <div className="flex gap-1">
                                  {!r.payrollLocked && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                                          <Edit className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit Record</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {!r.approvedBy && r.clockOutTime && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => approveMutation.mutate(r.id)}>
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Approve</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {!r.isFlagged && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600"
                                          onClick={() => { setFlagRecord(r); setFlagReason(""); setFlagOpen(true); }}>
                                          <Flag className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Flag for Review</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule History Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Schedule History</CardTitle>
              <CardDescription>Time records grouped by week</CardDescription>
            </CardHeader>
            <CardContent>
              {timeRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <Calendar className="w-8 h-8 opacity-30" />
                  <p>No records for this period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const grouped: Record<string, any[]> = {};
                    (timeRecords as any[]).forEach((r: any) => {
                      const week = format(startOfWeek(new Date(r.clockInTime)), "MMM d, yyyy");
                      if (!grouped[week]) grouped[week] = [];
                      grouped[week].push(r);
                    });
                    return Object.entries(grouped).map(([week, records]) => {
                      const totalHrs = records.reduce((s, r) => s + workedHrs(workedMins(r.clockInTime, r.clockOutTime, r.breakMinutes || 0)), 0);
                      const ot = Math.max(0, totalHrs - 40);
                      return (
                        <div key={week} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted px-4 py-2 flex items-center justify-between">
                            <span className="font-semibold text-sm">Week of {week}</span>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground">{records.length} shift(s)</span>
                              <span className={`font-medium ${totalHrs > 40 ? "text-orange-600" : ""}`}>{totalHrs.toFixed(1)}h</span>
                              {ot > 0 && <Badge variant="outline" className="text-orange-600 border-orange-400 text-xs">OT: {ot.toFixed(1)}h</Badge>}
                            </div>
                          </div>
                          <div className="divide-y">
                            {records.map((r: any) => {
                              const mins = workedMins(r.clockInTime, r.clockOutTime, r.breakMinutes || 0);
                              return (
                                <div key={r.id} className="px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                                  <div>
                                    <p className="font-medium text-sm">{format(new Date(r.clockInTime), "EEEE, MMM d")}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(r.clockInTime), "h:mm a")} – {r.clockOutTime ? format(new Date(r.clockOutTime), "h:mm a") : "Active"}
                                      {r.breakMinutes ? ` (${r.breakMinutes}m break)` : ""}
                                      {r.clockInLatitude ? " · GPS ✓" : ""}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">{workedHrs(mins).toFixed(2)}h</span>
                                    {r.isFlagged && <Badge variant="outline" className="text-red-600 text-xs"><Flag className="w-3 h-3 mr-1" />Flagged</Badge>}
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
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Overtime Tracking</CardTitle>
              <CardDescription>Weekly breakdown — OT = hours over 40/week (FLSA standard)</CardDescription>
              <div className="flex gap-3 pt-2">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={otStart} onChange={e => setOtStart(e.target.value)} className="w-40 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={otEnd} onChange={e => setOtEnd(e.target.value)} className="w-40 mt-1" />
                </div>
                {managerView && (
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" onClick={() => exportToCSV(timeRecords, `ot-report-${otStart}-${otEnd}.csv`)}>
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {otReport.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <FileBarChart className="w-8 h-8 opacity-30" />
                  <p>No data found for this period</p>
                </div>
              ) : (
                <>
                  {(otReport as any[]).some((r: any) => r.otHours > 0) && (
                    <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        <strong>Overtime detected</strong> — one or more weeks exceed 40 hours. OT rows are highlighted.
                      </p>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Week Starting</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Regular Hrs</TableHead>
                        <TableHead>OT Hrs</TableHead>
                        <TableHead>Total Hrs</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(otReport as any[]).map((row: any, i: number) => (
                        <TableRow key={i} className={row.otHours > 0 ? "bg-orange-50 dark:bg-orange-950" : ""}>
                          <TableCell className="font-medium">{row.userName || "You"}</TableCell>
                          <TableCell>{format(new Date(row.weekStart + "T12:00:00"), "MMM d, yyyy")}</TableCell>
                          <TableCell>{row.days?.length ?? 0}</TableCell>
                          <TableCell>{row.regularHours.toFixed(2)}h</TableCell>
                          <TableCell>
                            {row.otHours > 0
                              ? <span className="font-bold text-orange-600">{row.otHours.toFixed(2)}h</span>
                              : <span className="text-muted-foreground">0.00h</span>}
                          </TableCell>
                          <TableCell className="font-semibold">{row.totalHours.toFixed(2)}h</TableCell>
                          <TableCell>
                            {row.otHours > 0
                              ? <Badge variant="outline" className="text-orange-600 border-orange-400 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Overtime</Badge>
                              : row.hasFlagged
                              ? <Badge variant="outline" className="text-red-600 border-red-400 text-xs"><Flag className="w-3 h-3 mr-1" />Has Flags</Badge>
                              : <Badge variant="secondary" className="text-xs">Regular</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: "Total Regular", value: (otReport as any[]).reduce((s: number, r: any) => s + r.regularHours, 0).toFixed(1) + "h" },
                      { label: "Total OT", value: (otReport as any[]).reduce((s: number, r: any) => s + r.otHours, 0).toFixed(1) + "h", ot: (otReport as any[]).some((r: any) => r.otHours > 0) },
                      { label: "Total Hours", value: (otReport as any[]).reduce((s: number, r: any) => s + r.totalHours, 0).toFixed(1) + "h" },
                    ].map(({ label, value, ot }) => (
                      <Card key={label} className={ot ? "bg-orange-50 dark:bg-orange-950" : "bg-muted/30"}>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className={`text-xl font-bold ${ot ? "text-orange-600" : ""}`}>{value}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab (managers only) */}
        {managerView && (
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Audit Log</CardTitle>
                <CardDescription>Immutable record of all clock-in/out actions, edits, approvals, and locks</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                    <Shield className="w-8 h-8 opacity-30" />
                    <p>No audit events recorded yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date/Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Performed By</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(auditLogs as any[]).map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(log.performedAt), "MMM d, yyyy h:mm a")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs capitalize ${
                                log.action === 'clock_in' ? 'border-green-400 text-green-700' :
                                log.action === 'clock_out' ? 'border-blue-400 text-blue-700' :
                                log.action === 'edit' ? 'border-amber-400 text-amber-700' :
                                log.action === 'flag' ? 'border-red-400 text-red-700' :
                                log.action === 'approve' ? 'border-green-400 text-green-700' :
                                log.action === 'payroll_lock' ? 'border-gray-400 text-gray-700' : ''
                              }`}>
                                {log.action.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{log.performerName} {log.performerLastName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{log.ipAddress || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{log.notes || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Record Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Time Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 rounded-lg text-sm text-amber-800 dark:text-amber-200">
              <strong>Manager Edit:</strong> All changes are audit logged and cannot be undone.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Clock In Time</Label>
                <Input type="datetime-local" value={editForm.clockInTime}
                  onChange={e => setEditForm(p => ({ ...p, clockInTime: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Clock Out Time</Label>
                <Input type="datetime-local" value={editForm.clockOutTime}
                  onChange={e => setEditForm(p => ({ ...p, clockOutTime: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Break Minutes</Label>
              <Input type="number" value={editForm.breakMinutes} min="0"
                onChange={e => setEditForm(p => ({ ...p, breakMinutes: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                className="mt-1 h-16 resize-none" />
            </div>
            <div>
              <Label className="text-xs">Reason for Edit <span className="text-red-500">*</span></Label>
              <Textarea value={editForm.editReason} onChange={e => setEditForm(p => ({ ...p, editReason: e.target.value }))}
                className="mt-1 h-16 resize-none" placeholder="Required: explain why this record is being modified..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editForm.editReason}>
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Flag Record for Review</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Flagging a record marks it for manager review. The employee will not be notified automatically.
            </p>
            <div>
              <Label className="text-xs">Reason <span className="text-red-500">*</span></Label>
              <Textarea value={flagReason} onChange={e => setFlagReason(e.target.value)}
                className="mt-1 h-20 resize-none" placeholder="Why is this record being flagged?" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setFlagOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => flagMutation.mutate()} disabled={flagMutation.isPending || !flagReason}>
                <Flag className="w-4 h-4 mr-2" />
                {flagMutation.isPending ? "Flagging..." : "Flag Record"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kiosk Photo Review Dialog */}
      <Dialog open={photoReviewOpen} onOpenChange={setPhotoReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Flag className="w-5 h-5" /> Flagged Record Review
            </DialogTitle>
          </DialogHeader>
          {photoReviewRecord && (
            <div className="space-y-4">
              {/* Employee + time info */}
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
                <p className="font-semibold text-red-800 dark:text-red-200">
                  {photoReviewRecord.userName} {photoReviewRecord.userLastName}
                </p>
                <p className="text-red-700 dark:text-red-300 mt-0.5">
                  {format(new Date(photoReviewRecord.clockInTime), "EEE, MMM d, yyyy")} &bull;{" "}
                  {format(new Date(photoReviewRecord.clockInTime), "h:mm a")}
                  {photoReviewRecord.clockOutTime && ` — ${format(new Date(photoReviewRecord.clockOutTime), "h:mm a")}`}
                </p>
              </div>

              {/* Flag reason */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Flag Reason</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border">
                  {photoReviewRecord.flagReason || "No reason provided"}
                </p>
              </div>

              {/* Captured photos */}
              {(photoReviewRecord.clockInPhoto || photoReviewRecord.clockOutPhoto) ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Captured Photos</p>
                  <div className="grid grid-cols-2 gap-3">
                    {photoReviewRecord.clockInPhoto && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 text-center">Clock-In</p>
                        <img
                          src={photoReviewRecord.clockInPhoto}
                          className="w-full rounded-lg border object-cover aspect-square scale-x-[-1]"
                          alt="Clock-in selfie"
                        />
                      </div>
                    )}
                    {photoReviewRecord.clockOutPhoto && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 text-center">Clock-Out</p>
                        <img
                          src={photoReviewRecord.clockOutPhoto}
                          className="w-full rounded-lg border object-cover aspect-square scale-x-[-1]"
                          alt="Clock-out selfie"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No photos captured for this record.</p>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setPhotoReviewOpen(false)}>Close</Button>
                {!photoReviewRecord.approvedBy && photoReviewRecord.clockOutTime && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      approveMutation.mutate(photoReviewRecord.id);
                      setPhotoReviewOpen(false);
                    }}
                    disabled={approveMutation.isPending}>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Anyway
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
        </main>
      </div>
    </div>
  );
}
