import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Plus, 
  Search, 
  Download, 
  Eye, 
  Edit, 
  Users,
  Phone,
  Calendar,
  Scan
} from "lucide-react";
import { useLocation } from "wouter";
import type { Client } from "@shared/schema";
import { ExcelImport } from "@/components/excel-import";
import { ExcelExport } from "@/components/excel-export";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOcrDialog, setShowOcrDialog] = useState(false);
  const [ocrExtractedData, setOcrExtractedData] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOfficeId, setSelectedOfficeId } = useOffice();
  const [, navigate] = useLocation();

  const officeQuery = selectedOfficeId !== "all" ? `?officeId=${selectedOfficeId}` : "";

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients", selectedOfficeId, searchTerm],
    queryFn: () => fetch(`/api/clients${officeQuery}`).then(r => r.json()),
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

  const handleAddClient = (clientData: any) => {
    createClientMutation.mutate(clientData);
  };

  const handleUpdateClient = (clientData: any) => {
    if (selectedClient) {
      updateClientMutation.mutate({ id: selectedClient.id, data: clientData });
    }
  };

  const filteredClients = clients?.filter((client: Client) =>
    searchTerm === "" || 
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  ) || [];

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
            <ExcelImport type="clients" onImportComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
            }} />
            <Button variant="outline" onClick={() => setShowOcrDialog(true)} data-testid="button-scan-client">
              <Scan className="w-4 h-4 mr-2" />
              Scan Document
            </Button>
            <Button onClick={() => setShowAddModal(true)} data-testid="button-add-client">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            
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
                  <Button 
                    variant="outline" 
                    onClick={() => toast({ title: "Filter", description: "Client filtering coming soon" })}
                    data-testid="button-filter-clients"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
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
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client Information</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contact</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Emergency Contact</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            Loading clients...
                          </td>
                        </tr>
                      ) : filteredClients.length > 0 ? (
                        filteredClients.map((client: Client) => (
                          <tr key={client.id} className="hover:bg-muted/25 transition-colors" data-testid={`row-client-details-${client.id}`}>
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-primary-foreground font-medium">
                                    {client.firstName?.[0]}{client.lastName?.[0]}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground" data-testid={`text-full-client-name-${client.id}`}>
                                    {client.firstName} {client.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    DOB: {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "Not provided"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">ID: {client.id.slice(0, 8)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <p className="text-sm text-foreground">{client.phone || "Not provided"}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">{client.address || "Address not provided"}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                <p className="text-sm text-foreground">{client.emergencyContactName || "Not provided"}</p>
                                <p className="text-xs text-muted-foreground">{client.emergencyContactRelation}</p>
                                <p className="text-xs text-muted-foreground">{client.emergencyContactPhone}</p>
                              </div>
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
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
    </div>
  );
}
