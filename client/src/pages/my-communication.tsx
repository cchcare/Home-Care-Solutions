import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { MessageSquare, Mail, Bell, User, Clock, Inbox, Send } from "lucide-react";

interface Message {
  id: string;
  subject: string;
  content: string;
  senderName: string;
  senderType: string;
  sentAt: string;
  isRead: boolean;
  type: "received" | "sent";
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
}

export default function MyCommunicationPage() {
  const [activeTab, setActiveTab] = useState("inbox");

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/my-communication/messages"],
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/my-communication/notifications"],
  });

  const receivedMessages = messages.filter(m => m.type === "received");
  const sentMessages = messages.filter(m => m.type === "sent");
  const unreadCount = receivedMessages.filter(m => !m.isRead).length;

  const isLoading = messagesLoading || notificationsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="h-64 bg-muted rounded"></div>
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
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Communication
              </h1>
              <p className="text-muted-foreground">View messages and notifications sent to you</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <Inbox className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{receivedMessages.length}</p>
                      <p className="text-sm text-muted-foreground">Received</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Send className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sentMessages.length}</p>
                      <p className="text-sm text-muted-foreground">Sent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                      <Bell className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{notifications.length}</p>
                      <p className="text-sm text-muted-foreground">Notifications</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="inbox" className="flex items-center gap-2">
                      <Inbox className="w-4 h-4" />
                      Inbox
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Sent
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Notifications
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab}>
                  <TabsContent value="inbox" className="mt-0">
                    {receivedMessages.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No messages in your inbox.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {receivedMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${!message.isRead ? 'border-primary bg-primary/5' : ''}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-medium">{message.subject}</p>
                                  <p className="text-sm text-muted-foreground">
                                    From: {message.senderName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {format(new Date(message.sentAt), "MMM d, h:mm a")}
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                              {message.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="sent" className="mt-0">
                    {sentMessages.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No sent messages.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {sentMessages.map((message) => (
                          <div
                            key={message.id}
                            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{message.subject}</p>
                                <p className="text-sm text-muted-foreground">
                                  To: {message.senderName}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {format(new Date(message.sentAt), "MMM d, h:mm a")}
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                              {message.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="notifications" className="mt-0">
                    {notifications.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No notifications.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${!notification.isRead ? 'border-primary bg-primary/5' : ''}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{notification.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {notification.message}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
