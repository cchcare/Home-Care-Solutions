import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wrench,
  Eye,
  ChevronRight,
  Shield,
  FileWarning,
  Calendar,
  Users,
  Zap,
} from "lucide-react";
import type { AiDetectedIssue } from "@shared/schema";

const severityColors: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-blue-500 text-white",
};

const categoryIcons: Record<string, any> = {
  compliance: Shield,
  data_quality: FileWarning,
  scheduling: Calendar,
  certification: Users,
  documentation: FileWarning,
  incident_pattern: AlertTriangle,
  care_plan: FileWarning,
  other: Zap,
};

export function AiIssuesPanel() {
  const { toast } = useToast();
  const [selectedIssue, setSelectedIssue] = useState<AiDetectedIssue | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const { data: issues = [], isLoading, refetch } = useQuery<AiDetectedIssue[]>({
    queryKey: ["/api/ai-issues"],
    retry: false,
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-issues/scan");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Scan Complete",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-issues"] });
    },
    onError: () => {
      toast({
        title: "Scan Failed",
        description: "Failed to scan for issues. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/ai-issues/${id}/resolve`, { resolutionNotes: notes });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Issue Resolved",
        description: "The issue has been marked as resolved.",
      });
      setIsResolveDialogOpen(false);
      setSelectedIssue(null);
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/ai-issues"] });
    },
    onError: () => {
      toast({
        title: "Failed to Resolve",
        description: "Could not resolve the issue. Please try again.",
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await apiRequest("POST", `/api/ai-issues/${id}/dismiss`, { reason });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Issue Dismissed",
        description: "The issue has been dismissed.",
      });
      setSelectedIssue(null);
      queryClient.invalidateQueries({ queryKey: ["/api/ai-issues"] });
    },
    onError: () => {
      toast({
        title: "Failed to Dismiss",
        description: "Could not dismiss the issue. Please try again.",
        variant: "destructive",
      });
    },
  });

  const autoFixMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/ai-issues/${id}/auto-fix`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Auto-Fix Applied",
        description: data.message,
      });
      setSelectedIssue(null);
      queryClient.invalidateQueries({ queryKey: ["/api/ai-issues"] });
    },
    onError: () => {
      toast({
        title: "Auto-Fix Failed",
        description: "Could not apply the auto-fix. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openIssues = issues.filter((i) => i.status === "open");
  const criticalCount = openIssues.filter((i) => i.severity === "critical").length;
  const highCount = openIssues.filter((i) => i.severity === "high").length;

  const handleResolve = (issue: AiDetectedIssue) => {
    setSelectedIssue(issue);
    setIsResolveDialogOpen(true);
  };

  const handleDismiss = (issue: AiDetectedIssue) => {
    dismissMutation.mutate({ id: issue.id, reason: "Dismissed by user" });
  };

  const handleAutoFix = (issue: AiDetectedIssue) => {
    autoFixMutation.mutate(issue.id);
  };

  return (
    <>
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle>AI Issue Detection</CardTitle>
              {openIssues.length > 0 && (
                <Badge variant="destructive" data-testid="badge-open-issues-count">
                  {openIssues.length} open
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              data-testid="button-scan-issues"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${scanMutation.isPending ? "animate-spin" : ""}`} />
              {scanMutation.isPending ? "Scanning..." : "Scan Now"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading issues...</div>
          ) : openIssues.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-foreground font-medium">All Clear!</p>
              <p className="text-sm text-muted-foreground">No issues detected. Click "Scan Now" to check for new issues.</p>
            </div>
          ) : (
            <>
              {(criticalCount > 0 || highCount > 0) && (
                <div className="p-4 bg-destructive/10 border-b border-border flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium">
                    {criticalCount > 0 && `${criticalCount} critical`}
                    {criticalCount > 0 && highCount > 0 && " and "}
                    {highCount > 0 && `${highCount} high priority`}
                    {" issue(s) require attention"}
                  </span>
                </div>
              )}
              <ScrollArea className="h-[300px]">
                <div className="divide-y divide-border">
                  {openIssues.map((issue) => {
                    const CategoryIcon = categoryIcons[issue.category] || Zap;
                    return (
                      <div
                        key={issue.id}
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedIssue(issue)}
                        data-testid={`issue-item-${issue.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                            <CategoryIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={severityColors[issue.severity]} data-testid={`badge-issue-severity-${issue.id}`}>
                                {issue.severity}
                              </Badge>
                              <Badge variant="outline">{issue.category.replace("_", " ")}</Badge>
                            </div>
                            <p className="font-medium text-foreground truncate" data-testid={`text-issue-title-${issue.id}`}>
                              {issue.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">{issue.description}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedIssue && !isResolveDialogOpen} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-md">
          {selectedIssue && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={severityColors[selectedIssue.severity]}>{selectedIssue.severity}</Badge>
                  <Badge variant="outline">{selectedIssue.category.replace("_", " ")}</Badge>
                </div>
                <DialogTitle>{selectedIssue.title}</DialogTitle>
                <DialogDescription className="text-left">{selectedIssue.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Suggested Action</h4>
                  <p className="text-sm text-muted-foreground">{selectedIssue.suggestedAction}</p>
                </div>
                {selectedIssue.aiConfidence && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-1">AI Confidence</h4>
                    <p className="text-sm text-muted-foreground">{selectedIssue.aiConfidence}%</p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDismiss(selectedIssue)}
                  disabled={dismissMutation.isPending}
                  data-testid="button-dismiss-issue"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Dismiss
                </Button>
                {selectedIssue.autoFixAvailable && (
                  <Button
                    variant="secondary"
                    onClick={() => handleAutoFix(selectedIssue)}
                    disabled={autoFixMutation.isPending}
                    data-testid="button-auto-fix-issue"
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Auto-Fix
                  </Button>
                )}
                <Button
                  onClick={() => handleResolve(selectedIssue)}
                  data-testid="button-resolve-issue"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Issue</DialogTitle>
            <DialogDescription>Add any notes about how you resolved this issue.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Resolution notes (optional)"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            className="min-h-[100px]"
            data-testid="textarea-resolution-notes"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedIssue && resolveMutation.mutate({ id: selectedIssue.id, notes: resolutionNotes })}
              disabled={resolveMutation.isPending}
              data-testid="button-confirm-resolve"
            >
              {resolveMutation.isPending ? "Resolving..." : "Confirm Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
