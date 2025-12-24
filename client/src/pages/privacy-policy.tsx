import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Home Care</h1>
            </div>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: December 2024</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                Home Care ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our home care management platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. HIPAA Compliance</h2>
              <p className="text-muted-foreground">
                As a healthcare management system, we are committed to maintaining compliance with the Health Insurance Portability and Accountability Act (HIPAA). We implement appropriate administrative, physical, and technical safeguards to protect the privacy and security of Protected Health Information (PHI).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Information We Collect</h2>
              <p className="text-muted-foreground mb-2">We may collect the following types of information:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Personal identification information (name, email, phone number)</li>
                <li>Healthcare-related information for clients and caregivers</li>
                <li>Employment and certification records</li>
                <li>Usage data and system logs</li>
                <li>Communication records within the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-2">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Provide and maintain our services</li>
                <li>Manage client care and caregiver assignments</li>
                <li>Ensure regulatory compliance</li>
                <li>Communicate with users about their accounts</li>
                <li>Improve our platform and services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures to protect your data, including encryption, secure authentication, access controls, and regular security audits. All data is stored securely and access is limited to authorized personnel only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain personal information for as long as necessary to fulfill the purposes outlined in this policy, comply with legal obligations, and resolve disputes. Healthcare records are retained in accordance with applicable state and federal regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
              <p className="text-muted-foreground mb-2">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (subject to legal requirements)</li>
                <li>Receive a copy of your data in a portable format</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or our data practices, please contact your system administrator or the Home Care support team.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
