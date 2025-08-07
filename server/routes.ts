import type { Express } from "express";
import { createServer, type Server } from "http";
// Removed WebSocket import as we're using Socket.IO now
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPartnerApplicationSchema, insertQuoteRequestSchema, insertTempUserRegistrationSchema, insertMessageSchema, insertRecipientAccountSchema } from "@shared/schema";
import { z } from "zod";
import { createNetGsmService } from "./netgsm";
import { resendService } from './resend-service';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileSecurityService, FileSecurityService } from "./security/file-security";
import { emailSecurity } from "./security/email-security";
import express from "express";
import { supabaseStorage } from "./supabase-storage";
import { setupSocketIO } from "./socket";
import { supabaseAdmin } from "./supabase";
import { db } from "./db";
import { quoteResponses, partners } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ObjectStorageService } from "./objectStorage";

// Email templates and functionality
const emailTemplates = {
  serviceRequest: {
    toUser: (request: any, partner: any) => ({
      subject: `Teklif Talebiniz Alındı - ${partner.companyName}`,
      html: `
        <h2>Teklif Talebiniz Alındı</h2>
        <p>Merhaba ${request.fullName},</p>
        <p>${partner.companyName} firmasına gönderdiğiniz teklif talebiniz başarıyla alındı.</p>
        <p><strong>Hizmet:</strong> ${request.serviceNeeded}</p>
        <p><strong>Bütçe:</strong> ${request.budget || 'Belirtilmemiş'}</p>
        <p>Kısa süre içinde ${partner.companyName} firması tarafından iletişime geçilecektir.</p>
      `
    })
  },
  quoteStatus: {
    approved: {
      toPartner: (request: any, user: any) => ({
        subject: `Teklif Onaylandı - ${request.fullName}`,
        html: `
          <h2>Teklifiniz Onaylandı</h2>
          <p>Tebrikler! ${request.fullName} adlı müşteri teklifinizi onayladı.</p>
          <p><strong>Hizmet:</strong> ${request.serviceNeeded}</p>
          <p>Müşteri ile iletişime geçerek projeyi başlatabilirsiniz.</p>
        `
      }),
      toUser: (request: any, partner: any) => ({
        subject: `Teklif Onaylandı - ${partner.companyName}`,
        html: `
          <h2>Teklif Onaylandı</h2>
          <p>Merhaba ${request.fullName},</p>
          <p>${partner.companyName} firmasından aldığınız teklifi onayladınız.</p>
          <p><strong>Hizmet:</strong> ${request.serviceNeeded}</p>
          <p>Firma ile iletişime geçerek projeyi başlatabilirsiniz.</p>
        `
      })
    },
    rejected: {
      toPartner: (request: any, user: any) => ({
        subject: `Teklif Reddedildi - ${request.fullName}`,
        html: `
          <h2>Teklif Durumu</h2>
          <p>${request.fullName} adlı müşteri teklifinizi reddetmiştir.</p>
          <p><strong>Hizmet:</strong> ${request.serviceNeeded}</p>
          <p>Başka fırsatlar için platformumuzda aktif kalabilirsiniz.</p>
        `
      })
    }
  },
  revisionRequest: {
    toPartner: (request: any, user: any, revisionItems: any) => ({
      subject: `Revizyon Talebi - ${request.fullName}`,
      html: `
        <h2>Revizyon Talebi Alındı</h2>
        <p>Merhaba,</p>
        <p>${request.fullName} adlı müşteri teklifiniz için revizyon talebinde bulundu.</p>
        <p><strong>Hizmet:</strong> ${request.serviceNeeded}</p>
        <p>Partner paneli üzerinden revizyon talebini inceleyip kabul veya ret edebilirsiniz.</p>
        <p><a href="${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/partner-dashboard` : '/partner-dashboard'}">Partner Paneli</a></p>
      `
    }),
    accepted: (request: any, user: any) => ({
      subject: `Revizyon Talebi Kabul Edildi - ${request.serviceNeeded}`,
      html: `
        <h2>Revizyon Talebiniz Kabul Edildi</h2>
        <p>Merhaba ${request.fullName},</p>
        <p>Revizyon talebiniz partner tarafından kabul edildi ve yeni teklif hazırlandı.</p>
        <p><strong>Hizmet:</strong> ${request.serviceNeeded}</p>
        <p>Güncellenmiş teklifin detaylarını görüntülemek için platform panelinizdeki "Hizmet Talepleri" bölümünü ziyaret edebilirsiniz.</p>
      `
    }),
    rejected: (request: any, user: any) => ({
      subject: `Revizyon Talebi Reddedildi - ${request.serviceNeeded}`,
      html: `
        <h2>Revizyon Talebiniz Hakkında</h2>
        <p>Merhaba ${request.fullName},</p>
        <p>Maalesef revizyon talebiniz iş ortağı tarafından reddedilmiştir.</p>
        <p><strong>Hizmet:</strong> ${request.serviceNeeded}</p>
        <p>Mevcut teklif geçerliliğini korumaktadır. Farklı bir revizyon talebi için tekrar deneyebilir veya mevcut teklifi kabul edebilirsiniz.</p>
      `
    })
  },
  paymentComplete: (request: any, partner: any) => ({
    subject: `Ödeme Tamamlandı - ${partner.companyName}`,
    html: `
      <h2>Ödeme Tamamlandı</h2>
      <p>Merhaba ${request.fullName},</p>
      <p>${partner.companyName} firmasına olan ödemeniz başarıyla tamamlanmıştır.</p>
      <p><strong>Hizmet:</strong> ${request.serviceNeeded}</p>
      <p>Proje başlatılabilir.</p>
    `
  })
};

// Email sending function
async function sendEmail(params: { to: string; subject: string; html: string }) {
  try {
    await resendService.sendEmail(params);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
}

const scryptAsync = promisify(scrypt);

// Hash password function
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Secure Multer configuration for file uploads (using memory storage for Supabase)
const uploadDocuments = fileSecurityService.createSecureUpload();

export function registerRoutes(app: Express): Server {
  setupAuth(app);
  
  // Account type switching endpoint
  app.post("/api/auth/switch-account-type", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { userType } = req.body;
      const userId = req.user!.id;

      // Get current user to check available types
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all available types for this user
      const allAvailableTypes = [currentUser.userType];
      if (currentUser.availableUserTypes) {
        allAvailableTypes.push(...currentUser.availableUserTypes);
      }
      
      // If user doesn't have partner type but has a partner record, add it
      if (userType === 'partner' && !allAvailableTypes.includes('partner')) {
        const partnerRecord = await storage.getPartnerByUserId(userId);
        if (partnerRecord) {
          allAvailableTypes.push('partner');
        }
      }
      
      // Check if the requested user type is available for this user
      if (!allAvailableTypes.includes(userType)) {
        return res.status(400).json({ message: "Requested account type is not available for this user" });
      }

      // Update the active user type
      const updatedUser = await storage.updateUser(userId, {
        activeUserType: userType
      });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update account type" });
      }

      // Update the session user type
      req.user!.activeUserType = userType;
      req.user!.userType = userType; // Also update userType for compatibility

      res.json(updatedUser);
    } catch (error) {
      console.error('Error switching account type:', error);
      res.status(500).json({ message: "Failed to switch account type" });
    }
  });

  // Migration endpoint to update existing users
  app.post("/api/admin/migrate-users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user!.userType !== 'master_admin') {
        return res.status(403).json({ message: "Master admin access required" });
      }

      // Get all users
      const users = await storage.getAllUsers();
      let updated = 0;

      for (const user of users) {
        if (!user.availableUserTypes || user.availableUserTypes.length === 0) {
          // Check if user has a partner record
          const partner = await storage.getPartnerByUserId(user.id);
          
          let availableTypes = ['user'];
          let activeType = 'user';
          
          if (partner) {
            availableTypes.push('partner');
            activeType = user.userType === 'partner' ? 'partner' : 'user';
          }
          
          if (['master_admin', 'editor_admin'].includes(user.userType)) {
            availableTypes.push(user.userType);
            activeType = user.userType;
          }

          await storage.updateUser(user.id, {
            availableUserTypes: availableTypes,
            activeUserType: activeType
          });
          
          updated++;
        }
      }

      res.json({ 
        success: true, 
        message: `${updated} users updated with available user types` 
      });
    } catch (error) {
      console.error('Error migrating users:', error);
      res.status(500).json({ message: "Failed to migrate users" });
    }
  });

  // Supabase auth sync endpoint
  app.post("/api/auth/sync-supabase-user", async (req, res) => {
    try {
      const { supabaseUser } = req.body;
      
      if (!supabaseUser || !supabaseUser.email) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid user data' 
        });
      }

      // If user is already logged in with the same email, skip re-authentication
      if (req.isAuthenticated() && req.user?.email === supabaseUser.email) {
        return res.json({ 
          success: true, 
          user: {
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            userType: req.user.userType,
            availableUserTypes: req.user.availableUserTypes,
            activeUserType: req.user.activeUserType,
            isVerified: req.user.isVerified,
            language: req.user.language
          }
        });
      }

      // Check if user already exists in our database
      let user = await storage.getUserByEmail(supabaseUser.email);
      
      if (!user) {
        // Create new user from Supabase data
        const firstName = supabaseUser.user_metadata?.firstName || 
                         supabaseUser.user_metadata?.first_name || 
                         supabaseUser.user_metadata?.full_name?.split(' ')[0] || 
                         'User';
        const lastName = supabaseUser.user_metadata?.lastName || 
                        supabaseUser.user_metadata?.last_name || 
                        supabaseUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 
                        '';
        
        user = await storage.createUser({
          email: supabaseUser.email,
          firstName,
          lastName,
          password: '', // Supabase handles authentication
          userType: 'user',
          availableUserTypes: ['user'], // Default to just user
          activeUserType: 'user',
          isVerified: true,
          supabaseId: supabaseUser.id,
          language: 'tr'
        });
      } else if (!user.supabaseId) {
        // Update existing user with Supabase ID
        await storage.updateUser(user.id, { supabaseId: supabaseUser.id });
        const updatedUser = await storage.getUserById(user.id);
        if (updatedUser) {
          user = updatedUser;
        }
      }

      // Set up session for passport
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to establish session' 
          });
        }
        
        return res.json({ 
          success: true, 
          user: {
            id: user!.id,
            email: user!.email,
            firstName: user!.firstName,
            lastName: user!.lastName,
            userType: user!.userType,
            availableUserTypes: user!.availableUserTypes,
            activeUserType: user!.activeUserType,
            isVerified: user!.isVerified,
            language: user!.language
          }
        });
      });
    } catch (error: any) {
      console.error('Error syncing Supabase user:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      
      // Destroy the session completely
      req.session?.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('Session destroy error:', destroyErr);
        }
      });
      
      // Clear the session cookie
      res.clearCookie('connect.sid');
      
      res.json({ success: true });
    });
  });
  
  // Note: File storage is now handled by Supabase Storage
  // No need for local upload directories


  // Initialize service categories
  app.get("/api/init", async (req, res) => {
    try {
      const categories = await storage.getServiceCategories();
      if (categories.length === 0) {
        // Create default categories
        const defaultCategories = [
          { name: "E-Ticaret Altyapısı", nameEn: "E-commerce Infrastructure", slug: "eticaret", icon: "fas fa-store", sortOrder: 1 },
          { name: "Entegrasyon", nameEn: "Integration", slug: "entegrasyon", icon: "fas fa-plug", sortOrder: 2 },
          { name: "Pazaryeri", nameEn: "Marketplace", slug: "pazaryeri", icon: "fas fa-shopping-cart", sortOrder: 3 },
          { name: "Ödeme", nameEn: "Payment", slug: "odeme", icon: "fas fa-credit-card", sortOrder: 4 },
          { name: "Pazar Analizi", nameEn: "Market Analysis", slug: "pazar-analizi", icon: "fas fa-chart-line", sortOrder: 5 },
          { name: "Gümrük", nameEn: "Customs", slug: "gumruk", icon: "fas fa-clipboard-check", sortOrder: 6 },
          { name: "Lojistik & Depo", nameEn: "Logistics & Warehouse", slug: "lojistik", icon: "fas fa-truck", sortOrder: 7 },
          { name: "Pazarlama & Reklam", nameEn: "Marketing & Advertising", slug: "pazarlama", icon: "fas fa-bullhorn", sortOrder: 8 },
          { name: "Fotoğraf", nameEn: "Photography", slug: "fotograf", icon: "fas fa-camera", sortOrder: 9 },
          { name: "Danışmanlık", nameEn: "Consulting", slug: "danismanlik", icon: "fas fa-user-tie", sortOrder: 10 },
          { name: "Hukuk", nameEn: "Legal", slug: "hukuk", icon: "fas fa-gavel", sortOrder: 11 },
          { name: "Finans & Muhasebe", nameEn: "Finance & Accounting", slug: "finans", icon: "fas fa-calculator", sortOrder: 12 },
          { name: "Marka Koruma", nameEn: "Brand Protection", slug: "marka", icon: "fas fa-shield-alt", sortOrder: 13 },
          { name: "Fuar & Etkinlik", nameEn: "Trade Fair & Events", slug: "fuar", icon: "fas fa-calendar-alt", sortOrder: 14 },
          { name: "Üretim", nameEn: "Manufacturing", slug: "uretim", icon: "fas fa-industry", sortOrder: 15 },
          { name: "Paketleme & Ambalaj", nameEn: "Packaging", slug: "paketleme", icon: "fas fa-box", sortOrder: 16 },
          { name: "IT & Yazılım", nameEn: "IT & Software", slug: "it", icon: "fas fa-code", sortOrder: 17 },
        ];

        for (const category of defaultCategories) {
          await storage.createServiceCategory(category);
        }
      }
      res.json({ message: "Initialization complete" });
    } catch (error) {
      res.status(500).json({ message: "Initialization failed" });
    }
  });

  // Service categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getServiceCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Services endpoints
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { name, description, category } = req.body;
      
      // Check if service already exists
      const existingService = await storage.getServiceByName(name);
      if (existingService) {
        return res.json(existingService);
      }

      const service = await storage.createService({
        name,
        description,
        categoryId: 1, // Default category ID
        isActive: true,
        createdBy: req.user!.id,
      });
      
      // Update category separately if provided
      if (category && category !== 'Genel') {
        await storage.updateService(service.id, { category });
      }

      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  // Partners
  app.get("/api/partners", async (req, res) => {
    try {
      const { category, search, limit, offset, admin } = req.query;
      
      // Admin can see all partners (including invisible ones), others see only visible partners
      const isAdmin = req.isAuthenticated() && 
        (req.user.userType === 'master_admin' || req.user.userType === 'editor_admin');
      const isAdminView = admin === 'true' && isAdmin;
      
      const partners = await storage.getPartners({
        category: category as string,
        search: search as string,
        visible: isAdminView ? undefined : true, // Admin view shows all, public view only visible
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(partners);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });

  // Get partner by ID or username (but not "me" - that's handled separately)
  app.get("/api/partners/:identifier", async (req, res) => {
    try {
      const identifier = req.params.identifier;
      
      // Skip if identifier is "me" - that should be handled by the specific /me route
      if (identifier === 'me') {
        return res.status(404).json({ message: "Use /api/partners/me endpoint directly" });
      }
      
      let partner;
      
      // Check if identifier is numeric (ID) or string (username)
      if (/^\d+$/.test(identifier)) {
        partner = await storage.getPartner(parseInt(identifier));
      } else {
        partner = await storage.getPartnerByUsername(identifier);
      }
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      // Increment profile view count for every visit
      await storage.incrementPartnerViews(partner.id);
      
      // Return updated partner data with incremented view count
      const updatedPartner = await storage.getPartner(partner.id);
      res.json(updatedPartner);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch partner" });
    }
  });

  // Partner applications
  app.post("/api/partner-applications", uploadDocuments.fields([
    { name: 'documents', maxCount: 10 },
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]), async (req, res) => {
    try {
      console.log('Request body:', req.body);
      // Temporary bypass validation for testing
      const applicationData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        company: req.body.company,
        contactPerson: req.body.contactPerson,
        username: req.body.username,
        website: req.body.website,
        serviceCategory: req.body.serviceCategory,
        businessDescription: req.body.businessDescription,
        companySize: req.body.companySize,
        foundingYear: req.body.foundingYear,
        sectorExperience: req.body.sectorExperience,
        targetMarkets: req.body.targetMarkets,
        services: req.body.services,
        dipAdvantages: req.body.dipAdvantages,
        whyPartner: req.body.whyPartner,
        references: req.body.references,
        linkedinProfile: req.body.linkedinProfile,
        twitterProfile: req.body.twitterProfile || '',
        instagramProfile: req.body.instagramProfile || '',
        facebookProfile: req.body.facebookProfile || '',
        status: 'pending' as const,
      };
      console.log('Parsed data:', applicationData);
      const application = await storage.createPartnerApplication(applicationData);
      
      // Upload files to Supabase Storage and store document info
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Handle logo upload with security validation
      if (files?.logo && files.logo[0]) {
        const logoFile = files.logo[0];
        
        // Validate the uploaded logo file
        const logoValidation = fileSecurityService.validateFile(logoFile);
        if (!logoValidation.valid) {
          console.error('Logo validation failed:', logoValidation.error);
          return res.status(400).json({ message: `Logo dosyası hatalı: ${logoValidation.error}` });
        }
        
        const logoUploadResult = await supabaseStorage.uploadPartnerLogo(logoFile, application.id.toString());
        if (logoUploadResult.success && logoUploadResult.url) {
          console.log('Logo uploaded:', logoUploadResult.url);
          await storage.updatePartnerApplicationLogo(application.id, logoUploadResult.url);
        } else {
          console.error('Logo upload failed:', logoUploadResult.error);
        }
      }
      
      // Handle cover image upload with security validation
      if (files?.coverImage && files.coverImage[0]) {
        const coverFile = files.coverImage[0];
        
        // Validate the uploaded cover image file
        const coverValidation = fileSecurityService.validateFile(coverFile);
        if (!coverValidation.valid) {
          console.error('Cover image validation failed:', coverValidation.error);
          return res.status(400).json({ message: `Kapak resmi hatalı: ${coverValidation.error}` });
        }
        
        const coverUploadResult = await supabaseStorage.uploadPartnerCover(coverFile, application.id.toString());
        if (coverUploadResult.success && coverUploadResult.url) {
          console.log('Cover image uploaded:', coverUploadResult.url);
        } else {
          console.error('Cover image upload failed:', coverUploadResult.error);
        }
      }
      
      // Handle document uploads with security validation
      if (files?.documents && files.documents.length > 0) {
        console.log(`Uploading ${files.documents.length} documents to Supabase Storage...`);
        for (const file of files.documents) {
          // Validate each document file
          const docValidation = fileSecurityService.validateFile(file);
          if (!docValidation.valid) {
            console.error('Document validation failed:', docValidation.error);
            return res.status(400).json({ message: `Belge hatalı (${file.originalname}): ${docValidation.error}` });
          }
          
          const uploadResult = await supabaseStorage.uploadPartnerDocument(file, application.id.toString());
          if (uploadResult.success && uploadResult.url) {
            console.log('Document uploaded:', uploadResult.url);
            
            // Sanitize filename before storing
            const sanitizedFilename = fileSecurityService.sanitizeFilename(file.originalname);
            
            await storage.addApplicationDocument({
              applicationId: application.id,
              fileName: sanitizedFilename,
              originalName: sanitizedFilename,
              filePath: uploadResult.url, // Store Supabase URL instead of local path
              fileSize: file.size,
              mimeType: file.mimetype,
            });
          } else {
            console.error('Document upload failed:', uploadResult.error);
            // Continue with other files even if one fails
          }
        }
      }

      // Send email notifications
      try {
        // 1. Send to admins
        const admins = await storage.getAdminUsers();
        const adminEmails = admins.map(admin => admin.email);
        console.log('Admin emails:', adminEmails);
        
        if (adminEmails.length > 0) {
          const adminEmailTemplate = resendService.createAdminPartnerApplicationNotificationEmail(
            `${application.firstName} ${application.lastName}`,
            application.company,
            application.email,
            application.phone
          );
          
          await resendService.sendEmail({
            to: adminEmails,
            subject: adminEmailTemplate.subject,
            html: adminEmailTemplate.html,
            tags: [{ name: 'type', value: 'admin_notification' }]
          });
          console.log('Admin notification email sent via Resend');
        }

        // 2. Send to applicant
        const applicantEmailTemplate = resendService.createPartnerApplicationConfirmationEmail(
          `${application.firstName} ${application.lastName}`,
          application.id
        );
        
        await resendService.sendEmail({
          to: application.email,
          subject: applicantEmailTemplate.subject,
          html: applicantEmailTemplate.html,
          tags: [{ name: 'type', value: 'application_confirmation' }]
        });
        console.log('Applicant confirmation email sent via Resend');

        // 3. Add to Resend audience
        await resendService.addToAudience({
          email: application.email,
          firstName: application.firstName,
          lastName: application.lastName,
          phone: application.phone,
          company: application.company,
          userType: 'applicant'
        });
        console.log('Contact added to Resend audience');
        
      } catch (emailError: any) {
        console.error('Email notification failed:', emailError);
        // Don't block the application if email fails
      }
      
      console.log('Partner application created successfully:', application.id);
      
      res.status(201).json(application);
    } catch (error) {
      console.error('Detailed error:', error);
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create application", details: (error as Error).message });
    }
  });

  // Application status for tracking
  app.get("/api/application-status/:id", async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getPartnerApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Return public information only
      res.json({
        id: application.id,
        firstName: application.firstName,
        lastName: application.lastName,
        company: application.company,
        email: application.email,
        phone: application.phone,
        status: application.status,
        createdAt: application.createdAt,
        reviewedAt: application.reviewedAt,
        reviewNotes: application.notes,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch application status" });
    }
  });

  app.get("/api/partner-applications", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { status } = req.query;
      const applications = await storage.getPartnerApplications(status as string);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.patch("/api/partner-applications/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { status, notes } = req.body;
      const applicationId = parseInt(req.params.id);

      const application = await storage.updatePartnerApplication(
        applicationId,
        {
          status,
          notes,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
        }
      );

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // If application is approved, create or update partner profile
      if (status === 'approved') {
        // Check if user exists in our database
        let user = await storage.getUserByEmail(application.email);
        
        if (!user) {
          try {
            // Create Supabase user account with email/password flow
            const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
              email: application.email,
              email_confirm: true, // Skip email confirmation since this is admin-approved
              user_metadata: {
                firstName: application.firstName,
                lastName: application.lastName,
                phone: application.phone,
                userType: 'partner',
                companyName: application.company
              }
            });

            if (supabaseError) {
              console.error('Supabase user creation error:', supabaseError);
              throw new Error(`Supabase kullanıcı hesabı oluşturulamadı: ${supabaseError.message}`);
            }

            console.log('Supabase user created:', supabaseUser.user?.id);

            // Create local user record
            user = await storage.createUser({
              email: application.email,
              password: 'supabase-managed', // Password is managed by Supabase
              firstName: application.firstName,
              lastName: application.lastName,
              phone: application.phone,
              userType: 'partner',
              availableUserTypes: ['user', 'partner'], // User can switch between user and partner
              activeUserType: 'partner', // Start as partner since application was approved
              isVerified: true,
              supabaseId: supabaseUser.user?.id, // Link to Supabase user
            });

            // Send password setup email via Supabase
            const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email: application.email,
              options: {
                redirectTo: `${req.protocol}://${req.get('host')}/auth`
              }
            });

            if (resetError) {
              console.error('Password setup email error:', resetError);
            } else {
              console.log('Password setup email sent to:', application.email);
            }

            // Send partner approval email via Resend
            const approvalEmailTemplate = resendService.createPartnerApprovalEmail(
              application.firstName,
              application.company,
              `${process.env.VITE_APP_URL || 'https://partner.dip.tc'}/partner-login?setup=true`
            );

            const emailResult = await resendService.sendEmail({
              to: application.email,
              subject: approvalEmailTemplate.subject,
              html: approvalEmailTemplate.html
            });

            if (emailResult.success) {
              console.log('Partner approval email sent via Resend');
            } else {
              console.error('Failed to send partner approval email:', emailResult.error);
            }

          } catch (error) {
            console.error('Error creating partner account:', error);
            throw error;
          }
        }

        // Create or update partner profile with all the application data
        const partnerData = {
          userId: user.id,
          companyName: application.company,
          contactPerson: application.contactPerson,
          serviceCategory: application.serviceCategory,
          description: application.businessDescription,
          services: application.services,
          dipAdvantages: application.dipAdvantages,
          companySize: application.companySize,
          foundingYear: application.foundingYear,
          sectorExperience: application.sectorExperience,
          targetMarkets: application.targetMarkets,
          website: application.website,
          linkedinProfile: application.linkedinProfile,
          twitterProfile: application.twitterProfile,
          instagramProfile: application.instagramProfile,
          facebookProfile: application.facebookProfile,
          username: application.username,
          isApproved: true,
          isActive: true,
        };

        // Check if partner already exists
        const existingPartner = await storage.getPartnerByUserId(user.id);
        if (existingPartner) {
          await storage.updatePartner(existingPartner.id, partnerData);
        } else {
          await storage.createPartner(partnerData);
        }

        // Update user's available user types if they're not already set
        if (!user.availableUserTypes || !user.availableUserTypes.includes('partner')) {
          const currentTypes = user.availableUserTypes || ['user'];
          if (!currentTypes.includes('partner')) {
            currentTypes.push('partner');
          }
          await storage.updateUser(user.id, {
            availableUserTypes: currentTypes,
            activeUserType: 'partner' // Set as partner since application was approved
          });
        }
      }

      res.json(application);
    } catch (error) {
      console.error('Error updating partner application:', error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Quote requests
  app.post("/api/quote-requests", async (req, res) => {
    try {
      console.log('Quote request received:', req.body);
      console.log('User authenticated:', req.isAuthenticated());
      console.log('User info:', req.user);

      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const requestData = insertQuoteRequestSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      console.log('Parsed request data:', requestData);
      
      const request = await storage.createQuoteRequest(requestData);
      
      console.log('Quote request created successfully:', request.id);
      
      res.status(201).json(request);
    } catch (error) {
      console.error('Quote request error:', error);
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create quote request", error: (error as Error).message });
    }
  });

  app.get("/api/quote-requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { partnerId } = req.query;
      let requests;

      if (req.user!.userType === "partner" || req.user!.activeUserType === "partner") {
        const partner = await storage.getPartnerByUserId(req.user!.id);
        
        if (!partner) {
          return res.status(404).json({ message: "Partner profile not found" });
        }
        requests = await storage.getQuoteRequests(partner.id);
      } else if (partnerId) {
        requests = await storage.getQuoteRequests(parseInt(partnerId as string));
      } else {
        requests = await storage.getQuoteRequests(undefined, req.user!.id);
      }

      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quote requests" });
    }
  });

  // Update partner username (one-time only)
  app.patch("/api/partners/me/username", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!req.user || (req.user.userType !== "partner" && req.user.activeUserType !== "partner")) {
        return res.status(403).json({ message: "Partner access required" });
      }

      const { username } = req.body;
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({ message: "Valid username is required" });
      }

      // Clean username (lowercase, remove spaces, special chars)
      const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
      if (cleanUsername.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }

      const partner = await storage.getPartnerByUserId(req.user.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      // Check if username has already been changed
      if (partner.usernameChanged) {
        return res.status(400).json({ 
          message: "Kullanıcı adı bir kez değiştirilebilir. Bir talebiniz varsa yönetici ile iletişime geçin." 
        });
      }

      // Check if username is already taken
      const existingPartner = await storage.getPartnerByUsername(cleanUsername);
      if (existingPartner && existingPartner.id !== partner.id) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }

      // Update username and mark as changed
      await storage.updatePartner(partner.id, { 
        username: cleanUsername, 
        usernameChanged: true 
      });

      res.json({ message: "Kullanıcı adı başarıyla güncellendi", username: cleanUsername });
    } catch (error) {
      console.error('Error updating username:', error);
      res.status(500).json({ message: "Failed to update username" });
    }
  });

  // Partner following
  app.post("/api/partners/:id/follow", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.followPartner(req.user!.id, parseInt(req.params.id));
      res.json({ message: "Partner followed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to follow partner" });
    }
  });

  app.delete("/api/partners/:id/follow", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.unfollowPartner(req.user!.id, parseInt(req.params.id));
      res.json({ message: "Partner unfollowed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to unfollow partner" });
    }
  });

  app.get("/api/partners/:id/following", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const isFollowing = await storage.isFollowingPartner(req.user!.id, parseInt(req.params.id));
      res.json({ isFollowing });
    } catch (error) {
      res.status(500).json({ message: "Failed to check following status" });
    }
  });

  // Get partner view statistics
  app.get("/api/partners/:id/view-stats", async (req, res) => {
    try {
      const partnerId = parseInt(req.params.id);
      const days = parseInt(req.query.days as string) || 7;
      const stats = await storage.getPartnerViewStats(partnerId, days);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching partner view stats:', error);
      res.status(500).json({ message: 'Failed to fetch view statistics' });
    }
  });

  // Get partner followers
  app.get("/api/partners/:id/followers", async (req, res) => {
    try {
      const partnerId = parseInt(req.params.id);
      const followers = await storage.getPartnerFollowers(partnerId);
      res.json(followers);
    } catch (error) {
      console.error('Error fetching partner followers:', error);
      res.status(500).json({ message: 'Failed to fetch followers' });
    }
  });

  // This route has been moved to line 1316 with multer support for file uploads

  // User unfollow partner endpoint (different from partner endpoint)
  app.delete("/api/user/follow/:partnerId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.unfollowPartner(req.user!.id, parseInt(req.params.partnerId));
      res.json({ message: "Partner unfollowed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to unfollow partner" });
    }
  });

  // Submit satisfaction rating for quote request
  app.post("/api/quote-requests/:id/satisfaction", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const quoteRequestId = parseInt(req.params.id);
      const { rating } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Invalid rating. Must be between 1 and 5." });
      }

      await storage.updateQuoteRequestSatisfaction(quoteRequestId, rating);
      res.json({ message: "Satisfaction rating submitted successfully" });
    } catch (error) {
      console.error('Error submitting satisfaction rating:', error);
      res.status(500).json({ message: "Failed to submit satisfaction rating" });
    }
  });

  // Get partner profile for current user
  app.get("/api/partners/me", async (req, res) => {
    console.log('==== INSIDE /api/partners/me ENDPOINT ====');
    console.log('Request path:', req.path);
    console.log('Request user:', req.user);
    console.log('Is authenticated:', req.isAuthenticated());
    
    try {
      if (!req.isAuthenticated()) {
        console.log('User not authenticated, returning 401');
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log('Fetching partner for userId:', req.user!.id);
      
      // Add Drizzle schema import debugging
      const partner = await storage.getPartnerByUserId(req.user!.id);
      console.log('Partner query result:', partner);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      console.log('Getting user contact information...');
      // Also get user contact information
      const user = await storage.getUser(req.user!.id);
      console.log('User contact info:', user ? { email: user.email, phone: user.phone } : 'User not found');
      
      const partnerWithContact = {
        ...partner,
        contactEmail: user?.email,
        contactPhone: user?.phone
      };
      
      console.log('Sending response with partner data...');
      console.log('Final response:', JSON.stringify(partnerWithContact, null, 2));
      return res.json(partnerWithContact);
    } catch (error) {
      console.error('Error fetching partner profile:', error);
      res.status(500).json({ message: "Failed to fetch partner profile" });
    }
  });

  // Get partner followers
  app.get("/api/partners/me/followers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const partner = await storage.getPartnerByUserId(req.user!.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const followers = await storage.getPartnerFollowers(partner.id);
      res.json(followers);
    } catch (error) {
      console.error('Error fetching partner followers:', error);
      res.status(500).json({ message: "Failed to fetch followers" });
    }
  });

  // Update partner profile (for partners to update their own profile)
  app.patch("/api/partners/me", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log('User updating profile:', req.user);
      console.log('Request body:', req.body);
      
      const partner = await storage.getPartnerByUserId(req.user!.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner profile not found" });
      }

      const updates = req.body;
      console.log('Profile updates:', updates);
      
      // If updating username, validate it
      if (updates.username) {
        // Check if username is valid (no Turkish characters, no spaces, alphanumeric + underscore/dash)
        if (!/^[a-zA-Z0-9_-]+$/.test(updates.username)) {
          return res.status(400).json({ 
            message: "Kullanıcı adı sadece İngilizce harfler, rakamlar, alt çizgi ve tire içerebilir" 
          });
        }
        
        // Check if username is taken
        const existingPartner = await storage.getPartnerByUsername(updates.username);
        if (existingPartner && existingPartner.id !== partner.id) {
          return res.status(400).json({ 
            message: "Bu kullanıcı adı zaten kullanılıyor" 
          });
        }
      }

      const updatedPartner = await storage.updatePartner(partner.id, updates);
      console.log('Updated partner:', updatedPartner);
      
      // Invalidate and refresh cache
      res.json(updatedPartner);
    } catch (error) {
      console.error('Error updating partner profile:', error);
      res.status(500).json({ message: "Failed to update partner profile" });
    }
  });

  // User profile management routes  
  app.get("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const profile = await storage.getUserProfile(req.user.id);
      res.json(profile || {});
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.json({});
    }
  });

  app.put("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const profile = await storage.updateUserProfile(req.user.id, req.body);
      res.json(profile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  app.get("/api/user/billing", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const billing = await storage.getUserBillingInfo(req.user.id);
      res.json(billing || {});
    } catch (error) {
      console.error('Error fetching billing info:', error);
      res.json({});
    }
  });

  app.put("/api/user/billing", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const billing = await storage.updateUserBillingInfo(req.user.id, req.body);
      res.json(billing);
    } catch (error) {
      console.error('Error updating billing info:', error);
      res.status(500).json({ error: 'Failed to update billing info' });
    }
  });

  app.get("/api/user/followed-partners", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const partners = await storage.getUserFollowedPartners(req.user.id);
      res.json(partners || []);
    } catch (error) {
      console.error('Error fetching followed partners:', error);
      res.json([]);
    }
  });

  // Service requests routes
  app.get("/api/user/quote-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const requests = await storage.getUserQuoteRequests(req.user.id);
      res.json(requests || []);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      res.json([]);
    }
  });

  app.get("/api/user/suggested-partners", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const partners = await storage.getSuggestedPartners(req.user.id);
      res.json(partners || []);
    } catch (error) {
      console.error('Error fetching suggested partners:', error);
      res.json([]);
    }
  });

  // Profile image route
  app.post("/api/user/profile-image", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { profileImageURL } = req.body;
      
      // Validate the profile image URL
      const urlValidation = emailSecurity.validateUrl(profileImageURL);
      if (!urlValidation.valid) {
        return res.status(400).json({ error: `Geçersiz profil resmi URL'si: ${urlValidation.error}` });
      }
      
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(profileImageURL);
      
      // Update user profile with the image path
      await storage.updateUserProfile(req.user.id, { profileImage: objectPath });
      
      res.json({ success: true, objectPath });
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ error: "Failed to update profile image" });
    }
  });

  // Messages routes
  app.get("/api/user/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const conversations = await storage.getUserConversations(req.user.id);
      res.json(conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.json([]);
    }
  });

  // Get unread messages count
  app.get("/api/messages/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const count = await storage.getUnreadMessagesCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
      res.json({ count: 0 });
    }
  });

  // Mark messages as read in a conversation
  app.post("/api/conversations/:conversationId/mark-read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { conversationId } = req.params;
      await storage.markMessagesAsRead(conversationId, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // File upload for chat messages
  app.post("/api/upload/file", fileSecurityService.createSecureUpload().single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      
      // Validate the uploaded file
      const validation = fileSecurityService.validateFile(file);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      
      const folder = req.body.folder || 'chat-files';
      
      // Generate secure filename using crypto
      const timestamp = Date.now();
      const crypto = require('crypto');
      const randomString = crypto.randomBytes(16).toString('hex');
      const extension = path.extname(file.originalname).toLowerCase();
      const sanitizedName = fileSecurityService.sanitizeFilename(file.originalname);
      const fileName = `${folder}/${timestamp}-${randomString}${extension}`;

      // Upload to Supabase Storage
      const { uploadFile } = await import('./supabase-storage');
      const uploadResult = await uploadFile(file.buffer, fileName, file.mimetype);
      
      if (uploadResult.error) {
        console.error('Supabase upload error:', uploadResult.error);
        return res.status(500).json({ error: "File upload failed" });
      }

      res.json({ 
        url: uploadResult.publicUrl,
        fileName: sanitizedName,
        size: file.size,
        type: file.mimetype
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: "File upload failed" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      let { recipientId, message, conversationId, fileUrl, fileName } = req.body;
      const senderId = req.user.id;
      
      // Validate and sanitize input
      if (message) {
        message = emailSecurity.sanitizeText(message);
      }
      if (fileName) {
        fileName = fileSecurityService.sanitizeFilename(fileName);
      }
      if (fileUrl) {
        const urlValidation = emailSecurity.validateUrl(fileUrl);
        if (!urlValidation.valid) {
          return res.status(400).json({ error: `Geçersiz dosya URL'si: ${urlValidation.error}` });
        }
      }
      
      // Check if sender is a partner and trying to initiate new conversation
      const [senderPartner] = await db.select().from(partners).where(eq(partners.userId, senderId));
      if (senderPartner) {
        // Partner can only reply to existing conversations, not initiate new ones
        const existingMessages = await storage.getConversationMessages(conversationId);
        if (existingMessages.length === 0) {
          return res.status(403).json({ error: 'Partners cannot initiate new conversations' });
        }
      }
      
      const newMessage = await storage.createMessage({
        senderId,
        receiverId: recipientId,
        message: message,
        fileUrl: fileUrl || null,
        fileName: fileName || null
      });

      // Send real-time notification to receiver via Socket.IO
      // The message will include the conversationId for the frontend
      const messageWithConversationId = {
        ...newMessage,
        conversationId: conversationId
      };

      res.json(messageWithConversationId);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.get("/api/conversations/:conversationId/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { conversationId } = req.params;
      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.patch("/api/conversations/:conversationId/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      await storage.markMessagesAsRead(conversationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // File upload endpoints for messaging
  app.post("/api/messages/upload", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error getting upload URL:', error);
      res.status(500).json({ error: 'Failed to get upload URL' });
    }
  });

  // Objects upload route for profile photos
  app.post("/api/objects/upload", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve uploaded files
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving file:", error);
      return res.status(404).json({ error: "File not found" });
    }
  });



  // Get application with documents
  app.get("/api/partner-applications/:id/details", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getPartnerApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const documents = await storage.getApplicationDocuments(applicationId);
      
      res.json({
        ...application,
        documents,
      });
    } catch (error: any) {
      console.error('Error fetching application details:', error);
      res.status(500).json({ message: 'Failed to fetch application details' });
    }
  });

  // Download application document (redirect to Supabase Storage URL)
  app.get('/api/partner-applications/:applicationId/documents/:documentId/download', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Check if user is admin
    if (req.user?.userType !== 'master_admin' && req.user?.userType !== 'editor_admin') {
      return res.sendStatus(403);
    }

    try {
      const { applicationId, documentId } = req.params;
      const document = await storage.getApplicationDocument(parseInt(documentId));
      
      if (!document || document.applicationId !== parseInt(applicationId)) {
        return res.status(404).json({ message: 'Belge bulunamadı' });
      }

      // For Supabase Storage URLs, redirect to the direct URL
      if (document.filePath.startsWith('http')) {
        res.redirect(document.filePath);
      } else {
        // Legacy local file handling (fallback)
        if (!fs.existsSync(document.filePath)) {
          return res.status(404).json({ message: 'Dosya bulunamadı' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
        res.setHeader('Content-Type', document.mimeType);
        
        const fileStream = fs.createReadStream(document.filePath);
        fileStream.pipe(res);
      }
    } catch (error: any) {
      console.error('Error downloading document:', error);
      res.status(500).json({ message: 'Dosya indirilemedi' });
    }
  });

  // OTP endpoints
  const netgsmService = createNetGsmService();

  // Start registration with phone verification
  app.post('/api/auth/register/start', async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      // Validate input
      if (!email || !password || !firstName || !lastName || !phone) {
        return res.status(400).json({ message: 'Tüm alanlar gereklidir' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Bu email adresi zaten kullanılıyor' });
      }

      // Check NetGSM service availability
      if (!netgsmService) {
        return res.status(500).json({ message: 'SMS servisi kullanılamıyor' });
      }

      // Format phone number
      const formattedPhone = netgsmService.formatPhoneNumber(phone);

      // Generate OTP code
      const otpCode = netgsmService.generateOtpCode();

      // Hash password
      const salt = randomBytes(16).toString("hex");
      const hashedPassword = (await scryptAsync(password, salt, 64) as Buffer).toString("hex") + "." + salt;

      // Store temporary user data
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await storage.createTempUserRegistration({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: formattedPhone,
        verificationCode: otpCode,
        expiresAt,
      });

      // Store OTP code
      await storage.createSmsOtpCode({
        phone: formattedPhone,
        code: otpCode,
        purpose: 'registration',
        expiresAt,
      });

      // Send OTP SMS
      const smsResult = await netgsmService.sendOtpSms(formattedPhone, otpCode);

      if (smsResult.success) {
        res.json({ 
          success: true, 
          message: 'Doğrulama kodu gönderildi',
          phone: formattedPhone 
        });
      } else {
        res.status(500).json({ message: smsResult.message });
      }

    } catch (error) {
      console.error('Registration start error:', error);
      res.status(500).json({ message: 'Kayıt işlemi başlatılamadı' });
    }
  });

  // Complete registration with OTP verification
  app.post('/api/auth/register/verify', async (req, res) => {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ message: 'Telefon numarası ve doğrulama kodu gerekli' });
      }

      // Verify OTP code
      const isValidOtp = await storage.verifySmsOtpCode(phone, code, 'registration');
      if (!isValidOtp) {
        return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş doğrulama kodu' });
      }

      // Get temporary user data
      const tempUser = await storage.getTempUserRegistration(phone);
      if (!tempUser) {
        return res.status(400).json({ message: 'Kayıt bilgileri bulunamadı' });
      }

      // Check if temp registration expired
      if (tempUser.expiresAt < new Date()) {
        await storage.deleteTempUserRegistration(phone);
        return res.status(400).json({ message: 'Kayıt süresi dolmuş, lütfen tekrar deneyin' });
      }

      // Create user
      const user = await storage.createUser({
        email: tempUser.email,
        password: tempUser.password,
        firstName: tempUser.firstName,
        lastName: tempUser.lastName,
        phone: tempUser.phone,
        isVerified: true,
        userType: 'user',
      });

      // Clean up temporary data
      await storage.deleteTempUserRegistration(phone);

      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return res.status(500).json({ message: 'Kayıt başarılı ancak giriş yapılamadı' });
        }
        res.json({ success: true, user, message: 'Kayıt başarıyla tamamlandı' });
      });

    } catch (error) {
      console.error('Registration verify error:', error);
      res.status(500).json({ message: 'Doğrulama işlemi tamamlanamadı' });
    }
  });

  // Resend OTP code
  app.post('/api/auth/resend-otp', async (req, res) => {
    try {
      const { phone, purpose = 'registration' } = req.body;

      if (!phone) {
        return res.status(400).json({ message: 'Telefon numarası gerekli' });
      }

      if (!netgsmService) {
        return res.status(500).json({ message: 'SMS servisi kullanılamıyor' });
      }

      // Generate new OTP code
      const otpCode = netgsmService.generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store new OTP code
      await storage.createSmsOtpCode({
        phone,
        code: otpCode,
        purpose,
        expiresAt,
      });

      // Send OTP SMS
      const smsResult = await netgsmService.sendOtpSms(phone, otpCode);

      if (smsResult.success) {
        res.json({ 
          success: true, 
          message: 'Yeni doğrulama kodu gönderildi' 
        });
      } else {
        res.status(500).json({ message: smsResult.message });
      }

    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ message: 'Doğrulama kodu gönderilemedi' });
    }
  });

  // Get quote response by quote request ID
  app.get("/api/quote-requests/:id/response", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const quoteRequestId = parseInt(req.params.id);
      const quoteResponse = await storage.getQuoteResponseByRequestId(quoteRequestId);
      
      if (!quoteResponse) {
        return res.status(404).json({ message: "Quote response not found" });
      }

      // Check permissions
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      const quoteRequest = await storage.getQuoteRequestById(quoteRequestId);
      
      const canView = 
        (user!.userType === 'partner' && partner && partner.id === quoteRequest?.partnerId) ||
        (user!.userType === 'user' && quoteRequest?.userId === user!.id) ||
        (user!.userType === 'master_admin' || user!.userType === 'editor_admin');
      
      if (!canView) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      res.json(quoteResponse);
    } catch (error) {
      console.error('Error fetching quote response:', error);
      res.status(500).json({ message: "Failed to fetch quote response" });
    }
  });

  // Quote response endpoints
  app.post("/api/quote-requests/:id/respond", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const quoteId = parseInt(req.params.id);
      const { response, amount, notes } = req.body;

      const quoteRequest = await storage.updateQuoteRequest(quoteId, {
        status: "responded"
      });

      if (!quoteRequest) {
        return res.status(404).json({ message: "Quote request not found" });
      }

      // Send email notification to user
      try {
        const user = await storage.getUser(quoteRequest.userId!);
        const partner = await storage.getPartnerByUserId(req.user!.id);
        
        if (user && partner) {
          const quoteResponseTemplate = emailTemplates.serviceRequest.toUser(
            { fullName: user.firstName + ' ' + user.lastName, serviceNeeded: quoteRequest.serviceNeeded, budget: quoteRequest.budget },
            partner
          );
          
          await sendEmail({
            to: user.email,
            subject: quoteResponseTemplate.subject,
            html: quoteResponseTemplate.html,
          });
        }
      } catch (emailError) {
        console.error('Quote response email notification failed:', emailError);
      }

      res.json(quoteRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to respond to quote request" });
    }
  });

  // Quote approval/rejection
  app.patch("/api/quote-requests/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const quoteId = parseInt(req.params.id);
      const { status, reason } = req.body;

      const quoteRequest = await storage.updateQuoteRequest(quoteId, {
        status
      });

      if (!quoteRequest) {
        return res.status(404).json({ message: "Quote request not found" });
      }

      // Send email notifications
      try {
        const partner = await storage.getPartner(quoteRequest.partnerId);
        const partnerUser = partner ? await storage.getUser(partner.userId) : null;
        const user = await storage.getUser(quoteRequest.userId!);
        
        if (partner && partnerUser && user) {
          if (status === 'approved') {
            // Get user's company information
            const userCompanyInfo = await storage.getUserBillingInfo(user.id);
            
            // Send to partner
            const partnerTemplate = emailTemplates.quoteStatus.approved.toPartner(
              partner.companyName,
              `${user.firstName} ${user.lastName}`
            );
            
            await sendEmail({
              to: partnerUser.email,
              subject: partnerTemplate.subject,
              html: partnerTemplate.html,
            });

            // Send to user
            const userTemplate = emailTemplates.quoteStatus.approved.toUser(
              `${user.firstName} ${user.lastName}`,
              partner.companyName
            );
            
            await sendEmail({
              to: user.email,
              subject: userTemplate.subject,
              html: userTemplate.html,
            });
          } else if (status === 'rejected') {
            const rejectionTemplate = emailTemplates.quoteStatus.rejected.toPartner(
              partner.companyName,
              `${user.firstName} ${user.lastName}`
            );
            
            await sendEmail({
              to: partnerUser.email,
              subject: rejectionTemplate.subject,
              html: rejectionTemplate.html,
            });
          }
        }
      } catch (emailError) {
        console.error('Quote status email notification failed:', emailError);
      }

      res.json(quoteRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to update quote status" });
    }
  });

  // Delete partner (admin only)
  app.delete("/api/partners/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = req.user!;
      if (!["master_admin", "editor_admin"].includes(user.userType)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const partnerId = parseInt(req.params.id);
      
      // Get partner details before deletion
      const partner = await storage.getPartner(partnerId);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      // Delete the partner (this should cascade to delete related data)
      await storage.deletePartner(partnerId);

      res.json({ 
        success: true, 
        message: "Partner deleted successfully",
        deletedPartner: {
          id: partner.id,
          companyName: partner.companyName
        }
      });
    } catch (error) {
      console.error('Error deleting partner:', error);
      res.status(500).json({ message: "Failed to delete partner" });
    }
  });

  // Payment completion notification
  app.post("/api/payments/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { quoteRequestId, paymentData } = req.body;

      // Update quote request status to paid
      const quoteRequest = await storage.updateQuoteRequest(quoteRequestId, {
        status: 'completed'
      });

      if (!quoteRequest) {
        return res.status(404).json({ message: "Quote request not found" });
      }

      // Send payment completion email
      try {
        const partner = await storage.getPartner(quoteRequest.partnerId);
        const user = await storage.getUser(quoteRequest.userId!);
        
        if (partner && user) {
          const paymentTemplate = emailTemplates.paymentComplete(
            quoteRequest,
            partner
          );
          
          await sendEmail({
            to: user.email,
            subject: paymentTemplate.subject,
            html: paymentTemplate.html,
          });
        }
      } catch (emailError) {
        console.error('Payment completion email notification failed:', emailError);
      }

      res.json({ success: true, message: "Payment processed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  // Test email endpoint
  app.post("/api/test-email", async (req, res) => {
    try {
      const { to, subject, message } = req.body;
      
      const result = await sendEmail({
        to,
        subject,
        html: `<p>${message}</p>`,
      });
      
      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error('Test email failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Partner posts endpoints
  app.get("/api/partners/:id/posts", async (req, res) => {
    try {
      const partnerId = parseInt(req.params.id);
      const posts = await storage.getPartnerPosts(partnerId);
      res.json(posts);
    } catch (error) {
      console.error('Error fetching partner posts:', error);
      res.status(500).json({ message: "Failed to fetch partner posts" });
    }
  });

  app.post("/api/partners/:id/posts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const partnerId = parseInt(req.params.id);
      console.log('Creating post for partner ID:', partnerId);
      console.log('Request body:', req.body);
      console.log('User ID:', req.user!.id);
      
      const partner = await storage.getPartner(partnerId);
      console.log('Found partner:', partner ? `${partner.companyName} (${partner.id})` : 'null');
      
      if (!partner || partner.userId !== req.user!.id) {
        return res.status(403).json({ message: "You can only create posts for your own partner profile" });
      }

      const postData = {
        partnerId,
        ...req.body
      };
      
      console.log('Post data to insert:', postData);

      const newPost = await storage.createPartnerPost(postData);
      console.log('Created post:', newPost);
      res.json(newPost);
    } catch (error) {
      console.error('Error creating partner post:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to create partner post" });
    }
  });

  // Delete partner post (owner or admin only)
  app.delete("/api/partners/:partnerId/posts/:postId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const partnerId = parseInt(req.params.partnerId);
      const postId = parseInt(req.params.postId);
      
      const partner = await storage.getPartner(partnerId);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      // Allow partner owner or admins to delete posts
      const isOwner = partner.userId === req.user!.id;
      const isAdmin = req.user!.userType === 'master_admin' || req.user!.userType === 'editor_admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "You can only delete your own posts or you must be an admin" });
      }

      await storage.deletePartnerPost(postId);
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error('Error deleting partner post:', error);
      res.status(500).json({ message: "Failed to delete partner post" });
    }
  });

  // Configure multer for profile image uploads (using memory storage for Supabase)
  // Secure image upload configuration
  const uploadProfileImages = new FileSecurityService({
    maxFileSize: 5 * 1024 * 1024, // 5MB limit
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    allowedMimeTypes: [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp'
    ]
  }).createSecureUpload();

  // Partner profile update endpoint with file upload
  app.patch("/api/partners/:id", uploadProfileImages.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]), async (req, res) => {
    try {
      console.log('Partner update request - User:', req.user?.id, 'Partner ID:', req.params.id);
      console.log('Request authenticated:', req.isAuthenticated());
      console.log('Files received:', req.files);
      console.log('Body:', req.body);
      console.log('Content-Type:', req.headers['content-type']);
      
      // Log each file details
      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        Object.keys(files).forEach(key => {
          console.log(`File ${key}:`, {
            filename: files[key][0].filename,
            originalname: files[key][0].originalname,
            mimetype: files[key][0].mimetype,
            size: files[key][0].size,
            path: files[key][0].path
          });
        });
      } else {
        console.log('No files received in req.files');
      }

      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const partnerId = parseInt(req.params.id);
      const partner = await storage.getPartner(partnerId);
      
      console.log('Found partner:', partner);
      console.log('Partner userId:', partner?.userId, 'Request userId:', req.user!.id);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      // Allow partner owner or admins to update
      const isOwner = partner.userId === req.user!.id;
      const isAdmin = req.user!.userType === 'master_admin' || req.user!.userType === 'editor_admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "You can only update your own partner profile or you must be an admin" });
      }

      const updates: any = {};
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Handle file uploads to Supabase Storage with security validation
      if (files && files.logo && files.logo[0]) {
        console.log('Uploading logo to Supabase Storage...');
        
        // Validate the logo file
        const logoValidation = new FileSecurityService({
          maxFileSize: 5 * 1024 * 1024,
          allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        }).validateFile(files.logo[0]);
        
        if (!logoValidation.valid) {
          console.error('Logo validation failed:', logoValidation.error);
          return res.status(400).json({ error: `Logo dosyası hatalı: ${logoValidation.error}` });
        }
        
        const logoResult = await supabaseStorage.uploadPartnerLogo(files.logo[0], partnerId.toString());
        if (logoResult.success) {
          updates.logo = logoResult.url;
          console.log('Logo uploaded to Supabase:', updates.logo);
        } else {
          console.error('Logo upload failed:', logoResult.error);
          return res.status(500).json({ error: 'Failed to upload logo: ' + logoResult.error });
        }
      }
      
      if (files && files.coverImage && files.coverImage[0]) {
        console.log('Uploading cover image to Supabase Storage...');
        
        // Validate the cover image file
        const coverValidation = new FileSecurityService({
          maxFileSize: 5 * 1024 * 1024,
          allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        }).validateFile(files.coverImage[0]);
        
        if (!coverValidation.valid) {
          console.error('Cover image validation failed:', coverValidation.error);
          return res.status(400).json({ error: `Kapak resmi hatalı: ${coverValidation.error}` });
        }
        
        const coverResult = await supabaseStorage.uploadPartnerCover(files.coverImage[0], partnerId.toString());
        if (coverResult.success) {
          updates.coverImage = coverResult.url;
          console.log('Cover image uploaded to Supabase:', updates.coverImage);
        } else {
          console.error('Cover upload failed:', coverResult.error);
          return res.status(500).json({ error: 'Failed to upload cover image: ' + coverResult.error });
        }
      }
      
      // Handle text updates
      if (req.body.description !== undefined) {
        updates.description = req.body.description;
        console.log('Setting description:', updates.description);
      }
      
      // Handle admin-only fields
      if (isAdmin) {
        if (req.body.isActive !== undefined) {
          updates.isActive = req.body.isActive === 'true' || req.body.isActive === true;
          console.log('Setting isActive:', updates.isActive);
        }
        if (req.body.isVisible !== undefined) {
          updates.isVisible = req.body.isVisible === 'true' || req.body.isVisible === true;
          console.log('Setting isVisible:', updates.isVisible);
        }
      }

      console.log('Final updates to apply:', updates);
      console.log('Updates keys:', Object.keys(updates));
      
      const updatedPartner = await storage.updatePartner(partnerId, updates);
      console.log('Partner updated successfully:', updatedPartner);
      console.log('Final logo path:', updatedPartner?.logo);
      console.log('Final coverImage path:', updatedPartner?.coverImage);
      
      res.json(updatedPartner);
    } catch (error) {
      console.error('Error updating partner:', error);
      res.status(500).json({ message: "Failed to update partner" });
    }
  });

  // Admin API endpoints - Master Admin only
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'master_admin') {
      return res.sendStatus(403);
    }
    
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get partner details for admin inspection
  app.get("/api/admin/partners/:partnerId", async (req, res) => {
    if (!req.isAuthenticated() || !['master_admin', 'editor_admin'].includes(req.user.userType)) {
      return res.sendStatus(403);
    }
    
    try {
      const partnerId = parseInt(req.params.partnerId);
      const partner = await storage.getPartner(partnerId);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      // Get additional partner details
      const user = await storage.getUserById(partner.userId);
      const partnerWithUser = {
        ...partner,
        email: user?.email,
        contactPerson: user?.firstName + ' ' + user?.lastName,
      };
      
      res.json(partnerWithUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get partner activities for admin inspection
  app.get("/api/admin/partner-activities/:partnerId", async (req, res) => {
    if (!req.isAuthenticated() || !['master_admin', 'editor_admin'].includes(req.user.userType)) {
      return res.sendStatus(403);
    }
    
    try {
      const partnerId = parseInt(req.params.partnerId);
      
      // Mock activity data for demonstration
      // In a real application, you would store and retrieve actual activity logs
      const activities = [
        {
          id: 1,
          type: 'login',
          description: 'Partner paneline giriş yaptı',
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          type: 'profile_update',
          description: 'Profil bilgilerini güncelledi',
          details: 'Şirket açıklaması ve hizmet listesi güncellendi',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 3,
          type: 'quote_response',
          description: 'Teklif talebine yanıt verdi',
          details: 'Teklif ID: #12 - Müşteri: Test Şirketi',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ];
      
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get partner's quote requests for admin inspection
  app.get("/api/admin/partner-quotes/:partnerId", async (req, res) => {
    if (!req.isAuthenticated() || !['master_admin', 'editor_admin'].includes(req.user.userType)) {
      return res.sendStatus(403);
    }
    
    try {
      const partnerId = parseInt(req.params.partnerId);
      const quoteRequests = await storage.getQuoteRequestsByPartnerId(partnerId);
      res.json(quoteRequests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all quote requests for admin
  app.get("/api/admin/quote-requests", async (req, res) => {
    if (!req.isAuthenticated() || !['master_admin', 'editor_admin'].includes(req.user.userType)) {
      return res.sendStatus(403);
    }
    
    try {
      const quoteRequestsWithPartners = await storage.getAllQuoteRequestsWithPartners();
      res.json(quoteRequestsWithPartners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update quote request status
  app.patch("/api/admin/quote-requests/:id", async (req, res) => {
    if (!req.isAuthenticated() || !['master_admin', 'editor_admin'].includes(req.user.userType)) {
      return res.sendStatus(403);
    }
    
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['pending', 'responded', 'accepted', 'completed', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Geçersiz durum' });
      }
      
      const updatedRequest = await storage.updateQuoteRequest(id, { status });
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/partners", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'master_admin') {
      return res.sendStatus(403);
    }
    
    try {
      const partners = await storage.getAllPartnersWithUsers();
      res.json(partners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'master_admin') {
      return res.sendStatus(403);
    }
    
    try {
      const userData = req.body;
      const hashedPassword = await hashPassword(userData.password);
      
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        isVerified: true
      });
      
      // Send welcome email
      await sendEmail({
        to: newUser.email,
        subject: 'DİP Hesabınız Oluşturuldu',
        html: `
          <h2>Hoş Geldiniz!</h2>
          <p>Merhaba ${newUser.firstName} ${newUser.lastName},</p>
          <p>DİP platformunda hesabınız başarıyla oluşturuldu.</p>
          <p><strong>E-posta:</strong> ${newUser.email}</p>
          <p><strong>Şifre:</strong> ${userData.password}</p>
          <p>Güvenliğiniz için ilk girişinizde şifrenizi değiştirmenizi öneririz.</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/auth">DİP'e Giriş Yapın</a></p>
        `
      });
      
      res.status(201).json(newUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/partners", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'master_admin') {
      return res.sendStatus(403);
    }
    
    try {
      const partnerData = req.body;
      const hashedPassword = await hashPassword(partnerData.password);
      
      // Create user first
      const newUser = await storage.createUser({
        email: partnerData.email,
        password: hashedPassword,
        firstName: partnerData.firstName,
        lastName: partnerData.lastName,
        userType: 'partner',
        isVerified: true,
        language: 'tr'
      });
      
      // Create partner profile
      const newPartner = await storage.createPartner({
        userId: newUser.id,
        companyName: partnerData.companyName,
        description: partnerData.description,
        serviceCategory: partnerData.serviceCategory,
        services: partnerData.services,
        city: partnerData.city,
        country: partnerData.country,
        website: partnerData.website,
        dipAdvantages: partnerData.dipAdvantages,
        isApproved: true,
        isActive: true
      });
      
      // Send welcome email
      await sendEmail({
        to: newUser.email,
        subject: 'DİP Partner Hesabınız Oluşturuldu',
        html: `
          <h2>Partner Hoş Geldiniz!</h2>
          <p>Merhaba ${partnerData.contactPerson || `${newUser.firstName} ${newUser.lastName}`},</p>
          <p>${partnerData.companyName} şirketi için DİP Partner hesabınız başarıyla oluşturuldu.</p>
          <p><strong>E-posta:</strong> ${newUser.email}</p>
          <p><strong>Şifre:</strong> ${partnerData.password}</p>
          <p>Partner panelinizden şirket profilinizi yönetebilir, paylaşımlar yapabilir ve müşterilerle iletişim kurabilirsiniz.</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/auth">Partner Paneline Giriş Yapın</a></p>
        `
      });
      
      res.status(201).json({ user: newUser, partner: newPartner });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/users/:userId/type", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'master_admin') {
      return res.sendStatus(403);
    }
    
    try {
      const { userId } = req.params;
      const { userType } = req.body;
      
      const updatedUser = await storage.updateUserType(parseInt(userId), userType);
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/users/:userId/assign-partner", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'master_admin') {
      return res.sendStatus(403);
    }
    
    try {
      const { userId } = req.params;
      const { partnerId } = req.body;
      
      // Update user type to partner and link to partner record
      const updatedUser = await storage.assignUserToPartner(parseInt(userId), parseInt(partnerId));
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user billing info for partners (for quote details)
  app.get("/api/partner/user-billing/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const partner = await storage.getPartnerByUserId(req.user!.id);
      if (!partner) {
        return res.status(403).json({ message: "Only partners can access user billing information" });
      }
      
      const userId = parseInt(req.params.userId);
      const billingInfo = await storage.getUserBillingInfo(userId);
      
      if (!billingInfo) {
        return res.status(404).json({ message: "User billing information not found" });
      }
      
      // Return only necessary billing info for partners
      res.json({
        companyTitle: billingInfo.companyTitle,
        companyName: billingInfo.companyName,
        website: billingInfo.website,
        linkedinProfile: billingInfo.linkedinProfile,
        taxNumber: billingInfo.taxNumber,
        taxOffice: billingInfo.taxOffice,
        address: billingInfo.address,
        city: billingInfo.city,
        country: billingInfo.country,
        postalCode: billingInfo.postalCode,
        phone: billingInfo.phone,
        email: billingInfo.email,
      });
    } catch (error) {
      console.error('Error fetching user billing info for partner:', error);
      res.status(500).json({ message: "Failed to fetch billing information" });
    }
  });

  // Email preferences API routes
  app.get("/api/email-preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const preferences = await storage.getUserEmailPreferences(req.user!.id);
      
      if (!preferences) {
        // Create default preferences if none exist
        const defaultPreferences = {
          userId: req.user!.id,
          marketingEmails: true,
          partnerUpdates: true,
          platformUpdates: true,
          weeklyDigest: false,
        };
        
        const created = await storage.createUserEmailPreferences(defaultPreferences);
        return res.json(created);
      }
      
      res.json(preferences);
    } catch (error: any) {
      console.error('Error fetching email preferences:', error);
      res.status(500).json({ message: 'Failed to fetch email preferences' });
    }
  });

  app.post("/api/email-preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { marketingEmails, partnerUpdates, platformUpdates, weeklyDigest } = req.body;
      const userId = req.user!.id;
      
      // Check if preferences exist
      const existing = await storage.getUserEmailPreferences(userId);
      
      if (existing) {
        // Update existing preferences
        const updated = await storage.updateUserEmailPreferences(userId, {
          marketingEmails,
          partnerUpdates,
          platformUpdates,
          weeklyDigest,
        });
        
        // Update email subscription status
        if (marketingEmails) {
          await storage.subscribeToEmails(userId, req.user!.email);
        } else {
          await storage.unsubscribeFromEmails(userId);
        }
        
        res.json(updated);
      } else {
        // Create new preferences
        const created = await storage.createUserEmailPreferences({
          userId,
          marketingEmails,
          partnerUpdates,
          platformUpdates,
          weeklyDigest,
        });
        
        // Handle email subscription
        if (marketingEmails) {
          await storage.subscribeToEmails(userId, req.user!.email);
        }
        
        res.json(created);
      }
    } catch (error: any) {
      console.error('Error updating email preferences:', error);
      res.status(500).json({ message: 'Failed to update email preferences' });
    }
  });

  app.post("/api/email-preferences/unsubscribe-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      
      // Update preferences to disable all non-essential emails
      await storage.updateUserEmailPreferences(userId, {
        marketingEmails: false,
        partnerUpdates: false,
        weeklyDigest: false,
        platformUpdates: true, // Keep platform updates for important announcements
      });
      
      // Unsubscribe from email list
      await storage.unsubscribeFromEmails(userId);
      
      res.json({ success: true, message: 'Successfully unsubscribed from all emails' });
    } catch (error: any) {
      console.error('Error unsubscribing from emails:', error);
      res.status(500).json({ message: 'Failed to unsubscribe from emails' });
    }
  });

  app.post("/api/email-preferences/subscribe-back", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      
      // Update preferences to re-enable marketing emails
      await storage.updateUserEmailPreferences(userId, {
        marketingEmails: true,
        partnerUpdates: true,
      });
      
      // Re-subscribe to email list
      await storage.subscribeToEmails(userId, req.user!.email);
      
      res.json({ success: true, message: 'Successfully subscribed back to emails' });
    } catch (error: any) {
      console.error('Error subscribing back to emails:', error);
      res.status(500).json({ message: 'Failed to subscribe back to emails' });
    }
  });

  // Admin route to get all email subscribers
  app.get("/api/admin/email-subscribers", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const subscribers = await storage.getAllEmailSubscribers();
      res.json(subscribers);
    } catch (error: any) {
      console.error('Error fetching email subscribers:', error);
      res.status(500).json({ message: 'Failed to fetch email subscribers' });
    }
  });

  // Unsubscribe route accessible via email link (no authentication required)
  app.get("/api/unsubscribe", async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email parameter is required' });
      }
      
      await storage.unsubscribeByEmail(email);
      
      // Return a simple HTML page confirming unsubscription
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>E-posta Aboneliği İptal Edildi - DİP</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { color: #2563eb; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ E-posta Aboneliği İptal Edildi</h1>
            <p>E-posta adresiniz (${email}) başarıyla e-posta listesinden çıkarıldı.</p>
            <p>Artık bizden pazarlama e-postaları almayacaksınız. Hesap güvenliği ile ilgili önemli e-postalar bu ayardan etkilenmez.</p>
            <p><a href="https://partner.dip.tc">DİP Platformuna Dön</a></p>
          </div>
        </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Error unsubscribing email:', error);
      res.status(500).send('E-posta aboneliği iptal edilirken bir hata oluştu.');
    }
  });

  // Feedback endpoints
  app.post("/api/feedback", async (req, res) => {
    try {
      console.log('Creating feedback:', req.body);
      let feedbackData = req.body;
      
      // Sanitize feedback input
      if (feedbackData.name) {
        feedbackData.name = emailSecurity.sanitizeText(feedbackData.name);
      }
      if (feedbackData.email) {
        const emailValidation = emailSecurity.validateEmail(feedbackData.email);
        if (!emailValidation.valid) {
          return res.status(400).json({ message: `Geçersiz e-posta adresi: ${emailValidation.error}` });
        }
      }
      if (feedbackData.message) {
        feedbackData.message = emailSecurity.sanitizeText(feedbackData.message);
      }
      if (feedbackData.subject) {
        feedbackData.subject = emailSecurity.sanitizeText(feedbackData.subject);
      }
      
      const newFeedback = await storage.createFeedback(feedbackData);
      res.json(newFeedback);
    } catch (error) {
      console.error('Error creating feedback:', error);
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  // Admin only - get all feedback
  app.get("/api/admin/feedback", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (req.user!.userType !== 'master_admin') {
        return res.status(403).json({ message: "Master admin access required" });
      }

      const feedbackList = await storage.getFeedback();
      res.json(feedbackList);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Admin only - update feedback status
  app.patch("/api/admin/feedback/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (req.user!.userType !== 'master_admin') {
        return res.status(403).json({ message: "Master admin access required" });
      }

      const feedbackId = parseInt(req.params.id);
      const { status } = req.body;
      
      const updatedFeedback = await storage.updateFeedbackStatus(feedbackId, status);
      if (!updatedFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      res.json(updatedFeedback);
    } catch (error) {
      console.error('Error updating feedback status:', error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  // Admin only - delete feedback
  app.delete("/api/admin/feedback/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (req.user!.userType !== 'master_admin') {
        return res.status(403).json({ message: "Master admin access required" });
      }

      const feedbackId = parseInt(req.params.id);
      
      const deleted = await storage.deleteFeedback(feedbackId);
      if (!deleted) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      res.json({ success: true, message: "Feedback deleted successfully" });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  // Marketing contact management routes
  app.get("/api/admin/marketing-contacts", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const contacts = await storage.getAllMarketingContacts();
      res.json(contacts);
    } catch (error: any) {
      console.error('Error fetching marketing contacts:', error);
      res.status(500).json({ message: 'Failed to fetch marketing contacts' });
    }
  });

  // Sync all existing users to marketing contacts and Resend audience
  app.post("/api/admin/sync-marketing-contacts", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.userType !== 'master_admin') {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      let syncedCount = 0;
      let errors = 0;

      // Sync all users
      const users = await storage.getAllUsers();
      for (const user of users) {
        try {
          const userType = user.userType === 'master_admin' || user.userType === 'editor_admin' ? 'admin' : user.userType;
          await storage.syncUserToMarketingContact(user, userType, 'admin_sync');
          
          // Add to Resend audience
          await resendService.addToAudience({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone || undefined,
            userType: userType
          });
          
          syncedCount++;
        } catch (error) {
          console.error(`Error syncing user ${user.email}:`, error);
          errors++;
        }
      }

      // Sync all partners
      const partners = await storage.getAllPartnersWithUsers();
      for (const partner of partners) {
        try {
          const user = await storage.getUser(partner.userId);
          if (user) {
            await storage.syncPartnerToMarketingContact(partner, user);
            
            // Add to Resend audience with partner info
            await resendService.addToAudience({
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone || undefined,
              company: partner.companyName,
              website: partner.website || undefined,
              userType: 'partner'
            });
            
            syncedCount++;
          }
        } catch (error) {
          console.error(`Error syncing partner ${partner.companyName}:`, error);
          errors++;
        }
      }

      res.json({ 
        success: true, 
        message: `${syncedCount} contacts synced successfully`,
        syncedCount,
        errors 
      });
    } catch (error: any) {
      console.error('Error syncing marketing contacts:', error);
      res.status(500).json({ message: 'Failed to sync marketing contacts' });
    }
  });

  // Newsletter subscription endpoint
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email, source = "homepage" } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Geçerli bir e-posta adresi gereklidir" });
      }

      const result = await storage.subscribeToNewsletter({ email, source });
      res.json(result);
    } catch (error: any) {
      console.error("Error subscribing to newsletter:", error);
      if (error.message && error.message.includes('duplicate')) {
        res.status(409).json({ error: "Bu e-posta adresi zaten abone listesinde bulunuyor" });
      } else {
        res.status(500).json({ error: "Abonelik işlemi başarısız" });
      }
    }
  });

  // Get newsletter subscribers (Admin only)
  app.get("/api/admin/newsletter-subscribers", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const subscribers = await storage.getNewsletterSubscribers();
      res.json(subscribers);
    } catch (error: any) {
      console.error("Error fetching newsletter subscribers:", error);
      res.status(500).json({ error: "Failed to fetch newsletter subscribers" });
    }
  });

  // Unsubscribe from newsletter
  app.get("/api/unsubscribe/:email", async (req, res) => {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Decode email from URL
      const decodedEmail = decodeURIComponent(email);
      
      // Remove from newsletter subscribers
      await storage.removeNewsletterSubscriber(decodedEmail);
      
      // Return a simple HTML page confirming unsubscription
      res.send(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Abonelik İptal Edildi - DİP</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .container { background: #f8f9fa; padding: 40px; border-radius: 10px; }
            .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
            .email { background: #e9ecef; padding: 10px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓ Abonelik başarıyla iptal edildi</div>
            <p>E-posta adresiniz marketing listesinden çıkarıldı:</p>
            <div class="email">${decodedEmail}</div>
            <p>Artık bizden pazarlama e-postaları almayacaksınız.</p>
            <p><strong>dip | iş ortakları platformu</strong></p>
          </div>
        </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Error unsubscribing:", error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <title>Hata - DİP</title>
          <style>body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }</style>
        </head>
        <body>
          <h2>Hata Oluştu</h2>
          <p>Abonelik iptal edilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
        </body>
        </html>
      `);
    }
  });

  // Send bulk campaign endpoint (legacy single-channel)
  app.post('/api/admin/send-bulk-campaign', async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      let { subject, content, recipients, channels, targetGroups, targetContacts, email, sms, notification } = req.body;
      
      // Enhanced input sanitization for all campaign content
      if (email?.subject) {
        email.subject = emailSecurity.sanitizeText(email.subject);
      }
      if (email?.content) {
        // For email content, we need to preserve HTML structure for rendering
        email.content = emailSecurity.sanitizeEmailContent(email.content);
      }
      if (sms?.message) {
        sms.message = emailSecurity.sanitizeText(sms.message);
      }
      if (notification?.title) {
        notification.title = emailSecurity.sanitizeText(notification.title);
      }
      if (notification?.message) {
        notification.message = emailSecurity.sanitizeText(notification.message);
      }
      
      // Handle both legacy and new multi-channel format
      if (channels && Array.isArray(channels)) {
        // New multi-channel format
        if (channels.length === 0) {
          return res.status(400).json({ error: 'At least one channel must be selected' });
        }

        if (!targetContacts || !Array.isArray(targetContacts) || targetContacts.length === 0) {
          return res.status(400).json({ error: 'No target contacts found' });
        }

        let totalSent = 0;
        const results = {
          email: { sent: 0, failed: 0 },
          sms: { sent: 0, failed: 0 },
          notification: { sent: 0, failed: 0 }
        };

        // Process email campaign
        if (channels.includes('email') && email) {
          const emailRecipients = targetContacts.filter((c: any) => c.email);
          if (emailRecipients.length > 0) {
            for (const recipient of emailRecipients) {
              try {
                // Replace parameters in subject and content with secure validation
                let personalizedSubject = email.subject;
                let personalizedContent = email.content;
                
                // Validate recipient email
                const emailValidation = emailSecurity.validateEmail(recipient.email);
                if (!emailValidation.valid) {
                  console.warn(`Invalid email skipped: ${recipient.email} - ${emailValidation.error}`);
                  results.email.failed++;
                  continue;
                }
                
                // Get user data for parameter replacement
                const user = await storage.getUserByEmail(recipient.email);
                if (user) {
                  // Create full name from firstName and lastName with sanitization
                  const sanitizedFirstName = emailSecurity.sanitizeText(user.firstName || '');
                  const sanitizedLastName = emailSecurity.sanitizeText(user.lastName || '');
                  const fullName = [sanitizedFirstName, sanitizedLastName].filter(Boolean).join(' ') || 'Değerli Kullanıcı';
                  const userName = fullName;
                  
                  personalizedSubject = personalizedSubject.replace(/\{\{userName\}\}/g, userName);
                  personalizedContent = personalizedContent.replace(/\{\{userName\}\}/g, userName);
                  personalizedSubject = personalizedSubject.replace(/\{\{userEmail\}\}/g, user.email || '');
                  personalizedContent = personalizedContent.replace(/\{\{userEmail\}\}/g, user.email || '');
                  personalizedSubject = personalizedSubject.replace(/\{\{fullName\}\}/g, fullName);
                  personalizedContent = personalizedContent.replace(/\{\{fullName\}\}/g, fullName);
                }

                await resendService.sendEmail({
                  to: recipient.email,
                  subject: personalizedSubject,
                  html: personalizedContent,
                });
                results.email.sent++;
                totalSent++;
              } catch (error) {
                console.error(`Failed to send email to ${recipient.email}:`, error);
                results.email.failed++;
              }
            }
          }
        }

        // Process SMS campaign
        if (channels.includes('sms') && sms) {
          const smsRecipients = targetContacts.filter((c: any) => c.phone);
          if (smsRecipients.length > 0) {
            const netgsm = createNetGsmService();
            for (const recipient of smsRecipients) {
              try {
                // Validate phone number format
                if (!recipient.phone || typeof recipient.phone !== 'string' || recipient.phone.length < 10) {
                  console.warn(`Invalid phone number skipped: ${recipient.phone}`);
                  results.sms.failed++;
                  continue;
                }
                
                // Replace parameters in SMS content with sanitization
                let personalizedContent = sms.content;
                
                // Get user data for parameter replacement
                const user = await storage.getUserByEmail(recipient.email);
                if (user) {
                  // Create full name with sanitization
                  const sanitizedFirstName = emailSecurity.sanitizeText(user.firstName || '');
                  const sanitizedLastName = emailSecurity.sanitizeText(user.lastName || '');
                  const fullName = [sanitizedFirstName, sanitizedLastName].filter(Boolean).join(' ') || 'Değerli Kullanıcı';
                  const userName = fullName;
                  
                  personalizedContent = personalizedContent.replace(/\{\{userName\}\}/g, userName);
                  personalizedContent = personalizedContent.replace(/\{\{userEmail\}\}/g, user.email || '');
                  personalizedContent = personalizedContent.replace(/\{\{fullName\}\}/g, fullName);
                  personalizedContent = personalizedContent.replace(/\{\{firstName\}\}/g, sanitizedFirstName);
                  personalizedContent = personalizedContent.replace(/\{\{lastName\}\}/g, sanitizedLastName);
                  // Note: companyName will be added to user schema - for now use empty string
                  personalizedContent = personalizedContent.replace(/\{\{companyName\}\}/g, '');
                }

                if (netgsm) {
                  await netgsm.sendSms(recipient.phone, personalizedContent);
                }
                results.sms.sent++;
                totalSent++;
              } catch (error) {
                console.error(`Failed to send SMS to ${recipient.phone}:`, error);
                results.sms.failed++;
              }
            }
            
            console.log(`SMS campaign sent to ${results.sms.sent} recipients, ${results.sms.failed} failed`);
          }
        }

        // Process notification campaign
        if (channels.includes('notification') && notification) {
          const notificationRecipients = targetContacts.filter((c: any) => c.userId);
          if (notificationRecipients.length > 0) {
            // Send actual notifications using notification service
            for (const recipient of notificationRecipients) {
              try {
                // Validate user ID
                if (!recipient.userId || isNaN(recipient.userId)) {
                  console.warn(`Invalid user ID skipped: ${recipient.userId}`);
                  results.notification.failed++;
                  continue;
                }
                
                // Replace parameters in notification title and content with sanitization
                let personalizedTitle = notification.title;
                let personalizedContent = notification.message || notification.content;
                
                // Get user data for parameter replacement
                const user = await storage.getUser(recipient.userId);
                if (user) {
                  // Create full name with sanitization
                  const sanitizedFirstName = emailSecurity.sanitizeText(user.firstName || '');
                  const sanitizedLastName = emailSecurity.sanitizeText(user.lastName || '');
                  const fullName = [sanitizedFirstName, sanitizedLastName].filter(Boolean).join(' ') || 'Değerli Kullanıcı';
                  const userName = fullName;
                  
                  personalizedTitle = personalizedTitle.replace(/\{\{userName\}\}/g, userName);
                  personalizedContent = personalizedContent.replace(/\{\{userName\}\}/g, userName);
                  personalizedTitle = personalizedTitle.replace(/\{\{userEmail\}\}/g, user.email || '');
                  personalizedContent = personalizedContent.replace(/\{\{userEmail\}\}/g, user.email || '');
                  personalizedTitle = personalizedTitle.replace(/\{\{fullName\}\}/g, fullName);
                  personalizedContent = personalizedContent.replace(/\{\{fullName\}\}/g, fullName);
                  personalizedTitle = personalizedTitle.replace(/\{\{firstName\}\}/g, sanitizedFirstName);
                  personalizedContent = personalizedContent.replace(/\{\{firstName\}\}/g, sanitizedFirstName);
                  personalizedTitle = personalizedTitle.replace(/\{\{lastName\}\}/g, sanitizedLastName);
                  personalizedContent = personalizedContent.replace(/\{\{lastName\}\}/g, sanitizedLastName);
                  // Note: companyName will be added to user schema - for now use empty string
                  personalizedTitle = personalizedTitle.replace(/\{\{companyName\}\}/g, '');
                  personalizedContent = personalizedContent.replace(/\{\{companyName\}\}/g, '');
                }

                const notificationService = storage.getNotificationService();
                await notificationService.createNotification({
                  userId: recipient.userId,
                  type: 'campaign',
                  title: personalizedTitle,
                  message: personalizedContent,
                  relatedEntityType: 'campaign',
                  relatedEntityId: null,
                  actionUrl: null,
                  metadata: {
                    campaignType: 'bulk_notification',
                    templateId: notification.templateId || null
                  }
                });
                results.notification.sent++;
                totalSent++;
              } catch (error) {
                console.error(`Failed to send notification to user ${recipient.userId}:`, error);
                results.notification.failed++;
              }
            }
            
            console.log(`Notification campaign sent to ${results.notification.sent} recipients, ${results.notification.failed} failed`);
          }
        }

        return res.json({ 
          success: true, 
          message: `Kampanya başarıyla gönderildi! ${totalSent} kişiye ulaştı.`,
          sentCount: totalSent,
          results,
          channels: channels,
          targetGroups
        });
      } else {
        // Legacy single-channel format
        if (!subject || !content || !recipients || !Array.isArray(recipients)) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        let sentCount = 0;
        let errorCount = 0;
        
        // Send emails to all recipients
        for (const email of recipients) {
          try {
            await resendService.sendEmail({
              to: email,
              subject: subject,
              html: content,
            });
            sentCount++;
          } catch (error) {
            console.error(`Failed to send email to ${email}:`, error);
            errorCount++;
          }
        }

        return res.json({ 
          sentCount, 
          errorCount, 
          totalRecipients: recipients.length 
        });
      }
    } catch (error) {
      console.error('Error sending bulk campaign:', error);
      res.status(500).json({ error: 'Failed to send bulk campaign' });
    }
  });

  // Get SMS templates (Admin only)
  app.get("/api/admin/sms-templates", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const smsTemplates = await storage.getAllSmsTemplates();
      res.json(smsTemplates);
    } catch (error: any) {
      console.error("Error fetching SMS templates:", error);
      res.status(500).json({ error: "Failed to fetch SMS templates" });
    }
  });

  // Get notification templates (Admin only)
  app.get("/api/admin/notification-templates", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const notificationTemplates = await storage.getAllNotificationTemplates();
      res.json(notificationTemplates);
    } catch (error: any) {
      console.error("Error fetching notification templates:", error);
      res.status(500).json({ error: "Failed to fetch notification templates" });
    }
  });

  // Campaign Email Templates Routes (Admin only)
  app.get("/api/admin/campaign-email-templates", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const templates = await storage.getAllCampaignEmailTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching campaign email templates:", error);
      res.status(500).json({ error: "Failed to fetch campaign email templates" });
    }
  });

  app.post("/api/admin/campaign-email-templates", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const { name, subject, htmlContent } = req.body;
      
      if (!name || !subject || !htmlContent) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const template = await storage.createCampaignEmailTemplate({
        name,
        subject,
        htmlContent,
        isActive: true
      });

      res.json(template);
    } catch (error: any) {
      console.error("Error creating campaign email template:", error);
      res.status(500).json({ error: "Failed to create campaign email template" });
    }
  });

  app.put("/api/admin/campaign-email-templates/:id", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const template = await storage.updateCampaignEmailTemplate(id, updates);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    } catch (error: any) {
      console.error("Error updating campaign email template:", error);
      res.status(500).json({ error: "Failed to update campaign email template" });
    }
  });

  app.delete("/api/admin/campaign-email-templates/:id", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCampaignEmailTemplate(id);
      
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting campaign email template:", error);
      res.status(500).json({ error: "Failed to delete campaign email template" });
    }
  });

  // Campaign SMS Templates Routes (Admin only)
  app.get("/api/admin/campaign-sms-templates", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const templates = await storage.getAllCampaignSmsTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching campaign SMS templates:", error);
      res.status(500).json({ error: "Failed to fetch campaign SMS templates" });
    }
  });

  app.post("/api/admin/campaign-sms-templates", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const { name, content } = req.body;
      
      if (!name || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const template = await storage.createCampaignSmsTemplate({
        name,
        content,
        isActive: true
      });

      res.json(template);
    } catch (error: any) {
      console.error("Error creating campaign SMS template:", error);
      res.status(500).json({ error: "Failed to create campaign SMS template" });
    }
  });

  app.put("/api/admin/campaign-sms-templates/:id", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const template = await storage.updateCampaignSmsTemplate(id, updates);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    } catch (error: any) {
      console.error("Error updating campaign SMS template:", error);
      res.status(500).json({ error: "Failed to update campaign SMS template" });
    }
  });

  app.delete("/api/admin/campaign-sms-templates/:id", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCampaignSmsTemplate(id);
      
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting campaign SMS template:", error);
      res.status(500).json({ error: "Failed to delete campaign SMS template" });
    }
  });

  // Campaign Notification Templates Routes (Admin only)
  app.get("/api/admin/campaign-notification-templates", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const templates = await storage.getAllCampaignNotificationTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching campaign notification templates:", error);
      res.status(500).json({ error: "Failed to fetch campaign notification templates" });
    }
  });

  app.post("/api/admin/campaign-notification-templates", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const { name, title, content } = req.body;
      
      if (!name || !title || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const template = await storage.createCampaignNotificationTemplate({
        name,
        title,
        content,
        isActive: true
      });

      res.json(template);
    } catch (error: any) {
      console.error("Error creating campaign notification template:", error);
      res.status(500).json({ error: "Failed to create campaign notification template" });
    }
  });

  app.put("/api/admin/campaign-notification-templates/:id", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const template = await storage.updateCampaignNotificationTemplate(id, updates);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    } catch (error: any) {
      console.error("Error updating campaign notification template:", error);
      res.status(500).json({ error: "Failed to update campaign notification template" });
    }
  });

  app.delete("/api/admin/campaign-notification-templates/:id", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCampaignNotificationTemplate(id);
      
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting campaign notification template:", error);
      res.status(500).json({ error: "Failed to delete campaign notification template" });
    }
  });

  // Test Template Route (Admin only)
  app.post("/api/admin/test-template", async (req, res) => {
    if (!req.isAuthenticated() || !["master_admin", "editor_admin"].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const { type, templateId, email } = req.body;
      const user = req.user;
      
      if (!type || !templateId) {
        return res.status(400).json({ error: "Missing required fields: type and templateId" });
      }

      let template: any = null;
      let testContent = "";
      let testSubject = "";
      let testTitle = "";

      // Get template based on type
      if (type === 'email') {
        template = await storage.getCampaignEmailTemplateById(templateId);
        if (!template) {
          return res.status(404).json({ error: "Email template not found" });
        }
        
        if (!email) {
          return res.status(400).json({ error: "Email address required for email template test" });
        }

        // Replace parameters with sample data
        testSubject = template.subject
          .replace(/{{partnerName}}/g, 'Test Partner')
          .replace(/{{companyName}}/g, 'Test Şirketi')
          .replace(/{{customerName}}/g, 'Test Müşteri')
          .replace(/{{serviceNeeded}}/g, 'Test Hizmeti')
          .replace(/{{budget}}/g, '10.000 TL')
          .replace(/{{partnerCompany}}/g, 'Test Partner Şirketi')
          .replace(/{{userName}}/g, user?.firstName + ' ' + user?.lastName || 'Test User');

        testContent = template.htmlContent
          .replace(/{{partnerName}}/g, 'Test Partner')
          .replace(/{{companyName}}/g, 'Test Şirketi')
          .replace(/{{customerName}}/g, 'Test Müşteri')
          .replace(/{{serviceNeeded}}/g, 'Test Hizmeti')
          .replace(/{{budget}}/g, '10.000 TL')
          .replace(/{{partnerCompany}}/g, 'Test Partner Şirketi')
          .replace(/{{userName}}/g, user?.firstName + ' ' + user?.lastName || 'Test User')
          .replace(/{{resetLink}}/g, 'https://partner.dip.tc/reset-password?token=test');

        // Send test email
        await resendService.sendEmail({
          to: email,
          subject: `[TEST] ${testSubject}`,
          html: testContent,
        });

      } else if (type === 'sms') {
        template = await storage.getCampaignSmsTemplateById(templateId);
        if (!template) {
          return res.status(404).json({ error: "SMS template not found" });
        }
        
        if (!email) { // Using email field for phone number
          return res.status(400).json({ error: "Phone number required for SMS template test" });
        }

        // Replace parameters with sample data
        testContent = template.content
          .replace(/{{partnerName}}/g, 'Test Partner')
          .replace(/{{companyName}}/g, 'Test Şirketi')
          .replace(/{{customerName}}/g, 'Test Müşteri')
          .replace(/{{serviceNeeded}}/g, 'Test Hizmeti')
          .replace(/{{budget}}/g, '10.000 TL')
          .replace(/{{partnerCompany}}/g, 'Test Partner Şirketi')
          .replace(/{{userName}}/g, user?.firstName + ' ' + user?.lastName || 'Test User');

        // For SMS testing, we'll just log the content since NetGSM integration needs proper setup
        console.log(`SMS Test Message to ${email}:`, testContent);
        
        // In a real implementation, you would send via NetGSM:
        // await netgsmService.sendSMS(email, testContent);

      } else if (type === 'notification') {
        template = await storage.getCampaignNotificationTemplateById(templateId);
        if (!template) {
          return res.status(404).json({ error: "Notification template not found" });
        }

        // Replace parameters with sample data
        testTitle = template.title
          .replace(/{{partnerName}}/g, 'Test Partner')
          .replace(/{{companyName}}/g, 'Test Şirketi')
          .replace(/{{customerName}}/g, 'Test Müşteri')
          .replace(/{{serviceNeeded}}/g, 'Test Hizmeti')
          .replace(/{{budget}}/g, '10.000 TL')
          .replace(/{{partnerCompany}}/g, 'Test Partner Şirketi')
          .replace(/{{userName}}/g, user?.firstName + ' ' + user?.lastName || 'Test User');

        testContent = template.content
          .replace(/{{partnerName}}/g, 'Test Partner')
          .replace(/{{companyName}}/g, 'Test Şirketi')
          .replace(/{{customerName}}/g, 'Test Müşteri')
          .replace(/{{serviceNeeded}}/g, 'Test Hizmeti')
          .replace(/{{budget}}/g, '10.000 TL')
          .replace(/{{partnerCompany}}/g, 'Test Partner Şirketi')
          .replace(/{{userName}}/g, user?.firstName + ' ' + user?.lastName || 'Test User');

        // Create a test notification for the current user
        await storage.createNotification({
          userId: user!.id,
          title: `[TEST] ${testTitle}`,
          message: testContent,
          type: 'test',
          isRead: false
        });

      } else {
        return res.status(400).json({ error: "Invalid template type. Must be 'email', 'sms', or 'notification'" });
      }

      res.json({ 
        success: true, 
        message: `Test ${type} sent successfully`,
        templateName: template.name,
        ...(type === 'email' && { sentTo: email }),
        ...(type === 'sms' && { sentTo: email }),
        ...(type === 'notification' && { sentTo: user?.firstName + ' ' + user?.lastName })
      });

    } catch (error: any) {
      console.error("Error sending test template:", error);
      res.status(500).json({ error: "Failed to send test template" });
    }
  });

  // Quote Response Management Routes
  app.post('/api/quote-responses', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user;
      if (!user || (user.userType !== 'partner' && user.activeUserType !== 'partner')) {
        return res.status(403).json({ error: 'Only partners can create quote responses' });
      }

      const partner = await storage.getPartnerByUserId(user.id);
      if (!partner) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      const responseData = req.body;
      
      // Validate required fields
      if (!responseData.quoteRequestId || !responseData.title || !responseData.items || responseData.items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Ensure the quote request belongs to this partner
      const quoteRequest = await storage.getQuoteRequestById(responseData.quoteRequestId);
      if (!quoteRequest || quoteRequest.partnerId !== partner.id) {
        return res.status(403).json({ error: 'Unauthorized to respond to this quote request' });
      }

      // Create the quote response
      const quoteResponse = await storage.createQuoteResponse({
        ...responseData,
        partnerId: partner.id,
      });

      // Update the quote request status
      await storage.updateQuoteRequest(responseData.quoteRequestId, {
        status: 'quote_sent',
      });

      // Send email notification to user
      try {
        const user = await storage.getUserById(quoteRequest.userId!);
        if (user) {
          // Create email template for quote sent notification
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Teklifiniz Hazır!</h1>
              </div>
              <div style="padding: 30px; background: #f8f9fa;">
                <p>Merhaba ${user.firstName} ${user.lastName},</p>
                <p><strong>${partner.companyName}</strong> firması, "${quoteRequest.serviceNeeded}" hizmet talebiniz için bir teklif gönderdi.</p>
                <p><strong>Teklif Detayları:</strong></p>
                <ul>
                  <li>Teklif Başlığı: ${responseData.title}</li>
                  <li>Toplam Tutar: ${(responseData.total / 100).toFixed(2)} TL</li>
                  <li>Geçerlilik Süresi: ${new Date(responseData.validUntil).toLocaleDateString('tr-TR')}</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.CLIENT_URL}/user-dashboard?tab=requests" 
                     style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Teklifi İncele
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Bu teklifi inceleyerek kabul veya ret edebilirsiniz. Herhangi bir sorunuz olursa bizimle iletişime geçin.
                </p>
              </div>
              <div style="background: #fff; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <img src="https://partner.dip.tc/dip-logo-white.png" alt="DİP Logo" style="height: 30px; filter: invert(1);">
                <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">DİP - Dijital İhracat Platformu</p>
              </div>
            </div>
          `;

          await sendEmail({
            to: user.email,
            subject: `${partner.companyName} - Yeni Teklif Aldınız!`,
            html: emailContent,
          });
        }
      } catch (emailError) {
        console.error('Quote sent email notification failed:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json(quoteResponse);
    } catch (error) {
      console.error('Error creating quote response:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/quote-responses/:requestId', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const requestId = parseInt(req.params.requestId);
      const quoteRequest = await storage.getQuoteRequestById(requestId);
      
      if (!quoteRequest) {
        return res.status(404).json({ error: 'Quote request not found' });
      }

      // Check if user has permission to view responses
      const partner = await storage.getPartnerByUserId(user.id);
      const canView = 
        (user.userType === 'partner' && partner && partner.id === quoteRequest.partnerId) ||
        (user.userType === 'user' && quoteRequest.userId === user.id) ||
        (user.userType === 'master_admin' || user.userType === 'editor_admin');

      if (!canView) {
        return res.status(403).json({ error: 'Unauthorized to view quote responses' });
      }

      const responses = await storage.getQuoteResponsesByRequestId(requestId);
      res.json(responses);
    } catch (error) {
      console.error('Error fetching quote responses:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/quote-responses/:id/status', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const responseId = parseInt(req.params.id);
      const { status, reason } = req.body;

      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const quoteResponse = await storage.getQuoteResponseById(responseId);
      if (!quoteResponse) {
        return res.status(404).json({ error: 'Quote response not found' });
      }

      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (!quoteRequest || quoteRequest.userId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized to update this quote response' });
      }

      // Update quote response status
      const updatedResponse = await storage.updateQuoteResponse(responseId, { status });

      // Update quote request status based on response status
      const requestStatus = status === 'accepted' ? 'accepted' : 'rejected';
      await storage.updateQuoteRequest(quoteResponse.quoteRequestId, { status: requestStatus });

      // Send email notifications
      try {
        const partner = await storage.getPartner(quoteResponse.partnerId);
        const partnerUser = partner ? await storage.getUserById(partner.userId) : null;
        const requestUser = await storage.getUserById(quoteRequest.userId);

        if (status === 'accepted' && partner && partnerUser && requestUser) {
          // Get user's company information
          const userCompanyInfo = await storage.getUserBillingInfo(requestUser.id);
          
          // Send email to partner
          const partnerEmailTemplate = emailTemplates.quoteStatus.approved.toPartner(
            partner.companyName,
            `${requestUser.firstName} ${requestUser.lastName}`
          );
          await resendService.sendEmail({
            to: partnerUser.email,
            subject: partnerEmailTemplate.subject,
            html: partnerEmailTemplate.html,
          });

          // Send email to user
          const userEmailTemplate = emailTemplates.quoteStatus.approved.toUser(
            `${requestUser.firstName} ${requestUser.lastName}`,
            partner.companyName
          );
          await resendService.sendEmail({
            to: requestUser.email,
            subject: userEmailTemplate.subject,
            html: userEmailTemplate.html,
          });
        } else if (status === 'rejected' && partner && partnerUser && requestUser) {
          // Send email to partner
          const rejectionTemplate = emailTemplates.quoteStatus.rejected.toPartner(
            partner.companyName,
            `${requestUser.firstName} ${requestUser.lastName}`
          );
          await resendService.sendEmail({
            to: partnerUser.email,
            subject: rejectionTemplate.subject,
            html: rejectionTemplate.html,
          });
        }
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the request if email fails
      }

      res.json(updatedResponse);
    } catch (error) {
      console.error('Error updating quote response status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PDF Download Routes
  app.get('/api/quote-requests/:id/pdf', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const requestId = parseInt(req.params.id);
      const quoteRequest = await storage.getQuoteRequestById(requestId);
      
      if (!quoteRequest) {
        return res.status(404).json({ error: 'Quote request not found' });
      }
      
      // Check permissions
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      const canView = 
        (user!.userType === 'partner' && partner && partner.id === quoteRequest.partnerId) ||
        (user!.userType === 'user' && quoteRequest.userId === user!.id) ||
        (user!.userType === 'master_admin' || user!.userType === 'editor_admin');
      
      if (!canView) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const { PDFGenerator } = await import('./pdf-generator.js');
      const generator = new PDFGenerator();
      
      await generator.generateQuoteRequestPDF({
        quoteRequest,
        partner: partner || undefined,
        type: 'quote_request'
      }, res);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });

  // Check payment status for a quote response
  app.get('/api/quote-responses/:id/payment-status', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const responseId = parseInt(req.params.id);
      const quoteResponse = await storage.getQuoteResponseById(responseId);
      
      if (!quoteResponse) {
        return res.status(404).json({ error: 'Quote response not found' });
      }

      // Check if user has permission to view payment status
      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (!quoteRequest) {
        return res.status(404).json({ error: 'Quote request not found' });
      }

      const partner = await storage.getPartnerByUserId(user.id);
      const canView = 
        (user.userType === 'partner' && partner && partner.id === quoteResponse.partnerId) ||
        (user.activeUserType === 'partner' && partner && partner.id === quoteResponse.partnerId) ||
        (user.userType === 'user' && quoteRequest.userId === user.id) ||
        (user.activeUserType === 'user' && quoteRequest.userId === user.id) ||
        (user.userType === 'master_admin' || user.userType === 'editor_admin');

      if (!canView) {
        return res.status(403).json({ error: 'Unauthorized to view payment status' });
      }

      // Check if there's a confirmed payment for this quote response
      const confirmedPayment = await storage.getConfirmedPaymentByQuoteResponse(responseId);
      
      res.json({ 
        hasConfirmedPayment: !!confirmedPayment,
        paymentConfirmation: confirmedPayment || null
      });
    } catch (error) {
      console.error('Error checking payment status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/quote-responses/:id/pdf', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const responseId = parseInt(req.params.id);
      const quoteResponse = await storage.getQuoteResponseById(responseId);
      
      if (!quoteResponse) {
        return res.status(404).json({ error: 'Quote response not found' });
      }
      
      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (!quoteRequest) {
        return res.status(404).json({ error: 'Related quote request not found' });
      }
      
      // Check permissions
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      const canView = 
        (user!.userType === 'partner' && partner && partner.id === quoteRequest.partnerId) ||
        (user!.userType === 'user' && quoteRequest.userId === user!.id) ||
        (user!.userType === 'master_admin' || user!.userType === 'editor_admin');
      
      if (!canView) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const { PDFGenerator } = await import('./pdf-generator.js');
      const generator = new PDFGenerator();
      
      await generator.generateQuoteResponsePDF({
        quoteRequest,
        partner: partner || undefined,
        quoteResponse,
        type: 'quote_response'
      }, res);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });

  // Revision Request Management Routes
  app.post('/api/revision-requests', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { quoteResponseId, requestedItems, message } = req.body;

      if (!quoteResponseId || !requestedItems || requestedItems.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify the quote response exists and user has permission
      const quoteResponse = await storage.getQuoteResponseById(quoteResponseId);
      if (!quoteResponse) {
        return res.status(404).json({ error: 'Quote response not found' });
      }

      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (!quoteRequest || quoteRequest.userId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized to request revision for this quote' });
      }

      // Create revision request
      const revisionData = {
        quoteResponseId,
        userId: user.id,
        requestedItems: JSON.stringify(requestedItems),
        message: message || null,
        status: 'pending' as const
      };

      const revisionRequest = await storage.createRevisionRequest(revisionData);

      // Send email notification to partner
      try {
        const partner = await storage.getPartner(quoteResponse.partnerId);
        if (partner) {
          const partnerUser = await storage.getUserById(partner.userId);
          if (partnerUser) {
            const emailTemplate = emailTemplates.revisionRequest.toPartner(quoteRequest, user, requestedItems);
            await resendService.sendEmail({
              to: partnerUser.email,
              subject: emailTemplate.subject,
              html: emailTemplate.html,
            });
            console.log('Revision request email sent to partner:', partnerUser.email);
          }
        }
      } catch (emailError) {
        console.error('Error sending revision request email:', emailError);
        // Don't fail the request if email fails
      }

      res.json(revisionRequest);
    } catch (error) {
      console.error('Error creating revision request:', error);
      res.status(500).json({ error: 'Failed to create revision request' });
    }
  });

  app.get('/api/revision-requests/quote-response/:quoteResponseId', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const quoteResponseId = parseInt(req.params.quoteResponseId);
      const revisionRequests = await storage.getRevisionRequestsByQuoteResponseId(quoteResponseId);

      // Check permissions
      const quoteResponse = await storage.getQuoteResponseById(quoteResponseId);
      if (!quoteResponse) {
        return res.status(404).json({ error: 'Quote response not found' });
      }

      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (!quoteRequest) {
        return res.status(404).json({ error: 'Quote request not found' });
      }

      const partner = await storage.getPartnerByUserId(user.id);
      const canView = 
        (user.userType === 'partner' && partner && partner.id === quoteRequest.partnerId) ||
        (user.userType === 'user' && quoteRequest.userId === user.id) ||
        (user.userType === 'master_admin' || user.userType === 'editor_admin');

      if (!canView) {
        return res.status(403).json({ error: 'Unauthorized to view revision requests' });
      }

      res.json(revisionRequests);
    } catch (error) {
      console.error('Error fetching revision requests:', error);
      res.status(500).json({ error: 'Failed to fetch revision requests' });
    }
  });

  app.put('/api/revision-requests/:id/status', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      if (!user || (user.userType !== 'partner' && user.activeUserType !== 'partner')) {
        return res.status(403).json({ error: 'Only partners can update revision request status' });
      }

      const revisionId = parseInt(req.params.id);
      const { status, updatedQuoteResponse } = req.body;

      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const revisionRequest = await storage.getRevisionRequestById(revisionId);
      if (!revisionRequest) {
        return res.status(404).json({ error: 'Revision request not found' });
      }

      const quoteResponse = await storage.getQuoteResponseById(revisionRequest.quoteResponseId);
      if (!quoteResponse) {
        return res.status(404).json({ error: 'Quote response not found' });
      }

      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (!quoteRequest) {
        return res.status(404).json({ error: 'Quote request not found' });
      }

      const partner = await storage.getPartnerByUserId(user.id);
      if (!partner || partner.id !== quoteRequest.partnerId) {
        return res.status(403).json({ error: 'Unauthorized to update this revision request' });
      }

      // Update revision request status
      const updatedRevision = await storage.updateRevisionRequest(revisionId, { 
        status
      });

      // If accepted, update the quote response with new pricing
      if (status === 'accepted' && updatedQuoteResponse) {
        await storage.updateQuoteResponse(revisionRequest.quoteResponseId, updatedQuoteResponse);
      }

      // Send email notification to user
      try {
        const requestUser = await storage.getUserById(revisionRequest.userId);
        if (requestUser && partner) {
          if (status === 'rejected') {
            await resendService.sendEmail({
              to: requestUser.email,
              subject: "Revizyon Talebiniz Reddedildi",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
                    <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
                  </div>
                  <div style="padding: 30px; background: #f8f9fa;">
                    <h2 style="color: #333; margin-bottom: 20px;">Revizyon Talebiniz Reddedildi</h2>
                    <p style="color: #666; line-height: 1.6;">Sayın Müşterimiz,</p>
                    <p style="color: #666; line-height: 1.6;">Maalesef ${partner.companyName} iş ortağımız revizyon talebinizi kabul edemedi. Mevcut teklif geçerliliğini korumaktadır.</p>
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p><strong>Partner:</strong> ${partner.companyName}</p>
                      <p><strong>Hizmet:</strong> ${quoteRequest.serviceNeeded}</p>
                      <p><strong>Durum:</strong> Revizyon Reddedildi</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://dip-partner-portal.replit.app'}/service-requests" 
                         style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Tekliflerinizi Görüntüle
                      </a>
                    </div>
                  </div>
                </div>
              `
            });
            console.log('Revision rejected email sent to user:', requestUser.email);
          } else if (status === 'accepted') {
            await resendService.sendEmail({
              to: requestUser.email,
              subject: "Revizyon Talebiniz Kabul Edildi",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
                    <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
                  </div>
                  <div style="padding: 30px; background: #f8f9fa;">
                    <h2 style="color: #333; margin-bottom: 20px;">Revizyon Talebiniz Kabul Edildi</h2>
                    <p style="color: #666; line-height: 1.6;">Sayın Müşterimiz,</p>
                    <p style="color: #666; line-height: 1.6;">Harika haber! ${partner.companyName} iş ortağımız revizyon talebinizi kabul etti ve teklif güncel fiyatlarla güncellendi.</p>
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p style="color: #28a745; font-weight: bold;">✓ Revizyon Kabul Edildi</p>
                      <p><strong>Partner:</strong> ${partner.companyName}</p>
                      <p><strong>Hizmet:</strong> ${quoteRequest.serviceNeeded}</p>
                      <p><strong>Durum:</strong> Teklif Güncellendi</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://dip-partner-portal.replit.app'}/service-requests" 
                         style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Güncel Teklifi Görüntüle
                      </a>
                    </div>
                  </div>
                </div>
              `
            });
            console.log('Revision accepted email sent to user:', requestUser.email);
          }
        }
      } catch (emailError) {
        console.error('Error sending revision status email:', emailError);
        // Don't fail the request if email fails
      }

      res.json(updatedRevision);
    } catch (error) {
      console.error('Error updating revision request status:', error);
      res.status(500).json({ error: 'Failed to update revision request status' });
    }
  });

  // Update quote response
  app.put('/api/quote-responses/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      if (!user || (user.userType !== 'partner' && user.activeUserType !== 'partner')) {
        return res.status(403).json({ error: 'Only partners can update quote responses' });
      }

      const quoteResponseId = parseInt(req.params.id);
      const updateData = req.body;
      
      const existingQuoteResponse = await storage.getQuoteResponseById(quoteResponseId);
      if (!existingQuoteResponse) {
        return res.status(404).json({ error: 'Quote response not found' });
      }

      const partner = await storage.getPartnerByUserId(user.id);
      if (!partner || existingQuoteResponse.partnerId !== partner.id) {
        return res.status(403).json({ error: 'Unauthorized to update this quote response' });
      }

      // Update the quote response
      const updatedQuoteResponse = await storage.updateQuoteResponse(quoteResponseId, {
        ...updateData,
        status: 'pending', // Reset to pending when edited
        updatedAt: new Date()
      });

      // Update the quote request status back to quote_sent
      await storage.updateQuoteRequest(existingQuoteResponse.quoteRequestId, { 
        status: 'quote_sent',
        updatedAt: new Date()
      });

      // Send notification to customer
      try {
        const quoteRequest = await storage.getQuoteRequestById(existingQuoteResponse.quoteRequestId);
        if (quoteRequest && quoteRequest.userId) {
          const customer = await storage.getUserById(quoteRequest.userId);
          if (customer) {
            const emailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #667eea; color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">Teklif Güncellendi!</h1>
                </div>
                <div style="padding: 30px; background: #f8f9fa;">
                  <p>Merhaba ${customer.firstName} ${customer.lastName},</p>
                  <p><strong>${partner.companyName}</strong> firması, "${quoteRequest.serviceNeeded}" hizmet talebiniz için gönderdiği teklifi güncelledi.</p>
                  <p><strong>Güncellenmiş Teklif Detayları:</strong></p>
                  <ul>
                    <li>Teklif Başlığı: ${updateData.title}</li>
                    <li>Toplam Tutar: ${(updateData.totalAmount / 100).toFixed(2)} TL</li>
                    <li>Geçerlilik Tarihi: ${new Date(updateData.validUntil).toLocaleDateString('tr-TR')}</li>
                  </ul>
                  <p>Güncellenmiş teklifi inceleyebilir, kabul edebilir veya revizyon talebinde bulunabilirsiniz.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.CLIENT_URL}/user-dashboard?tab=requests" 
                       style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                      Güncellenmiş Teklifi İncele
                    </a>
                  </div>
                </div>
              </div>
            `;

            await resendService.sendEmail({
              to: customer.email,
              subject: `Teklif Güncellendi - ${partner.companyName}`,
              html: emailContent,
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send update notification email:', emailError);
      }

      res.json({ success: true, quoteResponse: updatedQuoteResponse });
    } catch (error) {
      console.error('Error updating quote response:', error);
      res.status(500).json({ error: 'Failed to update quote response' });
    }
  });

  // Cancel quote response
  app.post('/api/quote-responses/:id/cancel', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      if (!user || (user.userType !== 'partner' && user.activeUserType !== 'partner')) {
        return res.status(403).json({ error: 'Only partners can cancel quote responses' });
      }

      const quoteResponseId = parseInt(req.params.id);
      const quoteResponse = await storage.getQuoteResponseById(quoteResponseId);
      
      if (!quoteResponse) {
        return res.status(404).json({ error: 'Quote response not found' });
      }

      const partner = await storage.getPartnerByUserId(user.id);
      if (!partner || quoteResponse.partnerId !== partner.id) {
        return res.status(403).json({ error: 'Unauthorized to cancel this quote response' });
      }

      // Update quote response status to cancelled
      await storage.updateQuoteResponse(quoteResponseId, { status: 'cancelled' });

      // Update the original quote request status back to pending
      await storage.updateQuoteRequest(quoteResponse.quoteRequestId, { status: 'pending' });

      // Send notification to customer
      try {
        const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
        if (quoteRequest && quoteRequest.userId) {
          const customer = await storage.getUserById(quoteRequest.userId);
          if (customer) {
            const emailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f56565; color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">Teklif İptal Edildi</h1>
                </div>
                <div style="padding: 30px; background: #f8f9fa;">
                  <p>Merhaba ${customer.firstName} ${customer.lastName},</p>
                  <p><strong>${partner.companyName}</strong> firması, "${quoteRequest.serviceNeeded}" hizmet talebiniz için gönderilen teklifi iptal etti.</p>
                  <p>Teklif Numarası: ${quoteResponse.quoteNumber}</p>
                  <p>Başka partnerlerden teklif almak için talebinizi açık tutabilirsiniz.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.CLIENT_URL}/user-dashboard?tab=requests" 
                       style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                      Taleplerimi Görüntüle
                    </a>
                  </div>
                </div>
              </div>
            `;

            await resendService.sendEmail({
              to: customer.email,
              subject: `Teklif İptal Edildi - ${partner.companyName}`,
              html: emailContent,
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
      }

      res.json({ success: true, message: 'Quote response cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling quote response:', error);
      res.status(500).json({ error: 'Failed to cancel quote response' });
    }
  });

  // Get revision requests for partner
  app.get('/api/partner/revision-requests', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      if (!user || (user.userType !== 'partner' && user.activeUserType !== 'partner')) {
        return res.status(403).json({ error: 'Only partners can access revision requests' });
      }

      const partner = await storage.getPartnerByUserId(user.id);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // Get all quote responses for this partner
      const quoteRequests = await storage.getQuoteRequestsByPartnerId(partner.id);
      const allRevisionRequests = [];

      for (const quoteRequest of quoteRequests) {
        const quoteResponse = await storage.getQuoteResponseByRequestId(quoteRequest.id);
        if (quoteResponse) {
          const revisionRequests = await storage.getRevisionRequestsByQuoteResponseId(quoteResponse.id);
          for (const revisionRequest of revisionRequests) {
            allRevisionRequests.push({
              ...revisionRequest,
              quoteResponse,
              quoteRequest,
              requestedItems: typeof revisionRequest.requestedItems === 'string' 
                ? JSON.parse(revisionRequest.requestedItems) 
                : revisionRequest.requestedItems
            });
          }
        }
      }

      res.json(allRevisionRequests);
    } catch (error) {
      console.error('Error fetching partner revision requests:', error);
      res.status(500).json({ error: 'Failed to fetch revision requests' });
    }
  });

  // Auth middleware functions
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  };

  const requireMasterAdmin = (req: any, res: any, next: any) => {
    if (req.user?.userType !== 'master_admin' && req.user?.activeUserType !== 'master_admin') {
      return res.status(403).json({ message: 'Master admin access required' });
    }
    next();
  };

  // System settings endpoints
  app.get("/api/admin/system-config", requireAuth, requireMasterAdmin, async (req, res) => {
    try {
      const configs = await storage.getSystemConfigs();
      
      // Organize configs into a structured object
      const configObject = {
        siteName: configs.find(c => c.key === 'siteName')?.value || 'DİP Platform',
        defaultLanguage: configs.find(c => c.key === 'defaultLanguage')?.value || 'tr',
        maintenanceMode: configs.find(c => c.key === 'maintenanceMode')?.value || false,
        autoApprovalEnabled: configs.find(c => c.key === 'autoApprovalEnabled')?.value || false,
        sessionTimeout: configs.find(c => c.key === 'sessionTimeout')?.value || 60,
        passwordMinLength: configs.find(c => c.key === 'passwordMinLength')?.value || 8,
        require2FA: configs.find(c => c.key === 'require2FA')?.value || false,
        heroVideoUrl: configs.find(c => c.key === 'heroVideoUrl')?.value || '',
        emailSettings: configs.find(c => c.key === 'emailSettings')?.value || {
          resendApiKey: '',
          fromEmail: '',
          fromName: 'DİP Platform'
        },
        smsSettings: configs.find(c => c.key === 'smsSettings')?.value || {
          netgsmUsername: '',
          netgsmPassword: '',
          netgsmMsgHeader: ''
        }
      };
      
      res.json(configObject);
    } catch (error) {
      console.error('Error fetching system config:', error);
      res.status(500).json({ error: 'Failed to fetch system config' });
    }
  });

  app.patch("/api/admin/system-config", requireAuth, requireMasterAdmin, async (req, res) => {
    try {
      const updates = req.body;
      
      // Update each config key
      for (const [key, value] of Object.entries(updates)) {
        await storage.updateSystemConfig(key, value);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating system config:', error);
      res.status(500).json({ error: 'Failed to update system config' });
    }
  });

  // Admin categories management
  app.get("/api/admin/categories", requireAuth, requireMasterAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  app.post("/api/admin/categories", requireAuth, requireMasterAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      const category = await storage.createCategory({ name, description, isActive: true });
      res.json(category);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  app.patch("/api/admin/categories/:id", requireAuth, requireMasterAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const category = await storage.updateCategory(parseInt(id), updates);
      res.json(category);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  });

  // Admin services management
  app.get("/api/admin/services", requireAuth, requireMasterAdmin, async (req, res) => {
    try {
      const services = await storage.getAllServicesWithCategories();
      res.json(services);
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ error: 'Failed to fetch services' });
    }
  });

  app.post("/api/admin/services", requireAuth, requireMasterAdmin, async (req, res) => {
    try {
      const { name, description, category } = req.body;
      const service = await storage.createService({ 
        name, 
        description, 
        categoryId: 1, // Default category ID for compatibility
        isActive: true, 
        createdBy: req.user!.id 
      });
      // Update the category field separately if provided
      if (category && category !== 'Genel') {
        await storage.updateService(service.id, { category });
      }
      res.json(service);
    } catch (error) {
      console.error('Error creating service:', error);
      res.status(500).json({ error: 'Failed to create service' });
    }
  });

  app.patch("/api/admin/services/:id", requireAuth, requireMasterAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const service = await storage.updateService(parseInt(id), updates);
      res.json(service);
    } catch (error) {
      console.error('Error updating service:', error);
      res.status(500).json({ error: 'Failed to update service' });
    }
  });



  // Partner Services Management Routes
  app.get("/api/partner/services", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const selectedServices = await storage.getPartnerSelectedServices(partner.id);
      res.json(selectedServices);
    } catch (error) {
      console.error('Error fetching partner services:', error);
      res.status(500).json({ message: 'Failed to fetch partner services' });
    }
  });

  app.post("/api/partner/services", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const { serviceId } = req.body;
      
      if (!serviceId) {
        return res.status(400).json({ message: "Service ID is required" });
      }

      await storage.addPartnerService(partner.id, serviceId);
      res.json({ success: true, message: "Service added successfully" });
    } catch (error) {
      console.error('Error adding partner service:', error);
      res.status(500).json({ message: 'Failed to add service' });
    }
  });

  app.delete("/api/partner/services/:serviceId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const { serviceId } = req.params;
      await storage.removePartnerService(partner.id, parseInt(serviceId));
      res.json({ success: true, message: "Service removed successfully" });
    } catch (error) {
      console.error('Error removing partner service:', error);
      res.status(500).json({ message: 'Failed to remove service' });
    }
  });

  // Get specific partner's services endpoint
  app.get("/api/partners/:partnerId/services", async (req, res) => {
    try {
      const { partnerId } = req.params;
      const selectedServices = await storage.getPartnerSelectedServices(parseInt(partnerId));
      res.json(selectedServices);
    } catch (error) {
      console.error('Error fetching partner services:', error);
      res.status(500).json({ message: 'Failed to fetch partner services' });
    }
  });

  // Admin: Add service to specific partner
  app.post("/api/partners/:partnerId/services", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user;
    if (!user || !["master_admin", "editor_admin"].includes(user.userType)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { partnerId } = req.params;
      const { serviceId } = req.body;
      
      if (!serviceId) {
        return res.status(400).json({ message: "Service ID is required" });
      }

      await storage.addPartnerService(parseInt(partnerId), serviceId);
      res.json({ success: true, message: "Service added to partner successfully" });
    } catch (error) {
      console.error('Error adding service to partner:', error);
      res.status(500).json({ message: 'Failed to add service to partner' });
    }
  });

  // Admin: Remove service from specific partner
  app.delete("/api/partners/:partnerId/services/:serviceId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user;
    if (!user || !["master_admin", "editor_admin"].includes(user.userType)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { partnerId, serviceId } = req.params;
      await storage.removePartnerService(parseInt(partnerId), parseInt(serviceId));
      res.json({ success: true, message: "Service removed from partner successfully" });
    } catch (error) {
      console.error('Error removing service from partner:', error);
      res.status(500).json({ message: 'Failed to remove service from partner' });
    }
  });

  app.post("/api/partner/services/new", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const { name, description, category } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Service name is required" });
      }

      // Create new service in the pool
      const newService = await storage.createServiceInPool({
        name,
        description,
        category,
        createdBy: user!.id
      });

      // Automatically add it to partner's services
      await storage.addPartnerService(partner.id, newService.id);

      res.json({ success: true, service: newService, message: "Service created and added successfully" });
    } catch (error) {
      console.error('Error creating new service:', error);
      res.status(500).json({ message: 'Failed to create service' });
    }
  });

  app.get("/api/services/:serviceName/partners", async (req, res) => {
    try {
      const { serviceName } = req.params;
      const decodedServiceName = decodeURIComponent(serviceName);
      
      // Find service by name first
      const service = await storage.getServiceByName(decodedServiceName);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      const partnersWithUsers = await storage.getPartnersOfferingService(service.id);
      res.json(partnersWithUsers);
    } catch (error) {
      console.error('Error fetching service partners:', error);
      res.status(500).json({ message: 'Failed to fetch service partners' });
    }
  });

  // Partner Markets Management Routes
  app.get("/api/partner/markets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const selectedMarkets = await storage.getPartnerSelectedMarkets(partner.id);
      res.json(selectedMarkets);
    } catch (error) {
      console.error('Error fetching partner markets:', error);
      res.status(500).json({ message: 'Failed to fetch partner markets' });
    }
  });

  app.post("/api/partner/markets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const { marketId } = req.body;
      
      if (!marketId) {
        return res.status(400).json({ message: "Market ID is required" });
      }

      await storage.addPartnerMarket(partner.id, marketId);
      res.json({ success: true, message: "Market added successfully" });
    } catch (error) {
      console.error('Error adding partner market:', error);
      res.status(500).json({ message: 'Failed to add market' });
    }
  });

  app.delete("/api/partner/markets/:marketId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const { marketId } = req.params;
      await storage.removePartnerMarket(partner.id, parseInt(marketId));
      res.json({ success: true, message: "Market removed successfully" });
    } catch (error) {
      console.error('Error removing partner market:', error);
      res.status(500).json({ message: 'Failed to remove market' });
    }
  });

  // Create new market (for partners to add new markets to the system)
  app.post("/api/partner/markets/new", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      const partner = await storage.getPartnerByUserId(user!.id);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const { name, nameEn, region } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: "Market name is required" });
      }

      // Check if market already exists
      const existingMarket = await storage.getMarketByName(name.trim());
      if (existingMarket) {
        // If market exists, just add it to partner's markets
        await storage.addPartnerMarket(partner.id, existingMarket.id);
        return res.json({ success: true, market: existingMarket, message: "Existing market added to your profile" });
      }

      // Create new market
      const newMarket = await storage.createMarket({
        name: name.trim(),
        nameEn: nameEn?.trim() || null,
        region: region?.trim() || null,
        isActive: true
      });

      // Add new market to partner's markets
      await storage.addPartnerMarket(partner.id, newMarket.id);

      res.json({ success: true, market: newMarket, message: "Market created and added successfully" });
    } catch (error) {
      console.error('Error creating new market:', error);
      res.status(500).json({ message: 'Failed to create market' });
    }
  });

  // Markets API endpoints
  app.get("/api/markets", async (req, res) => {
    try {
      const markets = await storage.getAllMarkets();
      res.json(markets);
    } catch (error) {
      console.error('Error fetching markets:', error);
      res.status(500).json({ message: 'Failed to fetch markets' });
    }
  });

  // Admin: Add market to specific partner
  app.post("/api/partners/:partnerId/markets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user;
    if (!user || !["master_admin", "editor_admin"].includes(user.userType)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { partnerId } = req.params;
      const { marketId } = req.body;
      
      if (!marketId) {
        return res.status(400).json({ message: "Market ID is required" });
      }

      await storage.addPartnerMarket(parseInt(partnerId), marketId);
      res.json({ success: true, message: "Market added to partner successfully" });
    } catch (error) {
      console.error('Error adding market to partner:', error);
      res.status(500).json({ message: 'Failed to add market to partner' });
    }
  });

  // Admin: Remove market from specific partner
  app.delete("/api/partners/:partnerId/markets/:marketId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user;
    if (!user || !["master_admin", "editor_admin"].includes(user.userType)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { partnerId, marketId } = req.params;
      await storage.removePartnerMarket(parseInt(partnerId), parseInt(marketId));
      res.json({ success: true, message: "Market removed from partner successfully" });
    } catch (error) {
      console.error('Error removing market from partner:', error);
      res.status(500).json({ message: 'Failed to remove market from partner' });
    }
  });

  // Get specific partner's markets endpoint
  app.get("/api/partners/:partnerId/markets", async (req, res) => {
    try {
      const { partnerId } = req.params;
      const selectedMarkets = await storage.getPartnerSelectedMarkets(parseInt(partnerId));
      res.json(selectedMarkets);
    } catch (error) {
      console.error('Error fetching partner markets:', error);
      res.status(500).json({ message: 'Failed to fetch partner markets' });
    }
  });

  // Create new market in pool
  app.post("/api/partner/markets/new", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user;
      const { name, nameEn, region } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Market name is required" });
      }

      const newMarket = await storage.createMarketInPool({
        name,
        nameEn,
        region,
        createdBy: user!.id
      });

      res.json({ success: true, market: newMarket, message: "Market created successfully" });
    } catch (error) {
      console.error('Error creating new market:', error);
      res.status(500).json({ message: 'Failed to create market' });
    }
  });

  // Register admin API routes
  (async () => {
    const adminModule = await import('./admin-routes.js');
    const adminRoutes = adminModule.createAdminRoutes(storage);
    app.use("/api/admin", adminRoutes);
  })();

  // Register notification API routes
  (async () => {
    const notificationModule = await import('./routes/notifications');
    const notificationRoutes = notificationModule.default;
    app.use("/api/notifications", notificationRoutes);
  })();

  const httpServer = createServer(app);

  // Initialize Socket.IO for real-time messaging
  setupSocketIO(httpServer);

  // Socket.IO handles real-time messaging now

  // User-Partner Interaction endpoints
  app.get("/api/user/partner-interactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user!.id;
      const interactions = await storage.getUserPartnerInteractions(userId);
      res.json(interactions);
    } catch (error) {
      console.error('Error fetching user partner interactions:', error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.post("/api/user/dismiss-info-card", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user!.id;
      const { cardType, referenceId } = req.body;
      
      await storage.dismissInfoCard(userId, cardType, referenceId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error dismissing info card:', error);
      res.status(500).json({ message: "Failed to dismiss info card" });
    }
  });

  app.get("/api/user/quote-history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user!.id;
      const history = await storage.getUserQuoteHistory(userId);
      res.json(history);
    } catch (error) {
      console.error('Error fetching quote history:', error);
      res.status(500).json({ message: "Failed to fetch quote history" });
    }
  });

  app.post("/api/user/record-profile-visit", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userId = req.user!.id;
      const { partnerId } = req.body;
      
      await storage.recordPartnerProfileVisit(userId, partnerId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error recording profile visit:', error);
      res.status(500).json({ message: "Failed to record profile visit" });
    }
  });

  // Recipient Accounts API endpoints
  app.get("/api/partner/recipient-accounts", async (req, res) => {
    if (!req.isAuthenticated() || !['partner', 'master_admin', 'editor_admin'].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Partner or admin access required" });
    }

    try {
      let partnerId: number;
      
      if (req.user!.userType === 'partner') {
        const partner = await storage.getPartnerByUserId(req.user!.id);
        if (!partner) {
          return res.status(404).json({ message: "Partner record not found" });
        }
        partnerId = partner.id;
      } else {
        // Admin accessing specific partner's accounts
        const { partnerId: queryPartnerId } = req.query;
        if (!queryPartnerId) {
          return res.status(400).json({ message: "Partner ID required for admin access" });
        }
        partnerId = parseInt(queryPartnerId as string);
      }

      const accounts = await storage.getRecipientAccounts(partnerId);
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching recipient accounts:', error);
      res.status(500).json({ message: "Failed to fetch recipient accounts" });
    }
  });

  app.post("/api/partner/recipient-accounts", async (req, res) => {
    if (!req.isAuthenticated() || !['partner', 'master_admin', 'editor_admin'].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Partner or admin access required" });
    }

    try {
      let partnerId: number;
      
      if (req.user!.userType === 'partner') {
        const partner = await storage.getPartnerByUserId(req.user!.id);
        if (!partner) {
          return res.status(404).json({ message: "Partner record not found" });
        }
        partnerId = partner.id;
      } else {
        // Admin creating account for specific partner
        if (!req.body.partnerId) {
          return res.status(400).json({ message: "Partner ID required for admin access" });
        }
        partnerId = req.body.partnerId;
      }

      const validatedData = insertRecipientAccountSchema.parse({
        ...req.body,
        partnerId
      });

      const newAccount = await storage.createRecipientAccount(validatedData);
      res.json(newAccount);
    } catch (error) {
      console.error('Error creating recipient account:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create recipient account" });
    }
  });

  app.put("/api/partner/recipient-accounts/:id", async (req, res) => {
    if (!req.isAuthenticated() || !['partner', 'master_admin', 'editor_admin'].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Partner or admin access required" });
    }

    try {
      const accountId = parseInt(req.params.id);
      
      // Verify ownership for partners
      if (req.user!.userType === 'partner') {
        const partner = await storage.getPartnerByUserId(req.user!.id);
        if (!partner) {
          return res.status(404).json({ message: "Partner record not found" });
        }
        
        const accounts = await storage.getRecipientAccounts(partner.id);
        const accountExists = accounts.some(acc => acc.id === accountId);
        if (!accountExists) {
          return res.status(403).json({ message: "Account not found or access denied" });
        }
      }

      const validatedData = insertRecipientAccountSchema.partial().parse(req.body);
      const updatedAccount = await storage.updateRecipientAccount(accountId, validatedData);
      
      if (!updatedAccount) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json(updatedAccount);
    } catch (error) {
      console.error('Error updating recipient account:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update recipient account" });
    }
  });

  app.delete("/api/partner/recipient-accounts/:id", async (req, res) => {
    if (!req.isAuthenticated() || !['partner', 'master_admin', 'editor_admin'].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Partner or admin access required" });
    }

    try {
      const accountId = parseInt(req.params.id);
      
      // Verify ownership for partners
      if (req.user!.userType === 'partner') {
        const partner = await storage.getPartnerByUserId(req.user!.id);
        if (!partner) {
          return res.status(404).json({ message: "Partner record not found" });
        }
        
        const accounts = await storage.getRecipientAccounts(partner.id);
        const accountExists = accounts.some(acc => acc.id === accountId);
        if (!accountExists) {
          return res.status(403).json({ message: "Account not found or access denied" });
        }
      }

      const success = await storage.deleteRecipientAccount(accountId);
      
      if (!success) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting recipient account:', error);
      res.status(500).json({ message: "Failed to delete recipient account" });
    }
  });

  app.patch("/api/partner/recipient-accounts/:id/toggle-default", async (req, res) => {
    if (!req.isAuthenticated() || !['partner', 'master_admin', 'editor_admin'].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Partner or admin access required" });
    }

    try {
      const accountId = parseInt(req.params.id);
      const { isDefault } = req.body;
      
      let partnerId: number;
      
      if (req.user!.userType === 'partner') {
        const partner = await storage.getPartnerByUserId(req.user!.id);
        if (!partner) {
          return res.status(404).json({ message: "Partner record not found" });
        }
        partnerId = partner.id;
        
        // Verify ownership
        const accounts = await storage.getRecipientAccounts(partner.id);
        const accountExists = accounts.some(acc => acc.id === accountId);
        if (!accountExists) {
          return res.status(403).json({ message: "Account not found or access denied" });
        }
      } else {
        // Admin access - get partnerId from query or body
        partnerId = req.body.partnerId || parseInt(req.query.partnerId as string);
        if (!partnerId) {
          return res.status(400).json({ message: "Partner ID required for admin access" });
        }
      }

      const updatedAccount = await storage.toggleDefaultRecipientAccount(accountId, isDefault, partnerId);
      
      if (!updatedAccount) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json(updatedAccount);
    } catch (error) {
      console.error('Error toggling default account:', error);
      res.status(500).json({ message: "Failed to toggle default account" });
    }
  });

  // Payment Instructions endpoint
  app.post("/api/partner/send-payment-instructions", async (req, res) => {
    if (!req.isAuthenticated() || !['partner', 'master_admin', 'editor_admin'].includes(req.user!.userType)) {
      return res.status(403).json({ message: "Partner or admin access required" });
    }

    try {
      const { quoteResponseId, accountData, instructions, saveAccount } = req.body;
      
      // Get partner info
      let partnerId: number;
      if (req.user!.userType === 'partner') {
        const partner = await storage.getPartnerByUserId(req.user!.id);
        if (!partner) {
          return res.status(404).json({ message: "Partner record not found" });
        }
        partnerId = partner.id;
      } else {
        return res.status(403).json({ message: "Only partners can send payment instructions" });
      }

      // Get quote response to find the user
      const quoteResponse = await storage.getQuoteResponseById(quoteResponseId);
      if (!quoteResponse) {
        return res.status(404).json({ message: "Quote response not found" });
      }

      // Get quote request to find the user
      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (!quoteRequest) {
        return res.status(404).json({ message: "Quote request not found" });
      }

      // Save account data if requested and not using existing account
      if (saveAccount && accountData) {
        try {
          const accountValidated = insertRecipientAccountSchema.parse({
            partnerId,
            accountName: accountData.bankName, // Only bank name as requested
            bankName: accountData.bankName,
            accountHolderName: accountData.accountHolderName,
            accountNumber: accountData.accountNumber || '',
            iban: accountData.iban,
            swiftCode: accountData.swiftCode || '',
            isDefault: false
          });
          await storage.createRecipientAccount(accountValidated);
        } catch (accountError) {
          console.warn('Failed to save account, continuing with payment instructions:', accountError);
        }
      }

      // Get user email to send notification
      if (!quoteRequest.userId) {
        return res.status(400).json({ message: "Quote request has no associated user" });
      }
      
      const user = await storage.getUser(quoteRequest.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if payment instructions were previously sent (for update notification)
      const isUpdate = quoteResponse.paymentInstructions !== null && quoteResponse.paymentInstructions !== undefined;

      // Create payment instructions email
      const emailData = {
        to: user.email,
        subject: isUpdate ? 'Havale / EFT ödeme bilgileri güncellendi!' : `Ödeme Bilgileri - ${quoteRequest.serviceNeeded.replace(/\r?\n/g, ' ').trim()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e40af;">${isUpdate ? 'Güncellenmiş ' : ''}Havale / EFT Bilgileri</h2>
            <p>Merhaba ${user.firstName},</p>
            <p>Talep ettiğiniz hizmet için ${isUpdate ? 'güncellenmiş ' : ''}havale / EFT bilgileri aşağıda yer almaktadır:</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Banka Bilgileri</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold; width: 30%;">Banka:</td>
                  <td style="padding: 8px 0;">${accountData.bankName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold;">Alıcı Adı:</td>
                  <td style="padding: 8px 0;">${accountData.accountHolderName}</td>
                </tr>
                ${accountData.accountNumber ? `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold;">Hesap No:</td>
                  <td style="padding: 8px 0;">${accountData.accountNumber}</td>
                </tr>
                ` : ''}
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold;">IBAN:</td>
                  <td style="padding: 8px 0; font-family: monospace; background-color: #fff; padding: 4px 8px; border-radius: 4px;">${accountData.iban}</td>
                </tr>
                ${accountData.swiftCode ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">SWIFT Kodu:</td>
                  <td style="padding: 8px 0;">${accountData.swiftCode}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${instructions ? `
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">Ödeme Yönergeleri</h3>
              <p style="margin-bottom: 0; white-space: pre-line;">${instructions}</p>
            </div>
            ` : ''}

            <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #065f46;">Tutar Bilgisi</h3>
              <p style="margin-bottom: 0; font-size: 18px; font-weight: bold;">
                Toplam Tutar: ₺${(quoteResponse.totalAmount / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div style="background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #374151; font-size: 14px;">
                Ödeme yaptınız mı? Buradan partnere bilgi verin:
              </p>
              <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://dip-partner-portal.replit.app'}/user-panel?tab=service-requests" 
                 style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Hizmet Taleplerim
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              Bu e-posta dip | iş ortakları platformu üzerinden gönderilmiştir.
            </p>
          </div>
        `
      };

      // Save payment instructions to quote response
      const paymentInstructionsData = {
        accountData,
        instructions,
        sentAt: new Date().toISOString()
      };

      await storage.updateQuoteResponse(quoteResponseId, {
        paymentInstructions: paymentInstructionsData
      });

      // Send email notification
      const emailResult = await resendService.sendEmail(emailData);

      if (!emailResult.success) {
        console.error('Failed to send payment instructions email:', emailResult.error);
        return res.status(500).json({ message: "Failed to send email notification" });
      }

      res.json({ 
        success: true, 
        message: "Payment instructions sent successfully",
        sentTo: user.email 
      });

    } catch (error) {
      console.error('Error sending payment instructions:', error);
      res.status(500).json({ message: "Failed to send payment instructions" });
    }
  });

  // Get payment instructions for quote response
  app.get("/api/quote-responses/:id/payment-instructions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const quoteResponseId = parseInt(req.params.id);
      
      // Get quote response
      const quoteResponse = await storage.getQuoteResponseById(quoteResponseId);
      if (!quoteResponse) {
        return res.status(404).json({ message: "Quote response not found" });
      }

      // Get quote request to verify user has access
      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (!quoteRequest) {
        return res.status(404).json({ message: "Quote request not found" });
      }

      // Check if user has access to this quote
      if (req.user!.userType === 'user' && quoteRequest.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Return payment instructions if available
      res.json({
        hasPaymentInstructions: !!quoteResponse.paymentInstructions,
        paymentInstructions: quoteResponse.paymentInstructions || null
      });

    } catch (error) {
      console.error('Error fetching payment instructions:', error);
      res.status(500).json({ message: "Failed to fetch payment instructions" });
    }
  });

  // Upload middleware for payment receipts
  const uploadReceipts = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only image and PDF files are allowed!'));
      }
    }
  });

  // Payment confirmation endpoint
  app.post('/api/payment-confirmations', uploadReceipts.single('receipt'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = req.user!;
      const { quoteResponseId, paymentMethod, amount, note } = req.body;
      const receiptFile = req.file;

      if (!quoteResponseId || !paymentMethod || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify quote response exists and user has access
      const quoteResponse = await storage.getQuoteResponseById(parseInt(quoteResponseId));
      if (!quoteResponse) {
        return res.status(404).json({ message: "Quote response not found" });
      }

      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (!quoteRequest || quoteRequest.userId !== user.id) {
        return res.status(403).json({ message: "Unauthorized to confirm payment for this quote" });
      }

      // Handle file upload if present
      let receiptPath = null;
      if (receiptFile) {
        try {
          const uploadResult = await supabaseStorage.uploadFile(receiptFile, 'PARTNER_DOCUMENTS');
          if (uploadResult.success) {
            receiptPath = uploadResult.path;
          }
        } catch (uploadError) {
          console.error('Receipt upload error:', uploadError);
          // Continue without receipt if upload fails
        }
      }

      // Get partner info for the confirmation record
      const partner = await storage.getPartner(quoteResponse.partnerId);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      // Create payment confirmation record
      const paymentConfirmation = {
        quoteResponseId: parseInt(quoteResponseId),
        userId: user.id,
        partnerId: partner.id,
        paymentMethod,
        amount: parseInt(amount), // Amount is already in cents from frontend
        receiptFileUrl: receiptPath,
        receiptFileName: receiptFile?.originalname || null,
        status: 'pending'
      };

      await storage.createPaymentConfirmation(paymentConfirmation);

      const partnerUser = await storage.getUser(partner.userId);
      if (!partnerUser) {
        return res.status(404).json({ message: "Partner user not found" });
      }

      // Send email notification to partner with attachment
      const paymentMethodTexts = {
        card: 'Kredi/Banka Kartı',
        transfer: 'Havale/EFT',
        other: 'Diğer Yöntemler'
      };

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
            <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Ödeme Bildirimi Alındı</h2>
            <p style="color: #666; line-height: 1.6;">Merhaba ${partner.companyName},</p>
            <p style="color: #666; line-height: 1.6;">Müşteriniz ${user.firstName} ${user.lastName} aşağıdaki teklif için ödeme yaptığını bildirdi:</p>
            
            <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1976d2;">Ödeme Detayları</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Teklif:</td>
                  <td style="padding: 8px 0;">${quoteResponse.title || 'Teklif'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Ödeme Yöntemi:</td>
                  <td style="padding: 8px 0;">${paymentMethodTexts[paymentMethod as keyof typeof paymentMethodTexts] || paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Bildirilen Tutar:</td>
                  <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #1976d2;">₺${(parseInt(amount) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                </tr>
                ${note ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Not:</td>
                  <td style="padding: 8px 0;">${note}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${receiptPath ? '<p style="color: #666; line-height: 1.6;"><strong>📎 Dekont ektedir.</strong></p>' : ''}
            <p style="color: #666; line-height: 1.6;">Partner panelinizden ödemeyi onaylayabilir veya reddedebilirsiniz.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://dip-partner-portal.replit.app'}/partner-dashboard" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Partner Paneli
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              Bu e-posta dip | iş ortakları platformu üzerinden gönderilmiştir.
            </p>
          </div>
        </div>
      `;

      // Send email to partner with attachment using Resend
      let emailSuccess = false;
      
      if (receiptPath && receiptFile) {
        try {
          // Get file from Supabase and convert to base64 for Resend attachment
          const fileData = await supabaseStorage.downloadFile('PARTNER_DOCUMENTS', receiptPath);
          
          if (fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            const base64Content = buffer.toString('base64');
            
            // Send email with attachment using Resend
            const emailResult = await resendService.sendEmailWithAttachment({
              to: partnerUser.email,
              subject: `Ödeme Bildirimi - ${user.firstName} ${user.lastName}`,
              html: emailContent,
              attachments: [{
                filename: receiptFile.originalname,
                content: base64Content
              }]
            });
            emailSuccess = emailResult.success;
          }
        } catch (error) {
          console.error('Error attaching receipt to email:', error);
          // Fallback to regular email without attachment
          const emailResult = await resendService.sendEmail({
            to: partnerUser.email,
            subject: `Ödeme Bildirimi - ${user.firstName} ${user.lastName}`,
            html: emailContent,
          });
          emailSuccess = emailResult.success;
        }
      } else {
        // Send regular email without attachment
        const emailResult = await resendService.sendEmail({
          to: partnerUser.email,
          subject: `Ödeme Bildirimi - ${user.firstName} ${user.lastName}`,
          html: emailContent,
        });
        emailSuccess = emailResult.success;
        emailSuccess = emailResult.success;
      }

      if (!emailSuccess) {
        console.error('Failed to send payment confirmation email');
        // Don't fail the request if email fails
      }

      res.json({ 
        success: true, 
        message: "Payment confirmation sent successfully",
        paymentConfirmationId: paymentConfirmation.quoteResponseId 
      });

    } catch (error) {
      console.error('Error creating payment confirmation:', error);
      res.status(500).json({ message: "Failed to create payment confirmation" });
    }
  });

  // Get payment confirmations for a partner
  app.get('/api/partner/payment-confirmations', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = req.user!;
      if (user.userType !== 'partner') {
        return res.status(403).json({ message: "Partner access required" });
      }

      const partner = await storage.getPartnerByUserId(user.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      // Get all quote responses for this partner
      const partnerQuoteResponses = await db
        .select()
        .from(quoteResponses)
        .where(eq(quoteResponses.partnerId, partner.id));

      // Get payment confirmations for all these quote responses
      const paymentConfirmations = [];
      for (const quoteResponse of partnerQuoteResponses) {
        const confirmations = await storage.getPaymentConfirmationsByQuoteResponseId(quoteResponse.id);
        for (const confirmation of confirmations) {
          const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
          const customer = quoteRequest ? await storage.getUser(quoteRequest.userId!) : null;
          
          // Create user object with proper structure expected by frontend
          const userInfo = customer ? {
            id: customer.id,
            email: customer.email,
            fullName: `${customer.firstName} ${customer.lastName}`.trim(),
            firstName: customer.firstName,
            lastName: customer.lastName
          } : null;
          
          paymentConfirmations.push({
            ...confirmation,
            quoteResponse: {
              ...quoteResponse,
              title: quoteResponse.title,
              quoteNumber: quoteResponse.quoteNumber
            },
            quoteRequest,
            customer,
            user: userInfo // Add user field for frontend compatibility
          });
        }
      }

      res.json(paymentConfirmations);
    } catch (error) {
      console.error('Error fetching partner payment confirmations:', error);
      res.status(500).json({ message: "Failed to fetch payment confirmations" });
    }
  });

  // Download payment receipt endpoint
  app.get('/api/payment-confirmations/:id/receipt', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = req.user!;
      const paymentConfirmationId = parseInt(req.params.id);
      
      const paymentConfirmation = await storage.getPaymentConfirmationById(paymentConfirmationId);
      if (!paymentConfirmation) {
        return res.status(404).json({ message: "Payment confirmation not found" });
      }

      // Check if user has access (must be the partner)
      if (user.userType === 'partner') {
        const partner = await storage.getPartnerByUserId(user.id);
        if (!partner || partner.id !== paymentConfirmation.partnerId) {
          return res.status(403).json({ message: "Unauthorized to access this receipt" });
        }
      } else {
        return res.status(403).json({ message: "Partner access required" });
      }

      if (!paymentConfirmation.receiptFileUrl) {
        return res.status(404).json({ message: "No receipt available" });
      }

      try {
        // Download file from Supabase storage
        const fileData = await supabaseStorage.downloadFile('PARTNER_DOCUMENTS', paymentConfirmation.receiptFileUrl);

        if (!fileData) {
          return res.status(404).json({ message: "Receipt file not found" });
        }

        // Set appropriate headers for file download
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const filename = paymentConfirmation.receiptFileName || 'dekont.pdf';
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length);
        
        res.send(buffer);

      } catch (error) {
        console.error('Error downloading receipt:', error);
        res.status(500).json({ message: "Failed to download receipt" });
      }

    } catch (error) {
      console.error('Error accessing payment confirmation receipt:', error);
      res.status(500).json({ message: "Failed to access receipt" });
    }
  });

  // Update payment confirmation status (approve/reject)
  // Update payment confirmation status (new endpoint format)
  app.patch('/api/payment-confirmations/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = req.user!;
      const confirmationId = parseInt(req.params.id);
      const { status, note } = req.body;

      if (!['confirmed', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'confirmed' or 'rejected'" });
      }

      // Get payment confirmation
      const paymentConfirmation = await storage.getPaymentConfirmationById(confirmationId);
      if (!paymentConfirmation) {
        return res.status(404).json({ message: "Payment confirmation not found" });
      }

      // Get quote response to verify partner ownership
      if (!paymentConfirmation.quoteResponseId) {
        return res.status(400).json({ message: "Invalid payment confirmation data" });
      }
      const quoteResponse = await storage.getQuoteResponseById(paymentConfirmation.quoteResponseId);
      if (!quoteResponse) {
        return res.status(404).json({ message: "Quote response not found" });
      }

      // Verify user is the partner for this quote
      if (user.userType === 'partner') {
        const partner = await storage.getPartnerByUserId(user.id);
        if (!partner || partner.id !== quoteResponse.partnerId) {
          return res.status(403).json({ message: "Unauthorized to update this payment confirmation" });
        }
      } else if (user.userType !== 'master_admin' && user.userType !== 'editor_admin') {
        return res.status(403).json({ message: "Partner or admin access required" });
      }

      // Update payment confirmation status
      await storage.updatePaymentConfirmation(confirmationId, {
        status,
        partnerNotes: note || null
      });

      // If confirmed, update quote request status to completed and create ongoing project
      if (status === 'confirmed') {
        await storage.updateQuoteRequest(quoteResponse.quoteRequestId, {
          status: 'completed'
        });

        // Create ongoing project from the confirmed payment
        const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
        if (quoteRequest && quoteRequest.userId && quoteResponse.items) {
          // Parse quote items to determine project type
          const items = typeof quoteResponse.items === 'string' 
            ? JSON.parse(quoteResponse.items) 
            : quoteResponse.items;
          
          // Check if it's a monthly project (any item has recurring payment)
          const isMonthlyProject = items.some((item: any) => 
            item.isRecurring === true || item.recurring === true || 
            item.paymentType === 'monthly' || item.billing === 'monthly'
          );

          const projectType = isMonthlyProject ? 'monthly' : 'one_time';
          const nextPaymentDue = isMonthlyProject ? 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days from now
            undefined;

          // Check if ongoing project already exists for this quote response
          const existingProject = await storage.getOngoingProjectByQuoteResponse(quoteResponse.id);
          if (!existingProject) {
            await storage.createOngoingProject({
              quoteResponseId: quoteResponse.id,
              userId: quoteRequest.userId,
              partnerId: quoteResponse.partnerId,
              projectTitle: quoteResponse.title,
              projectNumber: quoteResponse.quoteNumber,
              projectType,
              status: 'active',
              lastPaymentDate: new Date(),
              nextPaymentDue
            });
          }
        }
      }

      // Send email notification to customer
      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (quoteRequest && quoteRequest.userId) {
        const customer = await storage.getUser(quoteRequest.userId);
        const partner = await storage.getPartner(quoteResponse.partnerId);
        
        if (customer && partner) {
          const statusText = status === 'confirmed' ? 'onaylandı' : 'reddedildi';
          const statusColor = status === 'confirmed' ? '#10b981' : '#ef4444';
          
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
                <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
              </div>
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333; margin-bottom: 20px;">Ödeme Durumu Güncellendi</h2>
                
                <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
                  <h3 style="color: #333; margin: 0 0 10px 0;">Teklif Bilgileri</h3>
                  <p><strong>Partner:</strong> ${partner.companyName}</p>
                  <p><strong>Teklif Numarası:</strong> ${quoteResponse.quoteNumber}</p>
                  <p><strong>Durum:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText.toUpperCase()}</span></p>
                  ${note ? `<p><strong>Partner Notu:</strong> ${note}</p>` : ''}
                </div>

                ${status === 'confirmed' ? `
                  <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #065f46;">
                      <strong>✓ Ödemeniz onaylandı!</strong><br>
                      İş ortağımız ödemenizi aldığını onayladı. İşbirliğiniz için teşekkür ederiz.
                    </p>
                  </div>
                ` : `
                  <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #991b1b;">
                      <strong>⚠ Ödeme Sorunu</strong><br>
                      İş ortağımız ödemenizi alamadığını bildirdi. Lütfen ödeme durumunuzu kontrol edin ve gerekirse iş ortağı ile iletişime geçin.
                    </p>
                    <div style="margin-top: 15px;">
                      <a href="${process.env.FRONTEND_URL || 'https://dip.tc'}/messages" 
                         style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        İş Ortağına Mesaj Gönder
                      </a>
                    </div>
                  </div>
                `}
              </div>
              
              <div style="background: #e5e7eb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">Bu e-posta DİP Partner Portal tarafından otomatik olarak gönderilmiştir.</p>
                <p style="margin: 5px 0 0 0;">© 2025 Digital Export Platform. Tüm Hakları Saklıdır.</p>
              </div>
            </div>
          `;

          await resendService.sendEmail({
            to: customer.email,
            subject: `Ödeme Durumu Güncellendi - ${quoteResponse.quoteNumber}`,
            html: emailContent
          });
        }
      }

      res.json({ 
        success: true, 
        message: `Payment ${status === 'confirmed' ? 'confirmed' : 'rejected'} successfully` 
      });
    } catch (error) {
      console.error('Error updating payment confirmation:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch('/api/payment-confirmations/:id/status', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = req.user!;
      const confirmationId = parseInt(req.params.id);
      const { status, note } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }

      // Get payment confirmation
      const paymentConfirmation = await storage.getPaymentConfirmationById(confirmationId);
      if (!paymentConfirmation) {
        return res.status(404).json({ message: "Payment confirmation not found" });
      }

      // Get quote response to verify partner ownership
      if (!paymentConfirmation.quoteResponseId) {
        return res.status(400).json({ message: "Invalid payment confirmation data" });
      }
      const quoteResponse = await storage.getQuoteResponseById(paymentConfirmation.quoteResponseId);
      if (!quoteResponse) {
        return res.status(404).json({ message: "Quote response not found" });
      }

      // Verify user is the partner for this quote
      if (user.userType === 'partner') {
        const partner = await storage.getPartnerByUserId(user.id);
        if (!partner || partner.id !== quoteResponse.partnerId) {
          return res.status(403).json({ message: "Unauthorized to update this payment confirmation" });
        }
      } else if (user.userType !== 'master_admin' && user.userType !== 'editor_admin') {
        return res.status(403).json({ message: "Partner or admin access required" });
      }

      // Update payment confirmation status
      await storage.updatePaymentConfirmation(confirmationId, {
        status,
        partnerNotes: note || null
      });

      // If approved, update quote request status to completed and create ongoing project
      if (status === 'approved') {
        await storage.updateQuoteRequest(quoteResponse.quoteRequestId, {
          status: 'completed'
        });

        // Create ongoing project from the approved payment
        const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
        if (quoteRequest && quoteRequest.userId && quoteResponse.items) {
          // Parse quote items to determine project type
          const items = typeof quoteResponse.items === 'string' 
            ? JSON.parse(quoteResponse.items) 
            : quoteResponse.items;
          
          // Check if it's a monthly project (any item has recurring payment)
          const isMonthlyProject = items.some((item: any) => 
            item.isRecurring === true || item.recurring === true || 
            item.paymentType === 'monthly' || item.billing === 'monthly'
          );

          const projectType = isMonthlyProject ? 'monthly' : 'one_time';
          const nextPaymentDue = isMonthlyProject ? 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days from now
            undefined;

          // Check if ongoing project already exists for this quote response
          const existingProject = await storage.getOngoingProjectByQuoteResponse(quoteResponse.id);
          if (!existingProject) {
            await storage.createOngoingProject({
              quoteResponseId: quoteResponse.id,
              userId: quoteRequest.userId,
              partnerId: quoteResponse.partnerId,
              projectTitle: quoteResponse.title,
              projectNumber: quoteResponse.quoteNumber,
              projectType,
              status: 'active',
              lastPaymentDate: new Date(),
              nextPaymentDue
            });
          }
        }
      }

      // Send email notification to customer
      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (quoteRequest && quoteRequest.userId) {
        const customer = await storage.getUser(quoteRequest.userId);
        const partner = await storage.getPartner(quoteResponse.partnerId);
        
        if (customer && partner) {
          const statusText = status === 'approved' ? 'onaylandı' : 'reddedildi';
          const statusColor = status === 'approved' ? '#10b981' : '#ef4444';
          
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
                <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
              </div>
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333; margin-bottom: 20px;">Ödeme ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h2>
                <p style="color: #666; line-height: 1.6;">Merhaba ${customer.firstName} ${customer.lastName},</p>
                <p style="color: #666; line-height: 1.6;">${partner.companyName} iş ortağımız ödeme bildiriminizi ${statusText}.</p>
                
                <div style="background: #f3f4f6; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: ${statusColor};">Ödeme Durumu</h3>
                  <p style="margin: 10px 0;"><strong>Teklif:</strong> ${quoteResponse.title || 'Teklif'}</p>
                  <p style="margin: 10px 0;"><strong>Tutar:</strong> ₺${(paymentConfirmation.amount / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                  <p style="margin: 10px 0;"><strong>Durum:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText.toUpperCase()}</span></p>
                  ${note ? `<p style="margin: 10px 0;"><strong>Partner Notu:</strong> ${note}</p>` : ''}
                </div>

                ${status === 'approved' ? `
                <p style="color: #666; line-height: 1.6;">Ödemeniz onaylandı ve hizmet talebiniz tamamlandı olarak işaretlendi. Hizmet sürecinin devamı için partnerin sizinle iletişime geçmesini bekleyebilirsiniz.</p>
                ` : `
                <p style="color: #666; line-height: 1.6;">Ödeme bildiriminiz reddedildi. Sorularınız için lütfen partner ile doğrudan iletişime geçin.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://dip-partner-portal.replit.app'}/messages" 
                     style="background: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    İş ortağına mesaj gönder
                  </a>
                </div>
                `}

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://dip-partner-portal.replit.app'}/service-requests" 
                     style="background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Hizmet Taleplerim
                  </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px;">
                  Bu e-posta dip | iş ortakları platformu üzerinden gönderilmiştir.
                </p>
              </div>
            </div>
          `;

          const emailResult = await resendService.sendEmail({
            to: customer.email,
            subject: `Ödeme ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} - ${partner.companyName}`,
            html: emailContent,
          });

          if (!emailResult.success) {
            console.error('Failed to send payment status email:', emailResult.error);
          }
        }
      }

      res.json({ 
        success: true, 
        message: `Payment confirmation ${status}`,
        status 
      });

    } catch (error) {
      console.error('Error updating payment confirmation status:', error);
      res.status(500).json({ message: "Failed to update payment confirmation status" });
    }
  });

  // Check if quote response has confirmed payment
  app.get('/api/quote-responses/:id/payment-status', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const quoteResponseId = parseInt(req.params.id);
      
      // Check for confirmed payment confirmations for this quote response
      const confirmedPayment = await storage.getConfirmedPaymentByQuoteResponse(quoteResponseId);
      
      res.json({ 
        hasConfirmedPayment: !!confirmedPayment,
        paymentConfirmation: confirmedPayment || null
      });
    } catch (error) {
      console.error('Error checking payment status:', error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });

  // Ongoing Projects API Routes
  
  // Create a new ongoing project from a quote response
  app.post("/api/ongoing-projects", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { quoteResponseId, projectType } = req.body;
      
      // Get the quote response and related data
      const quoteResponse = await storage.getQuoteResponseById(quoteResponseId);
      if (!quoteResponse) {
        return res.status(404).json({ message: "Quote response not found" });
      }

      const quoteRequest = await storage.getQuoteRequestById(quoteResponse.quoteRequestId);
      if (!quoteRequest) {
        return res.status(404).json({ message: "Quote request not found" });
      }

      // Calculate next payment due date for monthly projects
      let nextPaymentDue = null;
      if (projectType === 'monthly') {
        const now = new Date();
        nextPaymentDue = new Date(now.getFullYear(), now.getMonth() + 1, Math.max(now.getDate() - 7, 1));
      }

      // Create the ongoing project
      const projectData = {
        quoteResponseId,
        userId: quoteRequest.userId!,
        partnerId: quoteRequest.partnerId!,
        projectTitle: quoteRequest.serviceNeeded,
        projectNumber: quoteResponse.quoteNumber,
        projectType,
        status: 'active',
        nextPaymentDue
      };

      const newProject = await storage.createOngoingProject(projectData);
      
      // Update quote response status to accepted
      await storage.updateQuoteResponse(quoteResponseId, { status: 'accepted' });

      res.json(newProject);
    } catch (error) {
      console.error('Error creating ongoing project:', error);
      res.status(500).json({ message: "Failed to create ongoing project" });
    }
  });

  // Get ongoing projects for a user
  app.get("/api/ongoing-projects/user/:userId", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = parseInt(req.params.userId);
      if (req.user.id !== userId && req.user.userType !== 'master_admin' && req.user.userType !== 'editor_admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const projects = await storage.getOngoingProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching user projects:', error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get ongoing projects for a partner
  app.get("/api/ongoing-projects/partner/:partnerId", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const partnerId = parseInt(req.params.partnerId);
      
      // Check if user owns this partner account
      const partner = await storage.getPartner(partnerId);
      if (!partner || partner.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const projects = await storage.getOngoingProjectsByPartner(partnerId);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching partner projects:', error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get ongoing projects for current user (frontend endpoint)
  app.get("/api/user/ongoing-projects", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const projects = await storage.getOngoingProjectsByUser(req.user.id);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching user projects:', error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get ongoing projects for current partner (frontend endpoint)
  app.get("/api/partner/ongoing-projects", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get partner for this user
      const partner = await storage.getPartnerByUserId(req.user.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const projects = await storage.getOngoingProjectsByPartner(partner.id);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching partner projects:', error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Add a comment to a project
  app.post("/api/projects/:projectId/comments", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const projectId = parseInt(req.params.projectId);
      const { content, rating, isPublic } = req.body;

      // Verify user has access to this project
      const project = await storage.getOngoingProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if user is either the client or the partner
      const partner = await storage.getPartner(project.partnerId);
      if (project.userId !== req.user.id && partner?.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const commentData = {
        projectId,
        authorId: req.user.id,
        content,
        rating: rating || null,
        isPublic: isPublic || false
      };

      const newComment = await storage.createProjectComment(commentData);
      res.json(newComment);
    } catch (error) {
      console.error('Error creating project comment:', error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Get comments for a project
  app.get("/api/projects/:projectId/comments", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const projectId = parseInt(req.params.projectId);

      // Verify user has access to this project
      const project = await storage.getOngoingProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const partner = await storage.getPartner(project.partnerId);
      if (project.userId !== req.user.id && partner?.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const comments = await storage.getProjectComments(projectId);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching project comments:', error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Request project completion
  app.post("/api/projects/:projectId/request-completion", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const projectId = parseInt(req.params.projectId);

      // Verify user has access to this project
      const project = await storage.getOngoingProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const partner = await storage.getPartner(project.partnerId);
      if (project.userId !== req.user.id && partner?.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updatedProject = await storage.requestProjectCompletion(projectId, req.user.id);
      
      // Send email notification to the other party
      const isPartnerRequesting = partner?.userId === req.user.id;
      const recipientId = isPartnerRequesting ? project.userId : partner?.userId;
      
      if (recipientId) {
        const recipient = await storage.getUserById(recipientId);
        const requester = await storage.getUserById(req.user.id);
        
        if (recipient && requester) {
          const emailContent = `
            <h2>Proje Tamamlanma Talebi</h2>
            <p>Merhaba,</p>
            <p>${requester.firstName} ${requester.lastName} "${updatedProject.projectTitle}" projesinin tamamlanması için talepte bulundu.</p>
            <p>Bu talebi onaylamak veya reddetmek için lütfen platformunuza giriş yapın.</p>
          `;

          await resendService.sendEmail({
            to: recipient.email,
            subject: `Proje Tamamlanma Talebi - ${updatedProject.projectTitle}`,
            html: emailContent
          });
        }
      }

      res.json(updatedProject);
    } catch (error) {
      console.error('Error requesting project completion:', error);
      res.status(500).json({ message: "Failed to request completion" });
    }
  });

  // Approve project completion
  app.post("/api/projects/:projectId/approve-completion", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const projectId = parseInt(req.params.projectId);

      // Verify user has access to this project and that completion was requested
      const project = await storage.getOngoingProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.completionRequestedBy) {
        return res.status(400).json({ message: "No completion request found" });
      }

      const partner = await storage.getPartner(project.partnerId);
      if (project.userId !== req.user.id && partner?.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // User cannot approve their own completion request
      if (project.completionRequestedBy === req.user.id) {
        return res.status(400).json({ message: "Cannot approve your own completion request" });
      }

      const updatedProject = await storage.approveProjectCompletion(projectId);
      res.json(updatedProject);
    } catch (error) {
      console.error('Error approving project completion:', error);
      res.status(500).json({ message: "Failed to approve completion" });
    }
  });

  // Reject project completion
  app.post("/api/projects/:projectId/reject-completion", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const projectId = parseInt(req.params.projectId);

      // Verify user has access to this project and that completion was requested
      const project = await storage.getOngoingProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.completionRequestedBy) {
        return res.status(400).json({ message: "No completion request found" });
      }

      const partner = await storage.getPartner(project.partnerId);
      if (project.userId !== req.user.id && partner?.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // User cannot reject their own completion request
      if (project.completionRequestedBy === req.user.id) {
        return res.status(400).json({ message: "Cannot reject your own completion request" });
      }

      const updatedProject = await storage.rejectProjectCompletion(projectId);
      
      // Send email notification to the requester
      const requester = await storage.getUserById(project.completionRequestedBy);
      const rejector = await storage.getUserById(req.user.id);
      
      if (requester && rejector) {
        const emailContent = `
          <h2>Proje Tamamlanma Talebi Reddedildi</h2>
          <p>Merhaba,</p>
          <p>${rejector.firstName} ${rejector.lastName} "${updatedProject.projectTitle}" projesinin tamamlanma talebinizi reddetti.</p>
          <p>Proje kaldığı yerden devam edecektir.</p>
        `;

        await resendService.sendEmail({
          to: requester.email,
          subject: `Proje Tamamlanma Talebi Reddedildi - ${updatedProject.projectTitle}`,
          html: emailContent
        });
      }

      res.json(updatedProject);
    } catch (error) {
      console.error('Error rejecting project completion:', error);
      res.status(500).json({ message: "Failed to reject completion" });
    }
  });

  // Cancel project completion request
  app.post("/api/projects/:projectId/cancel-completion-request", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const projectId = parseInt(req.params.projectId);

      // Verify user has access to this project and that they made the completion request
      const project = await storage.getOngoingProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.completionRequestedBy) {
        return res.status(400).json({ message: "No completion request found" });
      }

      const partner = await storage.getPartner(project.partnerId);
      if (project.userId !== req.user.id && partner?.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // User can only cancel their own completion request
      if (project.completionRequestedBy !== req.user.id) {
        return res.status(400).json({ message: "Can only cancel your own completion request" });
      }

      const updatedProject = await storage.cancelProjectCompletionRequest(projectId);
      
      // Send email notification to the other party
      const isPartnerRequesting = partner?.userId === req.user.id;
      const recipientId = isPartnerRequesting ? project.userId : partner?.userId;
      
      if (recipientId) {
        const recipient = await storage.getUserById(recipientId);
        const canceler = await storage.getUserById(req.user.id);
        
        if (recipient && canceler) {
          const emailContent = `
            <h2>Proje Tamamlanma Talebi İptal Edildi</h2>
            <p>Merhaba,</p>
            <p>${canceler.firstName} ${canceler.lastName} "${updatedProject.projectTitle}" projesinin tamamlanma talebini iptal etti.</p>
            <p>Proje kaldığı yerden devam edecektir.</p>
          `;

          await resendService.sendEmail({
            to: recipient.email,
            subject: `Proje Tamamlanma Talebi İptal Edildi - ${updatedProject.projectTitle}`,
            html: emailContent
          });
        }
      }

      res.json(updatedProject);
    } catch (error) {
      console.error('Error canceling project completion request:', error);
      res.status(500).json({ message: "Failed to cancel completion request" });
    }
  });

  // Create payment for monthly project
  app.post("/api/projects/:projectId/payments", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const projectId = parseInt(req.params.projectId);
      const { amount, paymentMonth } = req.body;

      // Verify project exists and user has access
      const project = await storage.getOngoingProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const partner = await storage.getPartner(project.partnerId);
      if (project.userId !== req.user.id && partner?.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Calculate due date (7 days before month end)
      const now = new Date();
      const monthDate = new Date(paymentMonth + '-01');
      const dueDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, -6); // 7 days before month end

      const paymentData = {
        projectId,
        amount,
        paymentMonth,
        status: 'due',
        dueDate
      };

      const newPayment = await storage.createProjectPayment(paymentData);
      res.json(newPayment);
    } catch (error) {
      console.error('Error creating project payment:', error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Get payments for a project
  app.get("/api/projects/:projectId/payments", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const projectId = parseInt(req.params.projectId);

      // Verify project exists and user has access
      const project = await storage.getOngoingProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const partner = await storage.getPartner(project.partnerId);
      if (project.userId !== req.user.id && partner?.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const payments = await storage.getProjectPayments(projectId);
      res.json(payments);
    } catch (error) {
      console.error('Error fetching project payments:', error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Email Template Management Routes
  app.get("/api/admin/email-templates", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userType = req.user.activeUserType || req.user.userType;
    if (!['master_admin', 'editor_admin'].includes(userType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const templates = await storage.getAllEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.get("/api/admin/email-templates/:type", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userType = req.user.activeUserType || req.user.userType;
    if (!['master_admin', 'editor_admin'].includes(userType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const template = await storage.getEmailTemplate(req.params.type);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error('Error fetching email template:', error);
      res.status(500).json({ message: "Failed to fetch email template" });
    }
  });

  app.put("/api/admin/email-templates/:type", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userType = req.user.activeUserType || req.user.userType;
    if (!['master_admin', 'editor_admin'].includes(userType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const { subject, htmlContent } = req.body;
      const updated = await storage.updateEmailTemplate(req.params.type, {
        subject,
        htmlContent
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating email template:', error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.post("/api/admin/email-templates", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userType = req.user.activeUserType || req.user.userType;
    if (!['master_admin', 'editor_admin'].includes(userType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const { type, name, subject, htmlContent, isActive = true } = req.body;
      
      if (!type || !name || !subject || !htmlContent) {
        return res.status(400).json({ message: "Type, name, subject and htmlContent are required" });
      }

      const created = await storage.createEmailTemplate({
        type,
        name,
        subject,
        htmlContent,
        isActive
      });
      
      res.status(201).json(created);
    } catch (error) {
      console.error('Error creating email template:', error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  // Notification Template Management Routes
  app.get("/api/admin/notification-templates", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userType = req.user.activeUserType || req.user.userType;
    if (!['master_admin', 'editor_admin'].includes(userType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const templates = await storage.getAllNotificationTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching notification templates:', error);
      res.status(500).json({ message: "Failed to fetch notification templates" });
    }
  });

  app.get("/api/admin/notification-templates/:type", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userType = req.user.activeUserType || req.user.userType;
    if (!['master_admin', 'editor_admin'].includes(userType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const template = await storage.getNotificationTemplate(req.params.type);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error('Error fetching notification template:', error);
      res.status(500).json({ message: "Failed to fetch notification template" });
    }
  });

  app.put("/api/admin/notification-templates/:type", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userType = req.user.activeUserType || req.user.userType;
    if (!['master_admin', 'editor_admin'].includes(userType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const { title, message } = req.body;
      const updated = await storage.updateNotificationTemplate(req.params.type, {
        title,
        message
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating notification template:', error);
      res.status(500).json({ message: "Failed to update notification template" });
    }
  });

  // SMS Templates endpoints
  app.get("/api/admin/sms-templates", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userType = req.user.activeUserType || req.user.userType;
    if (!['master_admin', 'editor_admin'].includes(userType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const smsTemplates = await storage.getAllSmsTemplates();
      res.json(smsTemplates);
    } catch (error: any) {
      console.error("Error fetching SMS templates:", error);
      res.status(500).json({ error: "Failed to fetch SMS templates" });
    }
  });

  app.get("/api/admin/sms-templates/:type", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userType = req.user.activeUserType || req.user.userType;
    if (!['master_admin', 'editor_admin'].includes(userType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const { type } = req.params;
      const smsTemplate = await storage.getSmsTemplate(type);
      
      if (!smsTemplate) {
        return res.status(404).json({ error: "SMS template not found" });
      }
      
      res.json(smsTemplate);
    } catch (error: any) {
      console.error("Error fetching SMS template:", error);
      res.status(500).json({ error: "Failed to fetch SMS template" });
    }
  });

  app.put("/api/admin/sms-templates/:type", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userType = req.user.activeUserType || req.user.userType;
    if (!['master_admin', 'editor_admin'].includes(userType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const { type } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const updatedTemplate = await storage.updateSmsTemplate(type, {
        content
      });

      if (!updatedTemplate) {
        return res.status(404).json({ error: "SMS template not found" });
      }

      res.json(updatedTemplate);
    } catch (error: any) {
      console.error("Error updating SMS template:", error);
      res.status(500).json({ error: "Failed to update SMS template" });
    }
  });

  return httpServer;
}
