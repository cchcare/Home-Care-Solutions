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
import Samples from "@/pages/samples";
import Training from "@/pages/training";
import Communication from "@/pages/communication";
import Incidents from "@/pages/incidents";
import SuperAdmin from "@/pages/super-admin";
import UserManagement from "@/pages/user-management";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/clients" component={Clients} />
          <Route path="/caregivers" component={Caregivers} />
          <Route path="/offices" component={Offices} />
          <Route path="/compliance" component={Compliance} />
          <Route path="/documents" component={Documents} />
          <Route path="/samples" component={Samples} />
          <Route path="/training" component={Training} />
          <Route path="/communication" component={Communication} />
          <Route path="/incidents" component={Incidents} />
          <Route path="/super-admin" component={SuperAdmin} />
          <Route path="/user-management" component={UserManagement} />
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
