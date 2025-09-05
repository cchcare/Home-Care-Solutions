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
- **Schema**: Comprehensive relational design including users, clients, caregivers, care plans, progress notes, documents, incident reports, tasks, messages, certifications, compliance items, and audit logs
- **Data Relationships**: Well-defined foreign key relationships supporting complex healthcare workflows
- **Migration System**: Drizzle Kit for database schema versioning and deployment

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