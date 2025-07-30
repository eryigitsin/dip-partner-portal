// Admin API routes specifically for the admin dashboard components
import { Router, RequestHandler } from 'express';
import type { IStorage } from './storage.js';

export function createAdminRoutes(storage: IStorage): Router {
  const router = Router();

  // Middleware to check admin access
  const requireAdmin: RequestHandler = (req, res, next) => {
    const user = req.user;
    if (!user || !["master_admin", "editor_admin"].includes(user.userType)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Get all quote requests with partner information
  router.get('/quote-requests', requireAdmin, async (req, res) => {
    try {
      const requests = await storage.getAllQuoteRequestsWithPartners();
      res.json(requests);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      res.status(500).json({ message: 'Failed to fetch quote requests' });
    }
  });

  // Update quote request status
  router.patch('/quote-requests/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      const updated = await storage.updateQuoteRequest(id, { status });
      if (!updated) {
        return res.status(404).json({ message: 'Quote request not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating quote request:', error);
      res.status(500).json({ message: 'Failed to update quote request' });
    }
  });

  // Get specific partner details
  router.get('/partners/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partner = await storage.getPartnerById(id);
      
      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }

      // Get partner user information if userId exists
      let partnerWithUser = { ...partner };
      if (partner.userId) {
        const user = await storage.getUserById(partner.userId);
        if (user) {
          partnerWithUser = {
            ...partner,
            email: user.email,
            contactPerson: user.fullName
          };
        }
      }

      res.json(partnerWithUser);
    } catch (error) {
      console.error('Error fetching partner:', error);
      res.status(500).json({ message: 'Failed to fetch partner details' });
    }
  });

  // Get partner's quote requests
  router.get('/partner-quotes/:partnerId', requireAdmin, async (req, res) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      const requests = await storage.getQuoteRequestsByPartnerId(partnerId);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching partner quotes:', error);
      res.status(500).json({ message: 'Failed to fetch partner quotes' });
    }
  });

  // Get partner activities (mock data for now)
  router.get('/partner-activities/:partnerId', requireAdmin, async (req, res) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      
      // For now, return mock activities
      // In the future, this could query a partner_activities table
      const mockActivities = [
        {
          id: 1,
          type: 'login',
          description: 'Partner giriş yaptı',  
          details: 'Son giriş tarihi',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          type: 'profile_update',
          description: 'Profil bilgileri güncellendi',
          details: 'Şirket açıklaması ve hizmetler bölümü düzenlendi',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          type: 'quote_response',
          description: 'Teklif talebine yanıt verildi',
          details: 'E-ticaret projesi teklifi gönderildi',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      res.json(mockActivities);
    } catch (error) {
      console.error('Error fetching partner activities:', error);
      res.status(500).json({ message: 'Failed to fetch partner activities' });
    }
  });

  return router;
}