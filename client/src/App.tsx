import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";
import ErrorLog from "@/pages/error-log";
import WriteUps from "@/pages/write-ups";
import HelpCenterAdmin from "@/pages/help-center-admin";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { OfficeProvider } from "@/context/office-context";
import NotFound from "@/pages/not-found";
import SearchPage from "@/pages/search";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientProfile from "@/pages/client-profile";
import Caregivers from "@/pages/caregivers";
import CaregiverProfile from "@/pages/caregiver-profile";
import StaffProfile from "@/pages/staff-profile";
import Offices from "@/pages/offices";
import OfficeProfile from "@/pages/office-profile";
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
import BillingPayroll from "@/pages/billing-payroll";
import PtoBalances from "@/pages/pto-balances";
import BenefitsPlans from "@/pages/benefits-plans";
import BenefitsWindows from "@/pages/benefits-windows";
import BenefitsEnrollments from "@/pages/benefits-enrollments";
import MyBenefits from "@/pages/my-benefits";
import AIAssistant from "@/pages/ai-assistant";
import ResetPassword from "@/pages/reset-password";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfUse from "@/pages/terms-of-use";
import SystemStatus from "@/pages/system-status";
import BirthdayNotifications from "@/pages/birthday-notifications";
import EvvClock from "@/pages/evv-clock";
import HhaxIntegration from "@/pages/hhax-integration";
import ExclusionVerification from "@/pages/exclusion-verification";
import Pricing from "@/pages/pricing";
import Signup from "@/pages/signup";
import SignupSuccess from "@/pages/signup-success";
import SupportCenter from "@/pages/support-center";
import ApiDocumentation from "@/pages/api-documentation";
import SupportTickets from "@/pages/support-tickets";
import CustomIntegrations from "@/pages/custom-integrations";
import ApiKeys from "@/pages/api-keys";
import LetterTemplates from "@/pages/letter-templates";
import CoordinatorPayRecords from "@/pages/coordinator-pay-records";
import Coordinators from "@/pages/coordinators";
import CoordinatorProfile from "@/pages/coordinator-profile";
import CoordinatorCompensation from "@/pages/coordinator-compensation";
import PayrollHub from "@/pages/payroll-hub";
import EmailTemplates from "@/pages/email-templates";
import ExpirationAlerts from "@/pages/expiration-alerts";
import ClientIntake from "@/pages/client-intake";
import ShiftSwapRequests from "@/pages/shift-swap-requests";
import StaffTimeTracking from "@/pages/staff-time-tracking";
import Staff from "@/pages/staff";
import Employees from "@/pages/employees";
import PerformanceReviews from "@/pages/performance-reviews";
import OrgChart from "@/pages/org-chart";
import Kiosk from "@/pages/kiosk";
import KioskSetup from "@/pages/kiosk-setup";
import CareQualityScorecard from "@/pages/care-quality-scorecard";
import FinancialReports from "@/pages/financial-reports";
import ESignatureTemplates from "@/pages/esignature-templates";
import ESign from "@/pages/esign";
import VisitLogUpload from "@/pages/visit-log-upload";
import ScheduleOverlapReport from "@/pages/schedule-overlap-report";
import OverlapChecker from "@/pages/overlap-checker";
import PayrollHoursCalculator from "@/pages/payroll-hours-calculator";
import VisitHoursDifference from "@/pages/visit-hours-difference";
import PaySync from "@/pages/paysync";
import DcwTraining from "@/pages/dcw-training";
import StaffTraining from "@/pages/staff-training";
import AuditAssessment from "@/pages/audit-assessment";
import MyProfile from "@/pages/my-profile";
import MyCompliance from "@/pages/my-compliance";
import MyDocuments from "@/pages/my-documents";
import MyCommunication from "@/pages/my-communication";
import MySupportTickets from "@/pages/my-support-tickets";
import CaregiverLogin from "@/pages/caregiver-login";
import SurveyReadiness from "@/pages/survey-readiness";
import SurveyReadinessPrint from "@/pages/survey-readiness-print";
import OfficeCredentials from "@/pages/office-credentials";
import ComplianceProgram from "@/pages/compliance-program";
import SupervisoryVisits from "@/pages/supervisory-visits";
import PolicyManagement from "@/pages/policy-management";
import Qapi from "@/pages/qapi";
import InfectionControl from "@/pages/infection-control";
import ClientSatisfactionSurveys from "@/pages/client-satisfaction-surveys";
import QualityManagement from "@/pages/quality-management";
import PatientComplaints from "@/pages/patient-complaints";
import QualityManagementLogs from "@/pages/quality-management-logs";
import OadriCycle from "@/pages/oadri-cycle";
import Onboarding from "@/pages/onboarding";
import OnboardingTemplates from "@/pages/onboarding-templates";
import Offboarding from "@/pages/offboarding";
import OffboardingTemplates from "@/pages/offboarding-templates";
import MyOffboarding from "@/pages/my-offboarding";
import MyOnboarding from "@/pages/my-onboarding";
import MyPaystubs from "@/pages/my-paystubs";
import MyPto from "@/pages/my-pto";
import MyTaxForms from "@/pages/my-tax-forms";

import { Redirect } from "wouter";

function CaregiverHome() {
  return <Redirect to="/my-profile" />;
}

function HomeRoute() {
  const { isLoading, user } = useAuth();
  
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
  
  if ((user as any)?.role === "caregiver") {
    return <Redirect to="/my-profile" />;
  }
  
  return <Dashboard />;
}

