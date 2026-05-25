import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  AlertTriangle,
  Send,
  Mail,
  MessageCircle,
  Clock,
  User,
  Users,
  Calendar,
  Settings,
  Save,
  RefreshCw,
  Shield,
  CreditCard,
  FileCheck,
} from "lucide-react";

interface ExpiringItem {
  id: string;
  type: "caregiver_compliance" | "client_snap" | "client_medicaid";
  entityId: string;
  entityName: string;
  entityEmail?: string;
  entityPhone?: string;
  itemType: string;
  itemDescription: string;
  expirationDate: string;
  daysUntilExpiration: number;
  officeId?: string;
  officeName?: string;
}

interface ExpirationAlertSettings {
  enabled: boolean;
  alertDaysBefore: number[];
  sendEmail: boolean;
  sendSms: boolean;
  notifyAdmins: boolean;
  adminEmails: string[];
}

export default function ExpirationAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [settings, setSettings] = useState<ExpirationAlertSettings>({
    enabled: true,
    alertDaysBefore: [30, 14, 7, 1],
    sendEmail: true,
    sendSms: true,
    notifyAdmins: true,
    adminEmails: [],
  });
  const [adminEmailInput, setAdminEmailInput] = useState("");

  const { data: expirations = [], isLoading: expirationsLoading } = useQuery<ExpiringItem[]>({
    queryKey: ["/api/admin/expiration-alerts", { days: 30 }],
    queryFn: async () => {
      const response = await fetch(`/api/admin/expiration-alerts?days=30`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch expiration alerts");
      return response.json();
    },
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<ExpirationAlertSettings>({
    queryKey: ["/api/admin/expiration-alerts/settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/expiration-alerts/settings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
      setAdminEmailInput(settingsData.adminEmails.join(", "));
    }
  }, [settingsData]);

  const sendAlertsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/expiration-alerts/send", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Alerts Sent",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expiration-alerts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Alerts",
        description: error.message || "Could not send expiration alerts",
        variant: "destructive",
      });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: ExpirationAlertSettings) => {
      const response = await apiRequest("PUT", "/api/admin/expiration-alerts/settings", newSettings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Expiration alert settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expiration-alerts/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save Settings",
        description: error.message || "Could not save settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    const emails = adminEmailInput
      .split(",")
      .map(e => e.trim())
      .filter(e => e.length > 0);
    saveSettingsMutation.mutate({ ...settings, adminEmails: emails });
  };

  const handleResetSettings = () => {
    if (settingsData) {
      setSettings(settingsData);
      setAdminEmailInput(settingsData.adminEmails.join(", "));
      toast({ title: "Settings Reset", description: "Settings have been reset to last saved values." });
    }
  };

  const filteredExpirations = expirations.filter(item => {
    if (typeFilter === "all") return true;
    return item.type === typeFilter;
  });

  const expiringToday = filteredExpirations.filter(item => item.daysUntilExpiration === 0);
  const expiringWithin7Days = filteredExpirations.filter(item => item.daysUntilExpiration > 0 && item.daysUntilExpiration <= 7);
  const expiringWithin14Days = filteredExpirations.filter(item => item.daysUntilExpiration > 7 && item.daysUntilExpiration <= 14);
  const expiringWithin30Days = filteredExpirations.filter(item => item.daysUntilExpiration > 14 && item.daysUntilExpiration <= 30);

  const getUrgencyBadge = (days: number) => {
    if (days === 0) {
      return <Badge className="bg-red-600 text-white" data-testid="badge-urgency-today">TODAY</Badge>;
    } else if (days <= 7) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" data-testid="badge-urgency-critical">{days} days</Badge>;
    } else if (days <= 14) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" data-testid="badge-urgency-warning">{days} days</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" data-testid="badge-urgency-normal">{days} days</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "caregiver_compliance":
        return <Badge variant="secondary" className="flex items-center gap-1"><FileCheck className="w-3 h-3" />Caregiver Compliance</Badge>;
      case "client_snap":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 flex items-center gap-1"><CreditCard className="w-3 h-3" />SNAP</Badge>;
      case "client_medicaid":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 flex items-center gap-1"><Shield className="w-3 h-3" />Medicaid</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const renderExpirationTable = (items: ExpiringItem[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Expiration Date</TableHead>
            <TableHead>Days Left</TableHead>
            <TableHead>Contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} data-testid={`row-expiration-${item.id}`}>
              <TableCell>{getTypeBadge(item.type)}</TableCell>
              <TableCell className="font-medium">{item.entityName}</TableCell>
              <TableCell>{item.itemDescription}</TableCell>
              <TableCell>{format(new Date(item.expirationDate), "MMM d, yyyy")}</TableCell>
              <TableCell>{getUrgencyBadge(item.daysUntilExpiration)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {item.entityEmail && <span title={item.entityEmail}><Mail className="w-4 h-4 text-blue-500" /></span>}
                  {item.entityPhone && <span title={item.entityPhone}><MessageCircle className="w-4 h-4 text-green-500" /></span>}
                  {!item.entityEmail && !item.entityPhone && (
                    <span className="text-gray-400 text-sm">No contact info</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">
                    Expiration Alerts
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400">
                    Monitor and manage upcoming expirations for compliance items and benefits
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[200px]" data-testid="select-type-filter">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="caregiver_compliance">Caregiver Compliance</SelectItem>
                    <SelectItem value="client_snap">Client SNAP</SelectItem>
                    <SelectItem value="client_medicaid">Client Medicaid</SelectItem>
                    <SelectItem value="document_expiration">Document Expiration</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => sendAlertsMutation.mutate()}
                  disabled={sendAlertsMutation.isPending}
                  data-testid="button-send-alerts"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendAlertsMutation.isPending ? "Sending..." : "Send Alerts Now"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-l-4 border-l-red-600">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Today</p>
                      <p className="text-2xl font-bold" data-testid="text-count-today">{expiringToday.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-400">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                      <Clock className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Within 7 Days</p>
                      <p className="text-2xl font-bold" data-testid="text-count-7days">{expiringWithin7Days.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-400">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                      <Calendar className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Within 14 Days</p>
                      <p className="text-2xl font-bold" data-testid="text-count-14days">{expiringWithin14Days.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-400">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                      <Calendar className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Within 30 Days</p>
                      <p className="text-2xl font-bold" data-testid="text-count-30days">{expiringWithin30Days.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming" data-testid="tab-upcoming">
                  <Calendar className="w-4 h-4 mr-2" />
                  Upcoming Expirations
                </TabsTrigger>
                <TabsTrigger value="settings" data-testid="tab-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Alert Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                {expirationsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : (
                  <div className="space-y-6">
                    {expiringToday.length > 0 && (
                      <Card className="border-red-200 dark:border-red-800">
                        <CardHeader className="bg-red-50 dark:bg-red-900/20">
                          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                            <AlertTriangle className="w-5 h-5" />
                            Expiring Today ({expiringToday.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <ScrollArea className="h-[200px]">
                            {renderExpirationTable(expiringToday, "No items expiring today")}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {expiringWithin7Days.length > 0 && (
                      <Card className="border-red-100 dark:border-red-900">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <Clock className="w-5 h-5" />
                            Expiring Within 7 Days ({expiringWithin7Days.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px]">
                            {renderExpirationTable(expiringWithin7Days, "No items expiring within 7 days")}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {expiringWithin14Days.length > 0 && (
                      <Card className="border-yellow-100 dark:border-yellow-900">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                            <Calendar className="w-5 h-5" />
                            Expiring Within 14 Days ({expiringWithin14Days.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px]">
                            {renderExpirationTable(expiringWithin14Days, "No items expiring within 14 days")}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {expiringWithin30Days.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <Calendar className="w-5 h-5" />
                            Expiring Within 30 Days ({expiringWithin30Days.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px]">
                            {renderExpirationTable(expiringWithin30Days, "No items expiring within 30 days")}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {filteredExpirations.length === 0 && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8 text-gray-500">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No upcoming expirations found</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Alert Settings
                    </CardTitle>
                    <CardDescription>
                      Configure when and how expiration alerts are sent
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {settingsLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading settings...</div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="enabled">Enable Expiration Alerts</Label>
                            <p className="text-sm text-gray-500">Turn automatic expiration alerts on or off</p>
                          </div>
                          <Switch
                            id="enabled"
                            checked={settings.enabled}
                            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                            data-testid="switch-enabled"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="sendEmail" className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Email Notifications
                            </Label>
                            <p className="text-sm text-gray-500">Send alerts via email</p>
                          </div>
                          <Switch
                            id="sendEmail"
                            checked={settings.sendEmail}
                            onCheckedChange={(checked) => setSettings({ ...settings, sendEmail: checked })}
                            data-testid="switch-email"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="sendSms" className="flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              SMS Notifications
                            </Label>
                            <p className="text-sm text-gray-500">Send alerts via SMS</p>
                          </div>
                          <Switch
                            id="sendSms"
                            checked={settings.sendSms}
                            onCheckedChange={(checked) => setSettings({ ...settings, sendSms: checked })}
                            data-testid="switch-sms"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="notifyAdmins">Notify Administrators</Label>
                            <p className="text-sm text-gray-500">Send summary alerts to admin users</p>
                          </div>
                          <Switch
                            id="notifyAdmins"
                            checked={settings.notifyAdmins}
                            onCheckedChange={(checked) => setSettings({ ...settings, notifyAdmins: checked })}
                            data-testid="switch-notify-admins"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="alertDays">Alert Days Before Expiration</Label>
                          <p className="text-sm text-gray-500 mb-2">
                            Comma-separated list of days before expiration to send alerts (e.g., 30, 14, 7, 1)
                          </p>
                          <Input
                            id="alertDays"
                            value={settings.alertDaysBefore.join(", ")}
                            onChange={(e) => {
                              const days = e.target.value
                                .split(",")
                                .map(d => parseInt(d.trim()))
                                .filter(d => !isNaN(d) && d > 0);
                              setSettings({ ...settings, alertDaysBefore: days });
                            }}
                            placeholder="30, 14, 7, 1"
                            data-testid="input-alert-days"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="adminEmails">Additional Admin Email Recipients</Label>
                          <p className="text-sm text-gray-500 mb-2">
                            Comma-separated list of email addresses to receive summary alerts
                          </p>
                          <Input
                            id="adminEmails"
                            value={adminEmailInput}
                            onChange={(e) => setAdminEmailInput(e.target.value)}
                            placeholder="admin1@example.com, admin2@example.com"
                            data-testid="input-admin-emails"
                          />
                        </div>

                        <div className="flex gap-4 pt-4 border-t">
                          <Button
                            onClick={handleSaveSettings}
                            disabled={saveSettingsMutation.isPending}
                            data-testid="button-save-settings"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleResetSettings}
                            data-testid="button-reset-settings"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
