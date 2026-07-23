import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Plus,
  User,
  PlayCircle,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { 
  Client, 
  ClientSchedule, 
  MasterWeekTemplate, 
  MasterWeekSlot,
  Caregiver 
} from "@shared/schema";
import { MasterWeekTemplateModal } from "./master-week-template-modal";
import { ClientScheduleModal } from "./client-schedule-modal";
import { dateOnlyToLocalDate } from "@/lib/dateOnly";

interface ClientSchedulingProps {
  client: Client;
}

export function ClientScheduling({ client }: ClientSchedulingProps) {
  const [showMasterWeekModal, setShowMasterWeekModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MasterWeekTemplate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch master week templates
  const { data: masterWeekTemplates = [] } = useQuery<MasterWeekTemplate[]>({
    queryKey: ["/api/clients", client.id, "master-week-templates"],
    enabled: !!client.id,
    retry: false,
  });

  // Fetch current week schedules
  const currentWeekStart = new Date();
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);

  const { data: currentWeekSchedules = [] } = useQuery<ClientSchedule[]>({
    queryKey: ["/api/clients", client.id, "schedules", currentWeekStart.toISOString(), currentWeekEnd.toISOString()],
    enabled: !!client.id,
    retry: false,
  });

  // Fetch caregivers for dropdown
  const { data: caregivers = [] } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
    retry: false,
  });

  // Apply master week template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: async ({ templateId, weekStartDate }: { templateId: string; weekStartDate: string }) => {
      const response = await apiRequest("POST", `/api/master-week-templates/${templateId}/apply`, {
        weekStartDate,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id, "schedules"] });
      toast({
        title: "Template Applied",
        description: `Created ${data.schedules?.length || 0} schedule entries from template.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to apply master week template",
        variant: "destructive",
      });
    },
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  const getCaregiverName = (caregiverId: string | null) => {
    const caregiver = caregivers.find(c => c.id === caregiverId);
    return caregiver ? `${caregiver.userId || 'Caregiver'}` : 'Unassigned';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="current-week" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current-week" data-testid="tab-current-week">
            <Calendar className="w-4 h-4 mr-2" />
            Current Week
          </TabsTrigger>
          <TabsTrigger value="master-weeks" data-testid="tab-master-weeks">
            <Settings className="w-4 h-4 mr-2" />
            Master Week Templates
          </TabsTrigger>
          <TabsTrigger value="all-schedules" data-testid="tab-all-schedules">
            <Clock className="w-4 h-4 mr-2" />
            All Schedules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current-week" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Week of {currentWeekStart.toLocaleDateString()}
            </h3>
            <Button 
              onClick={() => setShowScheduleModal(true)}
              data-testid="button-add-schedule"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule Entry
            </Button>
          </div>

          {currentWeekSchedules.length > 0 ? (
            <div className="grid gap-4">
              {currentWeekSchedules.map((schedule: ClientSchedule) => (
                <Card key={schedule.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <Badge variant="outline">
                            {dateOnlyToLocalDate(schedule.scheduledDate)?.toLocaleDateString('en-US', { weekday: 'long' })}
                          </Badge>
                          <span className="font-medium">
                            S: {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {getCaregiverName(schedule.caregiverId)}
                          </span>
                        </div>
                        {schedule.serviceType && (
                          <div className="text-sm">
                            Service: <span className="font-medium">{schedule.serviceType}</span>
                          </div>
                        )}
                        {schedule.notes && (
                          <p className="text-sm text-muted-foreground">{schedule.notes}</p>
                        )}
                      </div>
                      <Badge 
                        variant={
                          schedule.status === 'completed' ? 'default' :
                          schedule.status === 'in_progress' ? 'secondary' :
                          schedule.status === 'cancelled' ? 'destructive' : 'outline'
                        }
                      >
                        {schedule.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Schedule This Week</h3>
                <p className="text-muted-foreground mb-4">
                  Create individual schedule entries or apply a master week template to get started.
                </p>
                <div className="space-x-2">
                  <Button onClick={() => setShowScheduleModal(true)}>
                    Add Manual Entry
                  </Button>
                  {masterWeekTemplates.length > 0 && (
                    <Button variant="outline">
                      Apply Template
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="master-weeks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Master Week Templates</h3>
            <Button 
              onClick={() => {
                setSelectedTemplate(null);
                setShowMasterWeekModal(true);
              }}
              data-testid="button-create-master-week"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>

          {masterWeekTemplates.length > 0 ? (
            <div className="grid gap-4">
              {masterWeekTemplates.map((template: MasterWeekTemplate) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{template.name}</span>
                      <div className="space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowMasterWeekModal(true);
                          }}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => applyTemplateMutation.mutate({
                            templateId: template.id,
                            weekStartDate: currentWeekStart.toISOString()
                          })}
                          disabled={applyTemplateMutation.isPending}
                          data-testid={`button-apply-template-${template.id}`}
                        >
                          <PlayCircle className="w-4 h-4 mr-1" />
                          Apply This Week
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-3">{template.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {template.autoRollover && (
                        <Badge variant="outline">Auto Rollover</Badge>
                      )}
                      {template.startDate && template.endDate && (
                        <span className="text-muted-foreground">
                          {new Date(template.startDate).toLocaleDateString()} - {new Date(template.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Master Week Templates</h3>
                <p className="text-muted-foreground mb-4">
                  Create reusable weekly schedule templates that can be automatically applied to create recurring schedules.
                </p>
                <Button onClick={() => setShowMasterWeekModal(true)}>
                  Create Your First Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all-schedules">
          <div className="text-center p-8">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">All Schedules View</h3>
            <p className="text-muted-foreground">
              Comprehensive schedule view coming soon. Use the Current Week tab to view and manage this week's schedule.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Master Week Template Modal */}
      <MasterWeekTemplateModal
        isOpen={showMasterWeekModal}
        onClose={() => {
          setShowMasterWeekModal(false);
          setSelectedTemplate(null);
        }}
        client={client}
        template={selectedTemplate}
        caregivers={caregivers}
      />

      {/* Client Schedule Modal */}
      <ClientScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        client={client}
        caregivers={caregivers}
      />
    </div>
  );
}