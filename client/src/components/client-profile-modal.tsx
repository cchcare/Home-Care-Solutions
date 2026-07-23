import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { X, Edit, History, Phone, MapPin, Calendar, FileText, Loader2 } from "lucide-react";
import type { Client, ClientAuthorization, Mco } from "@shared/schema";
import { ClientScheduling } from "./client-scheduling";
import { formatDateOnly, toDateOnlyInputValue, parseDateOnlyInput } from "@/lib/dateOnly";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const authorizationFormSchema = z.object({
  authorizationNumber: z.string().min(1, "Authorization number is required"),
  mcoId: z.string().optional(),
  carePlanId: z.string().optional(),
  serviceType: z.string().min(1, "Service type is required"),
  approvedHours: z.string().optional(),
  frequencyPerWeek: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  renewalDate: z.string().optional(),
  status: z.string().default("active"),
  notes: z.string().optional(),
});
type AuthorizationFormData = z.infer<typeof authorizationFormSchema>;

function AddAuthorizationDialog({ client, carePlans }: { client: Client; carePlans: any[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: mcos = [] } = useQuery<Mco[]>({ queryKey: ["/api/mcos"], enabled: open });

  const form = useForm<AuthorizationFormData>({
    resolver: zodResolver(authorizationFormSchema),
    defaultValues: {
      authorizationNumber: "", mcoId: "", carePlanId: "", serviceType: "",
      approvedHours: "", frequencyPerWeek: "", startDate: "", endDate: "", renewalDate: "",
      status: "active", notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: AuthorizationFormData) => {
      const payload: any = {
        ...data,
        mcoId: data.mcoId || undefined,
        carePlanId: data.carePlanId || undefined,
        approvedHours: data.approvedHours || undefined,
        frequencyPerWeek: data.frequencyPerWeek ? parseInt(data.frequencyPerWeek, 10) : undefined,
        startDate: parseDateOnlyInput(data.startDate),
        endDate: data.endDate ? parseDateOnlyInput(data.endDate) : undefined,
        renewalDate: data.renewalDate ? parseDateOnlyInput(data.renewalDate) : undefined,
      };
      return apiRequest("POST", `/api/clients/${client.id}/authorizations`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id, "authorizations"] });
      toast({ title: "Authorization created" });
      setOpen(false);
      form.reset();
    },
    onError: (e: any) => toast({ title: "Failed to create authorization", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-add-authorization">Add Authorization</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Authorization</DialogTitle>
          <DialogDescription>Record an MCO service authorization for this client</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="authorizationNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Authorization Number *</FormLabel>
                  <FormControl><Input placeholder="Authorization #" {...field} data-testid="input-auth-number" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="serviceType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type *</FormLabel>
                  <FormControl><Input placeholder="e.g., Personal Care" {...field} data-testid="input-auth-service-type" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="mcoId" render={({ field }) => (
                <FormItem>
                  <FormLabel>MCO</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-auth-mco"><SelectValue placeholder="Select MCO" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {mcos.map((mco) => <SelectItem key={mco.id} value={mco.id}>{mco.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="carePlanId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Care Plan</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-auth-care-plan"><SelectValue placeholder="Link to a care plan" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {carePlans.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="approvedHours" render={({ field }) => (
                <FormItem>
                  <FormLabel>Approved Hours</FormLabel>
                  <FormControl><Input type="number" step="0.25" placeholder="0" {...field} data-testid="input-auth-approved-hours" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="frequencyPerWeek" render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency / Week</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} data-testid="input-auth-frequency" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-auth-start-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-auth-end-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="renewalDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Renewal Date</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-auth-renewal-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-auth-status"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="exhausted">Exhausted</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Additional notes..." {...field} data-testid="input-auth-notes" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-authorization">
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface ClientProfileModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: any) => void;
  isLoading: boolean;
}

export function ClientProfileModal({ client, isOpen, onClose, onUpdate, isLoading }: ClientProfileModalProps) {
  const { data: carePlans = [] } = useQuery<any[]>({
    queryKey: ["/api/clients", client?.id, "care-plans"],
    enabled: !!client?.id,
    retry: false,
  });

  const { data: progressNotes = [] } = useQuery<any[]>({
    queryKey: ["/api/clients", client?.id, "progress-notes"],
    enabled: !!client?.id,
    retry: false,
  });

  const { data: authorizations = [] } = useQuery<ClientAuthorization[]>({
    queryKey: ["/api/clients", client?.id, "authorizations"],
    enabled: !!client?.id,
    retry: false,
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "pending": return "outline";
      case "expired": return "destructive";
      case "exhausted": return "secondary";
      case "cancelled": return "secondary";
      default: return "outline";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500 hover:bg-green-600";
      case "pending": return "bg-yellow-500 hover:bg-yellow-600 text-black";
      case "expired": return "bg-red-500 hover:bg-red-600";
      case "exhausted": return "bg-orange-500 hover:bg-orange-600";
      default: return "";
    }
  };

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
                  Member ID: {client.memberId || client.id.slice(0, 8)} • DOB: {formatDateOnly(client.dateOfBirth) || "Not provided"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-client-profile">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="auth-orders" data-testid="tab-auth-orders">
              <FileText className="w-4 h-4 mr-2" />
              Auth/Orders
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

          <TabsContent value="auth-orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Client Authorizations</CardTitle>
                <AddAuthorizationDialog client={client} carePlans={carePlans} />
              </CardHeader>
              <CardContent>
                {authorizations && authorizations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Auth #</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Care Plan</TableHead>
                        <TableHead>Approved Hours</TableHead>
                        <TableHead>Used Hours</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {authorizations.map((auth) => (
                        <TableRow key={auth.id} data-testid={`authorization-${auth.id}`}>
                          <TableCell className="font-medium">{auth.authorizationNumber}</TableCell>
                          <TableCell>{auth.serviceType}</TableCell>
                          <TableCell>{carePlans.find((p: any) => p.id === (auth as any).carePlanId)?.title || "—"}</TableCell>
                          <TableCell>{auth.approvedHours || "N/A"}</TableCell>
                          <TableCell>{auth.usedHours || "0"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(auth.status || "active")}>
                              {auth.status || "active"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateOnly(auth.startDate) || "N/A"}</TableCell>
                          <TableCell>{formatDateOnly(auth.endDate) || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No authorizations found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}