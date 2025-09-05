import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Edit, History, Phone, MapPin, Calendar } from "lucide-react";
import type { Client } from "@shared/schema";
import { ClientScheduling } from "./client-scheduling";

interface ClientProfileModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: any) => void;
  isLoading: boolean;
}

export function ClientProfileModal({ client, isOpen, onClose, onUpdate, isLoading }: ClientProfileModalProps) {
  const { data: carePlans = [] } = useQuery({
    queryKey: ["/api/clients", client?.id, "care-plans"],
    enabled: !!client?.id,
    retry: false,
  });

  const { data: progressNotes = [] } = useQuery({
    queryKey: ["/api/clients", client?.id, "progress-notes"],
    enabled: !!client?.id,
    retry: false,
  });

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="modal-client-profile">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-medium">
                  {client.firstName?.[0]}{client.lastName?.[0]}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground" data-testid="text-client-profile-name">
                  {client.firstName} {client.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Client ID: {client.id.slice(0, 8)} • DOB: {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "Not provided"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-client-profile">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Edit className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="scheduling" data-testid="tab-scheduling">
              <Calendar className="w-4 h-4 mr-2" />
              Scheduling
            </TabsTrigger>
            <TabsTrigger value="care-plans" data-testid="tab-care-plans">
              <Edit className="w-4 h-4 mr-2" />
              Care Plans
            </TabsTrigger>
            <TabsTrigger value="progress" data-testid="tab-progress">
              <History className="w-4 h-4 mr-2" />
              Progress Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Basic Information Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground" data-testid="text-client-phone">
                      {client.phone || "Not provided"}
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm text-foreground" data-testid="text-client-address">
                      {client.address || "Address not provided"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Medical Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Primary Diagnosis</p>
                    <p className="text-sm text-foreground" data-testid="text-client-diagnosis">
                      {client.primaryDiagnosis || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Allergies</p>
                    <p className="text-sm text-foreground" data-testid="text-client-allergies">
                      {client.allergies || "None listed"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Primary Physician</p>
                    <p className="text-sm text-foreground" data-testid="text-client-physician">
                      {client.primaryPhysician || "Not provided"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground" data-testid="text-emergency-contact-name">
                      {client.emergencyContactName || "Not provided"}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid="text-emergency-contact-relation">
                      {client.emergencyContactRelation || "Relationship not specified"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground" data-testid="text-emergency-contact-phone">
                      {client.emergencyContactPhone || "Not provided"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scheduling">
            <ClientScheduling client={client} />
          </TabsContent>

          <TabsContent value="care-plans">
            <Card>
              <CardHeader>
                <CardTitle>Care Plans</CardTitle>
              </CardHeader>
              <CardContent>
                {carePlans && carePlans.length > 0 ? (
                  <div className="space-y-4">
                    {carePlans.map((plan: any) => (
                      <div key={plan.id} className="border border-border rounded-lg p-4" data-testid={`care-plan-${plan.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-foreground">{plan.title}</h4>
                          <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                            {plan.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(plan.createdAt).toLocaleDateString()}
                          {plan.nextAssessmentDate && (
                            <span className="ml-3">
                              Next Assessment: {new Date(plan.nextAssessmentDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No care plans found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Recent Progress Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {progressNotes && progressNotes.length > 0 ? (
                  <div className="space-y-3">
                    {progressNotes.slice(0, 3).map((note: any) => (
                      <div key={note.id} className="border border-border rounded-lg p-4" data-testid={`progress-note-${note.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-foreground">
                            Visit: {note.visitDate ? new Date(note.visitDate).toLocaleDateString() : "Date not recorded"}
                          </p>
                          <Badge variant="outline">
                            {note.visitDuration ? `${note.visitDuration} min` : "Duration not recorded"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{note.notes}</p>
                        {note.servicesProvided && note.servicesProvided.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {note.servicesProvided.map((service: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No progress notes found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}