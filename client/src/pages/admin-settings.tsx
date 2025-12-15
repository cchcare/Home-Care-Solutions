import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Settings, Building2, FileText, Users, Loader2 } from "lucide-react";
import type { McoType, Mco, SystemSetting, EntityFieldConfig } from "@shared/schema";

const mcoTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

const mcoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  typeId: z.string().optional(),
  payerId: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  billingRequirements: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

const systemSettingSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.any(),
  description: z.string().optional(),
  scope: z.string().default("global"),
});

const fieldConfigSchema = z.object({
  entityType: z.enum(["client", "caregiver"]),
  fieldKey: z.string().min(1, "Field key is required"),
  label: z.string().min(1, "Label is required"),
  fieldType: z.enum(["text", "number", "date", "select", "boolean", "textarea"]),
  isRequired: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

function McoTypesTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<McoType | null>(null);

  const { data: mcoTypes = [], isLoading } = useQuery<McoType[]>({
    queryKey: ["/api/admin/mco-types"],
  });

  const form = useForm<z.infer<typeof mcoTypeSchema>>({
    resolver: zodResolver(mcoTypeSchema),
    defaultValues: { name: "", description: "", isActive: true },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof mcoTypeSchema>) => apiRequest("/api/admin/mco-types", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mco-types"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "MCO Type created successfully" });
    },
    onError: () => toast({ title: "Failed to create MCO Type", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof mcoTypeSchema> }) => apiRequest(`/api/admin/mco-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mco-types"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({ title: "MCO Type updated successfully" });
    },
    onError: () => toast({ title: "Failed to update MCO Type", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/mco-types/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mco-types"] });
      toast({ title: "MCO Type deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete MCO Type. Make sure no MCOs are linked to it.", variant: "destructive" }),
  });

  const onSubmit = (data: z.infer<typeof mcoTypeSchema>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (item: McoType) => {
    setEditingItem(item);
    form.reset({ name: item.name, description: item.description || "", isActive: item.isActive ?? true });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    form.reset({ name: "", description: "", isActive: true });
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">MCO Types</h3>
          <p className="text-sm text-muted-foreground">Manage categories of Managed Care Organizations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="button-add-mco-type"><Plus className="h-4 w-4 mr-2" />Add MCO Type</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit MCO Type" : "Add MCO Type"}</DialogTitle>
              <DialogDescription>Configure the MCO type details</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Medicaid, Medicare" {...field} data-testid="input-mco-type-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Description of this MCO type..." {...field} data-testid="input-mco-type-description" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Active</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-mco-type-active" /></FormControl>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-mco-type">
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingItem ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mcoTypes.map((item) => (
            <TableRow key={item.id} data-testid={`row-mco-type-${item.id}`}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-muted-foreground">{item.description || "-"}</TableCell>
              <TableCell><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} data-testid={`button-edit-mco-type-${item.id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-mco-type-${item.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {mcoTypes.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No MCO types found. Add one to get started.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function McosTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Mco | null>(null);

  const { data: mcos = [], isLoading } = useQuery<Mco[]>({ queryKey: ["/api/admin/mcos"] });
  const { data: mcoTypes = [] } = useQuery<McoType[]>({ queryKey: ["/api/admin/mco-types"] });

  const form = useForm<z.infer<typeof mcoSchema>>({
    resolver: zodResolver(mcoSchema),
    defaultValues: { name: "", typeId: "", payerId: "", contactName: "", contactEmail: "", contactPhone: "", address: "", billingRequirements: "", notes: "", isActive: true },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof mcoSchema>) => apiRequest("/api/admin/mcos", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mcos"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "MCO created successfully" });
    },
    onError: () => toast({ title: "Failed to create MCO", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof mcoSchema> }) => apiRequest(`/api/admin/mcos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mcos"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({ title: "MCO updated successfully" });
    },
    onError: () => toast({ title: "Failed to update MCO", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/mcos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mcos"] });
      toast({ title: "MCO deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete MCO", variant: "destructive" }),
  });

  const onSubmit = (data: z.infer<typeof mcoSchema>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (item: Mco) => {
    setEditingItem(item);
    form.reset({
      name: item.name, typeId: item.typeId || "", payerId: item.payerId || "", contactName: item.contactName || "",
      contactEmail: item.contactEmail || "", contactPhone: item.contactPhone || "", address: item.address || "",
      billingRequirements: item.billingRequirements || "", notes: item.notes || "", isActive: item.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    form.reset({ name: "", typeId: "", payerId: "", contactName: "", contactEmail: "", contactPhone: "", address: "", billingRequirements: "", notes: "", isActive: true });
    setIsDialogOpen(true);
  };

  const getTypeName = (typeId: string | null) => mcoTypes.find(t => t.id === typeId)?.name || "-";

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">MCO List</h3>
          <p className="text-sm text-muted-foreground">Manage Managed Care Organizations for billing</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="button-add-mco"><Plus className="h-4 w-4 mr-2" />Add MCO</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit MCO" : "Add MCO"}</DialogTitle>
              <DialogDescription>Configure the MCO details for billing</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl><Input placeholder="MCO Name" {...field} data-testid="input-mco-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="typeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>MCO Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-mco-type"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {mcoTypes.filter(t => t.isActive).map(type => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="payerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payer ID</FormLabel>
                      <FormControl><Input placeholder="Payer ID" {...field} data-testid="input-mco-payer-id" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl><Input placeholder="Contact Name" {...field} data-testid="input-mco-contact-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl><Input type="email" placeholder="email@example.com" {...field} data-testid="input-mco-contact-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl><Input placeholder="(555) 123-4567" {...field} data-testid="input-mco-contact-phone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Textarea placeholder="Full address..." {...field} data-testid="input-mco-address" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="billingRequirements" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Requirements</FormLabel>
                    <FormControl><Textarea placeholder="Special billing requirements..." {...field} data-testid="input-mco-billing-requirements" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea placeholder="Additional notes..." {...field} data-testid="input-mco-notes" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Active</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-mco-active" /></FormControl>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-mco">
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingItem ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Payer ID</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mcos.map((item) => (
            <TableRow key={item.id} data-testid={`row-mco-${item.id}`}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{getTypeName(item.typeId)}</TableCell>
              <TableCell>{item.payerId || "-"}</TableCell>
              <TableCell>{item.contactName || "-"}</TableCell>
              <TableCell><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} data-testid={`button-edit-mco-${item.id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-mco-${item.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {mcos.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No MCOs found. Add one to get started.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function FieldConfigsTab({ entityType }: { entityType: 'client' | 'caregiver' }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EntityFieldConfig | null>(null);

  const { data: configs = [], isLoading } = useQuery<EntityFieldConfig[]>({
    queryKey: ["/api/admin/field-configs", entityType],
    queryFn: () => fetch(`/api/admin/field-configs?entityType=${entityType}`).then(r => r.json()),
  });

  const form = useForm<z.infer<typeof fieldConfigSchema>>({
    resolver: zodResolver(fieldConfigSchema),
    defaultValues: { entityType, fieldKey: "", label: "", fieldType: "text", isRequired: false, isEnabled: true, displayOrder: 0 },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof fieldConfigSchema>) => apiRequest("/api/admin/field-configs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/field-configs", entityType] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Field configuration created successfully" });
    },
    onError: () => toast({ title: "Failed to create field configuration", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof fieldConfigSchema> }) => apiRequest(`/api/admin/field-configs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/field-configs", entityType] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({ title: "Field configuration updated successfully" });
    },
    onError: () => toast({ title: "Failed to update field configuration", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/field-configs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/field-configs", entityType] });
      toast({ title: "Field configuration deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete field configuration", variant: "destructive" }),
  });

  const onSubmit = (data: z.infer<typeof fieldConfigSchema>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (item: EntityFieldConfig) => {
    setEditingItem(item);
    form.reset({
      entityType: item.entityType as 'client' | 'caregiver',
      fieldKey: item.fieldKey,
      label: item.label,
      fieldType: item.fieldType as any,
      isRequired: item.isRequired ?? false,
      isEnabled: item.isEnabled ?? true,
      displayOrder: item.displayOrder ?? 0,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    form.reset({ entityType, fieldKey: "", label: "", fieldType: "text", isRequired: false, isEnabled: true, displayOrder: 0 });
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">{entityType === 'client' ? 'Client' : 'Caregiver'} Field Configuration</h3>
          <p className="text-sm text-muted-foreground">Configure custom fields for {entityType}s</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid={`button-add-${entityType}-field`}><Plus className="h-4 w-4 mr-2" />Add Field</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Field" : "Add Field"}</DialogTitle>
              <DialogDescription>Configure the field details</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="fieldKey" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Key</FormLabel>
                    <FormControl><Input placeholder="e.g., customField1" {...field} data-testid="input-field-key" /></FormControl>
                    <FormDescription>Unique identifier for this field</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl><Input placeholder="Display Label" {...field} data-testid="input-field-label" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fieldType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-field-type"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="select">Dropdown</SelectItem>
                        <SelectItem value="boolean">Yes/No</SelectItem>
                        <SelectItem value="textarea">Text Area</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="displayOrder" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-display-order" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex gap-4">
                  <FormField control={form.control} name="isRequired" render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Required</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-field-required" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isEnabled" render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Enabled</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-field-enabled" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-field">
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingItem ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field Key</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((item) => (
            <TableRow key={item.id} data-testid={`row-field-${item.id}`}>
              <TableCell className="font-mono text-sm">{item.fieldKey}</TableCell>
              <TableCell>{item.label}</TableCell>
              <TableCell><Badge variant="outline">{item.fieldType}</Badge></TableCell>
              <TableCell>{item.isRequired ? "Yes" : "No"}</TableCell>
              <TableCell><Badge variant={item.isEnabled ? "default" : "secondary"}>{item.isEnabled ? "Yes" : "No"}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} data-testid={`button-edit-field-${item.id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-field-${item.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {configs.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No field configurations found. Add one to get started.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function SystemSettingsTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SystemSetting | null>(null);

  const { data: settings = [], isLoading } = useQuery<SystemSetting[]>({ queryKey: ["/api/admin/settings"] });

  const form = useForm<z.infer<typeof systemSettingSchema>>({
    resolver: zodResolver(systemSettingSchema),
    defaultValues: { key: "", value: "", description: "", scope: "global" },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof systemSettingSchema>) => apiRequest("/api/admin/settings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Setting created successfully" });
    },
    onError: () => toast({ title: "Failed to create setting", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: z.infer<typeof systemSettingSchema> }) => apiRequest(`/api/admin/settings/${key}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({ title: "Setting updated successfully" });
    },
    onError: () => toast({ title: "Failed to update setting", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => apiRequest(`/api/admin/settings/${key}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Setting deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete setting", variant: "destructive" }),
  });

  const onSubmit = (data: z.infer<typeof systemSettingSchema>) => {
    if (editingItem) {
      updateMutation.mutate({ key: editingItem.key, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (item: SystemSetting) => {
    setEditingItem(item);
    form.reset({ key: item.key, value: JSON.stringify(item.value), description: item.description || "", scope: item.scope || "global" });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    form.reset({ key: "", value: "", description: "", scope: "global" });
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">System Settings</h3>
          <p className="text-sm text-muted-foreground">Configure global system settings</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="button-add-setting"><Plus className="h-4 w-4 mr-2" />Add Setting</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Setting" : "Add Setting"}</DialogTitle>
              <DialogDescription>Configure the system setting</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="key" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl><Input placeholder="setting_key" {...field} disabled={!!editingItem} data-testid="input-setting-key" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl><Textarea placeholder="Setting value (JSON supported)" {...field} data-testid="input-setting-value" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Input placeholder="Description of this setting" {...field} data-testid="input-setting-description" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="scope" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-setting-scope"><SelectValue placeholder="Select scope" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-setting">
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingItem ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.map((item) => (
            <TableRow key={item.id} data-testid={`row-setting-${item.id}`}>
              <TableCell className="font-mono text-sm">{item.key}</TableCell>
              <TableCell className="max-w-[200px] truncate">{JSON.stringify(item.value)}</TableCell>
              <TableCell className="text-muted-foreground">{item.description || "-"}</TableCell>
              <TableCell><Badge variant="outline">{item.scope}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} data-testid={`button-edit-setting-${item.id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.key)} data-testid={`button-delete-setting-${item.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {settings.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No system settings found. Add one to get started.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">Manage system configuration, MCOs, and field settings</p>
        </div>
      </div>

      <Tabs defaultValue="mco-types" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="mco-types" className="flex items-center gap-2" data-testid="tab-mco-types">
            <Building2 className="h-4 w-4" />MCO Types
          </TabsTrigger>
          <TabsTrigger value="mcos" className="flex items-center gap-2" data-testid="tab-mcos">
            <Building2 className="h-4 w-4" />MCO List
          </TabsTrigger>
          <TabsTrigger value="client-fields" className="flex items-center gap-2" data-testid="tab-client-fields">
            <Users className="h-4 w-4" />Client Fields
          </TabsTrigger>
          <TabsTrigger value="caregiver-fields" className="flex items-center gap-2" data-testid="tab-caregiver-fields">
            <Users className="h-4 w-4" />Caregiver Fields
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2" data-testid="tab-system-settings">
            <FileText className="h-4 w-4" />System Config
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="pt-6">
            <TabsContent value="mco-types" className="mt-0"><McoTypesTab /></TabsContent>
            <TabsContent value="mcos" className="mt-0"><McosTab /></TabsContent>
            <TabsContent value="client-fields" className="mt-0"><FieldConfigsTab entityType="client" /></TabsContent>
            <TabsContent value="caregiver-fields" className="mt-0"><FieldConfigsTab entityType="caregiver" /></TabsContent>
            <TabsContent value="system" className="mt-0"><SystemSettingsTab /></TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
