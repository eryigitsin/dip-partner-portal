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

### August 5, 2025
- **CRITICAL Email Template Parameter Bug Fix**: Resolved issue where partner name appeared as "undefined" in quote approval email notifications sent to users. The problem was caused by incorrect parameter order in email template function calls in routes.ts - was passing user.email instead of user's full name for both toUser and toPartner email templates. Fixed all instances to use `${user.firstName} ${user.lastName}` format for proper name display in all quote status email notifications (approved/rejected).
- **Authentication Domain Issues Resolution**: Fixed critical domain configuration problems affecting all Supabase auth flows including magic links, password reset, and email confirmation
  - **Magic Link Fix**: Corrected redirect URL from hardcoded `partner.dip.tc` to dynamic `window.location.origin/auth` for proper domain handling
  - **Password Reset Enhancement**: Added proper password reset endpoint in server/routes/auth.ts with correct domain redirect URLs, fixed expired link detection
  - **Email Confirmation Fix**: Updated signup emailRedirectTo URL to use current domain instead of hardcoded partner.dip.tc
  - **Expired Link Handling**: Implemented "Bu bağlantının geçerlilik süresi doldu!" message display when users click expired auth links
  - **Auth Flow Debugging**: Enhanced console logging throughout auth system to track Supabase events and URL parameters for better troubleshooting
- **COMPLETE Messaging System Overhaul**: Implemented comprehensive real-time messaging system with WebSocket support, replacing hardcoded user authentication issues and fixing all duplicate API endpoints
  - **WebSocket Integration**: Added real-time messaging with proper WebSocket server on `/ws` path, user authentication, and connection management
  - **iMessage-Style UI**: Redesigned conversation interface with modern bubble design, proper message alignment, rounded corners, and shadow effects
  - **10-Minute Notification System**: Implemented automatic response reminders that trigger browser notifications when users don't respond within 10 minutes
  - **Dynamic Authentication**: Removed all hardcoded userId=6 references, now uses proper useAuth hook integration throughout messaging system
  - **API Cleanup**: Eliminated duplicate message endpoints in routes.ts, standardized parameter naming (content vs message), and fixed parameter mismatches
  - **Auto-scroll**: Added automatic scrolling to latest messages for better user experience
  - **Browser Notifications**: Integrated notification permission requests and real-time desktop notifications for new messages
  - **Real-time Updates**: Messages refresh automatically via WebSocket without page reloads, with proper React Query cache invalidation
- **LinkedIn-Style Chat Popup**: Replaced full-page messaging interface with modern popup-style chat in bottom-right corner to solve footer overlap issues
  - **Popup Chat Interface**: Created ChatPopup.tsx component that opens from floating button in bottom-right corner, similar to LinkedIn messaging
  - **Conversation Management**: Integrated conversation list with partner selection for new chats within compact popup interface
  - **Minimizable Design**: Added minimize/maximize functionality with chevron controls for better user experience
  - **Footer Overlap Resolution**: Eliminated footer overlap issues by moving chat interface to fixed-position popup overlay
  - **Real-time Socket Integration**: Maintained all Socket.IO real-time messaging functionality within new popup interface
  - **Notification Integration**: Preserved desktop notification system for new messages when popup is closed or minimized
  - **Responsive Design**: Optimized popup size (396px width, 500px height) for desktop use with proper mobile considerations
- **Profile Photo Upload System**: Implemented comprehensive profile photo upload functionality with proper error handling
  - **Object Storage Integration**: Added missing `/api/objects/upload` endpoint for profile photo uploads with authentication
  - **Upload Error Fix**: Resolved "Unexpected end of JSON input" error by improving response handling in profile photo upload workflow
  - **User Identification Enhancement**: Updated chat interfaces to display actual user names and profile photos instead of generic "Partner" labels
  - **Backend API Support**: Added profile image storage endpoints with proper object storage integration
- **Partner UI Restrictions**: Enhanced user experience by customizing interface based on user roles
  - **New Conversation Button Removal**: Hidden "Yeni Konuşma Başlat" button for partner users in both chat page and ChatPopup component
  - **Role-Based UI**: Implemented `user.userType !== 'partner'` checks to prevent partners from initiating new conversations
  - **Consistent Experience**: Applied restrictions across all messaging interfaces for proper workflow management
