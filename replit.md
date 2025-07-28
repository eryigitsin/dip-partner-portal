# Partner Management System

## Overview

This is a Turkish-English bilingual partner management system built for DİP (Digital Export Platform). The application enables businesses to find and connect with service partners, allows partners to manage their profiles and service requests, and provides comprehensive administration tools for platform management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL sessions with connect-pg-simple
- **Password Security**: Node.js crypto module with scrypt hashing

### Database Architecture
- **Primary Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Connection pooling with Neon serverless pool

## Key Components

### User Management System
- **Multi-role Support**: Regular users, partners, master admins, and editor admins
- **Authentication Methods**: Email/password and Google OAuth integration
- **Profile Management**: Extended user profiles with company information and LinkedIn integration
- **Language Support**: Turkish and English interface switching

### Partner Management
- **Partner Applications**: Comprehensive application system with KVKK consent
- **Service Categories**: 16 predefined service categories (Market Analysis, Customs, Logistics, etc.)
- **Partner Profiles**: Detailed company profiles with logos, descriptions, and service offerings
- **Quote Request System**: Direct communication channel between users and partners

### Administrative Features
- **Two-tier Admin System**: Master admins with full access, editor admins with limited permissions
- **Application Review**: Approval workflow for partner applications
- **Partner Management**: Enable/disable partners, view statistics
- **User Management**: Monitor user activity and manage accounts

### Service Catalog
- **Searchable Directory**: Filter partners by category and search terms
- **Partner Cards**: Visual representation of partner services with action buttons
- **DİP Member Benefits**: Special pricing and advantages for platform members

## Data Flow

### User Registration/Authentication Flow
1. User submits registration form or authenticates via Google
2. Server validates credentials and creates user record
3. Session established with PostgreSQL session store
4. Client receives user data and authentication status

### Partner Application Flow
1. User submits partner application with company details
2. Application stored in database with pending status
3. Admin reviews application in admin dashboard
4. Upon approval, partner account is activated
5. Partner gains access to dashboard and profile management

### Quote Request Flow
1. User browses partner catalog and selects a partner
2. Quote request form submitted with project details
3. Request stored in database and linked to partner
4. Partner views request in their dashboard
5. Partner can respond directly to the user

### Content Management Flow
1. Service categories initialized on app startup
2. Partners self-manage their profiles and service descriptions
3. Admins monitor activity and can modify partner status
4. Real-time updates through React Query cache invalidation

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Router (Wouter)
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with PostCSS processing
- **Forms & Validation**: React Hook Form with Zod schemas

### Backend Dependencies
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session management
- **Email Services**: SendGrid for transactional emails
- **Development Tools**: tsx for TypeScript execution, esbuild for production builds

### Development Infrastructure
- **Build Tools**: Vite with React plugin and Replit integration
- **Type Safety**: TypeScript with strict configuration
- **Code Quality**: Shared schema validation between client and server

## Deployment Strategy

### Development Environment
- **Hot Module Replacement**: Vite development server with HMR
- **Type Checking**: Real-time TypeScript compilation
- **Database**: Local development with environment-based connection strings

### Production Build Process
1. **Frontend Build**: Vite builds optimized React application to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database Setup**: Drizzle migrations applied via `db:push` command
4. **Asset Serving**: Express serves static files from build directory

### Environment Configuration
- **Database**: PostgreSQL connection via `DATABASE_URL` environment variable
- **Sessions**: Configurable session secret and security settings
- **Email**: SendGrid API key for email functionality
- **Google OAuth**: Client ID and secret for social authentication

### Scalability Considerations
- **Database**: Neon serverless PostgreSQL for automatic scaling
- **Sessions**: PostgreSQL-backed sessions for multi-instance deployment
- **Static Assets**: Optimized builds with code splitting and lazy loading
- **API**: RESTful endpoints designed for horizontal scaling

## Recent Changes: Latest modifications with dates

