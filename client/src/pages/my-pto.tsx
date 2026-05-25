import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MyPtoBalanceCard from "@/components/my-pto-balance-card";
import { CalendarPlus, ClipboardList } from "lucide-react";
import { format } from "date-fns";

interface TimeOffRequest {
  id: string;
  ptoType: string;
  startDate: string;
  endDate: string;
  totalHours: string | number | null;
  status: string;
  reason: string | null;
  submittedAt: string | null;
}

export default function MyPtoPage() {
  const { data: requests = [] } = useQuery<TimeOffRequest[]>({
    queryKey: ["/api/time-off-requests/mine"],
    queryFn: async () => {
      const res = await fetch("/api/time-off-requests");
      if (!res.ok) return [];
      const all = await res.json();
      return Array.isArray(all) ? all : [];
    },
  });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="My PTO" subtitle="View your time-off balances and request time away" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <MyPtoBalanceCard />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" /> My time-off requests
                </CardTitle>
                <CardDescription>Recent vacation, sick, and personal time requests</CardDescription>
              </div>
              <Link href="/time-off-requests">
                <Button data-testid="button-request-time-off">
                  <CalendarPlus className="h-4 w-4 mr-1" /> Request time off
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-requests">
                  <p>You haven't submitted any time-off requests.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.slice(0, 10).map(r => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border rounded-md p-3"
                      data-testid={`row-pto-request-${r.id}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{r.ptoType}</Badge>
                          <span className="font-medium">
                            {r.startDate ? format(new Date(r.startDate), "MMM d") : "—"}
                            {" – "}
                            {r.endDate ? format(new Date(r.endDate), "MMM d, yyyy") : "—"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({r.totalHours ?? 0}h)
                          </span>
                        </div>
                        {r.reason && (
                          <p className="text-sm text-muted-foreground mt-1">{r.reason}</p>
                        )}
                      </div>
                      <Badge
                        variant={
                          r.status === "approved" ? "default" :
                          r.status === "denied" ? "destructive" :
                          "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
