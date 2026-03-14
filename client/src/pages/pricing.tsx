import { Link } from "wouter";
import { Check, Building2, Users, Shield, Clock, HeadphonesIcon, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SubscriptionPlan } from "@shared/schema";

export default function Pricing() {
  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

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
          {isLoading ? (
            <div className="col-span-full flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : plans.map((plan) => (
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
                  {(plan.features ?? []).map((feature) => (
                    <li 
                      key={feature} 
                      className="flex items-start gap-2 text-sm"
                      data-testid={`feature-${plan.id}-${feature}`}
                    >
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
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
