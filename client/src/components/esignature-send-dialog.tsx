import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Users, UserPlus } from "lucide-react";
import type { ESignatureTemplate, Client, Caregiver } from "@shared/schema";

interface ESignatureSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ESignatureTemplate;
}

export function ESignatureSendDialog({ open, onOpenChange, template }: ESignatureSendDialogProps) {
  const { toast } = useToast();
  const [recipientType, setRecipientType] = useState<"manual" | "client" | "caregiver">("manual");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  
  const sanitizedContent = useMemo(() => DOMPurify.sanitize(template.content), [template.content]);
  const [manualRecipient, setManualRecipient] = useState({
    name: "",
    email: "",
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: recipientType === "client",
  });

  const { data: caregivers } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
    enabled: recipientType === "caregiver",
  });

  const sendMutation = useMutation({
    mutationFn: async (data: {
      templateId: string;
      documentContent: string;
      recipientEmail: string;
      recipientName: string;
      recipientType?: string;
      recipientId?: string;
    }) => {
      return apiRequest("POST", "/api/esignature/requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esignature/requests"] });
      onOpenChange(false);
      resetForm();
      toast({ 
        title: "Signature Request Sent!", 
        description: "The recipient will receive an email with a link to sign the document." 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send signature request", 
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setRecipientType("manual");
    setSelectedRecipientId("");
    setManualRecipient({ name: "", email: "" });
  };

  const handleSend = () => {
    let recipientName = "";
    let recipientEmail = "";
    let recipientTypeValue: string | undefined;
    let recipientId: string | undefined;

    if (recipientType === "manual") {
      recipientName = manualRecipient.name;
      recipientEmail = manualRecipient.email;
    } else if (recipientType === "client") {
      const client = clients?.find(c => c.id === selectedRecipientId);
      if (client) {
        recipientName = `${client.firstName} ${client.lastName}`;
        recipientEmail = client.email || "";
        recipientTypeValue = "client";
        recipientId = client.id;
      }
    } else if (recipientType === "caregiver") {
      const caregiver = caregivers?.find(c => c.id === selectedRecipientId);
      if (caregiver) {
        recipientName = `${caregiver.firstName} ${caregiver.lastName}`;
        recipientEmail = caregiver.email || "";
        recipientTypeValue = "caregiver";
        recipientId = caregiver.id;
      }
    }

    if (!recipientName || !recipientEmail) {
      toast({ 
        title: "Missing Information", 
        description: "Please provide recipient name and email", 
        variant: "destructive" 
      });
      return;
    }

    sendMutation.mutate({
      templateId: template.id,
      documentContent: template.content,
      recipientEmail,
      recipientName,
      recipientType: recipientTypeValue,
      recipientId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle data-testid="send-dialog-title">Send for Signature</DialogTitle>
          <DialogDescription>
            Send "{template.name}" to a recipient for electronic signature
          </DialogDescription>
        </DialogHeader>

        <Tabs value={recipientType} onValueChange={(v) => setRecipientType(v as typeof recipientType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" data-testid="tab-manual">
              <UserPlus className="h-4 w-4 mr-2" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="client" data-testid="tab-client">
              <Users className="h-4 w-4 mr-2" />
              Client
            </TabsTrigger>
            <TabsTrigger value="caregiver" data-testid="tab-caregiver">
              <Users className="h-4 w-4 mr-2" />
              Caregiver
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                id="recipientName"
                value={manualRecipient.name}
                onChange={(e) => setManualRecipient(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter recipient's full name"
                data-testid="input-recipient-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={manualRecipient.email}
                onChange={(e) => setManualRecipient(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter recipient's email"
                data-testid="input-recipient-email"
              />
            </div>
          </TabsContent>

          <TabsContent value="client" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select Client</Label>
              <Select value={selectedRecipientId} onValueChange={setSelectedRecipientId}>
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.filter(c => c.email).map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients && clients.filter(c => c.email).length === 0 && (
                <p className="text-sm text-gray-500">No clients with email addresses found.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="caregiver" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select Caregiver</Label>
              <Select value={selectedRecipientId} onValueChange={setSelectedRecipientId}>
                <SelectTrigger data-testid="select-caregiver">
                  <SelectValue placeholder="Select a caregiver" />
                </SelectTrigger>
                <SelectContent>
                  {caregivers?.filter(c => c.email).map((caregiver) => (
                    <SelectItem key={caregiver.id} value={caregiver.id}>
                      {caregiver.firstName} {caregiver.lastName} ({caregiver.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {caregivers && caregivers.filter(c => c.email).length === 0 && (
                <p className="text-sm text-gray-500">No caregivers with email addresses found.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
          <h4 className="text-sm font-medium mb-2">Document Preview</h4>
          <div 
            className="prose prose-sm max-w-none max-h-[150px] overflow-y-auto bg-white dark:bg-gray-900 border rounded p-3"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            data-testid="document-preview"
          />
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-send"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending}
            data-testid="button-send"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send for Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}