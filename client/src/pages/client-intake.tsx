import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { PersonCombobox } from "@/components/ui/person-combobox";
import {
  User,
  MapPin,
  Heart,
  Shield,
  Phone,
  Building,
  FileText,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { Office, Mco, Coordinator, Caregiver, Client } from "@shared/schema";
import { insertClientSchema } from "@shared/schema";

const DRAFT_STORAGE_KEY = "client-intake-draft";

const STEPS = [
  { id: 1, title: "Basic Information", icon: User, description: "Name, DOB, contact info" },
  { id: 2, title: "Address", icon: MapPin, description: "Residential address" },
  { id: 3, title: "Medical Information", icon: Heart, description: "Diagnosis, allergies, medications" },
  { id: 4, title: "Insurance/MCO", icon: Shield, description: "Insurance and Medicaid info" },
  { id: 5, title: "Emergency Contact", icon: Phone, description: "Emergency contact details" },
  { id: 6, title: "Service Setup", icon: Building, description: "Office, coordinator, caregiver" },
  { id: 7, title: "Required Documents", icon: FileText, description: "Document checklist" },
  { id: 8, title: "Review & Submit", icon: CheckCircle, description: "Review all information" },
];

const REQUIRED_DOCUMENTS = [
  { id: "id_card", label: "Government-issued ID (Driver's License, State ID, or Passport)", required: true },
  { id: "insurance_card", label: "Insurance Card (front and back)", required: true },
  { id: "medicaid_card", label: "Medicaid Card", required: false },
  { id: "physician_order", label: "Physician's Order / Prescription for Services", required: true },
  { id: "care_plan", label: "Plan of Care (POC)", required: false },
  { id: "medical_history", label: "Medical History / Health Assessment", required: true },
  { id: "consent_forms", label: "Signed Consent Forms", required: true },
  { id: "hipaa_authorization", label: "HIPAA Authorization Form", required: true },
  { id: "emergency_info", label: "Emergency Contact Information Form", required: true },
  { id: "assessment", label: "Initial Assessment Documentation", required: false },
];

const intakeFormSchema = insertClientSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Valid email is required").or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(5, "Valid ZIP code is required"),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  officeId: z.string().min(1, "Office assignment is required"),
  documentChecklist: z.record(z.string(), z.boolean()).optional(),
});

type IntakeFormData = z.infer<typeof intakeFormSchema>;

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

const MEDICAID_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "not_enrolled", label: "Not Enrolled" },
  { value: "unknown", label: "Unknown" },
];

