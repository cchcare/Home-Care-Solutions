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