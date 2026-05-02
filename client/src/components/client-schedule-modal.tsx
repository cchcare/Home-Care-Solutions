import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonCombobox } from "@/components/ui/person-combobox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertClientScheduleSchema } from "@shared/schema";
import type { Client, Caregiver } from "@shared/schema";
import { z } from "zod";

const scheduleFormSchema = insertClientScheduleSchema.extend({
  scheduledDate: z.string().min(1, "Date is required"),
}).omit({ createdBy: true });

interface ClientScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  caregivers: Caregiver[];
  schedule?: any; // For editing existing schedule
}

export function ClientScheduleModal({ 
  isOpen, 
  onClose, 
  client, 
  caregivers,
  schedule 
}: ClientScheduleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof scheduleFormSchema>>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      clientId: client.id,
      caregiverId: null,
      scheduledDate: "",
      startTime: "09:00",
      endTime: "10:00",
      serviceType: "",
      status: "scheduled",
      notes: "",
      masterWeekSlotId: null,
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof scheduleFormSchema>) => {
      const scheduleData = {
        ...data,
        scheduledDate: new Date(data.scheduledDate),
      };
      const response = await apiRequest("POST", "/api/client-schedules", scheduleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id, "schedules"] });
      toast({
        title: "Success",
        description: "Schedule entry created successfully",
      });
      onClose();
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create schedule entry",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof scheduleFormSchema>) => {
      if (!schedule) return;
      const scheduleData = {
        ...data,
        scheduledDate: new Date(data.scheduledDate),
      };
      const response = await apiRequest("PUT", `/api/client-schedules/${schedule.id}`, scheduleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id, "schedules"] });
      toast({
        title: "Success",
        description: "Schedule entry updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update schedule entry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof scheduleFormSchema>) => {
    if (schedule) {
      updateScheduleMutation.mutate(data);
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const getCaregiverName = (caregiverId: string) => {
    const caregiver = caregivers.find(c => c.id === caregiverId);
    return caregiver ? `${caregiver.userId || 'Caregiver'}` : 'Unknown';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {schedule ? "Edit Schedule Entry" : "Add Schedule Entry"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-scheduled-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-start-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-end-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="caregiverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Caregiver</FormLabel>
                  <PersonCombobox
                    people={caregivers as any[]}
                    value={field.value || "__unassigned__"}
                    onValueChange={(v) => field.onChange(v === "__unassigned__" ? null : v)}
                    placeholder="Select a caregiver"
                    emptyOption={{ value: "__unassigned__", label: "Unassigned" }}
                    testId="select-caregiver"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      value={field.value || ""}
                      placeholder="e.g., Personal care, Medication reminder" 
                      data-testid="input-service-type" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "scheduled"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field}
                      value={field.value || ""}
                      placeholder="Additional notes about this visit..." 
                      rows={3}
                      data-testid="textarea-notes" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                data-testid="button-save-schedule"
              >
                {(createScheduleMutation.isPending || updateScheduleMutation.isPending) 
                  ? "Saving..." 
                  : schedule ? "Update Entry" : "Create Entry"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}