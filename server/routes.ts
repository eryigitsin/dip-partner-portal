import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPartnerApplicationSchema, insertQuoteRequestSchema, insertTempUserRegistrationSchema } from "@shared/schema";
import { z } from "zod";
import { createNetGsmService } from "./netgsm";
import { resendService } from './resend-service';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { supabaseStorage } from "./supabase-storage";
import { supabaseAdmin } from "./supabase";

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

// Multer configuration for file uploads (using memory storage for Supabase)
const uploadDocuments = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

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
  
  // Serve test page
  app.get('/test-upload', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'test-upload.html'));
  });

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
      const { category, search, limit, offset } = req.query;
      const partners = await storage.getPartners({
        category: category as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(partners);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });

  // Get partner by ID or username
  app.get("/api/partners/:identifier", async (req, res) => {
    try {
      const identifier = req.params.identifier;
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
      
      // Handle logo upload
      if (files?.logo && files.logo[0]) {
        const logoFile = files.logo[0];
        const logoUploadResult = await supabaseStorage.uploadPartnerLogo(logoFile, application.id.toString());
        if (logoUploadResult.success && logoUploadResult.url) {
          console.log('Logo uploaded:', logoUploadResult.url);
          await storage.updatePartnerApplicationLogo(application.id, logoUploadResult.url);
        } else {
          console.error('Logo upload failed:', logoUploadResult.error);
        }
      }
      
      // Handle cover image upload
      if (files?.coverImage && files.coverImage[0]) {
        const coverFile = files.coverImage[0];
        const coverUploadResult = await supabaseStorage.uploadPartnerCover(coverFile, application.id.toString());
        if (coverUploadResult.success && coverUploadResult.url) {
          console.log('Cover image uploaded:', coverUploadResult.url);
        } else {
          console.error('Cover image upload failed:', coverUploadResult.error);
        }
      }
      
      // Handle document uploads
      if (files?.documents && files.documents.length > 0) {
        console.log(`Uploading ${files.documents.length} documents to Supabase Storage...`);
        for (const file of files.documents) {
          const uploadResult = await supabaseStorage.uploadPartnerDocument(file, application.id.toString());
          if (uploadResult.success && uploadResult.url) {
            console.log('Document uploaded:', uploadResult.url);
            
            await storage.addApplicationDocument({
              applicationId: application.id,
              fileName: file.originalname,
              originalName: file.originalname,
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
                redirectTo: `${process.env.VITE_APP_URL || 'https://partner.dip.tc'}/partner-login?setup=true`
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

  // Get partner followers
  app.get("/api/partners/me/followers", async (req, res) => {
    try {
      console.log('=== /api/partners/me/followers called ===');
      console.log('User authenticated:', req.isAuthenticated());
      console.log('User object:', req.user);
      
      if (!req.isAuthenticated()) {
        console.log('User not authenticated, returning 401');
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log('Looking for partner with userId:', req.user!.id);
      const partner = await storage.getPartnerByUserId(req.user!.id);
      console.log('Partner found:', partner ? { id: partner.id, companyName: partner.companyName } : 'null');
      
      if (!partner) {
        console.log('Partner not found for userId:', req.user!.id);
        return res.status(404).json({ message: "Partner not found" });
      }

      console.log('Fetching followers for partnerId:', partner.id);
      const followers = await storage.getPartnerFollowers(partner.id);
      console.log('Followers found:', followers.length, followers);
      
      res.json(followers);
    } catch (error) {
      console.error('Error fetching partner followers:', error);
      res.status(500).json({ message: "Failed to fetch followers" });
    }
  });

  // Get partner profile for current user
  app.get("/api/partners/me", async (req, res) => {
    try {
      console.log('=== /api/partners/me called ===');
      console.log('Session ID:', req.sessionID);
      console.log('User authenticated:', req.isAuthenticated());
      console.log('User object:', req.user);
      
      if (!req.isAuthenticated()) {
        console.log('User not authenticated, returning 401');
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log('=== API ENDPOINT DEBUG ===');
      console.log('User ID from session:', req.user!.id);
      console.log('Calling storage.getPartnerByUserId...');
      
      const partner = await storage.getPartnerByUserId(req.user!.id);
      
      console.log('=== RESULT FROM STORAGE ===');
      console.log('Partner result type:', typeof partner);
      console.log('Partner result:', partner);
      console.log('Partner is truthy?', !!partner);
      console.log('Partner is null?', partner === null);
      console.log('Partner is undefined?', partner === undefined);
      
      if (!partner) {
        console.log('=== PARTNER NOT FOUND ===');
        console.log('This is the problem! The method returns', partner);
        return res.status(404).json({ message: "Partner not found" });
      }
      
      console.log('=== PARTNER FOUND, PROCEEDING ===');

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

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { conversationId, receiverId, message } = req.body;
      const newMessage = await storage.createMessage({
        conversationId,
        senderId: req.user.id,
        receiverId,
        message,
      });
      res.json(newMessage);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Failed to send message' });
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
            // Send to partner
            const partnerTemplate = emailTemplates.quoteStatus.approved.toPartner(
              quoteRequest,
              user
            );
            
            await sendEmail({
              to: partnerUser.email,
              subject: partnerTemplate.subject,
              html: partnerTemplate.html,
            });

            // Send to user
            const userTemplate = emailTemplates.quoteStatus.approved.toUser(
              quoteRequest,
              partner
            );
            
            await sendEmail({
              to: user.email,
              subject: userTemplate.subject,
              html: userTemplate.html,
            });
          } else if (status === 'rejected') {
            const rejectionTemplate = emailTemplates.quoteStatus.rejected.toPartner(
              quoteRequest,
              user
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
      const partner = await storage.getPartner(partnerId);
      
      if (!partner || partner.userId !== req.user!.id) {
        return res.status(403).json({ message: "You can only create posts for your own partner profile" });
      }

      const postData = {
        partnerId,
        ...req.body
      };

      const newPost = await storage.createPartnerPost(postData);
      res.json(newPost);
    } catch (error) {
      console.error('Error creating partner post:', error);
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
  const uploadProfileImages = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'));
      }
    }
  });

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
      
      // Handle file uploads to Supabase Storage
      if (files && files.logo && files.logo[0]) {
        console.log('Uploading logo to Supabase Storage...');
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

  // Quote Response Management Routes
  app.post('/api/quote-responses', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user;
      if (!user || user.userType !== 'partner') {
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
      const { status } = req.body;

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

  // Register admin API routes
  (async () => {
    const adminModule = await import('./admin-routes.js');
    const adminRoutes = adminModule.createAdminRoutes(storage);
    app.use("/api/admin", adminRoutes);
  })();

  const httpServer = createServer(app);
  return httpServer;
}
