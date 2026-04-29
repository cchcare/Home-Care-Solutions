import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ExcelJS from "exceljs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MapPin,
  X,
  IdCard,
} from "lucide-react";

interface IdentifierImportDialogProps {
  onImportComplete?: () => void;
}

interface RowResult {
  row: number;
  status: "updated" | "skipped" | "error";
  caregiverId?: string;
  caregiverName?: string;
  npiUpdated?: boolean;
  certificationCreated?: boolean;
  certificationUpdated?: boolean;
  message?: string;
}

interface ImportSummary {
  totalRows: number;
  caregiversUpdated: number;
  npisUpdated: number;
  certificatesCreated: number;
  certificatesUpdated: number;
  errors: number;
  results: RowResult[];
}

interface SystemField {
  key: "employeeId" | "email" | "npi" | "licenseNumber" | "certificationType";
  label: string;
  required: boolean;
  description: string;
  aliases: string[];
}

const FIELDS: SystemField[] = [
  {
    key: "employeeId",
    label: "Employee ID",
    required: false,
    description: "Used to match an existing caregiver. Either Employee ID or Email is required per row.",
    aliases: ["employee id", "employeeid", "employee_id", "emp id", "empid", "staff id", "staffid"],
  },
  {
    key: "email",
    label: "Email",
    required: false,
    description: "Used to match an existing caregiver if Employee ID is not present.",
    aliases: ["email", "email address", "e-mail"],
  },
  {
    key: "npi",
    label: "NPI",
    required: false,
    description: "10-digit National Provider Identifier. Either NPI or License Number is required per row.",
    aliases: ["npi", "npi number", "national provider identifier", "national provider id"],
  },
  {
    key: "licenseNumber",
    label: "License Number",
    required: false,
    description: "License/certificate number. Will create or update a certificate of the chosen type.",
    aliases: [
      "license number",
      "license #",
      "license no",
      "licensenumber",
      "license_no",
      "certificate number",
      "certificatenumber",
      "cert number",
      "cert no",
    ],
  },
  {
    key: "certificationType",
    label: "Certification Type",
    required: false,
    description: "Type of certification for the License Number (e.g., RN, LPN, CNA). Defaults to \"License\" if blank.",
    aliases: [
      "certification type",
      "cert type",
      "license type",
      "certificationtype",
      "type",
      "credential",
      "credential type",
    ],
  },
];

type ColumnMappings = Partial<Record<SystemField["key"], string>>;

function excelDateToJSDate(excelDate: number): Date {
  const baseDate = new Date(1899, 11, 30);
  return new Date(baseDate.getTime() + excelDate * 86400000);
}

function cellToString(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return cellToString((value as any).result);
    if ("richText" in value && Array.isArray((value as any).richText)) {
      return (value as any).richText.map((r: any) => r.text || "").join("").trim();
    }
    if ("hyperlink" in value && typeof (value as any).hyperlink === "string") {
      return (value as any).hyperlink.replace(/^mailto:/i, "").trim();
    }
    if ("formula" in value && (value as any).result != null) {
      return cellToString((value as any).result);
    }
  }
  return String(value).trim();
}

function suggestMapping(header: string): SystemField["key"] | null {
  const normalized = header.toLowerCase().trim();
  if (!normalized) return null;
  for (const field of FIELDS) {
    if (field.aliases.some((a) => a === normalized)) return field.key;
  }
  return null;
}

