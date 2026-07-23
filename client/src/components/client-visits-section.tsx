import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Clock } from "lucide-react";
import type { ClientSchedule, Caregiver } from "@shared/schema";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export function ClientVisitsSection({ clientId }: { clientId: string }) {
  const { data: visits = [], isLoading } = useQuery<ClientSchedule[]>({
    queryKey: ["/api/clients", clientId, "schedules"],
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}/schedules`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load visit history");
      return r.json();
    },
  });

  const { data: caregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
    queryFn: () => fetch("/api/caregivers", { credentials: "include" }).then((r) => r.json()),
  });

  const caregiverName = (id?: string | null) => {
    if (!id) return "Unassigned";
    const cg = caregivers.find((c) => c.id === id);
    return cg ? `${cg.firstName} ${cg.lastName}` : "Unknown";
  };

  const sorted = [...visits].sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Visits</CardTitle>
        <CardDescription>Full visit history for this client, most recent first.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : sorted.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No visits recorded for this client</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Caregiver</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Billed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((visit) => (
                <TableRow key={visit.id} data-testid={`row-visit-${visit.id}`}>
                  <TableCell>{format(new Date(visit.scheduledDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-sm">{visit.startTime} – {visit.endTime}</TableCell>
                  <TableCell>{caregiverName(visit.caregiverId)}</TableCell>
                  <TableCell className="text-sm capitalize">{visit.serviceType?.replace(/_/g, " ") || "N/A"}</TableCell>
                  <TableCell>{visit.totalHours || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${STATUS_STYLES[visit.status || "scheduled"]}`}>{(visit.status || "scheduled").replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell data-testid={`text-visit-billed-${visit.id}`}>
                    <Badge
                      variant={visit.billed ? "default" : "secondary"}
                      className={visit.billed ? "border-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "border-0"}
                    >
                      {visit.billed ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
