import { db } from './db';
import { notifications, users, type InsertNotification } from '@shared/schema';
import { eq, desc, and, count } from 'drizzle-orm';
import { supabaseAdmin, supabase } from './lib/supabase';

export interface NotificationTemplates {
  quote_request: {
    user: { title: string; message: string; actionUrl: string };
    partner: { title: string; message: string; actionUrl: string };
    admin: { title: string; message: string; actionUrl: string };
  };
  quote_response: {
    user: { title: string; message: string; actionUrl: string };
    admin: { title: string; message: string; actionUrl: string };
  };
  partner_application: {
    admin: { title: string; message: string; actionUrl: string };
  };
  follower: {
    partner: { title: string; message: string; actionUrl: string };
  };
  project_update: {
    user: { title: string; message: string; actionUrl: string };
    partner: { title: string; message: string; actionUrl: string };
    admin: { title: string; message: string; actionUrl: string };
  };
  feedback: {
    admin: { title: string; message: string; actionUrl: string };
  };
  newsletter_subscriber: {
    admin: { title: string; message: string; actionUrl: string };
  };
  system_status: {
    all: { title: string; message: string; actionUrl?: string };
  };
  partner_post: {
    follower: { title: string; message: string; actionUrl: string };
  };
  campaign: {
    user: { title: string; message: string; actionUrl: string };
  };
}

