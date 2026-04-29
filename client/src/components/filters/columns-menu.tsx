import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ColumnDef = { key: string; label: string };

interface ColumnsMenuProps {
  columns: ColumnDef[];
  visibility: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  testId?: string;
}

export function ColumnsMenu({ columns, visibility, onChange, testId }: ColumnsMenuProps) {
  const isVisible = (key: string) => visibility[key] !== false;
  const toggle = (key: string) => {
    onChange({ ...visibility, [key]: !isVisible(key) });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" data-testid={testId ?? "button-columns-menu"}>
          <Columns3 className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
          {columns.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => toggle(c.key)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/60 rounded"
              data-testid={`columns-menu-toggle-${c.key}`}
            >
              <Checkbox checked={isVisible(c.key)} className="pointer-events-none" />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
