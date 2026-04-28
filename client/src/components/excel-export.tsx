import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import ExcelJS from "exceljs";

interface ExcelExportProps {
  type: "clients" | "caregivers" | "users";
  data: any[];
  disabled?: boolean;
}

const EXPORT_COLUMNS = {
  clients: [
    { key: "firstName", header: "First Name" },
    { key: "lastName", header: "Last Name" },
    { key: "memberId", header: "Member ID" },
    { key: "hhaxAdmissionId", header: "HHA Admission ID" },
    { key: "dateOfBirth", header: "Date of Birth" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    { key: "address", header: "Address" },
    { key: "county", header: "County" },
    { key: "status", header: "Status" },
    { key: "serviceStartDate", header: "Service Start Date" },
    { key: "mcoName", header: "MCO" },
    { key: "emergencyContactName", header: "Emergency Contact Name" },
    { key: "emergencyContactPhone", header: "Emergency Contact Phone" },
    { key: "emergencyContactRelation", header: "Emergency Contact Relation" },
    { key: "medicalConditions", header: "Medical Conditions" },
    { key: "medications", header: "Medications" },
    { key: "allergies", header: "Allergies" },
    { key: "dietaryRestrictions", header: "Dietary Restrictions" },
  ],
  caregivers: [
    { key: "id", header: "Caregiver ID" },
    { key: "employeeId", header: "Employee ID" },
    { key: "assignmentId", header: "Assignment ID" },
    { key: "hhaxCaregiverCode", header: "HHAX Caregiver Code" },
    { key: "adpCode", header: "ADP Code" },
    { key: "firstName", header: "First Name" },
    { key: "middleName", header: "Middle Name" },
    { key: "lastName", header: "Last Name" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "dateOfBirth", header: "Date of Birth" },
    { key: "gender", header: "Gender" },
    { key: "address", header: "Address" },
    { key: "address2", header: "Address 2" },
    { key: "city", header: "City" },
    { key: "state", header: "State" },
    { key: "zipCode", header: "Zip Code" },
    { key: "county", header: "County" },
    { key: "hireDate", header: "Hire Date" },
    { key: "startDate", header: "Start Date" },
    { key: "experienceYears", header: "Experience (Years)" },
    { key: "hourlyWage", header: "Hourly Wage" },
    { key: "specializations", header: "Specializations" },
    { key: "mcoId", header: "MCO ID" },
    { key: "coordinatorId", header: "Coordinator ID" },
    { key: "isActive", header: "Active" },
    { key: "createdAt", header: "Created At" },
    { key: "updatedAt", header: "Updated At" },
    { key: "officeName", header: "Office Name" },
    { key: "officeAddress", header: "Office Address" },
    { key: "officePhone", header: "Office Phone" },
    { key: "officeEmail", header: "Office Email" },
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
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(type.charAt(0).toUpperCase() + type.slice(1));

      worksheet.columns = columns.map(({ key, header }) => ({
        header,
        key,
        width: Math.max(header.length, 15),
      }));

      data.forEach((item) => {
        const row: Record<string, any> = {};
        columns.forEach(({ key }) => {
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
          
          row[key] = value;
        });
        worksheet.addRow(row);
      });

      const filename = `${type}_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

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
