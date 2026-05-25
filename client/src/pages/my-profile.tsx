import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import MyPtoBalanceCard from "@/components/my-pto-balance-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  User, Mail, Phone, Calendar, Building, Edit, Save, X, ClipboardList, FileText
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import type { Caregiver, Office, PerformanceReview } from "@shared/schema";

export default function MyProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const { data: profile, isLoading } = useQuery<Caregiver>({
    queryKey: ["/api/my-profile"],
  });

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  // Performance reviews for this office-staff / caregiver self-service view.
  // Server-side authz restricts the result to reviews this user conducts or
  // is the subject of.
  const { data: myReviews = [] } = useQuery<PerformanceReview[]>({
    queryKey: ["/api/performance-reviews"],
  });
  const { data: myProfileDocs = [] } = useQuery<any[]>({
    queryKey: ["/api/caregivers", profile?.id, "documents", "performance-review"],
    queryFn: async () => {
      if (!profile?.id) return [];
      const all = await fetch(`/api/caregivers/${profile.id}/documents`).then(r => r.json());
      return Array.isArray(all) ? all.filter((d: any) => d.documentType === "performance_review") : [];
    },
    enabled: !!profile?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Caregiver>) => {
      return apiRequest("PATCH", "/api/my-profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-profile"] });
      setIsEditing(false);
      toast({ title: "Success", description: "Profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  const startEditing = () => {
    if (profile) {
      setFormData({
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const getOfficeName = (officeId: string | null) => {
    if (!officeId) return "Not assigned";
    const office = offices.find(o => o.id === officeId);
    return office?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">No profile found. Please contact your administrator.</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
                <p className="text-muted-foreground">View and update your personal information</p>
              </div>
              {!isEditing ? (
                <Button onClick={startEditing}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {profile.firstName} {profile.lastName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant={profile.isActive ? "default" : "secondary"}>
                        {profile.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {profile.hhaxCaregiverCode && (
                        <span className="text-sm">HHAX: {profile.hhaxCaregiverCode}</span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <p className="text-foreground">{profile.email || "Not set"}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </Label>
                    {isEditing ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <p className="text-foreground">{profile.phone || "Not set"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Office
                    </Label>
                    <p className="text-foreground">{getOfficeName(profile.officeId)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Start Date
                    </Label>
                    <p className="text-foreground">
                      {profile.startDate ? format(new Date(profile.startDate), "MMM d, yyyy") : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Address</h3>
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Street Address</Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Street address"
                        />
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="City"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label>State</Label>
                          <Input
                            value={formData.state}
                            onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                            placeholder="State"
                          />
                        </div>
                        <div>
                          <Label>ZIP Code</Label>
                          <Input
                            value={formData.zipCode}
                            onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                            placeholder="ZIP"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-foreground">
                      {profile.address ? (
                        <>
                          {profile.address}
                          {profile.city && `, ${profile.city}`}
                          {profile.state && `, ${profile.state}`}
                          {profile.zipCode && ` ${profile.zipCode}`}
                        </>
                      ) : (
                        "Not set"
                      )}
                    </p>
                  )}
                </div>

              </CardContent>
            </Card>

            <MyPtoBalanceCard />

            <Card data-testid="card-my-performance-reviews">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    <CardTitle>My Performance Reviews</CardTitle>
                  </div>
                  <Link href="/performance-reviews">
                    <Button variant="outline" size="sm" data-testid="link-open-performance-reviews">
                      Open Reviews
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  Reviews you conduct or have received. Signed reviews are stored in your document library.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No performance reviews yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Overall</TableHead>
                        <TableHead>Acknowledged</TableHead>
                        <TableHead>Signed Document</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myReviews.map((r: any) => {
                        const matchingDoc = myProfileDocs.find((d: any) =>
                          d.fileName && d.fileName.startsWith(`performance-review-${r.id}-`)
                        );
                        return (
                          <TableRow key={r.id} data-testid={`row-my-review-${r.id}`}>
                            <TableCell className="capitalize">{(r.reviewType || "").replace(/_/g, " ")}</TableCell>
                            <TableCell>{r.scheduledDate ? format(new Date(r.scheduledDate), "MMM d, yyyy") : "—"}</TableCell>
                            <TableCell>
                              <Badge variant={r.status === "completed" ? "default" : "secondary"}>
                                {(r.status || "scheduled").replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>{r.overallRating ?? "—"}</TableCell>
                            <TableCell>
                              {r.acknowledgedAt
                                ? <Badge className="bg-green-100 text-green-800">{format(new Date(r.acknowledgedAt), "MMM d, yyyy")}</Badge>
                                : <Badge variant="outline">Pending</Badge>}
                            </TableCell>
                            <TableCell>
                              {matchingDoc ? (
                                <a
                                  href={`/api/documents/${matchingDoc.id}/view`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                                  data-testid={`link-my-signed-doc-${r.id}`}
                                >
                                  <FileText className="w-3.5 h-3.5" /> View
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
