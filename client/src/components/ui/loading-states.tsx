import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Skeleton rows for use inside an existing <TableBody>. Keeps the table
 * header visible while data loads so the layout doesn't jump.
 */
export function TableSkeletonRows({ rows = 5, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * Stacked row skeletons for card/list layouts.
 */
export function ListSkeleton({
  rows = 4,
  rowHeight = "h-14",
  className,
}: {
  rows?: number;
  rowHeight?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-lg", rowHeight)} />
      ))}
    </div>
  );
}
