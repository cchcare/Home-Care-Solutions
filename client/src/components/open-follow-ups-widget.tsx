import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertOctagon, ExternalLink } from "lucide-react";

type EmployeeNote = {
  id: string;
  employeeType: string;
  employeeId: string;
  noteType: string;
  severity?: string | null;
  subject?: string | null;
  followUpDate?: string | null;
};

export function OpenFollowUpsWidget() {
  const { data: notes = [], isLoading } = useQuery<EmployeeNote[]>({
    queryKey: ["/api/write-ups/open-follow-ups"],
    queryFn: async () => {
      const r = await fetch("/api/write-ups/open-follow-ups", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  if (!isLoading && notes.length === 0) return null;

  const top = notes.slice(0, 5);

  return (
    <Card data-testid="card-open-follow-ups">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertOctagon className="h-4 w-4 text-amber-600" />
              Open Write-Up Follow-Ups
            </CardTitle>
            <CardDescription>
              Coaching / disciplinary follow-ups owed to your team.
            </CardDescription>
          </div>
          <Link href="/write-ups">
            <Button variant="outline" size="sm" data-testid="link-write-ups-page">
              View all <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          top.map((n) => {
            const overdue =
              n.followUpDate && new Date(n.followUpDate).getTime() < Date.now();
            return (
              <div
                key={n.id}
                className="flex items-center justify-between border rounded-md p-2 text-sm"
                data-testid={`row-open-follow-up-${n.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={overdue ? "destructive" : "secondary"} className="capitalize">
                    {n.noteType.replace(/_/g, " ")}
                  </Badge>
                  <span className="truncate">{n.subject || "(no subject)"}</span>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {n.followUpDate ? format(new Date(n.followUpDate), "PP") : "—"}
                  {overdue ? " · overdue" : ""}
                </div>
              </div>
            );
          })
        )}
        {notes.length > top.length && (
          <div className="text-xs text-muted-foreground">
            +{notes.length - top.length} more…
          </div>
        )}
      </CardContent>
    </Card>
  );
}
