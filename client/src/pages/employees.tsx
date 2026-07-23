import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonCombobox } from "@/components/ui/person-combobox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Users, Network, UserCog, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

type EmployeeRow = {
  kind: "user" | "caregiver" | "coordinator";
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  title: string | null;
  officeId: string | null;
  officeName: string | null;
  isActive: boolean | null;
  hireDate: string | null;
  managerId: string | null;
  managerName: string | null;
};

type ManagerCandidate = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  officeId: string | null;
};

type Office = { id: string; name: string };

type SortKey = "name" | "role" | "office" | "manager" | "hireDate" | "status";

export default function EmployeesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<"all" | "user" | "caregiver" | "coordinator">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [pendingManagerId, setPendingManagerId] = useState<string>("__none__");

  const officeParam =
    officeFilter !== "all" ? `?officeId=${encodeURIComponent(officeFilter)}` : "";

  const { data: employees = [], isLoading } = useQuery<EmployeeRow[]>({
    queryKey: ["/api/employees", { officeId: officeFilter }],
    queryFn: async () => {
      const res = await fetch(`/api/employees${officeParam}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
  });

  const { data: candidates = [] } = useQuery<ManagerCandidate[]>({
    queryKey: ["/api/employees/manager-candidates", { officeId: officeFilter }],
    queryFn: async () => {
      const res = await fetch(`/api/employees/manager-candidates${officeParam}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch managers");
      return res.json();
    },
  });

  const { data: offices = [] } = useQuery<Office[]>({ queryKey: ["/api/offices"] });

  const formatName = (f: string | null, l: string | null) =>
    [f, l].filter(Boolean).join(" ") || "(no name)";

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = employees.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (statusFilter === "active" && e.isActive === false) return false;
      if (statusFilter === "inactive" && e.isActive !== false) return false;
      if (!term) return true;
      const hay = [e.firstName, e.lastName, e.email, e.role, e.title, e.managerName, e.officeName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
    const cmp = (a: EmployeeRow, b: EmployeeRow): number => {
      const v = (() => {
        switch (sortKey) {
          case "name":
            return `${a.lastName ?? ""} ${a.firstName ?? ""}`
              .trim()
              .toLowerCase()
              .localeCompare(`${b.lastName ?? ""} ${b.firstName ?? ""}`.trim().toLowerCase());
          case "role":
            return (a.role ?? "").localeCompare(b.role ?? "");
          case "office":
            return (a.officeName ?? "").localeCompare(b.officeName ?? "");
          case "manager":
            return (a.managerName ?? "").localeCompare(b.managerName ?? "");
          case "hireDate": {
            const at = a.hireDate ? new Date(a.hireDate).getTime() : 0;
            const bt = b.hireDate ? new Date(b.hireDate).getTime() : 0;
            return at - bt;
          }
          case "status":
            return Number(a.isActive !== false) - Number(b.isActive !== false);
        }
      })();
      return sortDir === "asc" ? v : -v;
    };
    return [...rows].sort(cmp);
  }, [employees, search, kindFilter, statusFilter, sortKey, sortDir]);

  const setManagerMutation = useMutation({
    mutationFn: async (vars: {
      kind: "user" | "caregiver" | "coordinator";
      id: string;
      managerId: string | null;
    }) => {
      return apiRequest("PUT", `/api/employees/${vars.kind}/${vars.id}/manager`, {
        managerId: vars.managerId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees/org-tree"] });
      toast({ title: "Manager updated" });
      setEditing(null);
    },
    onError: (e: any) => {
      toast({
        title: "Failed to update manager",
        description: e?.message || "Try again",
        variant: "destructive",
      });
    },
  });

  const openEditor = (row: EmployeeRow) => {
    setEditing(row);
    setPendingManagerId(row.managerId ?? "__none__");
  };

  const saveManager = () => {
    if (!editing) return;
    setManagerMutation.mutate({
      kind: editing.kind,
      id: editing.id,
      managerId: pendingManagerId === "__none__" ? null : pendingManagerId,
    });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };


  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Employee Directory" subtitle="Staff, caregivers, and coordinators in one directory" />
        <div
          className="flex-1 overflow-auto p-4 md:p-6 bg-background space-y-6"
          data-testid="page-employees"
        >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Employee Directory</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-0.5">
              {filtered.length} displayed · {employees.length} total
            </p>
          </div>
          <Link href="/org-chart">
            <Button variant="outline" size="sm" data-testid="button-open-org-chart" className="gap-2">
              <Network className="h-4 w-4" />
              Org Chart
            </Button>
          </Link>
        </div>

        <Card className="bg-card border border-border/50 shadow-soft">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50 border-muted-foreground/20"
                data-testid="input-employee-search"
                aria-label="Search employees"
              />
            </div>
            <Select value={officeFilter} onValueChange={setOfficeFilter}>
              <SelectTrigger data-testid="select-employee-office" className="bg-background/50 border-muted-foreground/20">
                <SelectValue placeholder="Office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {offices.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
              <SelectTrigger data-testid="select-employee-kind" className="bg-background/50 border-muted-foreground/20">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                <SelectItem value="user">Office staff</SelectItem>
                <SelectItem value="caregiver">Caregivers</SelectItem>
                <SelectItem value="coordinator">Coordinators</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger data-testid="select-employee-status" className="bg-background/50 border-muted-foreground/20">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1" data-testid="text-employees-empty">
                  No employees found
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  No employees match your current filter criteria. Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <div className="max-h-[65vh] overflow-auto">
                <Table>
                  <TableHeader sticky>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-6">
                        <button
                          type="button"
                          onClick={() => toggleSort("name")}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                          data-testid="sort-name"
                        >
                          Name
                          {sortKey !== "name" ? (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          ) : sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="px-6">Type</TableHead>
                      <TableHead className="px-6">
                        <button
                          type="button"
                          onClick={() => toggleSort("role")}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                          data-testid="sort-role"
                        >
                          Role
                          {sortKey !== "role" ? (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          ) : sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="px-6 hidden sm:table-cell">
                        <button
                          type="button"
                          onClick={() => toggleSort("office")}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                          data-testid="sort-office"
                        >
                          Office
                          {sortKey !== "office" ? (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          ) : sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="px-6 hidden md:table-cell">
                        <button
                          type="button"
                          onClick={() => toggleSort("manager")}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                          data-testid="sort-manager"
                        >
                          Manager
                          {sortKey !== "manager" ? (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          ) : sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="px-6">
                        <button
                          type="button"
                          onClick={() => toggleSort("status")}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                          data-testid="sort-status"
                        >
                          Status
                          {sortKey !== "status" ? (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          ) : sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="px-6 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => (
                      <TableRow
                        key={`${e.kind}-${e.id}`}
                        data-testid={`row-employee-${e.kind}-${e.id}`}
                      >
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                              e.kind === "caregiver"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : e.kind === "coordinator"
                                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            }`}>
                              {e.firstName?.[0]}{e.lastName?.[0]}
                            </div>
                            <Link
                              href={
                                e.kind === "caregiver"
                                  ? `/caregivers/${e.id}`
                                  : e.kind === "coordinator"
                                  ? `/coordinators/${e.id}`
                                  : `/staff/${e.id}`
                              }
                              className="font-medium text-primary hover:underline truncate"
                              data-testid={`link-employee-${e.id}`}
                              title={formatName(e.firstName, e.lastName)}
                            >
                              {formatName(e.firstName, e.lastName)}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="px-6">
                          <Badge
                            className="text-xs"
                            variant={e.kind === "user" ? "secondary" : "default"}
                          >
                            {e.kind === "caregiver"
                              ? "Caregiver"
                              : e.kind === "coordinator"
                              ? "Coordinator"
                              : "Staff"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6">
                          <span className="text-sm">{e.title || e.role || "—"}</span>
                        </TableCell>
                        <TableCell className="px-6 hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">{e.officeName || "—"}</span>
                        </TableCell>
                        <TableCell className="px-6 hidden md:table-cell">
                          <span
                            className="text-sm"
                            data-testid={`text-employee-manager-${e.id}`}
                          >
                            {e.managerName ? (
                              <span className="font-medium text-foreground">{e.managerName}</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">Unassigned</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="px-6">
                          <Badge
                            className="text-xs"
                            variant={e.isActive === false ? "secondary" : "default"}
                          >
                            {e.isActive === false ? "Inactive" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="flex justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditor(e)}
                              data-testid={`button-edit-manager-${e.id}`}
                              className="text-xs"
                              title="Assign or change manager"
                            >
                              <UserCog className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Manager</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>

      <Dialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Assign Manager</DialogTitle>
            <DialogDescription className="text-sm mt-2">
              {editing && (
                <>
                  <span className="font-semibold text-foreground">
                    {formatName(editing.firstName, editing.lastName)}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}will report to the selected manager
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Manager</label>
              <PersonCombobox
                people={candidates.filter((c) => !editing || c.id !== editing.id)}
                value={pendingManagerId}
                onValueChange={setPendingManagerId}
                placeholder="Search and select a manager..."
                emptyOption={{ value: "__none__", label: "No manager (unassigned)" }}
                testId="combobox-employee-manager"
                renderExtra={(p) => p.role || ""}
              />
            </div>
            {candidates.length === 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  No managers available. Create office staff first to assign as managers.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveManager}
              disabled={setManagerMutation.isPending}
              data-testid="button-save-manager"
            >
              {setManagerMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
