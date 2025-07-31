import PDFDocument from 'pdfkit';
import type { QuoteRequest, Partner } from '@shared/schema';

export class PDFGenerator {
  static async generateQuoteRequestPDF(quoteRequest: QuoteRequest, partner?: Partner): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header with grey background instead of blue
        doc.rect(0, 0, doc.page.width, 120).fill('#6B7280');
        
        // Partner logo and name in header (if available)
        if (partner) {
          doc.fillColor('white').fontSize(18).font('Helvetica-Bold');
          doc.text(partner.companyName, 50, 30, { width: 300 });
          
          if (partner.logo) {
            // Note: In production, you'd want to fetch and include the actual logo
            doc.fontSize(12).font('Helvetica');
            doc.text('Logo: ' + partner.logo, 50, 60);
          }
        }
        
        // Title
        doc.fillColor('white').fontSize(24).font('Helvetica-Bold');
        doc.text(`Teklif Talebi #${quoteRequest.id}`, 0, 80, { align: 'center' });

        // Reset position for content
        doc.y = 150;
        doc.fillColor('black');

        // Customer Information Section
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

        // Service Details Section
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Hizmet Detayları', 50, doc.y);
        doc.moveDown(0.5);

        doc.fontSize(12).font('Helvetica');
        
        // Parse service needed to separate main service from working style
        const serviceNeeded = quoteRequest.serviceNeeded || '';
        const serviceLines = serviceNeeded.split('\n');
        const mainService = serviceLines[0];
        const workingStyle = serviceLines.find(line => line.includes('Çalışma Şekli:'));

        const serviceInfo = [
          ['İhtiyaç Duyulan Hizmet:', mainService],
          ['Bütçe:', quoteRequest.budget || 'Belirtilmemiş'],
          ['Durum:', this.getStatusText(quoteRequest.status || 'pending')]
        ];

