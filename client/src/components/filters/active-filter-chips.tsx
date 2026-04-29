import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type FilterChip = {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
};

interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onClearAll?: () => void;
  className?: string;
}

export function ActiveFilterChips({ chips, onClearAll, className }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div className={className ?? "flex flex-wrap items-center gap-2"} data-testid="active-filter-chips">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 pr-1"
          data-testid={`chip-${chip.key}`}
        >
          <span className="text-xs">
            <span className="font-medium">{chip.label}:</span> {chip.value}
          </span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove filter ${chip.label}`}
            className="ml-1 rounded hover:bg-muted-foreground/20 p-0.5"
            data-testid={`chip-${chip.key}-remove`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {onClearAll && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onClearAll}
          data-testid="chips-clear-all"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
