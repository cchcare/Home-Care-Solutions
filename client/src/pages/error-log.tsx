import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ScrollText,
  Download,
  Trash2,
  Upload,
  RefreshCw,
  AlertCircle,
  Search,
  X,
  FileText,
  CheckSquare,
  Square,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

interface ApiErrorLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  errorMessage: string;
  statusCode?: number;
  userId?: string;
}

function getStatusBadge(statusCode?: number) {
  if (!statusCode) return <Badge variant="outline" className="text-xs">N/A</Badge>;
  if (statusCode >= 500) return <Badge className="text-xs bg-red-600 text-white">{statusCode}</Badge>;
  if (statusCode >= 400) return <Badge className="text-xs bg-amber-500 text-white">{statusCode}</Badge>;
  return <Badge className="text-xs bg-blue-500 text-white">{statusCode}</Badge>;
}

function getMethodBadge(method: string) {
  const colors: Record<string, string> = {
    GET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    PATCH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return (
    <Badge variant="outline" className={`text-xs font-mono ${colors[method] || ""}`}>
      {method}
    </Badge>
  );
}

export default function ErrorLog() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ parsed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: logs = [], isLoading, refetch } = useQuery<ApiErrorLog[]>({
    queryKey: ["/api/ai-issues/error-logs"],
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiRequest("DELETE", "/api/ai-issues/error-logs", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-issues/error-logs"] });
      setSelected(new Set());
      toast({ title: "Deleted", description: "Selected logs removed." });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete logs.", variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ content, filename }: { content: string; filename: string }) =>
      apiRequest("POST", "/api/ai-issues/error-logs/upload", { content, filename }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/ai-issues/error-logs"] });
      setUploadResult({ parsed: data.parsed });
      toast({
        title: "Log file imported",
        description: `${data.parsed} error entries extracted and added to the log.`,
      });
    },
    onError: () => toast({ title: "Upload failed", description: "Could not parse the log file.", variant: "destructive" }),
  });

  const filtered = logs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.endpoint.toLowerCase().includes(q) ||
      log.errorMessage.toLowerCase().includes(q) ||
      log.method.toLowerCase().includes(q) ||
      String(log.statusCode ?? "").includes(q)
    );
  });

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadLogs = (format: "json" | "csv") => {
    const target = someSelected
      ? logs.filter((l) => selected.has(l.id))
      : filtered;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(target, null, 2)], { type: "application/json" });
      triggerDownload(blob, "error-logs.json");
    } else {
      const header = "id,timestamp,method,endpoint,statusCode,errorMessage,userId";
      const rows = target.map((l) =>
        [
          l.id,
          l.timestamp,
          l.method,
          `"${l.endpoint}"`,
          l.statusCode ?? "",
          `"${l.errorMessage.replace(/"/g, '""')}"`,
          l.userId ?? "",
        ].join(",")
      );
      const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
      triggerDownload(blob, "error-logs.csv");
    }
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      uploadMutation.mutate({ content, filename: file.name });
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-3">
            <ScrollText className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Error Log</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                API errors silently captured in real time. Export or diagnose issues from here.
              </p>
            </div>
          </div>

          {/* Upload zone */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Log File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 dark:border-gray-600 hover:border-primary/60"
                }`}
              >
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {uploadMutation.isPending ? "Parsing file…" : "Drop a log file here or click to browse"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports .log, .txt, or newline-delimited JSON. Errors and warnings are extracted automatically.
                </p>
                {uploadResult && (
                  <p className="text-xs mt-2 text-green-600 dark:text-green-400 font-medium">
                    ✓ Last import: {uploadResult.parsed} entries parsed
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".log,.txt,.json,.ndjson"
                className="hidden"
                onChange={handleFileChange}
              />
            </CardContent>
          </Card>

          {/* Log table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Captured Errors
                  <Badge variant="secondary" className="text-xs">{logs.length}</Badge>
                </CardTitle>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filter by endpoint, message…"
                      className="pl-8 h-8 text-sm w-48"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Refresh
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => downloadLogs("json")} className="h-8">
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        JSON
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {someSelected ? `Download ${selected.size} selected as JSON` : "Download all filtered logs as JSON"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => downloadLogs("csv")} className="h-8">
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        CSV
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {someSelected ? `Download ${selected.size} selected as CSV` : "Download all filtered logs as CSV"}
                    </TooltipContent>
                  </Tooltip>
                  {someSelected && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="h-8"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete ({selected.size})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-gray-500">Loading error logs…</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center">
                  <ScrollText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    {search ? "No errors match your filter." : "No errors logged yet. Errors are captured silently when API calls fail."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                        <TableHead className="w-10 pl-4">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead className="text-xs">Timestamp</TableHead>
                        <TableHead className="text-xs">Method</TableHead>
                        <TableHead className="text-xs">Endpoint</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Error Message</TableHead>
                        <TableHead className="text-xs">User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((log) => (
                        <>
                          <TableRow
                            key={log.id}
                            className={`cursor-pointer text-xs transition-colors ${
                              selected.has(log.id) ? "bg-primary/5" : "hover:bg-gray-50 dark:hover:bg-gray-900/40"
                            }`}
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          >
                            <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selected.has(log.id)}
                                onCheckedChange={() => toggleOne(log.id)}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-gray-500 font-mono text-[11px]">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>{getMethodBadge(log.method)}</TableCell>
                            <TableCell className="font-mono max-w-[180px] truncate text-gray-700 dark:text-gray-300">
                              {log.endpoint}
                            </TableCell>
                            <TableCell>{getStatusBadge(log.statusCode)}</TableCell>
                            <TableCell className="max-w-[280px] truncate text-gray-600 dark:text-gray-400">
                              {log.errorMessage}
                            </TableCell>
                            <TableCell className="text-gray-400 font-mono text-[11px]">
                              {log.userId ? log.userId.substring(0, 8) + "…" : "—"}
                            </TableCell>
                          </TableRow>
                          {expandedId === log.id && (
                            <TableRow key={`${log.id}-expanded`} className="bg-gray-50 dark:bg-gray-900/60">
                              <TableCell colSpan={7} className="px-6 py-3">
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Full error message</p>
                                  <pre className="text-[11px] font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 whitespace-pre-wrap break-all text-red-700 dark:text-red-400 max-h-48 overflow-y-auto">
                                    {log.errorMessage}
                                  </pre>
                                  <div className="flex gap-6 text-[11px] text-gray-500">
                                    <span><span className="font-medium">ID:</span> {log.id}</span>
                                    {log.userId && <span><span className="font-medium">User ID:</span> {log.userId}</span>}
                                    <span><span className="font-medium">Endpoint:</span> {log.endpoint}</span>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} log{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected error log entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(Array.from(selected));
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