export class NotificationService {
  // Create notification for specific user
  async createNotification(notification: InsertNotification): Promise<void> {
    try {
      // Service role client kullan (RLS bypass)
      const { error } = await supabaseAdmin
        .from('notifications')
        .insert(notification);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Create notifications for multiple users
  async createBulkNotifications(notificationsList: InsertNotification[]): Promise<void> {
    try {
      if (notificationsList.length > 0) {
        // Service role client kullan (RLS bypass)
        const { error } = await supabaseAdmin
          .from('notifications')
          .insert(notificationsList);
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
    }
  }

  // Get user's notifications with pagination
  async getUserNotifications(userId: number, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;
      
      // User client kullan (RLS aktif)
      const { data, error, count: totalCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return {
        notifications: data || [],
        totalCount: totalCount || 0,
        hasMore: (offset + limit) < (totalCount || 0)
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], totalCount: 0, hasMore: false };
    }
  }

  // Get unread notification count for user
  async getUnreadCount(userId: number): Promise<number> {
    try {
      // User client kullan (RLS aktif)
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    try {
      // User client kullan (RLS aktif)
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Replace parameters in notification content
  private replaceNotificationParameters(content: string, userInfo: any): string {
    if (!userInfo) return content;

    const fullName = [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ') || 'Değerli Kullanıcı';
    const userName = userInfo.companyName || fullName;

    return content
      .replace(/\{\{userName\}\}/g, userName)
      .replace(/\{\{userEmail\}\}/g, userInfo.email || '')
      .replace(/\{\{fullName\}\}/g, fullName)
      .replace(/\{\{firstName\}\}/g, userInfo.firstName || '')
      .replace(/\{\{lastName\}\}/g, userInfo.lastName || '')
      .replace(/\{\{companyName\}\}/g, userInfo.companyName || '');
  }

  // Create notification with parameter replacement
  async createNotificationWithParams(notification: InsertNotification, userInfo?: any): Promise<void> {
    try {
      if (userInfo) {
        // Replace parameters in title and message
        const processedNotification = {
          ...notification,
          title: this.replaceNotificationParameters(notification.title, userInfo),
          message: this.replaceNotificationParameters(notification.message, userInfo)
        };
        await db.insert(notifications).values(processedNotification);
      } else {
        await this.createNotification(notification);
      }
    } catch (error) {
      console.error('Error creating notification with parameters:', error);
    }
  }

  // Create bulk notifications with parameter replacement
  async createBulkNotificationsWithParams(notificationsList: Array<{
    notification: InsertNotification;
    userInfo?: any;
  }>): Promise<void> {
    try {
      if (notificationsList.length > 0) {
        const processedNotifications = notificationsList.map(({ notification, userInfo }) => {
          if (userInfo) {
            return {
              ...notification,
              title: this.replaceNotificationParameters(notification.title, userInfo),
              message: this.replaceNotificationParameters(notification.message, userInfo)
            };
          }
          return notification;
        });

        await db.insert(notifications).values(processedNotifications);
      }
    } catch (error) {
      console.error('Error creating bulk notifications with parameters:', error);
    }
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId: number): Promise<void> {
    try {
      // User client kullan (RLS aktif)
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Get all admin users for admin notifications
  async getAdminUsers(): Promise<number[]> {
    try {
      const adminUsers = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.userType, 'admin'));
      
      return adminUsers.map(user => user.id);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
  }

  // Create quote request notification
  async createQuoteRequestNotification(data: {
    quoteRequestId: number;
    userId: number;
    partnerId: number;
    partnerName: string;
    userName: string;
    serviceNeeded: string;
  }): Promise<void> {
    const notifications: InsertNotification[] = [];

    // Notification for user
    notifications.push({
      userId: data.userId,
      type: 'quote_request',
      title: 'Teklif Talebiniz Gönderildi',
      message: `${data.partnerName} firmasına ${data.serviceNeeded} hizmeti için teklif talebiniz başarıyla gönderildi.`,
      relatedEntityType: 'quote_request',
      relatedEntityId: data.quoteRequestId,
      actionUrl: `/hizmet-taleplerim`,
      isEmailSent: false
    });

    // Notification for partner
    const partnerUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, data.partnerId));
    
    if (partnerUser.length > 0) {
      notifications.push({
        userId: partnerUser[0].id,
        type: 'quote_request',
        title: 'Yeni Teklif Talebi',
        message: `${data.userName} kullanıcısından ${data.serviceNeeded} hizmeti için yeni bir teklif talebi aldınız.`,
        relatedEntityType: 'quote_request',
        relatedEntityId: data.quoteRequestId,
        actionUrl: `/partner-dashboard?tab=quote-requests`,
        isEmailSent: false
      });
    }

    // Notification for admins
    const adminUsers = await this.getAdminUsers();
    adminUsers.forEach(adminId => {
      notifications.push({
        userId: adminId,
        type: 'quote_request',
        title: 'Yeni Teklif Talebi',
        message: `${data.userName} kullanıcısından ${data.partnerName} firmasına yeni bir teklif talebi oluşturuldu.`,
        relatedEntityType: 'quote_request',
        relatedEntityId: data.quoteRequestId,
        actionUrl: `/admin/quote-requests`,
        isEmailSent: false
      });
    });

    await this.createBulkNotifications(notifications);
  }

  // Create quote response notification
  async createQuoteResponseNotification(data: {
    quoteResponseId: number;
    quoteRequestId: number;
    userId: number;
    partnerId: number;
    partnerName: string;
    userName: string;
    quoteTitle: string;
  }): Promise<void> {
    const notifications: InsertNotification[] = [];

    // Notification for user
    notifications.push({
      userId: data.userId,
      type: 'quote_response',
      title: 'Yeni Teklif Aldınız',
      message: `${data.partnerName} firmasından "${data.quoteTitle}" için teklif aldınız.`,
      relatedEntityType: 'quote_response',
      relatedEntityId: data.quoteResponseId,
      actionUrl: `/hizmet-taleplerim?tab=received-quotes`,
      isEmailSent: false
    });

    // Notification for admins
    const adminUsers = await this.getAdminUsers();
    adminUsers.forEach(adminId => {
      notifications.push({
        userId: adminId,
        type: 'quote_response',
        title: 'Yeni Teklif Yanıtı',
        message: `${data.partnerName} firması ${data.userName} kullanıcısına "${data.quoteTitle}" için teklif gönderdi.`,
        relatedEntityType: 'quote_response',
        relatedEntityId: data.quoteResponseId,
        actionUrl: `/admin/quote-responses`,
        isEmailSent: false
      });
    });

    await this.createBulkNotifications(notifications);
  }

  // Create partner application notification
  async createPartnerApplicationNotification(data: {
    applicationId: number;
    applicantName: string;
    companyName: string;
    serviceCategory: string;
  }): Promise<void> {
    const adminUsers = await this.getAdminUsers();
    const notifications: InsertNotification[] = [];

    adminUsers.forEach(adminId => {
      notifications.push({
        userId: adminId,
        type: 'partner_application',
        title: 'Yeni Partner Başvurusu',
        message: `${data.applicantName} (${data.companyName}) ${data.serviceCategory} kategorisinde partner başvurusu yaptı.`,
        relatedEntityType: 'partner_application',
        relatedEntityId: data.applicationId,
        actionUrl: `/admin/partner-applications`,
        isEmailSent: false
      });
    });

    await this.createBulkNotifications(notifications);
  }

  // Create follower notification
  async createFollowerNotification(data: {
    followerId: number;
    partnerId: number;
    followerName: string;
    partnerName: string;
  }): Promise<void> {
    const partnerUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, data.partnerId));
    
    if (partnerUser.length > 0) {
      await this.createNotification({
        userId: partnerUser[0].id,
        type: 'follower',
        title: 'Yeni Takipçi',
        message: `${data.followerName} sizin firma profilinizi takip etmeye başladı.`,
        relatedEntityType: 'partner',
        relatedEntityId: data.partnerId,
        actionUrl: `/partner-dashboard?tab=followers`,
        isEmailSent: false
      });
    }
  }

  // Create system status notification for all users
  async createSystemStatusNotification(data: {
    title: string;
    message: string;
    actionUrl?: string;
  }): Promise<void> {
    try {
      const allUsers = await db.select({ id: users.id }).from(users);
      const notifications: InsertNotification[] = allUsers.map(user => ({
        userId: user.id,
        type: 'system_status',
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        isEmailSent: false
      }));

      await this.createBulkNotifications(notifications);
    } catch (error) {
      console.error('Error creating system status notifications:', error);
    }
  }

  // Create newsletter subscriber notification for admins
  async createNewsletterSubscriberNotification(data: {
    subscriberEmail: string;
    subscriberName?: string;
  }): Promise<void> {
    const adminUsers = await this.getAdminUsers();
    const notifications: InsertNotification[] = [];

    const displayName = data.subscriberName || data.subscriberEmail;

    adminUsers.forEach(adminId => {
      notifications.push({
        userId: adminId,
        type: 'newsletter_subscriber',
        title: 'Yeni Newsletter Abonesi',
        message: `${displayName} newsletter'a abone oldu.`,
        relatedEntityType: 'email_subscriber',
        actionUrl: `/admin/marketing-list`,
        isEmailSent: false
      });
    });

    await this.createBulkNotifications(notifications);
  }
}

export const notificationService = new NotificationService();