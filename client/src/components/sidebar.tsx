import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/use-features";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Heart,
  LayoutDashboard,
  Users,
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
  FileSignature
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
  const isMobile = useIsMobile();

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
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

    const baseNavigation: NavItem[] = [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Client Management", href: "/clients", icon: Users },
      { 
        name: "Caregiver",
        icon: UserCheck,
        children: [
          { name: "Caregiver Management", href: "/caregivers", icon: UserCheck },
          { name: "EVV Clock In/Out", href: "/evv-clock", icon: Clock },
        ]
      },
      { name: "Training & Resources", href: "/training", icon: GraduationCap },
      { name: "Incident Reports", href: "/incidents", icon: AlertTriangle },
      { name: "Compliance", href: "/compliance", icon: Shield },
      { name: "Communication", href: "/communication", icon: MessageSquare },
      { name: "Tasks & Workflows", href: "/tasks", icon: ClipboardList },
      { name: "Forms & Documents", href: "/documents", icon: FileText },
      { name: "Analytics & Reports", href: "/reports", icon: BarChart3 },
      { name: "Billing & Payroll", href: "/billing-payroll", icon: DollarSign },
      { name: "Coordinator Pay", href: "/coordinator-pay-records", icon: DollarSign },
      { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
      { name: "Support Tickets", href: "/support-tickets", icon: Ticket },
    ];

    if (hasFeature("api_access")) {
      baseNavigation.push({ name: "API Keys", href: "/api-keys", icon: Key, featureGate: "api_access" });
    }

    if (hasFeature("custom_integrations")) {
      baseNavigation.push({ name: "Custom Integrations", href: "/custom-integrations", icon: Link2, featureGate: "custom_integrations" });
    }

    baseNavigation.push({ name: "Help & Support", href: "/support-center", icon: HelpCircle, external: true });

    if ((user as any)?.role === "admin" || (user as any)?.role === "supervisor" || (user as any)?.role === "super_admin" || (user as any)?.role === "office_admin") {
      baseNavigation.push({
        name: "Admin",
        icon: Cog,
        children: [
          { name: "User Management", href: "/user-management", icon: UserCog },
          { name: "Super Admin", href: "/super-admin", icon: ShieldCheck },
          { name: "Role & Access Control", href: "/role-wizard", icon: Key },
          { name: "Office Management", href: "/offices", icon: Building2 },
          { name: "MCO Setup", href: "/admin-settings", icon: Settings },
          { name: "Letter Templates", href: "/letter-templates", icon: FileSignature },
          { name: "Birthday Notifications", href: "/birthday-notifications", icon: Cake },
          { name: "HHAX Integration", href: "/hhax-integration", icon: Plug },
          { name: "Exclusion Verification", href: "/exclusion-verification", icon: UserX },
        ]
      });
    }

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

  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some(child => isActiveRoute(child.href));
  };

  return (
    <>
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-50 lg:hidden"
          onClick={() => setIsOpen(true)}
          data-testid="button-open-sidebar"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`
          bg-sidebar border-r border-sidebar-border w-64 flex-shrink-0 sidebar-transition
          ${isMobile ? 'fixed inset-y-0 left-0 z-50' : ''}
          ${isMobile && !isOpen ? 'sidebar-closed' : ''}
        `}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
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

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              
              if (item.children) {
                const isExpanded = expandedMenus.includes(item.name);
                const hasActive = hasActiveChild(item);
                
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-lg font-medium transition-colors
                        ${hasActive 
                          ? 'bg-sidebar-accent text-sidebar-primary' 
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }
                      `}
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
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isActive = isActiveRoute(child.href);
                          
                          return (
                            <Link 
                              key={child.name} 
                              href={child.href || "#"}
                              className={`
                                flex items-center space-x-3 p-2.5 pl-4 rounded-lg text-sm font-medium transition-colors
                                ${isActive 
                                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                }
                              `}
                              onClick={() => isMobile && setIsOpen(false)}
                              data-testid={`nav-link-${child.name.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <ChildIcon className="w-4 h-4" />
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
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
                    className={`
                      flex items-center space-x-3 p-3 rounded-lg font-medium transition-colors
                      text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                    `}
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
                  className={`
                    flex items-center space-x-3 p-3 rounded-lg font-medium transition-colors
                    ${isActive 
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }
                  `}
                  onClick={() => isMobile && setIsOpen(false)}
                  data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

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

          <div className="p-4 border-t border-sidebar-border">
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
          </div>
        </div>
      </aside>
    </>
  );
}
