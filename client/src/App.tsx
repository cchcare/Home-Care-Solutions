import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Caregivers from "@/pages/caregivers";
import Offices from "@/pages/offices";
import Compliance from "@/pages/compliance";
import Documents from "@/pages/documents";
import Training from "@/pages/training";
import Communication from "@/pages/communication";
import Incidents from "@/pages/incidents";
import SuperAdmin from "@/pages/super-admin";
import UserManagement from "@/pages/user-management";
import Reports from "@/pages/reports";
import Tasks from "@/pages/tasks";
import FamilyPortal from "@/pages/family-portal";
import RoleWizard from "@/pages/role-wizard";
import AccountSettings from "@/pages/account-settings";
import AdminSettings from "@/pages/admin-settings";

function Router() {
  const { isAuthenticated, isLoading, error } = useAuth();

  // If loading, show a loading state instead of the landing page
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/family-portal" component={FamilyPortal} />
          <Route path="/clients" component={Clients} />
          <Route path="/caregivers" component={Caregivers} />
          <Route path="/offices" component={Offices} />
          <Route path="/compliance" component={Compliance} />
          <Route path="/documents" component={Documents} />
          <Route path="/training" component={Training} />
          <Route path="/communication" component={Communication} />
          <Route path="/incidents" component={Incidents} />
          <Route path="/super-admin" component={SuperAdmin} />
          <Route path="/user-management" component={UserManagement} />
          <Route path="/reports" component={Reports} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/account-settings" component={AccountSettings} />
          <Route path="/admin-settings" component={AdminSettings} />
          <Route path="/role-wizard" component={RoleWizard} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
