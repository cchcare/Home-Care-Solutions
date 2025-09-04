import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOfficeSchema, type Office } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Shield, Users, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const officeFormSchema = insertOfficeSchema.extend({
  timezone: z.string().optional(),
});

type OfficeFormData = z.infer<typeof officeFormSchema>;

export default function SuperAdminPage() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not super admin
  if (!user || (user as any).role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Shield className="h-16 w-16 text-red-500" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500 mt-2">You need Super Admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const { data: offices = [], isLoading } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const createOfficeMutation = useMutation({
    mutationFn: async (data: OfficeFormData) => {
      return await apiRequest("POST", "/api/offices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Office created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create office",
        variant: "destructive",
      });
    },
  });

  const form = useForm<OfficeFormData>({
    resolver: zodResolver(officeFormSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      managerUserId: "",
      timezone: "America/New_York",
      isActive: true,
    },
  });

  const onSubmit = (data: OfficeFormData) => {
    createOfficeMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
              <p className="text-muted-foreground">
                Office Management System
              </p>
            </div>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-office">
              <Plus className="mr-2 h-4 w-4" />
              Add New Office
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Office</DialogTitle>
              <DialogDescription>
                Add a new office location to the system
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter office name"
                          {...field} 
                          data-testid="input-office-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter office address"
                          rows={3}
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-office-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="(555) 123-4567"
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-office-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="office@example.com"
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-office-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-office-timezone">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (MST)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
                          <SelectItem value="America/Phoenix">Arizona Time (MST)</SelectItem>
                          <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createOfficeMutation.isPending}
                    data-testid="button-submit-office"
                  >
                    {createOfficeMutation.isPending ? "Creating..." : "Create Office"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Super Admin Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Shield className="h-5 w-5" />
            Super Admin Access
          </CardTitle>
          <CardDescription className="text-blue-600">
            You have exclusive access to create new office locations. This is the only function available to Super Admins.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Office List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Office Locations
          </CardTitle>
          <CardDescription>
            All office locations in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading offices...</div>
          ) : offices.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No offices found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating the first office location.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {offices.map((office: Office) => (
                <div key={office.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{office.name}</h3>
                        <Badge variant={office.isActive ? "default" : "secondary"}>
                          {office.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      {office.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{office.address}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {office.phone && (
                          <span>📞 {office.phone}</span>
                        )}
                        {office.email && (
                          <span>✉️ {office.email}</span>
                        )}
                        {office.timezone && (
                          <span>🌍 {office.timezone}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Created {format(new Date(office.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restrictions Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Access Restrictions</h4>
              <p className="text-sm text-amber-700 mt-1">
                As a Super Admin, you can only create new offices. You do not have access to other management features 
                like client management, caregiver management, or day-to-day operations. This role is specifically 
                designed for organizational setup and expansion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}