import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertMasterWeekTemplateSchema, insertMasterWeekSlotSchema } from "@shared/schema";
import type { Client, MasterWeekTemplate, MasterWeekSlot, Caregiver } from "@shared/schema";
import { z } from "zod";

const templateFormSchema = insertMasterWeekTemplateSchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const slotFormSchema = insertMasterWeekSlotSchema.omit({ templateId: true });

interface MasterWeekTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  template?: MasterWeekTemplate | null;
  caregivers: Caregiver[];
}

export function MasterWeekTemplateModal({ 
  isOpen, 
  onClose, 
  client, 
  template,
  caregivers 
}: MasterWeekTemplateModalProps) {
  const [slots, setSlots] = useState<Array<z.infer<typeof slotFormSchema> & { tempId: string }>>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: client.id,
      isActive: true,
      autoRollover: false,
      startDate: "",
      endDate: "",
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
      });
    } else {
      form.reset({
        name: "",
        description: "",
        clientId: client.id,
        isActive: true,
        autoRollover: false,
        startDate: "",
        endDate: "",
      });
      setSlots([]);
    }
  }, [template, client.id, form]);

  // Fetch existing slots if editing template
  const { data: existingSlots = [] } = useQuery<MasterWeekSlot[]>({
    queryKey: ["/api/master-week-templates", template?.id, "slots"],
    enabled: !!template?.id,
    retry: false,
  });

  useEffect(() => {
    if (existingSlots.length > 0) {
      setSlots(existingSlots.map((slot: MasterWeekSlot) => ({
        ...slot,
        tempId: slot.id || Math.random().toString(),
      })));
    }
  }, [existingSlots]);

  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateFormSchema>) => {
      const templateData = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      };

      const response = await apiRequest("POST", "/api/master-week-templates", templateData);
      const newTemplate = await response.json();

      // Create slots
      for (const slot of slots) {
        const slotData = {
          ...slot,
          templateId: newTemplate.id,
        };
        await apiRequest("POST", "/api/master-week-slots", slotData);
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id, "master-week-templates"] });
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

      // For simplicity, delete existing slots and recreate them
      // In production, you might want to implement more granular updates
      const existingSlotsResponse = await fetch(`/api/master-week-templates/${template.id}/slots`);
      const existingSlotsData = await existingSlotsResponse.json();
      
      for (const slot of existingSlotsData) {
        await apiRequest("DELETE", `/api/master-week-slots/${slot.id}`);
      }

      // Create new slots
      for (const slot of slots) {
        const slotData = {
          ...slot,
          templateId: template.id,
        };
        await apiRequest("POST", "/api/master-week-slots", slotData);
      }

      return updatedTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id, "master-week-templates"] });
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

  const addSlot = () => {
    setSlots([...slots, {
      tempId: Math.random().toString(),
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "10:00",
      caregiverId: null,
      serviceType: "",
      notes: "",
      isRecurring: true,
    }]);
  };

  const removeSlot = (tempId: string) => {
    setSlots(slots.filter(slot => slot.tempId !== tempId));
  };

  const updateSlot = (tempId: string, field: string, value: any) => {
    setSlots(slots.map(slot => 
      slot.tempId === tempId ? { ...slot, [field]: value } : slot
    ));
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  const getCaregiverName = (caregiverId: string) => {
    const caregiver = caregivers.find(c => c.id === caregiverId);
    return caregiver ? `${caregiver.userId || 'Caregiver'}` : 'Unknown';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Master Week Template" : "Create Master Week Template"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Standard Weekly Care" data-testid="input-template-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Active Template</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autoRollover"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Auto Rollover (Midnight Updates)</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="switch-auto-rollover"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} placeholder="Describe this template..." data-testid="textarea-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Weekly Schedule Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Weekly Schedule
                  <Button type="button" onClick={addSlot} size="sm" data-testid="button-add-slot">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Time Slot
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {slots.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No time slots added yet. Click "Add Time Slot" to create the weekly schedule.
                  </p>
                ) : (
                  slots.map((slot) => (
                    <Card key={slot.tempId} className="border">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                          <div>
                            <label className="block text-sm font-medium mb-2">Day</label>
                            <Select 
                              value={slot.dayOfWeek.toString()}
                              onValueChange={(value) => updateSlot(slot.tempId, 'dayOfWeek', parseInt(value))}
                            >
                              <SelectTrigger data-testid={`select-day-${slot.tempId}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                                  <SelectItem key={day} value={day.toString()}>
                                    {getDayName(day)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Start Time</label>
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateSlot(slot.tempId, 'startTime', e.target.value)}
                              data-testid={`input-start-time-${slot.tempId}`}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">End Time</label>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateSlot(slot.tempId, 'endTime', e.target.value)}
                              data-testid={`input-end-time-${slot.tempId}`}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Caregiver</label>
                            <Select 
                              value={slot.caregiverId || ""}
                              onValueChange={(value) => updateSlot(slot.tempId, 'caregiverId', value || null)}
                            >
                              <SelectTrigger data-testid={`select-caregiver-${slot.tempId}`}>
                                <SelectValue placeholder="Select caregiver" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Unassigned</SelectItem>
                                {caregivers.map(caregiver => (
                                  <SelectItem key={caregiver.id} value={caregiver.id}>
                                    {(caregiver as any).firstName && (caregiver as any).lastName 
                                      ? `${(caregiver as any).firstName} ${(caregiver as any).lastName}`
                                      : `Caregiver ${caregiver.id.slice(0, 8)}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSlot(slot.tempId)}
                            data-testid={`button-remove-slot-${slot.tempId}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <Input
                            placeholder="Service type (e.g., Personal care, Medication reminder)"
                            value={slot.serviceType || ""}
                            onChange={(e) => updateSlot(slot.tempId, 'serviceType', e.target.value)}
                            data-testid={`input-service-type-${slot.tempId}`}
                          />
                          <Input
                            placeholder="Notes (optional)"
                            value={slot.notes || ""}
                            onChange={(e) => updateSlot(slot.tempId, 'notes', e.target.value)}
                            data-testid={`input-notes-${slot.tempId}`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                data-testid="button-save-template"
              >
                {(createTemplateMutation.isPending || updateTemplateMutation.isPending) 
                  ? "Saving..." 
                  : template ? "Update Template" : "Create Template"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}