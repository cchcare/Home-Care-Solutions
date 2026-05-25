import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Network, ChevronRight, ChevronDown, User, Search, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type OrgNode = {
  kind: "user" | "caregiver";
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  title: string | null;
  officeName: string | null;
  reports: OrgNode[];
};

type OrgTree = { roots: OrgNode[]; unassigned: OrgNode[] };

type Office = { id: string; name: string };

const nodeName = (n: OrgNode) =>
  [n.firstName, n.lastName].filter(Boolean).join(" ") || "(no name)";

function NodeView({
  node,
  depth,
  expanded,
  setExpanded,
  highlightedIds,
  matchTerm,
}: {
  node: OrgNode;
  depth: number;
  expanded: Set<string>;
  setExpanded: (s: Set<string>) => void;
  highlightedIds: Set<string>;
  matchTerm: string;
}) {
  const key = `${node.kind}:${node.id}`;
  const open = expanded.has(key);
  const name = nodeName(node);
  const hasReports = node.reports.length > 0;
  const isHit = matchTerm && highlightedIds.has(key);

  const toggle = () => {
    const next = new Set(expanded);
    if (open) next.delete(key);
    else next.add(key);
    setExpanded(next);
  };

  return (
    <li
      className="border-l border-border ml-2 pl-3 py-1 print:border-l print:break-inside-avoid"
      data-testid={`org-node-${node.kind}-${node.id}`}
      id={`org-node-${node.id}`}
    >
      <div
        className={`flex items-center gap-2 flex-wrap rounded px-1 ${
          isHit ? "bg-yellow-100 dark:bg-yellow-900/40" : ""
        }`}
      >
        {hasReports ? (
          <button
            type="button"
            onClick={toggle}
            className="text-muted-foreground hover:text-foreground print:hidden"
            data-testid={`org-toggle-${node.id}`}
          >
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        <User className="h-4 w-4 text-muted-foreground" />
        {node.kind === "caregiver" ? (
          <Link
            href={`/caregivers/${node.id}`}
            className="font-medium hover:underline text-primary"
          >
            {name}
          </Link>
        ) : (
          <span className="font-medium">{name}</span>
        )}
        <Badge variant="outline" className="text-xs">
          {node.kind === "caregiver" ? "Caregiver" : node.role || "Staff"}
        </Badge>
        {node.title && (
          <span className="text-xs text-muted-foreground">· {node.title}</span>
        )}
        {hasReports && (
          <span className="text-xs text-muted-foreground">
            · {node.reports.length} report{node.reports.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {hasReports && (open || matchTerm) && (
        <ul className={open ? "mt-1" : "mt-1 print:hidden"}>
          {node.reports.map((r) => (
            <NodeView
              key={`${r.kind}-${r.id}`}
              node={r}
              depth={depth + 1}
              expanded={expanded}
              setExpanded={setExpanded}
              highlightedIds={highlightedIds}
              matchTerm={matchTerm}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrgChartPage() {
  const [officeId, setOfficeId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  const { data: offices = [] } = useQuery<Office[]>({ queryKey: ["/api/offices"] });

  const officeParam = officeId !== "all" ? `?officeId=${encodeURIComponent(officeId)}` : "";

  const { data, isLoading } = useQuery<OrgTree>({
    queryKey: ["/api/employees/org-tree", { officeId }],
    queryFn: async () => {
      const res = await fetch(`/api/employees/org-tree${officeParam}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load org tree");
      return res.json();
    },
  });

  // Default-expand the first two levels on first load of new data.
  useEffect(() => {
    if (!data || !firstLoadRef.current) return;
    firstLoadRef.current = false;
    const next = new Set<string>();
    const walk = (n: OrgNode, depth: number) => {
      if (depth < 2 && n.reports.length > 0) {
        next.add(`${n.kind}:${n.id}`);
      }
      n.reports.forEach((c) => walk(c, depth + 1));
    };
    data.roots.forEach((n) => walk(n, 0));
    setExpanded(next);
  }, [data]);

  // Compute matches and the ancestor path that must be expanded to reveal them.
  const { highlightedIds, autoExpanded, matchCount } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const hits = new Set<string>();
    const anc = new Set<string>();
    if (!term || !data) return { highlightedIds: hits, autoExpanded: anc, matchCount: 0 };
    const matches = (n: OrgNode) => {
      const hay = [n.firstName, n.lastName, n.email, n.role, n.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    };
    const walk = (n: OrgNode, path: string[]) => {
      const key = `${n.kind}:${n.id}`;
      const newPath = [...path, key];
      if (matches(n)) {
        hits.add(key);
        path.forEach((p) => anc.add(p));
      }
      n.reports.forEach((c) => walk(c, newPath));
    };
    data.roots.forEach((n) => walk(n, []));
    data.unassigned.forEach((n) => walk(n, []));
    return { highlightedIds: hits, autoExpanded: anc, matchCount: hits.size };
  }, [data, searchTerm]);

  const effectiveExpanded = useMemo(() => {
    const s = new Set(expanded);
    autoExpanded.forEach((k) => s.add(k));
    return s;
  }, [expanded, autoExpanded]);

  const totalCount = useMemo(() => {
    const walk = (n: OrgNode): number => 1 + n.reports.reduce((a, c) => a + walk(c), 0);
    const r = (data?.roots ?? []).reduce((a, n) => a + walk(n), 0);
    const u = (data?.unassigned ?? []).reduce((a, n) => a + walk(n), 0);
    return r + u;
  }, [data]);

  const expandAll = () => {
    if (!data) return;
    const all = new Set<string>();
    const walk = (n: OrgNode) => {
      all.add(`${n.kind}:${n.id}`);
      n.reports.forEach(walk);
    };
    data.roots.forEach(walk);
    data.unassigned.forEach(walk);
    setExpanded(all);
  };
  const collapseAll = () => setExpanded(new Set());

  const officeLabel =
    officeId === "all"
      ? "All offices"
      : offices.find((o) => o.id === officeId)?.name || "Office";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div
        className="flex-1 space-y-4 p-4 md:p-6 overflow-auto print:p-0"
        data-testid="page-org-chart"
      >
        <style>{`
          @media print {
            @page { margin: 0.5in; }
            .print\\:hidden { display: none !important; }
            body { background: white !important; }
            aside, header, nav { display: none !important; }
            .print\\:break-inside-avoid { break-inside: avoid; }
          }
        `}</style>

        <div className="hidden print:block mb-4">
          <h1 className="text-2xl font-bold">Org Chart · {officeLabel}</h1>
          <div className="text-sm text-muted-foreground">
            Generated {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <Network className="h-6 w-6" />
            <h1 className="text-2xl font-semibold">Org Chart</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              data-testid="button-expand-all"
            >
              Expand all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              data-testid="button-collapse-all"
            >
              Collapse all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              data-testid="button-print-org-chart"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Select value={officeId} onValueChange={setOfficeId}>
              <SelectTrigger className="w-[220px]" data-testid="select-orgchart-office">
                <SelectValue placeholder="Office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {offices.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/employees">
              <Button variant="outline" size="sm" data-testid="button-open-employees">
                View list
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative max-w-md print:hidden">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search and jump to a person"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-orgchart-search"
          />
          {searchTerm.trim() && (
            <div
              className="text-xs text-muted-foreground mt-1"
              data-testid="text-orgchart-match-count"
            >
              {matchCount} match{matchCount === 1 ? "" : "es"}
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isLoading ? "Loading…" : `${totalCount} people`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Building tree…</div>
            ) : !data || (data.roots.length === 0 && data.unassigned.length === 0) ? (
              <div
                className="text-sm text-muted-foreground"
                data-testid="text-orgchart-empty"
              >
                No employees to display.
              </div>
            ) : (
              <>
                <ul>
                  {data.roots.map((n) => (
                    <NodeView
                      key={`${n.kind}-${n.id}`}
                      node={n}
                      depth={0}
                      expanded={effectiveExpanded}
                      setExpanded={setExpanded}
                      highlightedIds={highlightedIds}
                      matchTerm={searchTerm.trim()}
                    />
                  ))}
                </ul>
                {data.unassigned.length > 0 && (
                  <div className="mt-6">
                    <div className="text-sm font-medium mb-2 text-muted-foreground">
                      Unassigned ({data.unassigned.length})
                    </div>
                    <ul>
                      {data.unassigned.map((n) => (
                        <NodeView
                          key={`${n.kind}-${n.id}`}
                          node={n}
                          depth={0}
                          expanded={effectiveExpanded}
                          setExpanded={setExpanded}
                          highlightedIds={highlightedIds}
                          matchTerm={searchTerm.trim()}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
