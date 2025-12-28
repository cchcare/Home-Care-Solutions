import { useFeatures } from "@/hooks/use-features";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Lock } from "lucide-react";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function DefaultUpgradeFallback() {
  return (
    <div
      className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-muted/50"
      data-testid="feature-gate-upgrade-message"
    >
      <Lock className="h-8 w-8 text-muted-foreground mb-3" />
      <h3 className="font-semibold text-lg mb-1">Feature Not Available</h3>
      <p className="text-muted-foreground text-center mb-4">
        This feature is not included in your current plan.
      </p>
      <Link
        href="/pricing"
        className="text-primary hover:underline font-medium"
        data-testid="link-upgrade-plan"
      >
        Upgrade your plan to unlock this feature
      </Link>
    </div>
  );
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, isLoading } = useFeatures();

  if (isLoading) {
    return (
      <div data-testid="feature-gate-loading">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!hasFeature(feature)) {
    return <>{fallback ?? <DefaultUpgradeFallback />}</>;
  }

  return <>{children}</>;
}
