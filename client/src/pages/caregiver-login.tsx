import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, EyeOff, Smartphone, KeyRound, UserCircle, ArrowLeft } from "lucide-react";
import cchcLogo from "@assets/15A8EB0D-1FA3-4805-BF3C-7810910EC966_1767496211498.png";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CaregiverLogin() {
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
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
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
      await apiRequest("POST", "/api/auth/caregiver/sms/request-login-code", { phone: smsPhone });
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
      await apiRequest("POST", "/api/auth/caregiver/sms/login", { phone: smsPhone, code: smsCode });
      window.location.href = "/my-profile";
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
      await apiRequest("POST", "/api/auth/caregiver/forgot-password", { email: forgotEmail });
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

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await apiRequest("POST", "/api/auth/caregiver/login", { username, password });
      window.location.href = "/my-profile";
    } catch (error: any) {
      const errorMessage = error?.message || "Invalid credentials. Please try again.";
      setLoginError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

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
          <div className="flex items-center justify-center gap-2 mb-2">
            <UserCircle className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium text-primary">Caregiver Portal</span>
          </div>
          <CardTitle className="text-2xl">Caregiver Login</CardTitle>
          <CardDescription>Sign in to access your caregiver portal</CardDescription>
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
                {loginError && (
                  <p className="text-sm text-destructive">{loginError}</p>
                )}
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
                    SMS login requires a verified mobile number linked to your caregiver profile.
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

          <div className="mt-6 pt-4 border-t border-border">
            <Link href="/">
              <Button variant="ghost" className="w-full" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
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
