import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin,
  FileText,
  Upload,
  Trash2,
  Download,
  Edit,
  Save,
  X,
  Eye,
  DollarSign,
  Users,
  Plus,
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Receipt,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";
import type { Office, User as UserType, Document, OfficeLicense, OfficeStaff, OfficeExpense } from "@shared/schema";

const OFFICE_MENU_ITEMS = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "licenses", label: "Licenses", icon: Shield },
  { id: "staff", label: "Staff", icon: Users },
  { id: "expenses", label: "Expenses", icon: Receipt },
];

const LICENSE_TYPES = [
  { value: "health", label: "Health License" },
  { value: "business", label: "Business License" },
  { value: "accreditation", label: "Accreditation" },
  { value: "insurance", label: "Insurance Certificate" },
  { value: "other", label: "Other" },
];

const EXPENSE_TYPES = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Office Supplies" },
  { value: "equipment", label: "Equipment" },
  { value: "insurance", label: "Insurance" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "check", label: "Check" },
  { value: "card", label: "Credit Card" },
  { value: "wire", label: "Wire Transfer" },
  { value: "cash", label: "Cash" },
  { value: "ach", label: "ACH" },
];

export default function OfficeProfile() {
  const [, params] = useRoute("/offices/:id");
  const officeId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Office>>({});
  const [activeSection, setActiveSection] = useState("overview");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dialogType, setDialogType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: office, isLoading: officeLoading } = useQuery<Office>({
    queryKey: ["/api/offices", officeId],
    queryFn: () => fetch(`/api/offices/${officeId}`).then(r => r.json()),
    enabled: !!officeId,
  });

  const { data: licenses = [] } = useQuery<OfficeLicense[]>({
    queryKey: ["/api/offices", officeId, "licenses"],
    queryFn: () => fetch(`/api/offices/${officeId}/licenses`).then(r => r.json()),
    enabled: !!officeId,
  });

  const { data: staff = [] } = useQuery<(OfficeStaff & { user?: UserType })[]>({
    queryKey: ["/api/offices", officeId, "staff"],
    queryFn: () => fetch(`/api/offices/${officeId}/staff`).then(r => r.json()),
    enabled: !!officeId,
  });

  const { data: expenses = [] } = useQuery<OfficeExpense[]>({
    queryKey: ["/api/offices", officeId, "expenses"],
    queryFn: () => fetch(`/api/offices/${officeId}/expenses`).then(r => r.json()),
    enabled: !!officeId,
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const updateOfficeMutation = useMutation({
    mutationFn: async (data: Partial<Office>) => {
      return apiRequest("PUT", `/api/offices/${officeId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", officeId] });
      toast({ title: "Success", description: "Office updated successfully" });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update office", variant: "destructive" });
    },
  });

  const createLicenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/offices/${officeId}/licenses`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", officeId, "licenses"] });
      toast({ title: "Success", description: "License added successfully" });
      setShowAddDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add license", variant: "destructive" });
    },
  });

  const deleteLicenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/offices/${officeId}/licenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", officeId, "licenses"] });
      toast({ title: "Success", description: "License deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete license", variant: "destructive" });
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/offices/${officeId}/staff`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", officeId, "staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/positions"] });
      toast({ title: "Success", description: "Staff member added successfully" });
      setShowAddDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add staff member", variant: "destructive" });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/offices/${officeId}/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", officeId, "staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/positions"] });
      toast({ title: "Success", description: "Staff member removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove staff member", variant: "destructive" });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/offices/${officeId}/expenses`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", officeId, "expenses"] });
      toast({ title: "Success", description: "Expense added successfully" });
      setShowAddDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add expense", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/offices/${officeId}/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", officeId, "expenses"] });
      toast({ title: "Success", description: "Expense deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" });
    },
  });

  const handleStartEdit = () => {
    setEditFormData({
      name: office?.name || "",
      address: office?.address || "",
      phone: office?.phone || "",
      email: office?.email || "",
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateOfficeMutation.mutate(editFormData);
  };

  const handleOpenAddDialog = (type: string) => {
    setDialogType(type);
    setShowAddDialog(true);
    setSelectedFile(null);
  };

  const getLicenseStatus = (license: OfficeLicense) => {
    const now = new Date();
    const expDate = new Date(license.expirationDate);
    const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: "expired", color: "destructive" as const };
    if (daysUntilExpiry <= 30) return { status: "expiring soon", color: "secondary" as const };
    return { status: "active", color: "default" as const };
  };

  const activeLicense = licenses.find(l => l.isActive && getLicenseStatus(l).status !== "expired");

  if (officeLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!office) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p>Office not found</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Office Information</CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={handleStartEdit} data-testid="button-edit-office">
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} data-testid="button-save-office">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Office Name</Label>
                {isEditing ? (
                  <Input
                    value={editFormData.name || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    data-testid="input-office-name"
                  />
                ) : (
                  <p className="font-medium" data-testid="text-office-name">{office.name}</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">Address</Label>
                {isEditing ? (
                  <Textarea
                    value={editFormData.address || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    data-testid="input-office-address"
                  />
                ) : (
                  <p className="font-medium flex items-center gap-2" data-testid="text-office-address">
                    <MapPin className="h-4 w-4" /> {office.address || "Not set"}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                {isEditing ? (
                  <Input
                    value={editFormData.phone || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    data-testid="input-office-phone"
                  />
                ) : (
                  <p className="font-medium flex items-center gap-2" data-testid="text-office-phone">
                    <Phone className="h-4 w-4" /> {office.phone || "Not set"}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                {isEditing ? (
                  <Input
                    value={editFormData.email || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    data-testid="input-office-email"
                  />
                ) : (
                  <p className="font-medium flex items-center gap-2" data-testid="text-office-email">
                    <Mail className="h-4 w-4" /> {office.email || "Not set"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Health License</CardTitle>
        </CardHeader>
        <CardContent>
          {activeLicense ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-muted-foreground">License Number</Label>
                <p className="font-medium" data-testid="text-license-number">{activeLicense.licenseNumber}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Issue Date</Label>
                <p className="font-medium" data-testid="text-license-issued">
                  {format(new Date(activeLicense.issuedDate), "MM/dd/yyyy")}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Expiration Date</Label>
                <div className="flex items-center gap-2">
                  <p className="font-medium" data-testid="text-license-expiry">
                    {format(new Date(activeLicense.expirationDate), "MM/dd/yyyy")}
                  </p>
                  <Badge variant={getLicenseStatus(activeLicense).color}>
                    {getLicenseStatus(activeLicense).status}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No active license on file</p>
              <Button onClick={() => handleOpenAddDialog("license")} data-testid="button-add-first-license">
                <Plus className="h-4 w-4 mr-2" /> Add License
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-staff-count">{staff.length}</p>
            <p className="text-muted-foreground">assigned to this office</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-expense-total">
              ${expenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0).toLocaleString()}
            </p>
            <p className="text-muted-foreground">total expenses tracked</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800">
        <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">DOH Audit Assessment</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                PA Department of Health survey readiness checklist for this office
              </p>
            </div>
          </div>
          <Link href="/audit-assessment">
            <Button variant="outline" className="shrink-0 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300">
              Open Audit <ChevronRight size={15} />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  const renderLicenses = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>License History</CardTitle>
            <CardDescription>Track health licenses and renewals</CardDescription>
          </div>
          <Button onClick={() => handleOpenAddDialog("license")} data-testid="button-add-license">
            <Plus className="h-4 w-4 mr-2" /> Add License
          </Button>
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No licenses recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((license) => {
                  const statusInfo = getLicenseStatus(license);
                  return (
                    <TableRow key={license.id} data-testid={`row-license-${license.id}`}>
                      <TableCell className="font-medium">{license.licenseNumber}</TableCell>
                      <TableCell>
                        {LICENSE_TYPES.find(t => t.value === license.licenseType)?.label || license.licenseType}
                      </TableCell>
                      <TableCell>{format(new Date(license.issuedDate), "MM/dd/yyyy")}</TableCell>
                      <TableCell>{format(new Date(license.expirationDate), "MM/dd/yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.color}>
                          {statusInfo.status}
                        </Badge>
                        {!license.isActive && <Badge variant="outline" className="ml-2">Historical</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this license?")) {
                              deleteLicenseMutation.mutate(license.id);
                            }
                          }}
                          data-testid={`button-delete-license-${license.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderStaff = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Office Staff</CardTitle>
            <CardDescription>Manage staff assigned to this office</CardDescription>
          </div>
          <Button onClick={() => handleOpenAddDialog("staff")} data-testid="button-add-staff">
            <Plus className="h-4 w-4 mr-2" /> Add Staff
          </Button>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No staff assigned to this office</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => {
                  const user = users.find(u => u.id === member.userId);
                  return (
                    <TableRow key={member.id} data-testid={`row-staff-${member.id}`}>
                      <TableCell className="font-medium">
                        {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Unknown"}
                      </TableCell>
                      <TableCell>{member.position || "—"}</TableCell>
                      <TableCell>{member.department || "—"}</TableCell>
                      <TableCell>
                        {member.startDate ? format(new Date(member.startDate), "MM/dd/yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {member.isPrimary && <Badge variant="outline" className="ml-2">Primary</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Remove this staff member?")) {
                              deleteStaffMutation.mutate(member.id);
                            }
                          }}
                          data-testid={`button-delete-staff-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Office Expenses</CardTitle>
            <CardDescription>Track and manage office expenses</CardDescription>
          </div>
          <Button onClick={() => handleOpenAddDialog("expense")} data-testid="button-add-expense">
            <Plus className="h-4 w-4 mr-2" /> Add Expense
          </Button>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No expenses recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                    <TableCell>{format(new Date(expense.expenseDate), "MM/dd/yyyy")}</TableCell>
                    <TableCell>
                      {EXPENSE_TYPES.find(t => t.value === expense.expenseType)?.label || expense.expenseType}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                    <TableCell>{expense.vendor || "—"}</TableCell>
                    <TableCell className="font-medium">${parseFloat(expense.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={expense.status === "paid" ? "default" : expense.status === "approved" ? "secondary" : "outline"}>
                        {expense.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this expense?")) {
                            deleteExpenseMutation.mutate(expense.id);
                          }
                        }}
                        data-testid={`button-delete-expense-${expense.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderAddDialog = () => {
    if (dialogType === "license") {
      return (
        <LicenseForm
          onSubmit={(data) => createLicenseMutation.mutate(data)}
          onClose={() => setShowAddDialog(false)}
          isLoading={createLicenseMutation.isPending}
        />
      );
    }
    if (dialogType === "staff") {
      return (
        <StaffForm
          users={users}
          onSubmit={(data) => createStaffMutation.mutate(data)}
          onClose={() => setShowAddDialog(false)}
          isLoading={createStaffMutation.isPending}
        />
      );
    }
    if (dialogType === "expense") {
      return (
        <ExpenseForm
          onSubmit={(data) => createExpenseMutation.mutate(data)}
          onClose={() => setShowAddDialog(false)}
          isLoading={createExpenseMutation.isPending}
        />
      );
    }
    return null;
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex">
        <div className="w-64 border-r bg-muted/30 p-4">
          <Link href="/offices" className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Offices
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold" data-testid="text-office-title">{office.name}</p>
              <Badge variant={office.isActive ? "default" : "secondary"}>
                {office.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <nav className="space-y-1">
            {OFFICE_MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                data-testid={`menu-${item.id}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl">
            {activeSection === "overview" && renderOverview()}
            {activeSection === "licenses" && renderLicenses()}
            {activeSection === "staff" && renderStaff()}
            {activeSection === "expenses" && renderExpenses()}
          </div>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          {renderAddDialog()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LicenseForm({ onSubmit, onClose, isLoading }: { onSubmit: (data: any) => void; onClose: () => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    licenseNumber: "",
    licenseType: "health",
    issuedDate: "",
    expirationDate: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      issuedDate: new Date(formData.issuedDate),
      expirationDate: new Date(formData.expirationDate),
      isActive: true,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add New License</DialogTitle>
        <DialogDescription>Add a health license or other certification for this office.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label>License Number *</Label>
          <Input
            required
            value={formData.licenseNumber}
            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
            placeholder="Enter license number"
            data-testid="input-license-number"
          />
        </div>
        <div>
          <Label>License Type</Label>
          <Select value={formData.licenseType} onValueChange={(v) => setFormData({ ...formData, licenseType: v })}>
            <SelectTrigger data-testid="select-license-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LICENSE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Issue Date *</Label>
            <Input
              type="date"
              required
              value={formData.issuedDate}
              onChange={(e) => setFormData({ ...formData, issuedDate: e.target.value })}
              data-testid="input-issued-date"
            />
          </div>
          <div>
            <Label>Expiration Date *</Label>
            <Input
              type="date"
              required
              value={formData.expirationDate}
              onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
              data-testid="input-expiration-date"
            />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional notes..."
            data-testid="input-license-notes"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isLoading} data-testid="button-submit-license">
          {isLoading ? "Adding..." : "Add License"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function StaffForm({ users, onSubmit, onClose, isLoading }: { users: UserType[]; onSubmit: (data: any) => void; onClose: () => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    userId: "",
    position: "",
    department: "",
    startDate: "",
    isPrimary: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate) : null,
      isActive: true,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add Staff Member</DialogTitle>
        <DialogDescription>Assign a user to work at this office.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label>User *</Label>
          <Select value={formData.userId} onValueChange={(v) => setFormData({ ...formData, userId: v })}>
            <SelectTrigger data-testid="select-staff-user">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Position</Label>
          <Input
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder="e.g., Office Manager, Coordinator"
            data-testid="input-staff-position"
          />
        </div>
        <div>
          <Label>Department</Label>
          <Input
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="e.g., Operations, HR"
            data-testid="input-staff-department"
          />
        </div>
        <div>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            data-testid="input-staff-start-date"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isLoading || !formData.userId} data-testid="button-submit-staff">
          {isLoading ? "Adding..." : "Add Staff"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ExpenseForm({ onSubmit, onClose, isLoading }: { onSubmit: (data: any) => void; onClose: () => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    expenseDate: "",
    expenseType: "supplies",
    description: "",
    vendor: "",
    amount: "",
    paymentMethod: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      expenseDate: new Date(formData.expenseDate),
      amount: parseFloat(formData.amount),
      status: "pending",
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add Expense</DialogTitle>
        <DialogDescription>Record a new office expense.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              required
              value={formData.expenseDate}
              onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              data-testid="input-expense-date"
            />
          </div>
          <div>
            <Label>Type *</Label>
            <Select value={formData.expenseType} onValueChange={(v) => setFormData({ ...formData, expenseType: v })}>
              <SelectTrigger data-testid="select-expense-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Description *</Label>
          <Input
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What was this expense for?"
            data-testid="input-expense-description"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Vendor</Label>
            <Input
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="Vendor name"
              data-testid="input-expense-vendor"
            />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              data-testid="input-expense-amount"
            />
          </div>
        </div>
        <div>
          <Label>Payment Method</Label>
          <Select value={formData.paymentMethod || "__none__"} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v === "__none__" ? "" : v })}>
            <SelectTrigger data-testid="select-payment-method">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select method</SelectItem>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            data-testid="input-expense-notes"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isLoading} data-testid="button-submit-expense">
          {isLoading ? "Adding..." : "Add Expense"}
        </Button>
      </DialogFooter>
    </form>
  );
}
