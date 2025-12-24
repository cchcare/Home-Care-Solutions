import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Copy, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertMasterWeekTemplateSchema } from "@shared/schema";
import type { Client, MasterWeekTemplate, MasterWeekSlot, Caregiver } from "@shared/schema";
import { z } from "zod";

const templateFormSchema = insertMasterWeekTemplateSchema.extend({
  startDate: z.string().min(1, "From date is required"),
  endDate: z.string().optional(),
  recurrenceWeeks: z.number().min(1).default(1),
});

interface DaySlot {
  dayOfWeek: number;
  scheduleType: string;
  startTime: string;
  endTime: string;
  caregiverId: string | null;
  payCode: string;
  poc: string;
  primaryBillTo: string;
  serviceCode: string;
  budgetNumber: string;
  rateType: string;
  hourlyRate: string;
  includeMileage: boolean;
  serviceType: string;
  notes: string;
}

const DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const SCHEDULE_TYPES = [
  { value: "daily_fixed", label: "Daily Fixed" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As Needed" },
];

const SERVICE_CODES = [
  { value: "S5125", label: "S5125" },
  { value: "S5126", label: "S5126" },
  { value: "S5130", label: "S5130" },
  { value: "S5131", label: "S5131" },
  { value: "T1019", label: "T1019" },
  { value: "T1020", label: "T1020" },
];

const PAY_CODES = [
  { value: "regular", label: "Regular" },
  { value: "overtime", label: "Overtime" },
  { value: "holiday", label: "Holiday" },
];

const PRIMARY_BILL_TO_OPTIONS = [
  { value: "LTC - FC (RQ2)", label: "LTC - FC (RQ2)" },
  { value: "LTC - CL", label: "LTC - CL" },
  { value: "Private Pay", label: "Private Pay" },
];

interface MasterWeekTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  template?: MasterWeekTemplate | null;
  caregivers: Caregiver[];
}

