import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

/**
 * Consistent empty-state block for tables, lists, and sections.
 * Renders a soft icon badge, a title, optional supporting text, and an
 * optional action (e.g. an "Add" button).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  "data-testid": testId,
}: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}
      data-testid={testId}
    >
      {Icon && (
        <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon className="h-7 w-7 text-muted-foreground/60" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
