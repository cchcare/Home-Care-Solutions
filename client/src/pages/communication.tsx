import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageSchema, type Message, type User } from "@shared/schema";
import {
  Plus,
  Search,
  MessageCircle,
  Send,
  Paperclip,
  Users,
  Clock,
  MoreVertical,
  Eye,
  Reply,
  Archive,
  Star,
  Trash2
} from "lucide-react";

const priorityLabels = {
  low: "Low",
  normal: "Normal", 
  high: "High",
  urgent: "Urgent"
};

const priorityColors = {
  low: "bg-green-100 text-green-800",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

const statusLabels = {
  unread: "Unread",
  read: "Read",
  archived: "Archived"
};

export default function Communication() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "high_priority">("all");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages", searchTerm, activeFilter],
    retry: false,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(insertMessageSchema.omit({ id: true, createdAt: true, updatedAt: true })),
    defaultValues: {
      recipientId: "",
      subject: "",
      content: "",
      priority: "normal" as const,
      status: "unread" as const,
      attachmentUrl: "",
      parentMessageId: null,
      officeId: ""
    },
  });

  const replyForm = useForm({
    resolver: zodResolver(insertMessageSchema.omit({ id: true, createdAt: true, updatedAt: true })),
    defaultValues: {
      recipientId: "",
      subject: "",
      content: "",
      priority: "normal" as const,
      status: "unread" as const,
      attachmentUrl: "",
      parentMessageId: null,
      officeId: ""
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("POST", "/api/messages", messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setShowComposeModal(false);
      form.reset();
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    },
    onError: (error) => {
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
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest("PATCH", `/api/messages/${messageId}`, { status: "read" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleFileUploadComplete = (result: any) => {
    if (result.successful?.[0]?.uploadURL) {
      form.setValue("attachmentUrl", result.successful[0].uploadURL);
      toast({
        title: "Success",
        description: "File attached successfully",
      });
    }
  };

  const onSubmit = (data: any) => {
    sendMessageMutation.mutate({
      ...data,
      senderId: currentUser?.id
    });
  };

  const handleReply = (message: Message) => {
    replyForm.setValue("recipientId", message.senderId);
    replyForm.setValue("subject", `Re: ${message.subject}`);
    replyForm.setValue("parentMessageId", message.id);
    setSelectedMessage(message);
  };

  const handleMarkAsRead = (messageId: string) => {
    markAsReadMutation.mutate(messageId);
  };

  // Group messages by conversation (based on subject or parent message)
  const groupedMessages = messages?.reduce((groups: any, message: Message) => {
    const conversationKey = message.parentMessageId || message.subject;
    if (!groups[conversationKey]) {
      groups[conversationKey] = [];
    }
    groups[conversationKey].push(message);
    return groups;
  }, {}) || {};

  const filteredMessages = messages?.filter((message: Message) => {
    if (!searchTerm) {
      switch (activeFilter) {
        case "unread":
          return message.status === "unread";
        case "high_priority":
          return message.priority === "high" || message.priority === "urgent";
        default:
          return true;
      }
    }
    
    const sender = users?.find((u: User) => u.id === message.senderId);
    const recipient = users?.find((u: User) => u.id === message.recipientId);
    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : "";
    const recipientName = recipient ? `${recipient.firstName} ${recipient.lastName}` : "";
    
    return (
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation, messages]);

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center space-x-2 mb-6">
            <MessageCircle className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Communication Center</h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Communication Center</h1>
          </div>
          
          <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
            <DialogTrigger asChild>
              <Button data-testid="button-compose-message">
                <Plus className="w-4 h-4 mr-2" />
                Compose Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Compose New Message</DialogTitle>
                <DialogDescription>
                  Send a message to a team member or client.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="recipientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-recipient">
                                <SelectValue placeholder="Select recipient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users?.map((user: User) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName} ({user.email})
                                </SelectItem>
                              ))}
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(priorityLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Message subject..." {...field} data-testid="input-subject" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Type your message here..." 
                            {...field} 
                            className="min-h-[120px]"
                            data-testid="textarea-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-4">
                    <ObjectUploader
                      maxNumberOfFiles={3}
                      maxFileSize={25485760} // 25MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleFileUploadComplete}
                      buttonClassName="w-auto"
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Attach Files
                    </ObjectUploader>
                    {form.watch("attachmentUrl") && (
                      <span className="text-sm text-green-600">Files attached</span>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowComposeModal(false)}
                      data-testid="button-cancel-message"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={sendMessageMutation.isPending} data-testid="button-send-message">
                      <Send className="w-4 h-4 mr-2" />
                      {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              onClick={() => setActiveFilter("all")}
              size="sm"
              data-testid="filter-all"
            >
              All Messages
            </Button>
            <Button
              variant={activeFilter === "unread" ? "default" : "outline"}
              onClick={() => setActiveFilter("unread")}
              size="sm"
              data-testid="filter-unread"
            >
              Unread
            </Button>
            <Button
              variant={activeFilter === "high_priority" ? "default" : "outline"}
              onClick={() => setActiveFilter("high_priority")}
              size="sm"
              data-testid="filter-priority"
            >
              High Priority
            </Button>
          </div>
          
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-messages"
            />
          </div>
        </div>

        {/* Messages Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
          {/* Messages List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Messages ({filteredMessages?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-380px)]">
                <div className="space-y-1 p-3">
                  {filteredMessages?.map((message: Message) => {
                    const sender = users?.find((u: User) => u.id === message.senderId);
                    const isSelected = selectedMessage?.id === message.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                          isSelected ? "bg-primary/10 border border-primary/20" : ""
                        } ${message.status === "unread" ? "bg-blue-50" : ""}`}
                        onClick={() => {
                          setSelectedMessage(message);
                          if (message.status === "unread") {
                            handleMarkAsRead(message.id);
                          }
                        }}
                        data-testid={`message-item-${message.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={sender?.profileImageUrl} />
                              <AvatarFallback className="text-xs">
                                {sender?.firstName?.charAt(0)}{sender?.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm truncate">
                              {sender ? `${sender.firstName} ${sender.lastName}` : "Unknown Sender"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {message.status === "unread" && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                            )}
                            <Badge 
                              className={`text-xs ${priorityColors[message.priority as keyof typeof priorityColors]}`}
                              variant="secondary"
                            >
                              {priorityLabels[message.priority as keyof typeof priorityLabels]}
                            </Badge>
                          </div>
                        </div>
                        
                        <h4 className="font-medium text-sm mb-1 truncate">{message.subject}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {message.content}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(message.createdAt).toLocaleString()}
                          </div>
                          {message.attachmentUrl && (
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message Detail */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0 h-full">
              {selectedMessage ? (
                <div className="flex flex-col h-full">
                  {/* Message Header */}
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors[selectedMessage.priority as keyof typeof priorityColors]}>
                          {priorityLabels[selectedMessage.priority as keyof typeof priorityLabels]}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleReply(selectedMessage)}>
                          <Reply className="w-4 h-4 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={users?.find((u: User) => u.id === selectedMessage.senderId)?.profileImageUrl} />
                          <AvatarFallback className="text-xs">
                            {users?.find((u: User) => u.id === selectedMessage.senderId)?.firstName?.charAt(0)}
                            {users?.find((u: User) => u.id === selectedMessage.senderId)?.lastName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>From: {users?.find((u: User) => u.id === selectedMessage.senderId)?.firstName} {users?.find((u: User) => u.id === selectedMessage.senderId)?.lastName}</span>
                      </div>
                      <span>•</span>
                      <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Message Content */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedMessage.content}
                    </div>
                    
                    {selectedMessage.attachmentUrl && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          <span className="text-sm">Attachment</span>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </ScrollArea>
                  
                  {/* Quick Reply */}
                  {selectedMessage && (
                    <div className="p-4 border-t">
                      <Form {...replyForm}>
                        <form onSubmit={replyForm.handleSubmit((data) => {
                          sendMessageMutation.mutate({
                            ...data,
                            senderId: currentUser?.id,
                            recipientId: selectedMessage.senderId,
                            subject: `Re: ${selectedMessage.subject}`,
                            parentMessageId: selectedMessage.id
                          });
                          replyForm.reset();
                        })} className="space-y-3">
                          <FormField
                            control={replyForm.control}
                            name="content"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Type your reply..." 
                                    {...field} 
                                    className="min-h-[80px] resize-none"
                                    data-testid="textarea-reply"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex justify-end">
                            <Button type="submit" size="sm" disabled={sendMessageMutation.isPending}>
                              <Send className="w-4 h-4 mr-1" />
                              {sendMessageMutation.isPending ? "Sending..." : "Send Reply"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No message selected</h3>
                    <p className="text-muted-foreground">
                      Select a message from the list to view its contents
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {filteredMessages?.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No messages found</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Try adjusting your search terms" 
                : "Get started by composing your first message"
              }
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
