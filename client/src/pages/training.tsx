import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTrainingSchema, type Training, type TrainingRecord, type Caregiver } from "@shared/schema";
import {
  Plus,
  Search,
  GraduationCap,
  Clock,
  Users,
  FileText,
  Upload,
  Eye,
  Edit,
  Award,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

const trainingTypeLabels = {
  orientation: "Orientation",
  annual: "Annual Training",
  certification: "Certification",
  continuing_education: "Continuing Education",
  safety: "Safety Training",
  hipaa: "HIPAA Training",
  other: "Other"
};

const trainingStatusLabels = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  expired: "Expired",
  failed: "Failed"
};

const statusColors = {
  not_started: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800"
};

export default function Training() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [activeTab, setActiveTab] = useState<"trainings" | "records">("trainings");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trainings, isLoading: trainingsLoading } = useQuery({
    queryKey: ["/api/trainings", searchTerm],
    retry: false,
  });

  const { data: trainingRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ["/api/training-records", searchTerm],
    retry: false,
  });

  const { data: caregivers } = useQuery({
    queryKey: ["/api/caregivers"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(insertTrainingSchema.omit({ id: true, createdAt: true, updatedAt: true })),
    defaultValues: {
      title: "",
      description: "",
      trainingType: "orientation" as const,
      durationHours: 1,
      expirationMonths: 12,
      isRequired: false,
      materialUrl: "",
      officeId: ""
    },
  });

  const createTrainingMutation = useMutation({
    mutationFn: async (trainingData: any) => {
      const response = await apiRequest("POST", "/api/trainings", trainingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainings"] });
      setShowAddModal(false);
      form.reset();
      toast({
        title: "Success",
        description: "Training program created successfully",
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
        description: "Failed to create training program",
        variant: "destructive",
      });
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
      form.setValue("materialUrl", result.successful[0].uploadURL);
      toast({
        title: "Success",
        description: "Training material uploaded successfully",
      });
    }
  };

  const onSubmit = (data: any) => {
    createTrainingMutation.mutate(data);
  };

  const filteredTrainings = trainings?.filter((training: Training) => {
    if (!searchTerm) return true;
    return (
      training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredRecords = trainingRecords?.filter((record: TrainingRecord) => {
    if (!searchTerm) return true;
    const caregiver = caregivers?.find((c: Caregiver) => c.id === record.caregiverId);
    const caregiverName = caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : "";
    const training = trainings?.find((t: Training) => t.id === record.trainingId);
    return (
      caregiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training?.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (trainingsLoading || recordsLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center space-x-2 mb-6">
            <GraduationCap className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Training Management</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-48 animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Training & Resources"
          subtitle="Manage training programs and resources"
        />
        <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Training Management</h1>
          </div>
          
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-training">
                <Plus className="w-4 h-4 mr-2" />
                Add Training
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Training Program</DialogTitle>
                <DialogDescription>
                  Create a new training program for caregivers.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Training Title</FormLabel>
                        <FormControl>
                          <Input placeholder="HIPAA Compliance Training" {...field} data-testid="input-training-title" />
                        </FormControl>
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
                            placeholder="Detailed description of the training program..." 
                            {...field} 
                            data-testid="textarea-training-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="trainingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Training Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-training-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(trainingTypeLabels).map(([value, label]) => (
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
                    
                    <FormField
                      control={form.control}
                      name="durationHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Hours)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="2" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="expirationMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expires After (Months)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="12" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-expiration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Required Training</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Mark as mandatory for all caregivers
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-required"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-4">
                    <ObjectUploader
                      maxNumberOfFiles={5}
                      maxFileSize={100485760} // 100MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleFileUploadComplete}
                      buttonClassName="w-auto"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Training Materials
                    </ObjectUploader>
                    {form.watch("materialUrl") && (
                      <span className="text-sm text-green-600">Materials uploaded</span>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddModal(false)}
                      data-testid="button-cancel-training"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTrainingMutation.isPending} data-testid="button-save-training">
                      {createTrainingMutation.isPending ? "Creating..." : "Create Training"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === "trainings" ? "default" : "ghost"}
            onClick={() => setActiveTab("trainings")}
            className="rounded-md"
            data-testid="tab-trainings"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Training Programs
          </Button>
          <Button
            variant={activeTab === "records" ? "default" : "ghost"}
            onClick={() => setActiveTab("records")}
            className="rounded-md"
            data-testid="tab-records"
          >
            <Award className="w-4 h-4 mr-2" />
            Training Records
          </Button>
        </div>

        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={activeTab === "trainings" ? "Search training programs..." : "Search training records..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-training"
            />
          </div>
        </div>

        {activeTab === "trainings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrainings?.map((training: Training) => (
              <Card key={training.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      {training.title}
                    </CardTitle>
                    {training.isRequired && (
                      <Badge variant="destructive">Required</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>{trainingTypeLabels[training.trainingType as keyof typeof trainingTypeLabels]}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{training.durationHours} hour{training.durationHours !== 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Expires in {training.expirationMonths} months</span>
                    </div>
                    
                    {training.description && (
                      <p className="text-muted-foreground text-xs line-clamp-2 mt-2">
                        {training.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTraining(training)}
                      data-testid={`button-view-training-${training.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-edit-training-${training.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "records" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecords?.map((record: TrainingRecord) => {
              const caregiver = caregivers?.find((c: Caregiver) => c.id === record.caregiverId);
              const training = trainings?.find((t: Training) => t.id === record.trainingId);
              
              return (
                <Card key={record.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        {training?.title || "Unknown Training"}
                      </CardTitle>
                      <Badge className={statusColors[record.status as keyof typeof statusColors]}>
                        {trainingStatusLabels[record.status as keyof typeof trainingStatusLabels]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : "Unknown Caregiver"}
                        </span>
                      </div>
                      
                      {record.startDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Started: {new Date(record.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {record.completionDate && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Completed: {new Date(record.completionDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {record.expirationDate && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <span>Expires: {new Date(record.expirationDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {record.score && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-500" />
                          <span>Score: {record.score}%</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-view-record-${record.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-edit-record-${record.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {(activeTab === "trainings" ? filteredTrainings?.length === 0 : filteredRecords?.length === 0) && (
          <div className="text-center py-12">
            {activeTab === "trainings" ? (
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            ) : (
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            )}
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {activeTab === "trainings" ? "No training programs found" : "No training records found"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Try adjusting your search terms" 
                : activeTab === "trainings" 
                  ? "Get started by creating your first training program"
                  : "Training records will appear here once caregivers start training"
              }
            </p>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
