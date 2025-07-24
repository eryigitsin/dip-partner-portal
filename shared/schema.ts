import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table - supports regular users, partners, and admins
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"),
  googleId: text("google_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  userType: text("user_type").notNull().default("user"), // user, partner, master_admin, editor_admin
  isVerified: boolean("is_verified").default(false),
  verificationCode: text("verification_code"),
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
  serviceCategory: text("service_category").notNull(),
  services: text("services").notNull(),
  dipAdvantages: text("dip_advantages"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  companySize: text("company_size"),
  website: text("website"),
  socialMedia: jsonb("social_media"), // {linkedin, twitter, facebook, instagram}
  isApproved: boolean("is_approved").default(false),
  isActive: boolean("is_active").default(true),
  followersCount: integer("followers_count").default(0),
  profileViews: integer("profile_views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partner services
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
  title: text("title").notNull(),
  website: text("website"),
  serviceCategory: text("service_category").notNull(),
  services: text("services").notNull(),
  dipAdvantages: text("dip_advantages"),
  status: text("status").default("pending"), // pending, approved, rejected
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"),
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
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
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
  quoteRequests: many(quoteRequests),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  followedPartners: many(partnerFollowers),
}));

export const partnersRelations = relations(partners, ({ one, many }) => ({
  user: one(users, {
    fields: [partners.userId],
    references: [users.id],
  }),
  services: many(partnerServices),
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

export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
});

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
