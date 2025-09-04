import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
  TestTube,
  BarChart3,
  Settings,
  Menu,
  X
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Client Management", href: "/clients", icon: Users },
    { name: "Caregiver Management", href: "/caregivers", icon: UserCheck },
    { name: "Office Management", href: "/offices", icon: Building2 },
    { name: "Sample Management", href: "/samples", icon: TestTube },
    { name: "Training & Resources", href: "/training", icon: GraduationCap },
    { name: "Compliance", href: "/compliance", icon: Shield },
    { name: "Communication", href: "/communication", icon: MessageSquare },
    { name: "Tasks & Workflows", href: "/tasks", icon: ClipboardList },
    { name: "Forms & Documents", href: "/documents", icon: FileText },
    { name: "Analytics & Reports", href: "/reports", icon: BarChart3 },
  ];

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <>
      {/* Mobile menu button */}
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

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          bg-sidebar border-r border-sidebar-border w-64 flex-shrink-0 sidebar-transition
          ${isMobile ? 'fixed inset-y-0 left-0 z-50' : ''}
          ${isMobile && !isOpen ? 'sidebar-closed' : ''}
        `}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-sidebar-foreground">CareConnect</h1>
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

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.name} href={item.href}>
                  <a
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
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
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
