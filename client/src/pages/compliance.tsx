import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertComplianceItemSchema, type ComplianceItem, type Caregiver } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";
import { 
  Shield, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Award,
  Calendar,
  UserCheck,
  FileText,
  Download,
  Plus
} from "lucide-react";

const complianceFormSchema = insertComplianceItemSchema.extend({
  dueDate: z.string().min(1, "Due date is required"),
  completedDate: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

type ComplianceFormData = z.infer<typeof complianceFormSchema>;

export default function Compliance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: caregivers = [], isLoading: caregiversLoading } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
    retry: false,
  });

  const { data: complianceItems = [], isLoading: complianceLoading } = useQuery<ComplianceItem[]>({
    queryKey: ["/api/compliance"],
    retry: false,
  });

  const createComplianceMutation = useMutation({
    mutationFn: async (data: ComplianceFormData) => {
      const payload = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        completedDate: data.completedDate ? new Date(data.completedDate).toISOString() : null,
      };
      const response = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create compliance item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Compliance item created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create compliance item",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ComplianceFormData>({
    resolver: zodResolver(complianceFormSchema),
    defaultValues: {
      caregiverId: "",
      itemType: "",
      status: "pending",
      dueDate: "",
      completedDate: "",
      notes: "",
    },
  });

  const onSubmit = (data: ComplianceFormData) => {
    createComplianceMutation.mutate(data);
  };

  // Calculate compliance statistics from actual data
  const complianceTypes = ["hipaa_training", "cpr_certification", "background_check", "first_aid_training"];
  const complianceCategories = complianceTypes.map(type => {
    const typeItems = complianceItems.filter(item => item.itemType === type);
    const compliantItems = typeItems.filter(item => item.status === "compliant");
    const total = Math.max(caregivers.length, typeItems.length);
    const compliant = compliantItems.length;
    const percentage = total > 0 ? Math.round((compliant / total) * 100) : 0;
    const dueItems = typeItems.filter(item => item.status === "pending" || (item.dueDate && new Date(item.dueDate) < new Date()));
    
    return {
      name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      total,
      compliant,
      percentage,
      dueCount: dueItems.length,
      status: percentage >= 90 ? "good" : percentage >= 70 ? "warning" : "critical"
    };
  });

  // Get critical alerts from actual data
  const now = new Date();
  const criticalAlerts = complianceItems
    .filter(item => {
      if (!item.dueDate) return false;
      const dueDate = new Date(item.dueDate);
      const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7 || item.status === "expired";
    })
    .map(item => ({
      id: item.id,
      type: item.itemType,
      title: `${item.itemType.replace(/_/g, ' ')} ${item.status === "expired" ? "Overdue" : "Expiring Soon"}`,
      description: `${getCaregiverName(item.caregiverId)} - ${item.itemType.replace(/_/g, ' ')}`,
      priority: item.status === "expired" ? "critical" : "high",
      dueDate: new Date(item.dueDate!)
    }));

  function getCaregiverName(caregiverId: string | null): string {
    if (!caregiverId) return "Unknown";
    const caregiver = caregivers.find(c => c.id === caregiverId);
    return caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : "Unknown";
  }

  // Filter compliance items based on search and filters
  const filteredComplianceItems = complianceItems.filter((item: ComplianceItem) => {
    const matchesSearch = item.itemType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCaregiverName(item.caregiverId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesType = typeFilter === "all" || item.itemType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "warning":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Shield className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getComplianceStatusBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      case "non_compliant":
        return <Badge variant="destructive">Non-Compliant</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge variant="destructive">High Priority</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium Priority</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  if (complianceLoading || caregiversLoading) {
    return <div>Loading compliance data...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Compliance Management" />
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Header with Add Button */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Compliance Management</h1>
              <p className="text-muted-foreground">Monitor and manage compliance requirements</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-compliance">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Compliance Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Compliance Item</DialogTitle>
                  <DialogDescription>
                    Create a new compliance requirement for a caregiver.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="caregiverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Caregiver</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select caregiver" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {caregivers.map((caregiver) => (
                                <SelectItem key={caregiver.id} value={caregiver.id}>
                                  {caregiver.firstName} {caregiver.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="itemType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Compliance Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select compliance type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hipaa_training">HIPAA Training</SelectItem>
                              <SelectItem value="cpr_certification">CPR Certification</SelectItem>
                              <SelectItem value="background_check">Background Check</SelectItem>
                              <SelectItem value="first_aid_training">First Aid Training</SelectItem>
                              <SelectItem value="drug_screening">Drug Screening</SelectItem>
                              <SelectItem value="tb_test">TB Test</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="compliant">Compliant</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="completedDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Completed Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createComplianceMutation.isPending}>
                        {createComplianceMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search compliance items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-compliance"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="non_compliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="hipaa_training">HIPAA Training</SelectItem>
                <SelectItem value="cpr_certification">CPR Certification</SelectItem>
                <SelectItem value="background_check">Background Check</SelectItem>
                <SelectItem value="first_aid_training">First Aid Training</SelectItem>
                <SelectItem value="drug_screening">Drug Screening</SelectItem>
                <SelectItem value="tb_test">TB Test</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Compliance Overview Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {complianceCategories.map((category, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(category.status)}
                      <span className="font-medium text-foreground text-sm">{category.name}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${getStatusColor(category.status)}`} data-testid={`text-compliance-percentage-${index}`}>
                        {category.percentage}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {category.compliant}/{category.total}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          category.status === 'good' ? 'bg-green-500' :
                          category.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {category.dueCount} items need attention
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <CardTitle>Critical Alerts</CardTitle>
                    <Badge variant="destructive" data-testid="badge-critical-alerts-count">
                      {criticalAlerts.length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {criticalAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50"
                  >
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {format(alert.dueDate, "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getPriorityBadge(alert.priority)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Compliance Items List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Compliance Items</CardTitle>
                <Badge variant="secondary" data-testid="badge-total-compliance-items">
                  {filteredComplianceItems.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredComplianceItems.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No compliance items found.</p>
                  <p className="text-sm text-muted-foreground">Create a new compliance item to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredComplianceItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground">
                              {item.itemType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            {getComplianceStatusBadge(item.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Caregiver: {getCaregiverName(item.caregiverId)}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {item.dueDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Due: {format(new Date(item.dueDate), "MMM d, yyyy")}</span>
                              </div>
                            )}
                            {item.completedDate && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>Completed: {format(new Date(item.completedDate), "MMM d, yyyy")}</span>
                              </div>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}