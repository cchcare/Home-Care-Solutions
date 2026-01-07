import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Info,
  Loader2,
  ArrowRight,
  ArrowLeft,
  MapPin
} from "lucide-react";

interface SystemColumn {
  key: string;
  name: string;
  description: string;
  required: boolean;
}

interface TemplateInfo {
  systemColumns: SystemColumn[];
  tips: string[];
}

interface ParsedHeaders {
  headers: string[];
  previewRows: Array<{ [key: string]: any }>;
  suggestedMappings: { [key: string]: string | null };
  rowCount: number;
}

interface UploadResultRow {
  row: number;
  status: "created" | "updated" | "skipped" | "error";
  admissionId?: string;
  assignmentId?: string;
  clientName?: string;
  caregiverName?: string;
  message: string;
}

interface UploadResult {
  summary: {
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  results: UploadResultRow[];
}

type Step = "upload" | "mapping" | "result";

export default function VisitLogUpload() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<ParsedHeaders | null>(null);
  const [columnMappings, setColumnMappings] = useState<{ [key: string]: string }>({});

  const { data: templateInfo, isLoading: templateLoading, error: templateError } = useQuery<TemplateInfo>({
    queryKey: ["/api/admin/visit-log/template-info"],
  });

  const parseHeadersMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiRequest("POST", "/api/admin/visit-log/parse-headers", formData);
      return response.json();
    },
    onSuccess: (data: ParsedHeaders) => {
      setParsedHeaders(data);
      // Initialize mappings with suggestions
      const initialMappings: { [key: string]: string } = {};
      for (const [sysCol, excelCol] of Object.entries(data.suggestedMappings)) {
        if (excelCol) {
          initialMappings[sysCol] = excelCol;
        }
      }
      setColumnMappings(initialMappings);
      setStep("mapping");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Parse File",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, mappings }: { file: File; mappings: { [key: string]: string } }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mappings", JSON.stringify(mappings));
      const response = await apiRequest("POST", "/api/admin/visit-log/upload", formData);
      return response.json();
    },
    onSuccess: (data: UploadResult) => {
      setUploadResult(data);
      setStep("result");
      toast({
        title: "Upload Complete",
        description: `Processed ${data.summary.totalRows} rows: ${data.summary.created} created, ${data.summary.updated} updated, ${data.summary.errors} errors`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setUploadResult(null);
      setParsedHeaders(null);
      setColumnMappings({});
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: parseHeadersMutation.isPending || uploadMutation.isPending,
  });

  const handleParseHeaders = () => {
    if (selectedFile) {
      parseHeadersMutation.mutate(selectedFile);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({ file: selectedFile, mappings: columnMappings });
    }
  };

  const resetUpload = () => {
    setStep("upload");
    setSelectedFile(null);
    setUploadResult(null);
    setParsedHeaders(null);
    setColumnMappings({});
  };

  const updateMapping = (systemColumn: string, excelColumn: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [systemColumn]: excelColumn === "__none__" ? "" : excelColumn,
    }));
  };

  const getStatusBadge = (status: UploadResultRow["status"]) => {
    switch (status) {
      case "created":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100" data-testid="badge-status-created">
            <CheckCircle className="w-3 h-3 mr-1" />
            Created
          </Badge>
        );
      case "updated":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100" data-testid="badge-status-updated">
            <RefreshCw className="w-3 h-3 mr-1" />
            Updated
          </Badge>
        );
      case "skipped":
        return (
          <Badge variant="secondary" data-testid="badge-status-skipped">
            <AlertCircle className="w-3 h-3 mr-1" />
            Skipped
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" data-testid="badge-status-error">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const requiredMappings = templateInfo?.systemColumns.filter(c => c.required) || [];
  const hasRequiredMappings = requiredMappings.every(col => columnMappings[col.key]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Visit Log Upload"
          subtitle="Upload Excel spreadsheets to import visit logs"
        />
        
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === "upload" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-sm font-medium">1</span>
                <span className="font-medium">Upload</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === "mapping" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-sm font-medium">2</span>
                <span className="font-medium">Map Columns</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === "result" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-sm font-medium">3</span>
                <span className="font-medium">Results</span>
              </div>
            </div>

            {step === "upload" && (
              <>
                <Card data-testid="card-template-info">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Expected Columns
                    </CardTitle>
                    <CardDescription>
                      Your Excel file should contain these columns (you'll map them in the next step)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {templateLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ) : templateError ? (
                      <div className="text-destructive" data-testid="text-template-error">
                        Failed to load template information. Please try again.
                      </div>
                    ) : templateInfo ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {templateInfo.systemColumns.map((col) => (
                            <div 
                              key={col.key} 
                              className={`p-3 rounded-lg border ${col.required ? 'border-green-200 bg-green-50' : 'border-muted bg-muted/30'}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{col.name}</span>
                                {col.required && (
                                  <Badge variant="outline" className="text-xs border-green-500 text-green-700">Required</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{col.description}</p>
                            </div>
                          ))}
                        </div>
                        {templateInfo.tips && templateInfo.tips.length > 0 && (
                          <div className="mt-4 p-3 bg-muted rounded-md">
                            <h4 className="font-semibold text-sm mb-2">Tips</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                              {templateInfo.tips.map((tip, i) => (
                                <li key={i}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card data-testid="card-upload">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Upload File
                    </CardTitle>
                    <CardDescription>
                      Drag and drop an Excel file or click to browse
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        isDragActive
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-primary/50"
                      } ${parseHeadersMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                      data-testid="dropzone"
                    >
                      <input {...getInputProps()} data-testid="input-file" />
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      {isDragActive ? (
                        <p className="text-primary font-medium">Drop the file here...</p>
                      ) : selectedFile ? (
                        <div>
                          <p className="font-medium text-foreground" data-testid="text-selected-file">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-foreground">Drop Excel file here or click to browse</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Supports .xlsx and .xls files
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={handleParseHeaders}
                        disabled={!selectedFile || parseHeadersMutation.isPending}
                        className="flex-1"
                        data-testid="button-continue"
                      >
                        {parseHeadersMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Reading File...
                          </>
                        ) : (
                          <>
                            Continue to Column Mapping
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {step === "mapping" && parsedHeaders && (
              <>
                <Card data-testid="card-mapping">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Map Your Columns
                    </CardTitle>
                    <CardDescription>
                      Match your Excel columns to the system fields. We've suggested some mappings based on column names.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templateInfo?.systemColumns.map((sysCol) => (
                          <div key={sysCol.key} className="flex items-center gap-4 p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{sysCol.name}</span>
                                {sysCol.required && (
                                  <Badge variant="outline" className="text-xs border-red-500 text-red-700">Required</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{sysCol.description}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <Select
                              value={columnMappings[sysCol.key] || "__none__"}
                              onValueChange={(value) => updateMapping(sysCol.key, value)}
                            >
                              <SelectTrigger className="w-[200px]" data-testid={`select-mapping-${sysCol.key}`}>
                                <SelectValue placeholder="Select column..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">-- Not Mapped --</SelectItem>
                                {parsedHeaders.headers.map((header) => (
                                  <SelectItem key={header} value={header}>
                                    {header}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>

                      {!hasRequiredMappings && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                          <AlertCircle className="w-4 h-4 inline mr-2" />
                          Please map all required columns before continuing.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-preview">
                  <CardHeader>
                    <CardTitle>Data Preview</CardTitle>
                    <CardDescription>
                      First {parsedHeaders.previewRows.length} rows of {parsedHeaders.rowCount} total rows
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {parsedHeaders.headers.map((header) => (
                              <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedHeaders.previewRows.map((row, index) => (
                            <TableRow key={index}>
                              {parsedHeaders.headers.map((header) => (
                                <TableCell key={header} className="whitespace-nowrap">
                                  {String(row[header] || '').substring(0, 30)}
                                  {String(row[header] || '').length > 30 ? '...' : ''}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("upload")}
                    disabled={uploadMutation.isPending}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!hasRequiredMappings || uploadMutation.isPending}
                    className="flex-1"
                    data-testid="button-upload"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload and Process
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {step === "result" && uploadResult && (
              <>
                <Card data-testid="card-summary">
                  <CardHeader>
                    <CardTitle>Upload Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg" data-testid="summary-total">
                        <div className="text-2xl font-bold">{uploadResult.summary.totalRows}</div>
                        <div className="text-sm text-muted-foreground">Total Rows</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg" data-testid="summary-created">
                        <div className="text-2xl font-bold text-green-600">{uploadResult.summary.created}</div>
                        <div className="text-sm text-green-700">Created</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg" data-testid="summary-updated">
                        <div className="text-2xl font-bold text-blue-600">{uploadResult.summary.updated}</div>
                        <div className="text-sm text-blue-700">Updated</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg" data-testid="summary-skipped">
                        <div className="text-2xl font-bold text-gray-600">{uploadResult.summary.skipped}</div>
                        <div className="text-sm text-gray-700">Skipped</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg" data-testid="summary-errors">
                        <div className="text-2xl font-bold text-red-600">{uploadResult.summary.errors}</div>
                        <div className="text-sm text-red-700">Errors</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-results">
                  <CardHeader>
                    <CardTitle>Row-by-Row Results</CardTitle>
                    <CardDescription>
                      Detailed results for each row in the uploaded file
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Row</TableHead>
                            <TableHead className="w-28">Status</TableHead>
                            <TableHead>Admission ID</TableHead>
                            <TableHead>Assignment ID</TableHead>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Caregiver Name</TableHead>
                            <TableHead>Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadResult.results.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No results to display
                              </TableCell>
                            </TableRow>
                          ) : (
                            uploadResult.results.map((result, index) => (
                              <TableRow 
                                key={index} 
                                className={
                                  result.status === "error" 
                                    ? "bg-red-50/50" 
                                    : result.status === "created" 
                                    ? "bg-green-50/50" 
                                    : result.status === "updated" 
                                    ? "bg-blue-50/50" 
                                    : ""
                                }
                                data-testid={`row-result-${index}`}
                              >
                                <TableCell className="font-mono text-sm">{result.row}</TableCell>
                                <TableCell>{getStatusBadge(result.status)}</TableCell>
                                <TableCell className="font-mono text-sm" data-testid={`text-admission-id-${index}`}>
                                  {result.admissionId || "-"}
                                </TableCell>
                                <TableCell className="font-mono text-sm" data-testid={`text-assignment-id-${index}`}>
                                  {result.assignmentId || "-"}
                                </TableCell>
                                <TableCell data-testid={`text-client-name-${index}`}>
                                  {result.clientName || "-"}
                                </TableCell>
                                <TableCell data-testid={`text-caregiver-name-${index}`}>
                                  {result.caregiverName || "-"}
                                </TableCell>
                                <TableCell className="text-sm max-w-xs truncate" title={result.message} data-testid={`text-message-${index}`}>
                                  {result.message}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                  <Button onClick={resetUpload} data-testid="button-reset">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Upload Another File
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
