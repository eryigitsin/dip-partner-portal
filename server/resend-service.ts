import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  tags?: { name: string; value: string }[];
}

export interface ContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  title?: string;
  address?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  userType?: string;
}

export class ResendService {
  private readonly fromEmail = 'DİP Platform <info@dip.tc>';
  private readonly audienceId = process.env.RESEND_AUDIENCE_ID;

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { data, error } = await resend.emails.send({
        from: options.from || this.fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        tags: options.tags,
      });

      if (error) {
        console.error('Resend email error:', error);
        return { success: false, error: error.message };
      }

      console.log('Email sent successfully:', data?.id);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  }

  async addToAudience(contactData: ContactData): Promise<{ success: boolean; error?: string }> {
    if (!this.audienceId) {
      console.warn('Resend Audience ID not configured');
      return { success: false, error: 'Audience ID not configured' };
    }

    try {
      const { data, error } = await resend.contacts.create({
        audienceId: this.audienceId,
        email: contactData.email,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        unsubscribed: false,
      });

      if (error) {
        console.error('Failed to add contact to audience:', error);
        return { success: false, error: error.message };
      }

      console.log('Contact added to audience:', data?.id);
      return { success: true };
    } catch (error) {
      console.error('Audience management error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown audience error' 
      };
    }
  }

  async updateContact(email: string, contactData: Partial<ContactData>): Promise<{ success: boolean; error?: string }> {
    if (!this.audienceId) {
      return { success: false, error: 'Audience ID not configured' };
    }

    try {
      // Resend doesn't have direct update, so we need to remove and re-add
      // Or use their batch operations for better efficiency
      const { error } = await resend.contacts.update({
        audienceId: this.audienceId,
        id: email, // This might need to be the contact ID, not email
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        unsubscribed: false,
      });

      if (error) {
        console.error('Failed to update contact:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Contact update error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown update error' 
      };
    }
  }

  async removeFromAudience(email: string): Promise<{ success: boolean; error?: string }> {
    if (!this.audienceId) {
      return { success: false, error: 'Audience ID not configured' };
    }

    try {
      const { error } = await resend.contacts.remove({
        audienceId: this.audienceId,
        email: email,
      });

      if (error) {
        console.error('Failed to remove contact from audience:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Contact removal error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown removal error' 
      };
    }
  }

  // Email Templates
  createPartnerApplicationConfirmationEmail(applicantName: string, applicationId: number): EmailTemplate {
    const statusUrl = `https://partner.dip.tc/application-status`;
    
    return {
      subject: 'Partner Başvurunuz Alındı - DİP Platform',
      html: `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Partner Başvurunuz Alındı</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .header p { margin: 10px 0 0; opacity: 0.9; font-size: 16px; }
            .content { padding: 40px 30px; }
            .message { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .cta-button { display: inline-block; background: #1e40af; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; transition: background 0.3s; }
            .cta-button:hover { background: #1e3a8a; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; }
            .logo { font-size: 24px; font-weight: bold; color: white; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">DİP Platform</div>
              <h1>Partner Başvurunuz Alındı!</h1>
              <p>Başvurunuz başarıyla teslim edildi ve inceleme sürecine alındı</p>
            </div>
            
            <div class="content">
              <p>Sayın <strong>${applicantName}</strong>,</p>
              
              <div class="message">
                <p><strong>Partner başvurunuz başarıyla alındı!</strong></p>
                <p>Başvuru numaranız: <strong>#${applicationId}</strong></p>
              </div>
              
              <p>DİP Platform'a partner olmak için başvuruda bulunduğunuz için teşekkür ederiz. Başvurunuz uzman ekibimiz tarafından detaylı bir şekilde incelenecektir.</p>
              
              <div class="info-box">
                <h3>📋 Sonraki Adımlar:</h3>
                <ul>
                  <li>Başvurunuz 2-3 iş günü içinde incelenecektir</li>
                  <li>Gerekli durumlarda size iletişim bilgilerinizden ulaşılacaktır</li>
                  <li>Sonuç ne olursa olsun bilgilendirileceksiniz</li>
                </ul>
              </div>
              
              <p>Başvuru durumunuzu aşağıdaki bağlantıdan takip edebilirsiniz:</p>
              
              <div style="text-align: center;">
                <a href="${statusUrl}" class="cta-button">Başvuru Durumunu Takip Et</a>
              </div>
              
              <p>Herhangi bir sorunuz olursa bizimle iletişime geçmekten çekinmeyin.</p>
              
              <p>Saygılarımızla,<br><strong>DİP Platform Ekibi</strong></p>
            </div>
            
            <div class="footer">
              <p>📧 info@dip.tc | 📞 +90 850 307 12 45</p>
              <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  createAdminPartnerApplicationNotificationEmail(applicantName: string, company: string, email: string, phone: string): EmailTemplate {
    const adminUrl = `https://partner.dip.tc/admin/partner-applications`;
    
    return {
      subject: 'Yeni Partner Başvurusu - DİP Platform',
      html: `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Yeni Partner Başvurusu</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); }
            .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .header p { margin: 10px 0 0; opacity: 0.9; font-size: 16px; }
            .content { padding: 40px 30px; }
            .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .applicant-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .cta-button { display: inline-block; background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; transition: background 0.3s; }
            .cta-button:hover { background: #b91c1c; }
            .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; }
            .logo { font-size: 24px; font-weight: bold; color: white; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .info-label { font-weight: 600; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">DİP Platform</div>
              <h1>🚨 Yeni Partner Başvurusu</h1>
              <p>Acil inceleme gerektiren yeni bir başvuru var</p>
            </div>
            
            <div class="content">
              <p>Sayın Admin,</p>
              
              <div class="alert">
                <p><strong>Yeni bir partner başvurusu sisteme kaydedildi!</strong></p>
                <p>Başvuru detaylarını incelemek ve gerekli işlemleri yapmak için admin paneline giriş yapmanız gerekmektedir.</p>
              </div>
              
              <div class="applicant-info">
                <h3>👤 Başvuru Sahibi Bilgileri:</h3>
                <div class="info-row">
                  <span class="info-label">Ad Soyad:</span>
                  <span><strong>${applicantName}</strong></span>
                </div>
                <div class="info-row">
                  <span class="info-label">Şirket:</span>
                  <span><strong>${company}</strong></span>
                </div>
                <div class="info-row">
                  <span class="info-label">E-posta:</span>
                  <span><strong>${email}</strong></span>
                </div>
                <div class="info-row">
                  <span class="info-label">Telefon:</span>
                  <span><strong>${phone}</strong></span>
                </div>
              </div>
              
              <p>Başvuruyu detaylı incelemek ve onay/red kararı vermek için admin paneline giriş yapın:</p>
              
              <div style="text-align: center;">
                <a href="${adminUrl}" class="cta-button">Admin Panelini Aç</a>
              </div>
              
              <p><strong>Hatırlatma:</strong> Partner başvuruları 2-3 iş günü içinde değerlendirilmelidir.</p>
              
              <p>Saygılarımızla,<br><strong>DİP Platform Sistemi</strong></p>
            </div>
            
            <div class="footer">
              <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
              <p>📧 info@dip.tc | 📞 +90 850 307 12 45</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }
}

export const resendService = new ResendService();