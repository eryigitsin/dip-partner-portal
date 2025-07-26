import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPartnerApplicationSchema, insertQuoteRequestSchema, insertTempUserRegistrationSchema } from "@shared/schema";
import { z } from "zod";
import { createNetGsmService } from "./netgsm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

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
  app.post("/api/partner-applications", async (req, res) => {
    try {
      const applicationData = insertPartnerApplicationSchema.parse(req.body);
      const application = await storage.createPartnerApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create application" });
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

      const application = await storage.updatePartnerApplication(
        parseInt(req.params.id),
        {
          ...req.body,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
        }
      );

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      res.json(application);
    } catch (error) {
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

  // Partner application endpoint
  app.post('/api/partner-applications', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const applicationData = {
        ...req.body,
        userId: req.user!.id,
        status: 'pending',
        appliedAt: new Date()
      };
      
      const application = await storage.createPartnerApplication(applicationData);
      res.status(201).json(application);
    } catch (error: any) {
      console.error('Error creating partner application:', error);
      res.status(500).json({ message: error.message });
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

  const httpServer = createServer(app);
  return httpServer;
}
