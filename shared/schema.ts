import { pgTable, text, serial, integer, boolean, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table - supports regular users, partners, and admins
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"), // Optional for Google Auth users
  googleId: text("google_id"),
  supabaseId: text("supabase_id").unique(), // Supabase Auth user ID
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  userType: text("user_type").notNull().default("user"), // user, partner, master_admin, editor_admin
  availableUserTypes: text("available_user_types").array().default(["user"]), // Available user types for this user
  activeUserType: text("active_user_type").notNull().default("user"), // Currently active user type
  isVerified: boolean("is_verified").default(false), // Email verification status
  language: text("language").default("tr"), // tr, en
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User profiles for additional info
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  company: text("company"),
  title: text("title"),
  sector: text("sector"),
  website: text("website"),
  isDipMember: boolean("is_dip_member").default(false),
  wantsToBecomeMember: text("wants_to_become_member"), // yes, no, maybe_later
  profileImage: text("profile_image"),
  linkedinProfile: text("linkedin_profile"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partners table
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyName: text("company_name").notNull(),
  logo: text("logo"),
  coverImage: text("cover_image"),
  description: text("description"),
  shortDescription: text("short_description"),
  businessType: text("business_type"),
  serviceCategory: text("service_category").notNull(),
  services: text("services").notNull(),
  dipAdvantages: text("dip_advantages"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  companyAddress: text("company_address"),
  companySize: text("company_size"),
  foundingYear: text("founding_year"),
  sectorExperience: text("sector_experience"),
  targetMarkets: text("target_markets"),
  contactPerson: text("contact_person"),
  managedBy: integer("managed_by").references(() => users.id), // Partner yöneticisi
  website: text("website"),
  linkedinProfile: text("linkedin_profile"),
  twitterProfile: text("twitter_profile"),
  instagramProfile: text("instagram_profile"),
  facebookProfile: text("facebook_profile"),
  socialMedia: jsonb("social_media"), // {linkedin, twitter, facebook, instagram}
  isApproved: boolean("is_approved").default(false),
  isActive: boolean("is_active").default(true),
  isVisible: boolean("is_visible").default(true), // Partner visibility in catalog and search
  followersCount: integer("followers_count").default(0),
  profileViews: integer("profile_views").default(0),
  username: text("username").unique(),
  usernameChanged: boolean("username_changed").default(false), // Track if username has been changed once
  // Monthly targets set by admin
  targetProfileViews: integer("target_profile_views").default(1000),
  targetNewFollowers: integer("target_new_followers").default(50),
  targetCompletedProjects: integer("target_completed_projects").default(10),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Services table - reusable service definitions
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partner selected services - many-to-many relationship between partners and services
export const partnerSelectedServices = pgTable("partner_selected_services", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Partner offered services - junction table for partners and their offered services
export const partnerOfferedServices = pgTable("partner_offered_services", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  customDescription: text("custom_description"), // Partner-specific service description
  price: text("price"), // Optional pricing info
  deliveryTime: text("delivery_time"), // Optional delivery time
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partner services - legacy (for backward compatibility)
export const partnerServices = pgTable("partner_services", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: text("price"),
  currency: text("currency").default("TRY"),
  isVisible: boolean("is_visible").default(true),
  isPriceVisible: boolean("is_price_visible").default(true),
  serviceType: text("service_type").default("service"), // service, package
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Markets/Regions pool for target markets
export const markets = pgTable("markets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  region: text("region"), // Europe, Asia, Americas, Africa, etc.
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partner selected markets - many-to-many relationship between partners and target markets
export const partnerSelectedMarkets = pgTable("partner_selected_markets", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Partner posts
export const partnerPosts = pgTable("partner_posts", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  title: text("title"),
  content: text("content").notNull(),
  type: text("type").default("text"), // text, image, video
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  isPublished: boolean("is_published").default(true),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service categories
export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});



// Quote requests
export const quoteRequests = pgTable("quote_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  companyName: text("company_name").notNull(),
  serviceNeeded: text("service_needed").notNull(),
  budget: text("budget"),
  message: text("message"),
  projectDate: timestamp("project_date"),
  status: text("status").default("pending"), // pending, under_review, quote_sent, accepted, rejected, completed
  responseTime: integer("response_time"), // Response time in minutes
  satisfactionRating: integer("satisfaction_rating"), // 1-5 rating (1=Hiç Memnun Kalmadım, 5=Çok Memnun Kaldım)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partner applications
export const partnerApplications = pgTable("partner_applications", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  company: text("company").notNull(),
  companyAddress: text("company_address"),
  contactPerson: text("contact_person").notNull(),
  username: text("username").notNull(),
  website: text("website"),
  serviceCategory: text("service_category").notNull(),
  businessDescription: text("business_description").notNull(),
  companySize: text("company_size").notNull(),
  foundingYear: text("founding_year").notNull(),
  sectorExperience: text("sector_experience"),
  targetMarkets: text("target_markets"),
  services: text("services").notNull(),
  dipAdvantages: text("dip_advantages").notNull(),
  whyPartner: text("why_partner").notNull(),
  references: text("refs"),
  linkedinProfile: text("linkedin_profile"),
  twitterProfile: text("twitter_profile"),
  instagramProfile: text("instagram_profile"),
  facebookProfile: text("facebook_profile"),
  logoPath: text("logo_path"),
  documents: text("documents"), // JSON array of document URLs
  status: text("status").default("pending"), // pending, approved, rejected
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company billing information
export const companyBillingInfo = pgTable("company_billing_info", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id), // For partner billing info
  userId: integer("user_id").references(() => users.id), // For direct user billing info (future use)
  companyTitle: text("company_title"), // Official company title/name
  companyName: text("company_name").notNull(), // Brand/trade name
  website: text("website"),
  linkedinProfile: text("linkedin_profile"),
  taxNumber: text("tax_number"),
  taxOffice: text("tax_office"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").default("Turkey"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  authorizedPerson: text("authorized_person"), // Match actual DB column
  isDefault: boolean("is_default").default(true), // Match actual DB column
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quote responses from partners - formal quote documents
export const quoteResponses = pgTable("quote_responses", {
  id: serial("id").primaryKey(),
  quoteRequestId: integer("quote_request_id").references(() => quoteRequests.id).notNull(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  quoteNumber: text("quote_number").notNull().unique(), // Random quote number like DP2025000000010
  title: text("title").notNull(),
  description: text("description"),
  items: jsonb("items").notNull(), // Array of quote items with description, quantity, unitPrice, total
  subtotal: integer("subtotal").notNull(), // Amount in cents
  discountAmount: integer("discount_amount").default(0), // Discount in cents
  discountPercent: integer("discount_percent").default(0), // Discount percentage
  taxRate: integer("tax_rate").default(2000), // Tax rate in basis points (2000 = 20%)
  taxAmount: integer("tax_amount").notNull(), // Tax amount in cents
  totalAmount: integer("total_amount").notNull(), // Final total in cents
  currency: text("currency").default("TRY"),
  notes: text("notes"),
  validUntil: timestamp("valid_until"), // Quote expiration date
  status: text("status").default("sent"), // sent, accepted, rejected, expired
  paymentInstructions: jsonb("payment_instructions"), // Bank account details and instructions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Revision requests for quote modifications
export const revisionRequests = pgTable("revision_requests", {
  id: serial("id").primaryKey(),
  quoteResponseId: integer("quote_response_id").references(() => quoteResponses.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  requestedItems: jsonb("requested_items").notNull(), // User's requested pricing for each item
  message: text("message"), // Optional message from user
  status: text("status").default("pending"), // pending, accepted, rejected
  partnerResponse: text("partner_response"), // Partner's response message
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partner followers
export const partnerFollowers = pgTable("partner_followers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages between users and partners
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  attachments: jsonb("attachments"),
  fileUrl: text("file_url"), // URL for uploaded file attachments
  fileName: text("file_name"), // Original filename for display
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email subscribers for marketing emails
export const emailSubscribers = pgTable("email_subscribers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  email: text("email").notNull(),
  isActive: boolean("is_active").default(true),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  preferences: jsonb("preferences").default({}), // Store email type preferences
});

// User email preferences
export const userEmailPreferences = pgTable("user_email_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  marketingEmails: boolean("marketing_emails").default(true), // Campaign and personalized offers
  partnerUpdates: boolean("partner_updates").default(true), // Partner announcements
  platformUpdates: boolean("platform_updates").default(true), // Platform news and updates
  weeklyDigest: boolean("weekly_digest").default(false), // Weekly summary emails
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Note: Services and partnerServices tables are already defined above in schema with different structure

// Marketing contacts for comprehensive contact management and Resend integration
export const marketingContacts = pgTable("marketing_contacts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  company: text("company"),
  title: text("title"),
  address: text("address"),
  website: text("website"),
  linkedinProfile: text("linkedin_profile"),
  twitterProfile: text("twitter_profile"),
  instagramProfile: text("instagram_profile"),
  facebookProfile: text("facebook_profile"),
  userType: text("user_type").notNull(), // 'user', 'partner', 'admin', 'applicant'
  source: text("source").notNull(), // 'registration', 'partner_application', 'admin_created', etc.
  resendContactId: text("resend_contact_id"), // Resend API contact ID
  isActive: boolean("is_active").default(true),
  tags: text("tags").array().default([]), // For categorizing contacts
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SMS OTP verification codes
export const smsOtpCodes = pgTable("sms_otp_codes", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  isUsed: boolean("is_used").default(false),
  isVerified: boolean("is_verified").default(false),
  purpose: text("purpose").notNull(), // registration, login, password_reset
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Temporary user registrations (before phone verification)
export const tempUserRegistrations = pgTable("temp_user_registrations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  password: text("password"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  verificationCode: text("verification_code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Partner profile visits for tracking user interactions
export const partnerProfileVisits = pgTable("partner_profile_visits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  visitedAt: timestamp("visited_at").defaultNow(),
});

// User partner interactions for smart badges
export const userPartnerInteractions = pgTable("user_partner_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  hasVisitedProfile: boolean("has_visited_profile").default(false),
  isFollowing: boolean("is_following").default(false),
  hasMessaged: boolean("has_messaged").default(false),
  hasWorkedTogether: boolean("has_worked_together").default(false),
  hasPaidForService: boolean("has_paid_for_service").default(false),
  lastInteractionAt: timestamp("last_interaction_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dismissed info cards for user preferences
export const dismissedInfoCards = pgTable("dismissed_info_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  cardType: text("card_type").notNull(), // 'previous_quote_request'
  referenceId: integer("reference_id").notNull(), // partner ID or quote request ID
  dismissedAt: timestamp("dismissed_at").defaultNow(),
});

// Recipient accounts for partner payment information
export const recipientAccounts = pgTable("recipient_accounts", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  accountName: text("account_name").notNull(), // Custom name given by partner
  bankName: text("bank_name").notNull(),
  accountHolderName: text("account_holder_name").notNull(),
  accountNumber: text("account_number"),
  iban: text("iban").notNull(),
  swiftCode: text("swift_code"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System configuration table
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feedback from users and partners
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  category: text("category").notNull(), // request, bug, feature, complaint, other
  message: text("message").notNull(),
  status: text("status").default("new"), // new, reviewed, resolved
  source: text("source").default("user").notNull(), // user, partner
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment confirmations from users to partners
export const paymentConfirmations = pgTable("payment_confirmations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  quoteResponseId: integer("quote_response_id").references(() => quoteResponses.id),
  paymentMethod: text("payment_method").notNull(), // credit_card, bank_transfer, other
  amount: integer("amount").notNull(), // Amount in cents
  receiptFileUrl: text("receipt_file_url"), // For bank transfers
  receiptFileName: text("receipt_file_name"), // Original filename
  status: text("status").default("pending"), // pending, confirmed, rejected
  partnerNotes: text("partner_notes"), // Partner's notes when confirming/rejecting
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application documents for file uploads
export const applicationDocuments = pgTable("application_documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => partnerApplications.id).notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  filePath: text("file_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});



// Partner profile edit requests (requires admin approval)
export const partnerProfileEditRequests = pgTable("partner_profile_edit_requests", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  requestedChanges: jsonb("requested_changes").notNull(), // JSON of field changes
  status: text("status").default("pending"), // pending, approved, rejected
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ongoing Projects - Projects that have started after payment confirmation
export const ongoingProjects = pgTable("ongoing_projects", {
  id: serial("id").primaryKey(),
  quoteResponseId: integer("quote_response_id").references(() => quoteResponses.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  projectTitle: text("project_title").notNull(), // From quote response title
  projectNumber: text("project_number").notNull(), // From quote response number
  projectType: text("project_type").notNull(), // 'monthly' or 'one_time'
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"), // For one_time projects
  status: text("status").default("active"), // active, completion_requested_by_user, completion_requested_by_partner, completed, cancelled
  lastPaymentDate: timestamp("last_payment_date"), // For monthly projects
  nextPaymentDue: timestamp("next_payment_due"), // For monthly projects
  completionRequestedBy: integer("completion_requested_by").references(() => users.id), // Who requested completion
  completionRequestedAt: timestamp("completion_requested_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Comments - Comments between users and partners on projects
export const projectComments = pgTable("project_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => ongoingProjects.id).notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  rating: integer("rating"), // 1-5 star rating (optional)
  isPublic: boolean("is_public").default(false), // Whether this comment is public for other users to see
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Payment Records - Track monthly payments for ongoing projects
export const projectPayments = pgTable("project_payments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => ongoingProjects.id).notNull(),
  paymentConfirmationId: integer("payment_confirmation_id").references(() => paymentConfirmations.id),
  amount: integer("amount").notNull(), // Amount in cents
  paymentMonth: text("payment_month").notNull(), // YYYY-MM format
  status: text("status").default("due"), // due, paid, confirmed, overdue
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  partner: one(partners, {
    fields: [users.id],
    references: [partners.userId],
  }),
  billingInfo: one(companyBillingInfo, {
    fields: [users.id],
    references: [companyBillingInfo.userId],
  }),
  quoteRequests: many(quoteRequests),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  followedPartners: many(partnerFollowers),
}));

// Relations for services system
export const servicesRelations = relations(services, ({ one, many }) => ({
  createdBy: one(users, { fields: [services.createdBy], references: [users.id] }),
  partnerOfferedServices: many(partnerOfferedServices),
}));

export const partnerOfferedServicesRelations = relations(partnerOfferedServices, ({ one }) => ({
  partner: one(partners, { fields: [partnerOfferedServices.partnerId], references: [partners.id] }),
  service: one(services, { fields: [partnerOfferedServices.serviceId], references: [services.id] }),
}));

export const marketsRelations = relations(markets, ({ many }) => ({
  partnerMarkets: many(partnerSelectedMarkets),
}));

export const partnerSelectedMarketsRelations = relations(partnerSelectedMarkets, ({ one }) => ({
  partner: one(partners, { fields: [partnerSelectedMarkets.partnerId], references: [partners.id] }),
  market: one(markets, { fields: [partnerSelectedMarkets.marketId], references: [markets.id] }),
}));

export const partnersRelations = relations(partners, ({ one, many }) => ({
  user: one(users, {
    fields: [partners.userId],
    references: [users.id],
  }),
  services: many(partnerServices),
  offeredServices: many(partnerOfferedServices),
  selectedMarkets: many(partnerSelectedMarkets),
  quoteRequests: many(quoteRequests),
  followers: many(partnerFollowers),
}));

export const partnerServicesRelations = relations(partnerServices, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerServices.partnerId],
    references: [partners.id],
  }),
}));

export const quoteRequestsRelations = relations(quoteRequests, ({ one }) => ({
  user: one(users, {
    fields: [quoteRequests.userId],
    references: [users.id],
  }),
  partner: one(partners, {
    fields: [quoteRequests.partnerId],
    references: [partners.id],
  }),
}));

export const partnerFollowersRelations = relations(partnerFollowers, ({ one }) => ({
  user: one(users, {
    fields: [partnerFollowers.userId],
    references: [users.id],
  }),
  partner: one(partners, {
    fields: [partnerFollowers.partnerId],
    references: [partners.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const partnerProfileVisitsRelations = relations(partnerProfileVisits, ({ one }) => ({
  user: one(users, {
    fields: [partnerProfileVisits.userId],
    references: [users.id],
  }),
  partner: one(partners, {
    fields: [partnerProfileVisits.partnerId],
    references: [partners.id],
  }),
}));

export const userPartnerInteractionsRelations = relations(userPartnerInteractions, ({ one }) => ({
  user: one(users, {
    fields: [userPartnerInteractions.userId],
    references: [users.id],
  }),
  partner: one(partners, {
    fields: [userPartnerInteractions.partnerId],
    references: [partners.id],
  }),
}));

export const dismissedInfoCardsRelations = relations(dismissedInfoCards, ({ one }) => ({
  user: one(users, {
    fields: [dismissedInfoCards.userId],
    references: [users.id],
  }),
}));

export const recipientAccountsRelations = relations(recipientAccounts, ({ one }) => ({
  partner: one(partners, {
    fields: [recipientAccounts.partnerId],
    references: [partners.id],
  }),
}));

export const paymentConfirmationsRelations = relations(paymentConfirmations, ({ one }) => ({
  user: one(users, {
    fields: [paymentConfirmations.userId],
    references: [users.id],
  }),
  partner: one(partners, {
    fields: [paymentConfirmations.partnerId],
    references: [partners.id],
  }),
  quoteResponse: one(quoteResponses, {
    fields: [paymentConfirmations.quoteResponseId],
    references: [quoteResponses.id],
  }),
}));

// Insert schemas for services system
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartnerOfferedServiceSchema = createInsertSchema(partnerOfferedServices).omit({ id: true, createdAt: true, updatedAt: true });

// Insert schemas for markets system
export const insertMarketSchema = createInsertSchema(markets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartnerSelectedMarketSchema = createInsertSchema(partnerSelectedMarkets).omit({ id: true, createdAt: true });

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerApplicationSchema = createInsertSchema(partnerApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedBy: true,
  reviewedAt: true,
  notes: true,
});

export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).extend({
  projectStartDate: z.string().optional(),
  projectEndDate: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  projectDate: true,
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
});

export const insertCompanyBillingInfoSchema = createInsertSchema(companyBillingInfo).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteResponseSchema = createInsertSchema(quoteResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRevisionRequestSchema = createInsertSchema(revisionRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipientAccountSchema = createInsertSchema(recipientAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertSmsOtpCodeSchema = createInsertSchema(smsOtpCodes).omit({
  id: true,
  createdAt: true,
});

export const insertTempUserRegistrationSchema = createInsertSchema(tempUserRegistrations).omit({
  id: true,
  createdAt: true,
});

export const insertApplicationDocumentSchema = createInsertSchema(applicationDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertPaymentConfirmationSchema = createInsertSchema(paymentConfirmations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerPostSchema = createInsertSchema(partnerPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailSubscriberSchema = createInsertSchema(emailSubscribers).omit({
  id: true,
  subscribedAt: true,
  unsubscribedAt: true,
});

export const insertUserEmailPreferencesSchema = createInsertSchema(userEmailPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerProfileVisitSchema = createInsertSchema(partnerProfileVisits).omit({
  id: true,
  visitedAt: true,
});

// Notifications table - LinkedIn style notification system
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // quote_request, quote_response, partner_application, follower, project_update, feedback, newsletter_subscriber, system_status, partner_post, campaign
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedEntityType: text("related_entity_type"), // quote_request, partner, project, etc.
  relatedEntityId: integer("related_entity_id"), // ID of the related entity
  actionUrl: text("action_url"), // URL to navigate when clicked
  isRead: boolean("is_read").default(false),
  isEmailSent: boolean("is_email_sent").default(false), // Track if email notification was sent
  metadata: jsonb("metadata"), // Additional data for the notification
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

// Select types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const insertUserPartnerInteractionSchema = createInsertSchema(userPartnerInteractions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDismissedInfoCardSchema = createInsertSchema(dismissedInfoCards).omit({
  id: true,
  dismissedAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOngoingProjectSchema = createInsertSchema(ongoingProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectPaymentSchema = createInsertSchema(projectPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for services system
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type PartnerOfferedService = typeof partnerOfferedServices.$inferSelect;
export type InsertPartnerOfferedService = z.infer<typeof insertPartnerOfferedServiceSchema>;

// Types for markets system
export type Market = typeof markets.$inferSelect;
export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type PartnerSelectedMarket = typeof partnerSelectedMarkets.$inferSelect;
export type InsertPartnerSelectedMarket = z.infer<typeof insertPartnerSelectedMarketSchema>;

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type PartnerApplication = typeof partnerApplications.$inferSelect;
export type InsertPartnerApplication = z.infer<typeof insertPartnerApplicationSchema>;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type PartnerService = typeof partnerServices.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type PartnerFollower = typeof partnerFollowers.$inferSelect;
export type CompanyBillingInfo = typeof companyBillingInfo.$inferSelect;
export type InsertCompanyBillingInfo = z.infer<typeof insertCompanyBillingInfoSchema>;
export type QuoteResponse = typeof quoteResponses.$inferSelect;
export type InsertQuoteResponse = z.infer<typeof insertQuoteResponseSchema>;
export type RevisionRequest = typeof revisionRequests.$inferSelect;
export type InsertRevisionRequest = z.infer<typeof insertRevisionRequestSchema>;
export type RecipientAccount = typeof recipientAccounts.$inferSelect;
export type InsertRecipientAccount = z.infer<typeof insertRecipientAccountSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type SmsOtpCode = typeof smsOtpCodes.$inferSelect;
export type InsertSmsOtpCode = z.infer<typeof insertSmsOtpCodeSchema>;
export type TempUserRegistration = typeof tempUserRegistrations.$inferSelect;
export type InsertTempUserRegistration = z.infer<typeof insertTempUserRegistrationSchema>;
export type PaymentConfirmation = typeof paymentConfirmations.$inferSelect;
export type InsertPaymentConfirmation = z.infer<typeof insertPaymentConfirmationSchema>;

// Ongoing Projects types
export type OngoingProject = typeof ongoingProjects.$inferSelect;
export type InsertOngoingProject = z.infer<typeof insertOngoingProjectSchema>;

// Project Comments types  
export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;

// Project Payments types
export type ProjectPayment = typeof projectPayments.$inferSelect;
export type InsertProjectPayment = z.infer<typeof insertProjectPaymentSchema>;
export type ApplicationDocument = typeof applicationDocuments.$inferSelect;
export type InsertApplicationDocument = z.infer<typeof insertApplicationDocumentSchema>;
export type PartnerPost = typeof partnerPosts.$inferSelect;
export type InsertPartnerPost = z.infer<typeof insertPartnerPostSchema>;
export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type InsertEmailSubscriber = z.infer<typeof insertEmailSubscriberSchema>;
export type UserEmailPreferences = typeof userEmailPreferences.$inferSelect;
export type InsertUserEmailPreferences = z.infer<typeof insertUserEmailPreferencesSchema>;

// Quote item interface for the formal quote system
export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // In cents
  total: number; // In cents
}

export const insertMarketingContactSchema = createInsertSchema(marketingContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketingContact = z.infer<typeof insertMarketingContactSchema>;
export type MarketingContact = typeof marketingContacts.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type PartnerProfileVisit = typeof partnerProfileVisits.$inferSelect;
export type InsertPartnerProfileVisit = z.infer<typeof insertPartnerProfileVisitSchema>;
export type UserPartnerInteraction = typeof userPartnerInteractions.$inferSelect;
export type InsertUserPartnerInteraction = z.infer<typeof insertUserPartnerInteractionSchema>;
export type DismissedInfoCard = typeof dismissedInfoCards.$inferSelect;
export type InsertDismissedInfoCard = z.infer<typeof insertDismissedInfoCardSchema>;

// Newsletter subscribers table
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").default(true),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  source: text("source").default("homepage"), // homepage, admin_panel, etc.
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
  unsubscribedAt: true,
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
