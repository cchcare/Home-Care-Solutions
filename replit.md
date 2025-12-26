# replit.md

## Overview

Home Care is a HIPAA-compliant home care agency management system built with React, TypeScript, Express, and PostgreSQL. It streamlines agency operations by providing tools for client management, caregiver coordination, compliance tracking, document management, and regulatory oversight. The system features a modern web interface with secure authentication, role-based access control, and robust data storage, designed specifically for healthcare environments. Key capabilities include office management, MCO-focused billing, comprehensive caregiver compliance and payroll management (including AI-powered paystub uploads), master weekly scheduling templates, and multi-channel birthday notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Technology Stack**: React with TypeScript, Wouter for routing, TanStack Query for state management.
- **UI/UX**: Shadcn/ui components based on Radix UI and Tailwind CSS for a consistent, accessible, and responsive design with dark mode support.
- **Forms**: React Hook Form with Zod validation.
- **Build**: Vite for development and production.

### Backend
- **Technology Stack**: Express.js for RESTful API services.
- **Authentication**: Local session-based authentication with bcrypt hashing, Express sessions (PostgreSQL-backed), rate limiting, and role-based access control. Features include self-service and admin-initiated password resets, and mobile SMS login via Twilio.
- **File Handling**: Multer middleware for secure, HIPAA-compliant file uploads with type validation.
- **API Structure**: Modular and organized, with centralized error handling.

### Database
- **Technology**: PostgreSQL hosted on Neon, managed with Drizzle ORM and Drizzle Kit for migrations.
- **Schema**: Comprehensive relational design for managing users, clients, caregivers, care plans, documents, compliance, billing, payroll, and office-specific data, ensuring HIPAA compliance.

### Key Features
- **Office Management**: Detailed office profiles, license tracking, staff management, expense tracking, and office-based data filtering across all modules.
- **Billing System**: MCO-focused billing records with automatic due date calculation based on MCO, and status tracking (Pending, Invoiced, Paid).
- **Caregiver Management**: Enhanced profiles, HHAX ID integration, automatic MCO assignment from clients.
- **Caregiver Compliance**: Tracking for PA State Form -9, background checks (FBI, PA State, Child Abuse, Adult Protective), and medical requirements (TB Test, Physical, Drug Test, Vaccines) with expiration and result tracking.
- **Payroll Management**:
    - **Bulk Paystub Upload**: AI-powered OCR for extracting data from PDF paystubs, matching to caregivers, and creating paycheck records.
    - **Payroll Runs**: Management of biweekly payroll cycles.
    - **Billing Hours Import**: Excel import of billing hours, matching by client/caregiver IDs, with overtime calculation (40+ hours/week).
    - **Payroll Hours Export**: Export to Excel including ADP codes, regular, and overtime hours.
- **Master Week Templates**: Define recurring weekly client schedules with detailed per-day configuration and ability to apply templates to calendars.
- **Birthday Notifications**: Automated SMS/email birthday greetings to clients and caregivers via daily cron job, with admin dashboard for tracking and manual sending.

