import { useState } from "react";
import { Bookmark, BookmarkPlus, Check, Pencil, Trash2, X } from "lucide-react";
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

interface SavedViewsMenuProps {
  views: UserSavedView[];
  currentFilters: Record<string, unknown>;
  onApply: (filters: Record<string, unknown>) => void;
  onSave: (input: { name: string; filters: Record<string, unknown> }) => void | Promise<unknown>;
  onDelete: (id: string) => void | Promise<unknown>;
  onRename?: (input: { id: string; name: string }) => void | Promise<unknown>;
  testId?: string;
}

export function SavedViewsMenu({
  views,
  currentFilters,
  onApply,
  onSave,
  onDelete,
  onRename,
  testId,
}: SavedViewsMenuProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

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
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Saved views</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-56 overflow-y-auto p-1">
          {views.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground text-center">
              No saved views yet.
            </p>
          ) : (
            views.map((v) => {
              const isRenaming = renamingId === v.id;
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
                  className="flex items-center gap-1 px-1 py-1 hover:bg-muted/60 rounded"
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
                        className="flex-1 text-left text-sm px-2 py-1 truncate"
                        onClick={() => {
                          onApply((v.filters as Record<string, unknown>) ?? {});
                          setOpen(false);
                        }}
                        data-testid={`saved-view-apply-${v.id}`}
                      >
                        {v.name}
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
