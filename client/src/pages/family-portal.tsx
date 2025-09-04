import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { FamilyUpdateForm } from "@/components/family-update-form";
import { 
  User, 
  Calendar, 
  FileText, 
  ClipboardList, 
  Heart, 
  Phone,
  MapPin,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

interface ClientWithAccess {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    phone: string | null;
    address: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    primaryDiagnosis: string | null;
    allergies: string | null;
    medications: string | null;
    status: string;
  };
  accessPermissions: {
    canViewCarePlans: boolean;
    canViewProgressNotes: boolean;
    canViewDocuments: boolean;
    canViewIncidentReports: boolean;
    accessLevel: string;
  };
}

interface FamilyUpdate {
  id: string;
  updateType: string;
  requestedChanges: any;
  currentValues: any;
  status: string;
  reviewNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export default function FamilyPortal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<ClientWithAccess | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  // Redirect if not family member
  useEffect(() => {
    if (!isLoading && isAuthenticated && (user as any)?.role !== "family") {
      toast({
        title: "Access Denied",
        description: "This area is for family members only.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [(user as any)?.role, isAuthenticated, isLoading, toast]);

  // Get family member profile
  const { data: familyMember, isLoading: loadingProfile } = useQuery({
    queryKey: ["/api/family-members/me"],
    retry: false,
    enabled: isAuthenticated && (user as any)?.role === "family",
  });

  // Get clients for this family member
  const { data: clientRelationships = [], isLoading: loadingClients } = useQuery({
    queryKey: ["/api/family-members/me/clients"],
    retry: false,
    enabled: isAuthenticated && (user as any)?.role === "family",
  });

  // Get selected client details
  const { data: clientDetails, isLoading: loadingClientDetails } = useQuery({
    queryKey: ["/api/family-portal/client", selectedClient?.client?.id],
    retry: false,
    enabled: !!selectedClient?.client?.id,
  });

  // Get family update requests for selected client
  const { data: familyUpdates = [], isLoading: loadingUpdates } = useQuery({
    queryKey: ["/api/family-portal/client", selectedClient?.client?.id, "update-requests"],
    retry: false,
    enabled: !!selectedClient?.client?.id,
  });

  if (isLoading || loadingProfile) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.role !== "family") {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be logged in as a family member to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!familyMember) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Family member profile not found. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="page-family-portal">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Family Portal</h1>
        <p className="text-muted-foreground mt-2">
          Welcome, {(user as any)?.firstName} {(user as any)?.lastName} - Access your family member's care information
        </p>
      </div>

      {loadingClients ? (
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-40 bg-muted rounded"></div>
            <div className="h-40 bg-muted rounded"></div>
          </div>
        </div>
      ) : (clientRelationships as any[]).length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No client access has been granted to your account. Please contact the care team to set up access.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Your Family Members</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(clientRelationships as any[]).map((relationship: any) => (
                <Card 
                  key={relationship.client.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedClient?.client?.id === relationship.client.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedClient(relationship)}
                  data-testid={`card-client-${relationship.client.id}`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        {relationship.client.firstName} {relationship.client.lastName}
                      </span>
                      <Badge variant={relationship.client.status === "active" ? "default" : "secondary"}>
                        {relationship.client.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Access Level: {relationship.accessLevel?.replace('_', ' ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        DOB: {relationship.client.dateOfBirth ? formatDate(relationship.client.dateOfBirth) : 'Not provided'}
                      </div>
                      {relationship.client.phone && (
                        <div className="flex items-center text-muted-foreground">
                          <Phone className="w-4 h-4 mr-2" />
                          {relationship.client.phone}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {relationship.canViewCarePlans && <Badge variant="outline" className="text-xs">Care Plans</Badge>}
                        {relationship.canViewProgressNotes && <Badge variant="outline" className="text-xs">Progress Notes</Badge>}
                        {relationship.canViewIncidentReports && <Badge variant="outline" className="text-xs">Incidents</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {selectedClient && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    {selectedClient.client.firstName} {selectedClient.client.lastName} - Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="info">Basic Info</TabsTrigger>
                      <TabsTrigger value="medical" disabled={!selectedClient.accessPermissions.canViewCarePlans}>
                        Medical Info
                      </TabsTrigger>
                      <TabsTrigger value="updates">Update Requests</TabsTrigger>
                      <TabsTrigger value="contact">Contact Info</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="info" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="text-sm font-medium">Date of Birth:</span>
                            <span className="ml-2 text-sm">
                              {selectedClient.client.dateOfBirth ? formatDate(selectedClient.client.dateOfBirth) : 'Not provided'}
                            </span>
                          </div>
                          {selectedClient.client.address && (
                            <div className="flex items-start">
                              <MapPin className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <span className="text-sm font-medium">Address:</span>
                                <p className="ml-2 text-sm whitespace-pre-line">{selectedClient.client.address}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <span className="text-sm font-medium">Status:</span>
                            <Badge className="ml-2" variant={selectedClient.client.status === "active" ? "default" : "secondary"}>
                              {selectedClient.client.status}
                            </Badge>
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm font-medium">Your Access Level:</span>
                            <Badge className="ml-2" variant="outline">
                              {selectedClient.accessPermissions.accessLevel?.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="medical" className="space-y-4">
                      <div className="grid grid-cols-1 gap-6">
                        {selectedClient.client.primaryDiagnosis && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center">
                              <Heart className="w-4 h-4 mr-2 text-red-500" />
                              Primary Diagnosis
                            </h4>
                            <p className="text-sm bg-muted p-3 rounded">{selectedClient.client.primaryDiagnosis}</p>
                          </div>
                        )}
                        {selectedClient.client.allergies && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                              Allergies
                            </h4>
                            <p className="text-sm bg-muted p-3 rounded">{selectedClient.client.allergies}</p>
                          </div>
                        )}
                        {selectedClient.client.medications && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center">
                              <ClipboardList className="w-4 h-4 mr-2 text-blue-500" />
                              Current Medications
                            </h4>
                            <p className="text-sm bg-muted p-3 rounded">{selectedClient.client.medications}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="updates" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Your Update Requests</h4>
                        <Button 
                          size="sm" 
                          onClick={() => setShowUpdateForm(true)}
                          data-testid="button-new-update-request"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          New Request
                        </Button>
                      </div>
                      
                      {loadingUpdates ? (
                        <div className="space-y-3">
                          <div className="animate-pulse h-16 bg-muted rounded"></div>
                          <div className="animate-pulse h-16 bg-muted rounded"></div>
                        </div>
                      ) : (familyUpdates as FamilyUpdate[]).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No update requests submitted yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(familyUpdates as FamilyUpdate[]).map((update: FamilyUpdate) => (
                            <Card key={update.id} className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-sm">{update.updateType.replace('_', ' ')}</h5>
                                {getStatusBadge(update.status)}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                Submitted: {formatDate(update.createdAt)}
                              </p>
                              {update.reviewNotes && (
                                <p className="text-sm bg-muted p-2 rounded">
                                  <span className="font-medium">Review Notes:</span> {update.reviewNotes}
                                </p>
                              )}
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="contact" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Client Contact</h4>
                          {selectedClient.client.phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                              <span className="text-sm">{selectedClient.client.phone}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Emergency Contact</h4>
                          {selectedClient.client.emergencyContactName && (
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span className="text-sm">{selectedClient.client.emergencyContactName}</span>
                              </div>
                              {selectedClient.client.emergencyContactPhone && (
                                <div className="flex items-center">
                                  <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                                  <span className="text-sm">{selectedClient.client.emergencyContactPhone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Family Update Form Modal */}
      {selectedClient && (
        <FamilyUpdateForm
          isOpen={showUpdateForm}
          onClose={() => setShowUpdateForm(false)}
          client={selectedClient.client}
          accessLevel={selectedClient.accessPermissions.accessLevel}
        />
      )}
    </div>
  );
}