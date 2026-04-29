import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
  description?: string;
};

interface MultiSelectPopoverProps {
  label: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  testId?: string;
  disabled?: boolean;
}

export function MultiSelectPopover({
  label,
  options,
  values,
  onChange,
  placeholder,
  searchPlaceholder = "Search…",
  className,
  testId,
  disabled,
}: MultiSelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q)
    );
  }, [options, search]);

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const buttonLabel =
    values.length === 0
      ? placeholder ?? label
      : values.length === 1
        ? options.find((o) => o.value === values[0])?.label ?? "1 selected"
        : `${values.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("justify-between min-w-[160px]", className)}
          data-testid={testId}
        >
          <span className="truncate">{buttonLabel}</span>
          {values.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {values.length}
            </Badge>
          )}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 border-0 focus-visible:ring-0 p-0 text-sm"
            data-testid={testId ? `${testId}-search` : undefined}
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              No options
            </p>
          ) : (
            filtered.map((opt) => {
              const checked = values.includes(opt.value);
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
                  data-testid={testId ? `${testId}-option-${opt.value}` : undefined}
                >
                  <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
                  <span className="flex-1">
                    <span className="block">{opt.label}</span>
                    {opt.description && (
                      <span className="text-xs text-muted-foreground">{opt.description}</span>
                    )}
                  </span>
                  {checked && <Check className="h-3 w-3 text-primary mt-1" />}
                </button>
              );
            })
          )}
        </div>
        {values.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                onChange([]);
                setSearch("");
              }}
              data-testid={testId ? `${testId}-clear` : undefined}
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
