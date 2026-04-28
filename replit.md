# Home Care Management System

## Overview
Home Care is a HIPAA-compliant agency management system designed for home care providers. It streamlines operations through client and caregiver management, compliance tracking, and automated scheduling. Built with React, TypeScript, Express, and PostgreSQL, it offers a secure, modern web interface with features like role-based access, AI-powered payroll, and multi-channel notifications. The system aims to enhance efficiency, ensure regulatory compliance, and support comprehensive agency management from office operations to advanced analytics and future SaaS multi-tenancy.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Core Technologies
- **Frontend**: React with TypeScript, Wouter (routing), TanStack Query (state management). UI/UX uses Shadcn/ui (Radix UI & Tailwind CSS) with dark mode. Forms are managed with React Hook Form and Zod.
- **Backend**: Express.js for RESTful APIs. Authentication is session-based with bcrypt, Express sessions (PostgreSQL-backed), rate limiting, and role-based access. Multer handles HIPAA-compliant file uploads.
- **Database**: PostgreSQL on Neon, managed with Drizzle ORM and Drizzle Kit for migrations. Schema designed for HIPAA compliance across all modules.

### Key Features
- **Office & Client Management**: Profiles, license tracking, staff management, expense tracking, and office-based data filtering.
- **Billing**: MCO-focused billing with automatic due date calculation and status tracking.
- **Caregiver Management**: Enhanced profiles, HHAX ID integration, and compliance tracking (PA State Form -9, background checks, medical requirements).
- **Caregiver Self-Service Portal**: Role-restricted web portal allowing caregivers to view their own profile, compliance items, documents, communications, and support tickets. All /api/my-* endpoints enforce caregiver role with sanitized data responses.
- **Payroll**: AI-powered OCR for paystub uploads, biweekly payroll runs, Excel import of billing hours (with overtime calculation), and Excel export of payroll hours.
- **Scheduling**: Master weekly templates for recurring client schedules and automated birthday notifications via SMS/email.
- **Advanced Features (v2.0)**:
    - **EVV**: GPS-based clock-in/out with location tracking.
    - **Care Plan & Medication Tracking**: Structured goals, interventions, medication lists, adherence logging, and vital signs logging.
    - **Workflow Automation**: Incident follow-up, push notifications, real-time availability, and a 100-point shift matching algorithm.
    - **Operational Tools**: Vehicle/mileage tracking, recruitment portal, background check workflow, and shift differentials.
    - **Compliance & Analytics**: Time-off requests, automated eligibility verification, claims management, and advanced analytics dashboards.
    - **Engagement**: Client satisfaction surveys and referral source tracking.
    - **Exclusion Verification System**: Automated monthly screening against OIG, PA Medicheck, and SAM.gov with fuzzy matching and admin dashboard.
    - **HHAeXchange (HHAX) Integration**: Automated SFTP-based data sync for caregivers, clients, and schedules with office mapping and logging.
    - **Visit Log Upload**: Bulk schedule/visit updates via Excel upload with flexible column matching.
    - **Letter & Email Template Management**: Admin UI for creating mail-merge letter templates and system-wide email templates with placeholders, versioning, and live previews.
    - **Help Center Admin**: Super-admin UI at `/help-center-admin` for creating and managing dynamic help articles. Uses a Tiptap rich-text editor (bold/italic/underline/strike/lists/blockquote/code/alignments/headings/color/HR) with inline image upload (`/api/help-articles/upload-image` → stored in `uploads/`), YouTube/Vimeo video embeds, and hyperlink insertion. Articles have title, auto-slugified slug, category, subcategory, tags, display order, and published/draft toggle. Published articles appear in the `/support-center` page merged with static articles, expandable inline with full HTML rendering. DB table: `help_articles`. Routes: `GET /api/help-articles` (public), `POST/PUT/DELETE /api/help-articles/:id` (super_admin), `POST /api/help-articles/upload-image` (super_admin). Sidebar link under Admin section for super_admin only.
    - **Staff Time Tracking (Enhanced)**: Strict clock-in/out system for office staff (separate from caregiver EVV). Features: GPS location capture on clock-in/out (browser Geolocation API), IP address and device info logging, immutable audit trail (`staff_time_audit_logs` table), auto-flag for sessions over 16h, manager live dashboard (who's clocked in now with elapsed time), manager edit with required reason (audit logged), approve/flag/payroll-lock actions, CSV export, and 5-tab UI. DB tables: `staff_time_records` (GPS, IP, device, edit, approval, lock, flag columns) and `staff_time_audit_logs`. API: `/api/staff/clock-in`, `/api/staff/clock-out`, `/api/staff/time-records`, `/api/staff/time-records/active`, `/api/staff/time-records/:id` (PATCH), `/api/staff/time-records/:id/approve`, `/api/staff/time-records/:id/flag`, `/api/staff/time-records/lock-payroll`, `/api/staff/live-dashboard`, `/api/staff/audit-logs`, `/api/staff/ot-report`. Frontend: `/staff-time-tracking` (sidebar: Staff > Staff Time Tracking). Manager roles: super_admin, admin, office_admin, supervisor, manager.
    - **DOH Audit Assessment Tool**: Per-office PA Department of Health survey readiness checklist tool at `/audit-assessment`. Covers 5 categories with 75 items total: Company Documents (12), Policy & Procedures (16), Caregiver Files (19), Client Files (16), Critical Incident Reporting (12). Each item supports Pass/Deficient/N/A status plus free-text notes. Progress auto-saves to DB. Multiple audits can be created per office (with title and survey period). Audits can be marked complete or reopened. Summary stats (items reviewed, pass count, deficiency count, pass rate) shown at top. Per-category progress bars and deficiency counts on tab badges. Printable. **Document uploads**: Each audit has a "Documents" tab for attaching supporting evidence (photos, PDF, Word, Excel up to 25 MB), with S3-compatible storage, file type icons, download/view, and delete. **Custom checklist items**: Each category has an "Add custom item" button to append agency-specific checklist items (labeled "custom", support Pass/Deficient/N/A + notes, deletable). **Corrective Action Plan Builder**: The Deficiencies tab now shows 4 summary count cards (Open/Unaddressed, In Progress, Resolved, Total) and each deficiency row has a collapsible "Corrective Action" panel with fields: Responsible Party, Target Date, Completion Date, Action Steps, and Status (open/in_progress/resolved). Actions are saved as upsert by (auditId, itemKey). Excel export includes a third "Corrective Actions" sheet with all fields. **PDF Export**: "Export PDF" button in the audit detail header uses jsPDF + jspdf-autotable for client-side PDF generation. Report includes a cover page (agency name, audit title, surveyor, date, period, status), a summary scorecard (compliance %, pass/fail/na tiles, progress bar, category breakdown table), full checklist pages grouped by category with color-coded status cells, and a deficiencies summary page highlighted in red with corrective action status. DB tables: `doh_audit_assessments`, `doh_audit_responses`, `doh_audit_documents`, `doh_audit_custom_items`, `doh_audit_corrective_actions`. API routes: `GET/POST /api/doh-audits`, `GET/PATCH/DELETE /api/doh-audits/:id`, `PUT /api/doh-audits/:id/responses`, `POST /api/doh-audits/:id/documents/upload`, `GET/DELETE /api/doh-audits/:id/documents/:docId`, `GET/POST /api/doh-audits/:id/custom-items`, `DELETE /api/doh-audits/:id/custom-items/:itemId`, `GET /api/doh-audits/:id/corrective-actions`, `PUT /api/doh-audits/:id/corrective-actions`, `DELETE /api/doh-audits/:id/corrective-actions/:actionId`. Accessible from: sidebar Clinical section (all admin/manager roles), sidebar Admin section, and office profile overview card.
    - **DOH Compliance Automation System** (8 modules under Clinical > DOH Compliance in sidebar):
      - **Survey Readiness Hub** (`/survey-readiness`): Flagship feature with automated gap analysis. Pulls live data from caregivers (expired clearances, training hours), clients (outdated care plans), incidents (overdue DOH reports), supervisory visits (overdue), and policy acknowledgments (missing). Displays a real-time % readiness score, 5 category breakdowns, and actionable deficit list. API: `GET /api/survey-readiness?officeId=`. DB: aggregates across multiple tables.
      - **Supervisory Visits** (`/supervisory-visits`): Full CRUD for caregiver supervision. List view by caregiver/date, create dialog (date/type/supervisor/topics/notes), overdue alerts, summary stats (visits this quarter, overdue count). DB table: `supervisory_visits`. API: `GET/POST /api/supervisory-visits`, `PUT /api/supervisory-visits/:id`.
      - **Policy & Procedure Management** (`/policy-management`): Create/track policy documents with version history, acknowledgment requests to staff, completion % per policy. DB tables: `policy_documents`, `policy_acknowledgments`. API: `GET/POST /api/policy-documents`, `PUT /api/policy-documents/:id`, `GET/POST /api/policy-acknowledgments`.
      - **QAPI Module** (`/qapi`): Quarterly QA meeting documentation. Auto-populates metrics from existing data (incident count, training completion %, complaint trend). Log meeting, attendees, action items. Historical accordion view. DB table: `qapi_meetings`. API: `GET/POST /api/qapi-meetings`, `PUT /api/qapi-meetings/:id`.
      - **Infection Control Log** (`/infection-control`): Log exposure/outbreak events, track containment actions, resolution status, public health notification flag. DB table: `infection_control_logs`. API: `GET/POST /api/infection-control-logs`, `PUT /api/infection-control-logs/:id`.
      - **Client Satisfaction Surveys** (`/client-satisfaction-surveys`): Create surveys, track responses and NPS-style scoring. DB tables: `client_satisfaction_surveys`, `client_survey_responses`. API: `GET/POST /api/client-satisfaction-surveys`, `GET/POST /api/client-survey-responses`.
      - **Client Emergency Plans** (embedded in `/clients/:id` → Emergency Plan tab): Structured form per client with primary/secondary emergency contacts, evacuation route, shelter-in-place instructions, medical conditions, medications, special equipment, DNR flag, power-dependent equipment flag, mobility assistance flag, utility company notified flag, last review date, next review due. DB table: `client_emergency_plans`. API: `GET/PUT /api/clients/:id/emergency-plan`.
      - **Enhanced CIR on Incidents** (`/incidents`): The incident create form now includes a CIR Classification section — Class I (death/serious injury, 24-hr DOH report) or Class II (less serious, 5-day report). DOH deadline auto-calculated from incident date/time. Each incident card shows CIR class badge, live DOH deadline countdown (overdue/urgent/warning), and "Mark DOH Submitted" button when pending. New schema fields: `cir_class`, `doh_report_due`, `doh_submitted_at`, `doh_submission_ref`, `doh_submission_status` on `incident_reports`.

### SaaS Multi-Tenancy (v3.0)
- **Organization-Based Multi-Tenancy**: Isolated data for each agency.
- **Subscription Plans**: Four tiers (Starter, Growth, Professional, Enterprise) based on client count with tiered feature access.
- **Feature Gating**: Backend middleware and frontend components to control access based on subscription plan.
- **Stripe Integration**: Checkout, subscription management, billing portal, and webhook activation.
- **Agency Signup Wizard**: Guided registration with plan selection.
- **External API**: For Professional+ plans, with API key management, rate limiting, and usage logging.
- **Support**: Integrated support tickets and a support center.

### Security & Compliance
- Designed for HIPAA compliance, ensuring secure data handling, access control, and audit logging.

## External Dependencies
### Database & Storage
- **Neon Database**: Serverless PostgreSQL.
- **Local File System**: For document storage (temporary, pending cloud integration).

### Communication Services
- **AgentMail**: For email notifications (e.g., password resets, birthdays).
- **Twilio**: For SMS services (e.g., mobile login, birthday notifications).

### Third-Party Libraries & Tools
- **Radix UI**: Accessible UI primitives.
- **Tailwind CSS**: Utility-first styling.
- **Zod**: Runtime type validation.
- **date-fns**: Date manipulation.
- **Lucide React**: Iconography.
- **TypeScript**: Type safety.
- **Vite & ESBuild**: Build processes.
- **Drizzle Kit**: Database schema management.