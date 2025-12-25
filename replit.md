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