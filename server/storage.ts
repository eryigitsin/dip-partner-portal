import { 
  users, 
  userProfiles,
  partners,
  partnerApplications,
  applicationDocuments,
  quoteRequests,
  serviceCategories,
  services,
  partnerSelectedServices,
  partnerServices,
  partnerPosts,
  partnerFollowers,
  messages,
  quoteResponses,
  smsOtpCodes,
  tempUserRegistrations,
  emailSubscribers,
  userEmailPreferences,
  marketingContacts,
  systemConfig,
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
  type QuoteResponse,
  type InsertQuoteResponse,
  type ServiceCategory,
  type InsertServiceCategory,
  type Service,
  type InsertService,
  type SmsOtpCode,
  type InsertSmsOtpCode,
  type TempUserRegistration,
  type InsertTempUserRegistration,
  type PartnerPost,
  type InsertPartnerPost,
  type EmailSubscriber,
  type InsertEmailSubscriber,
  type UserEmailPreferences,
  type InsertUserEmailPreferences,
  type MarketingContact,
  type InsertMarketingContact,
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
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
  updateUserSupabaseId(userId: number, supabaseId: string): Promise<User>;
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
  deletePartner(id: number): Promise<void>;
  
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
  getPartnerPosts(partnerId: number): Promise<PartnerPost[]>;
  createPartnerPost(post: InsertPartnerPost): Promise<PartnerPost>;
  
  // Other methods
  getUserConversations(userId: number): Promise<any[]>;
  createMessage(messageData: any): Promise<any>;
  
  // Admin methods
  getAllUsers(): Promise<User[]>;
  getAllPartnersWithUsers(): Promise<Partner[]>;
  updateUserType(userId: number, userType: string): Promise<User | undefined>;
  assignUserToPartner(userId: number, partnerId: number): Promise<User | undefined>;
  
  // Additional user methods for dropdown menu functionality
  getUserBillingInfo(userId: number): Promise<any>;
  updateUserBillingInfo(userId: number, data: any): Promise<any>;
  getUserFollowedPartners(userId: number): Promise<Partner[]>;
  updateUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<void>;
  deleteUserAccount(userId: number): Promise<void>;
  getUserQuoteRequests(userId: number): Promise<any[]>;
  getSuggestedPartners(userId: number): Promise<Partner[]>;
  acceptQuoteResponse(responseId: number, userId: number): Promise<any>;
  rejectQuoteResponse(responseId: number, userId: number): Promise<any>;
  markSmsOtpCodeAsUsed(phone: string, code: string, purpose: string): Promise<void>;
  markTempUserRegistrationAsUsed(phone: string, purpose: string): Promise<void>;
  deletePartnerPost(postId: number): Promise<void>;
  
  // Email subscription methods
  getAllEmailSubscribers(): Promise<EmailSubscriber[]>;
  getEmailSubscriber(userId: number): Promise<EmailSubscriber | undefined>;
  subscribeToEmails(userId: number, email: string): Promise<EmailSubscriber>;
  unsubscribeFromEmails(userId: number): Promise<void>;
  unsubscribeByEmail(email: string): Promise<void>;
  
  // User email preferences methods
  getUserEmailPreferences(userId: number): Promise<UserEmailPreferences | undefined>;
  updateUserEmailPreferences(userId: number, preferences: Partial<InsertUserEmailPreferences>): Promise<UserEmailPreferences>;
  createUserEmailPreferences(preferences: InsertUserEmailPreferences): Promise<UserEmailPreferences>;
  
  // Marketing contact methods
  getAllMarketingContacts(): Promise<MarketingContact[]>;
  getMarketingContactByEmail(email: string): Promise<MarketingContact | undefined>;
  createMarketingContact(contact: InsertMarketingContact): Promise<MarketingContact>;
  updateMarketingContact(email: string, contact: Partial<InsertMarketingContact>): Promise<MarketingContact | undefined>;
  deleteMarketingContact(email: string): Promise<void>;
  syncUserToMarketingContact(user: User, userType: string, source: string): Promise<MarketingContact>;
  syncPartnerToMarketingContact(partner: Partner, user: User): Promise<MarketingContact>;

  // Quote Response methods
  createQuoteResponse(responseData: InsertQuoteResponse): Promise<QuoteResponse>;
  getQuoteResponseById(id: number): Promise<QuoteResponse | null>;
  getQuoteResponsesByRequestId(requestId: number): Promise<QuoteResponse[]>;
  updateQuoteResponse(id: number, updates: Partial<QuoteResponse>): Promise<QuoteResponse | null>;

  // System configuration methods
  getSystemConfigs(): Promise<Array<{ key: string; value: any }>>;
  updateSystemConfig(key: string, value: any): Promise<void>;
  
  // Category management
  getAllCategories(): Promise<Array<{ id: number; name: string; description?: string; isActive: boolean }>>;
  createCategory(data: { name: string; description?: string; isActive: boolean }): Promise<any>;
  updateCategory(id: number, updates: any): Promise<any>;
  
  // Service management with categories
  getAllServicesWithCategories(): Promise<Array<{ id: number; name: string; description: string; category: string; categoryId: number; isActive: boolean }>>;
  createService(data: { name: string; description: string; categoryId: number; isActive: boolean; createdBy: number }): Promise<any>;
  updateService(id: number, updates: any): Promise<any>;
  
  // Partner Services Pool Management
  getAllServices(): Promise<Service[]>;
  getPartnerSelectedServices(partnerId: number): Promise<Array<{ id: number; name: string; description?: string; category?: string }>>;
  addPartnerService(partnerId: number, serviceId: number): Promise<void>;
  removePartnerService(partnerId: number, serviceId: number): Promise<void>;
  createServiceInPool(data: { name: string; description?: string; category?: string; createdBy: number }): Promise<Service>;
  getServicesByIds(serviceIds: number[]): Promise<Service[]>;
  getPartnersOfferingService(serviceId: number): Promise<Array<{ partner: Partner; user: User }>>
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

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId));
    return user || undefined;
  }

  async updateUserSupabaseId(userId: number, supabaseId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ supabaseId })
      .where(eq(users.id, userId))
      .returning();
    return user;
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
      // First try to find a matching category by slug to get the actual service category name
      const serviceCategories = await this.getServiceCategories();
      const matchingCategory = serviceCategories.find(cat => cat.slug === category);
      
      if (matchingCategory) {
        // Use the actual category name for filtering
        conditions.push(eq(partners.serviceCategory, matchingCategory.name));
      } else {
        // Fallback to direct match (in case category is already the name)
        conditions.push(eq(partners.serviceCategory, category));
      }
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
    try {
      console.log(`[getPartnerByUserId] Looking for userId: ${userId}`);
      const [partner] = await db.select().from(partners).where(eq(partners.userId, userId));
      console.log(`[getPartnerByUserId] Found partner:`, partner ? `ID: ${partner.id}, Company: ${partner.companyName}` : 'NOT FOUND');
      return partner || undefined;
    } catch (error) {
      console.error('Error in getPartnerByUserId:', error);
      return undefined;
    }
  }

  async getPartnerByUsername(username: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.username, username));
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
    console.log('Storage updatePartner called with:', { id, partnerUpdate });
    
    // Log update details for debugging
    if (partnerUpdate.logo) console.log('Updating logo to:', partnerUpdate.logo);
    if (partnerUpdate.coverImage) console.log('Updating cover image to:', partnerUpdate.coverImage);
    if (partnerUpdate.description) console.log('Updating description to:', partnerUpdate.description);
    
    const [partner] = await db
      .update(partners)
      .set({ ...partnerUpdate, updatedAt: new Date() })
      .where(eq(partners.id, id))
      .returning();
    
    console.log('Storage updatePartner result:', partner);
    console.log('Updated partner logo:', partner?.logo);
    console.log('Updated partner coverImage:', partner?.coverImage);
    return partner || undefined;
  }

  async deletePartner(id: number): Promise<void> {
    console.log('Storage deletePartner called with id:', id);
    
    try {
      // Get partner details first
      const partner = await this.getPartner(id);
      if (!partner) {
        console.log('Partner not found for deletion:', id);
        return;
      }
      
      console.log('Deleting partner:', partner.companyName);
      
      // Start transaction to delete all related data
      await db.transaction(async (tx) => {
        // Delete partner followers
        await tx.delete(partnerFollowers).where(eq(partnerFollowers.partnerId, id));
        
        // Delete partner posts
        await tx.delete(partnerPosts).where(eq(partnerPosts.partnerId, id));
        
        // Delete quote responses related to this partner's quote requests
        const partnerQuoteRequests = await tx.select({ id: quoteRequests.id })
          .from(quoteRequests)
          .where(eq(quoteRequests.partnerId, id));
        
        for (const qr of partnerQuoteRequests) {
          await tx.delete(quoteResponses).where(eq(quoteResponses.quoteRequestId, qr.id));
        }
        
        // Delete quote requests
        await tx.delete(quoteRequests).where(eq(quoteRequests.partnerId, id));
        
        // Delete application documents if partner has an application
        const application = await tx.select({ id: partnerApplications.id })
          .from(partnerApplications)
          .where(eq(partnerApplications.id, partner.id));
        
        if (application.length > 0) {
          await tx.delete(applicationDocuments).where(eq(applicationDocuments.applicationId, application[0].id));
          await tx.delete(partnerApplications).where(eq(partnerApplications.id, application[0].id));
        }
        
        // Delete the partner record
        await tx.delete(partners).where(eq(partners.id, id));
        
        // Delete the associated user account if exists
        if (partner.userId) {
          await tx.delete(users).where(eq(users.id, partner.userId));
        }
      });
      
      console.log('Partner and all related data deleted successfully');
    } catch (error) {
      console.error('Error in deletePartner:', error);
      throw new Error('Failed to delete partner');
    }
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

  async getQuoteRequestsByPartnerId(partnerId: number): Promise<QuoteRequest[]> {
    return await db.select().from(quoteRequests)
      .where(eq(quoteRequests.partnerId, partnerId))
      .orderBy(desc(quoteRequests.createdAt));
  }

  async getAllQuoteRequestsWithPartners(): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: quoteRequests.id,
          userId: quoteRequests.userId,
          partnerId: quoteRequests.partnerId,
          fullName: quoteRequests.fullName,
          email: quoteRequests.email,
          phone: quoteRequests.phone,
          companyName: quoteRequests.companyName,
          serviceNeeded: quoteRequests.serviceNeeded,
          budget: quoteRequests.budget,
          message: quoteRequests.message,
          status: quoteRequests.status,
          createdAt: quoteRequests.createdAt,
          updatedAt: quoteRequests.updatedAt,
          partnerCompanyName: partners.companyName,
          partnerLogo: partners.logo,
        })
        .from(quoteRequests)
        .leftJoin(partners, eq(quoteRequests.partnerId, partners.id))
        .orderBy(desc(quoteRequests.createdAt));

      return result.map(row => ({
        id: row.id,
        userId: row.userId,
        partnerId: row.partnerId,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        companyName: row.companyName,
        serviceNeeded: row.serviceNeeded,
        budget: row.budget,
        message: row.message || '',
        status: row.status || 'pending',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        partner: row.partnerCompanyName ? {
          id: row.partnerId,
          companyName: row.partnerCompanyName,
          logo: row.partnerLogo,
        } : null,
      }));
    } catch (error) {
      console.error('Error in getAllQuoteRequestsWithPartners:', error);
      return [];
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

  async getQuoteRequestById(id: number): Promise<QuoteRequest | undefined> {
    const [request] = await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.id, id));
    return request || undefined;
  }

  // Quote Response Management
  async createQuoteResponse(response: any): Promise<any> {
    const [newResponse] = await db
      .insert(quoteResponses)
      .values({
        ...response,
        subtotal: Math.round(response.subtotal * 100), // Convert to cents
        taxAmount: Math.round(response.taxAmount * 100),
        totalAmount: Math.round(response.total * 100),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newResponse;
  }

  async getQuoteResponsesByRequestId(requestId: number): Promise<any[]> {
    return await db
      .select()
      .from(quoteResponses)
      .where(eq(quoteResponses.quoteRequestId, requestId))
      .orderBy(desc(quoteResponses.createdAt));
  }

  async getQuoteResponseById(id: number): Promise<any | undefined> {
    const [response] = await db
      .select()
      .from(quoteResponses)
      .where(eq(quoteResponses.id, id));
    return response || undefined;
  }

  async updateQuoteResponse(id: number, responseUpdate: any): Promise<any | undefined> {
    const [response] = await db
      .update(quoteResponses)
      .set({ ...responseUpdate, updatedAt: new Date() })
      .where(eq(quoteResponses.id, id))
      .returning();
    return response || undefined;
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



  async getServiceByName(name: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.name, name)).limit(1);
    
    // If service doesn't exist, create it automatically
    if (!service) {
      try {
        const [newService] = await db
          .insert(services)
          .values({
            name: name.trim(),
            description: '',
            category: 'Genel',
            isActive: true,
            createdBy: 1 // System created
          })
          .returning();
        return newService;
      } catch (error) {
        console.error('Error auto-creating service:', error);
        return undefined;
      }
    }
    
    return service;
  }



  async getPartnerServices(partnerId: number): Promise<string[]> {
    try {
      const partner = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
      if (!partner[0] || !partner[0].services) return [];
      
      // Parse services - could be JSON array or newline-separated string
      let servicesList: string[] = [];
      try {
        servicesList = JSON.parse(partner[0].services);
      } catch {
        servicesList = partner[0].services.split('\n').filter(s => s.trim());
      }
      
      return servicesList;
    } catch (error) {
      console.error('Error getting partner services:', error);
      return [];
    }
  }

  async updatePartnerServices(partnerId: number, services: string[]): Promise<void> {
    try {
      await db.update(partners)
        .set({ 
          services: JSON.stringify(services),
          updatedAt: new Date()
        })
        .where(eq(partners.id, partnerId));
    } catch (error) {
      console.error('Error updating partner services:', error);
      throw error;
    }
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

  async getPartnerFollowers(partnerId: number): Promise<any[]> {
    const followers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        company: userProfiles.company,
        followedAt: partnerFollowers.createdAt
      })
      .from(partnerFollowers)
      .innerJoin(users, eq(partnerFollowers.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(partnerFollowers.partnerId, partnerId))
      .orderBy(desc(partnerFollowers.createdAt));
    
    return followers;
  }

  async getPartnerPosts(partnerId: number): Promise<PartnerPost[]> {
    return await db.select().from(partnerPosts)
      .where(eq(partnerPosts.partnerId, partnerId))
      .orderBy(desc(partnerPosts.createdAt));
  }

  async createPartnerPost(post: InsertPartnerPost): Promise<PartnerPost> {
    const [newPost] = await db
      .insert(partnerPosts)
      .values(post)
      .returning();
    return newPost;
  }

  async deletePartnerPost(postId: number): Promise<void> {
    await db
      .delete(partnerPosts)
      .where(eq(partnerPosts.id, postId));
  }

  // Admin functions
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }



  async getAllPartnersWithUsers(): Promise<Partner[]> {
    return db.select().from(partners);
  }

  async updateUserType(userId: number, userType: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ userType })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async assignUserToPartner(userId: number, partnerId: number): Promise<User | undefined> {
    // First update user type to partner
    const [user] = await db
      .update(users)
      .set({ userType: 'partner' })
      .where(eq(users.id, userId))
      .returning();
    
    // Then update the partner record to link this user
    await db
      .update(partners)
      .set({ userId })
      .where(eq(partners.id, partnerId));
      
    return user;
  }

  // Email subscription methods
  async getAllEmailSubscribers(): Promise<EmailSubscriber[]> {
    return await db.select().from(emailSubscribers).where(eq(emailSubscribers.isActive, true));
  }

  async getEmailSubscriber(userId: number): Promise<EmailSubscriber | undefined> {
    const [subscriber] = await db.select().from(emailSubscribers).where(
      and(eq(emailSubscribers.userId, userId), eq(emailSubscribers.isActive, true))
    );
    return subscriber || undefined;
  }

  async subscribeToEmails(userId: number, email: string): Promise<EmailSubscriber> {
    // First check if user already has a subscription record
    const existing = await db.select().from(emailSubscribers).where(eq(emailSubscribers.userId, userId));
    
    if (existing.length > 0) {
      // Reactivate existing subscription
      const [subscriber] = await db
        .update(emailSubscribers)
        .set({ 
          isActive: true, 
          email: email,
          subscribedAt: new Date(),
          unsubscribedAt: null 
        })
        .where(eq(emailSubscribers.userId, userId))
        .returning();
      return subscriber;
    } else {
      // Create new subscription
      const [subscriber] = await db
        .insert(emailSubscribers)
        .values({ userId, email, isActive: true })
        .returning();
      return subscriber;
    }
  }

  async unsubscribeFromEmails(userId: number): Promise<void> {
    await db
      .update(emailSubscribers)
      .set({ 
        isActive: false, 
        unsubscribedAt: new Date() 
      })
      .where(eq(emailSubscribers.userId, userId));
  }

  async unsubscribeByEmail(email: string): Promise<void> {
    await db
      .update(emailSubscribers)
      .set({ 
        isActive: false, 
        unsubscribedAt: new Date() 
      })
      .where(eq(emailSubscribers.email, email));
  }

  // User email preferences methods
  async getUserEmailPreferences(userId: number): Promise<UserEmailPreferences | undefined> {
    const [preferences] = await db.select().from(userEmailPreferences).where(eq(userEmailPreferences.userId, userId));
    return preferences || undefined;
  }

  async updateUserEmailPreferences(userId: number, preferences: Partial<InsertUserEmailPreferences>): Promise<UserEmailPreferences> {
    const [updated] = await db
      .update(userEmailPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(userEmailPreferences.userId, userId))
      .returning();
    return updated;
  }

  async createUserEmailPreferences(preferences: InsertUserEmailPreferences): Promise<UserEmailPreferences> {
    const [created] = await db
      .insert(userEmailPreferences)
      .values(preferences)
      .returning();
    return created;
  }

  // Marketing contact methods
  async getAllMarketingContacts(): Promise<MarketingContact[]> {
    return await db.select().from(marketingContacts).orderBy(desc(marketingContacts.createdAt));
  }

  async getMarketingContactByEmail(email: string): Promise<MarketingContact | undefined> {
    const [contact] = await db.select().from(marketingContacts).where(eq(marketingContacts.email, email));
    return contact || undefined;
  }

  async createMarketingContact(contact: InsertMarketingContact): Promise<MarketingContact> {
    const [created] = await db
      .insert(marketingContacts)
      .values(contact)
      .returning();
    return created;
  }

  async updateMarketingContact(email: string, contact: Partial<InsertMarketingContact>): Promise<MarketingContact | undefined> {
    const [updated] = await db
      .update(marketingContacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(marketingContacts.email, email))
      .returning();
    return updated || undefined;
  }

  async deleteMarketingContact(email: string): Promise<void> {
    await db.delete(marketingContacts).where(eq(marketingContacts.email, email));
  }

  async syncUserToMarketingContact(user: User, userType: string, source: string): Promise<MarketingContact> {
    // Check if contact already exists
    const existing = await this.getMarketingContactByEmail(user.email);
    
    if (existing) {
      // Update existing contact
      return await this.updateMarketingContact(user.email, {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        userType,
        source,
        isActive: true,
      }) || existing;
    } else {
      // Create new contact
      return await this.createMarketingContact({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        userType,
        source,
        isActive: true,
        tags: [userType],
      });
    }
  }

  async syncPartnerToMarketingContact(partner: Partner, user: User): Promise<MarketingContact> {
    // Check if contact already exists
    const existing = await this.getMarketingContactByEmail(user.email);
    
    if (existing) {
      // Update existing contact with partner info
      return await this.updateMarketingContact(user.email, {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        company: partner.companyName,
        website: partner.website,
        linkedinProfile: partner.linkedinProfile,
        twitterProfile: partner.twitterProfile,
        instagramProfile: partner.instagramProfile,
        facebookProfile: partner.facebookProfile,
        userType: 'partner',
        source: 'partner_profile',
        isActive: true,
        tags: ['partner', partner.serviceCategory].filter(Boolean),
      }) || existing;
    } else {
      // Create new contact with partner info
      return await this.createMarketingContact({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        company: partner.companyName,
        website: partner.website,
        linkedinProfile: partner.linkedinProfile,
        twitterProfile: partner.twitterProfile,
        instagramProfile: partner.instagramProfile,
        facebookProfile: partner.facebookProfile,
        userType: 'partner',
        source: 'partner_profile',
        isActive: true,
        tags: ['partner', partner.serviceCategory].filter(Boolean),
      });
    }
  }

  // Missing methods implementation
  async markSmsOtpCodeAsUsed(phone: string, code: string, purpose: string): Promise<void> {
    await db
      .update(smsOtpCodes)
      .set({ isUsed: true })
      .where(
        and(
          eq(smsOtpCodes.phone, phone),
          eq(smsOtpCodes.code, code),
          eq(smsOtpCodes.purpose, purpose)
        )
      );
  }

  async markTempUserRegistrationAsUsed(phone: string, purpose: string): Promise<void> {
    await db.delete(tempUserRegistrations)
      .where(eq(tempUserRegistrations.phone, phone));
  }

  async getUserBillingInfo(userId: number): Promise<any> {
    // This method seems to be for legacy support, returning null for now
    return null;
  }

  async updateUserBillingInfo(userId: number, data: any): Promise<any> {
    // This method seems to be for legacy support, returning null for now
    return null;
  }

  async getUserFollowedPartners(userId: number): Promise<Partner[]> {
    const followedPartners = await db
      .select()
      .from(partners)
      .innerJoin(partnerFollowers, eq(partners.id, partnerFollowers.partnerId))
      .where(eq(partnerFollowers.userId, userId));
    
    return followedPartners.map(row => row.partners);
  }

  async updateUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // TODO: Implement password update with proper validation
    throw new Error('Password update not implemented yet');
  }

  async deleteUserAccount(userId: number): Promise<void> {
    // TODO: Implement account deletion with proper cleanup
    throw new Error('Account deletion not implemented yet');
  }

  async getUserQuoteRequests(userId: number): Promise<any[]> {
    return await db.select()
      .from(quoteRequests)
      .where(eq(quoteRequests.userId, userId))
      .orderBy(desc(quoteRequests.createdAt));
  }

  async getSuggestedPartners(userId: number): Promise<Partner[]> {
    // Return random approved partners for now
    return await db.select()
      .from(partners)
      .where(eq(partners.isApproved, true))
      .limit(5);
  }

  async acceptQuoteResponse(responseId: number, userId: number): Promise<any> {
    // TODO: Implement quote response acceptance
    return null;
  }

  async rejectQuoteResponse(responseId: number, userId: number): Promise<any> {
    // TODO: Implement quote response rejection
    return null;
  }

  // System configuration methods implementation
  async getSystemConfigs(): Promise<Array<{ key: string; value: any }>> {
    const configs = await db.select().from(systemConfig);
    return configs;
  }

  async updateSystemConfig(key: string, value: any): Promise<void> {
    const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
    
    if (existing.length > 0) {
      await db
        .update(systemConfig)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemConfig.key, key));
    } else {
      await db.insert(systemConfig).values({ key, value });
    }
  }

  // Category management methods
  async getAllCategories(): Promise<Array<{ id: number; name: string; description?: string; isActive: boolean }>> {
    const categories = await db.select().from(serviceCategories);
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.nameEn, // Use nameEn as description since there's no description field
      isActive: cat.isActive !== null ? cat.isActive : true
    }));
  }

  async createCategory(data: { name: string; description?: string; isActive: boolean }): Promise<any> {
    const [category] = await db
      .insert(serviceCategories)
      .values({
        name: data.name,
        nameEn: data.description || data.name,
        slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        icon: 'default-icon',
        isActive: data.isActive
      })
      .returning();
    return {
      id: category.id,
      name: category.name,
      description: category.nameEn,
      isActive: category.isActive !== null ? category.isActive : true
    };
  }

  async updateCategory(id: number, updates: any): Promise<any> {
    const [category] = await db
      .update(serviceCategories)
      .set({
        name: updates.name,
        nameEn: updates.description,
        slug: updates.name ? updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined,
        isActive: updates.isActive
      })
      .where(eq(serviceCategories.id, id))
      .returning();
    return {
      id: category.id,
      name: category.name,
      description: category.nameEn,
      isActive: category.isActive !== null ? category.isActive : true
    };
  }

  // Service management methods
  async getAllServicesWithCategories(): Promise<Array<{ id: number; name: string; description: string; category: string; categoryId: number; isActive: boolean }>> {
    const allServices = await db.select().from(services);
    return allServices.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description || '',
      category: service.category || 'Genel',
      categoryId: 1, // Services use category text field, default to 1 for UI compatibility
      isActive: service.isActive !== null ? service.isActive : true
    }));
  }

  async createService(data: { name: string; description: string; categoryId: number; isActive: boolean; createdBy: number }): Promise<any> {
    const [service] = await db
      .insert(services)
      .values({
        name: data.name,
        description: data.description,
        category: 'Genel', // Services table uses category string field
        isActive: data.isActive,
        createdBy: data.createdBy
      })
      .returning();
    return service;
  }

  async updateService(id: number, updates: any): Promise<any> {
    const [service] = await db
      .update(services)
      .set({
        name: updates.name,
        description: updates.description,
        category: updates.category || 'Genel',
        isActive: updates.isActive
      })
      .where(eq(services.id, id))
      .returning();
    return service;
  }

  // Partner Services Pool Management implementation
  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.isActive, true));
  }

  async getPartnerSelectedServices(partnerId: number): Promise<Array<{ id: number; name: string; description?: string; category?: string }>> {
    // First check if partner has services migrated to the new system
    const selectedServices = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        category: services.category
      })
      .from(partnerSelectedServices)
      .innerJoin(services, eq(partnerSelectedServices.serviceId, services.id))
      .where(and(
        eq(partnerSelectedServices.partnerId, partnerId),
        eq(services.isActive, true)
      ));
    
    // If no services found in new system, migrate from old string format
    if (selectedServices.length === 0) {
      await this.migratePartnerServicesToNewSystem(partnerId);
      
      // Re-fetch after migration
      const migratedServices = await db
        .select({
          id: services.id,
          name: services.name,
          description: services.description,
          category: services.category
        })
        .from(partnerSelectedServices)
        .innerJoin(services, eq(partnerSelectedServices.serviceId, services.id))
        .where(and(
          eq(partnerSelectedServices.partnerId, partnerId),
          eq(services.isActive, true)
        ));
      
      return migratedServices.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description || undefined,
        category: service.category || undefined
      }));
    }
    
    return selectedServices.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description || undefined,
      category: service.category || undefined
    }));
  }

  async migratePartnerServicesToNewSystem(partnerId: number): Promise<void> {
    try {
      // Get partner's old string services
      const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
      if (!partner || !partner.services) return;
      
      // Parse services - could be JSON array or newline-separated string
      let servicesList: string[] = [];
      try {
        servicesList = JSON.parse(partner.services);
      } catch {
        servicesList = partner.services.split('\n').filter(s => s.trim());
      }
      
      // For each service, ensure it exists in services table and add to partner_selected_services
      for (const serviceName of servicesList) {
        const trimmedName = serviceName.trim();
        if (!trimmedName) continue;
        
        // Get or create the service
        const service = await this.getServiceByName(trimmedName);
        if (service) {
          // Add to partner's selected services if not already exists
          try {
            await db
              .insert(partnerSelectedServices)
              .values({
                partnerId,
                serviceId: service.id
              })
              .onConflictDoNothing();
          } catch (error) {
            console.error(`Error adding service ${service.id} to partner ${partnerId}:`, error);
          }
        }
      }
      
      console.log(`Migrated services for partner ${partnerId}`);
    } catch (error) {
      console.error('Error migrating partner services:', error);
    }
  }

  async addPartnerService(partnerId: number, serviceId: number): Promise<void> {
    // Check if already exists
    const existing = await db
      .select()
      .from(partnerSelectedServices)
      .where(and(
        eq(partnerSelectedServices.partnerId, partnerId),
        eq(partnerSelectedServices.serviceId, serviceId)
      ));

    if (existing.length === 0) {
      await db.insert(partnerSelectedServices).values({
        partnerId,
        serviceId
      });
    }
  }

  async removePartnerService(partnerId: number, serviceId: number): Promise<void> {
    await db
      .delete(partnerSelectedServices)
      .where(and(
        eq(partnerSelectedServices.partnerId, partnerId),
        eq(partnerSelectedServices.serviceId, serviceId)
      ));
  }

  async createServiceInPool(data: { name: string; description?: string; category?: string; createdBy: number }): Promise<Service> {
    const [service] = await db
      .insert(services)
      .values({
        name: data.name,
        description: data.description,
        category: data.category || 'Genel',
        isActive: true,
        createdBy: data.createdBy
      })
      .returning();
    return service;
  }

  async getServicesByIds(serviceIds: number[]): Promise<Service[]> {
    if (serviceIds.length === 0) return [];
    return await db.select().from(services).where(sql`${services.id} = ANY(${serviceIds})`);
  }

  async getPartnersOfferingService(serviceId: number): Promise<Array<{ partner: Partner; user: User }>> {
    const partnersWithUsers = await db
      .select()
      .from(partnerSelectedServices)
      .innerJoin(partners, eq(partnerSelectedServices.partnerId, partners.id))
      .innerJoin(users, eq(partners.userId, users.id))
      .where(and(
        eq(partnerSelectedServices.serviceId, serviceId),
        eq(partners.isApproved, true),
        eq(partners.isActive, true)
      ));
    
    return partnersWithUsers.map(row => ({
      partner: row.partners,
      user: row.users
    }));
  }

}

export const storage = new DatabaseStorage();
