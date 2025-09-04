import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Edit, Trash2, Search, UserCheck, Shield, Eye, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const userFormSchema = insertUserSchema.extend({
  passwordConfirm: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

type UserFormData = z.infer<typeof userFormSchema>;

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user has permission to access user management
  const hasPermission = (currentUser as any)?.role === "admin" || (currentUser as any)?.role === "supervisor";

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You don't have permission to access user management. Only administrators and supervisors can manage users.
          </p>
        </div>
      </div>
    );
  }

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: offices = [] } = useQuery<any[]>({
    queryKey: ["/api/offices"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      handleClose();
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

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      return await apiRequest("PUT", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      handleClose();
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/users/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      profileImageUrl: "",
      role: "caregiver",
      primaryOfficeId: "",
      isActive: true,
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
    form.reset();
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleCloseUserDetails = () => {
    setSelectedUser(null);
    setShowUserDetails(false);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      profileImageUrl: user.profileImageUrl || "",
      role: user.role as any,
      primaryOfficeId: user.primaryOfficeId || "",
      isActive: user.isActive,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteUserMutation.mutate(id);
  };

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
      case "admin": return UserCheck;
      case "supervisor": return Users;
      default: return Users;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="User Management"
          subtitle="Manage system users and permissions"
        />
      
        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit User" : "Create New User"}
              </DialogTitle>
              <DialogDescription>
                {editingUser ? "Update user information and settings" : "Add a new user to the system"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="user@example.com"
                          {...field} 
                          data-testid="input-user-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John"
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-user-first-name"
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
                            placeholder="Doe"
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-user-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user-role">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="caregiver">Caregiver</SelectItem>
                            <SelectItem value="family">Family Member</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryOfficeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Office</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user-office">
                              <SelectValue placeholder="Select office" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No Office</SelectItem>
                            {offices.map((office: any) => (
                              <SelectItem key={office.id} value={office.id}>
                                {office.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                    data-testid="button-submit-user"
                  >
                    {createUserMutation.isPending || updateUserMutation.isPending 
                      ? (editingUser ? "Updating..." : "Creating...") 
                      : (editingUser ? "Update User" : "Create User")
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-users"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="caregiver">Caregiver</SelectItem>
                <SelectItem value="family">Family Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm || roleFilter !== "all" 
                    ? "Try adjusting your filters" 
                    : "Get started by adding your first user"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user: User) => {
            const RoleIcon = getRoleIcon(user.role);
            return (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        {user.profileImageUrl ? (
                          <img 
                            src={user.profileImageUrl} 
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <Users className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.email
                            }
                          </h3>
                          <Badge variant={getRoleColor(user.role as any)}>
                            <RoleIcon className="mr-1 h-3 w-3" />
                            {user.role?.replace('_', ' ')}
                          </Badge>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created {format(new Date(user.createdAt), "MMM d, yyyy")}</span>
                          {user.primaryOfficeId && (
                            <span>Office: {offices.find((o: any) => o.id === user.primaryOfficeId)?.name || "Unknown"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewUser(user)}
                        data-testid={`button-view-user-${user.id}`}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this user? This action cannot be undone.
                              This will permanently remove the user account and all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(user.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
          </div>
        </div>
      </main>

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={handleCloseUserDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserIcon className="mr-2 h-5 w-5" />
              User Details - {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              View detailed information about this user account
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Profile Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                      {selectedUser.profileImageUrl ? (
                        <img 
                          src={selectedUser.profileImageUrl} 
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-semibold text-gray-500">
                          {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                          <p className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <p className="font-medium">{selectedUser.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Role</label>
                          <Badge variant={getRoleColor(selectedUser.role)}>
                            {selectedUser.role?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Status</label>
                          <Badge variant={selectedUser.isActive ? "default" : "secondary"}>
                            {selectedUser.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Primary Office</label>
                          <p className="font-medium">
                            {offices.find((o: any) => o.id === selectedUser.primaryOfficeId)?.name || "No office assigned"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-4 w-4" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                      <p className="font-medium">{format(new Date(selectedUser.createdAt), "PPP")}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(selectedUser.createdAt), "p")}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                      <p className="font-medium">{format(new Date(selectedUser.updatedAt), "PPP")}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(selectedUser.updatedAt), "p")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  onClick={handleCloseUserDetails}
                  data-testid="button-close-user-details"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    handleEdit(selectedUser);
                    handleCloseUserDetails();
                  }}
                  data-testid="button-edit-from-details"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}