### January 28, 2025
- **Supabase Storage Migration**: Migrated all file uploads from local storage to Supabase Storage for scalable cloud storage
- **Storage Buckets**: Created 4 dedicated storage buckets (partner-logos, partner-covers, partner-documents, user-avatars)
- **Server-side Storage Service**: Implemented comprehensive SupabaseStorageService with automatic bucket creation and file management
- **Client-side Storage Utility**: Created ClientSupabaseStorage for frontend file upload operations
- **Memory Storage Configuration**: Updated multer configuration to use memory storage instead of disk storage for better integration
- **File Upload API Updates**: Modified partner profile and application endpoints to use Supabase Storage URLs instead of local paths
- **Document Download Enhancement**: Updated document download endpoint to handle both Supabase URLs and legacy local files
- **Authentication Bug Fix**: Fixed logout functionality to properly clear both Supabase and backend sessions, preventing automatic re-login
- **Session Management**: Enhanced logout process with complete session destruction and cache clearing

### January 26, 2025
- **Mobile Responsive Enhancements**: Fixed tablet tab layout issues with flex-wrap design for proper mobile stacking
- **Header Top Bar**: Enhanced with Font Awesome-style icons (MapPin, Mail, Phone) and clickable phone functionality  
- **Auth Page Visual Improvements**: Added DIP logo integration and background image optimization with workshop scene
- **KVKK Compliance**: Implemented pop-up dialog for KVKK terms with proper dismiss functionality
- **Layout Improvements**: Updated breakpoints for better responsive behavior across all device sizes
- **Email Notification System**: Implemented comprehensive SendGrid integration for 6 notification scenarios
- **Partner Application Processing**: Successfully tested partner application creation with database storage
- **Application Status Tracking**: Created application-status page for users to track partner application progress
- **Contact Integration**: Added clickable mailto:info@dip.tc and tel:+908503071245 functionality
- **Email Templates**: Designed HTML email templates with branded styling and action buttons
- **API Endpoints**: Added quote request/response, payment completion, and approval notification endpoints
- **Partner Profile Enhancements**: Added "İletişim Kişisi" display in company information section
- **Experience Icon**: Updated sector experience display with custom icon and "yıl" suffix
- **Partner Panel Authentication**: Created login credentials for Markaşef partner (mutfak@markasef.com, password: dip2025ms)
- **Admin Partner Management**: Implemented comprehensive partner editing system with role-based permissions
- **Master Admin Features**: Full partner data editing including email and password management
- **Editor Admin Features**: Partner data editing excluding password and membership email restrictions
- **Message System Restrictions**: Admin users (master/editor) cannot see message buttons on partner profiles - messaging only between regular users and partners
- **Master Admin Dropdown Menu**: Created comprehensive dropdown menu system replacing simple admin button with four key sections
- **User Management System**: Implemented full user management with tabs for Users/Partners/Editors, role assignment capabilities, and new user/partner creation with automated welcome emails
- **Statistics Dashboard**: Developed comprehensive CRM analytics dashboard with user engagement tracking, partner performance metrics, and editor activity monitoring using Recharts visualization
- **System Status Page**: Created detailed system monitoring page with real-time metrics, performance graphs, incident tracking, and error log monitoring
- **Backend Admin API**: Added complete admin API endpoints for user management, partner creation, role assignment, and comprehensive data retrieval with proper authentication and authorization
- **Email Subscription Management System**: Implemented comprehensive email subscription system with user preferences, unsubscribe functionality, and admin subscriber management
- **E-Posta Bildirim Tercihi**: Created user preference page allowing control over marketing emails, partner updates, platform updates, and weekly digest options
- **E-Posta Aboneleri Admin Panel**: Developed admin interface for viewing active/inactive email subscribers with CSV export functionality
- **Unsubscribe System**: Added public unsubscribe link functionality (https://partner.dip.tc/unsubscribe?email=...) with branded confirmation page
- **Database Schema Updates**: Added emailSubscribers and userEmailPreferences tables with proper relations and storage methods
- **Email Template Integration**: Updated all email templates to include proper unsubscribe links and support for subscription management