import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "blue" | "green" | "red" | "purple" | "amber" | "gray";

const TONE_CLASSES: Record<StatTone, { chip: string; icon: string }> = {
  blue: { chip: "bg-blue-100 dark:bg-blue-900/30", icon: "text-blue-600 dark:text-blue-400" },
  green: { chip: "bg-green-100 dark:bg-green-900/30", icon: "text-green-600 dark:text-green-400" },
  red: { chip: "bg-red-100 dark:bg-red-900/30", icon: "text-red-600 dark:text-red-400" },
  purple: { chip: "bg-purple-100 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400" },
  amber: { chip: "bg-amber-100 dark:bg-amber-900/30", icon: "text-amber-600 dark:text-amber-400" },
  gray: { chip: "bg-muted", icon: "text-muted-foreground" },
};

interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  tone?: StatTone;
  /** Percent or absolute change vs. a prior period; renders a small up/down pill. */
  trend?: { value: number; label?: string };
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  "data-testid"?: string;
}

/**
 * Standard metric/KPI tile: icon chip, label, big value, optional sublabel
 * and trend indicator. Replaces the metric-card markup that was duplicated
 * (with slightly different Tailwind classes each time) across the dashboard
 * and most list pages' summary rows.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone = "blue",
  trend,
  loading = false,
  onClick,
  className,
  "data-testid": testId,
}: StatCardProps) {
  const tones = TONE_CLASSES[tone];
  const Comp = onClick ? "button" : "div";

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-soft-md",
        onClick && "cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      data-testid={testId}
    >
      <CardContent className="p-5">
        <Comp
          onClick={onClick}
          className={cn("flex w-full items-start justify-between gap-3", onClick && "text-left")}
          type={onClick ? "button" : undefined}
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {label}
            </p>
            {loading ? (
              <div className="mt-2 h-8 w-20 skeleton-shimmer rounded bg-muted" />
            ) : (
              <p className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">{value}</p>
            )}
            {(sublabel || trend) && !loading && (
              <div className="mt-1 flex items-center gap-2">
                {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
                {trend && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-xs font-medium",
                      trend.value >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {trend.value >= 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(trend.value)}
                    {trend.label ? ` ${trend.label}` : "%"}
                  </span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl", tones.chip)}>
              <Icon className={cn("h-5 w-5", tones.icon)} aria-hidden="true" />
            </div>
          )}
        </Comp>
      </CardContent>
    </Card>
  );
}
