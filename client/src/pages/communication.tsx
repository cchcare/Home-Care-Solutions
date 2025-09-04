import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageSchema, type Message, type User } from "@shared/schema";
import {
  Plus,
  Search,
  MessageCircle,
  Send,
  Users,
  Clock,
  Eye,
  EyeOff,
  Reply,
  Archive,
  ArchiveRestore,
  Mail,
  MailOpen,
  Inbox,
  SendIcon,
  Trash2
} from "lucide-react";

const priorityLabels = {
  low: "Low",
  normal: "Normal", 
  high: "High",
  urgent: "Urgent"
};

const priorityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

export default function Communication() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<"channel" | "inbox" | "sent" | "archived">("channel");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [channelMessage, setChannelMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get channel messages (unified communication)
  const { data: channelMessages, isLoading: channelLoading } = useQuery({
    queryKey: ["/api/channel/messages"],
    queryFn: async () => {
      const response = await fetch("/api/channel/messages", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch channel messages");
      return response.json();
    },
    retry: false,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time feel
  });

  // Get all users for displaying names in channel
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Get received messages (inbox)
  const { data: inboxMessages, isLoading: inboxLoading } = useQuery({
    queryKey: ["/api/messages", "received", statusFilter === "all" ? undefined : statusFilter],
    queryFn: async () => {
      const url = new URL("/api/messages", window.location.origin);
      url.searchParams.set("type", "received");
      if (statusFilter !== "all") {
        url.searchParams.set("status", statusFilter);
      }
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch inbox messages");
      return response.json();
    },
    retry: false,
    refetchInterval: 30000,
  });

  // Get sent messages
  const { data: sentMessages, isLoading: sentLoading } = useQuery({
    queryKey: ["/api/messages", "sent", statusFilter === "all" ? undefined : statusFilter],
    queryFn: async () => {
      const url = new URL("/api/messages", window.location.origin);
      url.searchParams.set("type", "sent");
      if (statusFilter !== "all") {
        url.searchParams.set("status", statusFilter);
      }
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch sent messages");
      return response.json();
    },
    retry: false,
    refetchInterval: 30000,
  });

  // Get archived messages (both sent and received)
  const { data: archivedMessages, isLoading: archivedLoading } = useQuery({
    queryKey: ["/api/messages", "received", "archived"],
    queryFn: async () => {
      const receivedUrl = new URL("/api/messages", window.location.origin);
      receivedUrl.searchParams.set("type", "received");
      receivedUrl.searchParams.set("status", "archived");
      
      const sentUrl = new URL("/api/messages", window.location.origin);
      sentUrl.searchParams.set("type", "sent");
      sentUrl.searchParams.set("status", "archived");

      const [receivedResponse, sentResponse] = await Promise.all([
        fetch(receivedUrl.toString(), { credentials: "include" }),
        fetch(sentUrl.toString(), { credentials: "include" })
      ]);

      if (!receivedResponse.ok || !sentResponse.ok) {
        throw new Error("Failed to fetch archived messages");
      }

      const received = await receivedResponse.json();
      const sent = await sentResponse.json();
      
      return [...received, ...sent].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    retry: false,
    refetchInterval: 30000,
  });


  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(insertMessageSchema.omit({ 
      id: true, 
      createdAt: true, 
      updatedAt: true, 
      senderId: true,
      isRead: true,
      senderStatus: true,
      recipientStatus: true
    })),
    defaultValues: {
      recipientId: "",
      subject: "",
      content: "",
      priority: "normal" as const,
      messageType: "message" as const,
      attachmentUrl: "",
      parentMessageId: null,
      relatedClientId: ""
    },
  });

  // Scroll to bottom when new channel messages arrive
  useEffect(() => {
    if (activeTab === "channel" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [channelMessages, activeTab]);

  // Send channel message
  const sendChannelMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch("/api/channel/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setChannelMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/channel/messages"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent to the team channel",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendChannelMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (channelMessage.trim()) {
      sendChannelMessage.mutate(channelMessage.trim());
    }
  };

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

  const updateMessageStatusMutation = useMutation({
    mutationFn: async ({ messageId, action }: { messageId: string; action: 'read' | 'unread' | 'archive' }) => {
      await apiRequest("PUT", `/api/messages/${messageId}/${action}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
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
        description: "Failed to update message",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: any) => {
    sendMessageMutation.mutate(values);
  };

  const handleMarkRead = (messageId: string) => {
    updateMessageStatusMutation.mutate({ messageId, action: 'read' });
  };

  const handleMarkUnread = (messageId: string) => {
    updateMessageStatusMutation.mutate({ messageId, action: 'unread' });
  };

  const handleArchive = (messageId: string) => {
    updateMessageStatusMutation.mutate({ messageId, action: 'archive' });
  };

  const getUserName = (userId: string) => {
    const user = users?.find((u: User) => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : "Unknown User";
  };

  const getUserInitials = (userId: string) => {
    const user = users?.find((u: User) => u.id === userId);
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const getMessagesForTab = () => {
    switch (activeTab) {
      case "channel":
        return channelMessages || [];
      case "inbox":
        return inboxMessages || [];
      case "sent":
        return sentMessages || [];
      case "archived":
        return archivedMessages || [];
      default:
        return [];
    }
  };

  const getLoadingForTab = () => {
    switch (activeTab) {
      case "channel":
        return channelLoading;
      case "inbox":
        return inboxLoading;
      case "sent":
        return sentLoading;
      case "archived":
        return archivedLoading;
      default:
        return false;
    }
  };

  const filteredMessages = getMessagesForTab().filter((message: Message) => {
    if (activeTab === "channel") return true; // No filtering for channel
    if (searchTerm === "") return true;
    
    const searchContent = [
      message.subject,
      message.content,
      getUserName(activeTab === "sent" ? message.recipientId || "" : message.senderId || "")
    ].join(" ").toLowerCase();
    
    return searchContent.includes(searchTerm.toLowerCase());
  });

  const getUnreadCount = () => {
    return inboxMessages?.filter((msg: Message) => !msg.isRead).length || 0;
  };

  const renderMessage = (message: Message) => {
    const isReceivedMessage = message.recipientId === (currentUser as any)?.id;
    const otherUserId = isReceivedMessage ? message.senderId : message.recipientId;
    const userName = getUserName(otherUserId || "");
    const userInitials = getUserInitials(otherUserId || "");
    
    return (
      <Card 
        key={message.id} 
        className={`mb-4 cursor-pointer transition-colors hover:bg-muted/50 ${
          !message.isRead && isReceivedMessage ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" : ""
        }`}
        onClick={() => {
          if (!message.isRead && isReceivedMessage) {
            handleMarkRead(message.id);
          }
        }}
        data-testid={`message-card-${message.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between space-x-4">
            <div className="flex items-start space-x-3 flex-1">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-foreground" data-testid={`message-sender-${message.id}`}>
                      {activeTab === "sent" ? `To: ${userName}` : `From: ${userName}`}
                    </span>
                    {!message.isRead && isReceivedMessage && (
                      <Badge variant="secondary" className="text-xs">Unread</Badge>
                    )}
                    {message.priority && message.priority !== "normal" && (
                      <Badge className={`text-xs ${priorityColors[message.priority as keyof typeof priorityColors]}`}>
                        {priorityLabels[message.priority as keyof typeof priorityLabels]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.createdAt).toLocaleDateString()} {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
                
                <h3 className="font-medium text-foreground mb-1 truncate" data-testid={`message-subject-${message.id}`}>
                  {message.subject || "No Subject"}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`message-content-${message.id}`}>
                  {message.content}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              {isReceivedMessage && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      message.isRead ? handleMarkUnread(message.id) : handleMarkRead(message.id);
                    }}
                    data-testid={`button-toggle-read-${message.id}`}
                  >
                    {message.isRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </>
              )}
              
              {activeTab !== "archived" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(message.id);
                  }}
                  data-testid={`button-archive-${message.id}`}
                >
                  <Archive className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Communication Center"
          subtitle="Internal messaging and notifications"
        />
        
        {/* Header */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <MessageCircle className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">Messages</h1>
            </div>
          </div>
          {activeTab !== "channel" && (
            <Button onClick={() => setShowComposeModal(true)} data-testid="button-compose-message">
              <Plus className="w-4 h-4 mr-2" />
              Compose Message
            </Button>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-6xl mx-auto">
            
            {/* Tabs and Controls */}
            <div className="mb-6">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="grid w-full max-w-2xl grid-cols-4">
                    <TabsTrigger value="channel" className="flex items-center space-x-2" data-testid="tab-channel">
                      <Users className="w-4 h-4" />
                      <span>Team Channel</span>
                    </TabsTrigger>
                    <TabsTrigger value="inbox" className="flex items-center space-x-2" data-testid="tab-inbox">
                      <Inbox className="w-4 h-4" />
                      <span>Inbox</span>
                      {getUnreadCount() > 0 && (
                        <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs px-1">
                          {getUnreadCount()}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="flex items-center space-x-2" data-testid="tab-sent">
                      <SendIcon className="w-4 h-4" />
                      <span>Sent</span>
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="flex items-center space-x-2" data-testid="tab-archived">
                      <Archive className="w-4 h-4" />
                      <span>Archived</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Search and Filters - Hidden for channel */}
                  {activeTab !== "channel" && (
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search messages..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                          data-testid="input-search-messages"
                        />
                      </div>
                      
                      {activeTab === "inbox" && (
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                          <SelectTrigger className="w-32" data-testid="select-status-filter">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="unread">Unread</SelectItem>
                            <SelectItem value="read">Read</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>

                <TabsContent value="channel" data-testid="content-channel">
                  <div className="flex flex-col h-[calc(100vh-280px)]">
                    {/* Channel Messages */}
                    <ScrollArea className="flex-1 p-4 mb-4">
                      <div className="space-y-4">
                        {getLoadingForTab() ? (
                          <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="mt-2 text-muted-foreground">Loading team channel...</p>
                          </div>
                        ) : channelMessages && channelMessages.length > 0 ? (
                          channelMessages.map((message: Message) => {
                            const isCurrentUser = message.senderId === (currentUser as any)?.id;
                            return (
                              <div
                                key={message.id}
                                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
                                data-testid={`channel-message-${message.id}`}
                              >
                                <div className={`flex items-start space-x-2 max-w-[70%] ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                  <Avatar className="w-8 h-8 flex-shrink-0">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                      {getUserInitials(message.senderId || "")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                                    <div className={`rounded-lg px-3 py-2 ${
                                      isCurrentUser 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted text-foreground'
                                    }`}>
                                      <div className="flex items-center space-x-2 mb-1">
                                        <span className="text-xs font-medium">
                                          {getUserName(message.senderId || "")}
                                        </span>
                                        <span className="text-xs opacity-70">
                                          {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                      </div>
                                      <p className="text-sm">{message.content}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-12">
                            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Team Channel</h3>
                            <p className="text-muted-foreground">
                              Start the conversation! Send a message to your team.
                            </p>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <form onSubmit={handleSendChannelMessage} className="border-t pt-4">
                      <div className="flex space-x-2">
                        <Input
                          value={channelMessage}
                          onChange={(e) => setChannelMessage(e.target.value)}
                          placeholder="Type a message to your team..."
                          className="flex-1"
                          data-testid="input-channel-message"
                          disabled={sendChannelMessage.isPending}
                        />
                        <Button 
                          type="submit" 
                          disabled={!channelMessage.trim() || sendChannelMessage.isPending}
                          data-testid="button-send-channel-message"
                        >
                          {sendChannelMessage.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </TabsContent>

                <TabsContent value="inbox" data-testid="content-inbox">
                  <div className="space-y-4">
                    {getLoadingForTab() ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-2 text-muted-foreground">Loading messages...</p>
                      </div>
                    ) : filteredMessages.length > 0 ? (
                      <ScrollArea className="h-[calc(100vh-280px)]">
                        {filteredMessages.map(renderMessage)}
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12">
                        <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No messages found</h3>
                        <p className="text-muted-foreground">
                          {searchTerm ? "Try adjusting your search terms" : "Your inbox is empty"}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="sent" data-testid="content-sent">
                  <div className="space-y-4">
                    {getLoadingForTab() ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-2 text-muted-foreground">Loading sent messages...</p>
                      </div>
                    ) : filteredMessages.length > 0 ? (
                      <ScrollArea className="h-[calc(100vh-280px)]">
                        {filteredMessages.map(renderMessage)}
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12">
                        <SendIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No sent messages</h3>
                        <p className="text-muted-foreground">
                          {searchTerm ? "Try adjusting your search terms" : "You haven't sent any messages yet"}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="archived" data-testid="content-archived">
                  <div className="space-y-4">
                    {getLoadingForTab() ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-2 text-muted-foreground">Loading archived messages...</p>
                      </div>
                    ) : filteredMessages.length > 0 ? (
                      <ScrollArea className="h-[calc(100vh-280px)]">
                        {filteredMessages.map(renderMessage)}
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12">
                        <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No archived messages</h3>
                        <p className="text-muted-foreground">
                          {searchTerm ? "Try adjusting your search terms" : "No messages have been archived yet"}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Compose Message Modal */}
        <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Compose New Message</DialogTitle>
              <DialogDescription>
                Send a message to another user in your organization.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="recipientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-recipient">
                            <SelectValue placeholder="Select recipient" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map((user: User) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : user.email
                              } ({user.role})
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
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
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
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Message subject" data-testid="input-subject" />
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
                          {...field} 
                          placeholder="Type your message here..." 
                          rows={6}
                          data-testid="textarea-message-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowComposeModal(false)}
                    data-testid="button-cancel-message"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}