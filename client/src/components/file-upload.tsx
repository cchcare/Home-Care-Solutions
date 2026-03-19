import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface FileUploadProps {
  clientId?: string;
  caregiverId?: string;
  officeId?: string;
  documentType?: string;
  onUploadComplete?: (document: any) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export function FileUpload({
  clientId,
  caregiverId,
  officeId,
  documentType = "general",
  onUploadComplete,
  maxFiles = 5,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  }
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, clientId, caregiverId, officeId, documentType }: {
      file: File;
      clientId?: string;
      caregiverId?: string;
      officeId?: string;
      documentType: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (clientId) formData.append('clientId', clientId);
      if (caregiverId) formData.append('caregiverId', caregiverId);
      if (officeId) formData.append('officeId', officeId);
      formData.append('documentType', documentType);

      const response = await apiRequest("POST", "/api/documents/upload", formData);
      return response.json();
    },
    onSuccess: (data, variables) => {
      setFiles(prev => prev.map(f =>
        f.file.name === variables.file.name
          ? { ...f, status: 'completed', progress: 100 }
          : f
      ));

      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      onUploadComplete?.(data);

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error, variables) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      setFiles(prev => prev.map(f =>
        f.file.name === variables.file.name
          ? { ...f, status: 'error', error: (error as Error).message }
          : f
      ));

      toast({
        title: "Upload Failed",
        description: `Failed to upload ${variables.file.name}`,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      toast({
        title: "Too Many Files",
        description: `You can only upload up to ${maxFiles} files`,
        variant: "destructive",
      });
      return;
    }

    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(uploadFile => {
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
      ));

      uploadMutation.mutate({
        file: uploadFile.file,
        clientId,
        caregiverId,
        officeId,
        documentType,
      });
    });
  }, [files.length, maxFiles, clientId, caregiverId, documentType, uploadMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (file: UploadFile) => {
    switch (file.status) {
      case 'completed':
        return <Badge variant="default" className="text-xs">Uploaded</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      case 'uploading':
        return <Badge variant="outline" className="text-xs">Uploading...</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4" data-testid="file-upload-component">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/25'
          }
        `}
        data-testid="file-drop-zone"
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">
            {isDragActive ? "Drop files here..." : "Drag & drop files here"}
          </p>
          <p className="text-sm text-muted-foreground">
            or <span className="text-primary font-medium">browse files</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Supports: PDF, DOC, DOCX, PNG, JPG, GIF (max 10MB each)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Files</h4>
          {files.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="flex items-center space-x-3 p-3 border border-border rounded-lg"
              data-testid={`file-item-${uploadFile.id}`}
            >
              {getStatusIcon(uploadFile.status)}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {uploadFile.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>

                {uploadFile.status === 'uploading' && (
                  <Progress value={uploadFile.progress} className="mt-2 h-1" />
                )}

                {uploadFile.error && (
                  <p className="text-xs text-destructive mt-1">{uploadFile.error}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {getStatusBadge(uploadFile)}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadFile.id)}
                  disabled={uploadFile.status === 'uploading'}
                  data-testid={`button-remove-file-${uploadFile.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {files.filter(f => f.status === 'completed').length} of {files.length} files uploaded
          </span>
          <span>
            {files.filter(f => f.status === 'error').length > 0 && (
              <span className="text-destructive">
                {files.filter(f => f.status === 'error').length} failed
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
