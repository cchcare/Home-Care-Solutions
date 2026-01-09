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

export default function MySupportTicketsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/my-support-tickets"],
  });

  const { data: selectedTicket, isLoading: isLoadingTicket } = useQuery<SupportTicketWithMessages>({
    queryKey: ["/api/my-support-tickets", selectedTicketId],
    enabled: !!selectedTicketId,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      return apiRequest("POST", "/api/my-support-tickets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-support-tickets"] });
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
      return apiRequest("POST", `/api/my-support-tickets/${ticketId}/messages`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-support-tickets", selectedTicketId] });
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
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="max-w-4xl mx-auto space-y-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedTicketId(null)}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tickets
              </Button>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedTicket.subject}</CardTitle>
                      <CardDescription>
                        Created {selectedTicket.createdAt ? format(new Date(selectedTicket.createdAt), "PPpp") : "Unknown"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusColor(selectedTicket.status)}>
                        {formatStatus(selectedTicket.status)}
                      </Badge>
                      <Badge variant={getPriorityColor(selectedTicket.priority)}>
                        {selectedTicket.priority?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{selectedTicket.description}</p>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Messages
                      </h3>

                      {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                        <div className="space-y-3">
                          {selectedTicket.messages.map((message) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-lg ${
                                message.isStaffReply
                                  ? "bg-primary/10 ml-4"
                                  : "bg-muted mr-4"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">
                                  {message.isStaffReply ? "Support Team" : "You"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {message.createdAt ? format(new Date(message.createdAt), "PPp") : ""}
                                </span>
                              </div>
                              <p className="text-sm">{message.message}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          No messages yet.
                        </p>
                      )}

                      {selectedTicket.status !== "closed" && selectedTicket.status !== "resolved" && (
                        <div className="mt-4 flex gap-2">
                          <Textarea
                            placeholder="Type your reply..."
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleAddReply}
                            disabled={!replyMessage.trim() || addMessageMutation.isPending}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Ticket className="w-6 h-6" />
                  My Support Tickets
                </h1>
                <p className="text-muted-foreground">View and manage your support requests</p>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                    <DialogDescription>
                      Describe your issue and we'll get back to you as soon as possible.
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
                              <Input placeholder="Brief description of your issue" {...field} />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="technical">Technical Issue</SelectItem>
                                <SelectItem value="billing">Billing</SelectItem>
                                <SelectItem value="scheduling">Scheduling</SelectItem>
                                <SelectItem value="compliance">Compliance</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                              <FormControl>
                                <SelectTrigger>
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
                                placeholder="Provide details about your issue..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createTicketMutation.isPending}>
                        {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Your Tickets</CardTitle>
                <CardDescription>{tickets.length} tickets</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-16 bg-muted rounded"></div>
                    <div className="h-16 bg-muted rounded"></div>
                  </div>
                ) : tickets.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No support tickets yet. Create one if you need help!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{ticket.subject}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, yyyy") : "Unknown"}
                              <span>•</span>
                              <span className="capitalize">{ticket.category}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={getStatusColor(ticket.status)}>
                              {formatStatus(ticket.status)}
                            </Badge>
                            <Badge variant={getPriorityColor(ticket.priority)}>
                              {ticket.priority?.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
