import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Printer, 
  X, 
  FileText, 
  Image as ImageIcon,
  FileSpreadsheet,
  ExternalLink,
  Maximize2,
  Minimize2
} from "lucide-react";
import type { Document } from "@shared/schema";

interface DocumentPreviewProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentPreview({ document, isOpen, onClose }: DocumentPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!document) return null;

  const fileType = document.fileType || "";
  const isPdf = fileType.includes("pdf");
  const isImage = fileType.startsWith("image/");
  const isExcel = fileType.includes("spreadsheet") || 
                  fileType.includes("excel") || 
                  document.originalName?.endsWith(".xlsx") || 
                  document.originalName?.endsWith(".xls");

  const viewUrl = `/api/documents/${document.id}/view`;
  const downloadUrl = `/api/documents/${document.id}/download`;

  const handleDownload = () => {
    const link = window.document.createElement("a");
    link.href = downloadUrl;
    link.download = document.originalName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (isPdf || isImage) {
      const printWindow = window.open(viewUrl, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    } else {
      window.print();
    }
  };

  const handleOpenNewTab = () => {
    window.open(viewUrl, "_blank");
  };

  const getFileIcon = () => {
    if (isPdf) return <FileText className="w-16 h-16 text-red-500" />;
    if (isImage) return <ImageIcon className="w-16 h-16 text-blue-500" />;
    if (isExcel) return <FileSpreadsheet className="w-16 h-16 text-green-500" />;
    return <FileText className="w-16 h-16 text-muted-foreground" />;
  };

  const renderPreview = () => {
    if (isPdf) {
      return (
        <iframe
          src={viewUrl}
          className="w-full h-full min-h-[500px] border-0"
          title={document.originalName}
        />
      );
    }

    if (isImage) {
      return (
        <div className="flex items-center justify-center p-4 bg-muted/30 min-h-[400px]">
          <img
            src={viewUrl}
            alt={document.originalName}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
          />
        </div>
      );
    }

    if (isExcel) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/30 min-h-[400px] text-center">
          <FileSpreadsheet className="w-20 h-20 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Excel File</h3>
          <p className="text-muted-foreground mb-4">
            Excel files cannot be previewed directly in the browser.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleDownload} data-testid="button-download-excel">
              <Download className="w-4 h-4 mr-2" />
              Download to View
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted/30 min-h-[400px] text-center">
        {getFileIcon()}
        <h3 className="text-lg font-semibold mt-4 mb-2">{document.originalName}</h3>
        <p className="text-muted-foreground mb-4">
          This file type cannot be previewed in the browser.
        </p>
        <Button onClick={handleDownload} data-testid="button-download-unsupported">
          <Download className="w-4 h-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={`${isFullscreen ? "max-w-[95vw] max-h-[95vh] h-[95vh]" : "max-w-4xl max-h-[90vh]"} flex flex-col`}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 pr-8">
              {getFileIcon()}
              <span className="truncate max-w-md">{document.originalName}</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                data-testid="button-toggle-fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              {(isPdf || isImage) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleOpenNewTab}
                  title="Open in new tab"
                  data-testid="button-open-new-tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                title="Print"
                disabled={isExcel}
                data-testid="button-print-document"
              >
                <Printer className="w-4 h-4" />
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleDownload}
                title="Download"
                data-testid="button-download-document-preview"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {renderPreview()}
        </div>

        <div className="flex-shrink-0 pt-4 border-t flex justify-between items-center text-sm text-muted-foreground">
          <div>
            Size: {((document.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
            {document.fileType && ` • Type: ${document.fileType}`}
          </div>
          <div>
            Uploaded: {document.createdAt ? new Date(document.createdAt).toLocaleDateString() : "Unknown"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
