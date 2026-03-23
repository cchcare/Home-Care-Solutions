import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { OfficeSelector } from "@/components/office-selector";
import { useOfficeScope } from "@/context/office-context";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  Shield, 
  Plus, 
  Download, 
  Eye, 
  Edit,
  Heart,
  Search,
  Bell,
  Settings,
  User,
  Key,
  LogOut,
  ChevronDown,
  ExternalLink,
  Trash2,
  PlusCircle,
  Pencil,
  Globe,
  X,
  Layers
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiIssuesPanel } from "@/components/ai-issues-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OfficeDashboardLink } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { selectedOfficeId, setSelectedOfficeId, isAllOffices, canMutate, viewOnlyMessage } = useOfficeScope();

  const isCaregiver = (user as any)?.role === "caregiver";
  const canViewDashboard = !isLoading && isAuthenticated && !isCaregiver;

  // Redirect caregivers to their profile - they should not see the dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && isCaregiver) {
      window.location.href = "/my-profile";
    }
  }, [isAuthenticated, isLoading, isCaregiver]);

  // Redirect to login if not authenticated
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
    }
  }, [isAuthenticated, isLoading, toast]);

  const officeQuery = selectedOfficeId !== "all" ? `?officeId=${selectedOfficeId}` : "";

  // All queries are disabled until we confirm user is NOT a caregiver
  const { data: metrics = {}, isLoading: metricsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/metrics", selectedOfficeId],
    queryFn: () => fetch(`/api/dashboard/metrics${officeQuery}`).then(r => r.json()),
    retry: false,
    enabled: canViewDashboard,
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", selectedOfficeId],
    queryFn: () => fetch(`/api/clients${officeQuery}`).then(r => r.json()),
    retry: false,
    enabled: canViewDashboard,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks", selectedOfficeId],
    queryFn: () => fetch(`/api/tasks${officeQuery}`).then(r => r.json()),
    retry: false,
    enabled: canViewDashboard,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: ["/api/messages", selectedOfficeId],
    queryFn: () => fetch(`/api/messages${officeQuery}`).then(r => r.json()),
    retry: false,
    enabled: canViewDashboard,
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<any[]>({
    queryKey: ["/api/documents", selectedOfficeId],
    queryFn: () => fetch(`/api/documents${officeQuery}`).then(r => r.json()),
    retry: false,
    enabled: canViewDashboard,
  });

  const { data: monthlyStats = [], isLoading: monthlyStatsLoading } = useQuery<{
    month: number;
    activeDcwCount: number;
    evvPercentage: number;
    clientCount: number;
  }[]>({
    queryKey: ["/api/dashboard/monthly-stats", new Date().getFullYear(), selectedOfficeId],
    queryFn: () => fetch(`/api/dashboard/monthly-stats?year=${new Date().getFullYear()}${selectedOfficeId !== "all" ? `&officeId=${selectedOfficeId}` : ""}`).then(r => r.json()),
    retry: false,
    enabled: canViewDashboard,
  });

  const { data: quickLinks = [], isLoading: quickLinksLoading } = useQuery<OfficeDashboardLink[]>({
    queryKey: ["/api/offices", selectedOfficeId, "dashboard-links"],
    queryFn: () => fetch(`/api/offices/${selectedOfficeId}/dashboard-links`).then(r => r.json()),
    enabled: canViewDashboard && !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<OfficeDashboardLink | null>(null);
  const [linkForm, setLinkForm] = useState({ title: "", url: "", description: "" });

  const createLinkMutation = useMutation({
    mutationFn: async (data: { title: string; url: string; description?: string }) => {
      return await apiRequest("POST", `/api/offices/${selectedOfficeId}/dashboard-links`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", selectedOfficeId, "dashboard-links"] });
      setLinkDialogOpen(false);
      setLinkForm({ title: "", url: "", description: "" });
      toast({ title: "Success", description: "Link added successfully" });
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OfficeDashboardLink> }) => {
      return await apiRequest("PATCH", `/api/dashboard-links/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", selectedOfficeId, "dashboard-links"] });
      setLinkDialogOpen(false);
      setEditingLink(null);
      setLinkForm({ title: "", url: "", description: "" });
      toast({ title: "Success", description: "Link updated successfully" });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/dashboard-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices", selectedOfficeId, "dashboard-links"] });
      toast({ title: "Success", description: "Link deleted successfully" });
    },
  });

  const handleOpenAddLink = () => {
    setEditingLink(null);
    setLinkForm({ title: "", url: "", description: "" });
    setLinkDialogOpen(true);
  };

  const handleOpenEditLink = (link: OfficeDashboardLink) => {
    setEditingLink(link);
    setLinkForm({ title: link.title, url: link.url, description: link.description || "" });
    setLinkDialogOpen(true);
  };

  const handleSaveLink = () => {
    if (!linkForm.title || !linkForm.url) return;
    if (editingLink) {
      updateLinkMutation.mutate({ id: editingLink.id, data: linkForm });
    } else {
      createLinkMutation.mutate(linkForm);
    }
  };

  const isOfficeManager = user?.role === "admin" || user?.role === "office_admin" || user?.role === "super_admin";

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = monthlyStats.map((stat) => ({
    ...stat,
    monthName: monthNames[stat.month - 1],
  }));

  // Block rendering for caregivers and show loading state
  if (!canViewDashboard) {
    return <div>Loading...</div>;
  }

  const recentClients = Array.isArray(clients) ? clients.slice(0, 3) : [];
  const pendingTasks = Array.isArray(tasks) ? tasks.filter(task => task.status === "pending").slice(0, 4) : [];
  const recentMessages = Array.isArray(messages) ? messages.slice(0, 2) : [];
  const recentDocuments = Array.isArray(documents) ? documents.slice(0, 3) : [];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold text-foreground">Dashboard Overview</h2>
              <p className="text-sm text-muted-foreground">Welcome back, manage your care operations</p>
            </div>
            <OfficeSelector
              selectedOfficeId={selectedOfficeId === "all" ? undefined : selectedOfficeId}
              onOfficeChange={setSelectedOfficeId}
              showAllOption={true}
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:flex items-center bg-muted rounded-lg px-3 py-2 max-w-xs">
              <Search className="w-4 h-4 text-muted-foreground mr-2" />
              <input 
                type="text" 
                placeholder="Search clients, caregivers..." 
                className="bg-transparent border-0 focus:outline-none text-sm text-foreground placeholder-muted-foreground flex-1"
                data-testid="input-global-search"
              />
            </div>

            {/* Notifications */}
            <button 
              className="relative p-2 text-muted-foreground hover:text-foreground" 
              onClick={() => toast({ title: "Notifications", description: `${metrics?.criticalAlerts || 0} critical alerts pending` })}
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {metrics?.criticalAlerts || 0}
              </span>
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted" 
                  data-testid="button-user-menu"
                >
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-medium">
                      {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || 'U'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || 'User'}</p>
                </div>
                <DropdownMenuSeparator />
                <Link href="/account-settings">
                  <DropdownMenuItem data-testid="menu-item-my-account">
                    <User className="mr-2 h-4 w-4" />
                    My Account
                  </DropdownMenuItem>
                </Link>
                <Link href="/account-settings">
                  <DropdownMenuItem data-testid="menu-item-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <Link href="/account-settings">
                  <DropdownMenuItem data-testid="menu-item-change-password">
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive"
                  data-testid="menu-item-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Active Clients</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-active-clients">
                        {metricsLoading ? "..." : metrics?.activeClients || 0}
                      </p>
                      <p className="text-xs text-accent mt-1">Current census</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Active Caregivers</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-active-caregivers">
                        {metricsLoading ? "..." : metrics?.activeCaregivers || 0}
                      </p>
                      <p className="text-xs text-accent mt-1">On staff</p>
                    </div>
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Pending Tasks</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-pending-tasks">
                        {metricsLoading ? "..." : metrics?.pendingTasks || 0}
                      </p>
                      <p className="text-xs text-destructive mt-1">Need attention</p>
                    </div>
                    <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Compliance Rate</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-compliance-rate">
                        {metricsLoading ? "..." : `${metrics?.complianceRate || 0}%`}
                      </p>
                      <p className="text-xs text-accent mt-1">Above target</p>
                    </div>
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Statistics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="charts-monthly-stats">
              {/* Active DCW Count by Month */}
              <Card data-testid="card-chart-dcw-count">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-base">Active DCW Count by Month</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {monthlyStatsLoading ? (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="monthName" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="activeDcwCount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} name="DCW Count" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* EVV Percentage by Month */}
              <Card data-testid="card-chart-evv-percentage">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-base">EVV Percentage by Month</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {monthlyStatsLoading ? (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="monthName" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} className="text-muted-foreground" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(value) => [`${value}%`, 'EVV %']} />
                        <Line type="monotone" dataKey="evvPercentage" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: 'hsl(var(--accent))' }} name="EVV %" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Client Count by Month */}
              <Card data-testid="card-chart-client-count">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-base">Client Count by Month</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {monthlyStatsLoading ? (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="monthName" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="clientCount" stroke="hsl(var(--chart-3, #22c55e))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-3, #22c55e))' }} name="Clients" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Issue Detection Panel */}
            <AiIssuesPanel />

            {/* Agency Tools */}
            <Card data-testid="card-agency-tools">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Agency Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Link href="/overlap-checker">
                    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid="tool-card-overlap-checker">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Layers className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Visit Overlap Checker</p>
                        <p className="text-xs text-muted-foreground">Detect overlapping caregiver visits from HHAeXchange exports</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links Section */}
            {selectedOfficeId !== "all" && (
              <Card data-testid="card-quick-links">
                <CardHeader className="border-b border-border flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Quick Links
                  </CardTitle>
                  {isOfficeManager && (
                    <Button size="sm" variant="outline" onClick={handleOpenAddLink} data-testid="button-add-quick-link">
                      <PlusCircle className="w-4 h-4 mr-1" />
                      Add Link
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  {quickLinksLoading ? (
                    <div className="text-center text-muted-foreground py-4">Loading...</div>
                  ) : quickLinks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">
                      No quick links configured. {isOfficeManager && "Click 'Add Link' to add your first link."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {quickLinks.map((link) => (
                        <div
                          key={link.id}
                          className="group relative flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          data-testid={`quick-link-${link.id}`}
                        >
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ExternalLink className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-sm hover:text-primary truncate block"
                              data-testid={`link-title-${link.id}`}
                            >
                              {link.title}
                            </a>
                            {link.description && (
                              <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                            )}
                          </div>
                          {isOfficeManager && (
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleOpenEditLink(link)}
                                data-testid={`button-edit-link-${link.id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => deleteLinkMutation.mutate(link.id)}
                                data-testid={`button-delete-link-${link.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Activity & Quick Actions Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Activity</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toast({ title: "Activity", description: "View all activity coming soon" })}
                      data-testid="button-view-all-activity"
                    >
                      View all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {messagesLoading ? (
                    <div>Loading activity...</div>
                  ) : recentMessages.length > 0 ? (
                    recentMessages.map((message) => (
                      <div key={message.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                          <Heart className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{message.subject || "Activity update"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.createdAt!).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="border-b border-border">
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link href="/clients">
                    <Button 
                      className="flex flex-col items-center p-6 h-auto bg-muted hover:bg-secondary text-foreground w-full"
                      disabled={!canMutate}
                      title={!canMutate ? viewOnlyMessage : undefined}
                      data-testid="button-add-client"
                    >
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-3">
                        <Plus className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <span className="text-sm font-medium">Add Client</span>
                    </Button>
                  </Link>

                  <Link href="/caregivers">
                    <Button 
                      className="flex flex-col items-center p-6 h-auto bg-muted hover:bg-secondary text-foreground w-full"
                      disabled={!canMutate}
                      title={!canMutate ? viewOnlyMessage : undefined}
                      data-testid="button-add-caregiver"
                    >
                      <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-3">
                        <UserCheck className="w-6 h-6 text-accent-foreground" />
                      </div>
                      <span className="text-sm font-medium">Add Caregiver</span>
                    </Button>
                  </Link>

                  <Link href="/incidents">
                    <Button 
                      className="flex flex-col items-center p-6 h-auto bg-muted hover:bg-secondary text-foreground w-full"
                      disabled={!canMutate}
                      title={!canMutate ? viewOnlyMessage : undefined}
                      data-testid="button-incident-report"
                    >
                      <div className="w-12 h-12 bg-destructive rounded-lg flex items-center justify-center mb-3">
                        <AlertTriangle className="w-6 h-6 text-destructive-foreground" />
                      </div>
                      <span className="text-sm font-medium">Incident Report</span>
                    </Button>
                  </Link>

                  <Link href="/reports">
                    <Button 
                      className="flex flex-col items-center p-6 h-auto bg-muted hover:bg-secondary text-foreground w-full"
                      data-testid="button-view-reports"
                    >
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-3">
                        <Eye className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <span className="text-sm font-medium">View Reports</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Recent Clients Table */}
            <Card>
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle>Recent Clients</CardTitle>
                    <Badge variant="secondary" data-testid="badge-total-clients">
                      {clients?.length || 0} total
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toast({ title: "Export", description: "Client export coming soon" })}
                      data-testid="button-export-clients"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Link href="/clients">
                      <Button 
                        size="sm" 
                        disabled={!canMutate}
                        title={!canMutate ? viewOnlyMessage : undefined}
                        data-testid="button-add-new-client"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Client
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client Name</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Primary Caregiver</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {clientsLoading ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground">
                            Loading clients...
                          </td>
                        </tr>
                      ) : recentClients.length > 0 ? (
                        recentClients.map((client) => (
                          <tr key={client.id} className="hover:bg-muted/25 transition-colors" data-testid={`row-client-${client.id}`}>
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-primary-foreground font-medium text-sm">
                                    {client.firstName?.[0]}{client.lastName?.[0]}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground" data-testid={`text-client-name-${client.id}`}>
                                    {client.firstName} {client.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    ID: {client.id.slice(0, 8)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-sm text-foreground">Not assigned</p>
                              <p className="text-xs text-muted-foreground">Available for assignment</p>
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant={client.status === "active" ? "default" : "secondary"}
                                data-testid={`badge-client-status-${client.id}`}
                              >
                                {client.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => toast({ title: "Client Details", description: `Viewing details for ${client.firstName} ${client.lastName}` })}
                                  data-testid={`button-view-client-${client.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => toast({ title: "Edit Client", description: `Editing ${client.firstName} ${client.lastName}` })}
                                  disabled={!canMutate}
                                  title={!canMutate ? viewOnlyMessage : undefined}
                                  data-testid={`button-edit-client-${client.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground">
                            No clients found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pending Tasks & Recent Documents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Tasks */}
              <Card>
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle>Pending Tasks</CardTitle>
                    <Link href="/tasks">
                      <Button variant="ghost" size="sm" data-testid="button-view-all-tasks">
                        View all tasks
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {tasksLoading ? (
                    <div>Loading tasks...</div>
                  ) : pendingTasks.length > 0 ? (
                    pendingTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/25 transition-colors" data-testid={`task-item-${task.id}`}>
                        <div className="flex items-center space-x-3">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                            data-testid={`checkbox-task-${task.id}`}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}
                          data-testid={`badge-task-priority-${task.id}`}
                        >
                          {task.priority} Priority
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No pending tasks</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Documents */}
              <Card>
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Documents</CardTitle>
                    <Link href="/documents">
                      <Button variant="ghost" size="sm" data-testid="button-manage-documents">
                        Manage Documents
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {documentsLoading ? (
                    <div>Loading documents...</div>
                  ) : recentDocuments.length > 0 ? (
                    recentDocuments.map((document) => (
                      <div key={document.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/25 transition-colors" data-testid={`document-item-${document.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Heart className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{document.originalName}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded {new Date(document.createdAt!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={document.isSigned ? "default" : "secondary"} data-testid={`badge-document-status-${document.id}`}>
                            {document.isSigned ? "Signed" : "Pending"}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toast({ title: "Document", description: `Viewing ${document.originalName}` })}
                            data-testid={`button-view-document-${document.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent documents</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Quick Links Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Link" : "Add Quick Link"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-title">Title *</Label>
              <Input
                id="link-title"
                value={linkForm.title}
                onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                placeholder="e.g., HHAexchange Portal"
                data-testid="input-link-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL *</Label>
              <Input
                id="link-url"
                value={linkForm.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                placeholder="https://example.com"
                data-testid="input-link-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-description">Description (optional)</Label>
              <Textarea
                id="link-description"
                value={linkForm.description}
                onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                placeholder="Brief description of this link"
                rows={2}
                data-testid="input-link-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveLink}
              disabled={!linkForm.title || !linkForm.url || createLinkMutation.isPending || updateLinkMutation.isPending}
              data-testid="button-save-link"
            >
              {createLinkMutation.isPending || updateLinkMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
