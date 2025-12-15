import { useEffect } from "react";
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
import { Save, X } from "lucide-react";
import { insertCaregiverSchema, type Office, type Client } from "@shared/schema";

const caregiverFormSchema = insertCaregiverSchema.extend({
  employeeId: z.string().min(1, "Employee ID is required"),
  hourlyWage: z.number().min(0, "Hourly wage must be 0 or greater"),
  officeId: z.string().min(1, "Office assignment is required"),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]).optional(),
  // User information for login account
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.date().optional(),
  hireDate: z.date().optional(),
  // Client assignments
  clientIds: z.array(z.string()).optional(),
});

type CaregiverFormData = z.infer<typeof caregiverFormSchema>;

interface AddCaregiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CaregiverFormData) => void;
  isLoading: boolean;
  initialData?: Partial<CaregiverFormData>;
}

export function AddCaregiverModal({ isOpen, onClose, onSubmit, isLoading, initialData }: AddCaregiverModalProps) {
  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
    retry: false,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    retry: false,
  });

  const form = useForm<CaregiverFormData>({
    resolver: zodResolver(caregiverFormSchema),
    defaultValues: {
      employeeId: "",
      hourlyWage: 0,
      officeId: "",
      gender: undefined,
      isActive: true,
      email: "",
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: undefined,
      startDate: undefined,
      hireDate: undefined,
      clientIds: [],
    },
  });

  useEffect(() => {
    if (initialData && isOpen) {
      form.reset({
        employeeId: initialData.employeeId || "",
        hourlyWage: initialData.hourlyWage || 0,
        officeId: initialData.officeId || "",
        gender: initialData.gender,
        isActive: initialData.isActive ?? true,
        email: initialData.email || "",
        firstName: initialData.firstName || "",
        middleName: initialData.middleName || "",
        lastName: initialData.lastName || "",
        dateOfBirth: initialData.dateOfBirth,
        startDate: initialData.startDate,
        hireDate: initialData.hireDate,
        clientIds: initialData.clientIds || [],
      });
    }
  }, [initialData, isOpen, form]);

  const handleSubmit = (data: CaregiverFormData) => {
    // Convert date strings to Date objects for the backend
    const processedData = {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
    };
    onSubmit(processedData);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto" data-testid="modal-add-caregiver">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add New Caregiver
            <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-close-add-caregiver">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-4">
            {/* Office Assignment */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Office Assignment</h4>
              
              <FormField
                control={form.control}
                name="officeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office Location *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-caregiver-office">
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
            </div>

            {/* Personal Information Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Personal Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter middle name" {...field} data-testid="input-middle-name" />
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
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          data-testid="input-date-of-birth"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non_binary">Non-Binary</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
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
                  name="hourlyWage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Wage ($) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-hourly-wage"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          data-testid="input-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </div>

            {/* Client Assignment Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Client Assignment</h4>
              
              <FormField
                control={form.control}
                name="clientIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Clients (Optional)</FormLabel>
                    <div className="space-y-2">
                      {clients.map((client) => (
                        <div key={client.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`client-${client.id}`}
                            checked={field.value?.includes(client.id) || false}
                            onChange={(e) => {
                              const currentIds = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...currentIds, client.id]);
                              } else {
                                field.onChange(currentIds.filter(id => id !== client.id));
                              }
                            }}
                            data-testid={`checkbox-client-${client.id}`}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label 
                            htmlFor={`client-${client.id}`}
                            className="text-sm text-foreground cursor-pointer"
                          >
                            {client.firstName} {client.lastName}
                          </label>
                        </div>
                      ))}
                      {clients.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">
                          No clients available. Add clients first to assign them to this caregiver.
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select clients that this caregiver will be responsible for
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-border sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 -mx-6 px-6 -mb-4">
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
