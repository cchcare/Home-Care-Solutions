import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Download, FileSpreadsheet, CalendarIcon, Loader2 } from "lucide-react";
import type { Office } from "@shared/schema";

type ExportType = "billing" | "payroll";
type ExportFormat = "iif" | "csv";

interface QuickBooksExportProps {
  variant?: "card" | "dialog";
  selectedOfficeId?: string;
}

export function QuickBooksExport({ variant = "card", selectedOfficeId }: QuickBooksExportProps) {
  const { toast } = useToast();
  const [exportType, setExportType] = useState<ExportType>("billing");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [officeId, setOfficeId] = useState<string>(selectedOfficeId || "");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 1)));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(subMonths(new Date(), 1)));
  const [isExporting, setIsExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const handleExport = async () => {
    if (!officeId) {
      toast({
        title: "Office Required",
        description: "Please select an office to export data from.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      let url: string;
      if (exportType === "billing") {
        url = `/api/admin/export/quickbooks/billing?officeId=${officeId}&startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}&format=${exportFormat}`;
      } else {
        url = `/api/admin/export/quickbooks/payroll?officeId=${officeId}&payPeriodStart=${format(startDate, "yyyy-MM-dd")}&payPeriodEnd=${format(endDate, "yyyy-MM-dd")}&format=${exportFormat}`;
      }

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Export failed");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${exportType}_export.${exportFormat}`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export Successful",
        description: `${exportType.charAt(0).toUpperCase() + exportType.slice(1)} data exported as ${exportFormat.toUpperCase()}.`,
      });

      if (variant === "dialog") {
        setDialogOpen(false);
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "An error occurred during export.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const ExportForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="export-type">Export Type</Label>
          <Select
            value={exportType}
            onValueChange={(value) => setExportType(value as ExportType)}
          >
            <SelectTrigger id="export-type" data-testid="select-export-type">
              <SelectValue placeholder="Select export type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="billing" data-testid="select-export-type-billing">Billing</SelectItem>
              <SelectItem value="payroll" data-testid="select-export-type-payroll">Payroll</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="export-format">Format</Label>
          <Select
            value={exportFormat}
            onValueChange={(value) => setExportFormat(value as ExportFormat)}
          >
            <SelectTrigger id="export-format" data-testid="select-export-format">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv" data-testid="select-export-format-csv">CSV</SelectItem>
              <SelectItem value="iif" data-testid="select-export-format-iif">IIF (QuickBooks)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="office-select">Office</Label>
        <Select
          value={officeId}
          onValueChange={setOfficeId}
        >
          <SelectTrigger id="office-select" data-testid="select-export-office">
            <SelectValue placeholder="Select office" />
          </SelectTrigger>
          <SelectContent>
            {offices.map((office) => (
              <SelectItem key={office.id} value={office.id} data-testid={`select-office-${office.id}`}>
                {office.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{exportType === "billing" ? "Start Date" : "Pay Period Start"}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
                data-testid="button-start-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "MMM d, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
                data-testid="calendar-start-date"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>{exportType === "billing" ? "End Date" : "Pay Period End"}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
                data-testid="button-end-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "MMM d, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                initialFocus
                data-testid="calendar-end-date"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Button
        onClick={handleExport}
        disabled={isExporting || !officeId}
        className="w-full"
        data-testid="button-export-quickbooks"
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export to QuickBooks
          </>
        )}
      </Button>
    </div>
  );

  if (variant === "dialog") {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" data-testid="button-open-quickbooks-export">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            QuickBooks Export
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QuickBooks Export</DialogTitle>
          </DialogHeader>
          <ExportForm />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card data-testid="card-quickbooks-export">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          QuickBooks Export
        </CardTitle>
        <CardDescription>
          Export billing or payroll data in QuickBooks-compatible IIF format or as CSV
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ExportForm />
      </CardContent>
    </Card>
  );
}
