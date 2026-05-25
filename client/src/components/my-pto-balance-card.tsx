import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { format } from "date-fns";

interface MyPtoBalance {
  balances: { vacation: number; sick: number; personal: number };
  ledger: Array<{
    id: string;
    ptoType: string;
    source: string;
    deltaHours: string;
    runDate: string;
    reason: string | null;
  }>;
}

export default function MyPtoBalanceCard() {
  const { data, isLoading } = useQuery<MyPtoBalance>({ queryKey: ["/api/my-pto-balance"] });

  return (
    <Card data-testid="card-my-pto-balance">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          My PTO Balances
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !data ? (
          <p className="text-muted-foreground">No balance data available.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {(["vacation", "sick", "personal"] as const).map(t => (
                <div key={t} className="rounded-lg border p-4 text-center" data-testid={`stat-${t}`}>
                  <p className="text-sm text-muted-foreground capitalize">{t}</p>
                  <p className="text-2xl font-bold mt-1">{data.balances[t].toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">hours</p>
                </div>
              ))}
            </div>
            {data.ledger.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Recent Activity</p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {data.ledger.map(l => {
                    const d = parseFloat(l.deltaHours);
                    return (
                      <div key={l.id} className="flex items-center justify-between text-sm border-b py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{format(new Date(l.runDate), "MMM d")}</span>
                          <Badge variant="outline" className="text-xs">{l.ptoType}</Badge>
                          <Badge variant="secondary" className="text-xs">{l.source}</Badge>
                        </div>
                        <span className={d < 0 ? "text-destructive font-medium" : "text-emerald-600 font-medium"}>
                          {d > 0 ? "+" : ""}{d.toFixed(2)} h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
