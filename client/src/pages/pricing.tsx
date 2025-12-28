import { Link } from "wouter";
import { Check, X, Building2, Users, Shield, Clock, HeadphonesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  client_management: "Client Management",
  caregiver_management: "Caregiver Management",
  basic_scheduling: "Basic Scheduling",
  document_management: "Document Management",
  email_support: "Email Support",
  evv_tracking: "EVV Tracking",
  compliance_monitoring: "Compliance Monitoring",
  advanced_scheduling: "Advanced Scheduling",
  priority_support: "Priority Support",
  billing_payroll: "Billing & Payroll",
  analytics_dashboard: "Analytics Dashboard",
  api_access: "API Access",
  dedicated_support: "Dedicated Support",
  custom_integrations: "Custom Integrations",
  white_glove_onboarding: "White Glove Onboarding",
  sla_guarantee: "SLA Guarantee",
  phone_support_24_7: "24/7 Phone Support",
};

const ALL_FEATURES = [
  "client_management",
  "caregiver_management",
  "basic_scheduling",
  "document_management",
  "email_support",
  "evv_tracking",
  "compliance_monitoring",
  "advanced_scheduling",
  "priority_support",
  "billing_payroll",
  "analytics_dashboard",
  "api_access",
  "dedicated_support",
  "custom_integrations",
  "white_glove_onboarding",
  "sla_guarantee",
  "phone_support_24_7",
];

interface PlanTier {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  clientLimitMin: number;
  clientLimitMax: number;
  features: string[];
  isPopular: boolean;
}

const PLANS: PlanTier[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for small agencies just getting started",
    priceMonthly: 4900,
    clientLimitMin: 1,
    clientLimitMax: 25,
    features: [
      "client_management",
      "caregiver_management",
      "basic_scheduling",
      "document_management",
      "email_support",
    ],
    isPopular: false,
  },
  {
    id: "growth",
    name: "Growth",
    description: "For growing agencies with expanding needs",
    priceMonthly: 9900,
    clientLimitMin: 26,
    clientLimitMax: 75,
    features: [
      "client_management",
      "caregiver_management",
      "basic_scheduling",
      "document_management",
      "email_support",
      "evv_tracking",
      "compliance_monitoring",
      "advanced_scheduling",
      "priority_support",
    ],
    isPopular: true,
  },
  {
    id: "professional",
    name: "Professional",
    description: "Advanced features for established agencies",
    priceMonthly: 19900,
    clientLimitMin: 76,
    clientLimitMax: 200,
    features: [
      "client_management",
      "caregiver_management",
      "basic_scheduling",
      "document_management",
      "email_support",
      "evv_tracking",
      "compliance_monitoring",
      "advanced_scheduling",
      "priority_support",
      "billing_payroll",
      "analytics_dashboard",
      "api_access",
      "dedicated_support",
    ],
    isPopular: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Full-featured solution for large agencies",
    priceMonthly: 39900,
    clientLimitMin: 201,
    clientLimitMax: 500,
    features: [
      "client_management",
      "caregiver_management",
      "basic_scheduling",
      "document_management",
      "email_support",
      "evv_tracking",
      "compliance_monitoring",
      "advanced_scheduling",
      "priority_support",
      "billing_payroll",
      "analytics_dashboard",
      "api_access",
      "dedicated_support",
      "custom_integrations",
      "white_glove_onboarding",
      "sla_guarantee",
      "phone_support_24_7",
    ],
    isPopular: false,
  },
];

export default function Pricing() {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatClientRange = (min: number, max: number) => {
    if (max >= 1000) return `${min}+ clients`;
    return `${min}-${max} clients`;
  };

  const hasFeature = (plan: PlanTier, feature: string) => {
    return plan.features.includes(feature);
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
          <div className="flex items-center gap-4">
            <Link href="/">
              <a className="text-sm text-muted-foreground hover:text-foreground">Home</a>
            </Link>
            <Link href="/pricing">
              <a className="text-sm font-medium">Pricing</a>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="btn-login">Log In</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your agency size. All plans include full access to our 
            HIPAA-compliant platform with automatic monthly billing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16">
          {PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative flex flex-col ${plan.isPopular ? 'border-primary shadow-lg ring-2 ring-primary' : ''}`}
              data-testid={`plan-card-${plan.id}`}
            >
              {plan.isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-slate-900">
                    {formatPrice(plan.priceMonthly)}
                  </div>
                  <div className="text-sm text-muted-foreground">/month</div>
                </div>

                <div className="mb-6 p-3 bg-slate-50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-700">
                    <Users className="h-4 w-4" />
                    {formatClientRange(plan.clientLimitMin, plan.clientLimitMax)}
                  </div>
                </div>

                <ul className="space-y-2">
                  {ALL_FEATURES.map((feature) => {
                    const included = hasFeature(plan, feature);
                    return (
                      <li 
                        key={feature} 
                        className={`flex items-start gap-2 text-sm ${!included ? 'text-muted-foreground' : ''}`}
                        data-testid={`feature-${plan.id}-${feature}`}
                      >
                        {included ? (
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-slate-300 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={!included ? 'line-through' : ''}>
                          {FEATURE_DISPLAY_NAMES[feature] || feature}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={`/signup?plan=${plan.id}`} className="w-full">
                  <Button 
                    className="w-full" 
                    variant={plan.isPopular ? "default" : "outline"}
                    size="lg"
                    data-testid={`btn-select-plan-${plan.id}`}
                  >
                    Get Started
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <section className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">All Plans Include</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">HIPAA Compliant</h3>
              <p className="text-sm text-muted-foreground">
                Fully secure platform with encrypted data storage and audit logging
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">24/7 Access</h3>
              <p className="text-sm text-muted-foreground">
                Access your data anytime, anywhere with our cloud-based platform
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeadphonesIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Customer Support</h3>
              <p className="text-sm text-muted-foreground">
                Get help when you need it with our dedicated support team
              </p>
            </div>
          </div>
        </section>

        <section className="mt-24 text-center">
          <div className="bg-slate-900 text-white rounded-2xl p-12 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Need a Custom Solution?</h2>
            <p className="text-slate-300 mb-6">
              Have more than 500 clients or need custom features? Contact us for an enterprise quote.
            </p>
            <Button variant="secondary" size="lg" data-testid="btn-contact-sales">
              Contact Sales
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t mt-24 py-8 bg-white">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Home Care. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
