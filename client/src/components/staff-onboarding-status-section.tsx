import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserCheck, UserMinus } from "lucide-react";

interface OnboardingInstance {
  id: string;
  status: string;
  createdAt: string;
  templateName?: string | null;
  progress: { total: number; done: number };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-700",
  };
  return <Badge className={colors[status] || "bg-gray-100 text-gray-700"}>{status.replace(/_/g, " ")}</Badge>;
}

function InstanceList({ instances, emptyLabel }: { instances: OnboardingInstance[]; emptyLabel: string }) {
  if (instances.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-3">
      {instances.map((inst) => {
        const pct = inst.progress.total > 0 ? Math.round((inst.progress.done / inst.progress.total) * 100) : 0;
        return (
          <div key={inst.id} className="border rounded-md p-3" data-testid={`row-instance-${inst.id}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{inst.templateName || "Instance"}</span>
              <StatusBadge status={inst.status} />
            </div>
            <Progress value={pct} className="h-2 mb-1" />
            <p className="text-xs text-muted-foreground">
              {inst.progress.done} of {inst.progress.total} steps complete
              {inst.createdAt ? ` · started ${format(new Date(inst.createdAt), "MMM d, yyyy")}` : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function StaffOnboardingStatusSection({ userId }: { userId: string }) {
  const { data: onboarding = [], isError: onboardingError } = useQuery<OnboardingInstance[]>({
    queryKey: ["/api/onboarding/instances", { employeeUserId: userId }],
    queryFn: async () => {
      const r = await fetch(`/api/onboarding/instances?employeeUserId=${userId}`, { credentials: "include" });
      if (r.status === 403) throw new Error("forbidden");
      if (!r.ok) return [];
      return r.json();
    },
    retry: false,
  });

  const { data: offboarding = [], isError: offboardingError } = useQuery<OnboardingInstance[]>({
    queryKey: ["/api/offboarding/instances", { employeeUserId: userId }],
    queryFn: async () => {
      const r = await fetch(`/api/offboarding/instances?employeeUserId=${userId}`, { credentials: "include" });
      if (r.status === 403) throw new Error("forbidden");
      if (!r.ok) return [];
      return r.json();
    },
    retry: false,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5" />Onboarding Status</CardTitle>
        </CardHeader>
        <CardContent>
          {onboardingError ? (
            <p className="text-muted-foreground text-sm">Admin access required to view onboarding status.</p>
          ) : (
            <InstanceList instances={onboarding} emptyLabel="No onboarding instance on file" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserMinus className="w-5 h-5" />Offboarding Status</CardTitle>
        </CardHeader>
        <CardContent>
          {offboardingError ? (
            <p className="text-muted-foreground text-sm">Admin access required to view offboarding status.</p>
          ) : (
            <InstanceList instances={offboarding} emptyLabel="No offboarding instance on file" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
