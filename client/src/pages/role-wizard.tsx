import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Plus, Users, Settings, Eye, Trash2, Edit, Check, X } from "lucide-react";
import type { CustomRole, Permission, User, Office } from "@shared/schema";

interface PermissionsByCategory {
  [category: string]: Permission[];
}

interface UserRoleAssignmentsProps {
  user: User;
  roles: CustomRole[];
  onAssignRole: (roleId: string) => void;
  onRemoveRole: (roleId: string) => void;
}

function UserRoleAssignments({ user, roles, onAssignRole, onRemoveRole }: UserRoleAssignmentsProps) {
  const { data: userRoles = [], isLoading } = useQuery<CustomRole[]>({
    queryKey: ["/api/users", user.id, "custom-roles"],
  });

  const availableRoles = roles.filter(role => 
    !userRoles.some(userRole => userRole.id === role.id)
  );

  if (isLoading) {
    return <div className="text-center py-4">Loading user roles...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Roles */}
      <div>
        <h4 className="font-medium mb-3">Current Custom Roles</h4>
        {userRoles.length > 0 ? (
          <div className="space-y-2">
            {userRoles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{role.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {role.description}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemoveRole(role.id)}
                  data-testid={`button-remove-role-${role.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No custom roles assigned</p>
        )}
      </div>

      <Separator />

      {/* Available Roles */}
      <div>
        <h4 className="font-medium mb-3">Available Roles</h4>
        {availableRoles.length > 0 ? (
          <div className="space-y-2">
            {availableRoles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{role.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {role.description}
                  </div>
                  {role.officeId && (
                    <Badge variant="outline" className="mt-1">
                      Office Specific
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAssignRole(role.id)}
                  data-testid={`button-assign-role-${role.id}`}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Assign
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">All available roles are already assigned</p>
        )}
      </div>
    </div>
  );
}

export default function RoleWizard() {
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedOffice, setSelectedOffice] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("roles");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: roles = [], isLoading: rolesLoading } = useQuery<CustomRole[]>({
    queryKey: ["/api/custom-roles"],
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
  });

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch role permissions when a role is selected
  const { data: rolePermissions = [] } = useQuery<Permission[]>({
    queryKey: ["/api/custom-roles", selectedRole?.id, "permissions"],
    enabled: !!selectedRole?.id,
  });

  // Group permissions by category
  const permissionsByCategory: PermissionsByCategory = permissions.reduce((acc, permission) => {
    const category = permission.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {} as PermissionsByCategory);

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: any) => await apiRequest("/api/custom-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roleData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles"] });
      setIsCreateDialogOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      setSelectedOffice("");
      toast({ title: "Success", description: "Custom role created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create custom role", variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => await apiRequest(`/api/custom-roles/${roleId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles"] });
      setSelectedRole(null);
      toast({ title: "Success", description: "Custom role deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete custom role", variant: "destructive" });
    },
  });

  const updateRolePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionId, action }: { roleId: string; permissionId: string; action: "add" | "remove" }) => {
      if (action === "add") {
        return await apiRequest(`/api/custom-roles/${roleId}/permissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionId }),
        });
      } else {
        return await apiRequest(`/api/custom-roles/${roleId}/permissions/${permissionId}`, {
          method: "DELETE",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles", selectedRole?.id, "permissions"] });
      toast({ title: "Success", description: "Role permissions updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update role permissions", variant: "destructive" });
    },
  });

  const seedPermissionsMutation = useMutation({
    mutationFn: async () => await apiRequest("/api/permissions/seed", {
      method: "POST",
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      toast({ 
        title: "Success", 
        description: `Seeded ${data.created} new permissions (${data.total} total)` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to seed permissions", variant: "destructive" });
    },
  });

  const createStandardRolesMutation = useMutation({
    mutationFn: async () => {
      const standardRoles = [
        {
          name: "caregiver",
          displayName: "Caregiver",
          description: "Direct care provider with access to client information and care documentation",
          isActive: true,
          createdBy: "system"
        },
        {
          name: "hr",
          displayName: "HR",
          description: "Human Resources staff with access to employee management and compliance",
          isActive: true,
          createdBy: "system"
        },
        {
          name: "supervisor",
          displayName: "Supervisor",
          description: "Care supervision role with oversight of caregivers and care quality",
          isActive: true,
          createdBy: "system"
        },
        {
          name: "manager",
          displayName: "Manager",
          description: "Management role with operational oversight and reporting capabilities",
          isActive: true,
          createdBy: "system"
        },
        {
          name: "admin",
          displayName: "Admin",
          description: "Administrative role with full system access and configuration privileges",
          isActive: true,
          createdBy: "system"
        }
      ];

      return await apiRequest("/api/custom-roles/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: standardRoles }),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles"] });
      toast({ 
        title: "Success", 
        description: `Created ${data.created} standard roles: Caregiver, HR, Supervisor, Manager, Admin` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create standard roles", variant: "destructive" });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, assignedBy }: { userId: string; roleId: string; assignedBy: string }) => 
      await apiRequest(`/api/users/${userId}/custom-roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, assignedBy }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUser?.id, "custom-roles"] });
      toast({ title: "Success", description: "Role assigned successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign role", variant: "destructive" });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => 
      await apiRequest(`/api/users/${userId}/custom-roles/${roleId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUser?.id, "custom-roles"] });
      toast({ title: "Success", description: "Role removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove role", variant: "destructive" });
    },
  });

  // Update selected permissions when role changes
  useEffect(() => {
    if (rolePermissions) {
      setSelectedPermissions(new Set(rolePermissions.map(p => p.id)));
    }
  }, [rolePermissions]);

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast({ title: "Error", description: "Role name is required", variant: "destructive" });
      return;
    }

    createRoleMutation.mutate({
      name: newRoleName.toLowerCase().replace(/\s+/g, '_'),
      displayName: newRoleName,
      description: newRoleDescription,
      officeId: selectedOffice || null,
      createdBy: "current-user", // This should come from auth context
      isActive: true,
    });
  };

  const handlePermissionToggle = (permissionId: string, hasPermission: boolean) => {
    if (!selectedRole) return;

    updateRolePermissionsMutation.mutate({
      roleId: selectedRole.id,
      permissionId,
      action: hasPermission ? "remove" : "add"
    });
  };

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Role & Access Control Wizard</h1>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="role-wizard-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Role & Access Control Wizard</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => seedPermissionsMutation.mutate()}
            disabled={seedPermissionsMutation.isPending}
            variant="outline"
            data-testid="button-seed-permissions"
          >
            <Settings className="h-4 w-4 mr-2" />
            Seed Default Permissions
          </Button>
          <Button
            onClick={() => createStandardRolesMutation.mutate()}
            disabled={createStandardRolesMutation.isPending}
            variant="outline"
            data-testid="button-create-standard-roles"
          >
            <Users className="h-4 w-4 mr-2" />
            Create Standard Roles
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles" data-testid="tab-roles">Custom Roles</TabsTrigger>
          <TabsTrigger value="permissions" data-testid="tab-permissions">Permissions</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">Role Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Roles List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Custom Roles</CardTitle>
                  <CardDescription>
                    Manage custom roles and their permissions
                  </CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-role">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Custom Role</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="role-name">Role Name</Label>
                        <Input
                          id="role-name"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="e.g., Senior Caregiver"
                          data-testid="input-role-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role-description">Description</Label>
                        <Textarea
                          id="role-description"
                          value={newRoleDescription}
                          onChange={(e) => setNewRoleDescription(e.target.value)}
                          placeholder="Describe the role's responsibilities"
                          data-testid="textarea-role-description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role-office">Office (Optional)</Label>
                        <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                          <SelectTrigger data-testid="select-role-office">
                            <SelectValue placeholder="Select office (leave empty for all offices)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Offices</SelectItem>
                            {offices.map((office) => (
                              <SelectItem key={office.id} value={office.id}>
                                {office.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsCreateDialogOpen(false)}
                          data-testid="button-cancel-create"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateRole}
                          disabled={createRoleMutation.isPending}
                          data-testid="button-save-role"
                        >
                          Create Role
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedRole?.id === role.id 
                            ? "bg-primary/10 border-primary" 
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedRole(role)}
                        data-testid={`role-item-${role.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{role.displayName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {role.description}
                            </p>
                            {role.officeId && (
                              <Badge variant="outline" className="mt-1">
                                Office Specific
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRoleMutation.mutate(role.id);
                            }}
                            data-testid={`button-delete-role-${role.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Role Permissions */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedRole ? `${selectedRole.displayName} Permissions` : "Select a Role"}
                </CardTitle>
                <CardDescription>
                  {selectedRole 
                    ? "Configure permissions for this role" 
                    : "Choose a role from the left to manage its permissions"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedRole ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                            {category}
                          </h4>
                          <div className="space-y-2">
                            {categoryPermissions.map((permission) => {
                              const hasPermission = selectedPermissions.has(permission.id);
                              return (
                                <div
                                  key={permission.id}
                                  className="flex items-center space-x-3 p-2 rounded border"
                                >
                                  <Checkbox
                                    checked={hasPermission}
                                    onCheckedChange={() => handlePermissionToggle(permission.id, hasPermission)}
                                    data-testid={`checkbox-permission-${permission.id}`}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">
                                      {permission.displayName}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </div>
                                  </div>
                                  {hasPermission && (
                                    <Check className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <Separator className="my-3" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    <div className="text-center">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a role to configure its permissions</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Permissions</CardTitle>
              <CardDescription>
                All available permissions organized by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-6">
                  {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold">{category}</h3>
                        <Badge variant="secondary">{categoryPermissions.length}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryPermissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="p-3 border rounded-lg"
                          >
                            <div className="font-medium">{permission.displayName}</div>
                            <div className="text-sm text-muted-foreground">
                              {permission.description}
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {permission.resource}.{permission.action}
                              </Badge>
                              {permission.isSystemPermission && (
                                <Badge variant="secondary" className="text-xs">
                                  System
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Separator />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  Select a user to manage their role assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedUser?.id === user.id 
                            ? "bg-primary/10 border-primary" 
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedUser(user)}
                        data-testid={`user-item-${user.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-medium">
                                {user.firstName} {user.lastName}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {(user as any).role || 'No Role'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* User Role Management */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedUser 
                    ? `${selectedUser.firstName} ${selectedUser.lastName} - Role Assignments` 
                    : "Select a User"}
                </CardTitle>
                <CardDescription>
                  {selectedUser 
                    ? "Manage custom role assignments for this user" 
                    : "Choose a user from the left to manage their role assignments"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedUser ? (
                  <UserRoleAssignments 
                    user={selectedUser}
                    roles={roles}
                    onAssignRole={(roleId: string) => {
                      assignRoleMutation.mutate({
                        userId: selectedUser.id,
                        roleId,
                        assignedBy: "current-user", // This should come from auth context
                      });
                    }}
                    onRemoveRole={(roleId: string) => {
                      removeRoleMutation.mutate({
                        userId: selectedUser.id,
                        roleId,
                      });
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    <div className="text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a user to manage their role assignments</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}