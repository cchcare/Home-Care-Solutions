import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOfficeScope } from "@/context/office-context";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Plus, AlertTriangle, CheckCircle2, Clock, Send, Archive, Pencil, Trash2, ExternalLink
} from "lucide-react";
import type { PolicyDocument } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1),
  version: z.string().default("1.0"),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
  content: z.string().optional(),
  requiresAcknowledgment: z.boolean().default(true),
  acknowledgmentDueDays: z.coerce.number().default(7),
});

const categoryLabel: Record<string, string> = {
  general: "General", safety: "Safety", clinical: "Clinical", administrative: "Administrative",
  hr: "HR", hipaa: "HIPAA", emergency: "Emergency", infection_control: "Infection Control",
};
const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  archived: { label: "Archived", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

export default function PolicyManagement() {
  const { selectedOfficeId, isAllOffices, canMutate } = useOfficeScope();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PolicyDocument | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<PolicyDocument | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  const { data: policies = [], isLoading } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/policy-documents", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId || selectedOfficeId === "all") return [];
      const r = await fetch(`/api/policy-documents?officeId=${selectedOfficeId}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!selectedOfficeId && selectedOfficeId !== "all",
  });

  const { data: acknowledgments = [] } = useQuery<any[]>({
    queryKey: ["/api/policy-documents", selectedDoc?.id, "acknowledgments"],
    queryFn: async () => {
      const r = await fetch(`/api/policy-documents/${selectedDoc!.id}/acknowledgments`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!selectedDoc,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { category: "general", requiresAcknowledgment: true, acknowledgmentDueDays: 7, version: "1.0" },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      const payload = { ...data, officeId: selectedOfficeId };
      if (editing) return apiRequest("PATCH", `/api/policy-documents/${editing.id}`, payload);
      return apiRequest("POST", "/api/policy-documents", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-documents", selectedOfficeId] });
      toast({ title: editing ? "Policy updated" : "Policy created" });
      setOpen(false); setEditing(null); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/policy-documents/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-documents", selectedOfficeId] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/policy-documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-documents", selectedOfficeId] });
      toast({ title: "Policy deleted" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ category: "general", requiresAcknowledgment: true, acknowledgmentDueDays: 7, version: "1.0" });
    setOpen(true);
  };

  const openEdit = (doc: PolicyDocument) => {
    setEditing(doc);
    form.reset({
      title: doc.title, category: doc.category, version: doc.version,
      effectiveDate: doc.effectiveDate || "", reviewDate: doc.reviewDate || "",
      content: doc.content || "",
      requiresAcknowledgment: doc.requiresAcknowledgment ?? true,
      acknowledgmentDueDays: doc.acknowledgmentDueDays ?? 7,
    });
    setOpen(true);
  };

  const tabPolicies = policies.filter(p => {
    if (activeTab === "active") return p.status === "active";
    if (activeTab === "draft") return p.status === "draft";
    if (activeTab === "archived") return p.status === "archived";
    return true;
  });

  const activePolicies = policies.filter(p => p.status === "active");
  const requireAckCount = activePolicies.filter(p => p.requiresAcknowledgment).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Policy Management" subtitle="Manage agency policies and track staff acknowledgments" />
        <div className="flex-1 overflow-auto p-6 bg-background">
        <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Policy & Procedure Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage policies, versions, and acknowledgments</p>
        </div>
        {canMutate && !isAllOffices && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Active", value: activePolicies.length, icon: FileText, color: "text-blue-600 dark:text-blue-400" },
          { label: "Require Acknowledgment", value: requireAckCount, icon: Send, color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Draft Policies", value: policies.filter(p => p.status === "draft").length, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Archived", value: policies.filter(p => p.status === "archived").length, icon: Archive, color: "text-gray-600 dark:text-gray-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAllOffices && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4 flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Select a specific office to manage policies.</span>
          </CardContent>
        </Card>
      )}

      {!isAllOffices && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="active">Active ({activePolicies.length})</TabsTrigger>
                <TabsTrigger value="draft">Draft ({policies.filter(p => p.status === "draft").length})</TabsTrigger>
                <TabsTrigger value="archived">Archived ({policies.filter(p => p.status === "archived").length})</TabsTrigger>
              </TabsList>
              <TabsContent value={activeTab} className="mt-3">
                {isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
                ) : tabPolicies.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No {activeTab} policies</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tabPolicies.map(doc => (
                      <Card
                        key={doc.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedDoc?.id === doc.id ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                      >
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm">{doc.title}</p>
                                <Badge className={`border-0 text-xs ${statusConfig[doc.status]?.className}`}>{statusConfig[doc.status]?.label}</Badge>
                                <Badge variant="outline" className="text-xs">{categoryLabel[doc.category]}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                v{doc.version}{doc.effectiveDate ? ` · Effective ${doc.effectiveDate}` : ""}
                                {doc.reviewDate ? ` · Review ${doc.reviewDate}` : ""}
                              </p>
                              {doc.requiresAcknowledgment && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                                  <Send className="h-3 w-3" /> Requires acknowledgment
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                              {doc.status === "draft" && (
                                <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => updateStatusMutation.mutate({ id: doc.id, status: "active" })}>
                                  Publish
                                </Button>
                              )}
                              {doc.status === "active" && (
                                <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => updateStatusMutation.mutate({ id: doc.id, status: "archived" })}>
                                  Archive
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(doc)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(doc.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Acknowledgment Panel */}
          <div>
            {selectedDoc ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Acknowledgments — {selectedDoc.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Acknowledgment Rate</span>
                        <span className="font-medium">{acknowledgments.length} signed</span>
                      </div>
                      <Progress value={Math.min(100, acknowledgments.length * 10)} className="h-2" />
                    </div>
                    {acknowledgments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No acknowledgments yet</p>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {acknowledgments.map((ack: any) => (
                          <div key={ack.id} className="flex items-center justify-between py-1 border-b last:border-0">
                            <div>
                              <p className="text-xs font-medium">{ack.userId}</p>
                              <p className="text-xs text-muted-foreground">{new Date(ack.acknowledgedAt).toLocaleDateString()}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">{ack.method}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedDoc.fileUrl && (
                      <a href={selectedDoc.fileUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Document
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Select a policy to view acknowledgments</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); form.reset(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Policy" : "Create Policy"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => createMutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl><Input placeholder="Policy title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(categoryLabel).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="version" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl><Input placeholder="1.0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="effectiveDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reviewDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Summary / Content</FormLabel>
                  <FormControl><Textarea placeholder="Policy content or summary..." rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">Requires Acknowledgment</p>
                  <p className="text-xs text-muted-foreground">Staff must sign off on this policy</p>
                </div>
                <FormField control={form.control} name="requiresAcknowledgment" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Policy"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Policy?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This policy and all acknowledgments will be permanently deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
        </div>
    </main>
  </div>
  );
}
