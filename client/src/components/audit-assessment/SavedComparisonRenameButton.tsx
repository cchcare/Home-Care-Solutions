/**
 * Pencil-icon "rename" button + dialog for a saved audit comparison.
 *
 * Extracted from `client/src/pages/audit-assessment.tsx` so the rename flow
 * can be unit-tested in isolation (the page itself is ~4400 lines and pulls
 * in many other queries). Behavior matches the previous inline JSX exactly:
 *   - Click pencil -> dialog opens with the current name pre-filled
 *   - Edit text -> Enter or "Rename" button submits PATCH /api/doh-saved-comparisons/:id
 *   - On success -> the saved-comparisons query is invalidated, a toast fires,
 *     and the dialog closes.
 */

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SavedComparisonRenameButtonProps {
  comparisonId: string;
  currentName: string;
  /** Used so the saved-comparisons list query for this office is invalidated on success. */
  officeId: string;
}

export function SavedComparisonRenameButton({
  comparisonId,
  currentName,
  officeId,
}: SavedComparisonRenameButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);

  const renameMutation = useMutation({
    mutationFn: ({ id, name: newName }: { id: string; name: string }) =>
      apiRequest("PATCH", `/api/doh-saved-comparisons/${id}`, { name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doh-saved-comparisons", officeId] });
      toast({ title: "Comparison renamed" });
      setOpen(false);
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to rename saved comparison.",
        variant: "destructive",
      }),
  });

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !renameMutation.isPending;

  function submit() {
    if (!canSubmit) return;
    renameMutation.mutate({ id: comparisonId, name: trimmed });
  }

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => {
          setName(currentName);
          setOpen(true);
        }}
        title="Rename saved comparison"
        data-testid={`button-rename-saved-comparison-${comparisonId}`}
      >
        <Pencil size={13} />
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename comparison</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="rename-saved-comparison-input" className="text-sm mb-1.5 block">
              New name
            </Label>
            <Input
              id="rename-saved-comparison-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Enter a new name"
              data-testid="input-rename-saved-comparison"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={renameMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!canSubmit}
              data-testid="button-confirm-rename-saved-comparison"
            >
              {renameMutation.isPending ? "Saving…" : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
