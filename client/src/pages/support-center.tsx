import { useState } from "react";
import { Link } from "wouter";
import { 
  Search, 
  BookOpen, 
  Users, 
  UserCheck, 
  Calendar, 
  CreditCard, 
  FileText, 
  Shield, 
  Settings, 
  HelpCircle,
  ChevronRight,
  ExternalLink,
  ArrowLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const categories = [
  { id: "getting-started", name: "Getting Started", icon: BookOpen, articleCount: 8 },
  { id: "clients", name: "Clients", icon: Users, articleCount: 12 },
  { id: "caregivers", name: "Caregivers", icon: UserCheck, articleCount: 10 },
  { id: "scheduling", name: "Scheduling", icon: Calendar, articleCount: 15 },
  { id: "billing", name: "Billing & Payroll", icon: CreditCard, articleCount: 9 },
  { id: "documents", name: "Documents", icon: FileText, articleCount: 7 },
  { id: "compliance", name: "Compliance", icon: Shield, articleCount: 11 },
  { id: "settings", name: "Settings", icon: Settings, articleCount: 6 },
  { id: "faq", name: "FAQ", icon: HelpCircle, articleCount: 20 },
];

const articles: Record<string, Array<{ id: string; title: string; description: string; isNew?: boolean; isPopular?: boolean }>> = {
  "getting-started": [
    { id: "gs-1", title: "Welcome to the Home Care Portal", description: "An introduction to the platform and its core features.", isNew: true },
    { id: "gs-2", title: "Setting Up Your Account", description: "Learn how to configure your organization profile and preferences." },
    { id: "gs-3", title: "Navigating the Dashboard", description: "Understand the main dashboard components and quick actions.", isPopular: true },
    { id: "gs-4", title: "User Roles and Permissions", description: "Overview of different user roles and what each can access." },
    { id: "gs-5", title: "Mobile Access Guide", description: "How to access the portal from mobile devices." },
    { id: "gs-6", title: "Quick Start Checklist", description: "Essential steps to get your agency up and running.", isPopular: true },
    { id: "gs-7", title: "Importing Existing Data", description: "How to import clients, caregivers, and other data." },
    { id: "gs-8", title: "Training Resources", description: "Additional training materials and video tutorials." },
  ],
  "clients": [
    { id: "cl-1", title: "Adding a New Client", description: "Step-by-step guide to registering new clients in the system.", isPopular: true },
    { id: "cl-2", title: "Managing Client Profiles", description: "How to view and update client information." },
    { id: "cl-3", title: "Client Care Plans", description: "Creating and managing individualized care plans." },
    { id: "cl-4", title: "Emergency Contacts", description: "Setting up and managing emergency contact information." },
    { id: "cl-5", title: "Client Documents", description: "Uploading and organizing client-related documents." },
    { id: "cl-6", title: "Family Portal Access", description: "Enabling family members to access client information." },
    { id: "cl-7", title: "Client Status Management", description: "Understanding and updating client status." },
    { id: "cl-8", title: "Medicaid & SNAP Tracking", description: "Managing eligibility renewals and expiration dates.", isNew: true },
    { id: "cl-9", title: "Client Assignments", description: "Assigning caregivers to clients." },
    { id: "cl-10", title: "Progress Notes", description: "Recording and reviewing client progress notes." },
    { id: "cl-11", title: "Client Reports", description: "Generating client-specific reports." },
    { id: "cl-12", title: "Archiving Clients", description: "How to archive inactive clients." },
  ],
  "caregivers": [
    { id: "cg-1", title: "Adding New Caregivers", description: "How to onboard new caregivers in the system.", isPopular: true },
    { id: "cg-2", title: "Caregiver Profiles", description: "Managing caregiver information and credentials." },
    { id: "cg-3", title: "Certifications & Training", description: "Tracking caregiver certifications and training requirements." },
    { id: "cg-4", title: "Availability Management", description: "Setting and updating caregiver availability." },
    { id: "cg-5", title: "Skills & Specializations", description: "Recording caregiver skills and specialties." },
    { id: "cg-6", title: "Performance Tracking", description: "Monitoring caregiver performance metrics." },
    { id: "cg-7", title: "Caregiver Assignments", description: "Viewing and managing client assignments." },
    { id: "cg-8", title: "Time & Attendance", description: "Understanding EVV and clock-in/out features.", isNew: true },
    { id: "cg-9", title: "Caregiver Documents", description: "Managing required documentation." },
    { id: "cg-10", title: "Bulk Updates", description: "How to update multiple caregivers at once." },
  ],
  "scheduling": [
    { id: "sc-1", title: "Creating Schedules", description: "How to create and manage shift schedules.", isPopular: true },
    { id: "sc-2", title: "Week Templates", description: "Using master week templates for recurring schedules." },
    { id: "sc-3", title: "Shift Management", description: "Adding, editing, and deleting shifts." },
    { id: "sc-4", title: "Schedule Conflicts", description: "Identifying and resolving scheduling conflicts." },
    { id: "sc-5", title: "Open Shifts", description: "Managing and filling open shifts." },
    { id: "sc-6", title: "Schedule Notifications", description: "Automatic notifications for schedule changes." },
    { id: "sc-7", title: "Calendar Views", description: "Using different calendar views effectively." },
    { id: "sc-8", title: "HHAeXchange Integration", description: "Syncing schedules with HHAeXchange.", isNew: true },
    { id: "sc-9", title: "Schedule Reports", description: "Generating scheduling reports." },
    { id: "sc-10", title: "Overtime Alerts", description: "Setting up overtime warnings and limits." },
    { id: "sc-11", title: "Client Schedule Preferences", description: "Managing client scheduling preferences." },
    { id: "sc-12", title: "Caregiver Matching", description: "Using AI to match caregivers with clients." },
    { id: "sc-13", title: "Holiday Scheduling", description: "Managing schedules during holidays." },
    { id: "sc-14", title: "Schedule Approval Workflow", description: "Understanding schedule approval processes." },
    { id: "sc-15", title: "Mobile Scheduling", description: "Viewing and managing schedules on mobile." },
  ],
  "billing": [
    { id: "bl-1", title: "Billing Overview", description: "Understanding the billing and payroll system.", isPopular: true },
    { id: "bl-2", title: "Invoice Generation", description: "Creating and managing invoices." },
    { id: "bl-3", title: "Payroll Processing", description: "Running payroll and managing payments." },
    { id: "bl-4", title: "Rate Management", description: "Setting up billing and pay rates." },
    { id: "bl-5", title: "MCO Billing", description: "Billing to Managed Care Organizations." },
    { id: "bl-6", title: "Payment Tracking", description: "Tracking payments and outstanding balances." },
    { id: "bl-7", title: "Billing Reports", description: "Generating financial reports.", isNew: true },
    { id: "bl-8", title: "Stripe Integration", description: "Using Stripe for payment processing." },
    { id: "bl-9", title: "Tax Documents", description: "Managing tax-related documentation." },
  ],
  "documents": [
    { id: "dc-1", title: "Document Management", description: "Overview of the document system.", isPopular: true },
    { id: "dc-2", title: "Uploading Documents", description: "How to upload and organize documents." },
    { id: "dc-3", title: "Document Types", description: "Understanding different document categories." },
    { id: "dc-4", title: "E-Signatures", description: "Using electronic signatures for documents." },
    { id: "dc-5", title: "Document Templates", description: "Creating and using document templates." },
    { id: "dc-6", title: "OCR Processing", description: "Using OCR to extract document data.", isNew: true },
    { id: "dc-7", title: "Document Security", description: "HIPAA compliance and document security." },
  ],
  "compliance": [
    { id: "cm-1", title: "Compliance Overview", description: "Understanding compliance requirements.", isPopular: true },
    { id: "cm-2", title: "HIPAA Compliance", description: "Maintaining HIPAA compliance in the portal." },
    { id: "cm-3", title: "Background Checks", description: "Managing caregiver background checks." },
    { id: "cm-4", title: "Exclusion Verification", description: "OIG and SAM exclusion list verification.", isNew: true },
    { id: "cm-5", title: "Training Requirements", description: "Tracking mandatory training completion." },
    { id: "cm-6", title: "Audit Logs", description: "Understanding and using audit logs." },
    { id: "cm-7", title: "Incident Reporting", description: "Recording and managing incidents." },
    { id: "cm-8", title: "Compliance Reports", description: "Generating compliance reports." },
    { id: "cm-9", title: "Expiration Alerts", description: "Setting up alerts for expiring credentials." },
    { id: "cm-10", title: "Policy Management", description: "Managing organizational policies." },
    { id: "cm-11", title: "State Regulations", description: "Understanding state-specific requirements." },
  ],
  "settings": [
    { id: "st-1", title: "Account Settings", description: "Managing your personal account settings.", isPopular: true },
    { id: "st-2", title: "Organization Settings", description: "Configuring organization-wide settings." },
    { id: "st-3", title: "Office Management", description: "Adding and managing office locations." },
    { id: "st-4", title: "User Management", description: "Managing user accounts and permissions." },
    { id: "st-5", title: "Notification Settings", description: "Configuring email and SMS notifications." },
    { id: "st-6", title: "Integration Settings", description: "Managing third-party integrations.", isNew: true },
  ],
  "faq": [
    { id: "fq-1", title: "How do I reset my password?", description: "Steps to reset your login password.", isPopular: true },
    { id: "fq-2", title: "Why can't I see certain clients?", description: "Understanding office and role permissions." },
    { id: "fq-3", title: "How do I contact support?", description: "Ways to reach our support team.", isPopular: true },
    { id: "fq-4", title: "Can I use the portal on mobile?", description: "Mobile device compatibility information." },
    { id: "fq-5", title: "How do I export data?", description: "Exporting data from the portal." },
    { id: "fq-6", title: "What browsers are supported?", description: "Browser compatibility information." },
    { id: "fq-7", title: "How do I add a new office?", description: "Creating additional office locations." },
    { id: "fq-8", title: "Is my data secure?", description: "Information about data security." },
    { id: "fq-9", title: "How do billing tiers work?", description: "Understanding subscription tiers." },
    { id: "fq-10", title: "Can families access client info?", description: "Family portal access explanation." },
    { id: "fq-11", title: "How do I update client info?", description: "Editing client profile information." },
    { id: "fq-12", title: "What is EVV?", description: "Electronic Visit Verification explained." },
    { id: "fq-13", title: "How do I assign caregivers?", description: "Assigning caregivers to clients." },
    { id: "fq-14", title: "Can I customize the dashboard?", description: "Dashboard customization options." },
    { id: "fq-15", title: "How do I generate reports?", description: "Creating and exporting reports." },
    { id: "fq-16", title: "What is the AI Assistant?", description: "Using the AI-powered features." },
    { id: "fq-17", title: "How do I track certifications?", description: "Managing caregiver certifications." },
    { id: "fq-18", title: "Can I import from Excel?", description: "Importing data from spreadsheets." },
    { id: "fq-19", title: "How do notifications work?", description: "Understanding the notification system." },
    { id: "fq-20", title: "How do I cancel my subscription?", description: "Subscription cancellation process." },
  ],
};

export default function SupportCenter() {
  const [selectedCategory, setSelectedCategory] = useState("getting-started");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = articles[selectedCategory]?.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const currentCategory = categories.find(c => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a 
                href="/" 
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                data-testid="link-back-to-portal"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Back to Portal</span>
              </a>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-indigo-600" />
                <h1 className="text-xl font-semibold text-slate-900" data-testid="header-title">Help Center</h1>
              </div>
            </div>
            <div className="relative w-80" data-testid="search-container">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/70 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
                data-testid="input-search"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0" data-testid="sidebar-categories">
            <div className="sticky top-24">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
                Categories
              </h2>
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <nav className="space-y-1">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isActive = selectedCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                        data-testid={`category-${category.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                          <span>{category.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                        }`}>
                          {category.articleCount}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </ScrollArea>
            </div>
          </aside>

          <main className="flex-1 min-w-0" data-testid="main-content">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                {currentCategory && (
                  <>
                    <currentCategory.icon className="h-6 w-6 text-indigo-600" />
                    <h2 className="text-2xl font-bold text-slate-900" data-testid="category-title">
                      {currentCategory.name}
                    </h2>
                  </>
                )}
              </div>
              <p className="text-slate-600" data-testid="category-description">
                {filteredArticles.length} article{filteredArticles.length !== 1 ? "s" : ""} in this category
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>

            {filteredArticles.length === 0 ? (
              <Card className="border-dashed" data-testid="no-results">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Search className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No articles found</h3>
                  <p className="text-slate-500 text-center max-w-md">
                    We couldn't find any articles matching your search. Try adjusting your search terms or browse a different category.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4" data-testid="articles-list">
                {filteredArticles.map((article) => (
                  <Card 
                    key={article.id} 
                    className="group hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer bg-white/70 backdrop-blur-sm"
                    data-testid={`article-${article.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            {article.title}
                          </CardTitle>
                          {article.isNew && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">New</Badge>
                          )}
                          {article.isPopular && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Popular</Badge>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-slate-600">
                        {article.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-12 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100" data-testid="contact-support-section">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Can't find what you're looking for?</h3>
                  <p className="text-slate-600 mb-4">
                    Our support team is here to help. Reach out and we'll get back to you as soon as possible.
                  </p>
                  <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="btn-contact-support">
                    Contact Support
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="hidden md:block">
                  <HelpCircle className="h-16 w-16 text-indigo-200" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white/60 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Home Care Portal. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy-policy">
                <a className="text-sm text-slate-500 hover:text-slate-700 transition-colors" data-testid="link-privacy">
                  Privacy Policy
                </a>
              </Link>
              <Link href="/terms-of-use">
                <a className="text-sm text-slate-500 hover:text-slate-700 transition-colors" data-testid="link-terms">
                  Terms of Use
                </a>
              </Link>
              <Link href="/system-status">
                <a className="text-sm text-slate-500 hover:text-slate-700 transition-colors" data-testid="link-status">
                  System Status
                </a>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
