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
      
      // Create new user
      const newUserData = {
        email: supabaseUser.email,
        supabaseId: supabaseUser.id,
        firstName: firstName || 'Kullanıcı',
        lastName: lastName || '',
        userType: 'user' as const,
        isVerified: true, // Supabase handles email verification
        language: 'tr' as const,
      };
      
      user = await storage.createUser(newUserData);
      console.log('Created new user from Supabase:', user.email);
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