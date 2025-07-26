import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPartnerApplicationSchema, insertQuoteRequestSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Initialize service categories
  app.get("/api/init", async (req, res) => {
    try {
      const categories = await storage.getServiceCategories();
      if (categories.length === 0) {
        // Create default categories
        const defaultCategories = [
          { name: "Pazar Analizi", nameEn: "Market Analysis", slug: "pazar-analizi", icon: "fas fa-chart-line", sortOrder: 1 },
          { name: "Gümrük", nameEn: "Customs", slug: "gumruk", icon: "fas fa-clipboard-check", sortOrder: 2 },
          { name: "Lojistik & Depo", nameEn: "Logistics & Warehouse", slug: "lojistik", icon: "fas fa-truck", sortOrder: 3 },
          { name: "Pazarlama & Reklam", nameEn: "Marketing & Advertising", slug: "pazarlama", icon: "fas fa-bullhorn", sortOrder: 4 },
          { name: "Fotoğraf", nameEn: "Photography", slug: "fotograf", icon: "fas fa-camera", sortOrder: 5 },
          { name: "Danışmanlık", nameEn: "Consulting", slug: "danismanlik", icon: "fas fa-user-tie", sortOrder: 6 },
          { name: "Hukuk", nameEn: "Legal", slug: "hukuk", icon: "fas fa-gavel", sortOrder: 7 },
          { name: "Finans & Muhasebe", nameEn: "Finance & Accounting", slug: "finans", icon: "fas fa-calculator", sortOrder: 8 },
          { name: "Marka Koruma", nameEn: "Brand Protection", slug: "marka", icon: "fas fa-shield-alt", sortOrder: 9 },
          { name: "Fuar & Etkinlik", nameEn: "Trade Fair & Events", slug: "fuar", icon: "fas fa-calendar-alt", sortOrder: 10 },
          { name: "Üretim", nameEn: "Manufacturing", slug: "uretim", icon: "fas fa-industry", sortOrder: 11 },
          { name: "Paketleme & Ambalaj", nameEn: "Packaging", slug: "paketleme", icon: "fas fa-box", sortOrder: 12 },
          { name: "Ödeme", nameEn: "Payment", slug: "odeme", icon: "fas fa-credit-card", sortOrder: 13 },
          { name: "E-Ticaret Altyapısı", nameEn: "E-commerce Infrastructure", slug: "eticaret", icon: "fas fa-store", sortOrder: 14 },
          { name: "Pazaryeri", nameEn: "Marketplace", slug: "pazaryeri", icon: "fas fa-shopping-cart", sortOrder: 15 },
          { name: "IT & Yazılım", nameEn: "IT & Software", slug: "it", icon: "fas fa-code", sortOrder: 16 },
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

  const httpServer = createServer(app);
  return httpServer;
}
