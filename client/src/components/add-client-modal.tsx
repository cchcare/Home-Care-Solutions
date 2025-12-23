import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { insertClientSchema, type Office } from "@shared/schema";

const clientFormSchema = insertClientSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(1, "Emergency contact phone is required"),
  emergencyContactRelation: z.string().min(1, "Emergency contact relationship is required"),
  officeId: z.string().min(1, "Office assignment is required"),
  hipaaAcknowledged: z.boolean().refine(val => val === true, {
    message: "HIPAA acknowledgment is required"
  }),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => void;
  isLoading: boolean;
  initialData?: Partial<ClientFormData>;
}

export function AddClientModal({ isOpen, onClose, onSubmit, isLoading, initialData }: AddClientModalProps) {
  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
    retry: false,
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      primaryDiagnosis: "",
      allergies: "",
      primaryPhysician: "",
      officeId: "",
      memberId: "",
      hipaaAcknowledged: false,
    },
  });

  useEffect(() => {
    if (initialData && isOpen) {
      form.reset({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        emergencyContactName: initialData.emergencyContactName || "",
        emergencyContactPhone: initialData.emergencyContactPhone || "",
        emergencyContactRelation: initialData.emergencyContactRelation || "",
        primaryDiagnosis: initialData.primaryDiagnosis || "",
        allergies: initialData.allergies || "",
        primaryPhysician: initialData.primaryPhysician || "",
        officeId: initialData.officeId || "",
        memberId: initialData.memberId || "",
        hipaaAcknowledged: false,
      });
    }
  }, [initialData, isOpen, form]);

  const handleSubmit = (data: ClientFormData) => {
    const { hipaaAcknowledged, ...clientData } = data;
    onSubmit(clientData);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-client">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add New Client
            <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-close-add-client">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Office Assignment */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Office Assignment</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="officeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Location *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-office">
                            <SelectValue placeholder="Select office location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {offices.map((office) => (
                            <SelectItem key={office.id} value={office.id}>
                              {office.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter member ID" {...field} value={field.value || ""} data-testid="input-member-id" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Personal Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          data-testid="input-date-of-birth"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="(XXX) XXX-XXXX" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter complete address" 
                        rows={3}
                        {...field} 
                        data-testid="textarea-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Medical Information Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Medical Information</h4>
              
              <FormField
                control={form.control}
                name="primaryDiagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Diagnosis</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter primary medical conditions" 
                        rows={2}
                        {...field} 
                        data-testid="textarea-primary-diagnosis"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergies</FormLabel>
                      <FormControl>
                        <Input placeholder="List any allergies" {...field} data-testid="input-allergies" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="primaryPhysician"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Physician</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. Name" {...field} data-testid="input-primary-physician" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Emergency Contact</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Emergency contact name" {...field} data-testid="input-emergency-contact-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactRelation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-emergency-contact-relation">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="(XXX) XXX-XXXX" {...field} data-testid="input-emergency-contact-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* HIPAA Acknowledgment */}
            <div className="border border-border rounded-lg p-4 bg-primary/5">
              <FormField
                control={form.control}
                name="hipaaAcknowledged"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-hipaa-acknowledgment"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium">
                        HIPAA Acknowledgment *
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        I acknowledge that all client information will be stored securely and in compliance with HIPAA regulations. All staff members have been trained in privacy protection protocols.
                      </p>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel-add-client">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-save-client">
                {isLoading ? "Saving..." : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Client
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
