import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
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
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiIssuesPanel } from "@/components/ai-issues-panel";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { selectedOfficeId, setSelectedOfficeId, isAllOffices, canMutate, viewOnlyMessage } = useOfficeScope();

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
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const officeQuery = selectedOfficeId !== "all" ? `?officeId=${selectedOfficeId}` : "";

  const { data: metrics = {}, isLoading: metricsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/metrics", selectedOfficeId],
    queryFn: () => fetch(`/api/dashboard/metrics${officeQuery}`).then(r => r.json()),
    retry: false,
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", selectedOfficeId],
    queryFn: () => fetch(`/api/clients${officeQuery}`).then(r => r.json()),
    retry: false,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks", selectedOfficeId],
    queryFn: () => fetch(`/api/tasks${officeQuery}`).then(r => r.json()),
    retry: false,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: ["/api/messages", selectedOfficeId],
    queryFn: () => fetch(`/api/messages${officeQuery}`).then(r => r.json()),
    retry: false,
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<any[]>({
    queryKey: ["/api/documents", selectedOfficeId],
    queryFn: () => fetch(`/api/documents${officeQuery}`).then(r => r.json()),
    retry: false,
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
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = monthlyStats.map((stat) => ({
    ...stat,
    monthName: monthNames[stat.month - 1],
  }));

  if (isLoading || !isAuthenticated) {
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
                  onClick={() => window.location.href = "/api/logout"}
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
                <CardContent className="p-6 grid grid-cols-2 gap-4">
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
    </div>
  );
}
