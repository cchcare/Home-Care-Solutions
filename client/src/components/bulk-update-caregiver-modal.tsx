import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Office } from "@shared/schema";

interface BulkUpdateCaregiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  caregiverIds: string[];
  onSuccess: () => void;
}

export function BulkUpdateCaregiverModal({
  isOpen,
  onClose,
  caregiverIds,
  onSuccess,
}: BulkUpdateCaregiverModalProps) {
  const { toast } = useToast();
  const [applyOffice, setApplyOffice] = useState(false);
  const [applyStatus, setApplyStatus] = useState(false);

  const [officeId, setOfficeId] = useState<string>("");
  const [isActive, setIsActive] = useState<string>("");

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
    queryFn: () => fetch("/api/offices").then(r => r.json()),
    enabled: isOpen,
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const response = await apiRequest("POST", "/api/caregivers/bulk-update", {
        caregiverIds,
        updates,
      });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: `${result.updated} caregiver(s) updated successfully`,
      });
      handleClose();
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update caregivers",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const updates: Record<string, any> = {};
    if (applyOffice && officeId && officeId !== "__none__") {
      updates.officeId = officeId;
    }
    if (applyStatus && isActive && isActive !== "__none__") {
      updates.isActive = isActive === "true";
    }

    if (Object.keys(updates).length === 0) {
      return;
    }
    bulkUpdateMutation.mutate(updates);
  };

  const handleClose = () => {
    setApplyOffice(false);
    setApplyStatus(false);
    setOfficeId("");
    setIsActive("");
    onClose();
  };

  const hasSelection = applyOffice || applyStatus;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Bulk Update {caregiverIds.length} Caregiver{caregiverIds.length > 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Select the fields you want to update and choose their new values.
          </p>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="apply-office"
              checked={applyOffice}
              onCheckedChange={(checked) => setApplyOffice(!!checked)}
              data-testid="checkbox-apply-office"
            />
            <div className="flex-1">
              <Label htmlFor="apply-office" className="font-medium">Office</Label>
              <Select
                value={officeId}
                onValueChange={setOfficeId}
                disabled={!applyOffice}
              >
                <SelectTrigger className="mt-1" data-testid="select-bulk-office">
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select office</SelectItem>
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="apply-status"
              checked={applyStatus}
              onCheckedChange={(checked) => setApplyStatus(!!checked)}
              data-testid="checkbox-apply-status"
            />
            <div className="flex-1">
              <Label htmlFor="apply-status" className="font-medium">Status</Label>
              <Select
                value={isActive}
                onValueChange={setIsActive}
                disabled={!applyStatus}
              >
                <SelectTrigger className="mt-1" data-testid="select-bulk-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-bulk-update">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasSelection || bulkUpdateMutation.isPending}
            data-testid="button-submit-bulk-update"
          >
            {bulkUpdateMutation.isPending ? "Updating..." : "Update Caregivers"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
