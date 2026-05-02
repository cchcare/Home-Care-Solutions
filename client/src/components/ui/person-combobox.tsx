import * as React from "react";
import { Check, ChevronsUpDown, ArrowDownAZ } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type Person = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
};

type Props<T extends Person> = {
  people: T[];
  value: string | null | undefined;
  onValueChange: (id: string) => void;
  placeholder?: string;
  emptyOption?: { value: string; label: string };
  disabled?: boolean;
  testId?: string;
  triggerClassName?: string;
  contentClassName?: string;
  renderExtra?: (p: T) => React.ReactNode;
};

export function PersonCombobox<T extends Person>({
  people,
  value,
  onValueChange,
  placeholder = "Select...",
  emptyOption,
  disabled,
  testId,
  triggerClassName,
  contentClassName,
  renderExtra,
}: Props<T>) {
  const [open, setOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"last" | "first">("last");

  const sorted = React.useMemo(() => {
    const list = [...people];
    list.sort((a, b) => {
      const ak =
        sortBy === "last"
          ? `${a.lastName ?? ""} ${a.firstName ?? ""}`
          : `${a.firstName ?? ""} ${a.lastName ?? ""}`;
      const bk =
        sortBy === "last"
          ? `${b.lastName ?? ""} ${b.firstName ?? ""}`
          : `${b.firstName ?? ""} ${b.lastName ?? ""}`;
      return ak.localeCompare(bk, undefined, { sensitivity: "base" });
    });
    return list;
  }, [people, sortBy]);

  const formatName = (p: T) => {
    const first = (p.firstName ?? "").trim();
    const last = (p.lastName ?? "").trim();
    if (sortBy === "last") {
      if (last && first) return `${last}, ${first}`;
      return last || first || "(no name)";
    }
    return [first, last].filter(Boolean).join(" ") || "(no name)";
  };

  const selected =
    value && (!emptyOption || value !== emptyOption.value)
      ? people.find((p) => p.id === value) ?? null
      : null;

  const triggerLabel = selected
    ? formatName(selected)
    : emptyOption && value === emptyOption.value
      ? emptyOption.label
      : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "w-full justify-between font-normal",
            !selected && !(emptyOption && value === emptyOption.value) && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[--radix-popover-trigger-width] p-0", contentClassName)}
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search by name..." />
          <div className="flex items-center justify-end px-2 py-1 border-b">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSortBy((s) => (s === "last" ? "first" : "last"))}
              data-testid={testId ? `${testId}-sort` : undefined}
            >
              <ArrowDownAZ className="h-3 w-3 mr-1" />
              Sort: {sortBy === "last" ? "Last name" : "First name"}
            </Button>
          </div>
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {emptyOption && (
                <CommandItem
                  key={emptyOption.value}
                  value={`__${emptyOption.label}`}
                  onSelect={() => {
                    onValueChange(emptyOption.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === emptyOption.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {emptyOption.label}
                </CommandItem>
              )}
              {sorted.map((p) => {
                const first = (p.firstName ?? "").trim();
                const last = (p.lastName ?? "").trim();
                const search = `${last} ${first} ${first} ${last} ${p.id}`;
                return (
                  <CommandItem
                    key={p.id}
                    value={search}
                    onSelect={() => {
                      onValueChange(p.id);
                      setOpen(false);
                    }}
                    data-testid={testId ? `${testId}-option-${p.id}` : undefined}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === p.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate flex-1">{formatName(p)}</span>
                    {renderExtra && (
                      <span className="ml-2 text-xs text-muted-foreground shrink-0">
                        {renderExtra(p)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
