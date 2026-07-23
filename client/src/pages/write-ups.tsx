import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { AlertOctagon, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/loading-states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PersonCombobox } from "@/components/ui/person-combobox";
import { WriteUpFormDialog } from "@/components/employee-write-ups-section";
import { queryClient } from "@/lib/queryClient";

type EmployeeNote = {
  id: string;
  employeeType: string;
  employeeId: string;
  noteType: string;
  severity?: string | null;
  subject?: string | null;
  summary: string;
  followUpDate?: string | null;
  followUpStatus?: string | null;
  acknowledgedAt?: string | null;
  authorId?: string | null;
  officeId?: string | null;
  createdAt?: string | null;
};

type Office = { id: string; name: string };
type Caregiver = { id: string; firstName?: string; lastName?: string; officeId?: string | null };
type StaffUser = { id: string; firstName?: string; lastName?: string; officeId?: string | null };

const severityVariant: Record<string, "secondary" | "default" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
  critical: "destructive",
};

export default function WriteUpsPage() {
  const { user } = useAuth();
  const role = (user as any)?.role;
  const allowed =
    role === "super_admin" ||
    role === "admin" ||
    role === "office_admin" ||
    role === "manager" ||
    role === "supervisor";

  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [officeId, setOfficeId] = useState<string>("all");
  const [employeeKey, setEmployeeKey] = useState<string>("all"); // "type:id"

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (severity !== "all") p.set("severity", severity);
    if (status === "overdue") p.set("overdue", "true");
    else if (status !== "all") p.set("followUpStatus", status);
    if (officeId !== "all") p.set("officeId", officeId);
    return p.toString();
  }, [severity, status, officeId]);

  const { data: notes = [], isLoading } = useQuery<EmployeeNote[]>({
    queryKey: ["/api/write-ups", { severity, status, officeId }],
    queryFn: async () => {
      const r = await fetch(`/api/write-ups${params ? `?${params}` : ""}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to load write-ups");
      return r.json();
    },
    enabled: allowed,
  });

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
    enabled: allowed,
  });
  const { data: caregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
    enabled: allowed,
  });
  const { data: staff = [] } = useQuery<StaffUser[]>({
    queryKey: ["/api/users"],
    enabled: allowed,
  });

  // Lookup maps for display + employee filter dropdown
  const cgMap = useMemo(() => {
    const m = new Map<string, Caregiver>();
    caregivers.forEach((c) => m.set(c.id, c));
    return m;
  }, [caregivers]);
  const staffMap = useMemo(() => {
    const m = new Map<string, StaffUser>();
    staff.forEach((u) => m.set(u.id, u));
    return m;
  }, [staff]);

  const employeeOptions = useMemo(() => {
    const present = new Map<string, { key: string; label: string; officeId?: string | null }>();
    notes.forEach((n) => {
      const key = `${n.employeeType}:${n.employeeId}`;
      if (present.has(key)) return;
      let label = `${n.employeeType}: ${n.employeeId.slice(0, 8)}`;
      let oid: string | null | undefined = n.officeId;
      if (n.employeeType === "caregiver") {
        const c = cgMap.get(n.employeeId);
        if (c) {
          label = `${(c.lastName || "").trim()}, ${(c.firstName || "").trim()}`.replace(/^,\s*/, "");
          if (!label.trim()) label = `Caregiver ${n.employeeId.slice(0, 8)}`;
          oid = oid ?? c.officeId;
        }
      } else {
        const u = staffMap.get(n.employeeId);
        if (u) {
          label = `${(u.lastName || "").trim()}, ${(u.firstName || "").trim()}`.replace(/^,\s*/, "");
          if (!label.trim()) label = `Staff ${n.employeeId.slice(0, 8)}`;
          oid = oid ?? u.officeId;
        }
      }
      present.set(key, { key, label, officeId: oid });
    });
    return Array.from(present.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [notes, cgMap, staffMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (employeeKey !== "all" && `${n.employeeType}:${n.employeeId}` !== employeeKey) {
        return false;
      }
      if (!q) return true;
      const cg = n.employeeType === "caregiver" ? cgMap.get(n.employeeId) : null;
      const st = n.employeeType !== "caregiver" ? staffMap.get(n.employeeId) : null;
      const empName = cg
        ? `${cg.firstName || ""} ${cg.lastName || ""}`
        : st
          ? `${st.firstName || ""} ${st.lastName || ""}`
          : "";
      return (
        (n.subject || "").toLowerCase().includes(q) ||
        (n.summary || "").toLowerCase().includes(q) ||
        n.noteType.toLowerCase().includes(q) ||
        empName.toLowerCase().includes(q)
      );
    });
  }, [notes, search, employeeKey, cgMap, staffMap]);

  if (!allowed) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <Card>
              <CardHeader>
                <CardTitle>Not Available</CardTitle>
                <CardDescription>
                  Write-Ups & Coaching is restricted to managers and HR.
                </CardDescription>
              </CardHeader>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          <Card data-testid="card-write-ups-page">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertOctagon className="h-5 w-5 text-amber-600" /> Write-Ups & Coaching
                  </CardTitle>
                  <CardDescription>
                    Confidential disciplinary, coaching, and commendation notes.
                    You only see records for employees in your current manager chain
                    unless you are an HR / org admin.
                  </CardDescription>
                </div>
                <FileWriteUpButton caregivers={caregivers} staff={staff} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <div className="relative md:col-span-4">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search subject, summary, employee…"
                    className="pl-8"
                    data-testid="input-write-ups-search"
                  />
                </div>
                <Select value={officeId} onValueChange={setOfficeId}>
                  <SelectTrigger className="md:col-span-2" data-testid="select-write-ups-office">
                    <SelectValue placeholder="Office" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All offices</SelectItem>
                    {offices.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={employeeKey} onValueChange={setEmployeeKey}>
                  <SelectTrigger className="md:col-span-3" data-testid="select-write-ups-employee">
                    <SelectValue placeholder="Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {employeeOptions
                      .filter((e) => officeId === "all" || e.officeId === officeId)
                      .map((e) => (
                        <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="md:col-span-1" data-testid="select-write-ups-severity">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="md:col-span-2" data-testid="select-write-ups-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open follow-ups</SelectItem>
                    <SelectItem value="overdue">Overdue follow-ups</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <ListSkeleton rows={5} rowHeight="h-10" />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={AlertOctagon}
                  title="No write-ups found"
                  description="No write-ups match your current filters. Try broadening the type, severity, or status filters."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead>eSignature</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((n) => {
                      const overdue =
                        n.followUpStatus === "open" &&
                        n.followUpDate &&
                        new Date(n.followUpDate).getTime() < Date.now();
                      const cg = n.employeeType === "caregiver" ? cgMap.get(n.employeeId) : null;
                      const st = n.employeeType !== "caregiver" ? staffMap.get(n.employeeId) : null;
                      const empLabel = cg
                        ? `${cg.firstName || ""} ${cg.lastName || ""}`.trim()
                        : st
                          ? `${st.firstName || ""} ${st.lastName || ""}`.trim()
                          : `${n.employeeType}: ${n.employeeId.slice(0, 8)}`;
                      return (
                        <TableRow key={n.id} data-testid={`row-write-up-${n.id}`}>
                          <TableCell className="text-sm">
                            {n.createdAt ? format(new Date(n.createdAt), "PP") : "—"}
                          </TableCell>
                          <TableCell className="capitalize text-sm">
                            {n.noteType.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell>
                            {n.severity && (
                              <Badge variant={severityVariant[n.severity] ?? "secondary"}>
                                {n.severity}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-sm truncate">
                            {n.subject || n.summary.slice(0, 80)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <a
                              className="text-blue-600 hover:underline"
                              href={
                                n.employeeType === "caregiver"
                                  ? `/caregivers/${n.employeeId}`
                                  : `/staff`
                              }
                              data-testid={`link-employee-${n.id}`}
                            >
                              {empLabel || `${n.employeeType}: ${n.employeeId.slice(0, 8)}`}
                            </a>
                          </TableCell>
                          <TableCell className="text-xs">
                            {n.followUpDate ? (
                              <span className={overdue ? "text-destructive font-medium" : ""}>
                                {format(new Date(n.followUpDate), "PP")}
                                {overdue ? " (overdue)" : ""}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {n.followUpStatus === "resolved" && (
                              <Badge variant="secondary" className="ml-2">
                                resolved
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {n.acknowledgedAt ? (
                              <Badge variant="secondary">
                                eSigned {format(new Date(n.acknowledgedAt), "PP")}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

// Manager / HR entry point to file a write-up for any reachable employee —
// caregiver OR office-staff user. Required so disciplinary records can be
// created for office staff, not only caregivers.
function FileWriteUpButton({
  caregivers,
  staff,
}: {
  caregivers: Caregiver[];
  staff: StaffUser[];
}) {
  const [open, setOpen] = useState(false);
  const [empType, setEmpType] = useState<"caregiver" | "user">("caregiver");
  const [empId, setEmpId] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);

  const reset = () => {
    setEmpId("");
    setEmpType("caregiver");
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm" data-testid="button-file-write-up">
            <Plus className="h-4 w-4 mr-1" /> File Write-Up
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md" data-testid="dialog-pick-employee">
          <DialogHeader>
            <DialogTitle>File a Write-Up</DialogTitle>
            <DialogDescription>
              Choose the employee. Supports both caregivers and office-staff
              users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={empType === "caregiver" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setEmpType("caregiver");
                  setEmpId("");
                }}
                data-testid="button-emp-type-caregiver"
              >
                Caregiver
              </Button>
              <Button
                variant={empType === "user" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setEmpType("user");
                  setEmpId("");
                }}
                data-testid="button-emp-type-user"
              >
                Office staff
              </Button>
            </div>
            <PersonCombobox
              people={empType === "caregiver" ? caregivers : staff}
              value={empId}
              onValueChange={setEmpId}
              placeholder={`Pick ${empType === "caregiver" ? "caregiver" : "office staff"}…`}
              testId="combobox-write-up-employee"
            />
            <div className="flex justify-end">
              <Button
                disabled={!empId}
                onClick={() => {
                  setOpen(false);
                  setFormOpen(true);
                }}
                data-testid="button-continue-write-up"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {empId && (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <WriteUpFormDialog
            employeeType={empType}
            employeeId={empId}
            onClose={() => {
              setFormOpen(false);
              reset();
            }}
            onCreated={() => {
              setFormOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/write-ups"] });
              queryClient.invalidateQueries({
                queryKey: ["/api/write-ups/open-follow-ups"],
              });
              reset();
            }}
          />
        </Dialog>
      )}
    </>
  );
}
