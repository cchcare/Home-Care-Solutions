import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
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
  Download
} from "lucide-react";

export default function Compliance() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: caregivers, isLoading: caregiversLoading } = useQuery({
    queryKey: ["/api/caregivers"],
    retry: false,
  });

  // Mock compliance data - in real implementation, this would come from API
  const complianceCategories = [
    {
      name: "HIPAA Training",
      total: caregivers?.length || 0,
      compliant: Math.floor((caregivers?.length || 0) * 0.95),
      percentage: 95,
      dueCount: 4,
      status: "good"
    },
    {
      name: "CPR Certification",
      total: caregivers?.length || 0,
      compliant: Math.floor((caregivers?.length || 0) * 0.90),
      percentage: 90,
      dueCount: 9,
      status: "warning"
    },
    {
      name: "Background Checks",
      total: caregivers?.length || 0,
      compliant: Math.floor((caregivers?.length || 0) * 0.81),
      percentage: 81,
      dueCount: 17,
      status: "critical"
    },
    {
      name: "First Aid Training",
      total: caregivers?.length || 0,
      compliant: Math.floor((caregivers?.length || 0) * 0.88),
      percentage: 88,
      dueCount: 11,
      status: "warning"
    }
  ];

  const criticalAlerts = [
    {
      id: 1,
      type: "certification_expiring",
      title: "CPR Certification Expiring Tomorrow",
      description: "Sarah Wilson - CPR Certification",
      priority: "critical",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    {
      id: 2,
      type: "background_check",
      title: "Background Check Update Required",
      description: "3 caregivers need annual background checks",
      priority: "high",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: 3,
      type: "training_overdue",
      title: "HIPAA Training Overdue",
      description: "Mike Thompson - Training expired 5 days ago",
      priority: "critical",
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-accent";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="w-5 h-5 text-accent" />;
      case "warning":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      default:
        return <Shield className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge variant="destructive">High Priority</Badge>;
      case "medium":
        return <Badge variant="default">Medium Priority</Badge>;
      default:
        return <Badge variant="secondary">Low Priority</Badge>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Compliance Tracking"
          subtitle="Monitor compliance status and requirements"
        />
        
        {/* Header */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex-1" />
          </div>
          <Button data-testid="button-generate-compliance-report">
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Compliance Overview */}
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
                            category.status === 'good' ? 'bg-accent' :
                            category.status === 'warning' ? 'bg-yellow-500' : 'bg-destructive'
                          }`}
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {category.dueCount} renewals due
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Critical Alerts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
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
                    className={`
                      flex items-center justify-between p-4 rounded-lg border
                      ${alert.priority === 'critical' ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'}
                    `}
                    data-testid={`alert-item-${alert.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className={`w-5 h-5 ${alert.priority === 'critical' ? 'text-destructive' : 'text-primary'}`} />
                      <div>
                        <p className="font-medium text-foreground">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.dueDate < new Date() ? 'Overdue by' : 'Due'}: {Math.abs(Math.floor((alert.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getPriorityBadge(alert.priority)}
                      <Button
                        size="sm"
                        variant={alert.priority === 'critical' ? 'destructive' : 'default'}
                        data-testid={`button-handle-alert-${alert.id}`}
                      >
                        Action Required
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search by caregiver name or certification type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-compliance"
                    />
                  </div>
                  <Button variant="outline" data-testid="button-filter-compliance">
                    <Shield className="w-4 h-4 mr-2" />
                    Filter by Status
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Caregiver</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">HIPAA Training</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">CPR Certification</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Background Check</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Overall Status</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {caregiversLoading ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Loading compliance data...
                          </td>
                        </tr>
                      ) : caregivers?.length > 0 ? (
                        caregivers.slice(0, 10).map((caregiver: any, index: number) => {
                          // Mock compliance status for each caregiver
                          const hipaaStatus = Math.random() > 0.2 ? "compliant" : "expired";
                          const cprStatus = Math.random() > 0.3 ? "compliant" : "expiring";
                          const backgroundStatus = Math.random() > 0.4 ? "compliant" : "due";
                          
                          const getComplianceBadge = (status: string) => {
                            switch (status) {
                              case "compliant":
                                return <Badge variant="default" className="text-xs">Current</Badge>;
                              case "expiring":
                                return <Badge variant="outline" className="text-xs text-yellow-600">Expiring Soon</Badge>;
                              case "expired":
                                return <Badge variant="destructive" className="text-xs">Expired</Badge>;
                              case "due":
                                return <Badge variant="secondary" className="text-xs">Due</Badge>;
                              default:
                                return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
                            }
                          };

                          const overallStatus = [hipaaStatus, cprStatus, backgroundStatus].every(s => s === "compliant") 
                            ? "compliant" 
                            : [hipaaStatus, cprStatus, backgroundStatus].some(s => s === "expired") 
                            ? "critical" 
                            : "warning";

                          return (
                            <tr key={caregiver.id} className="hover:bg-muted/25 transition-colors" data-testid={`row-compliance-${caregiver.id}`}>
                              <td className="p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                                    <UserCheck className="w-4 h-4 text-accent-foreground" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">Employee #{caregiver.employeeId}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Hired: {caregiver.hireDate ? new Date(caregiver.hireDate).toLocaleDateString() : "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">{getComplianceBadge(hipaaStatus)}</td>
                              <td className="p-4">{getComplianceBadge(cprStatus)}</td>
                              <td className="p-4">{getComplianceBadge(backgroundStatus)}</td>
                              <td className="p-4">
                                {overallStatus === "compliant" && 
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Compliant
                                  </Badge>
                                }
                                {overallStatus === "warning" && 
                                  <Badge variant="outline" className="text-xs text-yellow-600">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Needs Attention
                                  </Badge>
                                }
                                {overallStatus === "critical" && 
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Critical
                                  </Badge>
                                }
                              </td>
                              <td className="p-4">
                                <div className="flex space-x-2">
                                  <Button variant="ghost" size="sm" data-testid={`button-view-compliance-${caregiver.id}`}>
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" data-testid={`button-update-compliance-${caregiver.id}`}>
                                    <Calendar className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No compliance data found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Add Certification</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Record new certifications for caregivers
                  </p>
                  <Button className="w-full" data-testid="button-add-certification">
                    Add Certification
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 text-accent mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Upload Documents</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload compliance documentation
                  </p>
                  <Button variant="outline" className="w-full" data-testid="button-upload-compliance-docs">
                    Upload Documents
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Schedule Training</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Schedule compliance training sessions
                  </p>
                  <Button variant="outline" className="w-full" data-testid="button-schedule-training">
                    Schedule Training
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
