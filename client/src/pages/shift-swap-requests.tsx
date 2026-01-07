import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ArrowLeftRight, Check, X, Clock, Loader2, Plus, AlertCircle } from "lucide-react";
import type { Caregiver, CaregiverSchedule, Client, ShiftSwapRequest } from "@shared/schema";

interface EnrichedShiftSwapRequest extends ShiftSwapRequest {
  schedule?: CaregiverSchedule;
  requestingCaregiver?: Caregiver;
  targetCaregiver?: Caregiver;
  reviewer?: { id: string; firstName?: string; lastName?: string };
  client?: Client;
}

const createRequestSchema = z.object({
  scheduleId: z.string().min(1, "Schedule is required"),
  targetCaregiverId: z.string().optional(),
  reason: z.string().optional(),
  officeId: z.string().optional(),
});

const reviewSchema = z.object({
  notes: z.string().optional(),
});

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function ShiftSwapRequestCard({ 
  request, 
  isManager, 
  currentCaregiverId,
  onApprove,
  onReject,
  onCancel,
  isPending
}: { 
  request: EnrichedShiftSwapRequest; 
  isManager: boolean;
  currentCaregiverId?: string;
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, notes?: string) => void;
  onCancel: (id: string) => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const isOwnRequest = currentCaregiverId === request.requestingCaregiverId;
  const canCancel = isOwnRequest && request.status === "pending";

  return (
    <Card data-testid={`shift-swap-card-${request.id}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Shift Swap Request
            </CardTitle>
            <CardDescription>
              Created {request.createdAt ? format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a") : "N/A"}
            </CardDescription>
          </div>
          {getStatusBadge(request.status || "pending")}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Requesting Caregiver</p>
            <p className="font-medium" data-testid={`requesting-caregiver-${request.id}`}>
              {request.requestingCaregiver?.firstName} {request.requestingCaregiver?.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Target Caregiver</p>
            <p className="font-medium" data-testid={`target-caregiver-${request.id}`}>
              {request.targetCaregiver 
                ? `${request.targetCaregiver.firstName} ${request.targetCaregiver.lastName}`
                : "Not specified (open swap)"}
            </p>
          </div>
          {request.schedule && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Schedule Date</p>
                <p className="font-medium" data-testid={`schedule-date-${request.id}`}>
                  {request.schedule.scheduledDate ? format(new Date(request.schedule.scheduledDate), "EEEE, MMM d, yyyy") : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Shift Time</p>
                <p className="font-medium" data-testid={`schedule-time-${request.id}`}>
                  {request.schedule.startTime} - {request.schedule.endTime}
                </p>
              </div>
            </>
          )}
          {request.client && (
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-medium" data-testid={`client-name-${request.id}`}>
                {request.client.firstName} {request.client.lastName}
              </p>
            </div>
          )}
        </div>

        {request.reason && (
          <div>
            <p className="text-sm text-muted-foreground">Reason</p>
            <p className="text-sm" data-testid={`reason-${request.id}`}>{request.reason}</p>
          </div>
        )}

        {request.reviewNotes && (
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">Review Notes</p>
            <p className="text-sm" data-testid={`review-notes-${request.id}`}>{request.reviewNotes}</p>
            {request.reviewer && (
              <p className="text-xs text-muted-foreground mt-1">
                Reviewed by {request.reviewer.firstName} {request.reviewer.lastName}
                {request.reviewedAt && ` on ${format(new Date(request.reviewedAt), "MMM d, yyyy")}`}
              </p>
            )}
          </div>
        )}

        {request.status === "pending" && (
          <div className="flex gap-2 pt-2">
            {isManager && (
              <>
                <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm"
                      data-testid={`approve-btn-${request.id}`}
                      disabled={isPending}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Approve Shift Swap Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Add optional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        data-testid="approve-notes-input"
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" data-testid="cancel-approve-dialog">Cancel</Button>
                      </DialogClose>
                      <Button 
                        onClick={() => {
                          onApprove(request.id, notes);
                          setShowApproveDialog(false);
                          setNotes("");
                        }}
                        disabled={isPending}
                        data-testid="confirm-approve-btn"
                      >
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirm Approval
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      data-testid={`reject-btn-${request.id}`}
                      disabled={isPending}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Shift Swap Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Add reason for rejection..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        data-testid="reject-notes-input"
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" data-testid="cancel-reject-dialog">Cancel</Button>
                      </DialogClose>
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          onReject(request.id, notes);
                          setShowRejectDialog(false);
                          setNotes("");
                        }}
                        disabled={isPending}
                        data-testid="confirm-reject-btn"
                      >
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirm Rejection
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
            
            {canCancel && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCancel(request.id)}
                disabled={isPending}
                data-testid={`cancel-btn-${request.id}`}
              >
                Cancel Request
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateRequestDialog({ 
  caregiverId,
  officeId
}: { 
  caregiverId?: string;
  officeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createRequestSchema>>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      scheduleId: "",
      targetCaregiverId: "",
      reason: "",
      officeId: officeId || "",
    },
  });

  const { data: schedules = [] } = useQuery<CaregiverSchedule[]>({
    queryKey: ["/api/caregiver-schedules", { caregiverId }],
    enabled: !!caregiverId,
  });

  const { data: caregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createRequestSchema>) => {
      return apiRequest("POST", "/api/shift-swap-requests", {
        ...data,
        requestingCaregiverId: caregiverId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swap-requests"] });
      toast({ title: "Success", description: "Shift swap request created successfully" });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create shift swap request",
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: z.infer<typeof createRequestSchema>) => {
    createMutation.mutate(data);
  };

  const upcomingSchedules = schedules.filter(s => 
    s.scheduledDate && new Date(s.scheduledDate) >= new Date()
  );

  const otherCaregivers = caregivers.filter(c => c.id !== caregiverId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="create-swap-request-btn">
          <Plus className="w-4 h-4 mr-2" />
          New Swap Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Shift Swap Request</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="scheduleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Schedule to Swap</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="schedule-select">
                        <SelectValue placeholder="Select a schedule..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {upcomingSchedules.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No upcoming schedules</div>
                      ) : (
                        upcomingSchedules.map((schedule) => (
                          <SelectItem key={schedule.id} value={schedule.id} data-testid={`schedule-option-${schedule.id}`}>
                            {schedule.scheduledDate ? format(new Date(schedule.scheduledDate), "MMM d, yyyy") : "N/A"} - {schedule.startTime} to {schedule.endTime}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetCaregiverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Swap With (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="target-caregiver-select">
                        <SelectValue placeholder="Leave empty for open swap request..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Open Request (Any Caregiver)</SelectItem>
                      {otherCaregivers.map((caregiver) => (
                        <SelectItem key={caregiver.id} value={caregiver.id} data-testid={`caregiver-option-${caregiver.id}`}>
                          {caregiver.firstName} {caregiver.lastName}
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Why do you need to swap this shift?"
                      {...field}
                      data-testid="reason-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" data-testid="cancel-create-dialog">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createMutation.isPending} data-testid="submit-swap-request-btn">
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ShiftSwapRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isManager = user?.role && ["admin", "office_admin", "super_admin", "supervisor"].includes(user.role);

  const { data: caregiver } = useQuery<Caregiver>({
    queryKey: ["/api/caregivers/by-user", user?.id],
    enabled: !!user?.id,
  });

  const { data: allRequests = [], isLoading } = useQuery<EnrichedShiftSwapRequest[]>({
    queryKey: ["/api/shift-swap-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return apiRequest("PUT", `/api/shift-swap-requests/${id}/approve`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swap-requests"] });
      toast({ title: "Success", description: "Request approved successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to approve request",
        variant: "destructive"
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return apiRequest("PUT", `/api/shift-swap-requests/${id}/reject`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swap-requests"] });
      toast({ title: "Success", description: "Request rejected" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to reject request",
        variant: "destructive"
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PUT", `/api/shift-swap-requests/${id}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swap-requests"] });
      toast({ title: "Success", description: "Request cancelled" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to cancel request",
        variant: "destructive"
      });
    },
  });

  const myRequests = allRequests.filter(r => r.requestingCaregiverId === caregiver?.id);
  const pendingApprovals = allRequests.filter(r => r.status === "pending");

  const handleApprove = (id: string, notes?: string) => {
    approveMutation.mutate({ id, notes });
  };

  const handleReject = (id: string, notes?: string) => {
    rejectMutation.mutate({ id, notes });
  };

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id);
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 bg-background">
          <div className="container mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold" data-testid="page-title">Shift Swap Requests</h1>
                <p className="text-muted-foreground">Manage shift swap requests between caregivers</p>
              </div>
              {caregiver && (
                <CreateRequestDialog 
                  caregiverId={caregiver.id} 
                  officeId={user?.primaryOfficeId || undefined}
                />
              )}
            </div>

        <Tabs defaultValue="my-requests" className="w-full">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="my-requests" data-testid="my-requests-tab">
              My Requests {myRequests.length > 0 && `(${myRequests.length})`}
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="pending-approvals" data-testid="pending-approvals-tab">
                Pending Approvals {pendingApprovals.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingApprovals.length}</Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="all-requests" data-testid="all-requests-tab">
              All Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-requests" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : myRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground" data-testid="no-requests-message">You haven't made any swap requests yet</p>
                </CardContent>
              </Card>
            ) : (
              myRequests.map((request) => (
                <ShiftSwapRequestCard
                  key={request.id}
                  request={request}
                  isManager={isManager || false}
                  currentCaregiverId={caregiver?.id}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onCancel={handleCancel}
                  isPending={isPending}
                />
              ))
            )}
          </TabsContent>

          {isManager && (
            <TabsContent value="pending-approvals" className="space-y-4 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : pendingApprovals.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Check className="w-12 h-12 text-green-500 mb-4" />
                    <p className="text-muted-foreground" data-testid="no-pending-message">No pending swap requests to review</p>
                  </CardContent>
                </Card>
              ) : (
                pendingApprovals.map((request) => (
                  <ShiftSwapRequestCard
                    key={request.id}
                    request={request}
                    isManager={true}
                    currentCaregiverId={caregiver?.id}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onCancel={handleCancel}
                    isPending={isPending}
                  />
                ))
              )}
            </TabsContent>
          )}

          <TabsContent value="all-requests" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : allRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground" data-testid="no-all-requests-message">No swap requests found</p>
                </CardContent>
              </Card>
            ) : (
              allRequests.map((request) => (
                <ShiftSwapRequestCard
                  key={request.id}
                  request={request}
                  isManager={isManager || false}
                  currentCaregiverId={caregiver?.id}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onCancel={handleCancel}
                  isPending={isPending}
                />
              ))
            )}
          </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