// More forgiving than `suggestMapping`: returns the field a column appears to
// belong to even when the header doesn't exactly match a known alias. Used to
// flag suspicious unmapped columns so users have to explicitly map or ignore
// them (instead of accidentally dropping identifiers on the floor).
function looksLikeKnownField(header: string): SystemField["key"] | null {
  const exact = suggestMapping(header);
  if (exact) return exact;
  const lower = header.toLowerCase().trim();
  if (!lower) return null;
  if (/\bnpi\b/.test(lower)) return "npi";
  if (/\b(license|cert(ificate)?|credential)\b/.test(lower)) {
    if (/\btype\b/.test(lower)) return "certificationType";
    return "licenseNumber";
  }
  if (/\b(employee|emp|staff|worker|personnel)\b/.test(lower) && /(id|number|no|#|code)/.test(lower)) {
    return "employeeId";
  }
  if (/email/.test(lower) || /\be[\s-]?mail\b/.test(lower)) return "email";
  return null;
}

async function parseFile(
  file: File,
): Promise<{ headers: string[]; rows: string[][] }> {
  const buffer = await file.arrayBuffer();
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".csv")) {
    const text = new TextDecoder().decode(buffer);
    return parseCsv(text);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheet found in the file");

  const headers: string[] = [];
  const rows: string[][] = [];

  worksheet.eachRow((row, rowNumber) => {
    const rowValues = row.values as any[];
    const values = rowValues.slice(1);
    if (rowNumber === 1) {
      values.forEach((cell) => headers.push(cellToString(cell)));
    } else {
      rows.push(values.map((v) => cellToString(v)));
    }
  });

  // Pad short rows so they line up with headers.
  for (const row of rows) {
    while (row.length < headers.length) row.push("");
  }
  return { headers, rows: rows.filter((r) => r.some((v) => v && v.length > 0)) };
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        current.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        current.push(field);
        lines.push(current);
        current = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    lines.push(current);
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = (lines[0] || []).map((h) => (h || "").trim());
  const rows = lines.slice(1).filter((r) => r.some((v) => (v || "").trim().length > 0));
  for (const row of rows) {
    while (row.length < headers.length) row.push("");
  }
  return { headers, rows };
}

