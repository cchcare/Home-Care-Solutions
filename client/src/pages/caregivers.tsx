import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { AddCaregiverModal } from "@/components/add-caregiver-modal";
import { OcrUploadDialog } from "@/components/ocr-upload-dialog";
import { OfficeSelector } from "@/components/office-selector";
import { BulkUpdateCaregiverModal } from "@/components/bulk-update-caregiver-modal";
import { useOffice } from "@/context/office-context";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import {
  Plus,
  Search,
  UserCheck,
  Award,
  AlertCircle,
  Eye,
  Edit,
  Scan,
  Trash2,
  RefreshCw,
} from "lucide-react";
import type { Caregiver, Coordinator } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExcelImport } from "@/components/excel-import";
import { IdentifierImportDialog } from "@/components/identifier-import-dialog";
import { ExcelExport } from "@/components/excel-export";
import { useUrlState } from "@/hooks/use-url-state";
import { useSavedViews } from "@/hooks/use-saved-views";
import { MultiSelectPopover } from "@/components/filters/multi-select-popover";
import {
  ActiveFilterChips,
  type FilterChip,
} from "@/components/filters/active-filter-chips";
import { ColumnsMenu, type ColumnDef } from "@/components/filters/columns-menu";
import { SavedViewsMenu } from "@/components/filters/saved-views-menu";

