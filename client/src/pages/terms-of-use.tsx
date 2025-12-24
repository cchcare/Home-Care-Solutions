import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfUse() {
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
            <CardTitle className="text-3xl">Terms of Use</CardTitle>
            <p className="text-muted-foreground">Last updated: December 2024</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using the Home Care platform, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
              <p className="text-muted-foreground">
                Permission is granted to use the Home Care platform for authorized business purposes related to home care agency management. This license does not include the right to modify, copy, or distribute the software, or use it for any unlawful purpose.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
              <p className="text-muted-foreground mb-2">As a user of this platform, you agree to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Provide accurate and complete information</li>
                <li>Maintain the confidentiality of your login credentials</li>
                <li>Use the platform in compliance with HIPAA and other applicable regulations</li>
                <li>Report any security breaches or unauthorized access immediately</li>
                <li>Not share PHI or confidential information with unauthorized parties</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Account Security</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the security of your account and password. You must notify us immediately of any unauthorized use of your account. We will not be liable for any loss or damage arising from your failure to protect your account credentials.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Accuracy</h2>
              <p className="text-muted-foreground">
                Users are responsible for ensuring the accuracy of all data entered into the system. This includes client information, caregiver records, scheduling data, and compliance documentation. Inaccurate data entry may affect care delivery and regulatory compliance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Prohibited Activities</h2>
              <p className="text-muted-foreground mb-2">You may not:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Use the platform for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to other accounts or systems</li>
                <li>Transmit malware, viruses, or other harmful code</li>
                <li>Interfere with the proper functioning of the platform</li>
                <li>Share login credentials with unauthorized individuals</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Service Availability</h2>
              <p className="text-muted-foreground">
                While we strive to maintain high availability, we do not guarantee uninterrupted access to the platform. Scheduled maintenance and unexpected outages may occur. We will make reasonable efforts to minimize service disruptions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                Home Care shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the platform. This includes but is not limited to damages for loss of data, business interruption, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Modifications</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms of Use at any time. Changes will be effective immediately upon posting. Your continued use of the platform after changes are posted constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Use, please contact your system administrator or the Home Care support team.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
