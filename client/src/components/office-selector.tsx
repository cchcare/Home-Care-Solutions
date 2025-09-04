import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import type { Office } from "@shared/schema";

interface OfficeSelectorProps {
  selectedOfficeId?: string;
  onOfficeChange: (officeId: string) => void;
  showAllOption?: boolean;
}

export function OfficeSelector({ 
  selectedOfficeId, 
  onOfficeChange, 
  showAllOption = true 
}: OfficeSelectorProps) {
  const { data: offices, isLoading } = useQuery({
    queryKey: ["/api/offices"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Building2 className="w-4 h-4" />
        <span>Loading offices...</span>
      </div>
    );
  }

  const activeOffices = offices?.filter((office: Office) => office.isActive) || [];

  return (
    <div className="flex items-center space-x-2">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedOfficeId || "all"} onValueChange={onOfficeChange}>
        <SelectTrigger className="w-48" data-testid="select-office">
          <SelectValue placeholder="Select office..." />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">
              All Offices
              <Badge variant="secondary" className="ml-2 text-xs">
                {activeOffices.length}
              </Badge>
            </SelectItem>
          )}
          {activeOffices.map((office: Office) => (
            <SelectItem key={office.id} value={office.id}>
              {office.name}
            </SelectItem>
          ))}
          {activeOffices.length === 0 && (
            <SelectItem value="none" disabled>
              No offices available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}