type EnrichedCaregiver = Caregiver & {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

const COMMON_CERT_TYPES = [
  "HHA",
  "PCA",
  "CPR",
  "First Aid",
  "TB Test",
  "Physical",
  "Background Check",
  "BLS",
  "CNA",
];

const COLUMN_DEFS: ColumnDef[] = [
  { key: "info", label: "Caregiver Information" },
  { key: "startDate", label: "Start Date" },
  { key: "phone", label: "Phone Number" },
  { key: "coordinator", label: "Coordinator" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

// Always-on columns the user can't hide
const REQUIRED_COLUMNS = new Set(["info", "actions"]);

function downloadCaregiversCsv(
  rows: EnrichedCaregiver[],
  coordinators: Coordinator[],
  visibility: Record<string, boolean>,
) {
  const coordById = new Map(coordinators.map((c) => [c.id, c]));
  const fmtDate = (d: unknown) => (d ? new Date(d as string).toISOString().slice(0, 10) : "");
  const isVisible = (k: string) => visibility[k] !== false;
  type Field = { header: string; accessor: (c: EnrichedCaregiver) => unknown };
  const fields: Field[] = [];
  if (isVisible("info")) {
    fields.push(
      { header: "First Name", accessor: (c) => c.firstName },
      { header: "Last Name", accessor: (c) => c.lastName },
      { header: "Employee ID", accessor: (c) => c.employeeId },
      { header: "HHA Caregiver Code", accessor: (c) => c.hhaxCaregiverCode },
      { header: "ADP Code", accessor: (c) => c.adpCode },
      { header: "NPI", accessor: (c) => c.npi },
      { header: "Email", accessor: (c) => c.email },
      { header: "Address", accessor: (c) => c.address },
      { header: "City", accessor: (c) => c.city },
      { header: "State", accessor: (c) => c.state },
      { header: "ZIP", accessor: (c) => c.zipCode },
      { header: "County", accessor: (c) => c.county },
      { header: "Specializations", accessor: (c) => (c.specializations ?? []).join("; ") },
    );
  }
  if (isVisible("startDate")) {
    fields.push(
      { header: "Hire Date", accessor: (c) => fmtDate(c.hireDate) },
      { header: "Start Date", accessor: (c) => fmtDate(c.startDate) },
    );
  }
  if (isVisible("phone")) {
    fields.push({ header: "Phone", accessor: (c) => c.phone });
  }
  if (isVisible("coordinator")) {
    fields.push({
      header: "Coordinator",
      accessor: (c) => {
        const coord = c.coordinatorId ? coordById.get(c.coordinatorId) : null;
        return coord ? `${coord.firstName ?? ""} ${coord.lastName ?? ""}`.trim() : "";
      },
    });
  }
  if (isVisible("status")) {
    fields.push({ header: "Status", accessor: (c) => (c.isActive ? "Active" : "Inactive") });
  }
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : String(v);
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [fields.map((f) => f.header).join(",")];
  for (const c of rows) {
    lines.push(fields.map((f) => escape(f.accessor(c))).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `caregivers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Caregivers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOfficeId, setSelectedOfficeId } = useOffice();
  const [, navigate] = useLocation();

  // URL-as-source-of-truth filters
  const url = useUrlState("/caregivers");
  const search = url.getString("search");
  const status = url.getString("status", "all");
  const coordinatorIds = url.getList("coordinatorIds");
  const specializations = url.getList("specializations");
  const certType = url.getString("certType");
  const certExpiresWithinDays = url.getString("certExpiresWithinDays");

  // Local state for the search input (debounced into URL)
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput.trim() !== search) {
        url.setOne("search", searchInput.trim() || null);
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, search]);

  // Modal/selection state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOcrDialog, setShowOcrDialog] = useState(false);
  const [ocrExtractedData, setOcrExtractedData] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedOfficeId !== "all") p.set("officeId", selectedOfficeId);
    if (search) p.set("search", search);
    if (status && status !== "all") p.set("status", status);
    if (coordinatorIds.length) p.set("coordinatorIds", coordinatorIds.join(","));
    if (specializations.length) p.set("specializations", specializations.join(","));
    if (certType) p.set("certType", certType);
    if (certType && certExpiresWithinDays) p.set("certExpiresWithinDays", certExpiresWithinDays);
    return p.toString();
  }, [selectedOfficeId, search, status, coordinatorIds, specializations, certType, certExpiresWithinDays]);

  const { data: caregivers = [], isLoading } = useQuery<EnrichedCaregiver[]>({
    queryKey: ["/api/caregivers", queryParams],
    queryFn: async () => {
      const r = await fetch(
        queryParams ? `/api/caregivers?${queryParams}` : "/api/caregivers",
        { credentials: "include" }
      );
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to load caregivers (${r.status})`);
      }
      return r.json();
    },
    retry: false,
  });

  const { data: allCaregivers = [] } = useQuery<EnrichedCaregiver[]>({
    queryKey: ["/api/caregivers", "specializations-source", selectedOfficeId],
    queryFn: async () => {
      const r = await fetch(
        selectedOfficeId !== "all"
          ? `/api/caregivers?officeId=${encodeURIComponent(selectedOfficeId)}`
          : "/api/caregivers",
        { credentials: "include" }
      );
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to load caregivers (${r.status})`);
      }
      return r.json();
    },
    retry: false,
    staleTime: 60_000,
  });

  const { data: coordinators = [] } = useQuery<Coordinator[]>({
    queryKey: ["/api/coordinators"],
    queryFn: () => fetch("/api/coordinators").then((r) => r.json()),
    retry: false,
  });

  // Saved views and column prefs
  const {
    views,
    columnPrefs,
    saveView,
    deleteView,
    renameView,
    markViewUsed,
    setColumnPrefs,
  } = useSavedViews("caregivers");

  const visibility = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const c of COLUMN_DEFS) {
      out[c.key] = columnPrefs[c.key] !== false;
    }
    return out;
  }, [columnPrefs]);

  const isVisible = (key: string) => visibility[key] !== false;

  const specOptions = useMemo(() => {
    const set = new Set<string>();
    for (const cg of allCaregivers) {
      for (const s of cg.specializations ?? []) {
        if (s) set.add(s);
      }
    }
    return Array.from(set)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [allCaregivers]);

  const coordinatorOptions = useMemo(
    () =>
      coordinators.map((c) => ({
        value: c.id,
        label: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email || c.id,
        description: c.email ?? undefined,
      })),
    [coordinators]
  );

  const createCaregiverMutation = useMutation({
    mutationFn: async (caregiverData: any) => {
      const response = await apiRequest("POST", "/api/caregivers", caregiverData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setShowAddModal(false);
      toast({ title: "Success", description: "Caregiver added successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add caregiver",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (caregiverIds: string[]) => {
      const response = await apiRequest("POST", "/api/caregivers/bulk-delete", { caregiverIds });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      toast({
        title: "Success",
        description: `${result.deleted} caregiver(s) deleted successfully`,
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      const message = error?.message || "Failed to delete caregivers";
      toast({
        title: "Error",
        description: message.includes("permissions")
          ? "You don't have permission to delete caregivers"
          : message,
        variant: "destructive",
      });
    },
  });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === caregivers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(caregivers.map((c) => c.id));
    }
  };

  const handleBulkUpdateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
    setSelectedIds([]);
    setShowBulkUpdateModal(false);
  };

  // Build chips from active filters
  const activeFilters: Record<string, unknown> = {
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    coordinatorIds: coordinatorIds.length ? coordinatorIds : undefined,
    specializations: specializations.length ? specializations : undefined,
    certType: certType || undefined,
    certExpiresWithinDays: certExpiresWithinDays || undefined,
  };

  const chips: FilterChip[] = [];
  if (search) {
    chips.push({
      key: "search",
      label: "Search",
      value: search,
      onRemove: () => url.setOne("search", null),
    });
  }
  if (status !== "all") {
    chips.push({
      key: "status",
      label: "Status",
      value: status === "active" ? "Active" : "Inactive",
      onRemove: () => url.setOne("status", null),
    });
  }
  if (coordinatorIds.length) {
    const labels = coordinatorIds
      .map((id) => coordinatorOptions.find((o) => o.value === id)?.label ?? id)
      .join(", ");
    chips.push({
      key: "coordinatorIds",
      label: "Coordinator",
      value: labels,
      onRemove: () => url.setOne("coordinatorIds", null),
    });
  }
  if (specializations.length) {
    chips.push({
      key: "specializations",
      label: "Specializations",
      value: specializations.join(", "),
      onRemove: () => url.setOne("specializations", null),
    });
  }
  if (certType) {
    const days = certExpiresWithinDays ? Number(certExpiresWithinDays) : null;
    chips.push({
      key: "certType",
      label: "Certification",
      value: days != null && Number.isFinite(days)
        ? `${certType} expiring ≤ ${days}d`
        : certType,
      onRemove: () => {
        url.setMany({ certType: null, certExpiresWithinDays: null });
      },
    });
  }

  const applySavedView = (filters: Record<string, unknown>) => {
    const next: Record<string, string | string[] | null> = {
      search: null,
      status: null,
      coordinatorIds: null,
      specializations: null,
      certType: null,
      certExpiresWithinDays: null,
    };
    for (const [k, v] of Object.entries(filters)) {
      if (Array.isArray(v)) next[k] = v as string[];
      else if (v == null) next[k] = null;
      else next[k] = String(v);
    }
    url.setMany(next);
  };

  const [isExporting, setIsExporting] = useState(false);
  const handleExportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const exportParams = new URLSearchParams(queryParams);
      exportParams.set("export", "csv");
      const r = await fetch(`/api/caregivers?${exportParams.toString()}`, { credentials: "include" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to export caregivers (${r.status})`);
      }
      const rows = (await r.json()) as EnrichedCaregiver[];
      if (rows.length === 0) {
        toast({ title: "No caregivers to export", description: "Adjust your filters and try again." });
        return;
      }
      if (rows.length >= 1000) {
        toast({
          title: "Preparing large export",
          description: `Downloading ${rows.length.toLocaleString()} caregivers — this may take a moment.`,
        });
      }
      downloadCaregiversCsv(rows, coordinators, visibility);
      toast({
        title: "Export ready",
        description: `Downloaded ${rows.length.toLocaleString()} caregiver${rows.length === 1 ? "" : "s"}.`,
      });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err?.message || "Could not export caregivers.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title="Caregiver Management"
          subtitle="Manage caregiver profiles and certifications"
        />

        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <OfficeSelector
              selectedOfficeId={selectedOfficeId === "all" ? undefined : selectedOfficeId}
              onOfficeChange={setSelectedOfficeId}
              showAllOption={true}
            />
          </div>
          <div className="flex items-center space-x-2">
            <ExcelExport type="caregivers" data={caregivers} disabled={isLoading} />
            <ExcelImport
              type="caregivers"
              officeId={selectedOfficeId !== "all" ? selectedOfficeId : undefined}
              onImportComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
                queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
              }}
            />
            <IdentifierImportDialog
              onImportComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
              }}
            />
            <Button variant="outline" onClick={() => setShowOcrDialog(true)} data-testid="button-scan-caregiver">
              <Scan className="w-4 h-4 mr-2" />
              Scan Document
            </Button>
            <Button onClick={() => setShowAddModal(true)} data-testid="button-add-caregiver">
              <Plus className="w-4 h-4 mr-2" />
              Add Caregiver
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[260px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, HHA code, NPI, ADP, employee ID, email, or phone…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-caregivers"
                    />
                  </div>

                  <Select
                    value={status}
                    onValueChange={(v) => url.setOne("status", v === "all" ? null : v)}
                  >
                    <SelectTrigger className="w-[140px]" data-testid="select-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  <MultiSelectPopover
                    label="Coordinator"
                    placeholder="Coordinator"
                    options={coordinatorOptions}
                    values={coordinatorIds}
                    onChange={(next) => url.setOne("coordinatorIds", next.length ? next : null)}
                    testId="filter-coordinator"
                  />

                  <MultiSelectPopover
                    label="Specializations"
                    placeholder="Specializations"
                    options={specOptions}
                    values={specializations}
                    onChange={(next) => url.setOne("specializations", next.length ? next : null)}
                    testId="filter-specializations"
                  />

                  <Select
                    value={certType || "none"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        url.setMany({ certType: null, certExpiresWithinDays: null });
                      } else {
                        url.setOne("certType", v);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[160px]" data-testid="select-cert-type">
                      <SelectValue placeholder="Certification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any certification</SelectItem>
                      {COMMON_CERT_TYPES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {certType && (
                    <Select
                      value={certExpiresWithinDays || "any"}
                      onValueChange={(v) =>
                        url.setOne("certExpiresWithinDays", v === "any" ? null : v)
                      }
                    >
                      <SelectTrigger className="w-[180px]" data-testid="select-cert-window">
                        <SelectValue placeholder="Expiry window" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any expiry</SelectItem>
                        <SelectItem value="0">Already expired</SelectItem>
                        <SelectItem value="30">Expiring in 30 days</SelectItem>
                        <SelectItem value="60">Expiring in 60 days</SelectItem>
                        <SelectItem value="90">Expiring in 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCsv}
                      disabled={isLoading || isExporting}
                      data-testid="button-export-csv"
                    >
                      {isExporting ? "Exporting…" : "Export CSV"}
                    </Button>
                    <SavedViewsMenu
                      views={views}
                      currentFilters={activeFilters}
                      onApply={applySavedView}
                      onSave={(input) => saveView.mutateAsync(input)}
                      onDelete={(id) => deleteView.mutateAsync(id)}
                      onRename={(input) => renameView.mutateAsync(input)}
                      onMarkUsed={(id) => markViewUsed.mutateAsync(id)}
                    />
                    <ColumnsMenu
                      columns={COLUMN_DEFS}
                      visibility={visibility}
                      onChange={(next) => {
                        // Required columns can't be hidden
                        const sanitized = { ...next };
                        Array.from(REQUIRED_COLUMNS).forEach((k) => {
                          sanitized[k] = true;
                        });
                        setColumnPrefs.mutate(sanitized);
                      }}
                    />
                  </div>
                </div>

                <ActiveFilterChips
                  chips={chips}
                  onClearAll={chips.length > 0 ? () => url.clearAll() : undefined}
                />

                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.length} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkUpdateModal(true)}
                      data-testid="button-bulk-update"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Bulk Update
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      data-testid="button-bulk-delete"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Caregiver Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Caregivers</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-caregivers">
                        {caregivers.length}
                      </p>
                    </div>
                    <UserCheck className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-active-caregivers-count">
                        {caregivers.filter((c: Caregiver) => c.isActive).length}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-accent-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Certifications Due</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-certifications-due">
                        12
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Compliance Rate</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-caregiver-compliance">
                        94%
                      </p>
                    </div>
                    <Award className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Caregivers Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Caregivers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="w-12 p-4">
                          <Checkbox
                            checked={
                              caregivers.length > 0 && selectedIds.length === caregivers.length
                            }
                            onCheckedChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </th>
                        {isVisible("info") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                            Caregiver Information
                          </th>
                        )}
                        {isVisible("startDate") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                            Start Date
                          </th>
                        )}
                        {isVisible("phone") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                            Phone Number
                          </th>
                        )}
                        {isVisible("coordinator") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                            Coordinator
                          </th>
                        )}
                        {isVisible("status") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                            Status
                          </th>
                        )}
                        {isVisible("actions") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            Loading caregivers...
                          </td>
                        </tr>
                      ) : caregivers.length > 0 ? (
                        caregivers.map((caregiver: EnrichedCaregiver) => {
                          const startDate = caregiver.startDate || caregiver.hireDate;
                          const coordinator = caregiver.coordinatorId
                            ? coordinators.find((c) => c.id === caregiver.coordinatorId)
                            : null;
                          const coordinatorName = coordinator
                            ? `${coordinator.firstName} ${coordinator.lastName}`
                            : null;
                          return (
                            <tr
                              key={caregiver.id}
                              className="hover:bg-muted/25 transition-colors"
                              data-testid={`row-caregiver-${caregiver.id}`}
                            >
                              <td className="p-4">
                                <Checkbox
                                  checked={selectedIds.includes(caregiver.id)}
                                  onCheckedChange={() => toggleSelection(caregiver.id)}
                                  data-testid={`checkbox-caregiver-${caregiver.id}`}
                                />
                              </td>
                              {isVisible("info") && (
                                <td className="p-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                                      <UserCheck className="w-6 h-6 text-accent-foreground" />
                                    </div>
                                    <div>
                                      <p
                                        className="font-medium text-foreground hover:text-primary cursor-pointer hover:underline"
                                        onClick={() => navigate(`/caregivers/${caregiver.id}`)}
                                        data-testid={`text-caregiver-name-${caregiver.id}`}
                                      >
                                        {caregiver.firstName && caregiver.lastName
                                          ? `${caregiver.firstName} ${caregiver.lastName}`
                                          : `Employee #${caregiver.employeeId || "N/A"}`}
                                      </p>
                                      <p
                                        className="text-sm text-muted-foreground"
                                        data-testid={`text-caregiver-hha-id-${caregiver.id}`}
                                      >
                                        HHA ID: {caregiver.hhaxCaregiverCode || "Not provided"}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                              )}
                              {isVisible("startDate") && (
                                <td className="p-4">
                                  <p
                                    className="text-sm text-foreground"
                                    data-testid={`text-caregiver-start-date-${caregiver.id}`}
                                  >
                                    {startDate ? new Date(startDate).toLocaleDateString() : "Not set"}
                                  </p>
                                </td>
                              )}
                              {isVisible("phone") && (
                                <td className="p-4">
                                  <p
                                    className="text-sm text-foreground"
                                    data-testid={`text-caregiver-phone-${caregiver.id}`}
                                  >
                                    {caregiver.phone || (
                                      <span className="text-muted-foreground">Not provided</span>
                                    )}
                                  </p>
                                </td>
                              )}
                              {isVisible("coordinator") && (
                                <td className="p-4">
                                  <p
                                    className="text-sm text-foreground"
                                    data-testid={`text-caregiver-coordinator-${caregiver.id}`}
                                  >
                                    {coordinatorName || (
                                      <span className="text-muted-foreground">Unassigned</span>
                                    )}
                                  </p>
                                </td>
                              )}
                              {isVisible("status") && (
                                <td className="p-4">
                                  <Badge
                                    variant={caregiver.isActive ? "default" : "secondary"}
                                    data-testid={`badge-caregiver-status-${caregiver.id}`}
                                  >
                                    {caregiver.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </td>
                              )}
                              {isVisible("actions") && (
                                <td className="p-4">
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/caregivers/${caregiver.id}`)}
                                      data-testid={`button-view-caregiver-${caregiver.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/caregivers/${caregiver.id}`)}
                                      data-testid={`button-edit-caregiver-${caregiver.id}`}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            {chips.length > 0
                              ? "No caregivers match your filters"
                              : "No caregivers found"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddCaregiverModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setOcrExtractedData(null);
        }}
        onSubmit={(data) => createCaregiverMutation.mutate(data)}
        isLoading={createCaregiverMutation.isPending}
        initialData={ocrExtractedData}
      />

      <OcrUploadDialog
        isOpen={showOcrDialog}
        onClose={() => setShowOcrDialog(false)}
        type="caregiver"
        onDataExtracted={(data) => {
          setOcrExtractedData(data);
          setShowOcrDialog(false);
          setShowAddModal(true);
          toast({
            title: "Data Extracted",
            description: "Document scanned successfully. Please review and complete the form.",
          });
        }}
      />

      <BulkUpdateCaregiverModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        caregiverIds={selectedIds}
        onSuccess={handleBulkUpdateSuccess}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Caregivers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} caregiver(s)? This action cannot
              be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
