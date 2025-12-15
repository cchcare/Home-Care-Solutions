import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  X,
  Scan
} from "lucide-react";

interface ExtractedCaregiverData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  ssn?: string;
  employeeId?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  experienceYears?: number;
  specializations?: string[];
  certifications?: string[];
}

interface ExtractedClientData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  medicaidNumber?: string;
  medicareNumber?: string;
  primaryDiagnosis?: string;
  allergies?: string[];
  medications?: string[];
}

type ExtractedData = ExtractedCaregiverData | ExtractedClientData;

interface OcrUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: "caregiver" | "client";
  onDataExtracted: (data: ExtractedData) => void;
}

export function OcrUploadDialog({ isOpen, onClose, type, onDataExtracted }: OcrUploadDialogProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [step, setStep] = useState<"upload" | "extracting" | "review">("upload");

  const extractMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      
      const endpoint = type === "caregiver" 
        ? "/api/ocr/extract-caregiver" 
        : "/api/ocr/extract-client";
      
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to extract data from document");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data);
      setStep("review");
    },
    onError: () => {
      setStep("upload");
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleExtract = () => {
    if (uploadedFile) {
      setStep("extracting");
      extractMutation.mutate(uploadedFile);
    }
  };

  const handleFieldChange = (field: string, value: string | number | string[]) => {
    if (extractedData) {
      setExtractedData({
        ...extractedData,
        [field]: value,
      });
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setUploadedFile(null);
    setExtractedData(null);
    setStep("upload");
    onClose();
  };

  const renderCaregiverFields = () => {
    const data = extractedData as ExtractedCaregiverData;
    return (
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={data.firstName || ""}
              onChange={(e) => handleFieldChange("firstName", e.target.value)}
              data-testid="input-ocr-first-name"
            />
          </div>
          <div>
            <Label htmlFor="middleName">Middle Name</Label>
            <Input
              id="middleName"
              value={data.middleName || ""}
              onChange={(e) => handleFieldChange("middleName", e.target.value)}
              data-testid="input-ocr-middle-name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={data.lastName || ""}
              onChange={(e) => handleFieldChange("lastName", e.target.value)}
              data-testid="input-ocr-last-name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={data.dateOfBirth || ""}
              onChange={(e) => handleFieldChange("dateOfBirth", e.target.value)}
              data-testid="input-ocr-dob"
            />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Input
              id="gender"
              value={data.gender || ""}
              onChange={(e) => handleFieldChange("gender", e.target.value)}
              data-testid="input-ocr-gender"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={data.email || ""}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              data-testid="input-ocr-email"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={data.phone || ""}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              data-testid="input-ocr-phone"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={data.address || ""}
            onChange={(e) => handleFieldChange("address", e.target.value)}
            data-testid="input-ocr-address"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={data.city || ""}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              data-testid="input-ocr-city"
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={data.state || ""}
              onChange={(e) => handleFieldChange("state", e.target.value)}
              data-testid="input-ocr-state"
            />
          </div>
          <div>
            <Label htmlFor="zipCode">ZIP Code</Label>
            <Input
              id="zipCode"
              value={data.zipCode || ""}
              onChange={(e) => handleFieldChange("zipCode", e.target.value)}
              data-testid="input-ocr-zip"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="employeeId">Employee ID</Label>
            <Input
              id="employeeId"
              value={data.employeeId || ""}
              onChange={(e) => handleFieldChange("employeeId", e.target.value)}
              data-testid="input-ocr-employee-id"
            />
          </div>
          <div>
            <Label htmlFor="ssn">SSN (Last 4)</Label>
            <Input
              id="ssn"
              value={data.ssn || ""}
              onChange={(e) => handleFieldChange("ssn", e.target.value)}
              maxLength={4}
              data-testid="input-ocr-ssn"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
            <Input
              id="emergencyContactName"
              value={data.emergencyContactName || ""}
              onChange={(e) => handleFieldChange("emergencyContactName", e.target.value)}
              data-testid="input-ocr-emergency-name"
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
            <Input
              id="emergencyContactPhone"
              value={data.emergencyContactPhone || ""}
              onChange={(e) => handleFieldChange("emergencyContactPhone", e.target.value)}
              data-testid="input-ocr-emergency-phone"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="experienceYears">Years of Experience</Label>
          <Input
            id="experienceYears"
            type="number"
            value={data.experienceYears || ""}
            onChange={(e) => handleFieldChange("experienceYears", parseInt(e.target.value) || 0)}
            data-testid="input-ocr-experience"
          />
        </div>
      </div>
    );
  };

  const renderClientFields = () => {
    const data = extractedData as ExtractedClientData;
    return (
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={data.firstName || ""}
              onChange={(e) => handleFieldChange("firstName", e.target.value)}
              data-testid="input-ocr-first-name"
            />
          </div>
          <div>
            <Label htmlFor="middleName">Middle Name</Label>
            <Input
              id="middleName"
              value={data.middleName || ""}
              onChange={(e) => handleFieldChange("middleName", e.target.value)}
              data-testid="input-ocr-middle-name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={data.lastName || ""}
              onChange={(e) => handleFieldChange("lastName", e.target.value)}
              data-testid="input-ocr-last-name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={data.dateOfBirth || ""}
              onChange={(e) => handleFieldChange("dateOfBirth", e.target.value)}
              data-testid="input-ocr-dob"
            />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Input
              id="gender"
              value={data.gender || ""}
              onChange={(e) => handleFieldChange("gender", e.target.value)}
              data-testid="input-ocr-gender"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={data.email || ""}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              data-testid="input-ocr-email"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={data.phone || ""}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              data-testid="input-ocr-phone"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={data.address || ""}
            onChange={(e) => handleFieldChange("address", e.target.value)}
            data-testid="input-ocr-address"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={data.city || ""}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              data-testid="input-ocr-city"
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={data.state || ""}
              onChange={(e) => handleFieldChange("state", e.target.value)}
              data-testid="input-ocr-state"
            />
          </div>
          <div>
            <Label htmlFor="zipCode">ZIP Code</Label>
            <Input
              id="zipCode"
              value={data.zipCode || ""}
              onChange={(e) => handleFieldChange("zipCode", e.target.value)}
              data-testid="input-ocr-zip"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="emergencyContactName">Emergency Contact</Label>
            <Input
              id="emergencyContactName"
              value={data.emergencyContactName || ""}
              onChange={(e) => handleFieldChange("emergencyContactName", e.target.value)}
              data-testid="input-ocr-emergency-name"
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Emergency Phone</Label>
            <Input
              id="emergencyContactPhone"
              value={data.emergencyContactPhone || ""}
              onChange={(e) => handleFieldChange("emergencyContactPhone", e.target.value)}
              data-testid="input-ocr-emergency-phone"
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactRelation">Relationship</Label>
            <Input
              id="emergencyContactRelation"
              value={data.emergencyContactRelation || ""}
              onChange={(e) => handleFieldChange("emergencyContactRelation", e.target.value)}
              data-testid="input-ocr-emergency-relation"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="insuranceProvider">Insurance Provider</Label>
            <Input
              id="insuranceProvider"
              value={data.insuranceProvider || ""}
              onChange={(e) => handleFieldChange("insuranceProvider", e.target.value)}
              data-testid="input-ocr-insurance-provider"
            />
          </div>
          <div>
            <Label htmlFor="insuranceNumber">Insurance Number</Label>
            <Input
              id="insuranceNumber"
              value={data.insuranceNumber || ""}
              onChange={(e) => handleFieldChange("insuranceNumber", e.target.value)}
              data-testid="input-ocr-insurance-number"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="medicaidNumber">Medicaid Number</Label>
            <Input
              id="medicaidNumber"
              value={data.medicaidNumber || ""}
              onChange={(e) => handleFieldChange("medicaidNumber", e.target.value)}
              data-testid="input-ocr-medicaid"
            />
          </div>
          <div>
            <Label htmlFor="medicareNumber">Medicare Number</Label>
            <Input
              id="medicareNumber"
              value={data.medicareNumber || ""}
              onChange={(e) => handleFieldChange("medicareNumber", e.target.value)}
              data-testid="input-ocr-medicare"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="primaryDiagnosis">Primary Diagnosis</Label>
          <Input
            id="primaryDiagnosis"
            value={data.primaryDiagnosis || ""}
            onChange={(e) => handleFieldChange("primaryDiagnosis", e.target.value)}
            data-testid="input-ocr-diagnosis"
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-ocr-upload">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-primary" />
              Scan Document - Add {type === "caregiver" ? "Caregiver" : "Client"}
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-close-ocr">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Upload a PDF or image document to automatically extract personal information.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                ${uploadedFile ? "bg-accent/50" : ""}
              `}
              data-testid="dropzone-ocr"
            >
              <input {...getInputProps()} />
              {uploadedFile ? (
                <div className="space-y-2">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                  <p className="font-medium text-foreground">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click or drag to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="font-medium text-foreground">
                    {isDragActive ? "Drop the file here" : "Drag & drop a document here"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports PDF, JPG, PNG (max 10MB)
                  </p>
                </div>
              )}
            </div>

            {extractMutation.isError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">
                  {extractMutation.error instanceof Error 
                    ? extractMutation.error.message 
                    : "Failed to extract data. Please try again."}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleExtract} 
                disabled={!uploadedFile}
                data-testid="button-extract-data"
              >
                <Scan className="w-4 h-4 mr-2" />
                Extract Data
              </Button>
            </div>
          </div>
        )}

        {step === "extracting" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div className="space-y-2">
              <p className="font-medium text-foreground">Extracting information...</p>
              <p className="text-sm text-muted-foreground">
                Our AI is reading and extracting data from your document
              </p>
            </div>
            <Progress value={66} className="w-48 mx-auto" />
          </div>
        )}

        {step === "review" && extractedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                Data extracted successfully! Please review and edit if needed.
              </p>
            </div>

            {type === "caregiver" ? renderCaregiverFields() : renderClientFields()}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Upload Different
              </Button>
              <Button onClick={handleConfirm} data-testid="button-confirm-extracted">
                <CheckCircle className="w-4 h-4 mr-2" />
                Use This Data
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
