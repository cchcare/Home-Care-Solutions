import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2, CreditCard, ShieldCheck, Plus, Pencil, Trash2, ArrowLeft,
  Loader2, ShieldAlert, Users as UsersIcon, Receipt, KeyRound,
} from "lucide-react";
import { format } from "date-fns";
import type { Organization, SubscriptionPlan, User, SubscriptionHistoryRecord } from "@shared/schema";

const ORG_STATUSES = ["pending", "active", "suspended", "cancelled"];
const SUBSCRIPTION_STATUSES = ["inactive", "trialing", "active", "past_due", "cancelled"];
const COMPANY_USER_ROLES = ["admin", "office_admin", "supervisor", "caregiver", "family"];

function centsToDollarsInput(cents: number | null | undefined) {
  return cents != null ? String(cents / 100) : "";
}
function dollarsInputToCents(value: string) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function formatCents(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

export default function PlatformAdminPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const role = (user as any)?.role;
  if (!user || !["super_admin", "platform_support"].includes(role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <ShieldAlert className="w-14 h-14 text-red-400 mx-auto" />
          <h1 className="text-xl font-semibold text-slate-100">Access Restricted</h1>
          <p className="text-slate-400 text-sm">
            This console is limited to platform administration staff. Contact your super admin if you believe this is a mistake.
          </p>
          <Link href="/">
            <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" data-testid="button-back-to-app">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to app
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <PlatformAdminConsole isSuperAdmin={role === "super_admin"} />;
}

function PlatformAdminConsole({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Platform Admin</p>
              <p className="text-xs text-slate-500 leading-tight">SaaS backoffice console</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800" data-testid="button-exit-console">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit to app
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="companies" className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="companies" data-testid="tab-companies" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
              <Building2 className="w-4 h-4 mr-2" /> Companies
            </TabsTrigger>
            <TabsTrigger value="plans" data-testid="tab-plans" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
              <CreditCard className="w-4 h-4 mr-2" /> Subscription Plans
            </TabsTrigger>
            <TabsTrigger value="support-users" data-testid="tab-support-users" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
              <KeyRound className="w-4 h-4 mr-2" /> Support Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-6">
            <CompaniesTab />
          </TabsContent>
          <TabsContent value="plans" className="mt-6">
            <PlansTab />
          </TabsContent>
          <TabsContent value="support-users" className="mt-6">
            <SupportUsersTab isSuperAdmin={isSuperAdmin} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  suspended: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};

function CompaniesTab() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: orgs = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/platform-admin/organizations"],
  });
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/platform-admin/plans"],
  });

  const planName = (id: string | null) => plans.find((p) => p.id === id)?.name || "—";

  const filtered = orgs.filter((o) =>
    !search.trim() ||
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId) || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search companies by name, email, or slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
          data-testid="input-search-companies"
        />
        <p className="text-sm text-slate-500">{filtered.length} of {orgs.length} companies</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Company</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Plan</TableHead>
              <TableHead className="text-slate-400">Clients</TableHead>
              <TableHead className="text-slate-400">Signed up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-slate-800"><TableCell colSpan={5} className="text-center text-slate-500 py-8">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow className="border-slate-800"><TableCell colSpan={5} className="text-center text-slate-500 py-8">No companies found</TableCell></TableRow>
            ) : (
              filtered.map((org) => (
                <TableRow
                  key={org.id}
                  className="border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                  onClick={() => setSelectedOrgId(org.id)}
                  data-testid={`row-company-${org.id}`}
                >
                  <TableCell>
                    <p className="font-medium text-slate-100">{org.name}</p>
                    <p className="text-xs text-slate-500">{org.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={`border-0 capitalize ${STATUS_BADGE[org.status || "pending"]}`}>{org.status}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{planName(org.subscriptionPlanId)}</TableCell>
                  <TableCell className="text-slate-300">{org.currentClientCount ?? 0} / {org.clientLimit ?? "∞"}</TableCell>
                  <TableCell className="text-slate-400 text-sm">{org.createdAt ? format(new Date(org.createdAt), "MMM d, yyyy") : "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CompanyDetailSheet org={selectedOrg} plans={plans} onClose={() => setSelectedOrgId(null)} />
    </div>
  );
}

function CompanyDetailSheet({ org, plans, onClose }: { org: Organization | null; plans: SubscriptionPlan[]; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<Organization>>({});
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ email: "", firstName: "", lastName: "", role: "office_admin", password: "" });

  if (org && form.id !== org.id) {
    setForm(org);
  }

  const { data: orgUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/platform-admin/organizations", org?.id, "users"],
    queryFn: () => fetch(`/api/platform-admin/organizations/${org?.id}/users`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!org,
  });

  const { data: billingHistory = [] } = useQuery<SubscriptionHistoryRecord[]>({
    queryKey: ["/api/platform-admin/organizations", org?.id, "billing-history"],
    queryFn: () => fetch(`/api/platform-admin/organizations/${org?.id}/billing-history`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!org,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/organizations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/organizations", org?.id, "users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/organizations", org?.id, "billing-history"] });
  };

  const saveOrgMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/platform-admin/organizations/${org?.id}`, {
      name: form.name, email: form.email, phone: form.phone, billingEmail: form.billingEmail,
      status: form.status, subscriptionStatus: form.subscriptionStatus,
      subscriptionPlanId: form.subscriptionPlanId, clientLimit: form.clientLimit,
    }),
    onSuccess: () => { toast({ title: "Company updated" }); invalidateAll(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveUserMutation = useMutation({
    mutationFn: () => {
      const payload: any = { email: userForm.email, firstName: userForm.firstName, lastName: userForm.lastName, role: userForm.role };
      if (userForm.password) payload.password = userForm.password;
      if (editingUser) return apiRequest("PUT", `/api/platform-admin/users/${editingUser.id}`, payload);
      return apiRequest("POST", `/api/platform-admin/organizations/${org?.id}/users`, { ...payload, password: userForm.password });
    },
    onSuccess: () => {
      toast({ title: editingUser ? "User updated" : "User added" });
      invalidateAll();
      setAddUserOpen(false);
      setEditingUser(null);
      setUserForm({ email: "", firstName: "", lastName: "", role: "office_admin", password: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/platform-admin/users/${id}`),
    onSuccess: () => { toast({ title: "User removed" }); invalidateAll(); setDeleteUserId(null); },
    onError: (e: any) => toast({ title: "Failed to remove user", description: e.message, variant: "destructive" }),
  });

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({ email: "", firstName: "", lastName: "", role: "office_admin", password: "" });
    setAddUserOpen(true);
  };
  const openEditUser = (u: User) => {
    setEditingUser(u);
    setUserForm({ email: u.email || "", firstName: u.firstName || "", lastName: u.lastName || "", role: u.role || "office_admin", password: "" });
    setAddUserOpen(true);
  };

  return (
    <Sheet open={!!org} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-slate-950 border-slate-800 text-slate-100 w-full sm:max-w-2xl overflow-y-auto">
        {org && (
          <>
            <SheetHeader>
              <SheetTitle className="text-slate-100">{org.name}</SheetTitle>
              <SheetDescription className="text-slate-500">{org.slug} · created {org.createdAt ? format(new Date(org.createdAt), "MMM d, yyyy") : "—"}</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-8">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Company & Subscription</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs">Company Name</Label>
                    <Input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-org-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs">Contact Email</Label>
                    <Input value={form.email || ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-org-email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs">Phone</Label>
                    <Input value={form.phone || ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-org-phone" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs">Billing Email</Label>
                    <Input value={form.billingEmail || ""} onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-org-billing-email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs">Account Status</Label>
                    <Select value={form.status || "pending"} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Organization["status"] }))}>
                      <SelectTrigger className="bg-slate-900 border-slate-800" data-testid="select-org-status"><SelectValue /></SelectTrigger>
                      <SelectContent>{ORG_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs">Subscription Status</Label>
                    <Select value={form.subscriptionStatus || "inactive"} onValueChange={(v) => setForm((f) => ({ ...f, subscriptionStatus: v }))}>
                      <SelectTrigger className="bg-slate-900 border-slate-800" data-testid="select-org-subscription-status"><SelectValue /></SelectTrigger>
                      <SelectContent>{SUBSCRIPTION_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs">Plan</Label>
                    <Select value={form.subscriptionPlanId || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, subscriptionPlanId: v === "__none__" ? null : v }))}>
                      <SelectTrigger className="bg-slate-900 border-slate-800" data-testid="select-org-plan"><SelectValue placeholder="No plan" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No plan</SelectItem>
                        {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({formatCents(p.priceMonthly)}/mo)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs">Client Limit</Label>
                    <Input type="number" min={0} value={form.clientLimit ?? ""} onChange={(e) => setForm((f) => ({ ...f, clientLimit: e.target.value ? parseInt(e.target.value, 10) : null }))} className="bg-slate-900 border-slate-800" data-testid="input-org-client-limit" />
                  </div>
                </div>
                <Button onClick={() => saveOrgMutation.mutate()} disabled={saveOrgMutation.isPending} className="bg-indigo-600 hover:bg-indigo-500" data-testid="button-save-org">
                  {saveOrgMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" /> Company Users
                  </h3>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={openAddUser} data-testid="button-add-org-user">
                    <Plus className="w-4 h-4 mr-1" /> Add User
                  </Button>
                </div>
                <div className="rounded-lg border border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">Name</TableHead>
                        <TableHead className="text-slate-400">Role</TableHead>
                        <TableHead className="text-slate-400 w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgUsers.length === 0 ? (
                        <TableRow className="border-slate-800"><TableCell colSpan={3} className="text-center text-slate-500 py-6">No users yet</TableCell></TableRow>
                      ) : orgUsers.map((u) => (
                        <TableRow key={u.id} className="border-slate-800" data-testid={`row-org-user-${u.id}`}>
                          <TableCell>
                            <p className="text-slate-200">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="capitalize border-slate-700 text-slate-300">{u.role?.replace("_", " ")}</Badge></TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-100" onClick={() => openEditUser(u)} data-testid={`button-edit-org-user-${u.id}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeleteUserId(u.id)} data-testid={`button-delete-org-user-${u.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                  <Receipt className="w-4 h-4" /> Billing History
                </h3>
                <div className="rounded-lg border border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">Date</TableHead>
                        <TableHead className="text-slate-400">Action</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingHistory.length === 0 ? (
                        <TableRow className="border-slate-800"><TableCell colSpan={4} className="text-center text-slate-500 py-6">No billing activity yet</TableCell></TableRow>
                      ) : billingHistory.map((h) => (
                        <TableRow key={h.id} className="border-slate-800" data-testid={`row-billing-${h.id}`}>
                          <TableCell className="text-slate-400 text-sm">{h.createdAt ? format(new Date(h.createdAt), "MMM d, yyyy") : "—"}</TableCell>
                          <TableCell className="text-slate-200 capitalize">{h.action.replace(/_/g, " ")}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize border-slate-700 text-slate-300">{h.status || "—"}</Badge></TableCell>
                          <TableCell className="text-slate-200">{formatCents(h.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>

      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>{editingUser ? "Edit User" : "Add Company User"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">First Name</Label>
                <Input value={userForm.firstName} onChange={(e) => setUserForm((f) => ({ ...f, firstName: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-org-user-first-name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Last Name</Label>
                <Input value={userForm.lastName} onChange={(e) => setUserForm((f) => ({ ...f, lastName: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-org-user-last-name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Email</Label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-org-user-email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Role</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger className="bg-slate-900 border-slate-800" data-testid="select-org-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>{COMPANY_USER_ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">{editingUser ? "New Password (leave blank to keep current)" : "Temporary Password"}</Label>
              <Input type="password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-org-user-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setAddUserOpen(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-500"
              disabled={saveUserMutation.isPending || !userForm.email || (!editingUser && userForm.password.length < 8)}
              onClick={() => saveUserMutation.mutate()}
              data-testid="button-save-org-user"
            >
              {saveUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? "Save Changes" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUserId} onOpenChange={(o) => !o && setDeleteUserId(null)}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Remove this user?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setDeleteUserId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteUserMutation.isPending} onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)} data-testid="button-confirm-delete-org-user">
              {deleteUserMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

const emptyPlanForm = {
  name: "", description: "", priceMonthly: "", clientLimitMin: "1", clientLimitMax: "25",
  features: "", isPopular: false, isActive: true, sortOrder: "0",
};

function PlansTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState(emptyPlanForm);

  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/platform-admin/plans"],
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/plans"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        priceMonthly: dollarsInputToCents(form.priceMonthly),
        clientLimitMin: parseInt(form.clientLimitMin, 10) || 0,
        clientLimitMax: parseInt(form.clientLimitMax, 10) || 0,
        features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
        isPopular: form.isPopular,
        isActive: form.isActive,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };
      if (editing) return apiRequest("PUT", `/api/platform-admin/plans/${editing.id}`, payload);
      return apiRequest("POST", "/api/platform-admin/plans", payload);
    },
    onSuccess: () => {
      toast({ title: editing ? "Plan updated" : "Plan created" });
      invalidate();
      setOpen(false);
      setEditing(null);
      setForm(emptyPlanForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyPlanForm); setOpen(true); };
  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description || "",
      priceMonthly: centsToDollarsInput(plan.priceMonthly),
      clientLimitMin: String(plan.clientLimitMin),
      clientLimitMax: String(plan.clientLimitMax),
      features: (plan.features || []).join("\n"),
      isPopular: !!plan.isPopular,
      isActive: !!plan.isActive,
      sortOrder: String(plan.sortOrder ?? 0),
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">Pricing tiers offered at signup.</p>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-500" data-testid="button-add-plan">
          <Plus className="w-4 h-4 mr-2" /> New Plan
        </Button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Plan</TableHead>
              <TableHead className="text-slate-400">Price</TableHead>
              <TableHead className="text-slate-400">Client Range</TableHead>
              <TableHead className="text-slate-400">Flags</TableHead>
              <TableHead className="text-slate-400 w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-slate-800"><TableCell colSpan={5} className="text-center text-slate-500 py-8">Loading…</TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow className="border-slate-800"><TableCell colSpan={5} className="text-center text-slate-500 py-8">No plans yet</TableCell></TableRow>
            ) : plans.map((plan) => (
              <TableRow key={plan.id} className="border-slate-800" data-testid={`row-plan-${plan.id}`}>
                <TableCell>
                  <p className="font-medium text-slate-100">{plan.name}</p>
                  <p className="text-xs text-slate-500 max-w-sm truncate">{plan.description}</p>
                </TableCell>
                <TableCell className="text-slate-200">{formatCents(plan.priceMonthly)}/mo</TableCell>
                <TableCell className="text-slate-300">{plan.clientLimitMin}–{plan.clientLimitMax >= 1000 ? "∞" : plan.clientLimitMax}</TableCell>
                <TableCell className="space-x-1">
                  {plan.isPopular && <Badge className="border-0 bg-indigo-500/15 text-indigo-300">Popular</Badge>}
                  <Badge className={`border-0 ${plan.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/50 text-slate-400"}`}>{plan.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-100" onClick={() => openEdit(plan)} data-testid={`button-edit-plan-${plan.id}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Plan" : "New Subscription Plan"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Plan Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-plan-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="textarea-plan-description" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Price / mo ($)</Label>
                <Input type="number" step="0.01" min="0" value={form.priceMonthly} onChange={(e) => setForm((f) => ({ ...f, priceMonthly: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-plan-price" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Min Clients</Label>
                <Input type="number" min="0" value={form.clientLimitMin} onChange={(e) => setForm((f) => ({ ...f, clientLimitMin: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-plan-min-clients" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Max Clients</Label>
                <Input type="number" min="0" value={form.clientLimitMax} onChange={(e) => setForm((f) => ({ ...f, clientLimitMax: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-plan-max-clients" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Features (one per line)</Label>
              <Textarea rows={4} value={form.features} onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="textarea-plan-features" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.isPopular} onCheckedChange={(v) => setForm((f) => ({ ...f, isPopular: v }))} data-testid="switch-plan-popular" />
                <Label className="text-slate-300 text-sm">Mark as Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} data-testid="switch-plan-active" />
                <Label className="text-slate-300 text-sm">Active (shown at signup)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-500"
              disabled={saveMutation.isPending || !form.name.trim() || !form.priceMonthly}
              onClick={() => saveMutation.mutate()}
              data-testid="button-save-plan"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const emptySupportForm = { email: "", firstName: "", lastName: "", password: "" };

function SupportUsersTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySupportForm);

  const { data: supportUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/platform-admin/support-users"],
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/support-users"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = { email: form.email, firstName: form.firstName, lastName: form.lastName };
      if (form.password) payload.password = form.password;
      if (editing) return apiRequest("PUT", `/api/platform-admin/support-users/${editing.id}`, payload);
      return apiRequest("POST", "/api/platform-admin/support-users", { ...payload, password: form.password });
    },
    onSuccess: () => {
      toast({ title: editing ? "Support user updated" : "Support user added" });
      invalidate();
      setOpen(false);
      setEditing(null);
      setForm(emptySupportForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/platform-admin/support-users/${id}`),
    onSuccess: () => { toast({ title: "Support user removed" }); invalidate(); setDeleteId(null); },
    onError: (e: any) => toast({ title: "Failed to remove", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptySupportForm); setOpen(true); };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ email: u.email || "", firstName: u.firstName || "", lastName: u.lastName || "", password: "" });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          {isSuperAdmin
            ? "Staff who can access this console to manage companies, plans, and subscriptions."
            : "Only super admins can add, edit, or remove support accounts."}
        </p>
        {isSuperAdmin && (
          <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-500" data-testid="button-add-support-user">
            <Plus className="w-4 h-4 mr-2" /> New Support User
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Email</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              {isSuperAdmin && <TableHead className="text-slate-400 w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-slate-800"><TableCell colSpan={4} className="text-center text-slate-500 py-8">Loading…</TableCell></TableRow>
            ) : supportUsers.length === 0 ? (
              <TableRow className="border-slate-800"><TableCell colSpan={4} className="text-center text-slate-500 py-8">No support users yet</TableCell></TableRow>
            ) : supportUsers.map((u) => (
              <TableRow key={u.id} className="border-slate-800" data-testid={`row-support-user-${u.id}`}>
                <TableCell className="text-slate-200">{u.firstName} {u.lastName}</TableCell>
                <TableCell className="text-slate-300">{u.email}</TableCell>
                <TableCell><Badge className={`border-0 ${u.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/50 text-slate-400"}`}>{u.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-100" onClick={() => openEdit(u)} data-testid={`button-edit-support-user-${u.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeleteId(u.id)} data-testid={`button-delete-support-user-${u.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>{editing ? "Edit Support User" : "New Support User"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">First Name</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-support-first-name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-support-last-name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-support-email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">{editing ? "New Password (leave blank to keep current)" : "Temporary Password"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="bg-slate-900 border-slate-800" data-testid="input-support-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-500"
              disabled={saveMutation.isPending || !form.email || (!editing && form.password.length < 8)}
              onClick={() => saveMutation.mutate()}
              data-testid="button-save-support-user"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Support User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Remove this support user?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-support-user">
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
