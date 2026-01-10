import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, FileText, Bell, BarChart3, Loader2, Eye, EyeOff, Smartphone, KeyRound } from "lucide-react";
import cchcLogo from "@assets/15A8EB0D-1FA3-4805-BF3C-7810910EC966_1767496211498.png";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Landing() {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginTab, setLoginTab] = useState<"password" | "sms">("password");
  const [smsPhone, setSmsPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const [isSendingSmsCode, setIsSendingSmsCode] = useState(false);
  const [isSmsLoggingIn, setIsSmsLoggingIn] = useState(false);
  const { login, isLoggingIn, loginError } = useAuth();
  const { toast } = useToast();

  const handleRequestSmsCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!smsPhone) {
      toast({
        title: "Error",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSendingSmsCode(true);
    try {
      await apiRequest("POST", "/api/auth/sms/request-login-code", { phone: smsPhone });
      setSmsCodeSent(true);
      toast({
        title: "Code Sent",
        description: "If your phone number is registered, a login code has been sent.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send login code",
        variant: "destructive",
      });
    } finally {
      setIsSendingSmsCode(false);
    }
  };

  const handleSmsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!smsPhone || !smsCode) {
      toast({
        title: "Error",
        description: "Please enter your phone number and the 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsSmsLoggingIn(true);
    try {
      const response = await apiRequest("POST", "/api/auth/sms/login", { phone: smsPhone, code: smsCode });
      // Redirect to dashboard on success
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid phone number or code",
        variant: "destructive",
      });
    } finally {
      setIsSmsLoggingIn(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotEmail) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsSendingReset(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: forgotEmail });
      toast({
        title: "Check Your Email",
        description: "If an account with that email exists, a password reset link has been sent.",
      });
      setShowForgotPassword(false);
      setForgotEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    try {
      await login({ username, password });
    } catch (error: any) {
      const errorMessage = error?.message || "Invalid credentials. Please try again.";
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <img 
              src={cchcLogo} 
              alt="CCHC Solutions" 
              className="w-24 h-24 mx-auto mb-4 object-contain"
              data-testid="img-cchc-logo"
            />
            <CardTitle className="text-2xl">Staff Login</CardTitle>
            <CardDescription>Sign in to the staff portal. Caregivers should use the <Link href="/caregiver-login" className="text-primary hover:underline">Caregiver Portal</Link> instead.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={loginTab} onValueChange={(v) => setLoginTab(v as "password" | "sms")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="password" className="flex items-center gap-2" data-testid="tab-password-login">
                  <KeyRound className="w-4 h-4" />
                  Password
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center gap-2" data-testid="tab-sms-login">
                  <Smartphone className="w-4 h-4" />
                  Text Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="password">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username or Email</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username or email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoggingIn}
                      data-testid="input-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoggingIn}
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoggingIn}
                    data-testid="button-submit-login"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-primary hover:text-primary/80"
                      onClick={() => setShowForgotPassword(true)}
                      data-testid="button-forgot-password"
                    >
                      Forgot login or password?
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="sms">
                {!smsCodeSent ? (
                  <form onSubmit={handleRequestSmsCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sms-phone">Mobile Phone Number</Label>
                      <p className="text-xs text-muted-foreground">
                        Enter the verified mobile number linked to your account
                      </p>
                      <Input
                        id="sms-phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={smsPhone}
                        onChange={(e) => setSmsPhone(e.target.value)}
                        disabled={isSendingSmsCode}
                        data-testid="input-sms-phone"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSendingSmsCode || !smsPhone}
                      data-testid="button-request-sms-code"
                    >
                      {isSendingSmsCode ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending Code...
                        </>
                      ) : (
                        <>
                          <Smartphone className="mr-2 h-4 w-4" />
                          Send Login Code
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      SMS login requires a verified mobile number. Set up mobile login in Account Settings after signing in with your password.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleSmsLogin} className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                      A 6-digit code has been sent to your phone. Enter it below to sign in.
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sms-code">6-Digit Code</Label>
                      <Input
                        id="sms-code"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
                        disabled={isSmsLoggingIn}
                        data-testid="input-sms-code"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSmsLoggingIn || smsCode.length !== 6}
                      data-testid="button-sms-login"
                    >
                      {isSmsLoggingIn ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <button
                        type="button"
                        className="text-primary hover:text-primary/80"
                        onClick={handleRequestSmsCode}
                        disabled={isSendingSmsCode}
                        data-testid="button-resend-sms-code"
                      >
                        Resend code
                      </button>
                      <span className="text-muted-foreground">or</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setSmsCodeSent(false);
                          setSmsCode("");
                        }}
                        data-testid="button-change-sms-phone"
                      >
                        Change number
                      </button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={() => setShowLoginForm(false)}
              >
                Back to Home
              </button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Your Password</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={isSendingReset}
                  data-testid="input-forgot-email"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForgotPassword(false)}
                  disabled={isSendingReset}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSendingReset}
                  data-testid="button-send-reset"
                >
                  {isSendingReset ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={cchcLogo} alt="CCHC Solutions" className="w-12 h-12 object-contain" />
              <h1 className="text-2xl font-bold text-foreground">CCHC Solutions</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-pricing">
                Pricing
              </Link>
              <Button onClick={() => setShowLoginForm(true)} variant="outline" data-testid="button-login">
                Staff Login
              </Button>
              <Link href="/caregiver-login">
                <Button variant="ghost" data-testid="button-caregiver-login">
                  Caregiver Portal
                </Button>
              </Link>
              <Button onClick={() => window.location.href = '/pricing'} data-testid="button-get-started-header">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

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
            size="lg" 
            className="px-8 py-3 text-lg"
            onClick={() => window.location.href = '/pricing'}
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>
      </section>

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
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => setShowLoginForm(true)} 
                  className="px-8"
                  data-testid="button-secure-login"
                >
                  Staff Login
                </Button>
                <Link href="/caregiver-login">
                  <Button 
                    variant="outline"
                    className="px-8"
                    data-testid="button-caregiver-portal"
                  >
                    Caregiver Portal
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <img src={cchcLogo} alt="CCHC Solutions" className="w-10 h-10 object-contain" />
              <span className="font-semibold text-foreground">CCHC Solutions</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="/privacy-policy" className="hover:text-foreground" data-testid="link-privacy-policy">
                Privacy Policy
              </a>
              <a href="/terms-of-use" className="hover:text-foreground" data-testid="link-terms-of-use">
                Terms of Use
              </a>
              <a href="/system-status" className="hover:text-foreground" data-testid="link-system-status">
                System Status
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 CCHC Solutions. HIPAA-compliant home care management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
