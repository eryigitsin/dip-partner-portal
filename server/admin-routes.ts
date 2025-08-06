// Admin API routes specifically for the admin dashboard components
import { Router, RequestHandler } from 'express';
import type { IStorage } from './storage.js';

export function createAdminRoutes(storage: IStorage): Router {
  const router = Router();

  // Middleware to check admin access
  const requireAdmin: RequestHandler = (req, res, next) => {
    const user = req.user as any;
    if (!user || !["master_admin", "editor_admin"].includes(user.userType)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Get all quote requests with partner information
  router.get('/quote-requests', requireAdmin, async (req, res) => {
    try {
      const requests = await (storage as any).getAllQuoteRequestsWithPartners();
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

  // Markets management endpoints
  router.get('/markets', requireAdmin, async (req, res) => {
    try {
      const markets = await storage.getAllMarkets();
      res.json(markets);
    } catch (error) {
      console.error('Error fetching markets:', error);
      res.status(500).json({ message: 'Failed to fetch markets' });
    }
  });

  router.post('/markets', requireAdmin, async (req, res) => {
    try {
      const { name, nameEn, region } = req.body;
      const user = req.user!;
      
      if (!name) {
        return res.status(400).json({ message: 'Market name is required' });
      }

      const newMarket = await storage.createMarketInPool({
        name,
        nameEn,
        region,
        createdBy: user.id
      });

      res.json(newMarket);
    } catch (error) {
      console.error('Error creating market:', error);
      res.status(500).json({ message: 'Failed to create market' });
    }
  });

  router.patch('/markets/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, nameEn, region, isActive } = req.body;
      
      const updated = await storage.updateMarket(id, {
        name,
        nameEn,
        region,
        isActive
      });
      
      if (!updated) {
        return res.status(404).json({ message: 'Market not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating market:', error);
      res.status(500).json({ message: 'Failed to update market' });
    }
  });

  router.delete('/markets/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMarket(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Market not found or could not be deleted' });
      }

      res.json({ success: true, message: 'Market deleted successfully' });
    } catch (error) {
      console.error('Error deleting market:', error);
      res.status(500).json({ message: 'Failed to delete market' });
    }
  });

  // Create partner directly with auto-approval (admin only)
  router.post('/create-partner-direct', requireAdmin, async (req, res) => {
    try {
      const multer = require('multer');
      const supabaseStorage = require('./supabase-storage.js');
      const resendService = require('./resend-service.js');
      const { createClient } = require('@supabase/supabase-js');

      // Configure multer for file upload
      const upload = multer({ 
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
      });

      const uploadHandler = upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 }
      ]);

      // Process file upload
      uploadHandler(req, res, async (err: any) => {
        if (err) {
          console.error('File upload error:', err);
          return res.status(400).json({ message: 'File upload failed', error: err.message });
        }

        try {
          // Extract form data
          const {
            firstName, lastName, email, phone, company, contactPerson,
            website, companyAddress, serviceCategory, businessDescription,
            companySize, foundingYear, sectorExperience, targetMarkets,
            dipAdvantages, whyPartner, references, linkedinProfile,
            twitterProfile, instagramProfile, facebookProfile, city, country
          } = req.body;

          // Get services directly from form data
          const services = req.body.services || '';

          // Create Supabase user account
          const supabaseAdmin = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          );

          // Check if user already exists
          let user = await storage.getUserByEmail(email);
          
          if (!user) {
            // Create Supabase user account
            const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
              email,
              email_confirm: true,
              user_metadata: {
                firstName,
                lastName,
                phone,
                userType: 'partner',
                companyName: company
              }
            });

            if (supabaseError) {
              console.error('Supabase user creation error:', supabaseError);
              throw new Error(`Supabase kullanıcı hesabı oluşturulamadı: ${supabaseError.message}`);
            }

            // Create local user record
            user = await storage.createUser({
              email,
              password: 'supabase-managed',
              firstName,
              lastName,
              phone,
              userType: 'partner',
              availableUserTypes: ['user', 'partner'],
              activeUserType: 'partner',
              isVerified: true,
              supabaseId: supabaseUser.user?.id,
            });

            // Send password setup email
            const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email,
              options: {
                redirectTo: `${req.protocol}://${req.get('host')}/auth`
              }
            });

            if (resetError) {
              console.error('Password setup email error:', resetError);
            }
          }

          // Create partner profile with all data
          const partnerData = {
            userId: user.id,
            companyName: company,
            contactPerson: contactPerson || `${firstName} ${lastName}`,
            serviceCategory,
            description: businessDescription || '',
            services,
            dipAdvantages: dipAdvantages || '',
            companySize: companySize || '',
            foundingYear: foundingYear || '',
            sectorExperience: sectorExperience || '',
            targetMarkets: targetMarkets || '',
            website: website || '',
            linkedinProfile: linkedinProfile || '',
            twitterProfile: twitterProfile || '',
            instagramProfile: instagramProfile || '',
            facebookProfile: facebookProfile || '',
            isApproved: true,
            isActive: true,
          };

          // Check if partner already exists
          const existingPartner = await storage.getPartnerByUserId(user.id);
          let partner;
          
          if (existingPartner) {
            partner = await storage.updatePartner(existingPartner.id, partnerData);
          } else {
            partner = await storage.createPartner(partnerData);
          }

          if (!partner) {
            throw new Error('Partner oluşturulamadı');
          }

          // Handle file uploads if present
          const files = req.files as { [fieldname: string]: Express.Multer.File[] };
          
          if (files?.logo && files.logo[0]) {
            try {
              const logoFile = files.logo[0];
              const logoUploadResult = await supabaseStorage.uploadPartnerLogo(logoFile, partner.id.toString());
              if (logoUploadResult.success && logoUploadResult.url) {
                console.log('Logo uploaded:', logoUploadResult.url);
                // Update partner with logo URL if needed
              }
            } catch (logoError) {
              console.error('Logo upload failed:', logoError);
            }
          }

          if (files?.coverImage && files.coverImage[0]) {
            try {
              const coverFile = files.coverImage[0];
              const coverUploadResult = await supabaseStorage.uploadPartnerCover(coverFile, partner.id.toString());
              if (coverUploadResult.success && coverUploadResult.url) {
                console.log('Cover image uploaded:', coverUploadResult.url);
                // Update partner with cover URL if needed
              }
            } catch (coverError) {
              console.error('Cover upload failed:', coverError);
            }
          }

          // Send welcome email
          try {
            const approvalEmailTemplate = resendService.createPartnerApprovalEmail(
              firstName,
              company,
              `${process.env.VITE_APP_URL || 'https://partner.dip.tc'}/partner-login?setup=true`
            );

            const emailResult = await resendService.sendEmail({
              to: email,
              subject: approvalEmailTemplate.subject,
              html: approvalEmailTemplate.html
            });

            if (emailResult.success) {
              console.log('Partner welcome email sent via Resend');
            }
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
          }

          res.status(201).json({
            success: true,
            message: 'Partner oluşturuldu ve onaylandı',
            partner,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName
            }
          });

        } catch (error) {
          console.error('Error creating partner:', error);
          res.status(500).json({ 
            message: 'Partner oluşturulurken hata oluştu', 
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
          });
        }
      });

    } catch (error) {
      console.error('Error in create-partner-direct endpoint:', error);
      res.status(500).json({ 
        message: 'Partner oluşturulurken hata oluştu', 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  });

  // Assign user to partner as manager
  router.patch('/users/:userId/assign-partner', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { partnerId } = req.body;

      if (!partnerId) {
        return res.status(400).json({ message: 'Partner ID is required' });
      }

      // Get user and partner
      const user = await storage.getUser(userId);
      const partner = await storage.getPartner(partnerId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }

      // Update user to partner type if not already
      if (!user.availableUserTypes?.includes('partner')) {
        const newAvailableTypes = [...(user.availableUserTypes || []), 'partner'];
        await storage.updateUser(userId, { 
          availableUserTypes: newAvailableTypes,
          activeUserType: 'partner',
          userType: 'partner'
        });
      } else if (user.activeUserType !== 'partner') {
        await storage.updateUser(userId, { 
          activeUserType: 'partner',
          userType: 'partner'
        });
      }

      // Update partner to be managed by this user and set as contact person
      await storage.updatePartner(partnerId, {
        managedBy: userId,
        contactPerson: `${user.firstName} ${user.lastName}`
      });

      res.json({
        success: true,
        message: 'User assigned to partner as manager',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        },
        partner: {
          id: partner.id,
          companyName: partner.companyName
        }
      });

    } catch (error) {
      console.error('Error assigning user to partner:', error);
      res.status(500).json({ 
        message: 'Partner ataması yapılırken hata oluştu',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  });

  // SMS Templates Management - Get all SMS templates
  router.get('/sms-templates', requireAdmin, async (req, res) => {
    try {
      const templates = await storage.getAllSmsTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching SMS templates:', error);
      res.status(500).json({ message: 'Failed to fetch SMS templates' });
    }
  });

  // Get specific SMS template by type
  router.get('/sms-templates/:type', requireAdmin, async (req, res) => {
    try {
      const { type } = req.params;
      const template = await storage.getSmsTemplateByType(type);
      
      if (!template) {
        return res.status(404).json({ message: 'SMS template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Error fetching SMS template:', error);
      res.status(500).json({ message: 'Failed to fetch SMS template' });
    }
  });

  // Create new SMS template
  router.post('/sms-templates', requireAdmin, async (req, res) => {
    try {
      const { type, name, description, content, isActive } = req.body;
      
      if (!type || !name || !content) {
        return res.status(400).json({ message: 'Type, name, and content are required' });
      }
      
      const newTemplate = await storage.createSmsTemplate({
        type,
        name,
        description,
        content,
        isActive: isActive !== undefined ? isActive : true
      });
      
      res.json(newTemplate);
    } catch (error) {
      console.error('Error creating SMS template:', error);
      res.status(500).json({ message: 'Failed to create SMS template' });
    }
  });

  // Update SMS template
  router.put('/sms-templates/:type', requireAdmin, async (req, res) => {
    try {
      const { type } = req.params;
      const { name, description, content, isActive } = req.body;
      
      const updated = await storage.updateSmsTemplate(type, {
        name,
        description,
        content,
        isActive
      });
      
      if (!updated) {
        return res.status(404).json({ message: 'SMS template not found' });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating SMS template:', error);
      res.status(500).json({ message: 'Failed to update SMS template' });
    }
  });

  // Delete SMS template
  router.delete('/sms-templates/:type', requireAdmin, async (req, res) => {
    try {
      const { type } = req.params;
      const deleted = await storage.deleteSmsTemplate(type);
      
      if (!deleted) {
        return res.status(404).json({ message: 'SMS template not found' });
      }
      
      res.json({ success: true, message: 'SMS template deleted successfully' });
    } catch (error) {
      console.error('Error deleting SMS template:', error);
      res.status(500).json({ message: 'Failed to delete SMS template' });
    }
  });

  return router;
}