export function IdentifierImportDialog({ onImportComplete }: IdentifierImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMappings>({});
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [dismissedHeaders, setDismissedHeaders] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (payload: {
      rows: Record<string, string>[];
      unmappedRequiredHeaders: string[];
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/caregivers/bulk-import-identifiers",
        payload,
      );
      return response.json() as Promise<ImportSummary>;
    },
    onSuccess: (summary) => {
      setResult(summary);
      setStep("result");
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers"] });
      onImportComplete?.();
      if (summary.errors === 0) {
        toast({
          title: "Identifiers imported",
          description: `Updated ${summary.caregiversUpdated} caregiver${
            summary.caregiversUpdated === 1 ? "" : "s"
          } (${summary.npisUpdated} NPIs, ${summary.certificatesCreated + summary.certificatesUpdated} licenses)`,
        });
      } else {
        toast({
          title: "Import completed with errors",
          description: `${summary.caregiversUpdated} caregivers updated, ${summary.errors} rows had problems`,
          variant: "destructive",
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Import failed",
        description: err?.message || "Could not import identifiers",
        variant: "destructive",
      });
    },
  });

  const reset = () => {
    setStep("upload");
    setSelectedFile(null);
    setHeaders([]);
    setRows([]);
    setMappings({});
    setPreview([]);
    setResult(null);
    setDismissedHeaders(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeDialog = () => {
    setIsOpen(false);
    reset();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
      toast({
        title: "Unsupported file",
        description: "Please choose a .xlsx or .csv file",
        variant: "destructive",
      });
      return;
    }
    try {
      const { headers, rows } = await parseFile(file);
      if (headers.length === 0 || rows.length === 0) {
        toast({
          title: "File appears empty",
          description: "We couldn't find any data rows below the header row.",
          variant: "destructive",
        });
        return;
      }
      const initial: ColumnMappings = {};
      for (const field of FIELDS) {
        const matched = headers.find((h) => suggestMapping(h) === field.key);
        if (matched) initial[field.key] = matched;
      }
      setSelectedFile(file);
      setHeaders(headers);
      setRows(rows);
      setMappings(initial);
      setStep("mapping");
    } catch (err: any) {
      toast({
        title: "Could not read file",
        description: err?.message || "The spreadsheet could not be parsed.",
        variant: "destructive",
      });
    }
  };

  const updateMapping = (key: SystemField["key"], header: string) => {
    setMappings((prev) => ({
      ...prev,
      [key]: header === "__skip__" ? undefined : header,
    }));
  };

  const buildRowObjects = (): Record<string, string>[] => {
    return rows.map((row) => {
      const obj: Record<string, string> = {};
      for (const field of FIELDS) {
        const headerName = mappings[field.key];
        if (!headerName) continue;
        const colIndex = headers.indexOf(headerName);
        if (colIndex < 0) continue;
        const raw = row[colIndex];
        let value = typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw).trim();
        // For NPIs that came in as numbers, strip stray punctuation.
        if (field.key === "npi") value = value.replace(/[^0-9]/g, "");
        if (value) obj[field.key] = value;
      }
      return obj;
    });
  };

  const hasIdentifierMapped = !!(mappings.npi || mappings.licenseNumber);
  const hasMatcherMapped = !!(mappings.employeeId || mappings.email);
  const missingRequirementLabels: string[] = [];
  if (!hasIdentifierMapped) missingRequirementLabels.push("NPI or License Number");
  if (!hasMatcherMapped) missingRequirementLabels.push("Employee ID or Email");

  // Detect mapping mismatches: headers in the file that look like they
  // belong to a known field but were left unmapped. The user must either
  // map them to a field or explicitly ignore them - we refuse to silently
  // skip likely identifier columns.
  const mappedHeaderSet = new Set(Object.values(mappings).filter(Boolean) as string[]);
  const suspiciousUnmapped = headers
    .filter((h) => h && !mappedHeaderSet.has(h))
    .map((h) => ({ header: h, suggestion: looksLikeKnownField(h) }))
    .filter((x): x is { header: string; suggestion: SystemField["key"] } => !!x.suggestion);
  const unresolvedSuspicious = suspiciousUnmapped.filter(
    (u) => !dismissedHeaders.has(u.header),
  );

  const canPreview =
    missingRequirementLabels.length === 0 && unresolvedSuspicious.length === 0;

  // Headers we'll send to the server alongside the row payload so the
  // backend can reject the import if the UI was somehow bypassed.
  const unmappedRequiredHeaders: string[] = [
    ...missingRequirementLabels,
    ...unresolvedSuspicious.map((u) => `"${u.header}" looks like ${
      FIELDS.find((f) => f.key === u.suggestion)?.label
    }`),
  ];

  const handleContinueToPreview = () => {
    if (!canPreview) return;
    const rowObjects = buildRowObjects();
    setPreview(rowObjects.slice(0, 5));
    setStep("preview");
  };

  const handleImport = () => {
    const rowObjects = buildRowObjects();
    importMutation.mutate({
      rows: rowObjects,
      unmappedRequiredHeaders,
    });
  };

  const ignoreHeader = (header: string) => {
    setDismissedHeaders((prev) => {
      const next = new Set(prev);
      next.add(header);
      return next;
    });
  };

  const restoreHeader = (header: string) => {
    setDismissedHeaders((prev) => {
      const next = new Set(prev);
      next.delete(header);
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : closeDialog())}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-import-identifiers">
          <IdCard className="w-4 h-4 mr-2" />
          Import Identifiers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Caregiver Identifiers</DialogTitle>
          <DialogDescription>
            Bulk-update existing caregivers with NPI and license/certificate numbers from a CSV or
            Excel file. Caregivers are matched by Employee ID or Email.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-2 text-xs">
          {(["upload", "mapping", "preview", "result"] as const).map((s, idx, arr) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`px-3 py-1 rounded-full font-medium ${
                  step === s ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {idx + 1}.{" "}
                {s === "upload"
                  ? "Upload"
                  : s === "mapping"
                  ? "Map Columns"
                  : s === "preview"
                  ? "Preview"
                  : "Results"}
              </div>
              {idx < arr.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="identifier-file" className="cursor-pointer">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Click to choose a CSV or Excel file</p>
                  <p className="text-xs text-muted-foreground">.csv and .xlsx are supported</p>
                </div>
              </Label>
              <Input
                id="identifier-file"
                type="file"
                accept=".xlsx,.csv"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-identifier-file"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Columns this importer understands</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {FIELDS.map((f) => (
                  <div key={f.key} className="flex items-start gap-2">
                    <Badge variant="outline" className="text-[10px] py-0">{f.label}</Badge>
                    <span className="text-muted-foreground">{f.description}</span>
                  </div>
                ))}
                <p className="pt-2 text-muted-foreground">
                  Each row needs one matcher column (Employee ID or Email) and one identifier
                  column (NPI or License Number).
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <h3 className="text-sm font-medium">Map Your Columns</h3>
                {selectedFile && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedFile.name} · {rows.length} rows)
                  </span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <X className="w-4 h-4 mr-2" /> Change file
              </Button>
            </div>

            <div className="grid gap-2">
              {FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center gap-3 p-2 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{field.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Select
                    value={mappings[field.key] || "__skip__"}
                    onValueChange={(v) => updateMapping(field.key, v)}
                  >
                    <SelectTrigger
                      className="w-[220px]"
                      data-testid={`select-mapping-${field.key}`}
                    >
                      <SelectValue placeholder="Skip this field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">— Skip this field —</SelectItem>
                      {headers.filter((h) => h && h.trim()).map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {missingRequirementLabels.length > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Map at least: {missingRequirementLabels.join(" and ")}.
              </div>
            )}

            {suspiciousUnmapped.length > 0 && (
              <div
                className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg text-orange-800 dark:text-orange-200 text-sm space-y-2"
                data-testid="warning-unmapped-headers"
              >
                <div className="font-medium">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Resolve these likely-identifier columns before continuing:
                </div>
                <ul className="space-y-1 ml-7 text-xs">
                  {suspiciousUnmapped.map((u) => {
                    const isDismissed = dismissedHeaders.has(u.header);
                    const suggestionLabel = FIELDS.find((f) => f.key === u.suggestion)?.label;
                    return (
                      <li
                        key={u.header}
                        className="flex items-center gap-2"
                        data-testid={`unmapped-header-${u.header}`}
                      >
                        <span className="flex-1">
                          "{u.header}" — looks like {suggestionLabel}
                          {isDismissed && (
                            <span className="ml-2 italic text-orange-700 dark:text-orange-300">
                              (will be ignored)
                            </span>
                          )}
                        </span>
                        {!isDismissed ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => ignoreHeader(u.header)}
                            data-testid={`button-ignore-header-${u.header}`}
                          >
                            Ignore this column
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => restoreHeader(u.header)}
                            data-testid={`button-restore-header-${u.header}`}
                          >
                            Undo
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs">
                  Either map the column to a field above or click "Ignore this column" to confirm
                  you want to leave it out.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button
                onClick={handleContinueToPreview}
                disabled={!canPreview}
                data-testid="button-continue-preview"
              >
                Continue to Preview <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Preview (first 5 rows of {rows.length})</h3>
              <Button variant="outline" size="sm" onClick={() => setStep("mapping")}>
                Back to mapping
              </Button>
            </div>
            <div className="rounded border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {FIELDS.filter((f) => mappings[f.key]).map((f) => (
                      <TableHead key={f.key}>{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {FIELDS.filter((f) => mappings[f.key]).map((f) => (
                        <TableCell key={f.key} className="text-sm">
                          {row[f.key] || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog} disabled={importMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? "Importing…" : `Import ${rows.length} rows`}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <SummaryStat label="Rows processed" value={result.totalRows} />
              <SummaryStat label="Caregivers updated" value={result.caregiversUpdated} />
              <SummaryStat label="NPIs set" value={result.npisUpdated} />
              <SummaryStat
                label="Licenses added/updated"
                value={result.certificatesCreated + result.certificatesUpdated}
              />
              <SummaryStat label="Errors" value={result.errors} highlight={result.errors > 0} />
            </div>

            <div className="rounded border max-h-[360px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Caregiver</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.results.map((r) => (
                    <TableRow key={r.row} data-testid={`row-result-${r.row}`}>
                      <TableCell className="font-mono text-xs">{r.row}</TableCell>
                      <TableCell>
                        {r.status === "updated" && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Updated
                          </Badge>
                        )}
                        {r.status === "skipped" && (
                          <Badge variant="outline">No change</Badge>
                        )}
                        {r.status === "error" && (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" /> Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.caregiverName || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.status === "updated" && (
                          <>
                            {r.npiUpdated && <span className="mr-2">NPI updated</span>}
                            {r.certificationCreated && (
                              <span className="mr-2">License added</span>
                            )}
                            {r.certificationUpdated && (
                              <span className="mr-2">License updated</span>
                            )}
                          </>
                        )}
                        {r.status !== "updated" && r.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset} data-testid="button-import-another">
                Import another file
              </Button>
              <Button onClick={closeDialog} data-testid="button-close-import">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        highlight ? "border-destructive/40 bg-destructive/5" : ""
      }`}
    >
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
