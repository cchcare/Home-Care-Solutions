import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search as SearchIcon,
  User,
  Users,
  Building2,
  UserCog,
  FileText,
  BarChart3,
  Loader2,
} from "lucide-react";
import { searchSiteCatalog, type SiteEntry } from "@/lib/site-catalog";

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

export default function SearchPage() {
  const [, setLocation] = useLocation();
  // Wouter's `useSearch` returns the current query string (without "?") and
  // re-renders on every navigation that changes it (push, replace, or pop).
  // This makes the URL the single source of truth for the search query.
  const search = useSearch();
  const urlQuery = useMemo(() => {
    const params = new URLSearchParams(search);
    return (params.get("q") ?? "").trim();
  }, [search]);

  const [inputValue, setInputValue] = useState(urlQuery);

  // Keep the input field in sync when the URL query changes (back/forward,
  // top-bar search while already on /search, etc.).
  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  const enabled = urlQuery.length >= 1;

  const { data, isFetching, isError } = useQuery<SearchResponse>({
    queryKey: ["/api/search", urlQuery, 50],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(urlQuery)}&limit=50`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled,
  });

  const pageMatches: SiteEntry[] = useMemo(
    () => (enabled ? searchSiteCatalog(urlQuery, 50) : []),
    [urlQuery, enabled],
  );
  const navMatches = pageMatches.filter((p) => p.category === "page");
  const reportMatches = pageMatches.filter((p) => p.category === "report");

  const clients = data?.clients ?? [];
  const caregivers = data?.caregivers ?? [];
  const offices = data?.offices ?? [];
  const coordinators = data?.coordinators ?? [];

  const totalCount =
    clients.length +
    caregivers.length +
    offices.length +
    coordinators.length +
    pageMatches.length;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    setLocation(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Search" subtitle={urlQuery ? `Results for "${urlQuery}"` : undefined} />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <Card>
              <CardContent className="py-4">
                <form onSubmit={onSubmit} className="flex items-center gap-2">
                  <div className="flex items-center bg-muted rounded-lg px-3 py-2 flex-1">
                    <SearchIcon className="w-4 h-4 text-muted-foreground mr-2" />
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Search clients, caregivers, offices, coordinators, pages, reports..."
                      className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto"
                      data-testid="input-search-page-query"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" data-testid="button-search-page-submit">
                    {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <SearchIcon className="w-4 h-4 mr-2" />}
                    Search
                  </Button>
                </form>
                {urlQuery && (
                  <p className="text-xs text-muted-foreground mt-2" data-testid="text-search-summary">
                    {isFetching
                      ? "Searching…"
                      : `${totalCount} result${totalCount === 1 ? "" : "s"} for "${urlQuery}"`}
                  </p>
                )}
              </CardContent>
            </Card>

            {!enabled && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <SearchIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Enter a search term above to find clients, caregivers, offices, coordinators, pages, and reports.</p>
                </CardContent>
              </Card>
            )}

            {enabled && isError && (
              <Card>
                <CardContent className="py-6 text-sm text-destructive">
                  Search failed. Please try again.
                </CardContent>
              </Card>
            )}

            {enabled && !isError && totalCount === 0 && !isFetching && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-results">
                  <SearchIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No results for "{urlQuery}".</p>
                </CardContent>
              </Card>
            )}

            {enabled && clients.length > 0 && (
              <ResultsSection
                title="Clients"
                icon={<User className="w-5 h-5" />}
                count={clients.length}
                viewAllHref={`/clients?search=${encodeURIComponent(urlQuery)}`}
              >
                {clients.map((c) => (
                  <ResultLink
                    key={`client-${c.id}`}
                    href={`/clients/${c.id}`}
                    title={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Client"}
                    subtitle={[c.memberId, c.phone].filter(Boolean).join(" • ") || undefined}
                    testId={`search-page-client-${c.id}`}
                  />
                ))}
              </ResultsSection>
            )}

            {enabled && caregivers.length > 0 && (
              <ResultsSection
                title="Caregivers"
                icon={<Users className="w-5 h-5" />}
                count={caregivers.length}
                viewAllHref={`/caregivers?search=${encodeURIComponent(urlQuery)}`}
              >
                {caregivers.map((c) => (
                  <ResultLink
                    key={`caregiver-${c.id}`}
                    href={`/caregivers/${c.id}`}
                    title={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Caregiver"}
                    subtitle={[c.hhaxCaregiverCode, c.phone || c.email].filter(Boolean).join(" • ") || undefined}
                    testId={`search-page-caregiver-${c.id}`}
                  />
                ))}
              </ResultsSection>
            )}

            {enabled && offices.length > 0 && (
              <ResultsSection
                title="Offices"
                icon={<Building2 className="w-5 h-5" />}
                count={offices.length}
              >
                {offices.map((o) => (
                  <ResultLink
                    key={`office-${o.id}`}
                    href={`/offices/${o.id}`}
                    title={o.name}
                    testId={`search-page-office-${o.id}`}
                  />
                ))}
              </ResultsSection>
            )}

            {enabled && coordinators.length > 0 && (
              <ResultsSection
                title="Coordinators"
                icon={<UserCog className="w-5 h-5" />}
                count={coordinators.length}
              >
                {coordinators.map((c) => (
                  <ResultLink
                    key={`coordinator-${c.id}`}
                    href={`/user-management?coordinatorId=${c.id}`}
                    title={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Coordinator"}
                    subtitle={c.email ?? undefined}
                    testId={`search-page-coordinator-${c.id}`}
                  />
                ))}
              </ResultsSection>
            )}

            {enabled && navMatches.length > 0 && (
              <ResultsSection
                title="Pages"
                icon={<FileText className="w-5 h-5" />}
                count={navMatches.length}
              >
                {navMatches.map((p) => (
                  <ResultLink
                    key={`page-${p.path}`}
                    href={p.path}
                    title={p.title}
                    subtitle={p.description}
                    testId={`search-page-page-${p.path}`}
                  />
                ))}
              </ResultsSection>
            )}

            {enabled && reportMatches.length > 0 && (
              <ResultsSection
                title="Reports"
                icon={<BarChart3 className="w-5 h-5" />}
                count={reportMatches.length}
              >
                {reportMatches.map((p) => (
                  <ResultLink
                    key={`report-${p.path}`}
                    href={p.path}
                    title={p.title}
                    subtitle={p.description}
                    testId={`search-page-report-${p.path}`}
                  />
                ))}
              </ResultsSection>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ResultsSection({
  title,
  icon,
  count,
  viewAllHref,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  viewAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
            <span className="text-muted-foreground text-sm font-normal">({count})</span>
          </CardTitle>
          {viewAllHref && (
            <Link href={viewAllHref}>
              <a className="text-sm text-primary hover:underline" data-testid={`link-view-all-${title.toLowerCase()}`}>
                View all →
              </a>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border">{children}</div>
      </CardContent>
    </Card>
  );
}

function ResultLink({
  href,
  title,
  subtitle,
  testId,
}: {
  href: string;
  title: string;
  subtitle?: string;
  testId?: string;
}) {
  return (
    <Link href={href}>
      <a
        className="block py-2 px-2 -mx-2 rounded hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
        data-testid={testId}
      >
        <div className="text-sm font-medium text-foreground">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </a>
    </Link>
  );
}