        serviceInfo.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').text(label, 50, doc.y, { width: 150, continued: true });
          doc.font('Helvetica').text(' ' + value);
          doc.moveDown(0.3);
        });

        if (workingStyle) {
          doc.moveDown(0.5);
          doc.fontSize(14).font('Helvetica-Bold');
          doc.text('Çalışma Şekli', 50, doc.y);
          doc.moveDown(0.3);
          doc.fontSize(12).font('Helvetica');
          doc.text(workingStyle.replace('Çalışma Şekli: ', ''), 50, doc.y);
        }

        doc.moveDown(1);

        // Customer Message Section
        if (quoteRequest.message) {
          doc.fontSize(16).font('Helvetica-Bold');
          doc.text('Müşteri Mesajı', 50, doc.y);
          doc.moveDown(0.5);
          doc.fontSize(12).font('Helvetica');
          doc.text(quoteRequest.message, 50, doc.y, { width: 500 });
          doc.moveDown(1);
        }

        // Request Information Section
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Talep Bilgileri', 50, doc.y);
        doc.moveDown(0.5);

        doc.fontSize(12).font('Helvetica');
        const requestInfo = [
          ['Talep Tarihi:', new Date(quoteRequest.createdAt!).toLocaleDateString('tr-TR')],
          ['Son Güncelleme:', new Date(quoteRequest.updatedAt || quoteRequest.createdAt!).toLocaleDateString('tr-TR')]
        ];

        requestInfo.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').text(label, 50, doc.y, { width: 120, continued: true });
          doc.font('Helvetica').text(' ' + value);
          doc.moveDown(0.3);
        });

        // Footer with DEX logo and website
        const footerY = doc.page.height - 80;
        doc.y = footerY;
        
        // Footer background
        doc.rect(0, footerY - 20, doc.page.width, 100).fill('#F9FAFB');
        
        doc.fillColor('black').fontSize(10).font('Helvetica');
        doc.text('DEX - Digital Export Platform', 0, footerY, { align: 'center' });
        doc.text('https://partner.dip.tc', 0, footerY + 15, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static async generateQuoteResponsePDF(quoteResponse: any, quoteRequest: QuoteRequest, partner: Partner): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header with grey background
        doc.rect(0, 0, doc.page.width, 120).fill('#6B7280');
        
        // Partner logo and name in header
        doc.fillColor('white').fontSize(18).font('Helvetica-Bold');
        doc.text(partner.companyName, 50, 30, { width: 300 });
        
        // Title
        doc.fillColor('white').fontSize(24).font('Helvetica-Bold');
        doc.text(quoteResponse.title, 0, 80, { align: 'center' });

        // Reset position for content
        doc.y = 150;
        doc.fillColor('black');

        // Quote Number and Date
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(`Teklif No: ${quoteResponse.quoteNumber || 'DIP' + Date.now()}`, 50, doc.y);
        doc.text(`Tarih: ${new Date(quoteResponse.createdAt).toLocaleDateString('tr-TR')}`, 400, doc.y);
        doc.moveDown(1);

        // Customer Information
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Müşteri Bilgileri', 50, doc.y);
        doc.moveDown(0.5);

        doc.fontSize(12).font('Helvetica');
        const customerInfo = [
          ['Ad Soyad:', quoteRequest.fullName || 'Belirtilmemiş'],
          ['Şirket:', quoteRequest.companyName || 'Belirtilmemiş'],
          ['E-posta:', quoteRequest.email],
          ['Telefon:', quoteRequest.phone || 'Belirtilmemiş']
        ];

        customerInfo.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').text(label, 50, doc.y, { width: 80, continued: true });
          doc.font('Helvetica').text(' ' + value);
          doc.moveDown(0.3);
        });

        doc.moveDown(1);

        // Quote Items
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Hizmet Kalemleri', 50, doc.y);
        doc.moveDown(0.5);

        // Table header
        const tableTop = doc.y;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Hizmet', 50, tableTop);
        doc.text('Miktar', 300, tableTop);
        doc.text('Birim Fiyat', 360, tableTop);
        doc.text('Toplam', 450, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).stroke();
        doc.y = tableTop + 25;

        // Table rows
        doc.font('Helvetica');
        const items = JSON.parse(quoteResponse.items || '[]');
        items.forEach((item: { description: string; quantity: number; unitPrice: number; total: number }) => {
          doc.text(item.description, 50, doc.y, { width: 240 });
          doc.text(item.quantity.toString(), 300, doc.y);
          doc.text((item.unitPrice / 100).toFixed(2) + ' TL', 360, doc.y);
          doc.text((item.total / 100).toFixed(2) + ' TL', 450, doc.y);
          doc.moveDown(0.5);
        });

        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown(0.5);

        // Totals
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Ara Toplam: ${(quoteResponse.subtotal / 100).toFixed(2)} TL`, 350, doc.y);
        doc.moveDown(0.3);
        doc.text(`KDV (%${quoteResponse.taxRate || 20}): ${(quoteResponse.taxAmount / 100).toFixed(2)} TL`, 350, doc.y);
        doc.moveDown(0.3);
        doc.fontSize(14);
        doc.text(`TOPLAM: ${(quoteResponse.totalAmount / 100).toFixed(2)} TL`, 350, doc.y);

        doc.moveDown(1);

        // Terms and Conditions
        if (quoteResponse.notes || quoteResponse.paymentTerms || quoteResponse.deliveryTime) {
          doc.fontSize(16).font('Helvetica-Bold');
          doc.text('Şartlar ve Koşullar', 50, doc.y);
          doc.moveDown(0.5);
          doc.fontSize(12).font('Helvetica');
          
          if (quoteResponse.paymentTerms) {
            doc.text(`Ödeme Şartları: ${quoteResponse.paymentTerms}`, 50, doc.y);
            doc.moveDown(0.3);
          }
          
          if (quoteResponse.deliveryTime) {
            doc.text(`Teslimat Süresi: ${quoteResponse.deliveryTime}`, 50, doc.y);
            doc.moveDown(0.3);
          }
          
          if (quoteResponse.notes) {
            doc.text(`Notlar: ${quoteResponse.notes}`, 50, doc.y);
            doc.moveDown(0.3);
          }
          
          if (quoteResponse.validUntil) {
            doc.text(`Geçerlilik Tarihi: ${new Date(quoteResponse.validUntil).toLocaleDateString('tr-TR')}`, 50, doc.y);
          }
        }

        // Footer
        const footerY = doc.page.height - 80;
        doc.y = footerY;
        
        doc.rect(0, footerY - 20, doc.page.width, 100).fill('#F9FAFB');
        
        doc.fillColor('black').fontSize(10).font('Helvetica');
        doc.text('DEX - Digital Export Platform', 0, footerY, { align: 'center' });
        doc.text('https://partner.dip.tc', 0, footerY + 15, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private static getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Beklemede',
      'responded': 'Yanıtlandı',
      'quote_sent': 'Teklif Gönderildi',
      'accepted': 'Kabul Edildi',
      'rejected': 'Reddedildi',
      'completed': 'Tamamlandı'
    };
    return statusMap[status] || status;
  }
}