import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Buttons/filters rendered on the right (or below title on mobile). */
  actions?: ReactNode;
  /** Small badge/pill next to the title, e.g. a record count or status. */
  badge?: ReactNode;
  sticky?: boolean;
  className?: string;
  "data-testid"?: string;
}

/**
 * Consistent page-title bar: icon chip + title + optional description/badge,
 * with an actions slot that wraps to its own row on mobile. Replaces the
 * hand-rolled "flex items-center justify-between" header block that was
 * duplicated at the top of most pages.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  badge,
  sticky = false,
  className,
  "data-testid": testId,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        sticky && "sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:-mx-6 sm:px-6",
        className,
      )}
      data-testid={testId}
    >
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
