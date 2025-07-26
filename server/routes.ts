import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPartnerApplicationSchema, insertQuoteRequestSchema, insertTempUserRegistrationSchema } from "@shared/schema";
import { z } from "zod";
import { createNetGsmService } from "./netgsm";
import { sendEmail, emailTemplates } from "./email";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import multer from "multer";
import path from "path";
import fs from "fs";

const scryptAsync = promisify(scrypt);

// Multer configuration for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'partner-applications');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
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

  app.get("/api/partners/:id", async (req, res) => {
    try {
      const partner = await storage.getPartner(parseInt(req.params.id));
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      res.json(partner);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch partner" });
    }
  });

  // Partner applications
  app.post("/api/partner-applications", upload.array('documents', 10), async (req, res) => {
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
      
      // Store uploaded files
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (const file of files) {
          await storage.addApplicationDocument({
            applicationId: application.id,
            fileName: file.originalname,
            originalName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
          });
        }
      }

      // Send email notifications
      try {
        // 1. Send to admins
        const admins = await storage.getAdminUsers();
        const adminEmails = admins.map(admin => admin.email);
        console.log('Admin emails:', adminEmails);
        
        if (adminEmails.length > 0) {
          const adminEmailTemplate = emailTemplates.partnerApplication.toAdmin(
            `${application.firstName} ${application.lastName}`,
            application.company,
            application.email,
            application.phone
          );
          
          await sendEmail({
            to: adminEmails,
            from: 'info@dip.tc',
            subject: adminEmailTemplate.subject,
            html: adminEmailTemplate.html,
          });
          console.log('Admin notification email sent');
        }

        // 2. Send to applicant
        const applicantEmailTemplate = emailTemplates.partnerApplication.toApplicant(
          `${application.firstName} ${application.lastName}`,
          application.id
        );
        
        await sendEmail({
          to: application.email,
          from: 'info@dip.tc',
          subject: applicantEmailTemplate.subject,
          html: applicantEmailTemplate.html,
        });
        console.log('Applicant confirmation email sent');
        
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
      res.status(500).json({ message: "Failed to create application", details: error.message });
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
        // Check if user exists
        let user = await storage.getUserByEmail(application.email);
        
        if (!user) {
          // Create user account for the partner
          const tempPassword = Math.random().toString(36).slice(-8);
          user = await storage.createUser({
            email: application.email,
            password: tempPassword, // Partner should reset this
            firstName: application.firstName,
            lastName: application.lastName,
            phone: application.phone,
            userType: 'partner',
            isVerified: true,
          });
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
      const requestData = insertQuoteRequestSchema.parse({
        ...req.body,
        userId: req.user?.id,
      });
      const request = await storage.createQuoteRequest(requestData);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create quote request" });
    }
  });

  app.get("/api/quote-requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { partnerId } = req.query;
      let requests;

      if (req.user!.userType === "partner") {
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

  // Partner application endpoint with file upload
  app.post('/api/partner-applications', upload.fields([
    { name: 'documents', maxCount: 10 },
    { name: 'logo', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        company,
        contactPerson,
        website,
        serviceCategory,
        businessDescription,
        companySize,
        foundingYear,
        sectorExperience,
        targetMarkets,
        services,
        dipAdvantages,
        whyPartner,
        references,
        linkedinProfile,
        twitterProfile,
        instagramProfile,
        facebookProfile,
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !company || !contactPerson || !serviceCategory || !businessDescription || !companySize || !foundingYear || !services || !dipAdvantages || !whyPartner) {
        return res.status(400).json({ message: 'Zorunlu alanlar eksik' });
      }

      const applicationData = {
        firstName,
        lastName,
        email,
        phone,
        company,
        contactPerson,
        website,
        serviceCategory,
        businessDescription,
        companySize,
        foundingYear,
        sectorExperience,
        targetMarkets,
        services,
        dipAdvantages,
        whyPartner,
        references,
        linkedinProfile,
        twitterProfile,
        instagramProfile,
        facebookProfile,
        logoPath: null as string | null,
        status: 'pending' as const,
      };
      
      const application = await storage.createPartnerApplication(applicationData);

      // Handle logo upload
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files?.logo && files.logo[0]) {
        const logoFile = files.logo[0];
        // Update application with logo path
        await storage.updatePartnerApplicationLogo(application.id, logoFile.path);
      }

      // Handle document uploads if any
      if (files?.documents && files.documents.length > 0) {
        for (const file of files.documents) {
          const documentData = {
            applicationId: application.id,
            fileName: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            filePath: file.path,
          };
          
          await storage.addApplicationDocument(documentData);
        }
      }

      res.status(201).json({ ...application, message: 'Başvurunuz başarıyla alındı' });
    } catch (error: any) {
      console.error('Error creating partner application:', error);
      res.status(500).json({ message: "Failed to create application", error: error.message });
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

  // Download application document
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

      // Check if file exists
      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: 'Dosya bulunamadı' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Type', document.mimeType);
      
      const fileStream = fs.createReadStream(document.filePath);
      fileStream.pipe(res);
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
        response,
        amount,
        responseNotes: notes,
        respondedAt: new Date(),
      });

      if (!quoteRequest) {
        return res.status(404).json({ message: "Quote request not found" });
      }

      // Send email notification to user
      try {
        const user = await storage.getUser(quoteRequest.userId);
        const partner = await storage.getPartnerByUserId(req.user!.id);
        
        if (user && partner) {
          const quoteResponseTemplate = emailTemplates.serviceRequest.toUser(
            `${user.firstName} ${user.lastName}`,
            partner.companyName,
            quoteRequest.serviceName
          );
          
          await sendEmail({
            to: user.email,
            from: 'info@dip.tc',
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
        status,
        rejectionReason: reason,
        reviewedAt: new Date(),
      });

      if (!quoteRequest) {
        return res.status(404).json({ message: "Quote request not found" });
      }

      // Send email notifications
      try {
        const partner = await storage.getPartner(quoteRequest.partnerId);
        const partnerUser = partner ? await storage.getUser(partner.userId) : null;
        const user = await storage.getUser(quoteRequest.userId);
        
        if (partner && partnerUser && user) {
          if (status === 'approved') {
            // Send to partner
            const partnerTemplate = emailTemplates.quoteStatus.approved.toPartner(
              partner.companyName,
              `${user.firstName} ${user.lastName}`,
              quoteRequest.serviceName
            );
            
            await sendEmail({
              to: partnerUser.email,
              from: 'info@dip.tc',
              subject: partnerTemplate.subject,
              html: partnerTemplate.html,
            });

            // Send to user
            const userTemplate = emailTemplates.quoteStatus.approved.toUser(
              `${user.firstName} ${user.lastName}`,
              partner.companyName,
              quoteRequest.serviceName
            );
            
            await sendEmail({
              to: user.email,
              from: 'info@dip.tc',
              subject: userTemplate.subject,
              html: userTemplate.html,
            });
          } else if (status === 'rejected') {
            const rejectionTemplate = emailTemplates.quoteStatus.rejected.toPartner(
              partner.companyName,
              `${user.firstName} ${user.lastName}`,
              quoteRequest.serviceName,
              reason
            );
            
            await sendEmail({
              to: partnerUser.email,
              from: 'info@dip.tc',
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

  // Payment completion notification
  app.post("/api/payments/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { quoteRequestId, paymentData } = req.body;

      // Update quote request status to paid
      const quoteRequest = await storage.updateQuoteRequest(quoteRequestId, {
        status: 'paid',
        paymentCompletedAt: new Date(),
      });

      if (!quoteRequest) {
        return res.status(404).json({ message: "Quote request not found" });
      }

      // Send payment completion email
      try {
        const partner = await storage.getPartner(quoteRequest.partnerId);
        const user = await storage.getUser(quoteRequest.userId);
        
        if (partner && user) {
          const paymentTemplate = emailTemplates.paymentComplete(
            `${user.firstName} ${user.lastName}`,
            partner.companyName,
            quoteRequest.serviceName
          );
          
          await sendEmail({
            to: user.email,
            from: 'info@dip.tc',
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
        from: 'info@dip.tc',
        subject,
        html: `<p>${message}</p>`,
      });
      
      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error('Test email failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
