import { 
  users, 
  userProfiles,
  partners,
  partnerApplications,
  applicationDocuments,
  quoteRequests,
  serviceCategories,
  partnerServices,
  partnerFollowers,
  messages,
  smsOtpCodes,
  tempUserRegistrations,
  type User, 
  type InsertUser,
  type UserProfile,
  type InsertUserProfile,
  type Partner,
  type InsertPartner,
  type PartnerApplication,
  type InsertPartnerApplication,
  type ApplicationDocument,
  type InsertApplicationDocument,
  type QuoteRequest,
  type InsertQuoteRequest,
  type ServiceCategory,
  type InsertServiceCategory,
  type SmsOtpCode,
  type InsertSmsOtpCode,
  type TempUserRegistration,
  type InsertTempUserRegistration,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, and, or, count, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // User profile methods
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: number, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  
  // Partner methods
  getPartners(options?: { category?: string; search?: string; approved?: boolean; limit?: number; offset?: number }): Promise<Partner[]>;
  getPartner(id: number): Promise<Partner | undefined>;
  getPartnerByUserId(userId: number): Promise<Partner | undefined>;
  getPartnerByUsername(username: string): Promise<Partner | undefined>;
  createPartner(partner: InsertPartner): Promise<Partner>;
  updatePartner(id: number, partner: Partial<InsertPartner>): Promise<Partner | undefined>;
  
  // Partner application methods
  getPartnerApplications(status?: string): Promise<PartnerApplication[]>;
  getPartnerApplication(id: number): Promise<PartnerApplication | undefined>;
  createPartnerApplication(application: InsertPartnerApplication): Promise<PartnerApplication>;
  updatePartnerApplication(id: number, application: Partial<PartnerApplication>): Promise<PartnerApplication | undefined>;
  updatePartnerApplicationLogo(id: number, logoPath: string): Promise<void>;
  
  // Application document methods
  getApplicationDocuments(applicationId: number): Promise<ApplicationDocument[]>;
  getApplicationDocument(id: number): Promise<ApplicationDocument | undefined>;
  addApplicationDocument(document: InsertApplicationDocument): Promise<ApplicationDocument>;
  
  // Quote request methods
  getQuoteRequests(partnerId?: number, userId?: number): Promise<QuoteRequest[]>;
  createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest>;
  updateQuoteRequest(id: number, request: Partial<QuoteRequest>): Promise<QuoteRequest | undefined>;
  
  // Service category methods
  getServiceCategories(): Promise<ServiceCategory[]>;
  createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
  
  // Partner follower methods
  followPartner(userId: number, partnerId: number): Promise<void>;
  unfollowPartner(userId: number, partnerId: number): Promise<void>;
  
  // Admin methods
  getAdminUsers(): Promise<User[]>;
  isFollowingPartner(userId: number, partnerId: number): Promise<boolean>;
  
  // OTP methods
  createSmsOtpCode(otpData: InsertSmsOtpCode): Promise<SmsOtpCode>;
  getSmsOtpCode(phone: string, purpose: string): Promise<SmsOtpCode | undefined>;
  verifySmsOtpCode(phone: string, code: string, purpose: string): Promise<boolean>;
  
  // Temporary user registration methods
  createTempUserRegistration(tempUserData: InsertTempUserRegistration): Promise<TempUserRegistration>;
  getTempUserRegistration(phone: string): Promise<TempUserRegistration | undefined>;
  deleteTempUserRegistration(phone: string): Promise<void>;
  
  // Partner posts methods
  getPartnerPosts(partnerId: number): Promise<any[]>;
  
  // Other methods
  getUserConversations(userId: number): Promise<any[]>;
  createMessage(messageData: any): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userUpdate, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [userProfile] = await db
      .insert(userProfiles)
      .values(profile)
      .returning();
    return userProfile;
  }

  async updateUserProfile(userId: number, profileUpdate: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [profile] = await db
      .update(userProfiles)
      .set({ ...profileUpdate, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return profile || undefined;
  }

  async getPartners(options: { 
    category?: string; 
    search?: string; 
    approved?: boolean; 
    limit?: number; 
    offset?: number 
  } = {}): Promise<Partner[]> {
    const { category, search, approved = true, limit = 20, offset = 0 } = options;
    
    const conditions = [];
    
    if (approved !== undefined) {
      conditions.push(eq(partners.isApproved, approved));
    }
    
    if (category) {
      conditions.push(eq(partners.serviceCategory, category));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(partners.companyName, `%${search}%`),
          ilike(partners.description, `%${search}%`),
          ilike(partners.services, `%${search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      return await db.select().from(partners)
        .where(and(...conditions))
        .orderBy(desc(partners.followersCount), desc(partners.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      return await db.select().from(partners)
        .orderBy(desc(partners.followersCount), desc(partners.createdAt))
        .limit(limit)
        .offset(offset);
    }
  }

  async getPartner(id: number): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner || undefined;
  }

  async getPartnerByUserId(userId: number): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.userId, userId));
    return partner || undefined;
  }

  async createPartner(partner: InsertPartner): Promise<Partner> {
    const [newPartner] = await db
      .insert(partners)
      .values(partner)
      .returning();
    return newPartner;
  }

  async updatePartner(id: number, partnerUpdate: Partial<InsertPartner>): Promise<Partner | undefined> {
    const [partner] = await db
      .update(partners)
      .set({ ...partnerUpdate, updatedAt: new Date() })
      .where(eq(partners.id, id))
      .returning();
    return partner || undefined;
  }

  async incrementPartnerViews(id: number): Promise<void> {
    await db
      .update(partners)
      .set({ 
        profileViews: sql`${partners.profileViews} + 1`,
        updatedAt: new Date()
      })
      .where(eq(partners.id, id));
  }

  async getPartnerByUsername(username: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.username, username));
    return partner || undefined;
  }

  async getPartnerApplications(status?: string): Promise<PartnerApplication[]> {
    if (status) {
      return await db.select().from(partnerApplications)
        .where(eq(partnerApplications.status, status))
        .orderBy(desc(partnerApplications.createdAt));
    } else {
      return await db.select().from(partnerApplications)
        .orderBy(desc(partnerApplications.createdAt));
    }
  }

  async getPartnerApplication(id: number): Promise<PartnerApplication | undefined> {
    const [application] = await db.select().from(partnerApplications).where(eq(partnerApplications.id, id));
    return application || undefined;
  }

  async createPartnerApplication(application: InsertPartnerApplication): Promise<PartnerApplication> {
    const [newApplication] = await db
      .insert(partnerApplications)
      .values(application)
      .returning();
    return newApplication;
  }

  async updatePartnerApplication(id: number, applicationUpdate: Partial<PartnerApplication>): Promise<PartnerApplication | undefined> {
    const [application] = await db
      .update(partnerApplications)
      .set({ ...applicationUpdate, updatedAt: new Date() })
      .where(eq(partnerApplications.id, id))
      .returning();
    return application || undefined;
  }

  async updatePartnerApplicationLogo(id: number, logoPath: string): Promise<void> {
    await db
      .update(partnerApplications)
      .set({ logoPath, updatedAt: new Date() })
      .where(eq(partnerApplications.id, id));
  }

  async getApplicationDocuments(applicationId: number): Promise<ApplicationDocument[]> {
    return await db.select().from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, applicationId))
      .orderBy(desc(applicationDocuments.uploadedAt));
  }

  async getApplicationDocument(id: number): Promise<ApplicationDocument | undefined> {
    const [document] = await db.select().from(applicationDocuments).where(eq(applicationDocuments.id, id));
    return document || undefined;
  }

  async addApplicationDocument(document: InsertApplicationDocument): Promise<ApplicationDocument> {
    const [newDocument] = await db
      .insert(applicationDocuments)
      .values(document)
      .returning();
    return newDocument;
  }

  async getQuoteRequests(partnerId?: number, userId?: number): Promise<QuoteRequest[]> {
    const conditions = [];
    
    if (partnerId) {
      conditions.push(eq(quoteRequests.partnerId, partnerId));
    }
    
    if (userId) {
      conditions.push(eq(quoteRequests.userId, userId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(quoteRequests)
        .where(and(...conditions))
        .orderBy(desc(quoteRequests.createdAt));
    } else {
      return await db.select().from(quoteRequests)
        .orderBy(desc(quoteRequests.createdAt));
    }
  }

  async createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest> {
    const [newRequest] = await db
      .insert(quoteRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async updateQuoteRequest(id: number, requestUpdate: Partial<QuoteRequest>): Promise<QuoteRequest | undefined> {
    const [request] = await db
      .update(quoteRequests)
      .set({ ...requestUpdate, updatedAt: new Date() })
      .where(eq(quoteRequests.id, id))
      .returning();
    return request || undefined;
  }

  async getServiceCategories(): Promise<ServiceCategory[]> {
    return await db.select().from(serviceCategories).orderBy(asc(serviceCategories.sortOrder));
  }

  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const [newCategory] = await db
      .insert(serviceCategories)
      .values(category)
      .returning();
    return newCategory;
  }

  async followPartner(userId: number, partnerId: number): Promise<void> {
    await db.insert(partnerFollowers).values({ userId, partnerId });
    
    // Update followers count
    const [countResult] = await db.select({ count: count() }).from(partnerFollowers).where(eq(partnerFollowers.partnerId, partnerId));
    await db
      .update(partners)
      .set({ followersCount: countResult.count })
      .where(eq(partners.id, partnerId));
  }

  async unfollowPartner(userId: number, partnerId: number): Promise<void> {
    await db
      .delete(partnerFollowers)
      .where(and(
        eq(partnerFollowers.userId, userId),
        eq(partnerFollowers.partnerId, partnerId)
      ));
    
    // Update followers count
    const [countResult] = await db.select({ count: count() }).from(partnerFollowers).where(eq(partnerFollowers.partnerId, partnerId));
    await db
      .update(partners)
      .set({ followersCount: countResult.count })
      .where(eq(partners.id, partnerId));
  }

  async isFollowingPartner(userId: number, partnerId: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(partnerFollowers)
      .where(and(
        eq(partnerFollowers.userId, userId),
        eq(partnerFollowers.partnerId, partnerId)
      ));
    return !!result;
  }

  // Additional user methods for dropdown menu functionality
  async getUserBillingInfo(userId: number): Promise<any> {
    // Return empty object for now - can be expanded later
    return {};
  }

  async updateUserBillingInfo(userId: number, data: any): Promise<any> {
    // Return the data for now - can be expanded later  
    return data;
  }

  async getUserFollowedPartners(userId: number): Promise<Partner[]> {
    const followedPartners = await db
      .select()
      .from(partners)
      .innerJoin(partnerFollowers, eq(partners.id, partnerFollowers.partnerId))
      .where(eq(partnerFollowers.userId, userId));
    
    return followedPartners.map(result => result.partners);
  }

  async updateUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Password update logic would go here - for now just return
    throw new Error('Password update not implemented');
  }

  async deleteUserAccount(userId: number): Promise<void> {
    // Account deletion logic would go here - for now just return
    throw new Error('Account deletion not implemented');
  }

  async getUserQuoteRequests(userId: number): Promise<any[]> {
    const requests = await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.userId, userId))
      .orderBy(desc(quoteRequests.createdAt));
    
    return requests;
  }

  async getSuggestedPartners(userId: number): Promise<Partner[]> {
    const allPartners = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .limit(6);
    
    return allPartners;
  }

  async acceptQuoteResponse(responseId: number, userId: number): Promise<any> {
    // Quote response accept logic would go here
    return { success: true };
  }

  async rejectQuoteResponse(responseId: number, userId: number): Promise<any> {
    // Quote response reject logic would go here
    return { success: true };
  }

  // OTP methods
  async createSmsOtpCode(otpData: InsertSmsOtpCode): Promise<SmsOtpCode> {
    const [otpCode] = await db
      .insert(smsOtpCodes)
      .values(otpData)
      .returning();
    return otpCode;
  }

  async getSmsOtpCode(phone: string, purpose: string): Promise<SmsOtpCode | undefined> {
    const [otpCode] = await db
      .select()
      .from(smsOtpCodes)
      .where(and(
        eq(smsOtpCodes.phone, phone),
        eq(smsOtpCodes.purpose, purpose),
        eq(smsOtpCodes.isUsed, false)
      ))
      .orderBy(desc(smsOtpCodes.createdAt))
      .limit(1);
    return otpCode || undefined;
  }

  async verifySmsOtpCode(phone: string, code: string, purpose: string): Promise<boolean> {
    const otpRecord = await this.getSmsOtpCode(phone, purpose);
    
    if (!otpRecord) {
      return false;
    }

    // Check if code matches and hasn't expired
    const now = new Date();
    if (otpRecord.code === code && otpRecord.expiresAt > now && !otpRecord.isUsed) {
      // Mark as used
      await db
        .update(smsOtpCodes)
        .set({ isUsed: true, isVerified: true })
        .where(eq(smsOtpCodes.id, otpRecord.id));
      
      return true;
    }

    return false;
  }

  // Temporary user registration methods
  async createTempUserRegistration(tempUserData: InsertTempUserRegistration): Promise<TempUserRegistration> {
    // First, delete any existing temp registration for this phone
    await db
      .delete(tempUserRegistrations)
      .where(eq(tempUserRegistrations.phone, tempUserData.phone));

    const [tempUser] = await db
      .insert(tempUserRegistrations)
      .values(tempUserData)
      .returning();
    return tempUser;
  }

  async getTempUserRegistration(phone: string): Promise<TempUserRegistration | undefined> {
    const [tempUser] = await db
      .select()
      .from(tempUserRegistrations)
      .where(eq(tempUserRegistrations.phone, phone))
      .orderBy(desc(tempUserRegistrations.createdAt))
      .limit(1);
    return tempUser || undefined;
  }

  async deleteTempUserRegistration(phone: string): Promise<void> {
    await db
      .delete(tempUserRegistrations)
      .where(eq(tempUserRegistrations.phone, phone));
  }

  async getUserConversations(userId: number): Promise<any[]> {
    // Message conversations logic would go here
    return [];
  }

  async createMessage(data: any): Promise<any> {
    // Message creation logic would go here
    return data;
  }

  async getAdminUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(or(eq(users.userType, 'master_admin'), eq(users.userType, 'editor_admin')));
  }

  async getPartnerPosts(partnerId: number): Promise<any[]> {
    // For now return empty array, will implement posts later
    return [];
  }
}

export const storage = new DatabaseStorage();
