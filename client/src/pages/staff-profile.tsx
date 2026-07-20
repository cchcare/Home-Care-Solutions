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
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <aside className="w-56 border-r bg-muted/30 overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate" data-testid="text-staff-name">{staffName}</p>
                  <Badge variant={staff.isActive ? "default" : "secondary"} className="mt-1" data-testid="badge-staff-status">
                    {staff.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <p className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {office?.name || "No office assigned"}
                </p>
                <p className="flex items-center gap-1 mt-1 capitalize">
                  <Briefcase className="w-3 h-3" />
                  {staff.role ? staff.role.replace(/_/g, " ") : "—"}
                </p>
              </div>
              <Link href="/employees">
                <Button variant="outline" size="sm" className="w-full mt-3" data-testid="button-back-directory">
                  <Search className="w-4 h-4 mr-2" />
                  Employee Directory
                </Button>
              </Link>
            </div>

            <nav className="p-2 space-y-1">
              {STAFF_MENU_ITEMS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`menu-${item.id}`}
                  >
                    <IconComponent className="w-4 h-4 flex-shrink-0" />
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
                  <div className="rounded-lg border p-6 bg-card">
                    <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Email</dt>
                        <dd className="mt-1">{staff.email || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Phone</dt>
                        <dd className="mt-1">{staff.mobilePhone || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Role</dt>
                        <dd className="mt-1 capitalize">{staff.role ? staff.role.replace(/_/g, " ") : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Office</dt>
                        <dd className="mt-1">{office?.name || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Hire Date</dt>
                        <dd className="mt-1">{staff.hireDate ? format(new Date(staff.hireDate), "MMM d, yyyy") : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Termination Date</dt>
                        <dd className="mt-1">{staff.terminationDate ? format(new Date(staff.terminationDate), "MMM d, yyyy") : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Address</dt>
                        <dd className="mt-1">
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
