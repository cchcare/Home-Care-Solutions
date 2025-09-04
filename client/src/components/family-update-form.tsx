import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  Phone, 
  User, 
  MapPin, 
  Heart, 
  Save, 
  X, 
  Info 
} from "lucide-react";

// Form validation schema
const familyUpdateSchema = z.object({
  updateType: z.enum([
    "emergency_contact",
    "preferences", 
    "medical_info",
    "notes",
    "contact_info"
  ]),
  requestedChanges: z.record(z.any()),
  reason: z.string().min(10, "Please provide a reason for this update (minimum 10 characters)"),
});

type FamilyUpdateFormData = z.infer<typeof familyUpdateSchema>;

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  primaryDiagnosis?: string;
  allergies?: string;
  medications?: string;
}

interface FamilyUpdateFormProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  accessLevel: string;
}

export function FamilyUpdateForm({ isOpen, onClose, client, accessLevel }: FamilyUpdateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUpdateType, setSelectedUpdateType] = useState<string>("");
  
  const form = useForm<FamilyUpdateFormData>({
    resolver: zodResolver(familyUpdateSchema),
    defaultValues: {
      updateType: "emergency_contact",
      requestedChanges: {},
      reason: "",
    },
  });

  const createUpdateMutation = useMutation({
    mutationFn: async (data: FamilyUpdateFormData) => {
      return await apiRequest(`/api/family-portal/client/${client.id}/update-request`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Update Request Submitted",
        description: "Your update request has been submitted for review by the care team.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/family-portal/client", client.id, "update-requests"]
      });
      handleClose();
    },
    onError: (error: any) => {
      console.error("Error creating update request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit update request",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    form.reset();
    setSelectedUpdateType("");
    onClose();
  };

  const handleSubmit = (data: FamilyUpdateFormData) => {
    // Get current values for comparison
    const currentValues: Record<string, any> = {};
    const requestedChanges = data.requestedChanges;

    switch (data.updateType) {
      case "emergency_contact":
        currentValues.emergencyContactName = client.emergencyContactName;
        currentValues.emergencyContactPhone = client.emergencyContactPhone;
        currentValues.emergencyContactRelation = client.emergencyContactRelation;
        break;
      case "contact_info":
        currentValues.phone = client.phone;
        currentValues.address = client.address;
        break;
      case "medical_info":
        currentValues.primaryDiagnosis = client.primaryDiagnosis;
        currentValues.allergies = client.allergies;
        currentValues.medications = client.medications;
        break;
    }

    createUpdateMutation.mutate({
      ...data,
      requestedChanges: {
        ...requestedChanges,
        reason: data.reason,
      },
      currentValues,
    });
  };

  const renderUpdateFields = () => {
    switch (selectedUpdateType) {
      case "emergency_contact":
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Current Emergency Contact</h4>
                  <div className="text-sm text-blue-800 mt-1 space-y-1">
                    <p><strong>Name:</strong> {client.emergencyContactName || "Not set"}</p>
                    <p><strong>Phone:</strong> {client.emergencyContactPhone || "Not set"}</p>
                    <p><strong>Relation:</strong> {client.emergencyContactRelation || "Not set"}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requestedChanges.emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Emergency Contact Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter full name" 
                        {...field}
                        data-testid="input-emergency-contact-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="requestedChanges.emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Emergency Contact Phone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(555) 123-4567" 
                        {...field}
                        data-testid="input-emergency-contact-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="requestedChanges.emergencyContactRelation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship to Client</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-relationship">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "contact_info":
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Current Contact Information</h4>
                  <div className="text-sm text-blue-800 mt-1 space-y-1">
                    <p><strong>Phone:</strong> {client.phone || "Not set"}</p>
                    <p><strong>Address:</strong> {client.address || "Not set"}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="requestedChanges.phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(555) 123-4567" 
                      {...field}
                      data-testid="input-client-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="requestedChanges.address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter full address" 
                      rows={3}
                      {...field}
                      data-testid="textarea-client-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "preferences":
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="requestedChanges.preferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Care Preferences & Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please describe any care preferences, dietary restrictions, personal preferences, or important notes..."
                      rows={5}
                      {...field}
                      data-testid="textarea-preferences"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "medical_info":
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-amber-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">Medical Information Updates</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    Medical information updates require review and approval by medical staff. 
                    Only suggest updates - do not make medical decisions.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Current Medical Information</h4>
                  <div className="text-sm text-blue-800 mt-1 space-y-1">
                    <p><strong>Primary Diagnosis:</strong> {client.primaryDiagnosis || "Not set"}</p>
                    <p><strong>Allergies:</strong> {client.allergies || "Not set"}</p>
                    <p><strong>Medications:</strong> {client.medications || "Not set"}</p>
                  </div>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="requestedChanges.medicalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Suggested Medical Information Updates</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please describe any suggested updates to medical information, new allergies, medication changes, or medical concerns you've observed..."
                      rows={5}
                      {...field}
                      data-testid="textarea-medical-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "notes":
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="requestedChanges.generalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>General Notes & Updates</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please share any general notes, observations, concerns, or updates you'd like the care team to know about..."
                      rows={5}
                      {...field}
                      data-testid="textarea-general-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const canSubmitUpdates = accessLevel !== "view_only";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="modal-family-update-form">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            Submit Update Request for {client.firstName} {client.lastName}
          </DialogTitle>
          <DialogDescription>
            Submit requests to update client information. All requests will be reviewed by the care team before being applied.
          </DialogDescription>
        </DialogHeader>

        {!canSubmitUpdates ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">View-Only Access</h3>
            <p className="text-muted-foreground">
              Your current access level only allows viewing client information. 
              Contact the care team to request update permissions.
            </p>
            <Button onClick={handleClose} className="mt-4" data-testid="button-close-view-only">
              Close
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="updateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Update Type</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedUpdateType(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-update-type">
                          <SelectValue placeholder="Select what you'd like to update" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="emergency_contact">
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            Emergency Contact Information
                          </div>
                        </SelectItem>
                        <SelectItem value="contact_info">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            Contact Information (Phone & Address)
                          </div>
                        </SelectItem>
                        <SelectItem value="preferences">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            Care Preferences & Personal Notes
                          </div>
                        </SelectItem>
                        <SelectItem value="medical_info">
                          <div className="flex items-center">
                            <Heart className="w-4 h-4 mr-2" />
                            Medical Information (Suggestions)
                          </div>
                        </SelectItem>
                        <SelectItem value="notes">
                          <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            General Notes & Observations
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedUpdateType && renderUpdateFields()}

              {selectedUpdateType && (
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Update *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please explain why you're requesting this update. This helps the care team understand the context and urgency."
                          rows={3}
                          {...field}
                          data-testid="textarea-update-reason"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel-update">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUpdateMutation.isPending || !selectedUpdateType}
                  data-testid="button-submit-update"
                >
                  {createUpdateMutation.isPending ? "Submitting..." : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}