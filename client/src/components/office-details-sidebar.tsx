import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  UserCheck,
  Edit,
  Trash2,
  Settings,
  Clock,
  BarChart3,
  FileText,
  Calendar,
  AlertCircle,
} from "lucide-react";
import type { Office } from "@shared/schema";

interface OfficeDetailsSidebarProps {
  office: Office | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (office: Office) => void;
  onDelete: (officeId: string) => void;
}

export function OfficeDetailsSidebar({
  office,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: OfficeDetailsSidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get office-specific data
  const { data: officeClients } = useQuery({
    queryKey: ["/api/clients", { officeId: office?.id }],
    enabled: !!office?.id,
    retry: false,
  });

  const { data: officeCaregivers } = useQuery({
    queryKey: ["/api/caregivers", { officeId: office?.id }],
    enabled: !!office?.id,
    retry: false,
  });

  if (!office) return null;

  const handleEditClick = () => {
    onEdit(office);
    onClose();
  };

  const handleDeleteClick = () => {
    if (confirm(`Are you sure you want to delete ${office.name}? This action cannot be undone.`)) {
      onDelete(office.id);
      onClose();
    }
  };

  const clientCount = Array.isArray(officeClients) ? officeClients.length : 0;
  const caregiverCount = Array.isArray(officeCaregivers) ? officeCaregivers.length : 0;

  const menuItems = [
    {
      label: "View All Clients",
      icon: Users,
      count: clientCount,
      action: () => {
        // Navigate to clients filtered by this office
        window.location.href = `/clients?office=${office.id}`;
      },
    },
    {
      label: "View All Caregivers",
      icon: UserCheck,
      count: caregiverCount,
      action: () => {
        // Navigate to caregivers filtered by this office
        window.location.href = `/caregivers?office=${office.id}`;
      },
    },
    {
      label: "Office Reports",
      icon: BarChart3,
      action: () => {
        // Navigate to reports filtered by this office
        window.location.href = `/reports?office=${office.id}`;
      },
    },
    {
      label: "Documents",
      icon: FileText,
      action: () => {
        // Navigate to documents filtered by this office
        window.location.href = `/documents?office=${office.id}`;
      },
    },
    {
      label: "Compliance",
      icon: AlertCircle,
      action: () => {
        // Navigate to compliance filtered by this office
        window.location.href = `/compliance?office=${office.id}`;
      },
    },
    {
      label: "Office Settings",
      icon: Settings,
      action: () => {
        handleEditClick();
      },
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-96 overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-6 h-6 text-primary" />
              <SheetTitle className="text-xl" data-testid={`text-office-sidebar-title-${office.id}`}>
                {office.name}
              </SheetTitle>
            </div>
            <Badge variant={office.isActive ? "default" : "secondary"}>
              {office.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <SheetDescription>
            Manage and view details for this office location
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Office Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Office Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {office.address && (
                <div className="flex items-start space-x-2 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span data-testid={`text-office-sidebar-address-${office.id}`}>
                    {office.address}
                  </span>
                </div>
              )}
              
              {office.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span data-testid={`text-office-sidebar-phone-${office.id}`}>
                    {office.phone}
                  </span>
                </div>
              )}
              
              {office.email && (
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span data-testid={`text-office-sidebar-email-${office.id}`}>
                    {office.email}
                  </span>
                </div>
              )}
              
              {office.timezone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span data-testid={`text-office-sidebar-timezone-${office.id}`}>
                    {office.timezone}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary" data-testid={`text-office-sidebar-clients-${office.id}`}>
                    {clientCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Clients</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-accent" data-testid={`text-office-sidebar-caregivers-${office.id}`}>
                    {caregiverCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Caregivers</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Menu Items */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Office Menu
            </h3>
            {menuItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start h-auto p-3"
                onClick={item.action}
                data-testid={`button-office-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}-${office.id}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {item.count}
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Actions
            </h3>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleEditClick}
                data-testid={`button-office-sidebar-edit-${office.id}`}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:text-destructive"
                onClick={handleDeleteClick}
                data-testid={`button-office-sidebar-delete-${office.id}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}