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
  Layers,
  CheckCircle,
  FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiIssuesPanel } from "@/components/ai-issues-panel";
import { OpenFollowUpsWidget } from "@/components/open-follow-ups-widget";
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

  // Block rendering for caregivers and show skeleton loading state
  if (!canViewDashboard) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
            <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          </header>
          <div className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                        <div className="h-8 bg-muted rounded w-16 animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const recentClients = Array.isArray(clients)
    ? clients
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 3)
    : [];
  const pendingTasks = Array.isArray(tasks)
    ? tasks
        .filter(task => task.status === "pending")
        .sort((a, b) => {
          const priorityMap = { high: 0, medium: 1, low: 2 };
          return (priorityMap[a.priority as keyof typeof priorityMap] ?? 2) - (priorityMap[b.priority as keyof typeof priorityMap] ?? 2);
        })
        .slice(0, 4)
    : [];
  const recentMessages = Array.isArray(messages)
    ? messages
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 2)
    : [];
  const recentDocuments = Array.isArray(documents)
    ? documents
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 3)
    : [];

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Active Clients</p>
                      {metricsLoading ? (
                        <div className="h-10 bg-muted rounded w-24 animate-pulse mt-2" />
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-active-clients">
                            {metrics?.activeClients || 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Current census</p>
                        </>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Active Caregivers</p>
                      {metricsLoading ? (
                        <div className="h-10 bg-muted rounded w-24 animate-pulse mt-2" />
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-active-caregivers">
                            {metrics?.activeCaregivers || 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">On staff</p>
                        </>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Pending Tasks</p>
                      {metricsLoading ? (
                        <div className="h-10 bg-muted rounded w-24 animate-pulse mt-2" />
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-pending-tasks">
                            {metrics?.pendingTasks || 0}
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Need attention</p>
                        </>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Compliance Rate</p>
                      {metricsLoading ? (
                        <div className="h-10 bg-muted rounded w-24 animate-pulse mt-2" />
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-compliance-rate">
                            {metrics?.complianceRate || 0}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">On track</p>
                        </>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Statistics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="charts-monthly-stats">
              {/* Active DCW Count by Month */}
              <Card data-testid="card-chart-dcw-count" className="hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-sm font-semibold">Active DCW Count</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Monthly trend</p>
                </CardHeader>
                <CardContent className="p-4">
                  {monthlyStatsLoading ? (
                    <div className="h-[200px] bg-muted rounded animate-pulse" />
                  ) : chartData.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="monthName" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} cursor={{ stroke: 'hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="activeDcwCount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} activeDot={{ r: 6 }} name="DCW Count" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* EVV Percentage by Month */}
              <Card data-testid="card-chart-evv-percentage" className="hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-sm font-semibold">EVV Compliance Rate</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Monthly trend</p>
                </CardHeader>
                <CardContent className="p-4">
                  {monthlyStatsLoading ? (
                    <div className="h-[200px] bg-muted rounded animate-pulse" />
                  ) : chartData.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="monthName" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} className="text-muted-foreground" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(value) => [`${value}%`, 'EVV %']} cursor={{ stroke: 'hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="evvPercentage" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: 'hsl(var(--accent))', r: 4 }} activeDot={{ r: 6 }} name="EVV %" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Client Count by Month */}
              <Card data-testid="card-chart-client-count" className="hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-sm font-semibold">Client Census</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Monthly trend</p>
                </CardHeader>
                <CardContent className="p-4">
                  {monthlyStatsLoading ? (
                    <div className="h-[200px] bg-muted rounded animate-pulse" />
                  ) : chartData.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="monthName" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} cursor={{ stroke: 'hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="clientCount" stroke="hsl(var(--chart-3, #22c55e))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-3, #22c55e))', r: 4 }} activeDot={{ r: 6 }} name="Clients" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Issue Detection Panel */}
            <AiIssuesPanel />

            {/* Open Write-Up Follow-Ups (manager / HR widget) */}
            <OpenFollowUpsWidget />

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
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Latest updates</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast({ title: "Activity", description: "View all activity coming soon" })}
                    data-testid="button-view-all-activity"
                    className="text-xs"
                  >
                    View all
                  </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {messagesLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : recentMessages.length > 0 ? (
                    recentMessages.map((message) => (
                      <div key={message.id} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50 transition-colors">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Heart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{message.subject || "Activity update"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Heart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Common tasks</p>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link href="/clients" className="group">
                    <button
                      className={`flex flex-col items-center justify-center p-5 h-auto rounded-lg border-2 border-transparent transition-all w-full ${
                        canMutate
                          ? 'bg-blue-50 dark:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      disabled={!canMutate}
                      title={!canMutate ? viewOnlyMessage : "Add a new client"}
                      data-testid="button-add-client"
                    >
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/60 transition-colors">
                        <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Add Client</span>
                    </button>
                  </Link>

                  <Link href="/caregivers" className="group">
                    <button
                      className={`flex flex-col items-center justify-center p-5 h-auto rounded-lg border-2 border-transparent transition-all w-full ${
                        canMutate
                          ? 'bg-green-50 dark:bg-green-950/20 hover:border-green-300 dark:hover:border-green-800 hover:shadow-sm'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      disabled={!canMutate}
                      title={!canMutate ? viewOnlyMessage : "Add a new caregiver"}
                      data-testid="button-add-caregiver"
                    >
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center mb-2 group-hover:bg-green-200 dark:group-hover:bg-green-800/60 transition-colors">
                        <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Add Caregiver</span>
                    </button>
                  </Link>

                  <Link href="/incidents" className="group">
                    <button
                      className={`flex flex-col items-center justify-center p-5 h-auto rounded-lg border-2 border-transparent transition-all w-full ${
                        canMutate
                          ? 'bg-red-50 dark:bg-red-950/20 hover:border-red-300 dark:hover:border-red-800 hover:shadow-sm'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      disabled={!canMutate}
                      title={!canMutate ? viewOnlyMessage : "Report an incident"}
                      data-testid="button-incident-report"
                    >
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center mb-2 group-hover:bg-red-200 dark:group-hover:bg-red-800/60 transition-colors">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Incident Report</span>
                    </button>
                  </Link>

                  <Link href="/reports" className="group">
                    <button
                      className="flex flex-col items-center justify-center p-5 h-auto rounded-lg border-2 border-transparent bg-purple-50 dark:bg-purple-950/20 hover:border-purple-300 dark:hover:border-purple-800 hover:shadow-sm transition-all w-full"
                      data-testid="button-view-reports"
                      title="View all reports and analytics"
                    >
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center mb-2 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/60 transition-colors">
                        <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">View Reports</span>
                    </button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Recent Clients Table */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="border-b border-border pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">Recent Clients</CardTitle>
                    <Badge variant="secondary" data-testid="badge-total-clients" className="mt-2">
                      {clients?.length || 0} total
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast({ title: "Export", description: "Client export coming soon" })}
                      data-testid="button-export-clients"
                      className="text-xs"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Link href="/clients">
                      <Button
                        size="sm"
                        disabled={!canMutate}
                        title={!canMutate ? viewOnlyMessage : undefined}
                        data-testid="button-add-new-client"
                        className="text-xs"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {clientsLoading ? (
                    <div className="p-6 text-center">
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                        ))}
                      </div>
                    </div>
                  ) : recentClients.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-muted/40 border-b border-border">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Name</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Caregiver</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {recentClients.map((client) => (
                          <tr key={client.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-client-${client.id}`}>
                            <td className="px-6 py-4">
                              <Link href={`/clients/${client.id}`} className="flex items-center space-x-3 group">
                                <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs">
                                    {client.firstName?.[0]}{client.lastName?.[0]}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground group-hover:text-primary transition-colors text-sm" data-testid={`text-client-name-${client.id}`}>
                                    {client.firstName} {client.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {client.id.slice(0, 8)}
                                  </p>
                                </div>
                              </Link>
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              <p className="text-sm text-muted-foreground">Not assigned</p>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={client.status === "active" ? "default" : "secondary"}
                                data-testid={`badge-client-status-${client.id}`}
                                className="text-xs"
                              >
                                {client.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center gap-1">
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  data-testid={`button-view-client-${client.id}`}
                                >
                                  <Link href={`/clients/${client.id}`} aria-label={`View ${client.firstName} ${client.lastName}`} title="View profile">
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                </Button>
                                {canMutate ? (
                                  <Button
                                    asChild
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    data-testid={`button-edit-client-${client.id}`}
                                  >
                                    <Link href={`/clients/${client.id}?edit=1`} aria-label={`Edit ${client.firstName} ${client.lastName}`} title="Edit profile">
                                      <Edit className="w-4 h-4" />
                                    </Link>
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled
                                    title={viewOnlyMessage}
                                    className="h-8 w-8 p-0"
                                    data-testid={`button-edit-client-${client.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center">
                      <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">No clients yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Add your first client to get started</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Tasks & Recent Documents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Tasks */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Pending Tasks</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pendingTasks.length === 0 ? "All caught up!" : `${pendingTasks.length} task${pendingTasks.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <Link href="/tasks">
                    <Button variant="outline" size="sm" data-testid="button-view-all-tasks" className="text-xs">
                      View all
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-6 space-y-2">
                  {tasksLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : pendingTasks.length > 0 ? (
                    pendingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start justify-between p-3 border border-border rounded-lg hover:bg-muted/50 hover:border-muted-foreground/20 transition-all group"
                        data-testid={`task-item-${task.id}`}
                      >
                        <div className="flex items-start space-x-3 flex-1">
                          <input
                            type="checkbox"
                            className="w-4 h-4 mt-0.5 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2 cursor-pointer"
                            data-testid={`checkbox-task-${task.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{task.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "—"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className="ml-2 flex-shrink-0"
                          variant={
                            task.priority === "high"
                              ? "destructive"
                              : task.priority === "medium"
                              ? "default"
                              : "secondary"
                          }
                          data-testid={`badge-task-priority-${task.id}`}
                        >
                          <span className="text-xs">{task.priority}</span>
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-foreground">All set!</p>
                      <p className="text-xs text-muted-foreground mt-1">No pending tasks</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Documents */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Recent Documents</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{recentDocuments.length} recent</p>
                  </div>
                  <Link href="/documents">
                    <Button variant="outline" size="sm" data-testid="button-manage-documents" className="text-xs">
                      Manage
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {documentsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-14 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : recentDocuments.length > 0 ? (
                    recentDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="flex items-start justify-between p-3 border border-border rounded-lg hover:bg-muted/50 hover:border-muted-foreground/20 transition-all group"
                        data-testid={`document-item-${document.id}`}
                      >
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {document.originalName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(document.createdAt!).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <Badge
                            variant={document.isSigned ? "default" : "secondary"}
                            data-testid={`badge-document-status-${document.id}`}
                            className="text-xs"
                          >
                            {document.isSigned ? "Signed" : "Pending"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toast({ title: "Document", description: `Viewing ${document.originalName}` })}
                            data-testid={`button-view-document-${document.id}`}
                            title="View document"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">No documents yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Documents will appear here</p>
                    </div>
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