### Advanced Features (v2.0)
- **EVV (Electronic Visit Verification)**: GPS-based clock-in/out with location tracking, 150m compliance threshold, mobile-friendly interface at /evv-clock.
- **Care Plan Management**: Structured goals with priority/status tracking, interventions with frequency and assignment, progress notes.
- **Medication Tracking**: Complete medication lists with dosage/frequency/route, adherence logging (taken/skipped/refused), refill reminders.
- **Vital Signs Logging**: Blood pressure, heart rate, temperature, respiratory rate, oxygen saturation, weight, blood sugar, pain level with trends API for charts.
- **Incident Follow-up Workflow**: Action items with assignees, due dates, priorities, completion tracking, overdue alerts.
- **Push Notifications**: Template-based SMS/email notifications, queue system with retry logic, schedule change and reminder notifications.
- **Real-time Availability Tracking**: Weekly recurring patterns, date-specific exceptions (vacation/sick/personal/training), available caregiver finder.
- **Shift Matching Algorithm**: 100-point scoring system (availability 30pts, skills 25pts, no conflicts 20pts, client preference 15pts, distance 10pts).
- **Vehicle/Mileage Tracking**: Travel expense logging with IRS reimbursement rate ($0.67/mile), approval workflow, totals by caregiver.
- **Recruitment Portal**: Applicant tracking with pipeline stages (new → screening → interview → background check → offer → hired), interview scheduling, notes.
- **Background Check Workflow**: FBI/State/Child Abuse/Adult Protective/Sex Offender/OIG checks, status tracking, expiration alerts, bulk creation.
- **Shift Differentials**: Weekend/holiday/overtime/evening/night premiums, multiplier or flat bonus, holiday calendar with recurring dates.
- **Performance Reviews**: Annual/quarterly/probationary reviews, 8 weighted metric categories, acknowledgment workflow, upcoming reviews dashboard.
- **Time-off Requests**: PTO/vacation/sick/personal/bereavement/FMLA/jury duty, approval workflow, PTO balance tracking with accrual/carryover.
- **Automated Eligibility Verification**: Medicaid/Medicare/MCO status checks, scheduled verification, coverage details tracking.
- **Claims Management**: Electronic claims with line items, submission/void/resubmit workflow, aging reports (30/60/90 days), denial tracking.
- **Advanced Analytics Dashboard**: Operational/financial/compliance/staffing KPIs, monthly trends, linear regression forecasting.
- **Client Satisfaction Surveys**: Customizable templates, public access tokens for email links, automatic expiration, satisfaction statistics.
- **Referral Source Tracking**: Physician/hospital/insurance/family/advertising sources, conversion tracking, top performer rankings.
- **Exclusion Verification System**: Comprehensive caregiver screening against federal and state exclusion databases:
    - **Data Sources**: OIG (auto-fetched CSV), PA Medicheck (manual CSV upload), SAM.gov (manual CSV upload).
    - **Matching Engine**: Exact name matching plus fuzzy matching using Levenshtein distance (80%+ threshold).
    - **Monthly Automation**: Cron job runs on 1st of each month at 2 AM to refresh sources and check all caregivers.
    - **Admin Dashboard**: 5-tab interface (Overview, Data Sources, Pending Reviews, False Positives, Reports).
    - **Caregiver Profile Integration**: Exclusion status displayed in caregiver profile "Exclusion Check" tab.
    - **False Positive Management**: Mark matches as false positives to suppress in future checks.
    - **Monthly Reports**: Generate compliance reports with caregiver counts and match statistics.
    - **Security**: All endpoints require admin/supervisor/super_admin role.
- **HHAeXchange (HHAX) Integration**: Automated SFTP-based data synchronization with HHAeXchange including:
    - **SFTP Connection**: Secure file transfer using credentials stored as Replit secrets (host, port, username, password).
    - **Data Import**: Import caregivers, clients, and schedules from CSV files in HHAX Outbox folder.
    - **Branch to Office Mapping**: Map HHAX Branch names (e.g., "Pittsburgh") to local office IDs (e.g., "Care Crafter Pittsburgh"). HHAX uses "Branch" field in exports which corresponds to "Office" in this system.
    - **Sync Logging**: Track import history with detailed sync logs (records synced, errors, timestamps).
    - **Manual & Full Sync**: Options for importing individual data types or all at once.
    - **File Browser**: View available files in HHAX SFTP Outbox directory.

### Security & Compliance
- HIPAA compliance is a core design principle, including secure data transmission, storage, access control, and audit logging.

## External Dependencies

### Database & Storage
- **Neon Database**: Serverless PostgreSQL.
- **Local File System**: For document storage (future cloud integration planned).

### Communication Services
- **SendGrid**: For email notifications, including password resets.
- **Twilio**: For SMS services, including mobile SMS login and birthday notifications.

### Third-Party Libraries & Tools
- **Radix UI**: For accessible UI primitives.
- **Tailwind CSS**: For utility-first styling.
- **Zod**: For runtime type validation.
- **date-fns**: For date manipulation.
- **Lucide React**: For iconography.
- **TypeScript**: For type safety.
- **Vite & ESBuild**: For modern build processes.
- **Drizzle Kit**: For database schema management.