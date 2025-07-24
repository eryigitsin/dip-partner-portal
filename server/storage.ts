import { 
  users, 
  userProfiles,
  partners,
  partnerApplications,
  quoteRequests,
  serviceCategories,
  partnerServices,
  partnerFollowers,
  messages,
  type User, 
  type InsertUser,
  type UserProfile,
  type InsertUserProfile,
  type Partner,
  type InsertPartner,
  type PartnerApplication,
  type InsertPartnerApplication,
  type QuoteRequest,
  type InsertQuoteRequest,
  type ServiceCategory,
  type InsertServiceCategory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, and, or, count } from "drizzle-orm";
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
  createPartner(partner: InsertPartner): Promise<Partner>;
  updatePartner(id: number, partner: Partial<InsertPartner>): Promise<Partner | undefined>;
  
  // Partner application methods
  getPartnerApplications(status?: string): Promise<PartnerApplication[]>;
  getPartnerApplication(id: number): Promise<PartnerApplication | undefined>;
  createPartnerApplication(application: InsertPartnerApplication): Promise<PartnerApplication>;
  updatePartnerApplication(id: number, application: Partial<PartnerApplication>): Promise<PartnerApplication | undefined>;
  
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
  isFollowingPartner(userId: number, partnerId: number): Promise<boolean>;
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
}

export const storage = new DatabaseStorage();
