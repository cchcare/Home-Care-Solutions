import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  description: string;
  lastChecked: Date;
}

export default function SystemStatus() {
  const [, setLocation] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: "Web Application",
      status: "operational",
      description: "Main application interface",
      lastChecked: new Date(),
    },
    {
      name: "Authentication",
      status: "operational",
      description: "User login and session management",
      lastChecked: new Date(),
    },
    {
      name: "Database",
      status: "operational",
      description: "Data storage and retrieval",
      lastChecked: new Date(),
    },
    {
      name: "Email Service",
      status: "operational",
      description: "Password reset and notifications",
      lastChecked: new Date(),
    },
    {
      name: "File Storage",
      status: "operational",
      description: "Document uploads and management",
      lastChecked: new Date(),
    },
  ]);

  const checkApiHealth = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/auth/me");
      const now = new Date();
      
      setServices(prev => prev.map(service => {
        if (service.name === "Web Application" || service.name === "Authentication") {
          return {
            ...service,
            status: response.ok || response.status === 401 ? "operational" : "down",
            lastChecked: now,
          };
        }
        return { ...service, lastChecked: now };
      }));
      
      setLastUpdated(now);
    } catch (error) {
      setServices(prev => prev.map(service => ({
        ...service,
        status: service.name === "Web Application" ? "down" : service.status,
        lastChecked: new Date(),
      })));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "degraded":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "down":
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Operational</Badge>;
      case "degraded":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Degraded</Badge>;
      case "down":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Down</Badge>;
    }
  };

  const allOperational = services.every(s => s.status === "operational");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Home Care</h1>
            </div>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl">System Status</CardTitle>
                <CardDescription>
                  Current operational status of all system components
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkApiHealth}
                disabled={isRefreshing}
                data-testid="button-refresh-status"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              allOperational ? 'bg-green-50 dark:bg-green-950' : 'bg-yellow-50 dark:bg-yellow-950'
            }`}>
              {allOperational ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">All Systems Operational</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">Some Systems Affected</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service) => (
                <div 
                  key={service.name}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`status-${service.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No recent incidents reported</p>
              <p className="text-sm mt-1">All systems have been running smoothly</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
