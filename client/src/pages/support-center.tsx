import { useState } from "react";
import { Link, useLocation } from "wouter";
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
  ChevronDown,
  ExternalLink,
  ArrowLeft,
  Code2,
  Monitor,
  CheckCircle,
  AlertCircle,
  Info,
  Key,
  Camera,
  Wifi,
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// ─── Article content for kiosk category ──────────────────────────────────────

const kioskArticleContent: Record<string, { steps?: { icon?: any; title: string; body: string }[]; sections?: { heading: string; items: string[] }[]; tips?: string[]; warnings?: string[] }> = {
  "ki-1": {
    steps: [
      { icon: Monitor, title: "What is the Kiosk?", body: "The Staff Kiosk is a self-service clock-in/clock-out terminal designed to be set up on a shared computer, tablet, or touchscreen display in your office. Staff use it to record their work hours using their username/email and a short numeric PIN — no password required." },
      { icon: Camera, title: "Selfie Verification", body: "When clocking in or out, the kiosk activates the device's webcam and automatically takes a selfie after a 3-second countdown. This photo is stored with the time record for audit and verification purposes." },
      { icon: Clock, title: "Audit Trail", body: "Every kiosk clock-in and clock-out is logged to the staff audit trail with the method marked as 'kiosk', along with the device IP address and timestamp. Managers can review these records in Staff Time Tracking." },
    ],
    tips: [
      "The kiosk works on any modern web browser — Chrome, Firefox, Safari, or Edge.",
      "You can set up the kiosk on a dedicated tablet, touchscreen monitor, or any shared PC.",
      "No login is required to open the kiosk page — it is designed to be left open on the device.",
      "Staff clock-in photos are viewable by managers in the Staff Time Tracking history.",
    ],
  },
  "ki-2": {
    steps: [
      { icon: Key, title: "Step 1 — Open Kiosk Setup", body: "Log in to your admin account and navigate to Staff → Kiosk Setup in the left sidebar. This page manages which staff members can use the kiosk and what PINs they use." },
      { icon: Users, title: "Step 2 — Set PINs for Staff", body: "In the 'Staff Kiosk PINs' table, you'll see all staff accounts. Click 'Set PIN' next to each person you want to enable. Enter a 4–8 digit numeric PIN and confirm it. Staff must be told their PIN separately — it is not sent automatically." },
      { icon: Monitor, title: "Step 3 — Copy the Kiosk URL", body: "At the top of the Kiosk Setup page, there is a blue URL box showing your agency's kiosk terminal address. Click 'Copy' to copy it, then paste it into the browser on the kiosk device. You can also click 'Open' to preview it immediately." },
      { icon: CheckCircle, title: "Step 4 — Set Up the Device", body: "Open the kiosk URL on the shared device. We recommend setting the browser to full-screen mode (F11 on most browsers) and enabling kiosk/display mode in your browser settings to prevent staff from navigating away. Bookmark the URL or set it as the browser's home page." },
      { icon: Camera, title: "Step 5 — Test the Camera", body: "Open the kiosk URL and test using your own credentials. Walk through the full flow: enter your username/email + PIN, verify the camera activates, let the selfie be captured, and confirm the clock-in. Then immediately clock back out." },
    ],
    tips: [
      "Use a tablet in landscape mode for the best kiosk experience.",
      "Disable sleep/screen lock on the kiosk device so it stays awake.",
      "Chrome on a Chromebook in kiosk mode is an excellent dedicated kiosk setup.",
      "PINs are stored securely using bcrypt hashing — they cannot be retrieved, only reset.",
    ],
    warnings: [
      "Staff must use their username or email (not their password) as the Staff ID on the kiosk.",
      "Managers and admins must have a kiosk PIN set before they can use the kiosk terminal.",
    ],
  },
  "ki-3": {
    steps: [
      { title: "Step 1 — Go to the Kiosk", body: "Walk up to the kiosk terminal (shared office computer or tablet) and you'll see the Care Crafter welcome screen with a live clock and date." },
      { title: "Step 2 — Enter Your Staff ID", body: "In the 'Staff ID' field, type your username or email address — whichever you use to log in. The keypad shows '••••' to hide your input. Use 'Type instead' to switch to keyboard entry if preferred." },
      { title: "Step 3 — Enter Your Kiosk PIN", body: "Tap your 4–8 digit numeric PIN on the on-screen keypad (or type it). Tap the eye icon to reveal your PIN for visual confirmation. Press Continue when ready." },
      { title: "Step 4 — Review Your Status", body: "The kiosk shows your name, role, and current status — either 'Currently Clocked In' (with your clock-in time) or 'Not Clocked In'. If clocking out, select your break time from the options shown." },
      { title: "Step 5 — Take Your Selfie", body: "Tap the 'Clock In with Photo' or 'Clock Out with Photo' button. The camera will activate and begin a 3-second countdown. Look at the camera. Your photo will be automatically captured." },
      { title: "Step 6 — Confirm", body: "Review your photo. Tap 'Confirm Clock In' or 'Confirm Clock Out'. The success screen will show your name and the time recorded. The screen resets automatically after a few seconds." },
    ],
    tips: [
      "If you make a mistake during the selfie, tap 'Retake' to try again.",
      "If the camera is unavailable, you can still clock in/out — tap 'Continue without photo'.",
      "Your PIN is different from your login password. Contact your admin if you don't know it.",
    ],
  },
  "ki-4": {
    steps: [
      { icon: Camera, title: "Camera Requirements", body: "The device must have a webcam (built-in or USB). The kiosk uses your browser's camera access — you may be prompted to allow camera permission when first used. Click 'Allow' when the browser asks." },
      { icon: Shield, title: "Photo Storage & Privacy", body: "Selfie photos are stored securely in encrypted database records. They are only viewable by managers and admins in the Staff Time Tracking history. Photos are compressed to reduce storage size (480×360 JPEG at 72% quality)." },
      { icon: Info, title: "Mirror Preview", body: "The live camera preview is mirrored (flipped horizontally) so it looks natural to you, like a mirror. The stored photo is also saved mirrored-style so your face appears the same way it does in the preview." },
      { title: "What Happens if No Camera?", body: "If the device has no camera, or the user denies camera permission, the kiosk shows an error message. Staff can tap 'Continue without photo' to complete the clock-in/out without a selfie. The record will still be created." },
    ],
    tips: [
      "Ensure the kiosk device is in a well-lit area for best selfie quality.",
      "Clean the camera lens periodically on tablet devices.",
      "Position the kiosk at eye level for most accurate selfie captures.",
    ],
    warnings: [
      "Browser camera access must be allowed. If blocked, go to browser Settings → Privacy → Camera and allow access for this site.",
      "iOS Safari requires the site to be served over HTTPS for camera access to work.",
    ],
  },
  "ki-5": {
    sections: [
      {
        heading: "\"Staff ID not found\"",
        items: [
          "The username or email entered doesn't match any account in the system.",
          "Make sure you're typing your username (not your full name) or the email address on your profile.",
          "Usernames are case-sensitive on some systems — try all lowercase first.",
          "Ask your admin to verify your username in User Management.",
        ],
      },
      {
        heading: "\"Kiosk access not enabled for this account\"",
        items: [
          "Your account hasn't been given a kiosk PIN yet.",
          "Ask your manager or admin to set your PIN via Kiosk Setup in the admin portal.",
          "Only users who have been explicitly enabled in Kiosk Setup can use the kiosk terminal.",
        ],
      },
      {
        heading: "\"Incorrect PIN\"",
        items: [
          "The PIN entered doesn't match what's stored for your account.",
          "PINs are numeric only — no letters or symbols.",
          "Contact your admin to reset your PIN if you've forgotten it.",
          "There is no PIN lockout currently — you can try again immediately.",
        ],
      },
      {
        heading: "Camera not activating",
        items: [
          "Check that your browser has permission to access the camera. Look for a camera icon in the browser address bar.",
          "Try refreshing the page and clicking 'Allow' when prompted.",
          "On Chrome: Settings → Privacy and Security → Site Settings → Camera — make sure this site is not blocked.",
          "Try a different browser (Chrome recommended).",
          "If on iOS, ensure Safari is up to date and camera permissions are granted in Settings → Safari → Camera.",
        ],
      },
      {
        heading: "\"Already clocked in\" error when trying to clock in",
        items: [
          "Your account has an active clock-in from a previous session.",
          "You must clock out first before clocking in again.",
          "If you believe this is an error, contact your manager to correct the record in Staff Time Tracking.",
        ],
      },
      {
        heading: "Kiosk page won't load",
        items: [
          "Check the device's internet connection.",
          "Try refreshing the page (F5 or pull-to-refresh on tablet).",
          "Clear the browser cache and reload.",
          "Verify the kiosk URL is correct — get the current URL from an admin via Kiosk Setup.",
        ],
      },
    ],
    tips: [
      "When in doubt, refresh the kiosk page — it always starts fresh on reload.",
      "The kiosk auto-resets after 9 seconds on the success or error screen.",
    ],
  },
  "ki-6": {
    steps: [
      { title: "How do I reset someone's PIN?", body: "Go to Staff → Kiosk Setup. Find the staff member in the table and click 'Reset PIN'. Enter and confirm the new 4–8 digit PIN. The old PIN is immediately replaced." },
      { title: "Can I disable a staff member's kiosk access?", body: "Yes. In Kiosk Setup, click 'Disable' next to any enabled staff member. They will immediately lose kiosk access until a new PIN is set." },
      { title: "Can staff use the kiosk from home?", body: "The kiosk URL is public (no login required), so technically yes — but staff would need the kiosk URL and their PIN. For remote or home workers, the regular staff time tracking page (with login) is more appropriate." },
      { title: "Are kiosk clock-ins different from regular clock-ins?", body: "They create the same type of time record, but the audit log marks the method as 'kiosk'. Managers can see in the audit trail which records were created via kiosk vs. the regular staff portal." },
      { title: "Can I see the selfie photos?", body: "Yes. Managers and admins can see selfie photos attached to time records. In Staff Time Tracking, hover over the Location column — future versions will show the photo thumbnail directly in the record detail." },
      { title: "What if a staff member forgets their PIN?", body: "There is no PIN recovery for staff — only admins can reset it. Direct staff to contact their manager, who can reset the PIN in Kiosk Setup within seconds." },
    ],
    tips: [
      "Only admin, office admin, supervisor, and manager roles appear in the Kiosk Setup staff list.",
      "You can open the kiosk in a new tab from the 'Open' button in Kiosk Setup to preview it before deploying.",
    ],
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const categories = [
  { id: "getting-started", name: "Getting Started", icon: BookOpen, articleCount: 8 },
  { id: "clients", name: "Clients", icon: Users, articleCount: 12 },
  { id: "caregivers", name: "Caregivers", icon: UserCheck, articleCount: 10 },
  { id: "scheduling", name: "Scheduling", icon: Calendar, articleCount: 15 },
  { id: "billing", name: "Billing & Payroll", icon: CreditCard, articleCount: 9 },
  { id: "documents", name: "Documents", icon: FileText, articleCount: 7 },
  { id: "compliance", name: "Compliance", icon: Shield, articleCount: 11 },
  { id: "kiosk", name: "Kiosk Terminal", icon: Monitor, articleCount: 6 },
  { id: "api", name: "API Documentation", icon: Code2, articleCount: 4 },
  { id: "settings", name: "Settings", icon: Settings, articleCount: 6 },
  { id: "faq", name: "FAQ", icon: HelpCircle, articleCount: 23 },
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
  "kiosk": [
    { id: "ki-1", title: "Kiosk Terminal Overview", description: "What is the Staff Kiosk, how selfie verification works, and what gets recorded.", isNew: true, isPopular: true },
    { id: "ki-2", title: "Admin Setup Guide", description: "Step-by-step guide for admins to configure the kiosk, set staff PINs, and deploy the terminal.", isNew: true, isPopular: true },
    { id: "ki-3", title: "Staff: How to Use the Kiosk", description: "A step-by-step walkthrough for staff members clocking in and out at the kiosk terminal.", isNew: true },
    { id: "ki-4", title: "Webcam & Selfie Verification", description: "Camera requirements, privacy information, and what to do if the camera is unavailable.", isNew: true },
    { id: "ki-5", title: "Troubleshooting the Kiosk", description: "Common error messages and how to fix them — login issues, camera problems, and more.", isNew: true },
    { id: "ki-6", title: "Kiosk Admin FAQ", description: "Answers to common admin questions about PINs, photos, audit trails, and remote access.", isNew: true },
  ],
  "settings": [
    { id: "st-1", title: "Account Settings", description: "Managing your personal account settings.", isPopular: true },
    { id: "st-2", title: "Organization Settings", description: "Configuring organization-wide settings." },
    { id: "st-3", title: "Office Management", description: "Adding and managing office locations." },
    { id: "st-4", title: "User Management", description: "Managing user accounts and permissions." },
    { id: "st-5", title: "Notification Settings", description: "Configuring email and SMS notifications." },
    { id: "st-6", title: "Integration Settings", description: "Managing third-party integrations.", isNew: true },
  ],
  "api": [
    { id: "api-1", title: "Mobile API Overview", description: "Introduction to the mobile app API for caregivers.", isNew: true, isPopular: true },
    { id: "api-2", title: "Authentication", description: "JWT-based authentication for login, logout, and profile access." },
    { id: "api-3", title: "Schedules & Clock In/Out", description: "Endpoints for managing schedules and EVV clock in/out." },
    { id: "api-4", title: "Error Handling", description: "Common error codes and how to handle them." },
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
    { id: "fq-21", title: "What is the Staff Kiosk?", description: "The kiosk is a touchscreen clock-in terminal for shared office devices.", isNew: true },
    { id: "fq-22", title: "How do I set a kiosk PIN for a staff member?", description: "Go to Staff → Kiosk Setup and click 'Set PIN' next to the staff member.", isNew: true },
    { id: "fq-23", title: "What if a staff member forgets their kiosk PIN?", description: "Only admins can reset PINs — go to Kiosk Setup and click 'Reset PIN'.", isNew: true },
  ],
};

// ─── Article Detail Panel ─────────────────────────────────────────────────────

function KioskArticleDetail({ articleId, onClose }: { articleId: string; onClose: () => void }) {
  const content = kioskArticleContent[articleId];
  const article = articles["kiosk"]?.find(a => a.id === articleId);
  if (!content || !article) return null;

  return (
    <div className="mt-4 border border-indigo-200 rounded-xl bg-indigo-50/50 overflow-hidden">
      {/* Article header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-indigo-200" />
            <h3 className="text-white font-semibold text-lg">{article.title}</h3>
          </div>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors text-sm flex items-center gap-1">
            <ChevronDown className="h-4 w-4" /> Collapse
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Steps */}
        {content.steps && (
          <div className="space-y-4">
            {content.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  {step.icon ? (
                    <step.icon className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <span className="text-indigo-700 font-bold text-sm">{i + 1}</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">{step.title}</p>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sections (for troubleshooting) */}
        {content.sections && (
          <div className="space-y-5">
            {content.sections.map((section, i) => (
              <div key={i} className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <h4 className="font-semibold text-slate-800">{section.heading}</h4>
                </div>
                <ul className="space-y-1.5">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        {content.tips && content.tips.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-800">Tips & Best Practices</h4>
            </div>
            <ul className="space-y-1.5">
              {content.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {content.warnings && content.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h4 className="font-semibold text-amber-800">Important Notes</h4>
            </div>
            <ul className="space-y-1.5">
              {content.warnings.map((warn, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  {warn}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick link to kiosk setup */}
        {(articleId === "ki-1" || articleId === "ki-2") && (
          <div className="flex gap-3 pt-2">
            <a href="/kiosk-setup" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Settings className="w-4 h-4" /> Open Kiosk Setup
            </a>
            <a href="/kiosk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
              <ExternalLink className="w-4 h-4" /> Open Kiosk Terminal
            </a>
          </div>
        )}
        {articleId === "ki-3" && (
          <div className="flex gap-3 pt-2">
            <a href="/kiosk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <ExternalLink className="w-4 h-4" /> Open Kiosk Terminal
            </a>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SupportCenter() {
  const [selectedCategory, setSelectedCategory] = useState("getting-started");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const filteredArticles = articles[selectedCategory]?.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const currentCategory = categories.find(c => c.id === selectedCategory);

  function handleArticleClick(articleId: string) {
    if (selectedCategory === "api") {
      navigate("/api-docs");
      return;
    }
    if (selectedCategory === "kiosk") {
      setExpandedArticle(expandedArticle === articleId ? null : articleId);
      return;
    }
  }

  function handleCategoryChange(id: string) {
    setSelectedCategory(id);
    setExpandedArticle(null);
  }

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
                        onClick={() => handleCategoryChange(category.id)}
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
            <div className="mb-6">
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

              {/* Kiosk category banner */}
              {selectedCategory === "kiosk" && (
                <div className="mt-3 mb-5 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white flex items-center gap-4">
                  <Monitor className="w-10 h-10 text-blue-200 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-lg">Staff Clock-In Kiosk</p>
                    <p className="text-blue-100 text-sm mt-0.5">A shared-device terminal for staff to clock in/out using a PIN and selfie photo. Click any article below to read the full guide.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href="/kiosk-setup" className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" /> Setup
                    </a>
                    <a href="/kiosk" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" /> Open Kiosk
                    </a>
                  </div>
                </div>
              )}

              <p className="text-slate-600" data-testid="category-description">
                {filteredArticles.length} article{filteredArticles.length !== 1 ? "s" : ""} in this category
                {searchQuery && ` matching "${searchQuery}"`}
                {selectedCategory === "kiosk" && !searchQuery && (
                  <span className="ml-2 text-indigo-600 text-sm font-medium">— click any article to expand the full guide</span>
                )}
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
              <div className="space-y-3" data-testid="articles-list">
                {filteredArticles.map((article) => {
                  const isKiosk = selectedCategory === "kiosk";
                  const isExpanded = expandedArticle === article.id;
                  return (
                    <div key={article.id}>
                      <Card
                        className={`group transition-all cursor-pointer bg-white/70 backdrop-blur-sm ${
                          isExpanded
                            ? "border-indigo-400 shadow-md"
                            : "hover:shadow-md hover:border-indigo-200"
                        }`}
                        data-testid={`article-${article.id}`}
                        onClick={() => handleArticleClick(article.id)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className={`text-base font-semibold transition-colors ${
                                isExpanded ? "text-indigo-700" : "text-slate-900 group-hover:text-indigo-700"
                              }`}>
                                {article.title}
                              </CardTitle>
                              {article.isNew && (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">New</Badge>
                              )}
                              {article.isPopular && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Popular</Badge>
                              )}
                            </div>
                            {isKiosk ? (
                              isExpanded
                                ? <ChevronDown className="h-5 w-5 text-indigo-500 shrink-0" />
                                : <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all shrink-0" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all shrink-0" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-slate-600">
                            {article.description}
                          </CardDescription>
                        </CardContent>
                      </Card>

                      {/* Inline expanded content for kiosk articles */}
                      {isKiosk && isExpanded && (
                        <KioskArticleDetail
                          articleId={article.id}
                          onClose={() => setExpandedArticle(null)}
                        />
                      )}
                    </div>
                  );
                })}
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
