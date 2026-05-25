import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { AddClientModal } from "@/components/add-client-modal";
import { ClientProfileModal } from "@/components/client-profile-modal";
import { OcrUploadDialog } from "@/components/ocr-upload-dialog";
import { OfficeSelector } from "@/components/office-selector";
import { useOffice } from "@/context/office-context";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Users,
  Phone,
  Calendar,
  Scan,
  CheckSquare,
  ClipboardList,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Client, Office, Coordinator, Mco } from "@shared/schema";
import { ExcelImport } from "@/components/excel-import";
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

const CLIENT_COLUMN_DEFS: ColumnDef[] = [
  { key: "info", label: "Client Information" },
  { key: "startDate", label: "Start Date" },
  { key: "status", label: "Status" },
  { key: "mco", label: "MCO" },
  { key: "phone", label: "Phone Number" },
  { key: "coordinator", label: "Coordinator" },
  { key: "actions", label: "Actions" },
];

const REQUIRED_CLIENT_COLUMNS = new Set(["info", "actions"]);

function downloadClientsCsv(
  rows: Client[],
  coordinators: Coordinator[],
  mcos: Mco[],
  visibility: Record<string, boolean>,
) {
  const coordById = new Map(coordinators.map((c) => [c.id, c]));
  const mcoById = new Map(mcos.map((m) => [m.id, m]));
  const fmtDate = (d: unknown) => (d ? new Date(d as string).toISOString().slice(0, 10) : "");
  const isVisible = (k: string) => visibility[k] !== false;
  // Map each visibility column to one or more CSV fields.
  type Field = { header: string; accessor: (c: Client) => unknown };
  const fields: Field[] = [];
  if (isVisible("info")) {
    fields.push(
      { header: "First Name", accessor: (c) => c.firstName },
      { header: "Last Name", accessor: (c) => c.lastName },
      { header: "DOB", accessor: (c) => fmtDate(c.dateOfBirth) },
      { header: "Member ID", accessor: (c) => c.memberId },
      { header: "HHA Admission ID", accessor: (c) => c.hhaxAdmissionId },
      { header: "Email", accessor: (c) => c.email },
      { header: "Address", accessor: (c) => c.address },
      { header: "City", accessor: (c) => c.city },
      { header: "County", accessor: (c) => c.county },
      { header: "ZIP", accessor: (c) => c.zipCode },
      { header: "SNAP Status", accessor: (c) => c.snapStatus ?? "" },
      { header: "SNAP Expiry", accessor: (c) => fmtDate(c.snapExpiryDate) },
    );
  }
  if (isVisible("startDate")) {
    fields.push({ header: "Service Start Date", accessor: (c) => fmtDate(c.serviceStartDate) });
  }
  if (isVisible("status")) {
    fields.push({ header: "Status", accessor: (c) => c.status });
  }
  if (isVisible("mco")) {
    fields.push({ header: "MCO", accessor: (c) => (c.mcoId ? mcoById.get(c.mcoId)?.name ?? "" : "") });
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
  a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function BulkUpdateModal({
  isOpen,
  onClose,
  selectedCount,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onSubmit: (updates: Record<string, string>) => void;
  isLoading: boolean;
}) {
  const [applyOffice, setApplyOffice] = useState(false);
  const [applyCoordinator, setApplyCoordinator] = useState(false);
  const [applyMco, setApplyMco] = useState(false);
  const [applyStatus, setApplyStatus] = useState(false);

  const [officeId, setOfficeId] = useState<string>("");
  const [coordinatorId, setCoordinatorId] = useState<string>("");
  const [mcoId, setMcoId] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
    queryFn: () => fetch("/api/offices").then(r => r.json()),
    enabled: isOpen,
  });

  const { data: coordinators = [] } = useQuery<Coordinator[]>({
    queryKey: ["/api/coordinators"],
    queryFn: () => fetch("/api/coordinators").then(r => r.json()),
    enabled: isOpen,
  });

  const { data: mcos = [] } = useQuery<Mco[]>({
    queryKey: ["/api/mcos"],
    queryFn: () => fetch("/api/mcos").then(r => r.json()),
    enabled: isOpen,
  });

  const handleSubmit = () => {
    const updates: Record<string, string> = {};
    if (applyOffice && officeId && officeId !== "__none__") updates.officeId = officeId;
    if (applyCoordinator && coordinatorId && coordinatorId !== "__none__") updates.coordinatorId = coordinatorId;
    if (applyMco && mcoId && mcoId !== "__none__") updates.mcoId = mcoId;
    if (applyStatus && status && status !== "__none__") updates.status = status;
    
    if (Object.keys(updates).length === 0) {
      return;
    }
    onSubmit(updates);
  };

  const handleClose = () => {
    setApplyOffice(false);
    setApplyCoordinator(false);
    setApplyMco(false);
    setApplyStatus(false);
    setOfficeId("");
    setCoordinatorId("");
    setMcoId("");
    setStatus("");
    onClose();
  };

  const hasSelection = applyOffice || applyCoordinator || applyMco || applyStatus;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Update {selectedCount} Client{selectedCount > 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="apply-office"
              checked={applyOffice}
              onCheckedChange={(checked) => setApplyOffice(!!checked)}
              data-testid="checkbox-apply-office"
            />
            <div className="flex-1">
              <Label htmlFor="apply-office" className="font-medium">Office</Label>
              <Select
                value={officeId}
                onValueChange={setOfficeId}
                disabled={!applyOffice}
              >
                <SelectTrigger className="mt-1" data-testid="select-bulk-office">
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select office</SelectItem>
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="apply-coordinator"
              checked={applyCoordinator}
              onCheckedChange={(checked) => setApplyCoordinator(!!checked)}
              data-testid="checkbox-apply-coordinator"
            />
            <div className="flex-1">
              <Label htmlFor="apply-coordinator" className="font-medium">Coordinator</Label>
              <Select
                value={coordinatorId}
                onValueChange={setCoordinatorId}
                disabled={!applyCoordinator}
              >
                <SelectTrigger className="mt-1" data-testid="select-bulk-coordinator">
                  <SelectValue placeholder="Select coordinator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select coordinator</SelectItem>
                  {coordinators.map((coord) => (
                    <SelectItem key={coord.id} value={coord.id}>
                      {coord.firstName} {coord.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="apply-mco"
              checked={applyMco}
              onCheckedChange={(checked) => setApplyMco(!!checked)}
              data-testid="checkbox-apply-mco"
            />
            <div className="flex-1">
              <Label htmlFor="apply-mco" className="font-medium">MCO</Label>
              <Select
                value={mcoId}
                onValueChange={setMcoId}
                disabled={!applyMco}
              >
                <SelectTrigger className="mt-1" data-testid="select-bulk-mco">
                  <SelectValue placeholder="Select MCO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select MCO</SelectItem>
                  {mcos.map((mco) => (
                    <SelectItem key={mco.id} value={mco.id}>
                      {mco.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="apply-status"
              checked={applyStatus}
              onCheckedChange={(checked) => setApplyStatus(!!checked)}
              data-testid="checkbox-apply-status"
            />
            <div className="flex-1">
              <Label htmlFor="apply-status" className="font-medium">Status</Label>
              <Select
                value={status}
                onValueChange={setStatus}
                disabled={!applyStatus}
              >
                <SelectTrigger className="mt-1" data-testid="select-bulk-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-bulk-update">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !hasSelection}
            data-testid="button-submit-bulk-update"
          >
            {isLoading ? "Updating..." : "Update Clients"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Clients() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOcrDialog, setShowOcrDialog] = useState(false);
  const [ocrExtractedData, setOcrExtractedData] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOfficeId, setSelectedOfficeId } = useOffice();
  const [, navigate] = useLocation();

  // URL-as-source-of-truth filters
  const url = useUrlState("/clients");
  const search = url.getString("search");
  const status = url.getString("status", "all");
  const mcoFilter = url.getString("mcoId", "all");
  const coordinatorIds = url.getList("coordinatorIds");
  const cityFilter = url.getString("city");
  const countyFilter = url.getString("county");
  const zipFilter = url.getString("zipCode");
  const snapStatus = url.getString("snapStatus", "all");
  const snapExpiresWithinDays = url.getString("snapExpiresWithinDays");
  const ageMin = url.getString("ageMin");
  const ageMax = url.getString("ageMax");
  const createdWithinDays = url.getString("createdWithinDays");
  const sortOption = url.getString("sortOption", "nameAsc");

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

  // Local state for free-text geo filters (debounced into URL)
  const [cityInput, setCityInput] = useState(cityFilter);
  const [countyInput, setCountyInput] = useState(countyFilter);
  const [zipInput, setZipInput] = useState(zipFilter);
  useEffect(() => setCityInput(cityFilter), [cityFilter]);
  useEffect(() => setCountyInput(countyFilter), [countyFilter]);
  useEffect(() => setZipInput(zipFilter), [zipFilter]);
  useEffect(() => {
    const handle = setTimeout(() => {
      const updates: Record<string, string | null> = {};
      if (cityInput.trim() !== cityFilter) updates.city = cityInput.trim() || null;
      if (countyInput.trim() !== countyFilter) updates.county = countyInput.trim() || null;
      if (zipInput.trim() !== zipFilter) updates.zipCode = zipInput.trim() || null;
      if (Object.keys(updates).length > 0) url.setMany(updates);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityInput, countyInput, zipInput, cityFilter, countyFilter, zipFilter]);

  const { data: mcos = [] } = useQuery<Mco[]>({
    queryKey: ["/api/mcos"],
    queryFn: () => fetch("/api/mcos").then(r => r.json()),
  });

  const { data: coordinators = [] } = useQuery<Coordinator[]>({
    queryKey: ["/api/coordinators"],
    queryFn: () => fetch("/api/coordinators").then(r => r.json()),
  });

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedOfficeId !== "all") p.set("officeId", selectedOfficeId);
    if (mcoFilter !== "all") p.set("mcoId", mcoFilter);
    if (search) p.set("search", search);
    if (status !== "all") p.set("status", status);
    if (coordinatorIds.length) p.set("coordinatorIds", coordinatorIds.join(","));
    if (cityFilter) p.set("city", cityFilter);
    if (countyFilter) p.set("county", countyFilter);
    if (zipFilter) p.set("zipCode", zipFilter);
    if (snapStatus !== "all") p.set("snapStatus", snapStatus);
    if (snapExpiresWithinDays) p.set("snapExpiresWithinDays", snapExpiresWithinDays);
    if (ageMin) p.set("ageMin", ageMin);
    if (ageMax) p.set("ageMax", ageMax);
    if (createdWithinDays) p.set("createdWithinDays", createdWithinDays);
    const sortField = sortOption.startsWith("name") ? "name" : "serviceStartDate";
    const sortDirection = sortOption.endsWith("Asc") ? "asc" : "desc";
    p.set("sortField", sortField);
    p.set("sortDirection", sortDirection);
    return p.toString();
  }, [
    selectedOfficeId, mcoFilter, search, status, coordinatorIds,
    cityFilter, countyFilter, zipFilter, snapStatus, snapExpiresWithinDays,
    ageMin, ageMax, createdWithinDays, sortOption,
  ]);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients", queryParams],
    queryFn: async () => {
      const r = await fetch(`/api/clients?${queryParams}`, { credentials: "include" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to load clients (${r.status})`);
      }
      return r.json();
    },
    retry: false,
  });

  const {
    views: savedViews,
    columnPrefs,
    saveView,
    deleteView,
    renameView,
    setColumnPrefs,
  } = useSavedViews("clients");

  const visibility = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const c of CLIENT_COLUMN_DEFS) out[c.key] = columnPrefs[c.key] !== false;
    return out;
  }, [columnPrefs]);
  const isVisible = (key: string) => visibility[key] !== false;

  const coordinatorOptions = useMemo(
    () =>
      coordinators.map((c) => ({
        value: c.id,
        label: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email || c.id,
        description: c.email ?? undefined,
      })),
    [coordinators]
  );

  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await apiRequest("POST", "/api/clients", clientData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setShowAddModal(false);
      toast({
        title: "Success",
        description: "Client added successfully",
      });
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
        description: "Failed to add client",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/clients/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setSelectedClient(null);
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
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
        description: "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ clientIds, updates }: { clientIds: string[]; updates: Record<string, string> }) => {
      const response = await apiRequest("POST", "/api/clients/bulk-update", { clientIds, updates });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setShowBulkUpdateModal(false);
      setSelectedClientIds(new Set());
      toast({
        title: "Success",
        description: `${data.length} client${data.length > 1 ? "s" : ""} updated successfully`,
      });
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
        description: "Failed to bulk update clients",
        variant: "destructive",
      });
    },
  });

  const handleAddClient = (clientData: any) => {
    createClientMutation.mutate(clientData);
  };

  const handleUpdateClient = (clientData: any) => {
    if (selectedClient) {
      updateClientMutation.mutate({ id: selectedClient.id, data: clientData });
    }
  };

  const handleBulkUpdate = (updates: Record<string, string>) => {
    bulkUpdateMutation.mutate({
      clientIds: Array.from(selectedClientIds),
      updates,
    });
  };

  const toggleClientSelection = (clientId: string) => {
    const newSet = new Set(selectedClientIds);
    if (newSet.has(clientId)) {
      newSet.delete(clientId);
    } else {
      newSet.add(clientId);
    }
    setSelectedClientIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedClientIds.size === clients.length) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(clients.map((c) => c.id)));
    }
  };

  const isAllSelected = clients.length > 0 && selectedClientIds.size === clients.length;
  const isSomeSelected = selectedClientIds.size > 0 && selectedClientIds.size < clients.length;

  // Build chip list and serialise filter snapshot for saved views
  const activeFilters: Record<string, unknown> = {
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    mcoId: mcoFilter !== "all" ? mcoFilter : undefined,
    coordinatorIds: coordinatorIds.length ? coordinatorIds : undefined,
    city: cityFilter || undefined,
    county: countyFilter || undefined,
    zipCode: zipFilter || undefined,
    snapStatus: snapStatus !== "all" ? snapStatus : undefined,
    snapExpiresWithinDays: snapExpiresWithinDays || undefined,
    ageMin: ageMin || undefined,
    ageMax: ageMax || undefined,
    createdWithinDays: createdWithinDays || undefined,
    sortOption: sortOption !== "nameAsc" ? sortOption : undefined,
  };

  const chips: FilterChip[] = [];
  if (search) chips.push({ key: "search", label: "Search", value: search, onRemove: () => url.setOne("search", null) });
  if (status !== "all") chips.push({ key: "status", label: "Status", value: status, onRemove: () => url.setOne("status", null) });
  if (mcoFilter !== "all") {
    const mcoName = mcos.find((m) => m.id === mcoFilter)?.name ?? mcoFilter;
    chips.push({ key: "mcoId", label: "MCO", value: mcoName, onRemove: () => url.setOne("mcoId", null) });
  }
  if (coordinatorIds.length) {
    const labels = coordinatorIds.map((id) => coordinatorOptions.find((o) => o.value === id)?.label ?? id).join(", ");
    chips.push({ key: "coordinatorIds", label: "Coordinator", value: labels, onRemove: () => url.setOne("coordinatorIds", null) });
  }
  if (cityFilter) chips.push({ key: "city", label: "City", value: cityFilter, onRemove: () => url.setOne("city", null) });
  if (countyFilter) chips.push({ key: "county", label: "County", value: countyFilter, onRemove: () => url.setOne("county", null) });
  if (zipFilter) chips.push({ key: "zipCode", label: "ZIP", value: zipFilter, onRemove: () => url.setOne("zipCode", null) });
  if (snapStatus !== "all") {
    const labels: Record<string, string> = {
      active: "active",
      pending: "pending",
      expired: "expired",
      not_enrolled: "not enrolled",
      unknown: "unknown",
    };
    const days = snapExpiresWithinDays ? Number(snapExpiresWithinDays) : null;
    const display = labels[snapStatus] || snapStatus;
    const value = days != null && Number.isFinite(days)
      ? `${display} · expires ≤ ${days}d`
      : display;
    chips.push({
      key: "snapStatus",
      label: "SNAP",
      value,
      onRemove: () => url.setMany({ snapStatus: null, snapExpiresWithinDays: null }),
    });
  }
  if (ageMin || ageMax) {
    chips.push({
      key: "ageRange",
      label: "Age",
      value: `${ageMin || "0"}–${ageMax || "∞"}`,
      onRemove: () => url.setMany({ ageMin: null, ageMax: null }),
    });
  }
  if (createdWithinDays) {
    chips.push({
      key: "createdWithinDays",
      label: "Added",
      value: `last ${createdWithinDays}d`,
      onRemove: () => url.setOne("createdWithinDays", null),
    });
  }

  const applySavedView = (filters: Record<string, unknown>) => {
    const next: Record<string, string | string[] | null> = {
      search: null, status: null, mcoId: null, coordinatorIds: null,
      city: null, county: null, zipCode: null, snapStatus: null,
      snapExpiresWithinDays: null, ageMin: null, ageMax: null,
      createdWithinDays: null, sortOption: null,
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
      const r = await fetch(`/api/clients?${exportParams.toString()}`, { credentials: "include" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to export clients (${r.status})`);
      }
      const rows = (await r.json()) as Client[];
      if (rows.length === 0) {
        toast({ title: "No clients to export", description: "Adjust your filters and try again." });
        return;
      }
      if (rows.length >= 1000) {
        toast({
          title: "Preparing large export",
          description: `Downloading ${rows.length.toLocaleString()} clients — this may take a moment.`,
        });
      }
      downloadClientsCsv(rows, coordinators, mcos, visibility);
      toast({
        title: "Export ready",
        description: `Downloaded ${rows.length.toLocaleString()} client${rows.length === 1 ? "" : "s"}.`,
      });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err?.message || "Could not export clients.",
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
          title="Client Management"
          subtitle="Manage client profiles and care information"
        />
        
        {/* Header */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <OfficeSelector
              selectedOfficeId={selectedOfficeId === "all" ? undefined : selectedOfficeId}
              onOfficeChange={setSelectedOfficeId}
              showAllOption={true}
            />
          </div>
          <div className="flex items-center space-x-2">
            <ExcelExport type="clients" data={clients || []} disabled={isLoading} />
            <ExcelImport 
              type="clients" 
              officeId={selectedOfficeId !== "all" ? selectedOfficeId : undefined}
              onImportComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
                queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
              }} 
            />
            <ExcelImport 
              type="authorizations" 
              officeId={selectedOfficeId !== "all" ? selectedOfficeId : undefined}
              onImportComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/authorizations"] });
                queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
              }} 
            />
            <Button variant="outline" onClick={() => setShowOcrDialog(true)} data-testid="button-scan-client">
              <Scan className="w-4 h-4 mr-2" />
              Scan Document
            </Button>
            <Link href="/client-intake">
              <Button variant="outline" data-testid="button-client-intake">
                <ClipboardList className="w-4 h-4 mr-2" />
                Client Intake
              </Button>
            </Link>
            <Button onClick={() => setShowAddModal(true)} data-testid="button-add-client">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Bulk Actions Bar */}
            {selectedClientIds.size > 0 && (
              <Card className="bg-primary/10 border-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckSquare className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground" data-testid="text-selected-count">
                        {selectedClientIds.size} client{selectedClientIds.size > 1 ? "s" : ""} selected
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClientIds(new Set())}
                        data-testid="button-clear-selection"
                      >
                        Clear Selection
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowBulkUpdateModal(true)}
                        data-testid="button-bulk-update"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Bulk Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[260px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, member ID, HHA admission ID, address, city, or DOB…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-clients"
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="discharged">Discharged</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={mcoFilter}
                    onValueChange={(v) => url.setOne("mcoId", v === "all" ? null : v)}
                  >
                    <SelectTrigger className="w-[160px]" data-testid="select-mco-filter">
                      <SelectValue placeholder="MCO" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All MCOs</SelectItem>
                      {mcos.map((mco) => (
                        <SelectItem key={mco.id} value={mco.id}>
                          {mco.name}
                        </SelectItem>
                      ))}
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

                  <Input
                    placeholder="City"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="w-[140px]"
                    data-testid="input-city"
                  />
                  <Input
                    placeholder="County"
                    value={countyInput}
                    onChange={(e) => setCountyInput(e.target.value)}
                    className="w-[140px]"
                    data-testid="input-county"
                  />
                  <Input
                    placeholder="ZIP"
                    value={zipInput}
                    onChange={(e) => setZipInput(e.target.value)}
                    className="w-[100px]"
                    data-testid="input-zip"
                  />

                  <Select
                    value={snapStatus}
                    onValueChange={(v) => {
                      const clearWindow = v === "all" || v === "not_enrolled";
                      url.setMany({
                        snapStatus: v === "all" ? null : v,
                        ...(clearWindow ? { snapExpiresWithinDays: null } : {}),
                      });
                    }}
                  >
                    <SelectTrigger className="w-[140px]" data-testid="select-snap-status">
                      <SelectValue placeholder="SNAP" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All SNAP</SelectItem>
                      <SelectItem value="active">SNAP active</SelectItem>
                      <SelectItem value="pending">SNAP pending</SelectItem>
                      <SelectItem value="expired">SNAP expired</SelectItem>
                      <SelectItem value="not_enrolled">No SNAP</SelectItem>
                    </SelectContent>
                  </Select>

                  {snapStatus !== "all" && snapStatus !== "not_enrolled" && (
                    <Select
                      value={snapExpiresWithinDays || "any"}
                      onValueChange={(v) =>
                        url.setOne("snapExpiresWithinDays", v === "any" ? null : v)
                      }
                    >
                      <SelectTrigger className="w-[170px]" data-testid="select-snap-window">
                        <SelectValue placeholder="Expiry window" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any expiry</SelectItem>
                        <SelectItem value="0">Already expired</SelectItem>
                        <SelectItem value="30">≤ 30 days</SelectItem>
                        <SelectItem value="60">≤ 60 days</SelectItem>
                        <SelectItem value="90">≤ 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Min age"
                    value={ageMin}
                    onChange={(e) => url.setOne("ageMin", e.target.value || null)}
                    className="w-[100px]"
                    data-testid="input-age-min"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Max age"
                    value={ageMax}
                    onChange={(e) => url.setOne("ageMax", e.target.value || null)}
                    className="w-[100px]"
                    data-testid="input-age-max"
                  />

                  <Select
                    value={
                      !createdWithinDays
                        ? "any"
                        : ["7", "30", "90"].includes(createdWithinDays)
                          ? createdWithinDays
                          : "custom"
                    }
                    onValueChange={(v) => {
                      if (v === "any") url.setOne("createdWithinDays", null);
                      else if (v === "custom") {
                        // Default the custom field if there isn't already a value.
                        if (!createdWithinDays || ["7", "30", "90"].includes(createdWithinDays)) {
                          url.setOne("createdWithinDays", "14");
                        }
                      } else url.setOne("createdWithinDays", v);
                    }}
                  >
                    <SelectTrigger className="w-[160px]" data-testid="select-created-within">
                      <SelectValue placeholder="Recently added" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any time</SelectItem>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="custom">Custom…</SelectItem>
                    </SelectContent>
                  </Select>
                  {createdWithinDays && !["7", "30", "90"].includes(createdWithinDays) && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={3650}
                        value={createdWithinDays}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) {
                            url.setOne("createdWithinDays", null);
                          } else {
                            const n = Number(v);
                            if (Number.isFinite(n) && n >= 1 && n <= 3650) {
                              url.setOne("createdWithinDays", String(n));
                            }
                          }
                        }}
                        className="w-[80px]"
                        data-testid="input-created-within-days"
                      />
                      <span className="text-xs text-muted-foreground">days</span>
                    </div>
                  )}

                  <Select
                    value={sortOption}
                    onValueChange={(v) => url.setOne("sortOption", v === "nameAsc" ? null : v)}
                  >
                    <SelectTrigger className="w-[180px]" data-testid="select-sort-option">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nameAsc">Name (A-Z)</SelectItem>
                      <SelectItem value="nameDesc">Name (Z-A)</SelectItem>
                      <SelectItem value="dateDesc">Start Date (Newest)</SelectItem>
                      <SelectItem value="dateAsc">Start Date (Oldest)</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCsv}
                      disabled={isLoading || isExporting}
                      data-testid="button-export-csv"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting ? "Exporting…" : "Export CSV"}
                    </Button>
                    <SavedViewsMenu
                      views={savedViews}
                      currentFilters={activeFilters}
                      onApply={applySavedView}
                      onSave={(input) => saveView.mutateAsync(input)}
                      onDelete={(id) => deleteView.mutateAsync(id)}
                      onRename={(input) => renameView.mutateAsync(input)}
                    />
                    <ColumnsMenu
                      columns={CLIENT_COLUMN_DEFS}
                      visibility={visibility}
                      onChange={(next) => {
                        const sanitized = { ...next };
                        Array.from(REQUIRED_CLIENT_COLUMNS).forEach((k) => {
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
              </CardContent>
            </Card>

            {/* Client Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-clients">
                        {clients?.length || 0}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-active-clients-count">
                        {clients?.filter((c: Client) => c.status === "active").length || 0}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-accent-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-new-clients-month">
                        {clients?.filter((c: Client) => {
                          const createdAt = new Date(c.createdAt!);
                          const now = new Date();
                          return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
                        }).length || 0}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clients Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Clients</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="w-12 p-4">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all clients"
                            data-testid="checkbox-select-all"
                            className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                          />
                        </th>
                        {isVisible("info") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client Information</th>
                        )}
                        {isVisible("startDate") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Start Date</th>
                        )}
                        {isVisible("status") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                        )}
                        {isVisible("mco") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">MCO</th>
                        )}
                        {isVisible("phone") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Phone Number</th>
                        )}
                        {isVisible("coordinator") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Coordinator</th>
                        )}
                        {isVisible("actions") && (
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            Loading clients...
                          </td>
                        </tr>
                      ) : clients.length > 0 ? (
                        clients.map((client: Client) => {
                          const mcoName = client.mcoId ? mcos.find((m) => m.id === client.mcoId)?.name : null;
                          const coordinator = client.coordinatorId ? coordinators.find((c) => c.id === client.coordinatorId) : null;
                          const coordinatorName = coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : null;
                          return (
                            <tr
                              key={client.id}
                              className="hover:bg-muted/25 transition-colors"
                              data-testid={`row-client-details-${client.id}`}
                            >
                              <td className="p-4">
                                <Checkbox
                                  checked={selectedClientIds.has(client.id)}
                                  onCheckedChange={() => toggleClientSelection(client.id)}
                                  aria-label={`Select ${client.firstName} ${client.lastName}`}
                                  data-testid={`checkbox-select-client-${client.id}`}
                                />
                              </td>
                              {isVisible("info") && (
                                <td className="p-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                                      <span className="text-primary-foreground font-medium">
                                        {client.firstName?.[0]}{client.lastName?.[0]}
                                      </span>
                                    </div>
                                    <div>
                                      <p
                                        className="font-medium text-foreground hover:text-primary cursor-pointer hover:underline"
                                        onClick={() => navigate(`/clients/${client.id}`)}
                                        data-testid={`text-full-client-name-${client.id}`}
                                      >
                                        {client.firstName} {client.lastName}
                                      </p>
                                      <p className="text-sm text-muted-foreground" data-testid={`text-client-dob-${client.id}`}>
                                        DOB: {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "Not provided"}
                                      </p>
                                      <p className="text-xs text-muted-foreground" data-testid={`text-client-member-id-${client.id}`}>
                                        Member ID: {client.memberId || "Not provided"}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                              )}
                              {isVisible("startDate") && (
                                <td className="p-4">
                                  <p className="text-sm text-foreground" data-testid={`text-client-start-date-${client.id}`}>
                                    {client.serviceStartDate ? new Date(client.serviceStartDate).toLocaleDateString() : "Not set"}
                                  </p>
                                </td>
                              )}
                              {isVisible("status") && (
                                <td className="p-4">
                                  <Badge
                                    variant={client.status === "active" ? "default" : "secondary"}
                                    data-testid={`badge-detailed-client-status-${client.id}`}
                                  >
                                    {client.status}
                                  </Badge>
                                </td>
                              )}
                              {isVisible("mco") && (
                                <td className="p-4">
                                  <p className="text-sm text-foreground" data-testid={`text-client-mco-${client.id}`}>
                                    {mcoName || <span className="text-muted-foreground">—</span>}
                                  </p>
                                </td>
                              )}
                              {isVisible("phone") && (
                                <td className="p-4">
                                  <div className="flex items-center space-x-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm text-foreground" data-testid={`text-client-phone-${client.id}`}>
                                      {client.phone || <span className="text-muted-foreground">Not provided</span>}
                                    </p>
                                  </div>
                                </td>
                              )}
                              {isVisible("coordinator") && (
                                <td className="p-4">
                                  <p className="text-sm text-foreground" data-testid={`text-client-coordinator-${client.id}`}>
                                    {coordinatorName || <span className="text-muted-foreground">Unassigned</span>}
                                  </p>
                                </td>
                              )}
                              {isVisible("actions") && (
                                <td className="p-4">
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/clients/${client.id}`)}
                                      data-testid={`button-view-client-details-${client.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/clients/${client.id}`)}
                                      data-testid={`button-edit-client-details-${client.id}`}
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
                              ? "No clients match your filters"
                              : "No clients found"}
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
      <AddClientModal 
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setOcrExtractedData(null);
        }}
        onSubmit={handleAddClient}
        isLoading={createClientMutation.isPending}
        initialData={ocrExtractedData}
      />

      <ClientProfileModal 
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        onUpdate={handleUpdateClient}
        isLoading={updateClientMutation.isPending}
      />

      <OcrUploadDialog
        isOpen={showOcrDialog}
        onClose={() => setShowOcrDialog(false)}
        type="client"
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

      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        selectedCount={selectedClientIds.size}
        onSubmit={handleBulkUpdate}
        isLoading={bulkUpdateMutation.isPending}
      />
    </div>
  );
}
