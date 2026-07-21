import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmployeeDocumentsTab } from "@/components/employee-documents-tab";
import { EmployeeWriteUpsSection } from "@/components/employee-write-ups-section";
import { StaffPerformanceReviewsSection } from "@/components/staff-performance-reviews-section";
import { StaffPtoBalanceSection } from "@/components/staff-pto-balance-section";
import { StaffOnboardingStatusSection } from "@/components/staff-onboarding-status-section";
import { format } from "date-fns";
import {
  ArrowLeft, User, Mail, Phone, Building, Briefcase, FileText,
  MessageSquare, ClipboardList, Wallet, UserCheck, Search,
} from "lucide-react";
import type { User as UserType, Office } from "@shared/schema";

const STAFF_MENU_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "onboarding", label: "Onboarding / Offboarding", icon: UserCheck },
  { id: "reviews", label: "Performance Reviews", icon: ClipboardList },
  { id: "pto", label: "PTO Balances", icon: Wallet },
  { id: "notes", label: "Notes & Write-Ups", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FileText },
];

export default function StaffProfile() {
  const [, params] = useRoute("/staff/:id");
  const staffId = params?.id;
  const [activeSection, setActiveSection] = useState("profile");

  const { data: staff, isLoading } = useQuery<UserType>({
    queryKey: ["/api/users", staffId],
    queryFn: () => fetch(`/api/users/${staffId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!staffId,
  });

  const { data: office } = useQuery<Office>({
    queryKey: ["/api/offices", staff?.primaryOfficeId],
    queryFn: () => fetch(`/api/offices/${staff?.primaryOfficeId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!staff?.primaryOfficeId,
  });

  const staffName = staff?.firstName && staff?.lastName
    ? `${staff.firstName} ${staff.lastName}`
    : staff?.email || "Staff Member";

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          <aside className="w-56 border-r bg-muted/25 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-16 animate-pulse" />
              </div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 bg-muted rounded-lg animate-pulse" />
            ))}
          </aside>
          <div className="flex-1 p-6">
            <div className="max-w-5xl space-y-4">
              <div className="h-8 bg-muted rounded w-56 animate-pulse" />
              <div className="h-64 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-4">Staff member not found</p>
          <Link href="/employees">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Employee Directory
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={staffName} />

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-56 border-r bg-muted/25 overflow-y-auto">
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm ${
                  staff.isActive
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400"
                }`}>
                  {staff.firstName || staff.lastName ? (
                    <>{staff.firstName?.[0]}{staff.lastName?.[0]}</>
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate" data-testid="text-staff-name" title={staffName}>
                    {staffName}
                  </p>
                  <Badge
                    variant={staff.isActive ? "default" : "secondary"}
                    className="mt-1.5 text-xs"
                    data-testid="badge-staff-status"
                  >
                    {staff.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <Building className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{office?.name || "No office"}</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <Briefcase className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground capitalize">
                    {staff.role ? staff.role.replace(/_/g, " ") : "No role"}
                  </span>
                </div>
              </div>
              <Link href="/employees">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  data-testid="button-back-directory"
                >
                  <Search className="w-3.5 h-3.5 mr-2" />
                  Directory
                </Button>
              </Link>
            </div>

            <nav className="p-3 space-y-1">
              {STAFF_MENU_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                    data-testid={`menu-${item.id}`}
                    title={item.label}
                  >
                    <IconComponent className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary-foreground" : ""}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-5xl space-y-6">
              {activeSection === "profile" && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-border/50 p-6 bg-card hover:shadow-md transition-shadow">
                    <h2 className="text-base font-semibold mb-5 text-foreground flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Personal Information
                    </h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-sm">
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Email</dt>
                        <dd className="mt-1.5 text-foreground">{staff.email || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Phone</dt>
                        <dd className="mt-1.5 text-foreground">{staff.mobilePhone || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</dt>
                        <dd className="mt-1.5 capitalize text-foreground">{staff.role ? staff.role.replace(/_/g, " ") : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Office</dt>
                        <dd className="mt-1.5 text-foreground">{office?.name || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hire Date</dt>
                        <dd className="mt-1.5 text-foreground">{staff.hireDate ? format(new Date(staff.hireDate), "MMM d, yyyy") : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Termination Date</dt>
                        <dd className="mt-1.5 text-foreground">{staff.terminationDate ? format(new Date(staff.terminationDate), "MMM d, yyyy") : "—"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</dt>
                        <dd className="mt-1.5 text-foreground">
                          {staff.address
                            ? `${staff.address}${staff.address2 ? `, ${staff.address2}` : ""}, ${staff.city || ""} ${staff.state || ""} ${staff.zipCode || ""}`.trim()
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    To edit account details (name, email, role, office), use{" "}
                    <Link href="/user-management" className="text-primary hover:underline">User Management</Link>.
                  </p>
                </div>
              )}

              {activeSection === "onboarding" && staffId && (
                <StaffOnboardingStatusSection userId={staffId} />
              )}

              {activeSection === "reviews" && staffId && (
                <StaffPerformanceReviewsSection userId={staffId} />
              )}

              {activeSection === "pto" && staffId && (
                <StaffPtoBalanceSection userId={staffId} />
              )}

              {activeSection === "notes" && staffId && (
                <EmployeeWriteUpsSection employeeType="user" employeeId={staffId} />
              )}

              {activeSection === "documents" && staffId && (
                <EmployeeDocumentsTab kind="user" employeeId={staffId} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
