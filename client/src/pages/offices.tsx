import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOfficeSchema, type Office, type InsertOffice } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { Plus, Building2, MapPin, Phone, Mail, Edit, Trash2 } from "lucide-react";

export default function Offices() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: offices = [], isLoading } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
    retry: false,
  });

  const createForm = useForm<InsertOffice>({
    resolver: zodResolver(insertOfficeSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      isActive: true,
    },
  });

  const editForm = useForm<InsertOffice>({
    resolver: zodResolver(insertOfficeSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertOffice) => {
      return apiRequest("POST", "/api/offices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
      toast({
        title: "Success",
        description: "Office created successfully",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create office",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertOffice> }) => {
      return apiRequest("PUT", `/api/offices/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
      toast({
        title: "Success",
        description: "Office updated successfully",
      });
      setEditingOffice(null);
      editForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update office",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/offices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
      toast({
        title: "Success",
        description: "Office deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete office",
        variant: "destructive",
      });
    },
  });

  const handleCreateOffice = (data: InsertOffice) => {
    createMutation.mutate(data);
  };

  const handleUpdateOffice = (data: InsertOffice) => {
    if (editingOffice) {
      updateMutation.mutate({ id: editingOffice.id, data });
    }
  };

  const handleDeleteOffice = (id: string) => {
    if (confirm("Are you sure you want to delete this office? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEditOffice = (office: Office) => {
    setEditingOffice(office);
    editForm.reset({
      name: office.name,
      address: office.address || "",
      phone: office.phone || "",
      email: office.email || "",
      isActive: office.isActive || true,
    });
  };

  const handleOfficeClick = (office: Office) => {
    navigate(`/offices/${office.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Building2 className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Office Management</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-48 animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Building2 className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Office Management</h1>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-office">
              <Plus className="w-4 h-4 mr-2" />
              Add Office
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Office</DialogTitle>
              <DialogDescription>
                Create a new office location for your home care agency.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateOffice)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Office Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Main Office" {...field} data-testid="input-office-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="123 Main St, New York, NY 10001" {...field} value={field.value || ""} data-testid="input-office-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} value={field.value || ""} data-testid="input-office-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="office@company.com" type="email" {...field} value={field.value || ""} data-testid="input-office-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-2">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Office</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            This office is available for assignments
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-office-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-office"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-office">
                    {createMutation.isPending ? "Creating..." : "Create Office"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offices?.map((office: Office) => (
          <Card 
            key={office.id} 
            className="relative cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleOfficeClick(office)}
            data-testid={`card-office-${office.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center space-x-2">
                    <span data-testid={`text-office-name-${office.id}`}>{office.name}</span>
                    <Badge variant={office.isActive ? "default" : "secondary"}>
                      {office.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditOffice(office);
                    }}
                    data-testid={`button-edit-office-${office.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOffice(office.id);
                    }}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-delete-office-${office.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {office.address && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span data-testid={`text-office-address-${office.id}`}>
                      {office.address}
                    </span>
                  </div>
                )}
                
                {office.phone && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span data-testid={`text-office-phone-${office.id}`}>{office.phone}</span>
                  </div>
                )}
                
                {office.email && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span data-testid={`text-office-email-${office.id}`}>{office.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {offices?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No offices found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first office location to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-office">
                <Plus className="w-4 h-4 mr-2" />
                Add First Office
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Office Dialog */}
      <Dialog open={!!editingOffice} onOpenChange={() => setEditingOffice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Office</DialogTitle>
            <DialogDescription>
              Update the office information.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateOffice)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Office Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Office" {...field} data-testid="input-edit-office-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Main St, New York, NY 10001" {...field} value={field.value || ""} data-testid="input-edit-office-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} value={field.value || ""} data-testid="input-edit-office-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="office@company.com" type="email" {...field} value={field.value || ""} data-testid="input-edit-office-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Office</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          This office is available for assignments
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-office-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingOffice(null)}
                  data-testid="button-cancel-edit-office"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-office">
                  {updateMutation.isPending ? "Updating..." : "Update Office"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      </main>
    </div>
  );
}