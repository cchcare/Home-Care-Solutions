import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { Shield, CheckCircle, AlertTriangle, Clock, Calendar } from "lucide-react";

interface ComplianceItem {
  id: string;
  itemType: string;
  status: string;
  expirationDate: string | null;
  completedDate: string | null;
  notes: string | null;
}

export default function MyCompliancePage() {
  const { data: complianceItems = [], isLoading } = useQuery<ComplianceItem[]>({
    queryKey: ["/api/my-compliance"],
  });

  const getStatusBadge = (status: string, expirationDate: string | null) => {
    if (status === "compliant" || status === "completed") {
      if (expirationDate) {
        const daysUntilExpiry = differenceInDays(new Date(expirationDate), new Date());
        if (daysUntilExpiry < 0) {
          return <Badge variant="destructive">Expired</Badge>;
        } else if (daysUntilExpiry <= 30) {
          return <Badge className="bg-yellow-500">Expiring Soon</Badge>;
        }
      }
      return <Badge className="bg-green-500">Compliant</Badge>;
    }
    if (status === "non_compliant" || status === "expired") {
      return <Badge variant="destructive">Non-Compliant</Badge>;
    }
    if (status === "pending") {
      return <Badge variant="secondary">Pending</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatItemType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const getStatusIcon = (status: string, expirationDate: string | null) => {
    if (status === "compliant" || status === "completed") {
      if (expirationDate) {
        const daysUntilExpiry = differenceInDays(new Date(expirationDate), new Date());
        if (daysUntilExpiry < 0) {
          return <AlertTriangle className="w-5 h-5 text-red-500" />;
        } else if (daysUntilExpiry <= 30) {
          return <Clock className="w-5 h-5 text-yellow-500" />;
        }
      }
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (status === "non_compliant" || status === "expired") {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    return <Clock className="w-5 h-5 text-gray-500" />;
  };

  const compliantCount = complianceItems.filter(item => 
    (item.status === "compliant" || item.status === "completed") && 
    (!item.expirationDate || differenceInDays(new Date(item.expirationDate), new Date()) >= 0)
  ).length;

  const expiringCount = complianceItems.filter(item => {
    if (!item.expirationDate) return false;
    const days = differenceInDays(new Date(item.expirationDate), new Date());
    return days >= 0 && days <= 30;
  }).length;

  const nonCompliantCount = complianceItems.filter(item => 
    item.status === "non_compliant" || item.status === "expired" ||
    (item.expirationDate && differenceInDays(new Date(item.expirationDate), new Date()) < 0)
  ).length;

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-24 bg-muted rounded"></div>
                <div className="h-24 bg-muted rounded"></div>
                <div className="h-24 bg-muted rounded"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-6 h-6" />
                My Compliance
              </h1>
              <p className="text-muted-foreground">Track your compliance status and requirements</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{compliantCount}</p>
                      <p className="text-sm text-muted-foreground">Compliant</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{expiringCount}</p>
                      <p className="text-sm text-muted-foreground">Expiring Soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{nonCompliantCount}</p>
                      <p className="text-sm text-muted-foreground">Needs Attention</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Items</CardTitle>
                <CardDescription>Your required certifications, training, and documentation</CardDescription>
              </CardHeader>
              <CardContent>
                {complianceItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No compliance items found. Contact your administrator if you believe this is an error.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {complianceItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {getStatusIcon(item.status, item.expirationDate)}
                          <div>
                            <p className="font-medium">{formatItemType(item.itemType)}</p>
                            {item.expirationDate && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Expires: {format(new Date(item.expirationDate), "MMM d, yyyy")}
                              </p>
                            )}
                            {item.completedDate && (
                              <p className="text-sm text-muted-foreground">
                                Completed: {format(new Date(item.completedDate), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(item.status, item.expirationDate)}
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
    </div>
  );
}
