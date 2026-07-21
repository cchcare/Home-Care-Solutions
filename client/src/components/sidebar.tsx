import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/use-features";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Heart,
  LayoutDashboard,
  Users,
  Users2,
  UserCheck,
  Building2,
  Shield,
  MessageSquare,
  ClipboardList,
  FileText,
  GraduationCap,
  AlertTriangle,
  BarChart3,
  Settings,
  Menu,
  X,
  Cog,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserCog,
  Key,
  DollarSign,
  Bot,
  Cake,
  Clock,
  Plug,
  UserX,
  HelpCircle,
  Ticket,
  Link2,
  FileSignature,
  Mail,
  FileUp,
  ArrowLeftRight,
  PenTool,
  Bell,
  TrendingUp,
  FileBarChart,
  UserPlus,
  Monitor,
  MonitorCheck,
  ScrollText,
  BookOpen,
  Layers,
  Calculator,
  GitCompareArrows,
  Zap,
  Stethoscope,
  Briefcase,
  Wrench,
  LifeBuoy,
  ClipboardCheck,
  ShieldAlert,
  Clipboard,
  Star,
  Biohazard,
  Activity,
  ListChecks,
  Receipt,
  CalendarClock,
  UserCircle,
  HeartPulse,
  CalendarRange,
  BadgeCheck,
  ShieldQuestion,
} from "lucide-react";

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavItem[];
  external?: boolean;
  featureGate?: string;
}

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { hasFeature } = useFeatures();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Admin"]);
  const [expandedSubMenus, setExpandedSubMenus] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const [collapsedRaw, , toggleCollapsed] = useSidebarCollapsed();
  const collapsed = !isMobile && collapsedRaw;

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    );
  };

  const toggleSubMenu = (menuName: string) => {
    setExpandedSubMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    );
  };

  const getNavigation = (): NavItem[] => {
    if ((user as any)?.role === "family") {
      return [
        { name: "Family Portal", href: "/family-portal", icon: Heart },
      ];
    }

    // Self-service "My Account" group — available to caregivers AND office
    // staff (Task #139). Caregivers see this as their entire sidebar; office
    // staff see it as an additional group within the main navigation.
    const myAccountChildren: NavItem[] = [
      { name: "My Profile", href: "/my-profile", icon: UserCircle },
      { name: "My Paystubs", href: "/my-paystubs", icon: Receipt },
      { name: "My PTO", href: "/my-pto", icon: CalendarClock },
      { name: "My Tax Forms", href: "/my-tax-forms", icon: FileSignature },
      { name: "My Onboarding", href: "/my-onboarding", icon: ClipboardList },
      { name: "My Offboarding", href: "/my-offboarding", icon: ClipboardList },
      { name: "My Compliance", href: "/my-compliance", icon: Shield },
      { name: "Forms & Documents", href: "/my-documents", icon: FileText },
      { name: "My Benefits", href: "/my-benefits", icon: HeartPulse },
      { name: "Communication", href: "/my-communication", icon: MessageSquare },
      { name: "Support Tickets", href: "/my-support-tickets", icon: Ticket },
      { name: "Help & Support", href: "/support-center", icon: HelpCircle, external: true },
    ];

    if ((user as any)?.role === "caregiver") {
      return [
        { name: "My Account", icon: UserCircle, children: myAccountChildren },
      ];
    }

    const adminChildren: NavItem[] = [
      { name: "User Management", href: "/user-management", icon: UserCog },
      { name: "Super Admin", href: "/super-admin", icon: ShieldCheck },
      { name: "Role & Access Control", href: "/role-wizard", icon: Key },
      { name: "Office Management", href: "/offices", icon: Building2 },
      { name: "DOH Audit Assessment", href: "/audit-assessment", icon: ClipboardCheck },
      { name: "MCO Setup", href: "/admin-settings", icon: Settings },
      { name: "Letter Templates", href: "/letter-templates", icon: FileSignature },
      { name: "E-Signature Templates", href: "/esignature-templates", icon: PenTool },
      { name: "Onboarding Progress", href: "/onboarding", icon: ClipboardList },
      { name: "Onboarding Templates", href: "/onboarding/templates", icon: ListChecks },
      { name: "Offboarding Progress", href: "/offboarding", icon: ClipboardList },
      { name: "Offboarding Templates", href: "/offboarding/templates", icon: ListChecks },
      { name: "Birthday Notifications", href: "/birthday-notifications", icon: Cake },
      { name: "Expiration Alerts", href: "/expiration-alerts", icon: Bell },
      { name: "Client Intake", href: "/client-intake", icon: UserPlus },
      { name: "HHAX Integration", href: "/hhax-integration", icon: Plug },
      { name: "Visit Log Upload", href: "/visit-log-upload", icon: FileUp },
      { name: "Exclusion Verification", href: "/exclusion-verification", icon: UserX },
    ];

    if ((user as any)?.role === "super_admin") {
      adminChildren.push({ name: "Email Templates", href: "/email-templates", icon: Mail });
      adminChildren.push({ name: "Help Center Content", href: "/help-center-admin", icon: BookOpen });
      adminChildren.push({ name: "Error Log", href: "/error-log", icon: ScrollText });
    }

    if (hasFeature("api_access")) {
      adminChildren.push({ name: "API Keys", href: "/api-keys", icon: Key, featureGate: "api_access" });
    }

    if (hasFeature("custom_integrations")) {
      adminChildren.push({ name: "Custom Integrations", href: "/custom-integrations", icon: Link2, featureGate: "custom_integrations" });
    }

    const baseNavigation: NavItem[] = [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      {
        name: "People",
        icon: Users2,
        children: [
          { name: "Client Management", href: "/clients", icon: Users },
          {
            name: "Caregiver",
            icon: UserCheck,
            children: [
              { name: "Caregiver Management", href: "/caregivers", icon: UserCheck },
              { name: "EVV Clock In/Out", href: "/evv-clock", icon: Clock },
              { name: "Shift Swap Requests", href: "/shift-swap-requests", icon: ArrowLeftRight },
            ]
          },
          {
            name: "Staff",
            icon: UserCog,
            children: [
              { name: "Staff Directory", href: "/staff", icon: Users },
              { name: "Staff Time Tracking", href: "/staff-time-tracking", icon: Clock },
              { name: "Kiosk Terminal", href: "/kiosk", icon: MonitorCheck },
              { name: "Kiosk Setup", href: "/kiosk-setup", icon: Monitor },
            ]
          },
          { name: "Coordinators", href: "/coordinators", icon: UserCog },
        ]
      },
      ...(((user as any)?.role === "admin" ||
        (user as any)?.role === "super_admin" ||
        (user as any)?.role === "office_admin" ||
        (user as any)?.role === "manager")
        ? [{
            name: "HR",
            icon: Users2,
            children: [
              { name: "Employees", href: "/employees", icon: Users },
              { name: "Org Chart", href: "/org-chart", icon: Users2 },
              { name: "Performance Reviews", href: "/performance-reviews", icon: Star },
              { name: "Write-Ups & Coaching", href: "/write-ups", icon: ScrollText },
            ],
          } as NavItem]
        : []),
      {
        name: "Clinical",
        icon: Stethoscope,
        children: [
          { name: "Compliance", href: "/compliance", icon: Shield },
          { name: "Incident Reports", href: "/incidents", icon: AlertTriangle },
          { name: "Training & Resources", href: "/training", icon: GraduationCap },
          {
            name: "DOH Compliance",
            icon: ShieldCheck,
            children: [
              { name: "Survey Readiness Hub", href: "/survey-readiness", icon: ShieldAlert },
              { name: "Agency Credentials", href: "/office-credentials", icon: BadgeCheck },
              { name: "DOH Audit Assessment", href: "/audit-assessment", icon: ClipboardCheck },
              { name: "Supervisory Visits", href: "/supervisory-visits", icon: Clipboard },
              { name: "Policy Management", href: "/policy-management", icon: FileText },
              { name: "QAPI", href: "/qapi", icon: BarChart3 },
              { name: "Quality Management", href: "/quality-management", icon: ShieldCheck },
              { name: "Patient Complaints", href: "/patient-complaints", icon: AlertTriangle },
              { name: "Compliance Program", href: "/compliance-program", icon: ShieldQuestion },
              { name: "QM Logs", href: "/quality-management-logs", icon: ClipboardList },
              { name: "OADRI Cycle", href: "/oadri-cycle", icon: Activity },
              { name: "Infection Control", href: "/infection-control", icon: Biohazard },
              { name: "Client Surveys", href: "/client-satisfaction-surveys", icon: Star },
            ]
          },
        ]
      },
      {
        name: "Operations",
        icon: Briefcase,
        children: [
          { name: "Tasks & Workflows", href: "/tasks", icon: ClipboardList },
          { name: "Forms & Documents", href: "/documents", icon: FileText },
          { name: "Communication", href: "/communication", icon: MessageSquare },
        ]
      },
      {
        name: "Payroll",
        icon: DollarSign,
        children: [
          { name: "Payroll Hub", href: "/payroll", icon: DollarSign },
          { name: "Billing & Payroll", href: "/billing-payroll", icon: DollarSign },
          { name: "Coordinator Compensation", href: "/coordinator-compensation", icon: Calculator },
          { name: "Coordinator Pay", href: "/coordinator-pay-records", icon: DollarSign },
          { name: "Financial Reports", href: "/financial-reports", icon: FileBarChart },
          { name: "Hours Calculator", href: "/payroll-hours-calculator", icon: Calculator },
          { name: "Visit Hours Difference", href: "/visit-hours-difference", icon: GitCompareArrows },
          { name: "PTO Balances", href: "/pto-balances", icon: Calculator },
          { name: "Benefit Plans", href: "/benefits/plans", icon: HeartPulse },
          { name: "Enrollment Windows", href: "/benefits/windows", icon: CalendarRange },
          { name: "Benefits Enrollments", href: "/benefits/enrollments", icon: ClipboardList },
        ]
      },
      {
        name: "Analytics",
        icon: BarChart3,
        children: [
          { name: "Analytics & Reports", href: "/reports", icon: BarChart3 },
          { name: "Care Quality Scorecard", href: "/care-quality-scorecard", icon: TrendingUp },
          { name: "Schedule Overlap Report", href: "/reports/schedule-overlaps", icon: Layers },
        ]
      },
      {
        name: "Tools",
        icon: Wrench,
        children: [
          { name: "Overlap Checker", href: "/overlap-checker", icon: Layers },
          { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
          { name: "PaySync", href: "/paysync", icon: Zap },
        ]
      },
      {
        name: "Support",
        icon: LifeBuoy,
        children: [
          { name: "Support Tickets", href: "/support-tickets", icon: Ticket },
          { name: "Help & Support", href: "/support-center", icon: HelpCircle, external: true },
        ]
      },
    ];

    if (
      (user as any)?.role === "admin" ||
      (user as any)?.role === "supervisor" ||
      (user as any)?.role === "super_admin" ||
      (user as any)?.role === "office_admin"
    ) {
      baseNavigation.push({ name: "Admin", icon: Cog, children: adminChildren });
    }

    // Every authenticated non-family user gets the consolidated "My Account"
    // self-service group (Task #139).
    baseNavigation.push({ name: "My Account", icon: UserCircle, children: myAccountChildren });

    return baseNavigation;
  };

  const navigation = getNavigation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/";
    }
  };

  const isActiveRoute = (href?: string) => {
    if (!href) return false;
    return location === href;
  };

  const hasActiveDescendant = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some(
      child => isActiveRoute(child.href) || hasActiveDescendant(child)
    );
  };

  const renderLeaf = (child: NavItem, depth: number) => {
    const ChildIcon = child.icon;
    const isActive = isActiveRoute(child.href);
    const pl = depth === 1 ? "pl-4" : "pl-8";

    if (child.external) {
      return (
        <a
          key={child.name}
          href={child.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center space-x-3 p-2.5 ${pl} rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`}
          onClick={() => isMobile && setIsOpen(false)}
          data-testid={`nav-link-${child.name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <ChildIcon className="w-4 h-4" />
          <span>{child.name}</span>
        </a>
      );
    }

    return (
      <Link
        key={child.name}
        href={child.href || "#"}
        className={`flex items-center space-x-3 p-2.5 ${pl} rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
        onClick={() => isMobile && setIsOpen(false)}
        data-testid={`nav-link-${child.name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <ChildIcon className="w-4 h-4" />
        <span>{child.name}</span>
      </Link>
    );
  };

  const renderChild = (child: NavItem, depth = 1) => {
    if (!child.children) return renderLeaf(child, depth);

    const ChildIcon = child.icon;
    const isExpanded = expandedSubMenus.includes(child.name);
    const hasActive = hasActiveDescendant(child);
    const pl = depth === 1 ? "pl-2" : "pl-6";

    return (
      <div key={child.name}>
        <button
          onClick={() => toggleSubMenu(child.name)}
          className={`w-full flex items-center justify-between p-2.5 ${pl} rounded-lg text-sm font-medium transition-colors ${
            hasActive
              ? "text-sidebar-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
          data-testid={`nav-submenu-${child.name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="flex items-center space-x-3">
            <ChildIcon className="w-4 h-4" />
            <span>{child.name}</span>
          </div>
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-1">
            {child.children.map(grandchild => renderChild(grandchild, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderCollapsedItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = isActiveRoute(item.href);
    const hasActive = item.children ? hasActiveDescendant(item) : false;

    if (item.children) {
      return (
        <Popover key={item.name}>
          <Tooltip delayDuration={150}>
            <PopoverTrigger asChild>
              <TooltipTrigger asChild>
                <button
                  className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
                    hasActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  data-testid={`nav-menu-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  aria-label={item.name}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
            </PopoverTrigger>
            <TooltipContent side="right">{item.name}</TooltipContent>
          </Tooltip>
          <PopoverContent
            side="right"
            align="start"
            className="w-64 p-2"
            sideOffset={8}
          >
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {item.name}
            </div>
            <div className="space-y-1">
              {item.children.map(child => renderChild(child, 1))}
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    const trigger = item.external ? (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center p-3 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
        aria-label={item.name}
      >
        <Icon className="w-5 h-5" />
      </a>
    ) : (
      <Link
        href={item.href || "#"}
        className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
        data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
        aria-label={item.name}
      >
        <Icon className="w-5 h-5" />
      </Link>
    );

    return (
      <Tooltip key={item.name} delayDuration={150}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <>
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-50 lg:hidden print:hidden"
          onClick={() => setIsOpen(true)}
          data-testid="button-open-sidebar"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 lg:hidden print:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          bg-sidebar border-r border-sidebar-border flex-shrink-0 sidebar-transition print:hidden
          transition-[width] duration-200 ease-in-out
          ${collapsed ? "w-16" : "w-64"}
          ${isMobile ? "fixed inset-y-0 left-0 z-50" : ""}
          ${isMobile && !isOpen ? "sidebar-closed" : ""}
        `}
        data-testid="sidebar"
        data-collapsed={collapsed ? "true" : "false"}
      >
        <div className="flex flex-col h-full">
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} ${collapsed ? "p-3" : "p-6"} border-b border-sidebar-border`}>
            {collapsed ? (
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center" aria-label="Home Care">
                <Heart className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-sidebar-primary-foreground" />
                  </div>
                  <h1 className="text-xl font-bold text-sidebar-foreground">Home Care</h1>
                </div>
                {(user as any)?.role === "super_admin" && (
                  <div className="ml-11 mt-1">
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      Super Admin
                    </span>
                  </div>
                )}
              </div>
            )}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-sidebar"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {!isMobile && (
            <div className={`flex ${collapsed ? "justify-center" : "justify-end"} px-2 py-1 border-b border-sidebar-border`}>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCollapsed}
                    className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-7 px-2"
                    data-testid="button-toggle-sidebar-collapse"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-expanded={!collapsed}
                  >
                    {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {collapsed ? "Expand sidebar" : "Collapse sidebar"}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          <nav className={`flex-1 ${collapsed ? "p-2" : "p-4"} space-y-1 overflow-y-auto`}>
            {navigation.map((item) => {
              if (collapsed) {
                return renderCollapsedItem(item);
              }

              const Icon = item.icon;

              if (item.children) {
                const isExpanded = expandedMenus.includes(item.name);
                const hasActive = hasActiveDescendant(item);

                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg font-medium transition-colors ${
                        hasActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                      data-testid={`nav-menu-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map(child => renderChild(child, 1))}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = isActiveRoute(item.href);

              if (item.external) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={() => isMobile && setIsOpen(false)}
                    data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href || "#"}
                  className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  onClick={() => isMobile && setIsOpen(false)}
                  data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {!collapsed && (
            <div className="px-4 py-2 border-t border-sidebar-border">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-sidebar-foreground/60">
                <Link href="/privacy-policy" className="hover:text-sidebar-foreground" data-testid="link-privacy-policy">
                  Privacy
                </Link>
                <Link href="/terms-of-use" className="hover:text-sidebar-foreground" data-testid="link-terms-of-use">
                  Terms
                </Link>
                <Link href="/system-status" className="hover:text-sidebar-foreground" data-testid="link-system-status">
                  Status
                </Link>
              </div>
            </div>
          )}

          <div className={`${collapsed ? "p-2" : "p-4"} border-t border-sidebar-border`}>
            {collapsed ? (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center p-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                    data-testid="button-logout"
                    aria-label={
                      user?.firstName || user?.lastName
                        ? `Sign out (${[user?.firstName, user?.lastName].filter(Boolean).join(" ")})`
                        : "Sign out"
                    }
                  >
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                      <span className="text-accent-foreground text-sm font-medium">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                    <span className="text-xs opacity-80">{user?.role || "Staff"} · Sign out</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-sidebar-accent">
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-accent-foreground text-sm font-medium">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-sidebar-foreground/70">
                    {user?.role || "Staff"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-sidebar-foreground hover:text-sidebar-foreground"
                  data-testid="button-logout"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
