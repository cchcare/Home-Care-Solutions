import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelExportProps {
  type: "clients" | "caregivers" | "users";
  data: any[];
  disabled?: boolean;
}

const EXPORT_COLUMNS = {
  clients: [
    { key: "firstName", header: "First Name" },
    { key: "lastName", header: "Last Name" },
    { key: "dateOfBirth", header: "Date of Birth" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    { key: "address", header: "Address" },
    { key: "status", header: "Status" },
    { key: "emergencyContactName", header: "Emergency Contact Name" },
    { key: "emergencyContactPhone", header: "Emergency Contact Phone" },
    { key: "emergencyContactRelation", header: "Emergency Contact Relation" },
    { key: "medicalConditions", header: "Medical Conditions" },
    { key: "medications", header: "Medications" },
    { key: "allergies", header: "Allergies" },
    { key: "dietaryRestrictions", header: "Dietary Restrictions" },
    { key: "insuranceProvider", header: "Insurance Provider" },
    { key: "policyNumber", header: "Policy Number" },
  ],
  caregivers: [
    { key: "employeeId", header: "Employee ID" },
    { key: "hireDate", header: "Hire Date" },
    { key: "startDate", header: "Start Date" },
    { key: "hourlyWage", header: "Hourly Wage" },
    { key: "yearsOfExperience", header: "Years of Experience" },
    { key: "specializations", header: "Specializations" },
    { key: "isActive", header: "Active" },
    { key: "notes", header: "Notes" },
  ],
  users: [
    { key: "email", header: "Email" },
    { key: "firstName", header: "First Name" },
    { key: "middleName", header: "Middle Name" },
    { key: "lastName", header: "Last Name" },
    { key: "dateOfBirth", header: "Date of Birth" },
    { key: "role", header: "Role" },
    { key: "isActive", header: "Active" },
    { key: "createdAt", header: "Created At" },
  ],
};

export function ExcelExport({ type, data, disabled = false }: ExcelExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast({
        title: "No Data",
        description: `No ${type} data to export`,
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const columns = EXPORT_COLUMNS[type];
      
      const exportData = data.map((item) => {
        const row: Record<string, any> = {};
        columns.forEach(({ key, header }) => {
          let value = item[key];
          
          if (value === null || value === undefined) {
            value = "";
          } else if (Array.isArray(value)) {
            value = value.join(", ");
          } else if (typeof value === "boolean") {
            value = value ? "Yes" : "No";
          } else if (key.includes("Date") || key === "dateOfBirth" || key === "hireDate" || key === "startDate" || key === "createdAt") {
            if (value) {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                value = date.toLocaleDateString();
              }
            }
          }
          
          row[header] = value;
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, type.charAt(0).toUpperCase() + type.slice(1));

      const columnWidths = columns.map(({ header }) => ({
        wch: Math.max(header.length, 15),
      }));
      worksheet["!cols"] = columnWidths;

      const filename = `${type}_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Export Successful",
        description: `Exported ${data.length} ${type} to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || isExporting || !data || data.length === 0}
      data-testid={`button-export-${type}`}
    >
      <Download className="w-4 h-4 mr-2" />
      {isExporting ? "Exporting..." : "Export to Excel"}
    </Button>
  );
}