function calculateDuration(startTime: string, endTime: string): { hours: number; minutes: number } {
  if (!startTime || !endTime) return { hours: 0, minutes: 0 };
  
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  
  let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
  
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

function createEmptySlot(dayOfWeek: number): DaySlot {
  return {
    dayOfWeek,
    scheduleType: "daily_fixed",
    startTime: "",
    endTime: "",
    caregiverId: null,
    payCode: "",
    poc: "",
    primaryBillTo: "LTC - FC (RQ2)",
    serviceCode: "S5125",
    budgetNumber: "",
    rateType: "Hourly",
    hourlyRate: "",
    includeMileage: false,
    serviceType: "",
    notes: "",
  };
}

export function MasterWeekTemplateModal({ 
  isOpen, 
  onClose, 
  client, 
  template,
  caregivers 
}: MasterWeekTemplateModalProps) {
  const [daySlots, setDaySlots] = useState<DaySlot[]>(
    DAYS.map(d => createEmptySlot(d.value))
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: `Master Week - ${client.firstName} ${client.lastName}`,
      description: "",
      clientId: client.id,
      isActive: true,
      autoRollover: false,
      startDate: "",
      endDate: "",
      recurrenceWeeks: 1,
    },
  });

  // Load template data when editing
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description || "",
        clientId: template.clientId,
        isActive: template.isActive ?? true,
        autoRollover: template.autoRollover ?? false,
        startDate: template.startDate ? new Date(template.startDate).toISOString().split('T')[0] : "",
        endDate: template.endDate ? new Date(template.endDate).toISOString().split('T')[0] : "",
        recurrenceWeeks: (template as any).recurrenceWeeks || 1,
      });
    } else {
      form.reset({
        name: `Master Week - ${client.firstName} ${client.lastName}`,
        description: "",
        clientId: client.id,
        isActive: true,
        autoRollover: false,
        startDate: "",
        endDate: "",
        recurrenceWeeks: 1,
      });
      setDaySlots(DAYS.map(d => createEmptySlot(d.value)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, client]);

  // Fetch existing slots if editing template
  const { data: existingSlots = [] } = useQuery<MasterWeekSlot[]>({
    queryKey: ["/api/master-week-templates", template?.id, "slots"],
    enabled: !!template?.id,
    retry: false,
  });

  useEffect(() => {
    if (existingSlots.length > 0) {
      const newDaySlots = DAYS.map(d => {
        const existing = existingSlots.find(s => s.dayOfWeek === d.value);
        if (existing) {
          return {
            dayOfWeek: existing.dayOfWeek,
            scheduleType: (existing as any).scheduleType || "daily_fixed",
            startTime: existing.startTime || "",
            endTime: existing.endTime || "",
            caregiverId: existing.caregiverId,
            payCode: (existing as any).payCode || "",
            poc: (existing as any).poc || "",
            primaryBillTo: (existing as any).primaryBillTo || "LTC - FC (RQ2)",
            serviceCode: (existing as any).serviceCode || "S5125",
            budgetNumber: (existing as any).budgetNumber || "",
            rateType: (existing as any).rateType || "Hourly",
            hourlyRate: (existing as any).hourlyRate?.toString() || "",
            includeMileage: (existing as any).includeMileage || false,
            serviceType: existing.serviceType || "",
            notes: existing.notes || "",
          };
        }
        return createEmptySlot(d.value);
      });
      setDaySlots(newDaySlots);
    }
  }, [existingSlots]);

  const updateDaySlot = (dayOfWeek: number, field: keyof DaySlot, value: any) => {
    setDaySlots(prev => prev.map(slot => 
      slot.dayOfWeek === dayOfWeek ? { ...slot, [field]: value } : slot
    ));
  };

  const getCaregiverName = (caregiverId: string | null) => {
    if (!caregiverId) return "";
    const caregiver = caregivers.find(c => c.id === caregiverId);
    if (!caregiver) return "";
    return (caregiver as any).firstName && (caregiver as any).lastName 
      ? `${(caregiver as any).firstName} ${(caregiver as any).lastName}`
      : `Caregiver`;
  };

  const getCaregiverAssignmentId = (caregiverId: string | null) => {
    if (!caregiverId) return "";
    const caregiver = caregivers.find(c => c.id === caregiverId);
    return (caregiver as any)?.assignmentId || "";
  };

  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateFormSchema>) => {
      const templateData = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      };

      const response = await apiRequest("POST", "/api/master-week-templates", templateData);
      const newTemplate = await response.json();

      // Create slots for each day that has data
      for (const slot of daySlots) {
        if (slot.startTime && slot.endTime) {
          const slotData = {
            templateId: newTemplate.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            caregiverId: slot.caregiverId,
            serviceType: slot.serviceType,
            notes: slot.notes,
            isRecurring: true,
            scheduleType: slot.scheduleType,
            payCode: slot.payCode,
            poc: slot.poc,
            primaryBillTo: slot.primaryBillTo,
            serviceCode: slot.serviceCode,
            budgetNumber: slot.budgetNumber,
            rateType: slot.rateType,
            hourlyRate: slot.hourlyRate ? parseFloat(slot.hourlyRate) : null,
            includeMileage: slot.includeMileage,
          };
          await apiRequest("POST", "/api/master-week-slots", slotData);
        }
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id, "master-week"] });
      toast({
        title: "Success",
        description: "Master week template created successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create master week template",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateFormSchema>) => {
      if (!template) return;

      const templateData = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      };

      const response = await apiRequest("PUT", `/api/master-week-templates/${template.id}`, templateData);
      const updatedTemplate = await response.json();

      // Delete existing slots and recreate
      const existingSlotsResponse = await apiRequest("GET", `/api/master-week-templates/${template.id}/slots`);
      const existingSlotsData = await existingSlotsResponse.json();
      
      for (const slot of existingSlotsData) {
        await apiRequest("DELETE", `/api/master-week-slots/${slot.id}`);
      }

      // Create new slots
      for (const slot of daySlots) {
        if (slot.startTime && slot.endTime) {
          const slotData = {
            templateId: template.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            caregiverId: slot.caregiverId,
            serviceType: slot.serviceType,
            notes: slot.notes,
            isRecurring: true,
            scheduleType: slot.scheduleType,
            payCode: slot.payCode,
            poc: slot.poc,
            primaryBillTo: slot.primaryBillTo,
            serviceCode: slot.serviceCode,
            budgetNumber: slot.budgetNumber,
            rateType: slot.rateType,
            hourlyRate: slot.hourlyRate ? parseFloat(slot.hourlyRate) : null,
            includeMileage: slot.includeMileage,
          };
          await apiRequest("POST", "/api/master-week-slots", slotData);
        }
      }

      return updatedTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id, "master-week"] });
      toast({
        title: "Success",
        description: "Master week template updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update master week template",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof templateFormSchema>) => {
    if (template) {
      updateTemplateMutation.mutate(data);
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const copyPreviousMasterWeek = () => {
    toast({
      title: "Info",
      description: "Copy from previous master week feature coming soon",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {template ? "Edit Master Week" : "Add Master Week"}
          </DialogTitle>
          <DialogDescription>
            Define the recurring weekly schedule for {client.firstName} {client.lastName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Header Row: From Date, To Date, Recurrence, Copy Button */}
            <div className="flex flex-wrap items-end gap-4 pb-4 border-b">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[150px]">
                    <FormLabel>From Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-from-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[150px]">
                    <FormLabel>To Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-to-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name="recurrenceWeeks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurrence</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Every</span>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            className="w-16"
                            {...field}
                            value={field.value || 1}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid="input-recurrence-weeks"
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground">Week(s)</span>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="button" 
                variant="default"
                onClick={copyPreviousMasterWeek}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-copy-previous"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Previous Master Week
              </Button>
            </div>

            {/* Day Columns Grid */}
            <ScrollArea className="w-full">
              <div className="min-w-[1200px]">
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day) => {
                    const slot = daySlots.find(s => s.dayOfWeek === day.value)!;
                    const duration = calculateDuration(slot.startTime, slot.endTime);
                    
                    return (
                      <div key={day.value} className="space-y-2 p-2 bg-muted/30 rounded-lg">
                        {/* Day Header */}
                        <div className="text-center font-semibold text-sm py-2 bg-primary text-primary-foreground rounded">
                          {day.label}
                        </div>

                        {/* Schedule Type */}
                        <div>
                          <label className="text-xs text-muted-foreground">Schedule Type</label>
                          <Select
                            value={slot.scheduleType}
                            onValueChange={(v) => updateDaySlot(day.value, "scheduleType", v)}
                          >
                            <SelectTrigger className="h-8 text-xs" data-testid={`select-schedule-type-${day.value}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SCHEDULE_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Hours (Start - End) */}
                        <div>
                          <label className="text-xs text-muted-foreground">Hours</label>
                          <div className="flex gap-1 items-center">
                            <Input
                              type="time"
                              className="h-8 text-xs p-1"
                              value={slot.startTime}
                              onChange={(e) => updateDaySlot(day.value, "startTime", e.target.value)}
                              data-testid={`input-start-time-${day.value}`}
                            />
                            <span className="text-xs">-</span>
                            <Input
                              type="time"
                              className="h-8 text-xs p-1"
                              value={slot.endTime}
                              onChange={(e) => updateDaySlot(day.value, "endTime", e.target.value)}
                              data-testid={`input-end-time-${day.value}`}
                            />
                          </div>
                        </div>

                        {/* Service Provider (Caregiver) */}
                        <div>
                          <label className="text-xs text-muted-foreground">Service Provider</label>
                          <Select
                            value={slot.caregiverId || "__none__"}
                            onValueChange={(v) => updateDaySlot(day.value, "caregiverId", v === "__none__" ? null : v)}
                          >
                            <SelectTrigger className="h-8 text-xs" data-testid={`select-caregiver-${day.value}`}>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">--</SelectItem>
                              {caregivers.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  {(c as any).firstName} {(c as any).lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Service Provider Name (Auto) */}
                        <div>
                          <label className="text-xs text-muted-foreground">Service Provider Name</label>
                          <Input
                            className="h-8 text-xs bg-muted"
                            value={getCaregiverName(slot.caregiverId)}
                            readOnly
                            data-testid={`input-provider-name-${day.value}`}
                          />
                        </div>

                        {/* Assignment ID (Auto) */}
                        <div>
                          <label className="text-xs text-muted-foreground">Assignment ID</label>
                          <Input
                            className="h-8 text-xs bg-muted"
                            value={getCaregiverAssignmentId(slot.caregiverId)}
                            readOnly
                            data-testid={`input-assignment-id-${day.value}`}
                          />
                        </div>

                        {/* Pay Code */}
                        <div>
                          <label className="text-xs text-muted-foreground">Pay Code</label>
                          <Select
                            value={slot.payCode || "__none__"}
                            onValueChange={(v) => updateDaySlot(day.value, "payCode", v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger className="h-8 text-xs" data-testid={`select-pay-code-${day.value}`}>
                              <SelectValue placeholder="--Select--" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">--Select--</SelectItem>
                              {PAY_CODES.map(p => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* POC */}
                        <div>
                          <label className="text-xs text-muted-foreground">POC</label>
                          <Select
                            value={slot.poc || "__none__"}
                            onValueChange={(v) => updateDaySlot(day.value, "poc", v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger className="h-8 text-xs" data-testid={`select-poc-${day.value}`}>
                              <SelectValue placeholder="--Select--" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">--Select--</SelectItem>
                              <SelectItem value="poc1">POC 1</SelectItem>
                              <SelectItem value="poc2">POC 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Primary Bill To */}
                        <div>
                          <label className="text-xs text-muted-foreground">Primary Bill To</label>
                          <Select
                            value={slot.primaryBillTo}
                            onValueChange={(v) => updateDaySlot(day.value, "primaryBillTo", v)}
                          >
                            <SelectTrigger className="h-8 text-xs" data-testid={`select-bill-to-${day.value}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PRIMARY_BILL_TO_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Duration (Auto-calculated) */}
                        <div>
                          <label className="text-xs text-muted-foreground">Duration</label>
                          <div className="flex gap-1 items-center">
                            <Input
                              className="h-8 text-xs bg-muted w-12 text-center"
                              value={duration.hours}
                              readOnly
                            />
                            <span className="text-xs">h</span>
                            <Input
                              className="h-8 text-xs bg-muted w-12 text-center"
                              value={duration.minutes}
                              readOnly
                            />
                            <span className="text-xs">m</span>
                          </div>
                        </div>

                        {/* Service Code */}
                        <div>
                          <label className="text-xs text-muted-foreground">Service Code</label>
                          <Select
                            value={slot.serviceCode}
                            onValueChange={(v) => updateDaySlot(day.value, "serviceCode", v)}
                          >
                            <SelectTrigger className="h-8 text-xs" data-testid={`select-service-code-${day.value}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SERVICE_CODES.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Budget Number */}
                        <div>
                          <label className="text-xs text-muted-foreground text-amber-600 font-medium">Budget Number</label>
                          <Input
                            className="h-8 text-xs"
                            value={slot.budgetNumber}
                            onChange={(e) => updateDaySlot(day.value, "budgetNumber", e.target.value)}
                            data-testid={`input-budget-number-${day.value}`}
                          />
                        </div>

                        {/* Rate Type */}
                        <div>
                          <label className="text-xs text-muted-foreground">Rate Type</label>
                          <Input
                            className="h-8 text-xs bg-muted"
                            value={slot.rateType}
                            readOnly
                            data-testid={`input-rate-type-${day.value}`}
                          />
                        </div>

                        {/* Mileage */}
                        <div className="flex items-center gap-2 pt-1">
                          <Checkbox
                            id={`mileage-${day.value}`}
                            checked={slot.includeMileage}
                            onCheckedChange={(checked) => updateDaySlot(day.value, "includeMileage", checked)}
                            data-testid={`checkbox-mileage-${day.value}`}
                          />
                          <label htmlFor={`mileage-${day.value}`} className="text-xs text-muted-foreground">
                            Include in Mileage
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-close">
                Close
              </Button>
              <Button 
                type="submit" 
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                data-testid="button-save"
              >
                {(createTemplateMutation.isPending || updateTemplateMutation.isPending) 
                  ? "Saving..." 
                  : "Save"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
