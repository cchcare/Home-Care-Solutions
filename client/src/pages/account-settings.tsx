import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User as UserIcon, 
  Mail, 
  Building2, 
  Shield, 
  Save, 
  AlertCircle,
  Calendar,
  Eye,
  EyeOff,
  Camera,
  Upload,
  Loader2,
  KeyRound,
  Smartphone,
  CheckCircle,
  Phone
} from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";

// Form schema for updating user profile
const accountSettingsSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  profileImageUrl: z.string().url().optional().or(z.literal("")),
});

type AccountSettingsFormData = z.infer<typeof accountSettingsSchema>;

// Form schema for changing password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function AccountSettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mobilePhone, setMobilePhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [showChangePhone, setShowChangePhone] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch current user data
  const { data: currentUser, isLoading: isLoadingUser, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Handle unauthorized errors at page level
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [error, toast]);

  // Fetch offices for display
  const { data: offices = [] } = useQuery<any[]>({
    queryKey: ["/api/offices"],
  });

  const form = useForm<AccountSettingsFormData>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      profileImageUrl: "",
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form when user data is loaded
  useEffect(() => {
    if (currentUser) {
      form.reset({
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        profileImageUrl: currentUser.profileImageUrl || "",
      });
    }
  }, [currentUser, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: AccountSettingsFormData) => {
      return await apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AccountSettingsFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormData) => {
      return await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Success",
        description: "Your password has been changed successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  // Fetch mobile verification status
  const { data: smsStatus } = useQuery<{ mobilePhone: string | null; mobileVerified: boolean }>({
    queryKey: ["/api/auth/sms/status"],
  });

  // Send verification code mutation
  const sendVerificationMutation = useMutation({
    mutationFn: async (phone: string) => {
      return await apiRequest("POST", "/api/auth/sms/send-verification", { phone });
    },
    onSuccess: () => {
      setVerificationSent(true);
      toast({
        title: "Code Sent",
        description: "A 6-digit verification code has been sent to your phone",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  // Verify phone mutation
  const verifyPhoneMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest("POST", "/api/auth/sms/verify-phone", { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/sms/status"] });
      setVerificationSent(false);
      setVerificationCode("");
      setShowChangePhone(false);
      toast({
        title: "Phone Verified",
        description: "Your mobile phone number has been verified. You can now use it to login.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify phone number",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or GIF image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      
      const response = await fetch('/api/profile/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }
      
      const data = await response.json();
      
      // Update the form and refetch user data
      form.setValue('profileImageUrl', data.profileImageUrl);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin": return "destructive";
      case "admin": return "default";
      case "supervisor": return "secondary";
      case "caregiver": return "outline";
      case "family": return "outline";
      default: return "outline";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin": return Shield;
      case "admin": return Shield;
      case "supervisor": return UserIcon;
      default: return UserIcon;
    }
  };

  if (isLoading || isLoadingUser) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Account Settings" subtitle="Manage your personal information" />
          <div className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading your account settings...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Account Settings" subtitle="Manage your personal information" />
          <div className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-4xl mx-auto">
              <Alert className="border-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Unable to load your account information. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(currentUser.role);
  const officeName = offices.find((office: any) => office.id === currentUser.primaryOfficeId)?.name;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Account Settings"
          subtitle="Manage your personal information and preferences"
        />
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                <p className="text-muted-foreground">
                  Update your personal information and profile settings
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Overview Card */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserIcon className="mr-2 h-5 w-5" />
                    Profile Overview
                  </CardTitle>
                  <CardDescription>
                    Your current profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="relative inline-block">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto overflow-hidden">
                        {currentUser.profileImageUrl ? (
                          <img 
                            src={currentUser.profileImageUrl} 
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover"
                            data-testid="img-profile-picture"
                          />
                        ) : (
                          <span className="text-2xl font-semibold text-gray-500">
                            {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <label 
                        htmlFor="profile-image-upload" 
                        className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
                        data-testid="button-upload-profile-image"
                      >
                        {isUploadingImage ? (
                          <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 text-primary-foreground" />
                        )}
                      </label>
                      <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/gif"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploadingImage}
                        data-testid="input-profile-image-upload"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Click camera icon to upload</p>
                    <h3 className="font-semibold text-lg">
                      {currentUser.firstName && currentUser.lastName 
                        ? `${currentUser.firstName} ${currentUser.lastName}` 
                        : currentUser.email
                      }
                    </h3>
                    <div className="flex justify-center mt-2">
                      <Badge variant={getRoleColor(currentUser.role)}>
                        <RoleIcon className="mr-1 h-3 w-3" />
                        {currentUser.role?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                      </div>
                    </div>

                    {officeName && (
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Office</p>
                          <p className="text-sm text-muted-foreground">{officeName}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Member Since</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(currentUser.createdAt), "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Edit Profile Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Update Profile Information</CardTitle>
                  <CardDescription>
                    Make changes to your profile information. Click save when you're done.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter your first name"
                                  {...field} 
                                  data-testid="input-first-name"
                                />
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
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter your last name"
                                  {...field} 
                                  data-testid="input-last-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="profileImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profile Image URL (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="url"
                                placeholder="https://example.com/your-profile-image.jpg"
                                {...field} 
                                data-testid="input-profile-image"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      {/* Read-only Account Information */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Account Information</h4>
                        <p className="text-sm text-muted-foreground">
                          The following information is managed by your administrator and cannot be changed.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                            <Input value={currentUser.email || ""} disabled className="mt-1" />
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Role</label>
                            <Input value={currentUser.role?.replace('_', ' ') || ""} disabled className="mt-1" />
                          </div>
                        </div>

                        {officeName && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Primary Office</label>
                            <Input value={officeName} disabled className="mt-1" />
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-profile"
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Change Password Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <KeyRound className="mr-2 h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password for security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Enter your current password"
                                {...field} 
                                data-testid="input-current-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                data-testid="button-toggle-current-password"
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Enter your new password (min 8 characters)"
                                {...field} 
                                data-testid="input-new-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                data-testid="button-toggle-new-password"
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your new password"
                                {...field} 
                                data-testid="input-confirm-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                data-testid="button-toggle-confirm-password"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-change-password"
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            Changing...
                          </>
                        ) : (
                          <>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Change Password
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Mobile SMS Login Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="mr-2 h-5 w-5" />
                  Mobile Login
                </CardTitle>
                <CardDescription>
                  Set up your mobile phone for SMS login - login using a 6-digit code sent to your phone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {smsStatus?.mobileVerified && !showChangePhone ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">Phone Verified</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {smsStatus.mobilePhone} - You can use this number to login via SMS
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Want to change your phone number?
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setShowChangePhone(true);
                          setMobilePhone("");
                          setVerificationSent(false);
                          setVerificationCode("");
                        }}
                        data-testid="button-change-phone"
                      >
                        Change Number
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <Phone className="h-4 w-4" />
                      <AlertDescription>
                        {showChangePhone 
                          ? "Enter your new mobile phone number to update your SMS login." 
                          : "Verify your mobile phone number to enable SMS login. Once verified, you can login by receiving a 6-digit code to your phone instead of using a password."
                        }
                      </AlertDescription>
                    </Alert>
                    
                    {!verificationSent ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">{showChangePhone ? "New Mobile Phone Number" : "Mobile Phone Number"}</label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Enter your US mobile phone number to receive verification codes
                          </p>
                          <div className="flex gap-2">
                            <Input
                              type="tel"
                              placeholder="(555) 123-4567"
                              value={mobilePhone}
                              onChange={(e) => setMobilePhone(e.target.value)}
                              data-testid="input-mobile-phone"
                            />
                            <Button
                              onClick={() => {
                                if (mobilePhone) {
                                  sendVerificationMutation.mutate(mobilePhone);
                                }
                              }}
                              disabled={sendVerificationMutation.isPending || !mobilePhone}
                              data-testid="button-send-verification"
                            >
                              {sendVerificationMutation.isPending ? (
                                <Loader2 className="animate-spin h-4 w-4" />
                              ) : (
                                "Send Code"
                              )}
                            </Button>
                          </div>
                        </div>
                        {showChangePhone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowChangePhone(false);
                              setMobilePhone("");
                            }}
                            data-testid="button-cancel-change-phone"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                          <Smartphone className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800 dark:text-blue-200">
                            A 6-digit code has been sent to your phone. Enter it below to verify.
                          </AlertDescription>
                        </Alert>
                        <div>
                          <label className="text-sm font-medium">Verification Code</label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="text"
                              placeholder="123456"
                              maxLength={6}
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                              data-testid="input-verification-code"
                            />
                            <Button
                              onClick={() => verifyPhoneMutation.mutate(verificationCode)}
                              disabled={verifyPhoneMutation.isPending || verificationCode.length !== 6}
                              data-testid="button-verify-code"
                            >
                              {verifyPhoneMutation.isPending ? (
                                <Loader2 className="animate-spin h-4 w-4" />
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto"
                            onClick={() => {
                              if (mobilePhone) {
                                sendVerificationMutation.mutate(mobilePhone);
                              }
                            }}
                            disabled={sendVerificationMutation.isPending || !mobilePhone}
                            data-testid="button-resend-code"
                          >
                            Resend
                          </Button>
                          <span className="text-muted-foreground">or</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto"
                            onClick={() => {
                              setVerificationSent(false);
                              setVerificationCode("");
                            }}
                            data-testid="button-change-number"
                          >
                            Change number
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Information Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Account Status & Security
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                    data-testid="button-toggle-sensitive-info"
                  >
                    {showSensitiveInfo ? (
                      <><EyeOff className="mr-2 h-4 w-4" />Hide</>
                    ) : (
                      <><Eye className="mr-2 h-4 w-4" />Show</>
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>
                  View your account status and security information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Account Status</p>
                    <Badge variant={currentUser.isActive ? "default" : "secondary"}>
                      {currentUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Account Created</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(currentUser.createdAt), "PPP")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(currentUser.updatedAt), "PPP")}
                    </p>
                  </div>
                </div>

                {showSensitiveInfo && (
                  <>
                    <Separator className="my-4" />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        For security reasons, role modifications must be done by your administrator.
                        If you need to update your email address or change your role, please contact your system administrator.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}