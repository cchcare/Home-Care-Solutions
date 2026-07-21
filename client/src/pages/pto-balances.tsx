import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/loading-states";
import { useToast } from "@/hooks/use-toast";
import { Download, Play, Search, History, Wallet } from "lucide-react";
import { format } from "date-fns";

type BalanceRow = {
  caregiverId: string;
  firstName: string | null;
  lastName: string | null;
  officeId: string | null;
  vacation: number;
  sick: number;
  personal: number;
};

type LedgerRow = {
  id: string;
  caregiverId: string;
  ptoType: string;
  source: string;
  deltaHours: string;
  runDate: string;
  reason: string | null;
  createdAt: string;
};

export default function PtoBalances() {
  const { toast } = useToast();
  const [officeId, setOfficeId] = useState<string>("all");
  const [threshold, setThreshold] = useState<string>("");
  const [search, setSearch] = useState("");
  const [drawerCaregiver, setDrawerCaregiver] = useState<BalanceRow | null>(null);

  const { data: offices = [] } = useQuery<any[]>({ queryKey: ["/api/offices"] });
  const params = new URLSearchParams();
  if (officeId !== "all") params.set("officeId", officeId);
  if (threshold) params.set("lowBalanceThreshold", threshold);
  const balancesUrl = `/api/pto-balances${params.toString() ? `?${params.toString()}` : ""}`;
  const { data: rows = [], isLoading } = useQuery<BalanceRow[]>({
    queryKey: [balancesUrl],
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      (`${r.firstName ?? ""} ${r.lastName ?? ""}`).toLowerCase().includes(q),
    );
  }, [rows, search]);

  const { data: ledger = [] } = useQuery<LedgerRow[]>({
    queryKey: ["/api/caregivers", drawerCaregiver?.caregiverId, "pto-ledger"],
    enabled: !!drawerCaregiver,
    queryFn: async () => {
      const res = await fetch(`/api/caregivers/${drawerCaregiver!.caregiverId}/pto-ledger`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load ledger");
      return res.json();
    },
  });

  const runAccrualsMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/pto-accrual/run", { officeId: officeId === "all" ? undefined : officeId }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      toast({ title: "Accruals complete", description: `${data.ledgerInserts} ledger entries inserted across ${data.employeesProcessed} employees.` });
      queryClient.invalidateQueries({ queryKey: [balancesUrl] });
    },
    onError: (err: any) => {
      toast({ title: "Accrual failed", description: err?.message || "Try again", variant: "destructive" });
    },
  });

  const exportCsv = () => {
    const url = `/api/pto-balances/export.csv${officeId !== "all" ? `?officeId=${officeId}` : ""}`;
    window.location.href = url;
  };

  const numFmt = (n: number) => n.toFixed(2);
  const lowClass = (n: number) => threshold && n <= parseFloat(threshold) ? "text-destructive font-semibold" : "";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">PTO Balances</h1>
          <p className="text-muted-foreground">Per-caregiver vacation, sick, and personal balances computed from the ledger.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => runAccrualsMutation.mutate()}
            disabled={runAccrualsMutation.isPending}
            data-testid="button-run-accruals"
          >
            <Play className="h-4 w-4 mr-2" />
            {runAccrualsMutation.isPending ? "Running…" : "Run Accruals Now"}
          </Button>
          <Button variant="outline" onClick={exportCsv} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Office</Label>
              <Select value={officeId} onValueChange={setOfficeId}>
                <SelectTrigger data-testid="select-office"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All offices</SelectItem>
                  {offices.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Low-balance threshold (hours)</Label>
              <Input
                type="number"
                step="0.5"
                placeholder="e.g. 8"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                data-testid="input-threshold"
              />
            </div>
            <div>
              <Label>Search caregiver</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balances ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListSkeleton rows={6} rowHeight="h-10" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No matching caregivers"
              description="No caregivers match the current filters. Try adjusting the office, threshold, or search."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caregiver</TableHead>
                  <TableHead className="text-right">Vacation (h)</TableHead>
                  <TableHead className="text-right">Sick (h)</TableHead>
                  <TableHead className="text-right">Personal (h)</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.caregiverId} data-testid={`row-balance-${r.caregiverId}`}>
                    <TableCell className="font-medium">{r.lastName ?? ""}, {r.firstName ?? ""}</TableCell>
                    <TableCell className={`text-right ${lowClass(r.vacation)}`}>{numFmt(r.vacation)}</TableCell>
                    <TableCell className={`text-right ${lowClass(r.sick)}`}>{numFmt(r.sick)}</TableCell>
                    <TableCell className={`text-right ${lowClass(r.personal)}`}>{numFmt(r.personal)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setDrawerCaregiver(r)} data-testid={`button-ledger-${r.caregiverId}`}>
                        <History className="h-4 w-4 mr-1" />
                        Ledger
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!drawerCaregiver} onOpenChange={open => !open && setDrawerCaregiver(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Ledger — {drawerCaregiver?.lastName}, {drawerCaregiver?.firstName}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {ledger.length === 0 ? (
              <p className="text-muted-foreground">No ledger entries yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Δ Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map(l => (
                    <TableRow key={l.id}>
                      <TableCell>{format(new Date(l.runDate), "MMM d, yyyy")}</TableCell>
                      <TableCell><Badge variant="outline">{l.ptoType}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{l.source}</Badge></TableCell>
                      <TableCell className={`text-right ${parseFloat(l.deltaHours) < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {parseFloat(l.deltaHours).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