function Router() {
  const { isAuthenticated, isLoading, error, user } = useAuth();

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

  const isCaregiver = (user as any)?.role === "caregiver";

  return (
    <Switch>
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-use" component={TermsOfUse} />
      <Route path="/system-status" component={SystemStatus} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/signup" component={Signup} />
      <Route path="/signup/success" component={SignupSuccess} />
      <Route path="/caregiver-login" component={CaregiverLogin} />
      <Route path="/support-center" component={SupportCenter} />
      <Route path="/support" component={SupportCenter} />
      <Route path="/api-docs" component={ApiDocumentation} />
      <Route path="/esign/:token" component={ESign} />
      <Route path="/kiosk" component={Kiosk} />
      <Route path="/overlap-checker" component={OverlapChecker} />
      <Route path="/payroll-hours-calculator" component={PayrollHoursCalculator} />
      <Route path="/visit-hours-difference" component={VisitHoursDifference} />
      <Route path="/paysync" component={PaySync} />
      <Route path="/dcw-training" component={DcwTraining} />
      <Route path="/staff-training" component={StaffTraining} />
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={HomeRoute} />
          <Route path="/family-portal" component={FamilyPortal} />
          <Route path="/clients" component={Clients} />
          <Route path="/clients/:id" component={ClientProfile} />
          <Route path="/client-intake" component={ClientIntake} />
          <Route path="/caregivers" component={Caregivers} />
          <Route path="/caregivers/:id" component={CaregiverProfile} />
          <Route path="/offices" component={Offices} />
          <Route path="/offices/:id" component={OfficeProfile} />
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
          <Route path="/billing-payroll" component={BillingPayroll} />
          <Route path="/ai-assistant" component={AIAssistant} />
          <Route path="/birthday-notifications" component={BirthdayNotifications} />
          <Route path="/evv-clock" component={EvvClock} />
          <Route path="/hhax-integration" component={HhaxIntegration} />
          <Route path="/exclusion-verification" component={ExclusionVerification} />
          <Route path="/support-tickets" component={SupportTickets} />
          <Route path="/custom-integrations" component={CustomIntegrations} />
          <Route path="/letter-templates" component={LetterTemplates} />
          <Route path="/coordinator-pay-records" component={CoordinatorPayRecords} />
          <Route path="/coordinators" component={Coordinators} />
          <Route path="/coordinators/:id" component={CoordinatorProfile} />
          <Route path="/coordinator-compensation" component={CoordinatorCompensation} />
          <Route path="/email-templates" component={EmailTemplates} />
          <Route path="/expiration-alerts" component={ExpirationAlerts} />
          <Route path="/payroll" component={PayrollHub} />
          <Route path="/pto-balances" component={PtoBalances} />
          <Route path="/benefits/plans" component={BenefitsPlans} />
          <Route path="/benefits/windows" component={BenefitsWindows} />
          <Route path="/benefits/enrollments" component={BenefitsEnrollments} />
          <Route path="/my-benefits" component={MyBenefits} />
          <Route path="/api-keys" component={ApiKeys} />
          <Route path="/shift-swap-requests" component={ShiftSwapRequests} />
          <Route path="/staff-time-tracking" component={StaffTimeTracking} />
          <Route path="/write-ups" component={WriteUps} />
          <Route path="/staff" component={Staff} />
          <Route path="/employees" component={Employees} />
          <Route path="/staff/:id" component={StaffProfile} />
          <Route path="/performance-reviews" component={PerformanceReviews} />
          <Route path="/org-chart" component={OrgChart} />
          <Route path="/kiosk-setup" component={KioskSetup} />
          <Route path="/care-quality-scorecard" component={CareQualityScorecard} />
          <Route path="/financial-reports" component={FinancialReports} />
          <Route path="/esignature-templates" component={ESignatureTemplates} />
          <Route path="/visit-log-upload" component={VisitLogUpload} />
          <Route path="/reports/schedule-overlaps" component={ScheduleOverlapReport} />
          <Route path="/my-profile" component={MyProfile} />
          <Route path="/my-compliance" component={MyCompliance} />
          <Route path="/my-documents" component={MyDocuments} />
          <Route path="/my-communication" component={MyCommunication} />
          <Route path="/my-support-tickets" component={MySupportTickets} />
          <Route path="/my-paystubs" component={MyPaystubs} />
          <Route path="/my-pto" component={MyPto} />
          <Route path="/my-tax-forms" component={MyTaxForms} />
          <Route path="/error-log" component={ErrorLog} />
          <Route path="/help-center-admin" component={HelpCenterAdmin} />
          <Route path="/search" component={SearchPage} />
          <Route path="/audit-assessment" component={AuditAssessment} />
          <Route path="/survey-readiness" component={SurveyReadiness} />
          <Route path="/survey-readiness/print" component={SurveyReadinessPrint} />
          <Route path="/office-credentials" component={OfficeCredentials} />
          <Route path="/supervisory-visits" component={SupervisoryVisits} />
          <Route path="/policy-management" component={PolicyManagement} />
          <Route path="/qapi" component={Qapi} />
          <Route path="/quality-management" component={QualityManagement} />
          <Route path="/patient-complaints" component={PatientComplaints} />
          <Route path="/compliance-program" component={ComplianceProgram} />
          <Route path="/quality-management-logs" component={QualityManagementLogs} />
          <Route path="/oadri-cycle" component={OadriCycle} />
          <Route path="/infection-control" component={InfectionControl} />
          <Route path="/client-satisfaction-surveys" component={ClientSatisfactionSurveys} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/onboarding/templates" component={OnboardingTemplates} />
          <Route path="/my-onboarding" component={MyOnboarding} />
          <Route path="/offboarding" component={Offboarding} />
          <Route path="/offboarding/templates" component={OffboardingTemplates} />
          <Route path="/my-offboarding" component={MyOffboarding} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <OfficeProvider>
            <TooltipProvider>
              <Toaster />
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </TooltipProvider>
          </OfficeProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
