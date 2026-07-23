import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail } from "lucide-react";
import type { Document } from "@shared/schema";

interface EmailDocumentDialogProps {
  document: Document | null;
  defaultRecipient?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Emails an existing document (e.g. a generated letter PDF) as an attachment
// via POST /api/documents/:id/email. Shared by the caregiver and client
// profile document lists.
export function EmailDocumentDialog({ document, defaultRecipient, open, onOpenChange }: EmailDocumentDialogProps) {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open && document) {
      setRecipientEmail(defaultRecipient || "");
      setSubject(`Document: ${document.originalName || document.fileName}`);
      setMessage("");
    }
  }, [open, document, defaultRecipient]);

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/documents/${document!.id}/email`, { recipientEmail, subject, message }),
    onSuccess: () => {
      toast({ title: "Email sent", description: `Sent to ${recipientEmail} with the document attached.` });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({ title: "Failed to send email", description: e.message, variant: "destructive" }),
  });

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Document
          </DialogTitle>
          <DialogDescription>
            Sends "{document.originalName || document.fileName}" as an email attachment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="email-doc-recipient">Recipient Email *</Label>
            <Input
              id="email-doc-recipient"
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              data-testid="input-email-doc-recipient"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-doc-subject">Subject</Label>
            <Input
              id="email-doc-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="input-email-doc-subject"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-doc-message">Message</Label>
            <Textarea
              id="email-doc-message"
              rows={3}
              placeholder="Optional message included in the email body..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-testid="input-email-doc-message"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!recipientEmail || sendMutation.isPending}
            data-testid="button-send-email-doc"
          >
            {sendMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
