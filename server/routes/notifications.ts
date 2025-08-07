import { Router } from 'express';
// Import isAuthenticated from the file where it's defined
// We'll use the same auth check pattern as other routes
import { notificationService } from '../notification-service';
import { z } from 'zod';

const router = Router();

// Get user's notifications with pagination
router.get('/', async (req: any, res) => {
  // Enhanced authentication debugging for production
  const authStatus = req.isAuthenticated();
  const sessionID = req.sessionID;
  const userAgent = req.get('User-Agent');
  const domain = req.get('host') || 'unknown';
  const cookies = req.headers.cookie;
  
  console.log(`🔍 [${domain}] Auth Check - Authenticated: ${authStatus}, SessionID: ${sessionID ? 'exists' : 'missing'}, Cookies: ${cookies ? 'exists' : 'missing'}`);
  
  if (!authStatus) {
    console.log(`❌ [${domain}] Authentication failed - Session details:`, {
      sessionID,
      userAgent: userAgent?.substring(0, 50),
      hasSession: !!req.session,
      sessionData: req.session ? Object.keys(req.session) : 'no-session'
    });
    return res.status(401).json({ 
      error: 'Authentication required',
      debug: {
        domain,
        hasSession: !!req.session,
        sessionID: sessionID ? 'exists' : 'missing'
      }
    });
  }
  
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = req.user.id;

    console.log(`🔍 [${domain}] Getting notifications for user: ${userId} (${req.user.email || 'no-email'}) [${req.user.userType || 'no-type'}] - page: ${page}, limit: ${limit}`);
    
    // Add timeout wrapper for database operations
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 8000)
    );
    
    const result = await Promise.race([
      notificationService.getUserNotifications(userId, page, limit),
      timeoutPromise
    ]);
    
    console.log(`📋 [${domain}] Notifications result for user ${userId}: ${(result as any).notifications.length} notifications, total: ${(result as any).totalCount}`);
    
    res.json(result);
  } catch (error: any) {
    console.error(`❌ [${domain}] Error fetching notifications:`, error.message);
    res.status(500).json({ 
      message: 'Bildirimler alınırken hata oluştu',
      error: error.message 
    });
  }
});

// Get unread notification count
router.get('/unread-count', async (req: any, res) => {
  const domain = req.get('host') || 'unknown';
  const authStatus = req.isAuthenticated();
  
  if (!authStatus) {
    console.log(`❌ [${domain}] Unread count - Authentication failed`);
    return res.status(401).json({ 
      error: 'Authentication required',
      count: 0,
      debug: { domain, hasSession: !!req.session }
    });
  }
  
  try {
    const userId = req.user.id;
    
    // Add timeout for unread count as well
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Count timeout')), 3000)
    );
    
    const count = await Promise.race([
      notificationService.getUnreadCount(userId),
      timeoutPromise
    ]);
    
    console.log(`📊 [${domain}] Unread count for user ${userId} (${req.user.email}): ${count}`);
    
    res.json({ count });
  } catch (error: any) {
    console.error(`❌ [${domain}] Error fetching unread count:`, error.message);
    res.status(500).json({ count: 0, error: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    await notificationService.markAsRead(notificationId, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Bildirim okundu olarak işaretlenirken hata oluştu' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  try {
    const userId = req.user.id;

    await notificationService.markAllAsRead(userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Tüm bildirimler okundu olarak işaretlenirken hata oluştu' });
  }
});

// Admin endpoint to create system status notification
router.post('/system-status', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekli' });
    }

    const schema = z.object({
      title: z.string().min(1, 'Başlık gerekli'),
      message: z.string().min(1, 'Mesaj gerekli'),
      actionUrl: z.string().optional()
    });

    const { title, message, actionUrl } = schema.parse(req.body);

    await notificationService.createSystemStatusNotification({
      title,
      message,
      actionUrl
    });
    
    res.json({ success: true, message: 'Sistem bildirimi tüm kullanıcılara gönderildi' });
  } catch (error) {
    console.error('Error creating system status notification:', error);
    res.status(500).json({ message: 'Sistem bildirimi oluşturulurken hata oluştu' });
  }
});

export default router;