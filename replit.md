# Home Care Management System

## Overview
Home Care is a HIPAA-compliant agency management system for home care providers. It aims to streamline operations through client and caregiver management, compliance tracking, and automated scheduling. The system offers a secure, modern web interface with features like role-based access, AI-powered payroll, and multi-channel notifications. The project's vision is to enhance efficiency, ensure regulatory compliance, and support comprehensive agency management, with future plans for advanced analytics and SaaS multi-tenancy.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Core Technologies
-   **Frontend**: React with TypeScript, Wouter for routing, and TanStack Query for state management. UI/UX utilizes Shadcn/ui (Radix UI & Tailwind CSS) with dark mode support. Forms are managed with React Hook Form and Zod for validation.
-   **Backend**: Express.js provides RESTful APIs. Authentication is session-based with bcrypt, Express sessions (PostgreSQL-backed), rate limiting, and role-based access controls. Multer handles HIPAA-compliant file uploads.
-   **Database**: PostgreSQL on Neon, managed with Drizzle ORM and Drizzle Kit for migrations. The schema is designed for HIPAA compliance across all modules.

### Key Features
-   **Office & Client Management**: Includes profiles, license tracking, staff management, expense tracking, and office-based data filtering.
-   **Billing**: MCO-focused billing with automated due date calculation and status tracking.
-   **Caregiver Management**: Features enhanced profiles, HHAX ID integration, and compliance tracking for state-specific requirements.
-   **Caregiver Self-Service Portal**: A role-restricted web portal allowing caregivers to access their profiles, compliance items, documents, and support.
-   **Payroll**: AI-powered OCR for paystub uploads, biweekly payroll runs, Excel import for billing hours (with overtime), and Excel export of payroll data.
-   **Scheduling**: Master weekly templates for recurring client schedules and automated birthday notifications.
-   **Advanced Modules**:
    -   **Electronic Visit Verification (EVV)**: GPS-based clock-in/out with location tracking.
    -   **Care Plan & Medication Tracking**: Structured goals, interventions, medication lists, adherence logging, and vital signs.
    -   **Workflow Automation**: Incident follow-up, push notifications, real-time availability, and a 100-point shift matching algorithm.
    -   **Operational Tools**: Vehicle/mileage tracking, recruitment portal, background check workflow, and shift differentials.
    -   **Compliance & Analytics**: Time-off requests, automated eligibility verification, claims management, and advanced analytics dashboards.
    -   **Exclusion Verification System**: Automated monthly screening against OIG, PA Medicheck, and SAM.gov.
    -   **HHAeXchange (HHAX) Integration**: Automated SFTP-based data synchronization.
    -   **Visit Log Upload**: Bulk schedule/visit updates via Excel upload.
    -   **Letter & Email Template Management**: Admin UI for creating mail-merge letter templates and system-wide email templates with versioning and live previews.
    -   **Help Center Admin**: Super-admin UI for creating and managing dynamic help articles with rich-text editing and media embeds.
    -   **Staff Time Tracking (Enhanced)**: Strict clock-in/out system for office staff with GPS, IP, device logging, immutable audit trails, manager dashboards, and approval workflows.
    -   **DOH Audit Assessment Tool**: A per-office PA Department of Health survey readiness checklist tool with progress tracking, document uploads, custom checklist items, corrective action plan builder, and PDF/Excel export capabilities.
    -   **DOH Compliance Automation System**: Eight modules covering Survey Readiness Hub, Supervisory Visits, Policy & Procedure Management, QAPI Module, Infection Control Log, Client Satisfaction Surveys, Client Emergency Plans, and Enhanced Critical Incident Report (CIR) tracking with DOH deadline management. The Survey Readiness Hub provides clickable deep-links from every gap to the related caregiver/client/incident/policy, per-section search + sort, one-click email reminders to caregivers (rate-limited to one per caregiver per 24 hours across all gap types, logged in `survey_reminder_log`), and a printable/PDF-exportable readiness report at `/survey-readiness/print`.

### Security & Compliance
-   The system is designed for HIPAA compliance, ensuring secure data handling, access control, and audit logging.

### SaaS Multi-Tenancy
-   **Organization-Based Multi-Tenancy**: Isolated data for each agency.
-   **Subscription Plans**: Tiered plans based on client count with feature gating.
-   **Stripe Integration**: For checkout, subscription management, and billing.
-   **Agency Signup Wizard**: Guided registration with plan selection.
-   **External API**: For higher-tier plans, with API key management, rate limiting, and usage logging.
-   **Support**: Integrated support tickets and a support center.

## External Dependencies
### Database & Storage
-   **Neon Database**: Serverless PostgreSQL.
-   **Local File System**: Used for temporary document storage.

### Communication Services
-   **AgentMail**: For various email notifications.
-   **Twilio**: For SMS services.

### Third-Party Libraries & Tools
-   **Radix UI**: Accessible UI primitives.
-   **Tailwind CSS**: Utility-first styling framework.
-   **Zod**: Runtime type validation.
-   **date-fns**: Date manipulation library.
-   **Lucide React**: Iconography.
-   **TypeScript**: Programming language for type safety.
-   **Vite & ESBuild**: Build tools.
-   **Drizzle Kit**: Database schema management.
-   **Vitest**: Unit-test runner. Configured via `vitest.config.ts` (server-only, node environment). Run with `npm test` (or `bash scripts/run-tests.sh`). Suites live under `server/__tests__/*.test.ts`.