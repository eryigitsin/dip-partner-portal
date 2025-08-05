import { storage } from './storage';
import { resendService } from './resend-service';

export class QuoteExpirationJob {
  private intervalId: NodeJS.Timeout | null = null;
  
  start() {
    console.log('Starting quote expiration job...');
    this.checkExpiringQuotes();
    this.intervalId = setInterval(() => {
      this.checkExpiringQuotes();
    }, 2 * 60 * 60 * 1000); // 2 hours
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Quote expiration job stopped');
    }
  }
  
  private async checkExpiringQuotes() {
    try {
      console.log('Checking for expiring quotes...');
      
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const activeQuotes = await storage.getActiveQuoteResponses();
      
      for (const quote of activeQuotes) {
        if (!quote.validUntil) continue;
        
        const validUntilDate = new Date(quote.validUntil);
        
        if (validUntilDate <= now && quote.status === 'pending') {
          await this.expireQuote(quote);
        } else if (validUntilDate <= tomorrow && validUntilDate > now && quote.status === 'pending') {
          await this.sendExpirationWarning(quote);
        }
      }
      
      console.log('Quote expiration check completed');
    } catch (error) {
      console.error('Error in quote expiration job:', error);
    }
  }
  
  private async expireQuote(quote: any) {
    try {
      console.log(`Expiring quote ${quote.id}`);
      
      await storage.updateQuoteResponse(quote.id, { 
        status: 'expired',
        updatedAt: new Date()
      });
      
      await storage.updateQuoteRequest(quote.quoteRequestId, { 
        status: 'expired',
        updatedAt: new Date()
      });
      
      await this.sendExpirationNotification(quote);
    } catch (error) {
      console.error(`Error expiring quote ${quote.id}:`, error);
    }
  }
  
  private async sendExpirationWarning(quote: any) {
    try {
      console.log(`Sending expiration warning for quote ${quote.id}`);
      
      const quoteRequest = await storage.getQuoteRequestById(quote.quoteRequestId);
      if (!quoteRequest || !quoteRequest.userId) return;
      
      const customer = await storage.getUserById(quoteRequest.userId);
      const partner = await storage.getPartner(quote.partnerId);
      
      if (customer && partner) {
        const customerEmailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">⚠️ Teklif Süresi Yakında Doluyor!</h1>
            </div>
            <div style="padding: 30px; background: #f8f9fa;">
              <p>Merhaba ${customer.firstName} ${customer.lastName},</p>
              <p><strong>${partner.companyName}</strong> firmasından aldığınız teklifin süresi yarın doluyor.</p>
              <p><strong>Teklif Detayları:</strong></p>
              <ul>
                <li>Teklif Başlığı: ${quote.title}</li>
                <li>Toplam Tutar: ${(quote.totalAmount / 100).toFixed(2)} TL</li>
                <li>Geçerlilik Tarihi: ${new Date(quote.validUntil).toLocaleDateString('tr-TR')}</li>
              </ul>
              <p>Teklifi kabul etmek, reddetmek veya revizyon talebinde bulunmak için lütfen en kısa sürede işlem yapın.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://dip.tc/user-dashboard?tab=requests" 
                   style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Teklifi İncele
                </a>
              </div>
            </div>
          </div>
        `;

        await resendService.sendEmail({
          to: customer.email,
          subject: `⚠️ Teklif Süresi Yakında Doluyor - ${partner.companyName}`,
          html: customerEmailContent,
        });
        
        await storage.recordQuoteExpirationWarning(quote.id);
      }
    } catch (error) {
      console.error(`Error sending expiration warning for quote ${quote.id}:`, error);
    }
  }
  
  private async sendExpirationNotification(quote: any) {
    try {
      const quoteRequest = await storage.getQuoteRequestById(quote.quoteRequestId);
      if (!quoteRequest || !quoteRequest.userId) return;
      
      const customer = await storage.getUserById(quoteRequest.userId);
      const partner = await storage.getPartner(quote.partnerId);
      
      if (customer && partner) {
        const customerEmailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Teklif Süresi Doldu</h1>
            </div>
            <div style="padding: 30px; background: #f8f9fa;">
              <p>Merhaba ${customer.firstName} ${customer.lastName},</p>
              <p><strong>${partner.companyName}</strong> firmasından aldığınız teklifin geçerlilik süresi dolmuştur.</p>
              <p><strong>Süresi Dolan Teklif:</strong></p>
              <ul>
                <li>Teklif Başlığı: ${quote.title}</li>
                <li>Toplam Tutar: ${(quote.totalAmount / 100).toFixed(2)} TL</li>
                <li>Geçerlilik Tarihi: ${new Date(quote.validUntil).toLocaleDateString('tr-TR')}</li>
              </ul>
              <p>Hala bu hizmete ihtiyacınız varsa, partner ile iletişime geçerek yeni bir teklif talep edebilirsiniz.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://dip.tc/user-dashboard?tab=requests" 
                   style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Yeni Teklif Talep Et
                </a>
              </div>
            </div>
          </div>
        `;

        await resendService.sendEmail({
          to: customer.email,
          subject: `Teklif Süresi Doldu - ${partner.companyName}`,
          html: customerEmailContent,
        });

        const partnerUser = await storage.getUserById(partner.userId);
        if (partnerUser) {
          const partnerEmailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #dc2626; color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Gönderdiğiniz Teklif Süresi Doldu</h1>
              </div>
              <div style="padding: 30px; background: #f8f9fa;">
                <p>Merhaba ${partnerUser.firstName} ${partnerUser.lastName},</p>
                <p>${customer.firstName} ${customer.lastName} adlı müşteriye gönderdiğiniz teklifin geçerlilik süresi dolmuştur.</p>
                <p><strong>Süresi Dolan Teklif:</strong></p>
                <ul>
                  <li>Teklif Başlığı: ${quote.title}</li>
                  <li>Müşteri: ${customer.firstName} ${customer.lastName}</li>
                  <li>Toplam Tutar: ${(quote.totalAmount / 100).toFixed(2)} TL</li>
                  <li>Geçerlilik Tarihi: ${new Date(quote.validUntil).toLocaleDateString('tr-TR')}</li>
                </ul>
                <p>İsterseniz güncelleme yaparak tekrar gönderebilir veya müşteri ile iletişime geçebilirsiniz.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://dip.tc/partner-dashboard?tab=quotes" 
                     style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                     Teklifi Güncelle
                  </a>
                </div>
              </div>
            </div>
          `;

          await resendService.sendEmail({
            to: partnerUser.email,
            subject: `Gönderdiğiniz Teklif Süresi Doldu - ${customer.firstName} ${customer.lastName}`,
            html: partnerEmailContent,
          });
        }
      }
    } catch (error) {
      console.error(`Error sending expiration notification for quote ${quote.id}:`, error);
    }
  }
}

export const quoteExpirationJob = new QuoteExpirationJob();