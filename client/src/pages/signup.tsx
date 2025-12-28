import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  clientLimitMin: number;
  clientLimitMax: number;
  features: string[] | null;
  isPopular: boolean | null;
}

const signupSchema = z.object({
  organizationName: z.string().min(2, "Agency name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
  adminEmail: z.string().email("Please enter a valid email"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  planId: z.string().min(1, "Please select a plan"),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const searchParams = new URLSearchParams(window.location.search);
  const planFromUrl = searchParams.get("plan");

  useEffect(() => {
    if (planFromUrl) {
      setSelectedPlanId(planFromUrl);
    }
  }, [planFromUrl]);

  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      organizationName: "",
      email: "",
      phone: "",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
      planId: planFromUrl || "",
    },
  });

  useEffect(() => {
    if (selectedPlanId) {
      form.setValue("planId", selectedPlanId);
    }
  }, [selectedPlanId, form]);

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const response = await apiRequest("POST", "/api/public/signup", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Signup successful",
          description: "Redirecting to payment...",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const onSubmit = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  const nextStep = async () => {
    if (step === 1) {
      const valid = await form.trigger(["planId"]);
      if (valid && selectedPlanId) {
        setStep(2);
      }
    } else if (step === 2) {
      const valid = await form.trigger(["organizationName", "email", "phone"]);
      if (valid) {
        setStep(3);
      }
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <a className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Home Care</span>
            </a>
          </Link>
          <Link href="/pricing">
            <a className="text-sm text-muted-foreground hover:text-foreground">View Pricing</a>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Create Your Agency Account</h1>
            <span className="text-sm text-muted-foreground">Step {step} of 3</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Choose Your Plan</CardTitle>
                  <CardDescription>Select the plan that best fits your agency size</CardDescription>
                </CardHeader>
                <CardContent>
                  {plansLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {plans.map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedPlanId === plan.id
                              ? 'border-primary bg-primary/5 ring-2 ring-primary'
                              : 'hover:border-slate-300'
                          }`}
                          data-testid={`signup-plan-${plan.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold flex items-center gap-2">
                                {plan.name}
                                {plan.isPopular && (
                                  <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">Popular</span>
                                )}
                              </h3>
                              <p className="text-sm text-muted-foreground">{plan.description}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {plan.clientLimitMin}-{plan.clientLimitMax >= 1000 ? '∞' : plan.clientLimitMax} clients
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold">{formatPrice(plan.priceMonthly)}</span>
                              <span className="text-sm text-muted-foreground">/mo</span>
                            </div>
                          </div>
                          {selectedPlanId === plan.id && (
                            <div className="mt-2 flex items-center text-sm text-primary">
                              <Check className="h-4 w-4 mr-1" /> Selected
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="planId"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input {...field} value={selectedPlanId} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Agency Information</CardTitle>
                  <CardDescription>Tell us about your home care agency</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agency Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Home Care Agency, LLC" {...field} data-testid="input-org-name" />
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
                        <FormLabel>Agency Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="info@youragency.com" {...field} data-testid="input-org-email" />
                        </FormControl>
                        <FormDescription>Primary contact email for your agency</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agency Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} data-testid="input-org-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Administrator Account</CardTitle>
                  <CardDescription>Create your admin account to manage the agency</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="adminFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-admin-first" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adminLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Smith" {...field} data-testid="input-admin-last" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@youragency.com" {...field} data-testid="input-admin-email" />
                        </FormControl>
                        <FormDescription>You'll use this to log in</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} data-testid="input-admin-password" />
                        </FormControl>
                        <FormDescription>At least 8 characters</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} data-testid="input-admin-confirm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedPlan && (
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                      <h4 className="font-medium mb-2">Order Summary</h4>
                      <div className="flex justify-between text-sm">
                        <span>{selectedPlan.name}</span>
                        <span className="font-medium">{formatPrice(selectedPlan.priceMonthly)}/mo</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        You'll be redirected to our secure payment page
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between mt-6">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep} data-testid="btn-prev-step">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              ) : (
                <Link href="/pricing">
                  <Button type="button" variant="outline" data-testid="btn-back-pricing">
                    <ArrowLeft className="h-4 w-4 mr-2" /> View Plans
                  </Button>
                </Link>
              )}

              {step < 3 ? (
                <Button 
                  type="button" 
                  onClick={nextStep} 
                  disabled={step === 1 && !selectedPlanId}
                  data-testid="btn-next-step"
                >
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={signupMutation.isPending}
                  data-testid="btn-submit-signup"
                >
                  {signupMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue to Payment <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
