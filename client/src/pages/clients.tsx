import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { AddClientModal } from "@/components/add-client-modal";
import { ClientProfileModal } from "@/components/client-profile-modal";
import { OcrUploadDialog } from "@/components/ocr-upload-dialog";
import { OfficeSelector } from "@/components/office-selector";
import { useOffice } from "@/context/office-context";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Edit, 
  Users,
  Phone,
  Calendar,
  Scan,
  CheckSquare,
  ClipboardList
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Client, Office, Coordinator, Mco } from "@shared/schema";
import { ExcelImport } from "@/components/excel-import";
import { ExcelExport } from "@/components/excel-export";

function BulkUpdateModal({
  isOpen,
  onClose,
  selectedCount,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onSubmit: (updates: Record<string, string>) => void;
  isLoading: boolean;
}) {
  const [applyOffice, setApplyOffice] = useState(false);
  const [applyCoordinator, setApplyCoordinator] = useState(false);
  const [applyMco, setApplyMco] = useState(false);
  const [applyStatus, setApplyStatus] = useState(false);

  const [officeId, setOfficeId] = useState<string>("");
  const [coordinatorId, setCoordinatorId] = useState<string>("");
  const [mcoId, setMcoId] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
    queryFn: () => fetch("/api/offices").then(r => r.json()),
    enabled: isOpen,
  });

  const { data: coordinators = [] } = useQuery<Coordinator[]>({
    queryKey: ["/api/coordinators"],
    queryFn: () => fetch("/api/coordinators").then(r => r.json()),
    enabled: isOpen,
  });

  const { data: mcos = [] } = useQuery<Mco[]>({
    queryKey: ["/api/mcos"],
    queryFn: () => fetch("/api/mcos").then(r => r.json()),
    enabled: isOpen,
  });

  const handleSubmit = () => {
    const updates: Record<string, string> = {};
    if (applyOffice && officeId && officeId !== "__none__") updates.officeId = officeId;
    if (applyCoordinator && coordinatorId && coordinatorId !== "__none__") updates.coordinatorId = coordinatorId;
    if (applyMco && mcoId && mcoId !== "__none__") updates.mcoId = mcoId;
    if (applyStatus && status && status !== "__none__") updates.status = status;
    
    if (Object.keys(updates).length === 0) {
      return;
    }
    onSubmit(updates);
  };

  const handleClose = () => {
    setApplyOffice(false);
    setApplyCoordinator(false);
    setApplyMco(false);
    setApplyStatus(false);
    setOfficeId("");
    setCoordinatorId("");
    setMcoId("");
    setStatus("");
    onClose();
  };

  const hasSelection = applyOffice || applyCoordinator || applyMco || applyStatus;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Update {selectedCount} Client{selectedCount > 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
              id="apply-coordinator"
              checked={applyCoordinator}
              onCheckedChange={(checked) => setApplyCoordinator(!!checked)}
              data-testid="checkbox-apply-coordinator"
            />
            <div className="flex-1">
              <Label htmlFor="apply-coordinator" className="font-medium">Coordinator</Label>
              <Select
                value={coordinatorId}
                onValueChange={setCoordinatorId}
                disabled={!applyCoordinator}
              >
                <SelectTrigger className="mt-1" data-testid="select-bulk-coordinator">
                  <SelectValue placeholder="Select coordinator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select coordinator</SelectItem>
                  {coordinators.map((coord) => (
                    <SelectItem key={coord.id} value={coord.id}>
                      {coord.firstName} {coord.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="apply-mco"
              checked={applyMco}
              onCheckedChange={(checked) => setApplyMco(!!checked)}
              data-testid="checkbox-apply-mco"
            />
            <div className="flex-1">
              <Label htmlFor="apply-mco" className="font-medium">MCO</Label>
              <Select
                value={mcoId}
                onValueChange={setMcoId}
                disabled={!applyMco}
              >
                <SelectTrigger className="mt-1" data-testid="select-bulk-mco">
                  <SelectValue placeholder="Select MCO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select MCO</SelectItem>
                  {mcos.map((mco) => (
                    <SelectItem key={mco.id} value={mco.id}>
                      {mco.name}
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
                value={status}
                onValueChange={setStatus}
                disabled={!applyStatus}
              >
                <SelectTrigger className="mt-1" data-testid="select-bulk-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
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
            disabled={isLoading || !hasSelection}
            data-testid="button-submit-bulk-update"
          >
            {isLoading ? "Updating..." : "Update Clients"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOcrDialog, setShowOcrDialog] = useState(false);
  const [ocrExtractedData, setOcrExtractedData] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [mcoFilter, setMcoFilter] = useState("all");
  const [sortOption, setSortOption] = useState("nameAsc");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOfficeId, setSelectedOfficeId } = useOffice();
  const [, navigate] = useLocation();

  const { data: mcos = [] } = useQuery<Mco[]>({
    queryKey: ["/api/mcos"],
    queryFn: () => fetch("/api/mcos").then(r => r.json()),
  });

  const { data: coordinators = [] } = useQuery<Coordinator[]>({
    queryKey: ["/api/coordinators"],
    queryFn: () => fetch("/api/coordinators").then(r => r.json()),
  });

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (selectedOfficeId !== "all") params.append("officeId", selectedOfficeId);
    if (mcoFilter !== "all") params.append("mcoId", mcoFilter);
    if (searchTerm.trim()) params.append("search", searchTerm.trim());
    const sortField = sortOption.startsWith("name") ? "name" : "serviceStartDate";
    const sortDirection = sortOption.endsWith("Asc") ? "asc" : "desc";
    params.append("sortField", sortField);
    params.append("sortDirection", sortDirection);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  };

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients", selectedOfficeId, mcoFilter, sortOption, searchTerm],
    queryFn: () => fetch(`/api/clients${buildQueryString()}`).then(r => r.json()),
    retry: false,
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await apiRequest("POST", "/api/clients", clientData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setShowAddModal(false);
      toast({
        title: "Success",
        description: "Client added successfully",
      });
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
        description: "Failed to add client",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/clients/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setSelectedClient(null);
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
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
        description: "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ clientIds, updates }: { clientIds: string[]; updates: Record<string, string> }) => {
      const response = await apiRequest("POST", "/api/clients/bulk-update", { clientIds, updates });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setShowBulkUpdateModal(false);
      setSelectedClientIds(new Set());
      toast({
        title: "Success",
        description: `${data.length} client${data.length > 1 ? "s" : ""} updated successfully`,
      });
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
        description: "Failed to bulk update clients",
        variant: "destructive",
      });
    },
  });

  const handleAddClient = (clientData: any) => {
    createClientMutation.mutate(clientData);
  };

  const handleUpdateClient = (clientData: any) => {
    if (selectedClient) {
      updateClientMutation.mutate({ id: selectedClient.id, data: clientData });
    }
  };

  const handleBulkUpdate = (updates: Record<string, string>) => {
    bulkUpdateMutation.mutate({
      clientIds: Array.from(selectedClientIds),
      updates,
    });
  };

  const filteredClients = (() => {
    let result = clients?.filter((client: Client) => {
      const matchesSearch = searchTerm === "" || 
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm);
      const matchesMco = mcoFilter === "all" || client.mcoId === mcoFilter;
      return matchesSearch && matchesMco;
    }) || [];

    result.sort((a, b) => {
      if (sortOption === "nameAsc") {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      } else if (sortOption === "nameDesc") {
        return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
      } else if (sortOption === "dateDesc") {
        const dateA = a.serviceStartDate ? new Date(a.serviceStartDate).getTime() : 0;
        const dateB = b.serviceStartDate ? new Date(b.serviceStartDate).getTime() : 0;
        return dateB - dateA;
      } else if (sortOption === "dateAsc") {
        const dateA = a.serviceStartDate ? new Date(a.serviceStartDate).getTime() : 0;
        const dateB = b.serviceStartDate ? new Date(b.serviceStartDate).getTime() : 0;
        return dateA - dateB;
      }
      return 0;
    });

    return result;
  })();

  const toggleClientSelection = (clientId: string) => {
    const newSet = new Set(selectedClientIds);
    if (newSet.has(clientId)) {
      newSet.delete(clientId);
    } else {
      newSet.add(clientId);
    }
    setSelectedClientIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedClientIds.size === filteredClients.length) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  const isAllSelected = filteredClients.length > 0 && selectedClientIds.size === filteredClients.length;
  const isSomeSelected = selectedClientIds.size > 0 && selectedClientIds.size < filteredClients.length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Client Management"
          subtitle="Manage client profiles and care information"
        />
        
        {/* Header */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <OfficeSelector
              selectedOfficeId={selectedOfficeId === "all" ? undefined : selectedOfficeId}
              onOfficeChange={setSelectedOfficeId}
              showAllOption={true}
            />
          </div>
          <div className="flex items-center space-x-2">
            <ExcelExport type="clients" data={clients || []} disabled={isLoading} />
            <ExcelImport 
              type="clients" 
              officeId={selectedOfficeId !== "all" ? selectedOfficeId : undefined}
              onImportComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
                queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
              }} 
            />
            <ExcelImport 
              type="authorizations" 
              officeId={selectedOfficeId !== "all" ? selectedOfficeId : undefined}
              onImportComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/authorizations"] });
                queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
              }} 
            />
            <Button variant="outline" onClick={() => setShowOcrDialog(true)} data-testid="button-scan-client">
              <Scan className="w-4 h-4 mr-2" />
              Scan Document
            </Button>
            <Link href="/client-intake">
              <Button variant="outline" data-testid="button-client-intake">
                <ClipboardList className="w-4 h-4 mr-2" />
                Client Intake
              </Button>
            </Link>
            <Button onClick={() => setShowAddModal(true)} data-testid="button-add-client">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Bulk Actions Bar */}
            {selectedClientIds.size > 0 && (
              <Card className="bg-primary/10 border-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckSquare className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground" data-testid="text-selected-count">
                        {selectedClientIds.size} client{selectedClientIds.size > 1 ? "s" : ""} selected
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClientIds(new Set())}
                        data-testid="button-clear-selection"
                      >
                        Clear Selection
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowBulkUpdateModal(true)}
                        data-testid="button-bulk-update"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Bulk Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search clients by name or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-clients"
                    />
                  </div>
                  <Select value={mcoFilter} onValueChange={setMcoFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-mco-filter">
                      <SelectValue placeholder="Filter by MCO" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All MCOs</SelectItem>
                      {mcos.map((mco) => (
                        <SelectItem key={mco.id} value={mco.id}>
                          {mco.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-[180px]" data-testid="select-sort-option">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nameAsc">Name (A-Z)</SelectItem>
                      <SelectItem value="nameDesc">Name (Z-A)</SelectItem>
                      <SelectItem value="dateDesc">Start Date (Newest)</SelectItem>
                      <SelectItem value="dateAsc">Start Date (Oldest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Client Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-clients">
                        {clients?.length || 0}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-active-clients-count">
                        {clients?.filter((c: Client) => c.status === "active").length || 0}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-accent-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-new-clients-month">
                        {clients?.filter((c: Client) => {
                          const createdAt = new Date(c.createdAt!);
                          const now = new Date();
                          return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
                        }).length || 0}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clients Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Clients</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="w-12 p-4">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all clients"
                            data-testid="checkbox-select-all"
                            className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                          />
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client Information</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Start Date</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">MCO</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Phone Number</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Coordinator</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            Loading clients...
                          </td>
                        </tr>
                      ) : filteredClients.length > 0 ? (
                        filteredClients.map((client: Client) => {
                          const mcoName = client.mcoId ? mcos.find((m) => m.id === client.mcoId)?.name : null;
                          const coordinator = client.coordinatorId ? coordinators.find((c) => c.id === client.coordinatorId) : null;
                          const coordinatorName = coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : null;
                          return (
                          <tr key={client.id} className="hover:bg-muted/25 transition-colors" data-testid={`row-client-details-${client.id}`}>
                            <td className="p-4">
                              <Checkbox
                                checked={selectedClientIds.has(client.id)}
                                onCheckedChange={() => toggleClientSelection(client.id)}
                                aria-label={`Select ${client.firstName} ${client.lastName}`}
                                data-testid={`checkbox-select-client-${client.id}`}
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-primary-foreground font-medium">
                                    {client.firstName?.[0]}{client.lastName?.[0]}
                                  </span>
                                </div>
                                <div>
                                  <p 
                                    className="font-medium text-foreground hover:text-primary cursor-pointer hover:underline" 
                                    onClick={() => navigate(`/clients/${client.id}`)}
                                    data-testid={`text-full-client-name-${client.id}`}
                                  >
                                    {client.firstName} {client.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground" data-testid={`text-client-dob-${client.id}`}>
                                    DOB: {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "Not provided"}
                                  </p>
                                  <p className="text-xs text-muted-foreground" data-testid={`text-client-member-id-${client.id}`}>
                                    Member ID: {client.memberId || "Not provided"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-sm text-foreground" data-testid={`text-client-start-date-${client.id}`}>
                                {client.serviceStartDate ? new Date(client.serviceStartDate).toLocaleDateString() : "Not set"}
                              </p>
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant={client.status === "active" ? "default" : "secondary"}
                                data-testid={`badge-detailed-client-status-${client.id}`}
                              >
                                {client.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <p className="text-sm text-foreground" data-testid={`text-client-mco-${client.id}`}>
                                {mcoName || <span className="text-muted-foreground">—</span>}
                              </p>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <p className="text-sm text-foreground" data-testid={`text-client-phone-${client.id}`}>
                                  {client.phone || <span className="text-muted-foreground">Not provided</span>}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-sm text-foreground" data-testid={`text-client-coordinator-${client.id}`}>
                                {coordinatorName || <span className="text-muted-foreground">Unassigned</span>}
                              </p>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => navigate(`/clients/${client.id}`)}
                                  data-testid={`button-view-client-details-${client.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => navigate(`/clients/${client.id}`)}
                                  data-testid={`button-edit-client-details-${client.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            {searchTerm ? "No clients found matching your search" : "No clients found"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddClientModal 
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setOcrExtractedData(null);
        }}
        onSubmit={handleAddClient}
        isLoading={createClientMutation.isPending}
        initialData={ocrExtractedData}
      />

      <ClientProfileModal 
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        onUpdate={handleUpdateClient}
        isLoading={updateClientMutation.isPending}
      />

      <OcrUploadDialog
        isOpen={showOcrDialog}
        onClose={() => setShowOcrDialog(false)}
        type="client"
        onDataExtracted={(data) => {
          setOcrExtractedData(data);
          setShowOcrDialog(false);
          setShowAddModal(true);
          toast({
            title: "Data Extracted",
            description: "Document scanned successfully. Please review and complete the form.",
          });
        }}
      />

      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        selectedCount={selectedClientIds.size}
        onSubmit={handleBulkUpdate}
        isLoading={bulkUpdateMutation.isPending}
      />
    </div>
  );
}
