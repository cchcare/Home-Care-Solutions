import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { AddCaregiverModal } from "@/components/add-caregiver-modal";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Plus, 
  Search, 
  UserCheck, 
  Calendar, 
  Award,
  AlertCircle,
  Eye,
  Edit
} from "lucide-react";
import type { Caregiver } from "@shared/schema";
import { ExcelImport } from "@/components/excel-import";

export default function Caregivers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: caregivers = [], isLoading } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
    retry: false,
  });

  const createCaregiverMutation = useMutation({
    mutationFn: async (caregiverData: any) => {
      const response = await apiRequest("POST", "/api/caregivers", caregiverData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setShowAddModal(false);
      toast({
        title: "Success",
        description: "Caregiver added successfully",
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
        description: "Failed to add caregiver",
        variant: "destructive",
      });
    },
  });

  const filteredCaregivers = caregivers.filter((caregiver: Caregiver) =>
    searchTerm === "" || 
    caregiver.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Caregiver Management"
          subtitle="Manage caregiver profiles and certifications"
        />
        
        {/* Header */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex-1" />
          </div>
          <div className="flex items-center space-x-2">
            <ExcelImport type="caregivers" onImportComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
            }} />
            <Button onClick={() => setShowAddModal(true)} data-testid="button-add-caregiver">
              <Plus className="w-4 h-4 mr-2" />
              Add Caregiver
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
                      placeholder="Search caregivers by employee ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-caregivers"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Caregiver Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Caregivers</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-caregivers">
                        {caregivers.length}
                      </p>
                    </div>
                    <UserCheck className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-active-caregivers-count">
                        {caregivers.filter((c: Caregiver) => c.isActive).length}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-accent-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Certifications Due</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-certifications-due">
                        12
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Compliance Rate</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-caregiver-compliance">
                        94%
                      </p>
                    </div>
                    <Award className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Caregivers Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Caregivers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Caregiver Information</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Experience</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Specializations</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            Loading caregivers...
                          </td>
                        </tr>
                      ) : filteredCaregivers.length > 0 ? (
                        filteredCaregivers.map((caregiver: Caregiver) => (
                          <tr key={caregiver.id} className="hover:bg-muted/25 transition-colors" data-testid={`row-caregiver-${caregiver.id}`}>
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                                  <UserCheck className="w-6 h-6 text-accent-foreground" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground" data-testid={`text-caregiver-name-${caregiver.id}`}>
                                    Employee #{caregiver.employeeId}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Hired: {caregiver.hireDate ? new Date(caregiver.hireDate).toLocaleDateString() : "Not provided"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-sm text-foreground" data-testid={`text-caregiver-experience-${caregiver.id}`}>
                                {caregiver.experienceYears || 0} years
                              </p>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {caregiver.specializations?.map((spec, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {spec}
                                  </Badge>
                                )) || <span className="text-xs text-muted-foreground">None listed</span>}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant={caregiver.isActive ? "default" : "secondary"}
                                data-testid={`badge-caregiver-status-${caregiver.id}`}
                              >
                                {caregiver.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" data-testid={`button-view-caregiver-${caregiver.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`button-edit-caregiver-${caregiver.id}`}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            {searchTerm ? "No caregivers found matching your search" : "No caregivers found"}
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
      <AddCaregiverModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={(data) => createCaregiverMutation.mutate(data)}
        isLoading={createCaregiverMutation.isPending}
      />
    </div>
  );
}
