import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOfficeSchema, insertUserSchema, type Office, type User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Shield, Users, MapPin, Clock, UserCog, Edit, Trash2, Settings, Cog } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { z } from "zod";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

const officeFormSchema = insertOfficeSchema.extend({
  timezone: z.string().optional(),
});

const userFormSchema = insertUserSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  email: z.string().email("Invalid email address"),
  role: z.enum(["office_admin", "supervisor", "admin"]),
});

type OfficeFormData = z.infer<typeof officeFormSchema>;
type UserFormData = z.infer<typeof userFormSchema>;

export default function SuperAdminPage() {
  const [openOfficeDialog, setOpenOfficeDialog] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not super admin
  if (!user || (user as any).role !== "super_admin") {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Super Admin" subtitle="System Administration" />
          <div className="flex flex-col items-center justify-center flex-1 space-y-4">
            <Shield className="h-16 w-16 text-red-500" />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
              <p className="text-muted-foreground mt-2">You need Super Admin privileges to access this page.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { data: offices = [], isLoading: officesLoading } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
    retry: false,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  const createOfficeMutation = useMutation({
    mutationFn: async (data: OfficeFormData) => {
      const response = await apiRequest("POST", "/api/offices", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
      setOpenOfficeDialog(false);
      officeForm.reset();
      toast({
        title: "Success",
        description: "Office created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create office",
        variant: "destructive",
      });
    },
  });

  const updateOfficeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OfficeFormData> }) => {
      const response = await apiRequest("PUT", `/api/offices/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
      setOpenOfficeDialog(false);
      setEditingOffice(null);
      officeForm.reset();
      toast({
        title: "Success",
        description: "Office updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update office",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpenUserDialog(false);
      userForm.reset();
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const assignOfficeAdminMutation = useMutation({
    mutationFn: async ({ officeId, userId }: { officeId: string; userId: string }) => {
      // Update the office's managerUserId
      await apiRequest("PUT", `/api/offices/${officeId}`, { managerUserId: userId });
      // Update the user's primaryOfficeId and role
      await apiRequest("PUT", `/api/users/${userId}`, { 
        primaryOfficeId: officeId,
        role: "office_admin"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpenAssignDialog(false);
      setSelectedOffice(null);
      toast({
        title: "Success",
        description: "Office admin assigned successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to assign office admin",
        variant: "destructive",
      });
    },
  });

  const officeForm = useForm<OfficeFormData>({
    resolver: zodResolver(officeFormSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      managerUserId: "",
      timezone: "America/New_York",
      isActive: true,
    },
  });

  const userForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "office_admin",
      isActive: true,
    },
  });

  const onSubmitOffice = (data: OfficeFormData) => {
    if (editingOffice) {
      updateOfficeMutation.mutate({ id: editingOffice.id, data });
    } else {
      createOfficeMutation.mutate(data);
    }
  };

  const onSubmitUser = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleEditOffice = (office: Office) => {
    setEditingOffice(office);
    officeForm.reset({
      name: office.name,
      address: office.address || "",
      phone: office.phone || "",
      email: office.email || "",
      managerUserId: office.managerUserId || "",
      timezone: office.timezone || "America/New_York",
      isActive: office.isActive,
    });
    setOpenOfficeDialog(true);
  };

  const handleAssignOfficeAdmin = (userId: string) => {
    if (selectedOffice) {
      assignOfficeAdminMutation.mutate({ 
        officeId: selectedOffice.id, 
        userId 
      });
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : "Not assigned";
  };

  const getAvailableUsers = () => {
    return users.filter(user => 
      user.role === "admin" || user.role === "supervisor" || user.role === "office_admin"
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Super Admin" subtitle="System Administration" />
        
        {/* Header */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">Super Admin Dashboard</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto">
            
            <div className="mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Quick Access</h3>
                    <p className="text-sm text-muted-foreground">Access key system management features</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/platform-admin">
                      <Button variant="outline" data-testid="button-platform-admin">
                        <Building2 className="w-4 h-4 mr-2" />
                        Platform Admin (Companies & Billing)
                      </Button>
                    </Link>
                    <Link href="/role-wizard">
                      <Button variant="outline" data-testid="button-role-wizard">
                        <Cog className="w-4 h-4 mr-2" />
                        Role & Access Control
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>

            <Tabs defaultValue="offices" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="offices" data-testid="tab-offices">
                  <Building2 className="w-4 h-4 mr-2" />
                  Office Management
                </TabsTrigger>
                <TabsTrigger value="users" data-testid="tab-users">
                  <UserCog className="w-4 h-4 mr-2" />
                  User Management
                </TabsTrigger>
              </TabsList>

              <TabsContent value="offices" className="mt-6">
                <div className="space-y-6">
                  {/* Office Management Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">Office Management</h2>
                      <p className="text-muted-foreground">Manage office locations and assign administrators</p>
                    </div>
                    <Button 
                      onClick={() => {
                        setEditingOffice(null);
                        officeForm.reset();
                        setOpenOfficeDialog(true);
                      }}
                      data-testid="button-create-office"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Office
                    </Button>
                  </div>

                  {/* Offices Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {officesLoading ? (
                      <div className="col-span-3 text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-2 text-muted-foreground">Loading offices...</p>
                      </div>
                    ) : offices.length > 0 ? (
                      offices.map((office: Office) => (
                        <Card key={office.id} className="relative" data-testid={`office-card-${office.id}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center">
                                <Building2 className="w-5 h-5 mr-2 text-primary" />
                                {office.name}
                              </CardTitle>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditOffice(office)}
                                  data-testid={`button-edit-office-${office.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOffice(office);
                                    setOpenAssignDialog(true);
                                  }}
                                  data-testid={`button-assign-admin-${office.id}`}
                                >
                                  <UserCog className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground truncate">
                                  {office.address || "No address"}
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Office Admin:</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {getUserName(office.managerUserId || "")}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Status:</span>
                                  <Badge variant={office.isActive ? "default" : "secondary"}>
                                    {office.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Created:</span>
                                  <span className="text-xs text-muted-foreground">
                                    {office.createdAt ? format(new Date(office.createdAt), "MMM dd, yyyy") : "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-12">
                        <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Offices Found</h3>
                        <p className="text-muted-foreground mb-4">Create your first office to get started</p>
                        <Button onClick={() => setOpenOfficeDialog(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Office
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="users" className="mt-6">
                <div className="space-y-6">
                  {/* User Management Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">User Management</h2>
                      <p className="text-muted-foreground">Create and manage administrative users</p>
                    </div>
                    <Button 
                      onClick={() => {
                        userForm.reset();
                        setOpenUserDialog(true);
                      }}
                      data-testid="button-create-user"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </div>

                  {/* Users Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Administrative Users</CardTitle>
                      <CardDescription>
                        Users with administrative privileges across the system
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {usersLoading ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <p className="mt-2 text-muted-foreground">Loading users...</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2 font-medium">User</th>
                                <th className="text-left p-2 font-medium">Email</th>
                                <th className="text-left p-2 font-medium">Role</th>
                                <th className="text-left p-2 font-medium">Office</th>
                                <th className="text-left p-2 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getAvailableUsers().map((user: User) => (
                                <tr key={user.id} className="border-b hover:bg-muted/50" data-testid={`user-row-${user.id}`}>
                                  <td className="p-2">
                                    <div>
                                      <p className="font-medium">
                                        {user.firstName && user.lastName 
                                          ? `${user.firstName} ${user.lastName}` 
                                          : user.email
                                        }
                                      </p>
                                      <p className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}</p>
                                    </div>
                                  </td>
                                  <td className="p-2 text-sm">{user.email}</td>
                                  <td className="p-2">
                                    <Badge variant="outline" className="capitalize">
                                      {user.role?.replace('_', ' ')}
                                    </Badge>
                                  </td>
                                  <td className="p-2 text-sm">
                                    {user.primaryOfficeId ? (
                                      offices.find(o => o.id === user.primaryOfficeId)?.name || "Unknown Office"
                                    ) : (
                                      "No office assigned"
                                    )}
                                  </td>
                                  <td className="p-2">
                                    <Badge variant={user.isActive ? "default" : "secondary"}>
                                      {user.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Office Dialog */}
        <Dialog open={openOfficeDialog} onOpenChange={setOpenOfficeDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingOffice ? "Edit Office" : "Create New Office"}</DialogTitle>
              <DialogDescription>
                {editingOffice ? "Update office information" : "Add a new office location to the system"}
              </DialogDescription>
            </DialogHeader>
            <Form {...officeForm}>
              <form onSubmit={officeForm.handleSubmit(onSubmitOffice)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={officeForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Office Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Main Office" data-testid="input-office-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={officeForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-timezone">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={officeForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} placeholder="Office address" data-testid="textarea-office-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={officeForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="(555) 123-4567" data-testid="input-office-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={officeForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="office@company.com" data-testid="input-office-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenOfficeDialog(false);
                      setEditingOffice(null);
                    }}
                    data-testid="button-cancel-office"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createOfficeMutation.isPending || updateOfficeMutation.isPending}
                    data-testid="button-save-office"
                  >
                    {editingOffice ? "Update" : "Create"} Office
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* User Dialog */}
        <Dialog open={openUserDialog} onOpenChange={setOpenUserDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new administrative user to the system
              </DialogDescription>
            </DialogHeader>
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="user@company.com" data-testid="input-user-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={userForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="John" data-testid="input-user-firstname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={userForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Doe" data-testid="input-user-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={userForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-user-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="office_admin">Office Admin</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenUserDialog(false)}
                    data-testid="button-cancel-user"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                    data-testid="button-save-user"
                  >
                    Create User
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Assign Office Admin Dialog */}
        <Dialog open={openAssignDialog} onOpenChange={setOpenAssignDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Office Administrator</DialogTitle>
              <DialogDescription>
                Select a user to manage {selectedOffice?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                {getAvailableUsers().map((user: User) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    data-testid={`assign-user-${user.id}`}
                  >
                    <div>
                      <p className="font-medium">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.email
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.email} • {user.role?.replace('_', ' ')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAssignOfficeAdmin(user.id)}
                      disabled={assignOfficeAdminMutation.isPending}
                      data-testid={`button-assign-${user.id}`}
                    >
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}