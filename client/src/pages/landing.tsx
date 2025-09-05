import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Users, FileText, Bell, BarChart3 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Home Care</h1>
            </div>
            <Button onClick={handleLogin} className="px-6" data-testid="button-login">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Streamline Your Home Care Operations
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            HIPAA-compliant management system for client care, caregiver coordination, 
            and regulatory compliance. Everything you need in one secure platform.
          </p>
          <Button 
            onClick={handleLogin} 
            size="lg" 
            className="px-8 py-3 text-lg"
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            Complete Care Management Solution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Client Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Comprehensive client profiles with medical history, care plans, 
                  and progress tracking. HIPAA-compliant storage included.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Compliance Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Stay ahead of regulatory requirements with automated compliance 
                  monitoring, certification tracking, and audit-ready documentation.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-destructive" />
                </div>
                <CardTitle>Secure Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Encrypted document storage with electronic signatures. 
                  Upload insurance cards, care plans, and incident reports securely.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Smart Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Automated notifications for certification renewals, 
                  care plan assessments, and critical tasks that need attention.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Analytics & Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Comprehensive reporting on client census, compliance rates, 
                  incident trends, and service utilization metrics.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-destructive" />
                </div>
                <CardTitle>Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Internal messaging, task management, and role-based access 
                  for administrators, supervisors, caregivers, and families.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security Notice */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-4">
                HIPAA-Compliant & Secure
              </h3>
              <p className="text-muted-foreground mb-6">
                Your data is protected with enterprise-grade encryption, audit logging, 
                and compliance with all healthcare privacy regulations. We take security seriously.
              </p>
              <Button 
                onClick={handleLogin} 
                className="px-8"
                data-testid="button-secure-login"
              >
                Secure Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">CareConnect</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 CareConnect. HIPAA-compliant home care management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
