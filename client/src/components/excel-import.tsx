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
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import ExcelJS from "exceljs";

interface ExcelImportProps {
  type: "clients" | "caregivers" | "users";
  onImportComplete?: () => void;
  officeId?: string;
}

interface ImportResult {
  totalRows: number;
  successfulImports: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

const COLUMN_MAPPINGS = {
  clients: {
    firstName: ["First Name", "first_name", "firstName"],
    lastName: ["Last Name", "last_name", "lastName"],
    dateOfBirth: ["Date of Birth", "DOB", "date_of_birth", "dateOfBirth"],
    phone: ["Phone", "phone", "Phone Number", "phone_number"],
    email: ["Email", "email", "Email Address", "email_address"],
    address: ["Address", "address"],
    emergencyContactName: ["Emergency Contact Name", "emergency_contact_name", "emergencyContactName", "Emergency Contact"],
    emergencyContactPhone: ["Emergency Contact Phone", "emergency_contact_phone", "emergencyContactPhone"],
    emergencyContactRelation: ["Emergency Contact Relation", "emergency_contact_relation", "emergencyContactRelation", "Relationship"],
    medicalConditions: ["Medical Conditions", "medical_conditions", "medicalConditions"],
    medications: ["Medications", "medications"],
    allergies: ["Allergies", "allergies"],
    dietaryRestrictions: ["Dietary Restrictions", "dietary_restrictions", "dietaryRestrictions"],
    insuranceProvider: ["Insurance Provider", "insurance_provider", "insuranceProvider", "Insurance"],
    policyNumber: ["Policy Number", "policy_number", "policyNumber"]
  },
  caregivers: {
    employeeId: ["Employee ID", "employee_id", "employeeId"],
    firstName: ["First Name", "first_name", "firstName"],
    lastName: ["Last Name", "last_name", "lastName"],
    phone: ["Phone", "phone", "Phone Number", "phone_number"],
    email: ["Email", "email", "Email Address", "email_address"],
    address: ["Address", "address"],
    dateOfBirth: ["Date of Birth", "DOB", "date_of_birth", "dateOfBirth"],
    hireDate: ["Hire Date", "hire_date", "hireDate"],
    hourlyRate: ["Hourly Rate", "hourly_rate", "hourlyRate", "Rate"],
    specializations: ["Specializations", "specializations", "Skills"],
    certifications: ["Certifications", "certifications"],
    yearsOfExperience: ["Years of Experience", "years_of_experience", "yearsOfExperience", "Experience"],
    isActive: ["Active", "is_active", "isActive", "Status"]
  },
  users: {
    email: ["Email", "email", "Email Address", "email_address"],
    firstName: ["First Name", "first_name", "firstName"],
    middleName: ["Middle Name", "middle_name", "middleName"],
    lastName: ["Last Name", "last_name", "lastName"],
    dateOfBirth: ["Date of Birth", "DOB", "date_of_birth", "dateOfBirth"],
    role: ["Role", "role", "User Role", "user_role"],
    isActive: ["Active", "is_active", "isActive", "Status"]
  }
};

function excelDateToJSDate(excelDate: number): Date {
  const baseDate = new Date(1899, 11, 30);
  return new Date(baseDate.getTime() + excelDate * 86400000);
}

export function ExcelImport({ type, onImportComplete, officeId }: ExcelImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
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

  const parseExcelFile = async (file: File): Promise<any[]> => {
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

    const mappedData = rows.map((row) => {
      const obj: any = {};
      headers.forEach((header, headerIndex) => {
        const mappedKey = findMappedKey(header, COLUMN_MAPPINGS[type]);
        if (mappedKey && row[headerIndex] !== undefined && row[headerIndex] !== '') {
          let value = row[headerIndex];
          
          if (mappedKey.includes('Date') || mappedKey === 'dateOfBirth' || mappedKey === 'hireDate') {
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
          } else if (mappedKey === 'isActive') {
            value = value === 'Active' || value === 'true' || value === true || value === 1;
          } else if (mappedKey === 'hourlyRate' || mappedKey === 'yearsOfExperience') {
            value = parseFloat(value) || 0;
          }
          
          obj[mappedKey] = value;
        }
      });
      return obj;
    }).filter(obj => Object.keys(obj).length > 0);

    return mappedData;
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
      const mappedData = await parseExcelFile(file);
      setPreviewData(mappedData.slice(0, 5));
      setStep("preview");
    } catch (error) {
      toast({
        title: "File Parse Error",
        description: "Failed to parse Excel file. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const findMappedKey = (header: string, mappings: any): string | null => {
    for (const [key, possibleNames] of Object.entries(mappings)) {
      if ((possibleNames as string[]).some((name: string) => 
        name.toLowerCase() === header.toLowerCase().trim()
      )) {
        return key;
      }
    }
    return null;
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    try {
      const mappedData = await parseExcelFile(selectedFile);
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid={`button-import-${type}`}>
          <Upload className="w-4 h-4 mr-2" />
          Import from Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {type === "clients" ? "Clients" : "Caregivers"} from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file to bulk import {type}. Make sure your columns match the expected format.
          </DialogDescription>
        </DialogHeader>

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
                <CardTitle className="text-sm">Expected Columns for {type === "clients" ? "Clients" : "Caregivers"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(COLUMN_MAPPINGS[type]).map(([key, aliases]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <span className="font-medium">{key}:</span>
                      <span className="text-muted-foreground">{aliases[0]}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Preview Data (First 5 rows)</h3>
              <Button variant="outline" size="sm" onClick={resetDialog}>
                <X className="w-4 h-4 mr-2" />
                Change File
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
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={resetDialog}>Cancel</Button>
              <Button 
                onClick={handleImport} 
                disabled={importMutation.isPending}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? "Importing..." : "Import Data"}
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
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{importResult.totalRows}</div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{importResult.successfulImports}</div>
                  <div className="text-xs text-muted-foreground">Imported</div>
                </CardContent>
              </Card>
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
