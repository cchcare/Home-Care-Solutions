import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  Users,
  Building2,
  UserCog,
  FileText,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OfficeSelector } from "@/components/office-selector";
import { searchSiteCatalog, type SiteEntry } from "@/lib/site-catalog";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showOfficeSelector?: boolean;
  selectedOfficeId?: string;
  onOfficeChange?: (officeId: string) => void;
}

type SearchClient = { id: string; firstName: string; lastName: string; memberId: string | null; phone: string | null };
type SearchCaregiver = { id: string; firstName: string; lastName: string; hhaxCaregiverCode: string | null; phone: string | null; email: string | null };
type SearchOffice = { id: string; name: string };
type SearchCoordinator = { id: string; firstName: string | null; lastName: string | null; email: string | null };

type SearchResponse = {
  q: string;
  clients: SearchClient[];
  caregivers: SearchCaregiver[];
  offices: SearchOffice[];
  coordinators: SearchCoordinator[];
};

export function TopBar({
  title,
  subtitle,
  showOfficeSelector = false,
  selectedOfficeId,
  onOfficeChange,
}: TopBarProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debounce input -> debouncedQuery (200ms)
  useEffect(() => {
    const trimmed = searchInput.trim();
    const handle = setTimeout(() => setDebouncedQuery(trimmed), 200);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const enabled = debouncedQuery.length >= 1;

  const { data: serverResults, isFetching } = useQuery<SearchResponse>({
    queryKey: ["/api/search", debouncedQuery, 5],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled,
    staleTime: 30_000,
  });

  const pageResults: SiteEntry[] = useMemo(
    () => (enabled ? searchSiteCatalog(debouncedQuery, 5) : []),
    [debouncedQuery, enabled],
  );
  const reportPages = pageResults.filter((p) => p.category === "report");
  const navPages = pageResults.filter((p) => p.category === "page");

  const clientCount = serverResults?.clients?.length ?? 0;
  const caregiverCount = serverResults?.caregivers?.length ?? 0;
  const officeCount = serverResults?.offices?.length ?? 0;
  const coordinatorCount = serverResults?.coordinators?.length ?? 0;
  const totalCount =
    clientCount + caregiverCount + officeCount + coordinatorCount + pageResults.length;

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  const goToResultsPage = () => {
    const q = searchInput.trim();
    if (!q) return;
    setIsOpen(false);
    setLocation(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    setSearchInput("");
    setDebouncedQuery("");
    setLocation(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/";
    }
  };

  const navigateToAccountSettings = () => {
    setLocation("/account-settings");
  };

  const userInitials = (user as any)?.firstName && (user as any)?.lastName
    ? `${(user as any).firstName[0]}${(user as any).lastName[0]}`
    : (user as any)?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center space-x-4">
        {(title || subtitle) && (
          <div className="hidden sm:block">
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        {showOfficeSelector && (
          <OfficeSelector
            selectedOfficeId={selectedOfficeId}
            onOfficeChange={onOfficeChange!}
            showAllOption={true}
          />
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Global search */}
        <div ref={containerRef} className="hidden md:block relative w-80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goToResultsPage();
            }}
            className="flex items-center bg-muted rounded-lg px-3 py-2"
          >
            <Search className="w-4 h-4 text-muted-foreground mr-2" />
            <input
              type="text"
              placeholder="Search clients, caregivers, pages..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsOpen(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="bg-transparent border-0 focus:outline-none text-sm text-foreground placeholder-muted-foreground flex-1"
              data-testid="input-global-search"
            />
            <button
              type="submit"
              aria-label="Run search"
              className="ml-2 text-muted-foreground hover:text-foreground"
              data-testid="button-global-search-submit"
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </form>

          {isOpen && enabled && (
            <div
              className="absolute right-0 mt-2 w-[28rem] max-h-[70vh] overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50"
              data-testid="popover-global-search-results"
            >
              {isFetching && totalCount === 0 ? (
                <div className="p-4 text-sm text-muted-foreground" data-testid="text-search-loading">
                  Searching…
                </div>
              ) : totalCount === 0 ? (
                <div className="p-4 text-sm text-muted-foreground" data-testid="text-search-empty">
                  No results for "{debouncedQuery}". Press Enter to open the full search page.
                </div>
              ) : (
                <div className="py-2">
                  {clientCount > 0 && (
                    <SearchGroup label="Clients" icon={<User className="w-4 h-4" />}>
                      {serverResults!.clients.map((c) => (
                        <SearchRow
                          key={`client-${c.id}`}
                          testId={`search-result-client-${c.id}`}
                          title={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Client"}
                          subtitle={[c.memberId, c.phone].filter(Boolean).join(" • ") || undefined}
                          onClick={() => handleNavigate(`/clients/${c.id}`)}
                        />
                      ))}
                    </SearchGroup>
                  )}
                  {caregiverCount > 0 && (
                    <SearchGroup label="Caregivers" icon={<Users className="w-4 h-4" />}>
                      {serverResults!.caregivers.map((c) => (
                        <SearchRow
                          key={`caregiver-${c.id}`}
                          testId={`search-result-caregiver-${c.id}`}
                          title={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Caregiver"}
                          subtitle={[c.hhaxCaregiverCode, c.phone || c.email].filter(Boolean).join(" • ") || undefined}
                          onClick={() => handleNavigate(`/caregivers/${c.id}`)}
                        />
                      ))}
                    </SearchGroup>
                  )}
                  {officeCount > 0 && (
                    <SearchGroup label="Offices" icon={<Building2 className="w-4 h-4" />}>
                      {serverResults!.offices.map((o) => (
                        <SearchRow
                          key={`office-${o.id}`}
                          testId={`search-result-office-${o.id}`}
                          title={o.name}
                          onClick={() => handleNavigate(`/offices/${o.id}`)}
                        />
                      ))}
                    </SearchGroup>
                  )}
                  {coordinatorCount > 0 && (
                    <SearchGroup label="Coordinators" icon={<UserCog className="w-4 h-4" />}>
                      {serverResults!.coordinators.map((c) => (
                        <SearchRow
                          key={`coordinator-${c.id}`}
                          testId={`search-result-coordinator-${c.id}`}
                          title={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Coordinator"}
                          subtitle={c.email ?? undefined}
                          onClick={() => handleNavigate(`/user-management?coordinatorId=${c.id}`)}
                        />
                      ))}
                    </SearchGroup>
                  )}
                  {navPages.length > 0 && (
                    <SearchGroup label="Pages" icon={<FileText className="w-4 h-4" />}>
                      {navPages.map((p) => (
                        <SearchRow
                          key={`page-${p.path}`}
                          testId={`search-result-page-${p.path}`}
                          title={p.title}
                          subtitle={p.description}
                          onClick={() => handleNavigate(p.path)}
                        />
                      ))}
                    </SearchGroup>
                  )}
                  {reportPages.length > 0 && (
                    <SearchGroup label="Reports" icon={<BarChart3 className="w-4 h-4" />}>
                      {reportPages.map((p) => (
                        <SearchRow
                          key={`report-${p.path}`}
                          testId={`search-result-report-${p.path}`}
                          title={p.title}
                          subtitle={p.description}
                          onClick={() => handleNavigate(p.path)}
                        />
                      ))}
                    </SearchGroup>
                  )}
                  <button
                    type="button"
                    className="w-full text-left text-xs text-primary px-4 py-2 border-t border-border hover:bg-muted"
                    onClick={goToResultsPage}
                    data-testid="button-view-all-results"
                  >
                    View all results for "{debouncedQuery}" →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
          data-testid="button-notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
            0
          </span>
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted"
              data-testid="button-user-menu"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">
                  {userInitials}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">
                  {(user as any)?.firstName && (user as any)?.lastName
                    ? `${(user as any).firstName} ${(user as any).lastName}`
                    : (user as any)?.email
                  }
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {(user as any)?.role?.replace('_', ' ') || 'User'}
                </p>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={navigateToAccountSettings}>
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={navigateToAccountSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function SearchGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SearchRow({
  title,
  subtitle,
  onClick,
  testId,
}: {
  title: string;
  subtitle?: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="w-full text-left px-4 py-2 hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
    >
      <div className="text-sm font-medium text-foreground truncate">{title}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
      )}
    </button>
  );
}
