# Partner Management System

## Overview
This is a Turkish-English bilingual partner management system built for DİP (Digital Export Platform). The application enables businesses to find and connect with service partners, allows partners to manage their profiles and service requests, and provides comprehensive administration tools for platform management. The vision is to provide a central hub for businesses to find verified service partners across various categories, streamlining the process of B2B collaboration and fostering economic growth through digital exports.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom CSS variables
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form with Zod validation
- **UI/UX Decisions**: Incorporates DİP branding, responsive design for mobile and tablet, includes features like image cropping for uploads, and video optimization for hero sections. Accessibility is prioritized through Radix UI.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth, including Google OAuth integration. Password hashing uses Node.js crypto module with scrypt.
- **Session Storage**: PostgreSQL sessions with `connect-pg-simple`
- **User Management**: Supports multi-role users (regular users, partners, master admins, editor admins).
- **Partner Management**: Comprehensive application system with KVKK consent, 16 predefined service categories, detailed partner profiles, and a quote request system.
- **Administrative Features**: Two-tier admin system for application review, partner management (enable/disable, statistics), and user management.
- **Service Catalog**: Searchable directory with filters, partner cards, and DİP member benefits.
- **PDF Generation**: Direct PDF download system for quotes using PDFKit, with Turkish character encoding support and professional templates.
- **Email Notifications**: Integration with Resend email service for various transactional emails, including quote responses, welcome emails, and partner approval notifications.
- **Supabase Integration**: Supabase Authentication for user account management, automated user creation during partner approval with password setup emails.
- **Storage**: Scalable cloud storage for file uploads (logos, covers, documents, avatars) via Supabase Storage.

### Database
- **Primary Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Connection pooling with Neon serverless pool

## External Dependencies

- **React Ecosystem**: React 18, React DOM, Wouter
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS, PostCSS
- **Forms & Validation**: React Hook Form, Zod
- **Database**: Neon PostgreSQL, Drizzle ORM
- **Authentication**: Passport.js
- **Email Services**: Resend
- **Cloud Storage**: Supabase Storage
- **Analytics/Visualization**: Recharts (for CRM dashboard)
- **Development Tools**: Vite, tsx, esbuild

## Recent Changes: Latest modifications with dates

### January 31, 2025
- **Supabase Partner Account Creation**: Implemented automated Supabase user account creation when admin approves partner applications
- **Password Setup Email Workflow**: Partners now receive password setup emails via Supabase auth system instead of temporary passwords
- **Partner Approval Enhancement**: Enhanced partner approval process to create Supabase user accounts with proper metadata and redirect URLs
- **Email Template Updates**: Updated partner approval email template to guide users through account setup process
- **User Schema Enhancement**: Leveraged existing supabaseId field in users table to link local user records with Supabase authentication
- **Security Improvement**: Removed temporary password system in favor of secure Supabase password reset/setup flow
- **System Settings Save Buttons**: Replaced auto-save functionality with explicit save buttons for each settings tab (Platform, Security, Email, SMS, Media, SEO)
- **SEO Management**: Added comprehensive SEO settings tab with meta tags, Open Graph, and Twitter Card configuration
- **Browser Title Update**: Changed site title to "dip | iş ortakları platformu" with Turkish language attributes
- **Dynamic Meta Tags**: Implemented SeoHead component for dynamic meta tag management based on saved SEO settings
- **Favicon Integration**: Added DİP blue logo as site favicon for better brand recognition
- **Footer Legal Links**: Added Terms of Service and Privacy Policy links to footer section with proper external linking

### August 1, 2025
- **Feedback Management Enhancement**: Added comprehensive feedback deletion capability for master admins with confirmation dialogs
- **Partner Edit Form Simplification**: Removed email and password fields from partner editing dialog, moving these to dedicated User Management section for better security and organization
- **Admin Dashboard Feedback UI**: Enhanced feedback management with delete buttons (Trash2 icons) for both user and partner feedback sections
- **Database Feedback Operations**: Implemented DELETE /api/admin/feedback/:id endpoint with proper error handling and response formatting