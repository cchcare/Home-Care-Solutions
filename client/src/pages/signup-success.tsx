import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Building2, CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function SignupSuccess() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState("");

  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session_id");
  const organizationId = searchParams.get("org");

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/public/verify-checkout", {
        sessionId,
        organizationId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage("Payment verification failed. Please contact support.");
      }
    },
    onError: (error: any) => {
      setStatus('error');
      setErrorMessage(error.message || "An error occurred during verification");
    },
  });

  useEffect(() => {
    if (sessionId && organizationId) {
      // Came back from Stripe Checkout — verify the payment before activating.
      verifyMutation.mutate();
    } else if (organizationId) {
      // No Stripe session to verify: the account was activated directly at
      // signup (Stripe payment is currently disabled).
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMessage("Missing organization information");
    }
  }, [sessionId, organizationId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <a className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Home Care</span>
            </a>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            {status === 'verifying' && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
                <CardTitle>Verifying Your Payment</CardTitle>
                <CardDescription>Please wait while we confirm your subscription...</CardDescription>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-green-600">Welcome to Home Care!</CardTitle>
                <CardDescription>Your agency account has been created successfully</CardDescription>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <CardTitle className="text-red-600">Something Went Wrong</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="text-center">
            {status === 'success' && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Your subscription is now active. You can log in to start managing your agency.
                </p>
                <div className="flex flex-col gap-2">
                  <Link href="/">
                    <Button className="w-full" size="lg" data-testid="btn-go-to-login">
                      Go to Login
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use the admin email and password you just created to log in.
                </p>
              </div>
            )}
            {status === 'error' && (
              <div className="space-y-4">
                <Link href="/pricing">
                  <Button variant="outline" data-testid="btn-try-again">
                    Try Again
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  If you continue to have issues, please contact support.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
