import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY environment variable is not set');
}

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('Resend API key not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: params.from || 'DİP Platform <noreply@dip.tc>',
      to: [params.to],
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: String(error) };
  }
}

export function createQuoteSentEmailTemplate(
  userName: string,
  partnerName: string,
  quoteTitle: string,
  totalAmount: number,
  validUntil: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Yeni Teklif Aldınız</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Teklifiniz Hazır!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px; background: #f8f9fa;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Merhaba <strong>${userName}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            <strong>${partnerName}</strong> firması, hizmet talebiniz için bir teklif gönderdi.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6B7280; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Teklif Detayları</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">Teklif Başlığı: <strong>${quoteTitle}</strong></li>
              <li style="margin-bottom: 8px;">Toplam Tutar: <strong>${totalAmount.toFixed(2)} TL</strong></li>
              <li style="margin-bottom: 8px;">Geçerlilik Süresi: <strong>${validUntil}</strong></li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'https://partner.dip.tc'}/user-dashboard?tab=requests" 
               style="background: #6B7280; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Teklifi İncele
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            Bu teklifi inceleyerek kabul veya ret edebilirsiniz. Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #fff; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">
            DEX - Digital Export Platform<br>
            <a href="https://partner.dip.tc" style="color: #6B7280; text-decoration: none;">https://partner.dip.tc</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function createQuoteStatusUpdateEmailTemplate(
  userName: string,
  partnerName: string,
  quoteTitle: string,
  status: 'accepted' | 'rejected',
  message?: string
): string {
  const statusText = status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi';
  const statusColor = status === 'accepted' ? '#10B981' : '#EF4444';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Teklif Durumu Güncellendi</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Teklif Durumu Güncellendi</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px; background: #f8f9fa;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Merhaba <strong>${partnerName}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            <strong>${userName}</strong> adlı müşteri, "${quoteTitle}" teklifinizi <strong style="color: ${statusColor};">${statusText}</strong>.
          </p>
          
          ${message ? `
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Müşteri Mesajı</h3>
            <p style="margin: 0; color: #555; font-style: italic;">"${message}"</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'https://partner.dip.tc'}/partner-dashboard?tab=quotes" 
               style="background: #6B7280; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Teklif Detaylarını İncele
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            Teklif durumunuzu partner panelinizden takip edebilirsiniz.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #fff; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">
            DEX - Digital Export Platform<br>
            <a href="https://partner.dip.tc" style="color: #6B7280; text-decoration: none;">https://partner.dip.tc</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}