import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Monitor, Copy, CheckCircle, XCircle, Key, Trash2, ExternalLink, Info, Shield, Eye, EyeOff
} from "lucide-react";

export default function KioskSetup() {
  const { toast } = useToast();
  const { user } = useAuth();

  const kioskUrl = `${window.location.origin}/kiosk`;

  const [copied, setCopied] = useState(false);
  const [pinDialogUser, setPinDialogUser] = useState<any | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [disableUser, setDisableUser] = useState<any | null>(null);

  const { data: staffList = [], isLoading, isError, error } = useQuery<any[]>({
    queryKey: ["/api/kiosk/setup"],
    retry: false,
  });

  const setPinMutation = useMutation({
    mutationFn: ({ userId, pin }: { userId: string; pin: string }) =>
      apiRequest("POST", `/api/kiosk/setup/${userId}/pin`, { pin }),
    onSuccess: () => {
      toast({ title: "PIN set", description: "Kiosk PIN configured successfully." });
      setPinDialogUser(null);
      setPinValue("");
      setConfirmPin("");
      queryClient.invalidateQueries({ queryKey: ["/api/kiosk/setup"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const disableMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/kiosk/setup/${userId}/pin`, {}),
    onSuccess: () => {
      toast({ title: "Kiosk disabled", description: "Kiosk access has been removed for this user." });
      setDisableUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/kiosk/setup"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function copyUrl() {
    navigator.clipboard.writeText(kioskUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Kiosk URL copied to clipboard." });
    });
  }

  function openSetPin(u: any) {
    setPinDialogUser(u);
    setPinValue("");
    setConfirmPin("");
    setShowPin(false);
  }

  function handleSavePin() {
    if (!/^\d{4,8}$/.test(pinValue)) {
      toast({ title: "Invalid PIN", description: "PIN must be 4–8 digits.", variant: "destructive" });
      return;
    }
    if (pinValue !== confirmPin) {
      toast({ title: "PINs don't match", description: "Please enter the same PIN twice.", variant: "destructive" });
      return;
    }
    setPinMutation.mutate({ userId: pinDialogUser.id, pin: pinValue });
  }

  const isAdmin = user && ["super_admin", "admin", "office_admin", "supervisor"].includes((user as any).role);

  if (!isAdmin) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">Only administrators can access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6 max-w-5xl mx-auto">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Monitor className="w-6 h-6 text-blue-600" /> Kiosk Setup
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure the self-service clock-in kiosk for your office. Staff use their username/email and a PIN to clock in with a selfie photo.
            </p>
          </div>

          {/* Kiosk URL Card */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <ExternalLink className="w-5 h-5" /> Kiosk Terminal URL
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Open this link on a shared computer or tablet in your office lobby. No login is required — staff use their ID and PIN.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 bg-white dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-2 font-mono text-sm text-blue-900 dark:text-blue-100 break-all">
                  {kioskUrl}
                </div>
                <Button variant="outline" onClick={copyUrl} className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-200 dark:hover:bg-blue-800 shrink-0">
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="ml-2 hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
                </Button>
                <Button variant="outline" onClick={() => window.open(kioskUrl, "_blank")} className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-200 dark:hover:bg-blue-800 shrink-0">
                  <ExternalLink className="w-4 h-4" />
                  <span className="ml-2 hidden sm:inline">Open</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-slate-500" /> How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Set a kiosk PIN for each staff member below.</li>
                <li>Open the Kiosk URL on a shared office computer, tablet, or touchscreen.</li>
                <li>Staff enter their <strong>username or email</strong> and their <strong>Kiosk PIN</strong>.</li>
                <li>The camera activates and takes a selfie for verification.</li>
                <li>They confirm their Clock In or Clock Out — the record is saved instantly.</li>
                <li>Photos are stored with each time record for audit purposes.</li>
              </ol>
            </CardContent>
          </Card>

          {/* Staff PIN Management Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Staff Kiosk PINs</CardTitle>
              <CardDescription>
                Set or reset kiosk PINs for all staff members. Only accounts with a PIN set can use the kiosk terminal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading staff...</div>
              ) : isError ? (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 mx-auto mb-2 text-destructive opacity-60" />
                  <p className="font-medium text-destructive">Unable to load staff</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(error as any)?.message || "Your account may not be linked to an organization. Contact a super admin."}
                  </p>
                </div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No active staff accounts found in your organization</p>
                  <p className="text-sm mt-1">Create staff accounts first, then set their kiosk PINs here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Username / Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Kiosk Access</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(staffList as any[]).map((s: any) => (
                        <TableRow key={s.id} className={!s.isActive ? "opacity-50" : ""}>
                          <TableCell className="font-medium">
                            {s.firstName || ""} {s.lastName || ""}
                            {!s.isActive && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.username || s.email || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {s.role?.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={s.isActive ? "default" : "secondary"} className="text-xs">
                              {s.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {s.kioskEnabled ? (
                              <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-300">
                                <CheckCircle className="w-3 h-3 mr-1" /> Enabled
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                <XCircle className="w-3 h-3 mr-1" /> Disabled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => openSetPin(s)}>
                                <Key className="w-3 h-3 mr-1" />
                                {s.kioskEnabled ? "Reset PIN" : "Set PIN"}
                              </Button>
                              {s.kioskEnabled && (
                                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={() => setDisableUser(s)}>
                                  <Trash2 className="w-3 h-3 mr-1" /> Disable
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Set PIN Dialog */}
      {pinDialogUser && (
        <Dialog open={!!pinDialogUser} onOpenChange={() => setPinDialogUser(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                {pinDialogUser.kioskEnabled ? "Reset" : "Set"} Kiosk PIN
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Setting PIN for <strong>{pinDialogUser.firstName} {pinDialogUser.lastName}</strong>
                {" "}({pinDialogUser.username || pinDialogUser.email})
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>New PIN (4–8 digits)</Label>
                  <button onClick={() => setShowPin(!showPin)} className="text-muted-foreground">
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Input
                  type={showPin ? "text" : "password"}
                  value={pinValue}
                  onChange={e => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="Enter PIN"
                  inputMode="numeric"
                  className="text-center text-xl tracking-widest"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label>Confirm PIN</Label>
                <Input
                  type={showPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="Re-enter PIN"
                  inputMode="numeric"
                  className="mt-1 text-center text-xl tracking-widest"
                  autoComplete="off"
                  onKeyDown={e => e.key === "Enter" && handleSavePin()}
                />
              </div>

              {pinValue && confirmPin && pinValue !== confirmPin && (
                <p className="text-red-500 text-sm">PINs do not match</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setPinDialogUser(null)}>Cancel</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSavePin}
                  disabled={setPinMutation.isPending || pinValue.length < 4 || pinValue !== confirmPin}>
                  {setPinMutation.isPending ? "Saving..." : "Save PIN"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Disable Confirmation */}
      <AlertDialog open={!!disableUser} onOpenChange={() => setDisableUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Kiosk Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove kiosk PIN access for{" "}
              <strong>{disableUser?.firstName} {disableUser?.lastName}</strong>.
              They will no longer be able to clock in via the kiosk terminal until a new PIN is set.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={() => disableMutation.mutate(disableUser.id)}
              disabled={disableMutation.isPending}>
              {disableMutation.isPending ? "Disabling..." : "Yes, Disable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
