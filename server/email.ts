import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable must be set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: params.from || 'DİP Platform <noreply@dip.tc>',
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('Resend email error:', error);
      return false;
    }

    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// Email templates
export const emailTemplates = {
  partnerApplication: {
    toAdmin: (applicantName: string, company: string, email: string, phone: string) => ({
      subject: "Yeni İş Ortağı Başvurusu",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
            <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Yeni İş Ortağı Başvurusu</h2>
            <p style="color: #666; line-height: 1.6;">Yeni bir iş ortağı başvurusu alındı:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Başvuran:</strong> ${applicantName}</p>
              <p><strong>Şirket:</strong> ${company}</p>
              <p><strong>E-posta:</strong> ${email}</p>
              <p><strong>Telefon:</strong> ${phone}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.REPLIT_DEV_DOMAIN || 'https://dip-partner-portal.replit.app'}/admin-dashboard" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Başvuruyu İncele
              </a>
            </div>
          </div>
        </div>
      `
    }),
    toApplicant: (applicantName: string, applicationId: number) => ({
      subject: "İş Ortağı Başvurunuz Alındı",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
            <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Başvurunuz Alındı</h2>
            <p style="color: #666; line-height: 1.6;">Sayın ${applicantName},</p>
            <p style="color: #666; line-height: 1.6;">İş ortağı başvurunuz başarıyla alındı ve değerlendirme sürecine girdi. Başvurunuzun durumunu aşağıdaki bağlantıdan takip edebilirsiniz.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://dip-partner-portal.replit.app'}/application-status/${applicationId}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Başvuru Durumunu Kontrol Et
              </a>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-bottom: 15px;">İletişim</h3>
              <p style="color: #666; margin: 5px 0;">
                E-posta: <a href="mailto:info@dip.tc" style="color: #667eea;">info@dip.tc</a>
              </p>
              <p style="color: #666; margin: 5px 0;">
                Telefon: <a href="tel:+908503071245" style="color: #667eea;">+90 850 307 12 45</a>
              </p>
            </div>
          </div>
        </div>
      `
    })
  },
  
  userRegistration: (userName: string, email: string) => ({
    subject: "Yeni Kullanıcı Kaydı",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
          <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Yeni Kullanıcı Kaydı</h2>
          <p style="color: #666; line-height: 1.6;">Platforma yeni bir kullanıcı kaydoldu:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Kullanıcı:</strong> ${userName}</p>
            <p><strong>E-posta:</strong> ${email}</p>
            <p><strong>Kayıt Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
          </div>
        </div>
      </div>
    `
  }),
  
  serviceRequest: {
    toPartner: (partnerName: string, userName: string, serviceName: string, description: string, requestId: number) => ({
      subject: "Yeni Teklif Talebi",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
            <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Yeni Teklif Talebi</h2>
            <p style="color: #666; line-height: 1.6;">Sayın ${partnerName},</p>
            <p style="color: #666; line-height: 1.6;">Size yeni bir hizmet talebi geldi:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Talep Eden:</strong> ${userName}</p>
              <p><strong>Hizmet:</strong> ${serviceName}</p>
              <p><strong>Açıklama:</strong> ${description}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://dip-partner-portal.replit.app'}/partner-dashboard" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                TALEBİ YÖNET
              </a>
            </div>
          </div>
        </div>
      `
    }),
    
    toUser: (userName: string, partnerName: string, serviceName: string) => ({
      subject: `${partnerName} Hizmet Talebinle İlgili Bir Teklif Gönderdi!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
            <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Teklif Aldınız!</h2>
            <p style="color: #666; line-height: 1.6;">Sayın ${userName},</p>
            <p style="color: #666; line-height: 1.6;">${partnerName} firması "${serviceName}" hizmet talebiniz için bir teklif gönderdi.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://dip-partner-portal.replit.app'}/user-panel?tab=service-requests" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Teklifi İncele
              </a>
            </div>
          </div>
        </div>
      `
    })
  },
  
  quoteStatus: {
    approved: {
      toPartner: (partnerName: string, userName: string, serviceName: string) => ({
        subject: "Teklif Onaylandı, Ödeme Bekleniyor",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
              <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
            </div>
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Teklif Onaylandı!</h2>
              <p style="color: #666; line-height: 1.6;">Sayın ${partnerName},</p>
              <p style="color: #666; line-height: 1.6;">${userName} kullanıcısı "${serviceName}" hizmeti için teklifinizi onayladı. Ödeme bekleniyor.</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #28a745; font-weight: bold;">✓ Teklif Onaylandı</p>
                <p style="color: #ffc107; font-weight: bold;">⏳ Ödeme Bekleniyor</p>
              </div>
            </div>
          </div>
        `
      }),
      toUser: (userName: string, partnerName: string, serviceName: string) => ({
        subject: "Ödeme Sayfası - Onaylanan Teklifiniz",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
              <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
            </div>
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Ödeme Yapın</h2>
              <p style="color: #666; line-height: 1.6;">Sayın ${userName},</p>
              <p style="color: #666; line-height: 1.6;">${partnerName} firmasından aldığınız "${serviceName}" hizmeti teklifini onayladınız. Ödeme yaparak süreci tamamlayabilirsiniz.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://dip-partner-portal.replit.app'}/payment" 
                   style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Ödeme Yap
                </a>
              </div>
            </div>
          </div>
        `
      })
    },
    rejected: {
      toPartner: (partnerName: string, userName: string, serviceName: string, reason?: string) => ({
        subject: "Teklif Reddedildi",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
              <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
            </div>
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Teklif Reddedildi</h2>
              <p style="color: #666; line-height: 1.6;">Sayın ${partnerName},</p>
              <p style="color: #666; line-height: 1.6;">${userName} kullanıcısı "${serviceName}" hizmeti için teklifinizi reddetti.</p>
              ${reason ? `<div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Red Sebebi:</strong> ${reason}</p>
              </div>` : ''}
            </div>
          </div>
        `
      })
    }
  },
  
  paymentComplete: (userName: string, partnerName: string, serviceName: string) => ({
    subject: "Ödemen Alındı",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">DİP Partner Portal</h1>
          <p style="color: white; margin: 10px 0 0 0;">Digital Export Platform</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Ödeme Başarılı!</h2>
          <p style="color: #666; line-height: 1.6;">Sayın ${userName},</p>
          <p style="color: #666; line-height: 1.6;">Ödemeniz başarıyla alındı. ${partnerName} iş ortağımız en kısa sürede sizinle iletişime geçecek.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #28a745; font-weight: bold;">✓ Ödeme Tamamlandı</p>
            <p><strong>Hizmet:</strong> ${serviceName}</p>
            <p><strong>Partner:</strong> ${partnerName}</p>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">İletişim</h3>
            <p style="color: #666; margin: 5px 0;">
              E-posta: <a href="mailto:info@dip.tc" style="color: #667eea;">info@dip.tc</a>
            </p>
            <p style="color: #666; margin: 5px 0;">
              Telefon: <a href="tel:+908503071245" style="color: #667eea;">+90 850 307 12 45</a>
            </p>
          </div>
        </div>
      </div>
    `
  })
};