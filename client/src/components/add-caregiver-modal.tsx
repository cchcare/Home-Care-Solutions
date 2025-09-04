import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Save, X } from "lucide-react";
import { insertCaregiverSchema } from "@shared/schema";

const caregiverFormSchema = insertCaregiverSchema.extend({
  employeeId: z.string().min(1, "Employee ID is required"),
  experienceYears: z.number().min(0, "Experience years must be 0 or greater"),
  // User information for login account
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type CaregiverFormData = z.infer<typeof caregiverFormSchema>;

interface AddCaregiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CaregiverFormData) => void;
  isLoading: boolean;
}

export function AddCaregiverModal({ isOpen, onClose, onSubmit, isLoading }: AddCaregiverModalProps) {
  const form = useForm<CaregiverFormData>({
    resolver: zodResolver(caregiverFormSchema),
    defaultValues: {
      employeeId: "",
      experienceYears: 0,
      specializations: [],
      isActive: true,
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  const handleSubmit = (data: CaregiverFormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleSpecializationsChange = (value: string) => {
    const specializations = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    form.setValue('specializations', specializations);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-caregiver">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add New Caregiver
            <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-close-add-caregiver">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter email address for login account" 
                        {...field} 
                        data-testid="input-email" 
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      This email will be used for their login account
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Employment Information Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Employment Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter employee ID" {...field} data-testid="input-employee-id" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          data-testid="input-hire-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="experienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of Experience</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-experience-years"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Specializations Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Specializations & Skills</h4>
              
              <FormField
                control={form.control}
                name="specializations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specializations</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter specializations separated by commas (e.g., Alzheimer's Care, Physical Therapy, Medication Management)"
                        rows={3}
                        value={field.value?.join(', ') || ''}
                        onChange={(e) => handleSpecializationsChange(e.target.value)}
                        data-testid="textarea-specializations"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Separate multiple specializations with commas
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Certification Requirements Notice */}
            <div className="border border-border rounded-lg p-4 bg-muted/25">
              <h4 className="font-semibold text-foreground mb-2">Required Certifications</h4>
              <p className="text-sm text-muted-foreground mb-3">
                After creating the caregiver profile, you'll need to add the following certifications:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CPR Certification</li>
                <li>• First Aid Certification</li>
                <li>• Background Check</li>
                <li>• HIPAA Training</li>
                <li>• State-specific Care Training</li>
              </ul>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel-add-caregiver">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-save-caregiver">
                {isLoading ? "Saving..." : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Caregiver
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
