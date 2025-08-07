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
      // Check if user exists by email (existing users without supabaseId)
      const existingUser = await storage.getUserByEmail(supabaseUser.email);
      
      if (existingUser) {
        // Update existing user with supabaseId
        user = await storage.updateUserSupabaseId(existingUser.id, supabaseUser.id);
      } else {
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
        console.log('Created new user from Supabase:', user.email, 'with type:', user.userType);
      }
    }
    
    if (user) {
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

// Password reset endpoint
router.post('/send-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email gerekli' });
    }

    console.log('Sending password reset email to:', email, 'redirect URL:', `${req.protocol}://${req.get('host')}/password-reset`);

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.protocol}://${req.get('host')}/password-reset`,
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Şifre sıfırlama e-postası gönderildi' });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ error: 'Şifre sıfırlama e-postası gönderilemedi' });
  }
});

export default router;