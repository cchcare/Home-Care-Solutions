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
import { PersonCombobox } from "@/components/ui/person-combobox";
import { parseDateOnlyInput, toDateOnlyInputValue } from "@/lib/dateOnly";

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
  terminationDate: z.date().optional().nullable(),
  // Address fields
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  county: z.string().optional(),
  hhaxCaregiverCode: z.string().optional(),
  // Manager (employee directory: who this caregiver reports to)
  managerId: z.string().nullable().optional(),
  // Client assignments
  clientIds: z.array(z.string()).optional(),
  // Optional onboarding template to launch on creation
  onboardingTemplateId: z.string().optional(),
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

  const { data: onboardingTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/onboarding/templates", "caregiver-active"],
    queryFn: async () => (await fetch("/api/onboarding/templates?isActive=true")).json(),
    retry: false,
  });

  const { data: managerCandidates = [] } = useQuery<
    { id: string; firstName: string | null; lastName: string | null; role: string | null }[]
  >({
    queryKey: ["/api/employees/manager-candidates"],
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
      terminationDate: undefined,
      address: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      county: "",
      hhaxCaregiverCode: "",
      managerId: null,
      clientIds: [],
      onboardingTemplateId: undefined,
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
        terminationDate: initialData.terminationDate,
        address: initialData.address || "",
        address2: initialData.address2 || "",
        city: initialData.city || "",
        state: initialData.state || "",
        zipCode: initialData.zipCode || "",
        county: initialData.county || "",
        hhaxCaregiverCode: initialData.hhaxCaregiverCode || "",
        managerId: initialData.managerId ?? null,
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
      terminationDate: data.terminationDate ? new Date(data.terminationDate) : null,
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

              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reports to</FormLabel>
                    <FormControl>
                      <PersonCombobox
                        people={managerCandidates}
                        value={field.value ?? "__none__"}
                        onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                        placeholder="Select a manager…"
                        emptyOption={{ value: "__none__", label: "No manager" }}
                        testId="combobox-caregiver-manager"
                        renderExtra={(p) => p.role || ""}
                      />
                    </FormControl>
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
                          value={toDateOnlyInputValue(field.value)}
                          onChange={(e) => field.onChange(parseDateOnlyInput(e.target.value) ?? undefined)}
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
                          value={toDateOnlyInputValue(field.value)}
                          onChange={(e) => field.onChange(e.target.value ? parseDateOnlyInput(e.target.value) : null)}
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
                          value={toDateOnlyInputValue(field.value)}
                          onChange={(e) => field.onChange(e.target.value ? parseDateOnlyInput(e.target.value) : null)}
                          data-testid="input-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="terminationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Termination Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={toDateOnlyInputValue(field.value)}
                          onChange={(e) => field.onChange(e.target.value ? parseDateOnlyInput(e.target.value) : null)}
                          data-testid="input-termination-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Address Information</h4>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter street address" {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input placeholder="Apt, suite, unit, etc." {...field} data-testid="input-address2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter state" {...field} data-testid="input-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter zip code" {...field} data-testid="input-zip-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="county"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>County</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter county" {...field} data-testid="input-county" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hhaxCaregiverCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HHAX ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter HHAX ID" {...field} data-testid="input-hhax-id" />
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

            {/* Onboarding */}
            {!initialData?.employeeId && (
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Onboarding</h4>
                <FormField
                  control={form.control}
                  name="onboardingTemplateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Onboarding From Template (Optional)</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-caregiver-onboarding-template">
                            <SelectValue placeholder="No onboarding" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No onboarding</SelectItem>
                          {onboardingTemplates
                            .filter((t: any) => t.role === "caregiver" || t.role === "any")
                            .map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Launches onboarding tasks automatically when this caregiver is created.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
