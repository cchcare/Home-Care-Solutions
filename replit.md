# replit.md

## Overview

Home Care is a comprehensive HIPAA-compliant home care agency management system built with React, TypeScript, Express, and PostgreSQL. The application streamlines operations for home care agencies by providing tools for client management, caregiver coordination, compliance tracking, document management, and regulatory oversight. It features a modern web interface with secure authentication, role-based access control, and robust data storage capabilities designed specifically for healthcare environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Single-page application using functional components and hooks
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS styling
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Build Tool**: Vite for development and production builds with hot module replacement

### Backend Architecture
- **Express.js Server**: RESTful API with middleware for logging, error handling, and request parsing
- **Authentication**: OpenID Connect (OIDC) integration with Replit authentication using Passport.js
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **File Handling**: Multer middleware for secure HIPAA-compliant file uploads with type validation
- **API Structure**: Modular route organization with centralized error handling

### Database Design
- **PostgreSQL**: Primary database with connection pooling via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema**: Comprehensive relational design including users, clients, caregivers, care plans, progress notes, documents, incident reports, tasks, messages, certifications, compliance items, audit logs, office licenses, office staff, and office expenses
- **Data Relationships**: Well-defined foreign key relationships supporting complex healthcare workflows
- **Migration System**: Drizzle Kit for database schema versioning and deployment

### Office Management
- **Office Profile Page**: Detailed view at /offices/:id with submenu navigation
- **License Tracking**: Track health licenses with license number, issued date, expiration date, renewal history
- **Staff Management**: Assign users to offices with position, department, and start date tracking
- **Expense Tracking**: Record and track office expenses with type, vendor, amount, and payment status
- **Office-Based Filtering**: All modules filter data by selected office:
  - Dashboard metrics, clients, tasks, documents, messages, and monthly stats
  - Incident reports, trainings, billing records, and payroll runs
  - When "All Offices" is selected, shows data from all offices
  - When a specific office is selected, shows only that office's data
  - OfficeSelector component available on all relevant pages

### Billing System
- **MCO-Focused Billing**: Simplified billing records focused on MCO (Managed Care Organization) payments
- **Fields**: MCO, Service Start/End Date, Service Code, Hours, Rate, Total Amount, Bill Date
- **Auto Due Date Calculation**: Due dates calculated automatically based on MCO:
  - UPMC: 7 days from bill date
  - PA Health and Wellness: 14 days from bill date
  - Amerihealth: 24 days from bill date
  - Other MCOs: 14 days default
- **Status Tracking**: Pending, Invoiced, Paid status workflow

### Caregiver Management
- **Enhanced Profile Fields**: Caregivers have separate firstName, middleName, lastName fields directly on caregiver record
- **Address Fields**: Full address with address, address2, city, state, zipCode, and county
- **HHAX ID**: HHAX caregiver code for integration with external systems
- **Automatic MCO Assignment**: When a caregiver is assigned to a client, the caregiver's MCO is automatically set from the client's active MCO
  - MCO displayed on profile as read-only (auto-assigned from client)
  - Only the first client with an active MCO is used for assignment

### Payroll Management
- **Bulk Paystub Upload**: AI-powered feature to upload PDF files containing multiple paystubs
  - Extracts employee name, pay period, hours, gross/net pay, and deductions using OCR
  - Automatically matches extracted names to existing caregivers in the selected office
  - Creates paycheck records for matched employees
  - Displays detailed results showing matched, unmatched, and non-paystub pages
  - Role-based access: admin, super_admin, and supervisor roles only
- **Payroll Runs**: Create and manage biweekly payroll cycles
- **Paycheck Records**: Track individual caregiver paychecks with hours, deductions, and net pay
- **Billing Hours Import**: Import billing hours from Excel spreadsheet (.xlsx)
  - Matches by Client HHAX ID and Caregiver Assignment ID
  - Tracks hours by entry date and determines week 1 or week 2 within pay period
  - Shows detailed import results with matched/unmatched/error counts
- **Overtime Calculation**: Automatically calculates regular vs overtime hours
  - 40+ hours per week = overtime
  - Tracks Week 1 and Week 2 regular/OT hours separately
  - Sums both weeks for total regular and total OT
- **Payroll Hours Export**: Export payroll hours to Excel with:
  - ADP Code, Caregiver Name, Pay Period dates
  - Week 1 Regular, Week 1 OT, Week 2 Regular, Week 2 OT
  - Total Regular Hours, Total Overtime Hours

### Master Week Templates
- **Weekly Schedule Templates**: Define recurring weekly schedules for clients
- **Columnar Day-Based Layout**: Visual 7-day layout (Sunday through Saturday) for scheduling
- **Per-Day Configuration**: Each day has configurable fields:
  - Schedule Type (Daily Fixed, etc.)
  - Hours (Start/End time with auto-calculated duration)
  - Service Provider (Caregiver dropdown)
  - Service Provider Name (auto-populated from caregiver)
  - Assignment ID, Pay Code, POC, Primary Bill To
  - Service Code, Budget Number, Rate Type, Hourly Rate
  - Include in Mileage checkbox
- **Template Settings**: From Date (required), To Date (optional), Recurrence (Every N weeks)
- **Apply to Calendar**: Generate client schedules from master week template for specific weeks
- **API Routes**: 
  - GET/POST /api/clients/:clientId/master-week-templates
  - PUT/DELETE /api/master-week-templates/:id
  - POST /api/master-week-templates/:id/apply (apply to calendar)
  - GET/POST/PUT/DELETE /api/master-week-slots

### Authentication & Authorization
- **OIDC Integration**: Secure authentication flow with Replit's identity provider
- **Role-Based Access**: Multiple user roles (admin, supervisor, caregiver, family) with appropriate permissions
- **Session Security**: HTTP-only cookies with secure flags and configurable TTL
- **HIPAA Compliance**: Secure session storage and user data protection mechanisms

### File Management
- **Secure Upload**: Multi-part form uploads with file type validation and size limits
- **Storage Strategy**: Local file system with organized directory structure
- **Document Types**: Support for various healthcare documents (insurance cards, IDs, physician orders, care plans)
- **Access Control**: File access tied to user permissions and client relationships

### UI/UX Design
- **Design System**: Consistent component library with CSS custom properties for theming
- **Responsive Design**: Mobile-first approach with adaptive layouts using Tailwind breakpoints
- **Accessibility**: ARIA-compliant components from Radix UI ensuring keyboard navigation and screen reader support
- **Dark Mode**: Theme switching capability built into the design system

## External Dependencies

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling and WebSocket support
- **File System**: Local storage for document uploads with plans for cloud storage integration

### Authentication Services
- **Replit Authentication**: OIDC provider integration for user identity management
- **Session Storage**: PostgreSQL-backed session persistence for scalability

### Third-Party Libraries
- **UI Components**: Radix UI primitives for accessible, unstyled components
- **Styling**: Tailwind CSS for utility-first styling with custom design tokens
- **Form Validation**: Zod for runtime type validation and schema definition
- **Date Handling**: date-fns for date manipulation and formatting
- **Icons**: Lucide React for consistent iconography

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **Vite**: Modern build tooling with plugin ecosystem
- **ESBuild**: Fast JavaScript bundling for production builds
- **Drizzle Kit**: Database migration and introspection tools

### Compliance & Security
- **HIPAA Requirements**: Built-in considerations for healthcare data protection
- **File Type Validation**: Restricted uploads to approved healthcare document formats
- **Audit Logging**: Comprehensive activity tracking for compliance reporting
- **Data Encryption**: Secure transmission and storage of sensitive healthcare information