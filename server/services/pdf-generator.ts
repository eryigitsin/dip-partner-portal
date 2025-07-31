import PDFDocument from 'pdfkit';
import type { QuoteRequest, Partner } from '@shared/schema';

export class PDFGenerator {
  static async generateQuoteRequestPDF(quoteRequest: QuoteRequest, partner?: Partner): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          bufferPages: true 
        });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header with grey background
        doc.rect(0, 0, doc.page.width, 120).fill('#6B7280');
        
        // Partner info in header
        if (partner) {
          doc.fillColor('white').fontSize(18).font('Helvetica-Bold');
          doc.text(partner.companyName || 'Partner', 50, 30, { width: 300 });
        }
        
        // Title
        doc.fillColor('white').fontSize(24).font('Helvetica-Bold');
        doc.text(`Teklif Talebi #${quoteRequest.id}`, 0, 80, { align: 'center' });

        // Reset for content
        doc.y = 150;
        doc.fillColor('black');

        // Customer Information
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Müşteri Bilgileri', 50, doc.y);
        doc.moveDown(0.5);

        doc.fontSize(12).font('Helvetica');
        const customerInfo = [
          ['Ad Soyad:', quoteRequest.fullName || 'Belirtilmemiş'],
          ['E-posta:', quoteRequest.email || 'Belirtilmemiş'],
          ['Telefon:', quoteRequest.phone || 'Belirtilmemiş'],
          ['Şirket:', quoteRequest.companyName || 'Belirtilmemiş']
        ];

        customerInfo.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').text(label, 50, doc.y, { width: 120, continued: true });
          doc.font('Helvetica').text(' ' + value);
          doc.moveDown(0.3);
        });

        doc.moveDown(1);

        // Service Details
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Hizmet Detayları', 50, doc.y);
        doc.moveDown(0.5);

        doc.fontSize(12).font('Helvetica');
        doc.font('Helvetica-Bold').text('İhtiyaç Duyulan Hizmet:', 50, doc.y);
        doc.moveDown(0.3);
        doc.font('Helvetica').text(quoteRequest.serviceNeeded || 'Belirtilmemiş', 50, doc.y, { width: 500 });
        doc.moveDown(0.5);

        const serviceInfo = [
          ['Bütçe:', quoteRequest.budget || 'Belirtilmemiş'],
          ['Durum:', getStatusText(quoteRequest.status || 'pending')]
        ];

        serviceInfo.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').text(label, 50, doc.y, { width: 120, continued: true });
          doc.font('Helvetica').text(' ' + value);
          doc.moveDown(0.3);
        });

        doc.moveDown(1);

        // Request Information
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Talep Bilgileri', 50, doc.y);
        doc.moveDown(0.5);

        doc.fontSize(12).font('Helvetica');
        const requestInfo = [
          ['Talep Tarihi:', quoteRequest.createdAt ? new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR') : 'Belirtilmemiş'],
          ['Son Güncelleme:', quoteRequest.updatedAt ? new Date(quoteRequest.updatedAt).toLocaleDateString('tr-TR') : 'Belirtilmemiş']
        ];

        requestInfo.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').text(label, 50, doc.y, { width: 150, continued: true });
          doc.font('Helvetica').text(' ' + value);
          doc.moveDown(0.3);
        });

        // Footer
        const footerY = doc.page.height - 80;
        doc.y = footerY;
        
        doc.rect(0, footerY - 20, doc.page.width, 100).fill('#F9FAFB');
        
        doc.fillColor('black').fontSize(10).font('Helvetica');
        doc.text('DİP - Digital İhracat Platformu', 0, footerY, { align: 'center' });
        doc.text('https://partner.dip.tc', 0, footerY + 15, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static async generateQuoteResponsePDF(quoteResponse: any, quoteRequest: QuoteRequest, partner?: Partner): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          bufferPages: true 
        });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header with grey background
        doc.rect(0, 0, doc.page.width, 120).fill('#6B7280');
        
        // Title
        doc.fillColor('white').fontSize(24).font('Helvetica-Bold');
        doc.text(`Teklif Yanıtı #${quoteResponse.id}`, 0, 80, { align: 'center' });

        // Reset for content
        doc.y = 150;
        doc.fillColor('black');

        // Quote Details
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Teklif Detayları', 50, doc.y);
        doc.moveDown(0.5);

        doc.fontSize(12).font('Helvetica');
        const quoteInfo = [
          ['Başlık:', quoteResponse.title || 'Belirtilmemiş'],
          ['Açıklama:', quoteResponse.description || 'Belirtilmemiş'],
          ['Fiyat:', `${quoteResponse.price} ${quoteResponse.currency}`],
          ['Teslimat Süresi:', quoteResponse.deliveryTime || 'Belirtilmemiş']
        ];

        quoteInfo.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').text(label, 50, doc.y, { width: 120, continued: true });
          doc.font('Helvetica').text(' ' + value);
          doc.moveDown(0.3);
        });

        // Footer
        const footerY = doc.page.height - 80;
        doc.y = footerY;
        
        doc.rect(0, footerY - 20, doc.page.width, 100).fill('#F9FAFB');
        
        doc.fillColor('black').fontSize(10).font('Helvetica');
        doc.text('DİP - Digital İhracat Platformu', 0, footerY, { align: 'center' });
        doc.text('https://partner.dip.tc', 0, footerY + 15, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Helper function for status text
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Beklemede',
    'under_review': 'İnceleniyor',
    'approved': 'Onaylandı',
    'rejected': 'Reddedildi',
    'completed': 'Tamamlandı'
  };
  return statusMap[status] || 'Bilinmiyor';
}