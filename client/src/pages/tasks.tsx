import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { OfficeSelector } from "@/components/office-selector";
import { useOfficeScope } from "@/context/office-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2,
  Filter,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const taskFormSchema = insertTaskSchema.omit({ id: true, createdAt: true, updatedAt: true });
type TaskFormData = z.infer<typeof taskFormSchema>;

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOfficeId, setSelectedOfficeId, isAllOffices, canMutate, viewOnlyMessage } = useOfficeScope();
  const officeQuery = selectedOfficeId !== "all" ? `?officeId=${selectedOfficeId}` : "";

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", selectedOfficeId],
    queryFn: () => fetch(`/api/tasks${officeQuery}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: caregivers = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedOfficeId] });
      handleClose();
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskFormData> }) => {
      return await apiRequest("PUT", `/api/tasks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedOfficeId] });
      handleClose();
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedOfficeId] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      assignedTo: "",
      clientId: "",
      dueDate: new Date(),
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditingTask(null);
    form.reset();
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    form.reset({
      title: task.title,
      description: task.description || "",
      status: task.status as any,
      priority: task.priority as any,
      assignedTo: task.assignedTo ?? "",
      clientId: task.clientId ?? "",
      dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteTaskMutation.mutate(id);
  };

  const onSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const toggleTaskStatus = (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    updateTaskMutation.mutate({ 
      id: task.id, 
      data: { status: newStatus } 
    });
  };

  const filteredTasks = tasks.filter((task: Task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "pending": return "outline";
      default: return "outline";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return CheckCircle;
      case "in_progress": return Clock;
      case "pending": return AlertCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Tasks & Workflows"
          subtitle="Manage tasks and workflow processes"
        />
      
        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {isAllOffices && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-md text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {viewOnlyMessage}
              </div>
            )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks & Workflows</h1>
          <p className="text-muted-foreground">
            Manage tasks, assignments, and workflow processes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <OfficeSelector
            selectedOfficeId={selectedOfficeId === "all" ? undefined : selectedOfficeId}
            onOfficeChange={setSelectedOfficeId}
            showAllOption={true}
          />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-create-task"
              disabled={!canMutate}
              title={!canMutate ? viewOnlyMessage : undefined}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "Edit Task" : "Create New Task"}
              </DialogTitle>
              <DialogDescription>
                {editingTask ? "Update task details and assignment" : "Create a new task and assign it to a team member"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter task title"
                          {...field} 
                          data-testid="input-task-title"
                        />
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
                          placeholder="Enter task description"
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-task-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            {...field}
                            value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-task-due-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "__unassigned__" ? null : value)} defaultValue={field.value || "__unassigned__"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-assignee">
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__unassigned__">Unassigned</SelectItem>
                            {caregivers.map((caregiver: any) => (
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

                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related Client</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "__none__" ? null : value)} defaultValue={field.value || "__none__"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-client">
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">No Client</SelectItem>
                            {clients.map((client: any) => (
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
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                    data-testid="button-submit-task"
                  >
                    {createTaskMutation.isPending || updateTaskMutation.isPending 
                      ? (editingTask ? "Updating..." : "Creating...") 
                      : (editingTask ? "Update Task" : "Create Task")
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Task Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger data-testid="select-priority-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No tasks found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {statusFilter !== "all" || priorityFilter !== "all" 
                    ? "Try adjusting your filters" 
                    : "Get started by creating your first task"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task: Task) => {
            const StatusIcon = getStatusIcon(task.status || "pending");
            const assignee = task.assignedTo ? caregivers.find((c: any) => c.id === task.assignedTo) : null;
            const client = task.clientId ? clients.find((c: any) => c.id === task.clientId) : null;
            
            return (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex items-center">
                        <Checkbox
                          checked={task.status === "completed"}
                          onCheckedChange={() => toggleTaskStatus(task)}
                          disabled={!canMutate}
                          data-testid={`checkbox-task-${task.id}`}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold text-lg ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </h3>
                          <Badge variant={getStatusColor(task.status || 'pending')}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {(task.status || 'pending').replace('_', ' ')}
                          </Badge>
                          <Badge variant={getPriorityColor(task.priority || 'medium')}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Due {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                            </div>
                          )}
                          {assignee && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{assignee.firstName} {assignee.lastName}</span>
                            </div>
                          )}
                          {client && (
                            <div className="flex items-center gap-1">
                              <span>Client: {client.firstName} {client.lastName}</span>
                            </div>
                          )}
                          <span>Created {format(new Date(task.createdAt || new Date()), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(task)}
                        disabled={!canMutate}
                        title={!canMutate ? viewOnlyMessage : undefined}
                        data-testid={`button-edit-task-${task.id}`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(task.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={!canMutate}
                        title={!canMutate ? viewOnlyMessage : undefined}
                        data-testid={`button-delete-task-${task.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
          </div>
        </div>
      </main>
    </div>
  );
}