import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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
  website: text("website"),
  linkedinProfile: text("linkedin_profile"),
  twitterProfile: text("twitter_profile"),
  instagramProfile: text("instagram_profile"),
  facebookProfile: text("facebook_profile"),
  socialMedia: jsonb("social_media"), // {linkedin, twitter, facebook, instagram}
  isApproved: boolean("is_approved").default(false),
  isActive: boolean("is_active").default(true),
  followersCount: integer("followers_count").default(0),
  profileViews: integer("profile_views").default(0),
  username: text("username").unique(),
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
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  company: text("company").notNull(),
  serviceNeeded: text("service_needed").notNull(),
  budget: text("budget"),
  projectDate: timestamp("project_date"),
  status: text("status").default("pending"), // pending, responded, accepted, rejected, completed
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
  userId: integer("user_id").references(() => users.id).notNull(),
  companyName: text("company_name").notNull(),
  taxNumber: text("tax_number"),
  taxOffice: text("tax_office"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").default("Turkey"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quote responses from partners
export const quoteResponses = pgTable("quote_responses", {
  id: serial("id").primaryKey(),
  quoteRequestId: integer("quote_request_id").references(() => quoteRequests.id).notNull(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(),
  currency: text("currency").default("TRY"),
  deliveryTime: text("delivery_time"),
  terms: text("terms"),
  status: text("status").default("sent"), // sent, accepted, rejected
  validUntil: timestamp("valid_until"),
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
  conversationId: text("conversation_id").notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
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

export const partnersRelations = relations(partners, ({ one, many }) => ({
  user: one(users, {
    fields: [partners.userId],
    references: [users.id],
  }),
  services: many(partnerServices),
  offeredServices: many(partnerOfferedServices),
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

// Insert schemas for services system
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartnerOfferedServiceSchema = createInsertSchema(partnerOfferedServices).omit({ id: true, createdAt: true, updatedAt: true });

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

// Types for services system
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type PartnerOfferedService = typeof partnerOfferedServices.$inferSelect;
export type InsertPartnerOfferedService = z.infer<typeof insertPartnerOfferedServiceSchema>;

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
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type SmsOtpCode = typeof smsOtpCodes.$inferSelect;
export type InsertSmsOtpCode = z.infer<typeof insertSmsOtpCodeSchema>;
export type TempUserRegistration = typeof tempUserRegistrations.$inferSelect;
export type InsertTempUserRegistration = z.infer<typeof insertTempUserRegistrationSchema>;
export type ApplicationDocument = typeof applicationDocuments.$inferSelect;
export type InsertApplicationDocument = z.infer<typeof insertApplicationDocumentSchema>;
export type PartnerPost = typeof partnerPosts.$inferSelect;
export type InsertPartnerPost = z.infer<typeof insertPartnerPostSchema>;
export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type InsertEmailSubscriber = z.infer<typeof insertEmailSubscriberSchema>;
export type UserEmailPreferences = typeof userEmailPreferences.$inferSelect;
export type InsertUserEmailPreferences = z.infer<typeof insertUserEmailPreferencesSchema>;

export const insertMarketingContactSchema = createInsertSchema(marketingContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketingContact = z.infer<typeof insertMarketingContactSchema>;
export type MarketingContact = typeof marketingContacts.$inferSelect;