export default function ClientIntake() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [documentChecklist, setDocumentChecklist] = useState<Record<string, boolean>>({});
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const { data: mcos = [] } = useQuery<Mco[]>({
    queryKey: ["/api/mcos"],
    queryFn: () => fetch("/api/mcos").then(r => r.json()),
  });

  const { data: coordinators = [] } = useQuery<Coordinator[]>({
    queryKey: ["/api/coordinators"],
    queryFn: () => fetch("/api/coordinators").then(r => r.json()),
  });

  const { data: caregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
    queryFn: () => fetch("/api/caregivers").then(r => r.json()),
  });

  const form = useForm<IntakeFormData>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: undefined,
      phone: "",
      email: "",
      address: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      primaryDiagnosis: "",
      allergies: "",
      medications: "",
      primaryPhysician: "",
      mcoId: "",
      memberId: "",
      medicaidStatus: "unknown",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      officeId: "",
      coordinatorId: "",
      serviceStartDate: undefined,
      primaryCaregiverId: "",
      status: "active",
    },
  });

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.formData) {
          if (draft.formData.dateOfBirth) {
            draft.formData.dateOfBirth = new Date(draft.formData.dateOfBirth);
          }
          if (draft.formData.serviceStartDate) {
            draft.formData.serviceStartDate = new Date(draft.formData.serviceStartDate);
          }
          form.reset(draft.formData);
        }
        if (draft.documentChecklist) {
          setDocumentChecklist(draft.documentChecklist);
        }
        if (draft.currentStep) {
          setCurrentStep(draft.currentStep);
        }
        setHasDraft(true);
      } catch (e) {
        console.error("Failed to parse saved draft:", e);
      }
    }
  }, [form]);

  const saveDraft = () => {
    const draftData = {
      formData: form.getValues(),
      documentChecklist,
      currentStep,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    toast({
      title: "Draft Saved",
      description: "Your progress has been saved. You can continue later.",
    });
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    form.reset();
    setDocumentChecklist({});
    setCurrentStep(1);
    setHasDraft(false);
    toast({
      title: "Draft Cleared",
      description: "Your saved progress has been removed.",
    });
  };

  const createClientMutation = useMutation({
    mutationFn: async (data: IntakeFormData) => {
      const { documentChecklist: _, ...clientData } = data;
      const response = await apiRequest("POST", "/api/clients", clientData);
      return response.json();
    },
    onSuccess: (client: Client) => {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setCreatedClientId(client.id);
      toast({
        title: "Client Created Successfully",
        description: `${client.firstName} ${client.lastName} has been added to the system.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateCurrentStep = async (): Promise<boolean> => {
    let fieldsToValidate: (keyof IntakeFormData)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ["firstName", "lastName", "phone"];
        break;
      case 2:
        fieldsToValidate = ["address", "city", "state", "zipCode"];
        break;
      case 3:
        break;
      case 4:
        break;
      case 5:
        fieldsToValidate = ["emergencyContactName", "emergencyContactPhone", "emergencyContactRelation"];
        break;
      case 6:
        fieldsToValidate = ["officeId"];
        break;
      case 7:
      case 8:
        break;
    }

    if (fieldsToValidate.length === 0) return true;
    
    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const goToNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const data = form.getValues();
      data.documentChecklist = documentChecklist;
      createClientMutation.mutate(data);
    }
  };

  const getStepCompletionStatus = (stepId: number): "complete" | "current" | "incomplete" => {
    if (stepId < currentStep) return "complete";
    if (stepId === currentStep) return "current";
    return "incomplete";
  };

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  if (createdClientId) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar title="Client Intake" />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto">
              <Card className="text-center" data-testid="card-success">
                <CardContent className="pt-10 pb-10">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-success-title">
                    Client Successfully Created!
                  </h2>
                  <p className="text-muted-foreground mb-6" data-testid="text-success-message">
                    The new client has been added to the system. You can now view their profile to add documents and schedule services.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button asChild data-testid="button-view-profile">
                      <Link href={`/clients/${createdClientId}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Client Profile
                      </Link>
                    </Button>
                    <Button variant="outline" asChild data-testid="button-add-another">
                      <Link href="/client-intake" onClick={() => {
                        setCreatedClientId(null);
                        form.reset();
                        setDocumentChecklist({});
                        setCurrentStep(1);
                      }}>
                        Add Another Client
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} data-testid="input-address" />
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
                    <Input placeholder="Apartment, suite, unit, etc." {...field} value={field.value || ""} data-testid="input-address2" />
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
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} data-testid="input-city" />
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
                    <FormLabel>State *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-state">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
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
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} data-testid="input-zip-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="primaryDiagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Diagnosis</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter primary medical conditions and diagnoses"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-primary-diagnosis"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="List any known allergies (medications, food, environmental)"
                      rows={2}
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-allergies"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="medications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Medications</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="List current medications with dosages"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-medications"
                    />
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
                    <Input placeholder="Dr. Name" {...field} value={field.value || ""} data-testid="input-primary-physician" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="mcoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MCO / Insurance Provider</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-mco">
                        <SelectValue placeholder="Select MCO or insurance provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mcos.map((mco) => (
                        <SelectItem key={mco.id} value={mco.id}>
                          {mco.name}
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
                    <Input placeholder="Insurance member ID" {...field} value={field.value || ""} data-testid="input-member-id" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="medicaidStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicaid Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "unknown"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-medicaid-status">
                        <SelectValue placeholder="Select Medicaid status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEDICAID_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="emergencyContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency Contact Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name of emergency contact" {...field} data-testid="input-emergency-contact-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="emergencyContactRelation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-emergency-contact-relation">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
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

      case 6:
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="officeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Office Location *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
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
              name="coordinatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Care Coordinator</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-coordinator">
                        <SelectValue placeholder="Select coordinator" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {coordinators.map((coord) => (
                        <SelectItem key={coord.id} value={coord.id}>
                          {coord.firstName} {coord.lastName}
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
              name="serviceStartDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Start Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      data-testid="input-service-start-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryCaregiverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Caregiver (Optional)</FormLabel>
                  <PersonCombobox
                    people={caregivers.filter(c => c.isActive) as any[]}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select primary caregiver"
                    testId="select-primary-caregiver"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Document Checklist</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Check off documents that have been collected or are ready for upload. Documents can be uploaded from the client profile after creation.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {REQUIRED_DOCUMENTS.map((doc) => (
                <div key={doc.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    id={doc.id}
                    checked={documentChecklist[doc.id] || false}
                    onCheckedChange={(checked) => {
                      setDocumentChecklist(prev => ({
                        ...prev,
                        [doc.id]: checked === true
                      }));
                    }}
                    data-testid={`checkbox-doc-${doc.id}`}
                  />
                  <div className="flex-1">
                    <label htmlFor={doc.id} className="text-sm font-medium cursor-pointer">
                      {doc.label}
                      {doc.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                  </div>
                  {documentChecklist[doc.id] && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 8:
        const values = form.getValues();
        const selectedOffice = offices.find(o => o.id === values.officeId);
        const selectedMco = mcos.find(m => m.id === values.mcoId);
        const selectedCoordinator = coordinators.find(c => c.id === values.coordinatorId);
        const selectedCaregiver = caregivers.find(c => c.id === values.primaryCaregiverId);
        const checkedDocs = Object.entries(documentChecklist).filter(([_, checked]) => checked);
        const requiredDocs = REQUIRED_DOCUMENTS.filter(d => d.required);
        const allRequiredDocsChecked = requiredDocs.every(d => documentChecklist[d.id]);

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" /> Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {values.firstName} {values.lastName}</div>
                  <div><span className="font-medium">DOB:</span> {values.dateOfBirth ? new Date(values.dateOfBirth).toLocaleDateString() : "Not provided"}</div>
                  <div><span className="font-medium">Phone:</span> {values.phone}</div>
                  <div><span className="font-medium">Email:</span> {values.email || "Not provided"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>{values.address}</div>
                  {values.address2 && <div>{values.address2}</div>}
                  <div>{values.city}, {values.state} {values.zipCode}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Medical Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="font-medium">Diagnosis:</span> {values.primaryDiagnosis || "Not provided"}</div>
                  <div><span className="font-medium">Allergies:</span> {values.allergies || "None listed"}</div>
                  <div><span className="font-medium">Medications:</span> {values.medications || "None listed"}</div>
                  <div><span className="font-medium">Physician:</span> {values.primaryPhysician || "Not provided"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Insurance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="font-medium">MCO:</span> {selectedMco?.name || "Not selected"}</div>
                  <div><span className="font-medium">Member ID:</span> {values.memberId || "Not provided"}</div>
                  <div><span className="font-medium">Medicaid Status:</span> <Badge variant="outline">{values.medicaidStatus}</Badge></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {values.emergencyContactName}</div>
                  <div><span className="font-medium">Phone:</span> {values.emergencyContactPhone}</div>
                  <div><span className="font-medium">Relationship:</span> {values.emergencyContactRelation}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="w-4 h-4" /> Service Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="font-medium">Office:</span> {selectedOffice?.name || "Not selected"}</div>
                  <div><span className="font-medium">Coordinator:</span> {selectedCoordinator ? `${selectedCoordinator.firstName} ${selectedCoordinator.lastName}` : "Not assigned"}</div>
                  <div><span className="font-medium">Start Date:</span> {values.serviceStartDate ? new Date(values.serviceStartDate).toLocaleDateString() : "Not set"}</div>
                  <div><span className="font-medium">Caregiver:</span> {selectedCaregiver ? `${selectedCaregiver.firstName} ${selectedCaregiver.lastName}` : "Not assigned"}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Document Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {checkedDocs.length > 0 ? (
                    checkedDocs.map(([docId]) => {
                      const doc = REQUIRED_DOCUMENTS.find(d => d.id === docId);
                      return (
                        <Badge key={docId} variant="secondary" className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {doc?.label.split("(")[0].trim()}
                        </Badge>
                      );
                    })
                  ) : (
                    <span className="text-muted-foreground text-sm">No documents checked</span>
                  )}
                </div>
                {!allRequiredDocsChecked && (
                  <p className="text-amber-600 text-sm mt-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Some required documents are not checked. You can still create the client and upload documents later.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar title="Client Intake Wizard" />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">New Client Intake</h1>
                <p className="text-muted-foreground">Complete all steps to add a new client to the system</p>
              </div>
              <div className="flex items-center gap-2">
                {hasDraft && (
                  <Button variant="outline" size="sm" onClick={clearDraft} data-testid="button-clear-draft">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Draft
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={saveDraft} data-testid="button-save-draft">
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {currentStep} of {STEPS.length}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-2" data-testid="progress-bar" />
            </div>

            <div className="hidden md:flex justify-between mb-8 gap-2">
              {STEPS.map((step) => {
                const status = getStepCompletionStatus(step.id);
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                    disabled={step.id > currentStep}
                    className={`flex-1 flex flex-col items-center p-3 rounded-lg transition-colors ${
                      status === "current" 
                        ? "bg-primary text-primary-foreground"
                        : status === "complete"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                    data-testid={`step-${step.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                      status === "complete" ? "bg-green-500 text-white" : ""
                    }`}>
                      {status === "complete" ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-center">{step.title}</span>
                  </button>
                );
              })}
            </div>

            <Card data-testid="card-step-content">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const step = STEPS.find(s => s.id === currentStep);
                    const Icon = step?.icon || User;
                    return <Icon className="w-5 h-5" />;
                  })()}
                  {STEPS.find(s => s.id === currentStep)?.title}
                </CardTitle>
                <CardDescription>
                  {STEPS.find(s => s.id === currentStep)?.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={(e) => e.preventDefault()}>
                    {renderStepContent()}
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 1}
                data-testid="button-previous"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep < STEPS.length ? (
                <Button onClick={goToNextStep} data-testid="button-next">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={createClientMutation.isPending}
                  data-testid="button-submit"
                >
                  {createClientMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Client...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Client
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
