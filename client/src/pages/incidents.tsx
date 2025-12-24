import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { OfficeSelector } from "@/components/office-selector";
import { useOffice } from "@/context/office-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIncidentReportSchema, type IncidentReport } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Search, Eye, Calendar, User, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const incidentFormSchema = insertIncidentReportSchema.extend({
  incidentDate: z.string().min(1, "Incident date is required"),
  followUpDate: z.string().optional(),
}).omit({ reportedBy: true });

type IncidentFormData = z.infer<typeof incidentFormSchema>;

export default function IncidentsPage() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOfficeId, setSelectedOfficeId } = useOffice();
  const officeQuery = selectedOfficeId !== "all" ? `?officeId=${selectedOfficeId}` : "";

  const { data: incidents = [], isLoading } = useQuery<IncidentReport[]>({
    queryKey: ["/api/incident-reports", selectedOfficeId],
    queryFn: () => fetch(`/api/incident-reports${officeQuery}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: caregivers = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: IncidentFormData) => {
      const payload = {
        ...data,
        incidentDate: new Date(data.incidentDate).toISOString(),
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : null,
      };
      const response = await fetch("/api/incident-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create incident report");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incident-reports"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Incident report created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create incident report",
        variant: "destructive",
      });
    },
  });

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      entityType: "client",
      entityId: "",
      incidentDate: "",
      incidentType: "",
      incidentCategory: "safety",
      location: "",
      description: "",
      injuries: "",
      witnessesPresent: false,
      witnessNames: "",
      severity: "low",
      immediateActions: "",
      actionsTaken: "",
      preventiveMeasures: "",
      followUpRequired: false,
      followUpDate: "",
      followUpNotes: "",
      notifiedFamily: false,
      notifiedDoctor: false,
      notifiedAgency: false,
      status: "open",
      resolution: "",
    },
  });

  const entityType = form.watch("entityType");
  const followUpRequired = form.watch("followUpRequired");

  const onSubmit = (data: IncidentFormData) => {
    createIncidentMutation.mutate(data);
  };

  const filteredIncidents = incidents.filter((incident: IncidentReport) => {
    const matchesSearch = incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.incidentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "destructive";
      case "under_investigation": return "default";
      case "resolved": return "default";
      case "closed": return "secondary";
      default: return "secondary";
    }
  };

  const getEntityName = (incident: IncidentReport) => {
    if (incident.entityType === "client") {
      const client = clients.find((c: any) => c.id === incident.entityId);
      return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
    } else if (incident.entityType === "caregiver") {
      const caregiver = caregivers.find((c: any) => c.id === incident.entityId);
      return caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : "Unknown Caregiver";
    } else {
      const user = users.find((u: any) => u.id === incident.entityId);
      return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : "Unknown Staff";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Critical Incident Reports"
          subtitle="Record and track incidents for clients, caregivers, and staff"
        />
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Critical Incident Reports</h1>
                <p className="text-muted-foreground">
                  Record and track incidents for clients, caregivers, and staff
                </p>
              </div>
              <div className="flex items-center gap-4">
                <OfficeSelector
                  selectedOfficeId={selectedOfficeId === "all" ? undefined : selectedOfficeId}
                  onOfficeChange={setSelectedOfficeId}
                  showAllOption={true}
                />
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-incident">
                      <Plus className="mr-2 h-4 w-4" />
                      Report Incident
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Incident Report</DialogTitle>
                      <DialogDescription>
                        Record a critical incident involving a client, caregiver, or staff member
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="entityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Involves</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-entity-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="caregiver">Caregiver</SelectItem>
                            <SelectItem value="staff">Staff Member</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="entityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {entityType === "client" ? "Client" : entityType === "caregiver" ? "Caregiver" : "Staff Member"}
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-entity-id">
                              <SelectValue placeholder={`Select ${entityType}`} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {entityType === "client" && clients.map((client: any) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.firstName} {client.lastName}
                              </SelectItem>
                            ))}
                            {entityType === "caregiver" && caregivers.map((caregiver: any) => (
                              <SelectItem key={caregiver.id} value={caregiver.id}>
                                {caregiver.firstName} {caregiver.lastName}
                              </SelectItem>
                            ))}
                            {entityType === "staff" && users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName || ''} {user.lastName || ''} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="incidentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Date & Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field} 
                            data-testid="input-incident-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incidentCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-incident-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="safety">Safety</SelectItem>
                            <SelectItem value="medical">Medical</SelectItem>
                            <SelectItem value="behavioral">Behavioral</SelectItem>
                            <SelectItem value="environmental">Environmental</SelectItem>
                            <SelectItem value="medication">Medication</SelectItem>
                            <SelectItem value="fall">Fall</SelectItem>
                            <SelectItem value="injury">Injury</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-severity">
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="incidentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Type</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Fall, Medication Error, Behavioral Issue"
                            {...field} 
                            data-testid="input-incident-type"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Where did the incident occur?"
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide a detailed description of what happened..."
                          rows={4}
                          {...field} 
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="injuries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Injuries Sustained</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe any injuries, if applicable..."
                          rows={2}
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-injuries"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="witnessesPresent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-witnesses-present"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Were there witnesses present?</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch("witnessesPresent") && (
                    <FormField
                      control={form.control}
                      name="witnessNames"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Witness Names</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="List witness names (comma separated)"
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-witness-names"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="immediateActions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Immediate Actions Taken</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What actions were taken immediately after the incident?"
                          rows={3}
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-immediate-actions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="notifiedFamily"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-notified-family"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Family Notified</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notifiedDoctor"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-notified-doctor"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Doctor Notified</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notifiedAgency"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-notified-agency"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Agency Notified</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="followUpRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-follow-up-required"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Follow-up Required</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {followUpRequired && (
                    <FormField
                      control={form.control}
                      name="followUpDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow-up Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field} 
                              data-testid="input-follow-up-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createIncidentMutation.isPending}
                    data-testid="button-submit-incident"
                  >
                    {createIncidentMutation.isPending ? "Creating..." : "Create Report"}
                  </Button>
                </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-incidents"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="under_investigation">Under Investigation</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-severity-filter">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading incidents...</div>
        ) : filteredIncidents.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No incidents found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || severityFilter !== "all" 
                    ? "Try adjusting your filters" 
                    : "No incident reports have been created yet"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredIncidents.map((incident: IncidentReport) => (
            <Card key={incident.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{incident.incidentType}</h3>
                          <Badge variant={getSeverityColor(incident.severity as any)}>
                            {incident.severity}
                          </Badge>
                          <Badge variant={getStatusColor(incident.status as any)}>
                            {incident.status?.replace('_', ' ') || 'open'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{getEntityName(incident)} ({incident.entityType})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(incident.incidentDate), "MMM d, yyyy 'at' h:mm a")}</span>
                          </div>
                          {incident.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{incident.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-700 line-clamp-2">{incident.description}</p>

                    {incident.injuries && (
                      <div className="text-sm">
                        <span className="font-medium text-red-600">Injuries: </span>
                        <span className="text-gray-700">{incident.injuries}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Reported {incident.createdAt ? format(new Date(incident.createdAt), "MMM d, yyyy") : "Unknown"}</span>
                      </div>
                      {incident.followUpRequired && incident.followUpDate && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <Calendar className="h-3 w-3" />
                          <span>Follow-up: {format(new Date(incident.followUpDate), "MMM d, yyyy")}</span>
                        </div>
                      )}
                    </div>

                    {(incident.notifiedFamily || incident.notifiedDoctor || incident.notifiedAgency) && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Notifications:</span>
                        {incident.notifiedFamily && <Badge variant="outline">Family</Badge>}
                        {incident.notifiedDoctor && <Badge variant="outline">Doctor</Badge>}
                        {incident.notifiedAgency && <Badge variant="outline">Agency</Badge>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-view-incident-${incident.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}