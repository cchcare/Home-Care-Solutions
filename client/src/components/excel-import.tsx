import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, ArrowRight, MapPin, Loader2 } from "lucide-react";
import ExcelJS from "exceljs";

interface ExcelImportProps {
  type: "clients" | "caregivers" | "users" | "authorizations";
  onImportComplete?: () => void;
  officeId?: string;
}

interface ImportResult {
  totalRows: number;
  successfulImports: number;
  updatedRecords?: number;
  createdRecords?: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

interface SystemField {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
}

const SYSTEM_FIELDS: Record<string, SystemField[]> = {
  clients: [
    { key: "firstName", label: "First Name", required: true, aliases: ["First Name", "first_name", "firstName"] },
    { key: "lastName", label: "Last Name", required: true, aliases: ["Last Name", "last_name", "lastName"] },
    { key: "memberId", label: "Member ID", aliases: ["Member ID", "member_id", "memberId", "MemberID"] },
    { key: "dateOfBirth", label: "Date of Birth", aliases: ["Date of Birth", "DOB", "date_of_birth", "dateOfBirth"] },
    { key: "phone", label: "Phone", aliases: ["Phone", "phone", "Phone Number", "phone_number"] },
    { key: "email", label: "Email", aliases: ["Email", "email", "Email Address", "email_address"] },
    { key: "address", label: "Street Address", aliases: ["Address", "address", "Street Address", "street_address", "streetAddress"] },
    { key: "address2", label: "Street Address 2", aliases: ["Address 2", "address2", "Street Address 2", "Apt", "Suite", "Unit"] },
    { key: "city", label: "City", aliases: ["City", "city"] },
    { key: "state", label: "State", aliases: ["State", "state"] },
    { key: "zipCode", label: "Zip Code", aliases: ["Zip Code", "zip_code", "zipCode", "Zip", "Postal Code", "postal_code"] },
    { key: "emergencyContactName", label: "Emergency Contact Name", aliases: ["Emergency Contact Name", "emergency_contact_name", "emergencyContactName", "Emergency Contact"] },
    { key: "emergencyContactPhone", label: "Emergency Contact Phone", aliases: ["Emergency Contact Phone", "emergency_contact_phone", "emergencyContactPhone"] },
    { key: "emergencyContactRelation", label: "Emergency Contact Relation", aliases: ["Emergency Contact Relation", "emergency_contact_relation", "emergencyContactRelation", "Relationship"] },
    { key: "medicalConditions", label: "Medical Conditions", aliases: ["Medical Conditions", "medical_conditions", "medicalConditions"] },
    { key: "medications", label: "Medications", aliases: ["Medications", "medications"] },
    { key: "allergies", label: "Allergies", aliases: ["Allergies", "allergies"] },
    { key: "dietaryRestrictions", label: "Dietary Restrictions", aliases: ["Dietary Restrictions", "dietary_restrictions", "dietaryRestrictions"] },
    { key: "county", label: "County", aliases: ["County", "county"] },
    { key: "mco", label: "MCO", aliases: ["MCO", "mco", "Insurance Provider", "insurance_provider", "insuranceProvider", "Insurance", "Managed Care Organization", "Payer"] },
    { key: "serviceStartDate", label: "Service Start Date", aliases: ["Service Start Date", "service_start_date", "serviceStartDate", "Start Date", "Start of Service", "SOC", "SOC Date"] },
    { key: "hhaxAdmissionId", label: "HHA Admission ID", aliases: ["HHA Admission ID", "HHAX Admission ID", "hhax_admission_id", "hhaxAdmissionId", "HHAX ID", "Admission ID", "AdmissionID"] }
  ],
  caregivers: [
    { key: "hhaxCaregiverCode", label: "HHAX ID", aliases: ["HHAX ID", "hhax_id", "hhaxId", "HHAX Caregiver Code", "hhax_caregiver_code", "hhaxCaregiverCode", "HHAXCode"] },
    { key: "assignmentId", label: "Assignment ID", aliases: ["Assignment ID", "assignment_id", "assignmentId", "AssignmentID"] },
    { key: "adpCode", label: "ADP ID", aliases: ["ADP ID", "adp_id", "adpId", "ADP Code", "adp_code", "adpCode", "ADPID"] },
    { key: "employeeId", label: "Employee ID", aliases: ["Employee ID", "employee_id", "employeeId"] },
    { key: "firstName", label: "First Name", required: true, aliases: ["First Name", "first_name", "firstName"] },
    { key: "lastName", label: "Last Name", required: true, aliases: ["Last Name", "last_name", "lastName"] },
    { key: "phone", label: "Phone", aliases: ["Phone", "phone", "Phone Number", "phone_number"] },
    { key: "email", label: "Email", aliases: ["Email", "email", "Email Address", "email_address"] },
    { key: "address", label: "Street Address", aliases: ["Address", "address", "Street Address", "street_address", "streetAddress"] },
    { key: "address2", label: "Street Address 2", aliases: ["Address 2", "address2", "Street Address 2", "Apt", "Suite", "Unit"] },
    { key: "city", label: "City", aliases: ["City", "city"] },
    { key: "state", label: "State", aliases: ["State", "state"] },
    { key: "zipCode", label: "Zip Code", aliases: ["Zip Code", "zip_code", "zipCode", "Zip", "Postal Code", "postal_code"] },
    { key: "dateOfBirth", label: "Date of Birth", aliases: ["Date of Birth", "DOB", "date_of_birth", "dateOfBirth"] },
    { key: "hireDate", label: "Hire Date", aliases: ["Hire Date", "hire_date", "hireDate"] },
    { key: "hourlyRate", label: "Hourly Rate", aliases: ["Hourly Rate", "hourly_rate", "hourlyRate", "Rate"] },
    { key: "specializations", label: "Specializations", aliases: ["Specializations", "specializations", "Skills"] },
    { key: "certifications", label: "Certifications", aliases: ["Certifications", "certifications"] },
    { key: "yearsOfExperience", label: "Years of Experience", aliases: ["Years of Experience", "years_of_experience", "yearsOfExperience", "Experience"] },
    { key: "isActive", label: "Active Status", aliases: ["Active", "is_active", "isActive", "Status"] }
  ],
  users: [
    { key: "email", label: "Email", required: true, aliases: ["Email", "email", "Email Address", "email_address"] },
    { key: "firstName", label: "First Name", required: true, aliases: ["First Name", "first_name", "firstName"] },
    { key: "middleName", label: "Middle Name", aliases: ["Middle Name", "middle_name", "middleName"] },
    { key: "lastName", label: "Last Name", required: true, aliases: ["Last Name", "last_name", "lastName"] },
    { key: "dateOfBirth", label: "Date of Birth", aliases: ["Date of Birth", "DOB", "date_of_birth", "dateOfBirth"] },
    { key: "role", label: "Role", aliases: ["Role", "role", "User Role", "user_role"] },
    { key: "isActive", label: "Active Status", aliases: ["Active", "is_active", "isActive", "Status"] }
  ],
  authorizations: [
    { key: "clientId", label: "Client ID", aliases: ["Client ID", "client_id", "clientId", "ClientID"] },
    { key: "memberId", label: "Member ID", aliases: ["Member ID", "member_id", "memberId", "MemberID", "Member Number", "memberNumber"] },
    { key: "authorizationNumber", label: "Authorization Number", required: true, aliases: ["Authorization Number", "authorization_number", "authorizationNumber", "Auth Number", "Auth #", "AuthNumber"] },
    { key: "serviceType", label: "Service Type", required: true, aliases: ["Service Type", "service_type", "serviceType", "Service", "Type"] },
    { key: "approvedHours", label: "Approved Hours", aliases: ["Approved Hours", "approved_hours", "approvedHours", "Hours", "Authorized Hours"] },
    { key: "frequencyPerWeek", label: "Frequency Per Week", aliases: ["Frequency Per Week", "frequency_per_week", "frequencyPerWeek", "Weekly Frequency", "Visits Per Week"] },
    { key: "startDate", label: "Start Date", required: true, aliases: ["Start Date", "start_date", "startDate", "Effective Date", "Begin Date"] },
    { key: "endDate", label: "End Date", aliases: ["End Date", "end_date", "endDate", "Expiration Date", "Exp Date"] },
    { key: "renewalDate", label: "Renewal Date", aliases: ["Renewal Date", "renewal_date", "renewalDate"] },
    { key: "status", label: "Status", aliases: ["Status", "status", "Auth Status"] },
    { key: "notes", label: "Notes", aliases: ["Notes", "notes", "Comments", "Remarks"] }
  ]
};

function excelDateToJSDate(excelDate: number): Date {
  const baseDate = new Date(1899, 11, 30);
  return new Date(baseDate.getTime() + excelDate * 86400000);
}

export function ExcelImport({ type, onImportComplete, officeId }: ExcelImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const dataWithOffice = officeId 
        ? data.map(item => ({ ...item, officeId }))
        : data;
      const response = await apiRequest("POST", `/api/${type}/bulk-import`, { data: dataWithOffice });
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      setStep("result");
      queryClient.invalidateQueries({ queryKey: [`/api/${type}`] });
      onImportComplete?.();
      
      if (result.errors.length === 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.successfulImports} ${type}`,
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `${result.successfulImports} imported, ${result.errors.length} errors`,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Failed to import data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const suggestMapping = (header: string): string | null => {
    const fields = SYSTEM_FIELDS[type];
    for (const field of fields) {
      if (field.aliases.some(alias => alias.toLowerCase() === header.toLowerCase().trim())) {
        return field.key;
      }
    }
    return null;
  };

  const parseExcelHeaders = async (file: File): Promise<{ headers: string[]; rows: any[][] }> => {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("No worksheet found in the file");
    }

    const headers: string[] = [];
    const rows: any[][] = [];

    worksheet.eachRow((row, rowNumber) => {
      const rowValues = row.values as any[];
      const values = rowValues.slice(1);
      
      if (rowNumber === 1) {
        values.forEach((cell) => {
          headers.push(cell?.toString() || "");
        });
      } else {
        rows.push(values);
      }
    });

    return { headers, rows };
  };

  const applyMappings = (headers: string[], rows: any[][], mappings: Record<string, string>): any[] => {
    const reverseMapping: Record<string, string> = {};
    for (const [systemKey, excelHeader] of Object.entries(mappings)) {
      if (excelHeader && excelHeader !== "__skip__") {
        reverseMapping[excelHeader] = systemKey;
      }
    }

    return rows.map((row) => {
      const obj: any = {};
      headers.forEach((header, headerIndex) => {
        const systemKey = reverseMapping[header];
        if (systemKey && row[headerIndex] !== undefined && row[headerIndex] !== '') {
          let value = row[headerIndex];
          
          if (systemKey.includes('Date') || systemKey === 'dateOfBirth' || systemKey === 'hireDate') {
            if (typeof value === 'number') {
              const date = excelDateToJSDate(value);
              value = date.toISOString().split('T')[0];
            } else if (value instanceof Date) {
              value = value.toISOString().split('T')[0];
            } else if (typeof value === 'string') {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                value = date.toISOString().split('T')[0];
              }
            }
          } else if (systemKey === 'isActive') {
            value = value === 'Active' || value === 'true' || value === true || value === 1;
          } else if (systemKey === 'hourlyRate' || systemKey === 'yearsOfExperience' || systemKey === 'approvedHours') {
            value = parseFloat(value) || 0;
          } else if (systemKey === 'frequencyPerWeek') {
            value = parseInt(value) || null;
          }
          
          obj[systemKey] = value;
        }
      });
      return obj;
    }).filter(obj => Object.keys(obj).length > 0);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an Excel file (.xlsx format only)",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    try {
      const { headers, rows } = await parseExcelHeaders(file);
      setExcelHeaders(headers);
      setRawRows(rows);
      
      // Load any previously-saved mappings for this import type so the user
      // doesn't have to re-pick fields when re-importing the same kind of file.
      let savedMappings: Record<string, string> = {};
      try {
        const stored = localStorage.getItem(`excel_import_mapping_${type}`);
        if (stored) savedMappings = JSON.parse(stored) || {};
      } catch {
        savedMappings = {};
      }

      const initialMappings: Record<string, string> = {};
      for (const field of SYSTEM_FIELDS[type]) {
        // Prefer saved mapping if its excel header still exists in this file
        const saved = savedMappings[field.key];
        if (saved && headers.includes(saved)) {
          initialMappings[field.key] = saved;
          continue;
        }
        const suggested = headers.find(h => suggestMapping(h) === field.key);
        if (suggested) {
          initialMappings[field.key] = suggested;
        }
      }
      setColumnMappings(initialMappings);
      setStep("mapping");
    } catch (error) {
      toast({
        title: "File Parse Error",
        description: "Failed to parse Excel file. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const updateMapping = (systemKey: string, excelHeader: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [systemKey]: excelHeader === "__skip__" ? "" : excelHeader,
    }));
  };

  const handleContinueToPreview = () => {
    // Persist the user's mapping choices so the next import of the same
    // type can reuse them automatically.
    try {
      const toSave: Record<string, string> = {};
      for (const [k, v] of Object.entries(columnMappings)) {
        if (v && v !== "__skip__") toSave[k] = v;
      }
      localStorage.setItem(`excel_import_mapping_${type}`, JSON.stringify(toSave));
    } catch {
      // ignore localStorage errors
    }
    const mappedData = applyMappings(excelHeaders, rawRows, columnMappings);
    setPreviewData(mappedData.slice(0, 5));
    setStep("preview");
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    try {
      const mappedData = applyMappings(excelHeaders, rawRows, columnMappings);
      importMutation.mutate(mappedData);
    } catch (error) {
      toast({
        title: "Import Error",
        description: "Failed to process the Excel file.",
        variant: "destructive",
      });
    }
  };

  const resetDialog = () => {
    setStep("upload");
    setSelectedFile(null);
    setExcelHeaders([]);
    setRawRows([]);
    setColumnMappings({});
    setPreviewData([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const closeDialog = () => {
    setIsOpen(false);
    resetDialog();
  };

  const requiredFields = SYSTEM_FIELDS[type].filter(f => f.required);
  const hasRequiredMappings = requiredFields.every(f => columnMappings[f.key]);

  const typeLabel = type === "clients" ? "Clients" : type === "caregivers" ? "Caregivers" : type === "users" ? "Users" : "Authorizations";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid={`button-import-${type}`}>
          <Upload className="w-4 h-4 mr-2" />
          Import from Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {typeLabel} from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file to bulk import {type}. You can map columns and skip fields you don't need.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2 text-xs">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${step === "upload" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <span className="font-medium">1. Upload</span>
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${step === "mapping" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <span className="font-medium">2. Map Columns</span>
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${step === "preview" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <span className="font-medium">3. Preview</span>
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${step === "result" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <span className="font-medium">4. Results</span>
          </div>
        </div>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="excel-file" className="cursor-pointer">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Click to select Excel file</p>
                  <p className="text-xs text-muted-foreground">Supports .xlsx files</p>
                </div>
              </Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
                ref={fileInputRef}
                data-testid="input-excel-file"
              />
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Available Fields for {typeLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {SYSTEM_FIELDS[type].map((field) => (
                    <div key={field.key} className="flex items-center gap-1">
                      <span className="font-medium">{field.label}</span>
                      {field.required && <Badge variant="outline" className="text-[10px] px-1 py-0">Required</Badge>}
                    </div>
                  ))}
                </div>
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
              </div>
              <Button variant="outline" size="sm" onClick={resetDialog}>
                <X className="w-4 h-4 mr-2" />
                Change File
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Match each system field to a column from your Excel file, or skip fields you don't want to import.
            </p>

            <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
              {SYSTEM_FIELDS[type].map((field) => (
                <div key={field.key} className="flex items-center gap-3 p-2 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{field.label}</span>
                      {field.required && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-red-500 text-red-700 flex-shrink-0">Required</Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Select
                    value={columnMappings[field.key] || "__skip__"}
                    onValueChange={(value) => updateMapping(field.key, value)}
                  >
                    <SelectTrigger className="w-[180px]" data-testid={`select-mapping-${field.key}`}>
                      <SelectValue placeholder="Skip this field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">-- Skip this field --</SelectItem>
                      {excelHeaders.filter(h => h && h.trim()).map((header) => (
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
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Please map all required fields before continuing.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetDialog}>Cancel</Button>
              <Button 
                onClick={handleContinueToPreview}
                disabled={!hasRequiredMappings}
                data-testid="button-continue-preview"
              >
                Continue to Preview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Preview Data (First 5 rows)</h3>
              <Button variant="outline" size="sm" onClick={() => setStep("mapping")}>
                Back to Mapping
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {Object.keys(previewData[0] || {}).map((key) => (
                        <th key={key} className="text-left p-2 font-medium">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-t">
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td key={cellIndex} className="p-2">
                            {String(value).length > 20 ? `${String(value).substring(0, 20)}...` : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Total rows to import: {rawRows.length}
            </p>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setStep("mapping")}>Back</Button>
              <Button 
                onClick={handleImport} 
                disabled={importMutation.isPending}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Data"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && importResult && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              {importResult.errors.length === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <h3 className="font-medium">Import Results</h3>
            </div>
            
            <div className={`grid gap-4 text-center ${importResult.updatedRecords !== undefined ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{importResult.totalRows}</div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </CardContent>
              </Card>
              {importResult.createdRecords !== undefined && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{importResult.createdRecords}</div>
                    <div className="text-xs text-muted-foreground">Created</div>
                  </CardContent>
                </Card>
              )}
              {importResult.updatedRecords !== undefined && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{importResult.updatedRecords}</div>
                    <div className="text-xs text-muted-foreground">Updated</div>
                  </CardContent>
                </Card>
              )}
              {importResult.updatedRecords === undefined && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{importResult.successfulImports}</div>
                    <div className="text-xs text-muted-foreground">Imported</div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </CardContent>
              </Card>
            </div>
            
            {importResult.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Import Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-xs p-2 bg-destructive/10 rounded">
                        <span className="font-medium">Row {error.row}:</span> {error.error}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="flex justify-end">
              <Button onClick={closeDialog} data-testid="button-close-results">Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
