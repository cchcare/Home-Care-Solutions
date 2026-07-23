import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";
import { Link } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { EmptyState } from "@/components/ui/empty-state";

type StaffRow = {
  id: string;
  officeId: string;
  userId: string;
  position: string | null;
  department: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  officeName: string | null;
};

type Office = { id: string; name: string };

export default function Staff() {
  const [officeId, setOfficeId] = useState<string>("all");
  const [position, setPosition] = useState<string>("all");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [search, setSearch] = useState<string>("");

  const params = new URLSearchParams();
  if (officeId !== "all") params.set("officeId", officeId);
  if (position !== "all") params.set("position", position);
  params.set("status", status);
  if (search.trim()) params.set("search", search.trim());
  const qs = params.toString();

  const { data: staff = [], isLoading } = useQuery<StaffRow[]>({
    queryKey: ["/api/staff", { officeId, position, status, search }],
    queryFn: async () => {
      const res = await fetch(`/api/staff?${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  const { data: offices = [] } = useQuery<Office[]>({ queryKey: ["/api/offices"] });
  const { data: positions = [] } = useQuery<string[]>({ queryKey: ["/api/staff/positions"] });

  const totals = useMemo(() => ({
    shown: staff.length,
    active: staff.filter((s) => s.isActive).length,
    inactive: staff.filter((s) => !s.isActive).length,
  }), [staff]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Staff" subtitle="Internal office staff directory" />
        <div className="flex-1 overflow-auto space-y-4 p-4 md:p-6" data-testid="page-staff">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Staff</h1>
        </div>
        <div className="text-sm text-muted-foreground" data-testid="text-staff-totals">
          Showing {totals.shown} • {totals.active} active • {totals.inactive} inactive
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
              placeholder="Search by first or last name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              data-testid="input-staff-search"
            />
          </div>
          <Select value={officeId} onValueChange={setOfficeId}>
            <SelectTrigger data-testid="select-staff-office"><SelectValue placeholder="Office" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All offices</SelectItem>
              {offices.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={position} onValueChange={setPosition}>
            <SelectTrigger data-testid="select-staff-position"><SelectValue placeholder="Title" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All titles</SelectItem>
              {positions.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger data-testid="select-staff-status"><SelectValue placeholder="Status" /></SelectTrigger>
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
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      icon={Users}
                      title="No staff found"
                      description="No staff members match the current filters. Try adjusting the office, title, or status filters."
                      data-testid="text-staff-empty"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((s) => {
                  const name = [s.firstName, s.lastName].filter(Boolean).join(" ") || "(no name)";
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/40 transition-colors" data-testid={`row-staff-${s.id}`}>
                      <TableCell className="font-medium">
                        {s.userId ? (
                          <Link
                            href={`/staff/${s.userId}`}
                            className="text-primary hover:underline"
                            data-testid={`link-staff-${s.id}`}
                          >
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                      </TableCell>
                      <TableCell>{s.position || "—"}</TableCell>
                      <TableCell>{s.department || "—"}</TableCell>
                      <TableCell>{s.officeName || "—"}</TableCell>
                      <TableCell>{s.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.isActive ? "default" : "secondary"}>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </div>
      </main>
    </div>
  );
}
