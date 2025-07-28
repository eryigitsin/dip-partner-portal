import { Router } from 'express';
import { supabaseAdmin } from '../supabase';
import { storage } from '../storage';
import { insertUserSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Sync Supabase user with our database
const syncSupabaseUserSchema = z.object({
  supabaseUser: z.object({
    id: z.string(),
    email: z.string().email(),
    user_metadata: z.object({
      full_name: z.string().optional(),
      avatar_url: z.string().optional(),
      provider_id: z.string().optional(),
    }).optional(),
    app_metadata: z.object({
      provider: z.string().optional(),
      providers: z.array(z.string()).optional(),
    }).optional(),
  }),
});

router.post('/sync-supabase-user', async (req, res) => {
  try {
    const { supabaseUser } = syncSupabaseUserSchema.parse(req.body);
    
    // Check if user already exists in our database
    let user = await storage.getUserBySupabaseId(supabaseUser.id);
    
    if (!user) {
      // Extract name from various sources
      let firstName = '';
      let lastName = '';
      
      if (supabaseUser.user_metadata?.full_name) {
        const nameParts = supabaseUser.user_metadata.full_name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      // Check if this is one of the pre-added users and set appropriate user type
      let userType: 'user' | 'partner' | 'editor_admin' | 'master_admin' = 'user';
      
      if (supabaseUser.email === 'sinan@dip.tc') {
        userType = 'master_admin';
        firstName = 'Sinan';
        lastName = 'Ercan';
      } else if (supabaseUser.email === 'info@dip.tc') {
        userType = 'editor_admin';
        firstName = 'DİP';
        lastName = 'Editör';
      } else if (supabaseUser.email === 'mutfak@markasef.com') {
        userType = 'partner';
        firstName = 'Markaşef';
        lastName = 'Mutfak';
      } else if (supabaseUser.email === 'eryigitsin@gmail.com') {
        userType = 'user';
        firstName = 'Ersin';
        lastName = 'Eryiğit';
      }

      // Create new user
      const newUserData = {
        email: supabaseUser.email,
        supabaseId: supabaseUser.id,
        firstName: firstName || 'Kullanıcı',
        lastName: lastName || '',
        userType,
        isVerified: true, // Supabase handles email verification
        language: 'tr' as const,
      };
      
      user = await storage.createUser(newUserData);
      console.log('Created new user from Supabase:', user.email, 'with type:', user.userType);
      
      // If this is the Markaşef partner, create the partner profile
      if (user.email === 'mutfak@markasef.com' && user.userType === 'partner') {
        try {
          const existingPartner = await storage.getPartnerByUserId(user.id);
          if (!existingPartner) {
            const partnerData = {
              userId: user.id,
              companyName: 'Markaşef',
              contactPerson: 'Mutfak Departmanı',
              companyAddress: 'İstanbul, Türkiye',
              serviceCategory: 'Pazarlama ve Tanıtım',
              services: 'Mutfak ekipmanları ve çözümleri',
              description: 'Mutfak sektöründe uzman ekibimizle hizmet veriyoruz.',
              experienceYears: 10,
              isApproved: true,
              isActive: true,
            };
            await storage.createPartner(partnerData);
            console.log('Created partner profile for Markaşef');
          }
        } catch (error) {
          console.error('Error creating partner profile for Markaşef:', error);
        }
      }
    } else {
      // Update existing user's verification status
      if (!user.isVerified) {
        await storage.updateUser(user.id, { isVerified: true });
        user.isVerified = true;
      }
    }
    
    // Log in the user
    req.login(user, (err) => {
      if (err) {
        console.error('Error logging in user:', err);
        return res.status(500).json({ success: false, message: 'Giriş hatası' });
      }
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          isVerified: user.isVerified,
          language: user.language,
        }
      });
    });
    
  } catch (error) {
    console.error('Error syncing Supabase user:', error);
    res.status(500).json({ success: false, message: 'Kullanıcı senkronizasyon hatası' });
  }
});

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Çıkış hatası' });
    }
    res.json({ success: true });
  });
});

export default router;