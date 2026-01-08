import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupportTicketSchema, type SupportTicket, type TicketMessage } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare, Clock, ArrowLeft, Send, Ticket } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const ticketFormSchema = insertSupportTicketSchema.pick({
  subject: true,
  description: true,
  category: true,
  priority: true,
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

type SupportTicketWithMessages = SupportTicket & { messages?: TicketMessage[] };

export default function SupportTicketsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support-tickets"],
  });

  const { data: selectedTicket, isLoading: isLoadingTicket } = useQuery<SupportTicketWithMessages>({
    queryKey: ["/api/support-tickets", selectedTicketId],
    enabled: !!selectedTicketId,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      return apiRequest("POST", "/api/support-tickets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
      setCreateOpen(false);
      form.reset();
      toast({ title: "Success", description: "Support ticket created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create support ticket", variant: "destructive" });
    },
  });

  const addMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      return apiRequest("POST", `/api/support-tickets/${ticketId}/messages`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets", selectedTicketId] });
      setReplyMessage("");
      toast({ title: "Success", description: "Reply added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add reply", variant: "destructive" });
    },
  });

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: "",
      description: "",
      category: "general",
      priority: "medium",
    },
  });

  const onSubmit = (data: TicketFormData) => {
    createTicketMutation.mutate(data);
  };

  const handleAddReply = () => {
    if (!selectedTicketId || !replyMessage.trim()) return;
    addMessageMutation.mutate({ ticketId: selectedTicketId, message: replyMessage });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "open": return "destructive";
      case "in_progress": return "default";
      case "waiting_on_customer": return "secondary";
      case "resolved": return "default";
      case "closed": return "secondary";
      default: return "secondary";
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const formatStatus = (status: string | null) => {
    if (!status) return "Unknown";
    return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  if (selectedTicketId && selectedTicket) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Support Ticket" subtitle={selectedTicket.subject} />
          <div className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-4xl mx-auto space-y-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedTicketId(null)}
                data-testid="button-back-to-tickets"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tickets
              </Button>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle data-testid="text-ticket-subject">{selectedTicket.subject}</CardTitle>
                      <CardDescription>
                        Created {selectedTicket.createdAt ? format(new Date(selectedTicket.createdAt), "PPP") : "Unknown"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusColor(selectedTicket.status)} data-testid="badge-ticket-status">
                        {formatStatus(selectedTicket.status)}
                      </Badge>
                      <Badge variant={getPriorityColor(selectedTicket.priority)} data-testid="badge-ticket-priority">
                        {selectedTicket.priority || "medium"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-ticket-description">
                      {selectedTicket.description}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-4">Conversation</h4>
                    <div className="space-y-4">
                      {selectedTicket.messages?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${msg.isStaffReply ? "bg-blue-50 dark:bg-blue-950" : "bg-muted"}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">
                              {msg.isStaffReply ? "Support Team" : "You"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {msg.createdAt ? format(new Date(msg.createdAt), "PPp") : ""}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      ))}
                      {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                      )}
                    </div>

                    {selectedTicket.status !== "closed" && (
                      <div className="mt-4 flex gap-2">
                        <Textarea
                          placeholder="Type your reply..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          className="flex-1"
                          data-testid="input-reply-message"
                        />
                        <Button
                          onClick={handleAddReply}
                          disabled={!replyMessage.trim() || addMessageMutation.isPending}
                          data-testid="button-send-reply"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Support Tickets" subtitle="Get help from our support team" />
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
                <p className="text-muted-foreground">View and manage your support requests</p>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-ticket">
                    <Plus className="mr-2 h-4 w-4" />
                    New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                    <DialogDescription>
                      Describe your issue and our team will get back to you
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Brief description of your issue"
                                {...field}
                                data-testid="input-ticket-subject"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || "general"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-ticket-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="technical">Technical</SelectItem>
                                <SelectItem value="billing">Billing</SelectItem>
                                <SelectItem value="feature_request">Feature Request</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || "medium"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-ticket-priority">
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your issue in detail..."
                                rows={5}
                                {...field}
                                data-testid="input-ticket-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateOpen(false)}
                          data-testid="button-cancel-ticket"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createTicketMutation.isPending}
                          data-testid="button-submit-ticket"
                        >
                          {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Support Tickets</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't created any support tickets yet.
                  </p>
                  <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-ticket">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    data-testid={`ticket-card-${ticket.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium" data-testid={`text-ticket-subject-${ticket.id}`}>
                            {ticket.subject}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {ticket.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ticket.createdAt ? format(new Date(ticket.createdAt), "PPP") : "Unknown"}
                            </span>
                            {ticket.category && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {ticket.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={getStatusColor(ticket.status)} data-testid={`badge-status-${ticket.id}`}>
                            {formatStatus(ticket.status)}
                          </Badge>
                          <Badge variant={getPriorityColor(ticket.priority)} data-testid={`badge-priority-${ticket.id}`}>
                            {ticket.priority || "medium"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
