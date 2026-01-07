import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, FileSignature, AlertCircle, Loader2 } from "lucide-react";

interface SignatureField {
  id: string;
  label: string;
  required: boolean;
  type: "signature" | "initials" | "date" | "text";
}

interface DocumentData {
  id: string;
  documentContent: string;
  recipientName: string;
  recipientEmail: string;
  signatureFields: SignatureField[] | null;
  status: string;
}

export default function ESign() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<Record<string, string>>({});
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [isSigned, setIsSigned] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);

  const { data: document, isLoading, error } = useQuery<DocumentData>({
    queryKey: ["/api/esign", token],
    queryFn: async () => {
      const res = await fetch(`/api/esign/${token}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to load document");
      }
      return res.json();
    },
    retry: false,
  });

  const signMutation = useMutation({
    mutationFn: async (data: { signatureData: Record<string, any> }) => {
      const res = await fetch(`/api/esign/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit signature");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsSigned(true);
      toast({ title: "Document signed successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/esign/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to decline document");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsDeclined(true);
      toast({ title: "Document declined" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const initCanvas = (canvas: HTMLCanvasElement | null, fieldId: string) => {
    if (canvas && !canvasRefs.current.has(fieldId)) {
      canvasRefs.current.set(fieldId, canvas);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, fieldId: string) => {
    setIsDrawing(true);
    setCurrentFieldId(fieldId);
    const canvas = canvasRefs.current.get(fieldId);
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentFieldId) return;
    
    const canvas = canvasRefs.current.get(currentFieldId);
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ("touches" in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (fieldId: string) => {
    if (isDrawing && currentFieldId === fieldId) {
      setIsDrawing(false);
      setCurrentFieldId(null);
      
      const canvas = canvasRefs.current.get(fieldId);
      if (canvas) {
        const dataUrl = canvas.toDataURL();
        setSignatureData(prev => ({ ...prev, [fieldId]: dataUrl }));
      }
    }
  };

  const clearCanvas = (fieldId: string) => {
    const canvas = canvasRefs.current.get(fieldId);
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData(prev => {
          const newData = { ...prev };
          delete newData[fieldId];
          return newData;
        });
      }
    }
  };

  const handleSubmit = () => {
    if (!document) return;
    
    const fields = document.signatureFields || [];
    const allData: Record<string, any> = {};
    
    for (const field of fields) {
      if (field.type === "signature" || field.type === "initials") {
        if (field.required && !signatureData[field.id]) {
          toast({ 
            title: "Missing Required Field", 
            description: `Please complete the ${field.label} field`,
            variant: "destructive"
          });
          return;
        }
        allData[field.id] = signatureData[field.id] || null;
      } else if (field.type === "text") {
        if (field.required && !textInputs[field.id]) {
          toast({ 
            title: "Missing Required Field", 
            description: `Please complete the ${field.label} field`,
            variant: "destructive"
          });
          return;
        }
        allData[field.id] = textInputs[field.id] || null;
      } else if (field.type === "date") {
        allData[field.id] = textInputs[field.id] || new Date().toISOString().split('T')[0];
      }
    }
    
    signMutation.mutate({ signatureData: allData });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100" data-testid="loading-document">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100" data-testid="error-document">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-red-600">Document Unavailable</CardTitle>
            <CardDescription>{(error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100" data-testid="success-signed">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <CardTitle className="text-green-600">Document Signed Successfully!</CardTitle>
            <CardDescription>
              Thank you for signing. A confirmation will be sent to your email.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isDeclined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100" data-testid="declined-document">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 mx-auto text-gray-500 mb-4" />
            <CardTitle>Document Declined</CardTitle>
            <CardDescription>
              You have declined to sign this document. The sender has been notified.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const fields = document?.signatureFields || [];

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <FileSignature className="h-8 w-8 text-blue-500" />
              <div>
                <CardTitle data-testid="document-title">Document Ready for Signature</CardTitle>
                <CardDescription>
                  Hello {document?.recipientName}, please review and sign the document below.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div 
              className="prose max-w-none bg-white border rounded-lg p-6 mb-6"
              dangerouslySetInnerHTML={{ __html: document?.documentContent || "" }}
              data-testid="document-content"
            />
            
            {fields.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold border-b pb-2">Signature Fields</h3>
                {fields.map((field) => (
                  <div key={field.id} className="space-y-2" data-testid={`field-${field.id}`}>
                    <Label className="flex items-center gap-2">
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    
                    {(field.type === "signature" || field.type === "initials") && (
                      <div className="border rounded-lg p-2 bg-gray-50">
                        <canvas
                          ref={(el) => initCanvas(el, field.id)}
                          width={field.type === "initials" ? 200 : 400}
                          height={field.type === "initials" ? 80 : 150}
                          className="border bg-white cursor-crosshair touch-none"
                          onMouseDown={(e) => startDrawing(e, field.id)}
                          onMouseMove={draw}
                          onMouseUp={() => stopDrawing(field.id)}
                          onMouseLeave={() => stopDrawing(field.id)}
                          onTouchStart={(e) => startDrawing(e, field.id)}
                          onTouchMove={draw}
                          onTouchEnd={() => stopDrawing(field.id)}
                          data-testid={`canvas-${field.id}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => clearCanvas(field.id)}
                          className="mt-2"
                          data-testid={`button-clear-${field.id}`}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                    
                    {field.type === "text" && (
                      <Input
                        value={textInputs[field.id] || ""}
                        onChange={(e) => setTextInputs(prev => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        data-testid={`input-${field.id}`}
                      />
                    )}
                    
                    {field.type === "date" && (
                      <Input
                        type="date"
                        value={textInputs[field.id] || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setTextInputs(prev => ({ ...prev, [field.id]: e.target.value }))}
                        data-testid={`input-${field.id}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {fields.length === 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Your Signature</h3>
                <div className="border rounded-lg p-2 bg-gray-50">
                  <canvas
                    ref={(el) => initCanvas(el, "default_signature")}
                    width={400}
                    height={150}
                    className="border bg-white cursor-crosshair touch-none"
                    onMouseDown={(e) => startDrawing(e, "default_signature")}
                    onMouseMove={draw}
                    onMouseUp={() => stopDrawing("default_signature")}
                    onMouseLeave={() => stopDrawing("default_signature")}
                    onTouchStart={(e) => startDrawing(e, "default_signature")}
                    onTouchMove={draw}
                    onTouchEnd={() => stopDrawing("default_signature")}
                    data-testid="canvas-default-signature"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => clearCanvas("default_signature")}
                    className="mt-2"
                    data-testid="button-clear-default"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-6 flex justify-between">
            <Button
              variant="outline"
              onClick={() => declineMutation.mutate()}
              disabled={declineMutation.isPending}
              data-testid="button-decline"
            >
              {declineMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Decline to Sign
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={signMutation.isPending || (fields.length === 0 && !signatureData["default_signature"])}
              data-testid="button-sign"
            >
              {signMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign Document
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-sm text-gray-500">
          By signing this document, you agree that your electronic signature is the legal equivalent of your manual signature.
        </p>
      </div>
    </div>
  );
}