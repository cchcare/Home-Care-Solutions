import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Search, Users, Network, UserCog, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

type EmployeeRow = {
  kind: "user" | "caregiver";
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
  const [kindFilter, setKindFilter] = useState<"all" | "user" | "caregiver">("all");
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
      kind: "user" | "caregiver";
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

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <TableHead>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
        data-testid={`sort-${k}`}
      >
        {label}
        {sortKey !== k ? (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        ) : sortDir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )}
      </button>
    </TableHead>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div
        className="flex-1 space-y-4 p-4 md:p-6 overflow-auto"
        data-testid="page-employees"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-2xl font-semibold">Employees</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/org-chart">
              <Button variant="outline" size="sm" data-testid="button-open-org-chart">
                <Network className="h-4 w-4 mr-2" />
                Org Chart
              </Button>
            </Link>
            <span
              className="text-sm text-muted-foreground"
              data-testid="text-employee-totals"
            >
              {filtered.length} shown · {employees.length} total
            </span>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, role"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                data-testid="input-employee-search"
              />
            </div>
            <Select value={officeFilter} onValueChange={setOfficeFilter}>
              <SelectTrigger data-testid="select-employee-office">
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
              <SelectTrigger data-testid="select-employee-kind">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                <SelectItem value="user">Office staff</SelectItem>
                <SelectItem value="caregiver">Caregivers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger data-testid="select-employee-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader k="name" label="Name" />
                  <TableHead>Type</TableHead>
                  <SortHeader k="role" label="Role / Title" />
                  <SortHeader k="office" label="Office" />
                  <TableHead>Email</TableHead>
                  <SortHeader k="manager" label="Reports to" />
                  <SortHeader k="hireDate" label="Hire date" />
                  <SortHeader k="status" label="Status" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground py-10"
                      data-testid="text-employees-empty"
                    >
                      No employees match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e) => (
                    <TableRow
                      key={`${e.kind}-${e.id}`}
                      data-testid={`row-employee-${e.kind}-${e.id}`}
                    >
                      <TableCell className="font-medium">
                        {e.kind === "caregiver" ? (
                          <Link
                            href={`/caregivers/${e.id}`}
                            className="hover:underline text-primary"
                            data-testid={`link-employee-${e.id}`}
                          >
                            {formatName(e.firstName, e.lastName)}
                          </Link>
                        ) : (
                          <Link
                            href={`/staff/${e.id}`}
                            className="hover:underline text-primary"
                            data-testid={`link-employee-${e.id}`}
                          >
                            {formatName(e.firstName, e.lastName)}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {e.kind === "caregiver" ? "Caregiver" : "Office staff"}
                        </Badge>
                      </TableCell>
                      <TableCell>{e.title || e.role || "—"}</TableCell>
                      <TableCell>{e.officeName || "—"}</TableCell>
                      <TableCell>{e.email || "—"}</TableCell>
                      <TableCell data-testid={`text-employee-manager-${e.id}`}>
                        {e.managerName || (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {e.hireDate ? format(new Date(e.hireDate), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.isActive === false ? "secondary" : "default"}>
                          {e.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditor(e)}
                          data-testid={`button-edit-manager-${e.id}`}
                        >
                          <UserCog className="h-4 w-4 mr-1" />
                          Manager
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reports to</DialogTitle>
            <DialogDescription>
              {editing &&
                `Choose a manager for ${formatName(editing.firstName, editing.lastName)}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <PersonCombobox
              people={candidates.filter((c) => !editing || c.id !== editing.id)}
              value={pendingManagerId}
              onValueChange={setPendingManagerId}
              placeholder="Select a manager…"
              emptyOption={{ value: "__none__", label: "No manager" }}
              testId="combobox-employee-manager"
              renderExtra={(p) => p.role || ""}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveManager}
              disabled={setManagerMutation.isPending}
              data-testid="button-save-manager"
            >
              {setManagerMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
