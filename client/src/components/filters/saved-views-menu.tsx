import { useMemo, useState } from "react";
import { Bookmark, BookmarkPlus, Check, Pencil, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { UserSavedView } from "@shared/schema";

type SortMode = "name" | "recent";

interface SavedViewsMenuProps {
  views: UserSavedView[];
  currentFilters: Record<string, unknown>;
  onApply: (filters: Record<string, unknown>) => void;
  onSave: (input: { name: string; filters: Record<string, unknown> }) => void | Promise<unknown>;
  onDelete: (id: string) => void | Promise<unknown>;
  onRename?: (input: { id: string; name: string }) => void | Promise<unknown>;
  onMarkUsed?: (id: string) => void | Promise<unknown>;
  testId?: string;
}

function normalizeFilters(filters: unknown): string {
  if (!filters || typeof filters !== "object") return "{}";
  const entries = Object.entries(filters as Record<string, unknown>)
    .filter(([, v]) => {
      if (v === undefined || v === null || v === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    })
    .map(([k, v]) => {
      const val = Array.isArray(v) ? [...v].sort() : v;
      return [k, val] as const;
    })
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

export function SavedViewsMenu({
  views,
  currentFilters,
  onApply,
  onSave,
  onDelete,
  onRename,
  onMarkUsed,
  testId,
}: SavedViewsMenuProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");

  const currentKey = useMemo(() => normalizeFilters(currentFilters), [currentFilters]);

  const activeViewId = useMemo(() => {
    const match = views.find((v) => normalizeFilters(v.filters) === currentKey);
    return match?.id ?? null;
  }, [views, currentKey]);

  const visibleViews = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? views.filter((v) => v.name.toLowerCase().includes(q))
      : views.slice();
    if (sortMode === "recent") {
      filtered.sort((a, b) => {
        const at = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bt = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        if (bt !== at) return bt - at;
        return a.name.localeCompare(b.name);
      });
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered;
  }, [views, search, sortMode]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Name required", description: "Please enter a name for this view.", variant: "destructive" });
      return;
    }
    if (trimmed === "__default") {
      toast({ title: "Reserved name", description: "That name is reserved.", variant: "destructive" });
      return;
    }
    try {
      await onSave({ name: trimmed, filters: currentFilters });
      toast({ title: "View saved", description: `"${trimmed}" has been saved.` });
      setName("");
      setOpen(false);
    } catch (e) {
      toast({ title: "Failed to save view", description: String(e), variant: "destructive" });
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" data-testid={testId ?? "button-saved-views"}>
          <Bookmark className="h-4 w-4 mr-2" />
          Saved views
          {views.length > 0 && (
            <span className="ml-2 rounded bg-muted px-1.5 text-xs">{views.length}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Saved views</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {views.length > 0 && (
          <div className="p-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search views..."
                className="h-8 pl-7"
                data-testid="saved-view-search-input"
              />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Sort:</span>
              <Button
                type="button"
                variant={sortMode === "name" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSortMode("name")}
                data-testid="saved-view-sort-name"
              >
                Name
              </Button>
              <Button
                type="button"
                variant={sortMode === "recent" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSortMode("recent")}
                data-testid="saved-view-sort-recent"
              >
                Recently used
              </Button>
            </div>
          </div>
        )}
        <div className="max-h-56 overflow-y-auto p-1">
          {views.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground text-center">
              No saved views yet.
            </p>
          ) : visibleViews.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground text-center">
              No views match "{search}".
            </p>
          ) : (
            visibleViews.map((v) => {
              const isRenaming = renamingId === v.id;
              const isActive = v.id === activeViewId;
              const commitRename = async () => {
                const trimmed = renameValue.trim();
                if (!trimmed) {
                  toast({ title: "Name required", variant: "destructive" });
                  return;
                }
                if (trimmed === "__default") {
                  toast({ title: "Reserved name", variant: "destructive" });
                  return;
                }
                if (trimmed === v.name) {
                  setRenamingId(null);
                  return;
                }
                if (!onRename) return;
                try {
                  await onRename({ id: v.id, name: trimmed });
                  toast({ title: "View renamed", description: `Renamed to "${trimmed}".` });
                  setRenamingId(null);
                } catch (e) {
                  toast({ title: "Failed to rename view", description: String(e), variant: "destructive" });
                }
              };
              return (
                <div
                  key={v.id}
                  className={`flex items-center gap-1 px-1 py-1 hover:bg-muted/60 rounded ${isActive ? "bg-muted/40" : ""}`}
                  data-testid={`saved-view-row-${v.id}`}
                >
                  {isRenaming ? (
                    <>
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-7 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setRenamingId(null);
                          }
                        }}
                        data-testid={`saved-view-rename-input-${v.id}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={commitRename}
                        aria-label="Confirm rename"
                        data-testid={`saved-view-rename-confirm-${v.id}`}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRenamingId(null)}
                        aria-label="Cancel rename"
                        data-testid={`saved-view-rename-cancel-${v.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="flex-1 flex items-center gap-1.5 text-left text-sm px-2 py-1 min-w-0"
                        onClick={() => {
                          onApply((v.filters as Record<string, unknown>) ?? {});
                          if (onMarkUsed) {
                            Promise.resolve(onMarkUsed(v.id)).catch(() => {});
                          }
                          setOpen(false);
                        }}
                        data-testid={`saved-view-apply-${v.id}`}
                      >
                        {isActive && (
                          <Check
                            className="h-3.5 w-3.5 text-primary flex-shrink-0"
                            aria-label="Current view"
                            data-testid={`saved-view-active-${v.id}`}
                          />
                        )}
                        <span className="truncate">{v.name}</span>
                        {isActive && (
                          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground flex-shrink-0">
                            Active
                          </span>
                        )}
                      </button>
                      {onRename && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(v.id);
                            setRenameValue(v.name);
                          }}
                          aria-label={`Rename view ${v.name}`}
                          data-testid={`saved-view-rename-${v.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onDelete(v.id);
                        }}
                        aria-label={`Delete view ${v.name}`}
                        data-testid={`saved-view-delete-${v.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2 space-y-2">
          <p className="text-xs text-muted-foreground">Save current filters as a view</p>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="View name"
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              data-testid="saved-view-name-input"
            />
            <Button size="sm" onClick={handleSave} data-testid="saved-view-save-button">
              <BookmarkPlus className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
