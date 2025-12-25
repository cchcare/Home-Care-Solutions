import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { apiRequest } from "@/lib/queryClient";
import { OfficeSelector } from "@/components/office-selector";
import { useOffice } from "@/context/office-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import {
  Cake,
  Send,
  Mail,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Users,
  CalendarDays,
  PartyPopper,
} from "lucide-react";

interface UpcomingBirthday {
  type: "client" | "caregiver";
  id: number;
  name: string;
  dateOfBirth: string;
  daysUntil: number;
  email: string | null;
  phone: string | null;
  officeId: number | null;
}

interface BirthdayNotification {
  id: number;
  recipientType: string;
  recipientId: number;
  recipientName: string;
  channel: string;
  sentAt: string;
  status: string;
  messagePreview: string | null;
}

export default function BirthdayNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOfficeId, setSelectedOfficeId } = useOffice();
  const [activeTab, setActiveTab] = useState("upcoming");

  const officeQuery = selectedOfficeId === "all" ? undefined : selectedOfficeId;

  const { data: upcomingBirthdays = [], isLoading: upcomingLoading } = useQuery<UpcomingBirthday[]>({
    queryKey: ["/api/birthday-notifications/upcoming", { days: 14, officeId: officeQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("days", "14");
      if (officeQuery) params.set("officeId", officeQuery);
      const response = await fetch(`/api/birthday-notifications/upcoming?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch upcoming birthdays");
      const data = await response.json();
      const today = new Date();
      const combinedBirthdays: UpcomingBirthday[] = [
        ...(data.clients || []).map((c: any) => {
          const dob = new Date(c.dateOfBirth);
          const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          if (nextBirthday < today) nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
          const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return { type: "client" as const, id: c.id, name: `${c.firstName} ${c.lastName}`, dateOfBirth: c.dateOfBirth, daysUntil, email: c.email, phone: c.phone, officeId: c.officeId };
        }),
        ...(data.caregivers || []).map((c: any) => {
          const dob = new Date(c.dateOfBirth);
          const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          if (nextBirthday < today) nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
          const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return { type: "caregiver" as const, id: c.id, name: `${c.firstName} ${c.lastName}`, dateOfBirth: c.dateOfBirth, daysUntil, email: c.email, phone: c.phone, officeId: c.officeId };
        }),
      ];
      return combinedBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    },
  });

  const { data: todaysBirthdays = [], isLoading: todayLoading } = useQuery<UpcomingBirthday[]>({
    queryKey: ["/api/birthday-notifications/today", { officeId: officeQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (officeQuery) params.set("officeId", officeQuery);
      const response = await fetch(`/api/birthday-notifications/today?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch today's birthdays");
      const data = await response.json();
      const combinedBirthdays: UpcomingBirthday[] = [
        ...(data.clients || []).map((c: any) => ({ type: "client" as const, id: c.id, name: `${c.firstName} ${c.lastName}`, dateOfBirth: c.dateOfBirth, daysUntil: 0, email: c.email, phone: c.phone, officeId: c.officeId })),
        ...(data.caregivers || []).map((c: any) => ({ type: "caregiver" as const, id: c.id, name: `${c.firstName} ${c.lastName}`, dateOfBirth: c.dateOfBirth, daysUntil: 0, email: c.email, phone: c.phone, officeId: c.officeId })),
      ];
      return combinedBirthdays;
    },
  });

  const { data: notificationHistory = [], isLoading: historyLoading } = useQuery<BirthdayNotification[]>({
    queryKey: ["/api/birthday-notifications", { officeId: officeQuery, limit: 50 }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (officeQuery) params.set("officeId", officeQuery);
      const response = await fetch(`/api/birthday-notifications?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch notification history");
      return response.json();
    },
  });

  const sendNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/birthday-notifications/send", {
        officeId: officeQuery,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Birthday Notifications Sent",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/birthday-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/birthday-notifications/today"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Notifications",
        description: error.message || "Could not send birthday notifications",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "skipped":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Skipped</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="w-4 h-4 text-blue-500" />;
      case "sms":
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getDaysUntilBadge = (days: number) => {
    if (days === 0) {
      return <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300"><PartyPopper className="w-3 h-3 mr-1" />Today!</Badge>;
    } else if (days === 1) {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Tomorrow</Badge>;
    } else {
      return <Badge variant="secondary">{days} days</Badge>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Cake className="w-8 h-8 text-pink-500" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">
                    Birthday Notifications
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400">
                    Send birthday wishes to clients and caregivers via email and SMS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <OfficeSelector
                  selectedOfficeId={selectedOfficeId === "all" ? undefined : selectedOfficeId}
                  onOfficeChange={setSelectedOfficeId}
                />
                <Button
                  onClick={() => sendNotificationsMutation.mutate()}
                  disabled={sendNotificationsMutation.isPending || todaysBirthdays.length === 0}
                  data-testid="button-send-notifications"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendNotificationsMutation.isPending ? "Sending..." : "Send Today's Wishes"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-pink-100 dark:bg-pink-900 rounded-full">
                      <PartyPopper className="w-6 h-6 text-pink-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Today's Birthdays</p>
                      <p className="text-2xl font-bold" data-testid="text-today-count">{todaysBirthdays.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <CalendarDays className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming (14 days)</p>
                      <p className="text-2xl font-bold" data-testid="text-upcoming-count">{upcomingBirthdays.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sent This Month</p>
                      <p className="text-2xl font-bold" data-testid="text-sent-count">
                        {notificationHistory.filter(n => n.status === "sent").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming" data-testid="tab-upcoming">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Upcoming Birthdays
                </TabsTrigger>
                <TabsTrigger value="today" data-testid="tab-today">
                  <PartyPopper className="w-4 h-4 mr-2" />
                  Today's Birthdays
                </TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-history">
                  <Clock className="w-4 h-4 mr-2" />
                  Sent History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5" />
                      Upcoming Birthdays (Next 14 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : upcomingBirthdays.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Cake className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No upcoming birthdays in the next 14 days</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Birthday</TableHead>
                              <TableHead>Days Until</TableHead>
                              <TableHead>Contact</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {upcomingBirthdays.map((birthday) => (
                              <TableRow key={`${birthday.type}-${birthday.id}`} data-testid={`row-birthday-${birthday.type}-${birthday.id}`}>
                                <TableCell>
                                  <Badge variant={birthday.type === "client" ? "default" : "secondary"}>
                                    {birthday.type === "client" ? <User className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                                    {birthday.type === "client" ? "Client" : "Caregiver"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{birthday.name}</TableCell>
                                <TableCell>
                                  {birthday.dateOfBirth ? format(parseISO(birthday.dateOfBirth), "MMM d") : "N/A"}
                                </TableCell>
                                <TableCell>{getDaysUntilBadge(birthday.daysUntil)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {birthday.email && <span title={birthday.email}><Mail className="w-4 h-4 text-blue-500" /></span>}
                                    {birthday.phone && <span title={birthday.phone}><MessageCircle className="w-4 h-4 text-green-500" /></span>}
                                    {!birthday.email && !birthday.phone && (
                                      <span className="text-gray-400 text-sm">No contact info</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="today">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PartyPopper className="w-5 h-5 text-pink-500" />
                      Today's Birthdays
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {todayLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : todaysBirthdays.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Cake className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No birthdays today</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {todaysBirthdays.map((birthday) => (
                          <Card key={`${birthday.type}-${birthday.id}`} className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20" data-testid={`card-today-birthday-${birthday.type}-${birthday.id}`}>
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 bg-pink-100 dark:bg-pink-900 rounded-full">
                                    <Cake className="w-6 h-6 text-pink-500" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-lg">{birthday.name}</p>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <Badge variant={birthday.type === "client" ? "default" : "secondary"}>
                                        {birthday.type === "client" ? "Client" : "Caregiver"}
                                      </Badge>
                                      {birthday.email && (
                                        <span className="flex items-center gap-1">
                                          <Mail className="w-3 h-3" />{birthday.email}
                                        </span>
                                      )}
                                      {birthday.phone && (
                                        <span className="flex items-center gap-1">
                                          <MessageCircle className="w-3 h-3" />{birthday.phone}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <PartyPopper className="w-8 h-8 text-pink-500 animate-bounce" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Notification History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : notificationHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Send className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No birthday notifications have been sent yet</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Sent At</TableHead>
                              <TableHead>Recipient</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Channel</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {notificationHistory.map((notification) => (
                              <TableRow key={notification.id} data-testid={`row-notification-${notification.id}`}>
                                <TableCell>
                                  {format(parseISO(notification.sentAt), "MMM d, yyyy h:mm a")}
                                </TableCell>
                                <TableCell className="font-medium">{notification.recipientName}</TableCell>
                                <TableCell>
                                  <Badge variant={notification.recipientType === "client" ? "default" : "secondary"}>
                                    {notification.recipientType === "client" ? "Client" : "Caregiver"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {getChannelIcon(notification.channel)}
                                    <span className="capitalize">{notification.channel}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(notification.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
