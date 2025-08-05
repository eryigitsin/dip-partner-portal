# Partner Management System

## Overview
This is a Turkish-English bilingual partner management system for DİP (Digital Export Platform). Its purpose is to connect businesses with service partners, enable partners to manage profiles and requests, and provide administrative tools for platform management. The vision is to be a central hub for B2B collaboration, facilitating digital exports through verified service partners.

## Recent Changes (August 2025)
- Auth page: Dynamic category counter implemented using real-time API data instead of static "16" 
- Comprehensive error fixing: Resolved 91 TypeScript and LSP diagnostic errors across 16 files
- Type safety improvements: Added proper type assertions and API response handling
- Code quality: Enhanced error handling and type consistency throughout the application
- Partner management enhancement: Users assigned to partners become partner managers with contact person updates
- Admin partner creation: Simplified "Yeni Partner" form with streamlined service and market entry fields
- Database schema: Added managedBy field to partners table for tracking partner managers

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, Vite build tool.
- **UI**: Radix UI components styled with shadcn/ui, Tailwind CSS.
- **Routing**: Wouter.
- **State Management**: TanStack Query (React Query) for server state.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: DİP branding, responsive design, image cropping, video optimization, accessibility via Radix UI.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Authentication**: Passport.js (local strategy, session-based, Google OAuth), password hashing with Node.js crypto (scrypt).
- **Session Storage**: PostgreSQL sessions with `connect-pg-simple`.
- **User Management**: Multi-role support (regular users, partners, master admins, editor admins).
- **Partner Management**: Application system with KVKK consent, 16 service categories, detailed profiles, quote request system.
- **Administrative Features**: Two-tier admin system for application review, partner management (enable/disable, statistics), user management, partner assignment system for managing partner accounts.
- **Service Catalog**: Searchable directory with filters, partner cards, DİP member benefits.
- **PDF Generation**: Direct PDF download for quotes using PDFKit (Turkish character support, professional templates).
- **Email Notifications**: Integration with Resend for transactional emails (quote responses, welcome, approval).
- **Supabase Integration**: Supabase Authentication for user account management, automated user creation during partner approval with password setup emails.
- **Storage**: Scalable cloud storage for file uploads (logos, covers, documents, avatars) via Supabase Storage.
- **Messaging**: Comprehensive real-time messaging system with WebSocket support, iMessage-style UI, auto-scroll, browser notifications, and LinkedIn-style chat popup.

### Database
- **Primary Database**: PostgreSQL with Neon serverless driver.
- **ORM**: Drizzle ORM.
- **Schema Management**: Drizzle Kit for migrations.
- **Connection**: Connection pooling with Neon serverless pool.

### System Features
- **Payment Dialog System**: Comprehensive payment dialog with three tabs (Credit/Debit Card, Wire Transfer/EFT, Other Methods).
- **Payment Instructions**: Partners can send bank details to users with email notifications.
- **Profile Photo Upload**: Comprehensive profile photo upload functionality with backend API support.
- **Secure Email Authentication Flows**: Proper password reset and email confirmation workflows.
- **Feedback Management**: Master admins can delete feedback.
- **Admin Service Management**: Modern service pool management system for adding/removing and creating services.
- **SEO Management**: Comprehensive SEO settings for meta tags, Open Graph, and Twitter Card.

## External Dependencies

- **React Ecosystem**: React 18, React DOM, Wouter.
- **UI Components**: Radix UI, shadcn/ui.
- **Styling**: Tailwind CSS, PostCSS.
- **Forms & Validation**: React Hook Form, Zod.
- **Database**: Neon PostgreSQL, Drizzle ORM.
- **Authentication**: Passport.js, Supabase Authentication.
- **Email Services**: Resend.
- **Cloud Storage**: Supabase Storage.
- **Analytics/Visualization**: Recharts.
- **Development Tools**: Vite, tsx, esbuild.
- **PDF Generation**: PDFKit.
- **Real-time Communication**: WebSockets.