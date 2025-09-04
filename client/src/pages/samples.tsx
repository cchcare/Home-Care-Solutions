import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
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
import { ObjectUploader } from "@/components/ObjectUploader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSampleSchema, type Sample, type Client, type Caregiver } from "@shared/schema";
import {
  Plus,
  Search,
  TestTube,
  Calendar,
  User,
  FileText,
  Upload,
  Eye,
  Edit,
  Trash2
} from "lucide-react";

const sampleTypeLabels = {
  blood: "Blood",
  urine: "Urine",
  stool: "Stool",
  swab: "Swab",
  other: "Other"
};

const sampleStatusLabels = {
  collected: "Collected",
  in_transit: "In Transit",
  received: "Received",
  processing: "Processing",
  completed: "Completed",
  rejected: "Rejected"
};

const statusColors = {
  collected: "bg-blue-100 text-blue-800",
  in_transit: "bg-yellow-100 text-yellow-800",
  received: "bg-indigo-100 text-indigo-800",
  processing: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

export default function Samples() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: samples, isLoading } = useQuery({
    queryKey: ["/api/samples", searchTerm],
    retry: false,
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    retry: false,
  });

  const { data: caregivers } = useQuery({
    queryKey: ["/api/caregivers"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(insertSampleSchema.omit({ id: true, createdAt: true, updatedAt: true })),
    defaultValues: {
      clientId: "",
      caregiverId: "",
      sampleType: "blood" as const,
      status: "collected" as const,
      collectionDate: new Date(),
      labOrderNumber: "",
      physicianName: "",
      instructions: "",
      notes: "",
      resultUrl: "",
      officeId: ""
    },
  });

  const createSampleMutation = useMutation({
    mutationFn: async (sampleData: any) => {
      const response = await apiRequest("POST", "/api/samples", sampleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      setShowAddModal(false);
      form.reset();
      toast({
        title: "Success",
        description: "Sample record added successfully",
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
        description: "Failed to add sample record",
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
      form.setValue("resultUrl", result.successful[0].uploadURL);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    }
  };

  const onSubmit = (data: any) => {
    createSampleMutation.mutate(data);
  };

  const filteredSamples = samples?.filter((sample: Sample) => {
    if (!searchTerm) return true;
    const client = clients?.find((c: Client) => c.id === sample.clientId);
    const clientName = client ? `${client.firstName} ${client.lastName}` : "";
    return (
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.labOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.physicianName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center space-x-2 mb-6">
            <TestTube className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Sample Management</h1>
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
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <TestTube className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Sample Management</h1>
          </div>
          
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-sample">
                <Plus className="w-4 h-4 mr-2" />
                Add Sample
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Sample</DialogTitle>
                <DialogDescription>
                  Create a new sample collection record.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-client">
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients?.map((client: Client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.firstName} {client.lastName}
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
                      name="caregiverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Caregiver</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-caregiver">
                                <SelectValue placeholder="Select caregiver" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {caregivers?.map((caregiver: Caregiver) => (
                                <SelectItem key={caregiver.id} value={caregiver.id}>
                                  {caregiver.firstName} {caregiver.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sampleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sample Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-sample-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(sampleTypeLabels).map(([value, label]) => (
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
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(sampleStatusLabels).map(([value, label]) => (
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="labOrderNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lab Order Number</FormLabel>
                          <FormControl>
                            <Input placeholder="LAB-2024-001" {...field} data-testid="input-lab-order" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="physicianName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Physician Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Dr. Smith" {...field} data-testid="input-physician" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Special collection instructions..." 
                            {...field} 
                            data-testid="textarea-instructions"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes..." 
                            {...field} 
                            data-testid="textarea-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-4">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={50485760} // 50MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleFileUploadComplete}
                      buttonClassName="w-auto"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Result File
                    </ObjectUploader>
                    {form.watch("resultUrl") && (
                      <span className="text-sm text-green-600">File uploaded</span>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddModal(false)}
                      data-testid="button-cancel-sample"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createSampleMutation.isPending} data-testid="button-save-sample">
                      {createSampleMutation.isPending ? "Adding..." : "Add Sample"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search samples..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-samples"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSamples?.map((sample: Sample) => {
            const client = clients?.find((c: Client) => c.id === sample.clientId);
            const caregiver = caregivers?.find((cg: Caregiver) => cg.id === sample.caregiverId);
            
            return (
              <Card key={sample.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TestTube className="w-5 h-5" />
                      {sampleTypeLabels[sample.sampleType as keyof typeof sampleTypeLabels]}
                    </CardTitle>
                    <Badge className={statusColors[sample.status as keyof typeof statusColors]}>
                      {sampleStatusLabels[sample.status as keyof typeof sampleStatusLabels]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {client ? `${client.firstName} ${client.lastName}` : "Unknown Client"}
                      </span>
                    </div>
                    
                    {sample.labOrderNumber && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{sample.labOrderNumber}</span>
                      </div>
                    )}
                    
                    {sample.physicianName && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{sample.physicianName}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(sample.collectionDate).toLocaleDateString()}</span>
                    </div>
                    
                    {caregiver && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Collected by: {caregiver.firstName} {caregiver.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSample(sample)}
                      data-testid={`button-view-sample-${sample.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-edit-sample-${sample.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredSamples?.length === 0 && (
          <div className="text-center py-12">
            <TestTube className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No samples found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first sample"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