- **Secure Email Authentication Flows**: Implemented proper password reset and email confirmation workflows with enhanced security
  - **Password Reset Flow**: Created dedicated password-reset.tsx page that requires users to set new password instead of auto-login from email links
  - **Email Confirmation Flow**: Added email-confirmed.tsx page that shows confirmation message and requires re-login after email verification
  - **Authentication Redirects**: Enhanced Supabase auth event handling to properly redirect users to appropriate pages based on authentication type
  - **Email Link Security**: Updated all email templates to redirect to /auth with proper redirect parameters for dashboard and panel links
  - **Protected Route Enhancement**: Improved protected route logic to include redirect parameters for seamless post-login navigation

### August 4, 2025
- **Complete Payment Dialog System**: Implemented comprehensive payment dialog with three tabs (Kredi/Banka Kartı, Havale/EFT, Diğer Yöntemler) accessible from multiple "Ödeme Yap" buttons throughout the interface
- **Payment Instructions Integration**: Added full payment instructions functionality allowing partners to send bank details to users with professional email notifications including bank account information, payment amounts, and custom instructions
- **Consistent Payment Flow**: Unified payment button behavior so both the blue summary box "Ödeme Yap" button and the "Teklifi Gör" dialog "Ödeme Yap" button open the same payment modal for consistent user experience
- **Backend Payment API**: Implemented `/api/partner/send-payment-instructions` endpoint with proper error handling, user validation, and integration with ResendService for email notifications
- **Recipient Accounts Cache Fix**: Fixed critical issue where new recipient accounts weren't displaying after successful creation due to incorrect React Query cache invalidation
- **API URL Structure Correction**: Corrected the recipient accounts API query URL structure from `/api/partner/recipient-accounts/{partnerId}` to `/api/partner/recipient-accounts` to match server endpoint expectations
- **Query Key Optimization**: Updated all recipient accounts mutations to use consistent query keys for proper cache invalidation without partnerId parameter
- **Cache Invalidation Enhancement**: Added explicit `refetchQueries` calls alongside `invalidateQueries` to ensure immediate UI updates after mutations
- **Partner Payment UI Enhancement**: Updated partner dashboard payment instructions interface with "Havale / EFT Bilgisi Gönder" button text and added "+ Yeni Hesap Ekle" dropdown option for seamless manual account entry
- **Payment Update Notifications**: Implemented update email notifications with subject "Havale / EFT ödeme bilgileri güncellendi!" when partners resend payment instructions for existing quotes
- **Account Storage Optimization**: Modified new account creation to store only bank name as account name for cleaner recipient account management
- **CRITICAL Currency Display Bug Fix**: Resolved issue where quote amounts displayed incorrectly (18000 TL showing as 180 TL) by fixing currency conversion in both quote creation form (quote-response-dialog.tsx) and quote display view (service-requests.tsx)
- **Server Error Resolution**: Fixed 18 LSP errors in routes.ts that were blocking email notifications and other critical functionality
- **Currency System Standardization**: Ensured consistent cents-based storage across all payment components with proper display formatting throughout the application

### August 1, 2025
- **Feedback Management Enhancement**: Added comprehensive feedback deletion capability for master admins with confirmation dialogs
- **Partner Edit Form Simplification**: Removed email and password fields from partner editing dialog, moving these to dedicated User Management section for better security and organization
- **Admin Dashboard Feedback UI**: Enhanced feedback management with delete buttons (Trash2 icons) for both user and partner feedback sections
- **Database Feedback Operations**: Implemented DELETE /api/admin/feedback/:id endpoint with proper error handling and response formatting
- **Service Management Integration**: Replaced legacy textarea service field in admin partner editing with modern service pool management system
- **Admin Service Management Component**: Created AdminServiceManagement component with service addition/removal, new service creation, and search functionality
- **Partner Contact Person Field**: Added contactPerson field to admin partner editing form for better contact management