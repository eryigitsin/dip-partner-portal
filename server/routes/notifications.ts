import { Router } from 'express';
// Import isAuthenticated from the file where it's defined
// We'll use the same auth check pattern as other routes
import { notificationService } from '../notification-service';
import { z } from 'zod';

const router = Router();

// Get user's notifications with pagination
router.get('/', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = req.user.id;

    const result = await notificationService.getUserNotifications(userId, page, limit);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Bildirimler alınırken hata oluştu' });
  }
});

// Get unread notification count
router.get('/unread-count', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ count: 0 });
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