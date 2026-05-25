import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Receipt, Download, DollarSign } from "lucide-react";

interface MyPaycheck {
  id: string;
  employeeType: "caregiver" | "user";
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  regularHours?: string | null;
  overtimeHours?: string | null;
  grossPay: string;
  netPay: string;
  status?: string | null;
  checkNumber?: string | null;
  paystubDocumentId?: string | null;
}

const fmtMoney = (v: string | number | null | undefined) => {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
};
const fmtHours = (v: string | number | null | undefined) => {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

export default function MyPaystubsPage() {
  const { data: paychecks = [], isLoading } = useQuery<MyPaycheck[]>({
    queryKey: ["/api/my-paystubs"],
  });

  const handleDownload = (p: MyPaycheck) => {
    if (!p.paystubDocumentId) return;
    window.open(`/api/documents/${p.paystubDocumentId}/download`, "_blank");
  };

  const ytd = paychecks.reduce(
    (acc, p) => {
      acc.gross += parseFloat(p.grossPay || "0");
      acc.net += parseFloat(p.netPay || "0");
      return acc;
    },
    { gross: 0, net: 0 }
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="My Paystubs" subtitle="View and download your pay history" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card data-testid="card-paystub-count">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Paystubs on file</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{paychecks.length}</p>
              </CardContent>
            </Card>
            <Card data-testid="card-ytd-gross">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Year-to-date gross</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{fmtMoney(ytd.gross)}</p>
              </CardContent>
            </Card>
            <Card data-testid="card-ytd-net">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Year-to-date net</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{fmtMoney(ytd.net)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pay history</CardTitle>
              <CardDescription>Click download to grab the PDF paystub for any pay period.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : paychecks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-paystubs">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No paystubs are available yet.</p>
                  <p className="text-sm">They'll appear here after your first payroll run.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pay date</TableHead>
                      <TableHead>Pay period</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Paystub</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paychecks.map(p => (
                      <TableRow key={p.id} data-testid={`row-paystub-${p.id}`}>
                        <TableCell>{p.payDate ? format(new Date(p.payDate), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.payPeriodStart ? format(new Date(p.payPeriodStart), "MMM d") : "—"}
                          {" – "}
                          {p.payPeriodEnd ? format(new Date(p.payPeriodEnd), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtHours(p.regularHours)}
                          {p.overtimeHours && parseFloat(p.overtimeHours) > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">(+{fmtHours(p.overtimeHours)} OT)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmtMoney(p.grossPay)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtMoney(p.netPay)}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                            {p.status || "pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {p.paystubDocumentId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(p)}
                              data-testid={`button-download-paystub-${p.id}`}
                            >
                              <Download className="h-4 w-4 mr-1" /> PDF
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not available</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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
