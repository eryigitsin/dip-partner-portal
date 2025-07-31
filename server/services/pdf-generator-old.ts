import htmlPdf from 'html-pdf-node';
import type { QuoteRequest, Partner } from '@shared/schema';

export class PDFGenerator {
  static async generateQuoteRequestPDF(quoteRequest: QuoteRequest, partner?: Partner): Promise<Buffer> {
    // Generate HTML content with proper UTF-8 encoding
    const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Teklif Talebi #${quoteRequest.id}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
            }
            
            .header {
                background-color: #6B7280;
                color: white;
                padding: 30px;
                text-align: center;
                margin-bottom: 30px;
            }
            
            .partner-info {
                margin-bottom: 10px;
            }
            
            .partner-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .title {
                font-size: 24px;
                font-weight: bold;
                margin-top: 20px;
            }
            
            .content {
                padding: 0 30px;
            }
            
            .section {
                margin-bottom: 30px;
            }
            
            .section-title {
                font-size: 16px;
                font-weight: bold;
                color: #374151;
                margin-bottom: 15px;
                border-bottom: 2px solid #E5E7EB;
                padding-bottom: 5px;
            }
            
            .info-row {
                display: flex;
                margin-bottom: 8px;
            }
            
            .info-label {
                font-weight: bold;
                width: 150px;
                color: #4B5563;
            }
            
            .info-value {
                flex: 1;
                color: #111827;
            }
            
            .service-content {
                background-color: #F9FAFB;
                padding: 15px;
                border-radius: 8px;
                margin: 10px 0;
                border-left: 4px solid #6B7280;
            }
            
            .footer {
                position: fixed;
                bottom: 30px;
                left: 0;
                right: 0;
                text-align: center;
                color: #6B7280;
                font-size: 12px;
                padding: 20px;
            }
            
            .footer img {
                width: 150px;
                margin-bottom: 10px;
            }
            
            .page-break {
                page-break-before: always;
            }
        </style>
    </head>
    <body>
        <div class="header">
            ${partner ? `
                <div class="partner-info">
                    <div class="partner-name">${partner.companyName}</div>
                    ${partner.logo ? `<div style="font-size: 12px;">Logo: ${partner.logo}</div>` : ''}
                </div>
            ` : ''}
            <div class="title">Teklif Talebi #${quoteRequest.id}</div>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">Müşteri Bilgileri</div>
                <div class="info-row">
                    <div class="info-label">Ad Soyad:</div>
                    <div class="info-value">${quoteRequest.fullName || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">E-posta:</div>
                    <div class="info-value">${quoteRequest.email || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Telefon:</div>
                    <div class="info-value">${quoteRequest.phone || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Şirket:</div>
                    <div class="info-value">${quoteRequest.companyName || 'Belirtilmemiş'}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Hizmet Detayları</div>
                <div class="info-row">
                    <div class="info-label">İhtiyaç Duyulan Hizmet:</div>
                </div>
                <div class="service-content">
                    ${(quoteRequest.serviceNeeded || 'Belirtilmemiş').replace(/\n/g, '<br>')}
                </div>
                <div class="info-row">
                    <div class="info-label">Bütçe:</div>
                    <div class="info-value">${quoteRequest.budget || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Durum:</div>
                    <div class="info-value">${getStatusText(quoteRequest.status || 'pending')}</div>
                </div>
            </div>

            ${quoteRequest.workingStyle ? `
            <div class="section">
                <div class="section-title">Çalışma Şekli</div>
                <div class="service-content">
                    ${quoteRequest.workingStyle}
                </div>    
            </div>
            ` : ''}

            ${quoteRequest.additionalNotes ? `
            <div class="section">
                <div class="section-title">Müşteri Notları</div>
                <div class="service-content">
                    ${quoteRequest.additionalNotes}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <div class="section-title">Talep Bilgileri</div>
                <div class="info-row">
                    <div class="info-label">Talep Tarihi:</div>
                    <div class="info-value">${quoteRequest.createdAt ? new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Son Güncelleme:</div>
                    <div class="info-value">${quoteRequest.updatedAt ? new Date(quoteRequest.updatedAt).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <div style="width: 200px; height: 60px; background: url('https://partner.dip.tc/dip-logo.png') no-repeat center; background-size: contain; margin: 0 auto 10px auto;"></div>
            <div><strong>DİP - Digital İhracat Platformu</strong></div>
            <div>https://partner.dip.tc</div>
        </div>
    </body>
    </html>
    `;

    const options = {
      format: 'A4',
      border: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      },
      encoding: 'utf-8'
    };

    try {
      const file = { content: html };
      const pdfBuffer = await htmlPdf.generatePdf(file, options);
      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  static async generateQuoteResponsePDF(quoteResponse: any, quoteRequest: QuoteRequest, partner?: Partner): Promise<Buffer> {
    // Similar HTML generation for quote responses
    const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Teklif Yanıtı #${quoteResponse.id}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
            }
            
            .header {
                background-color: #6B7280;
                color: white;
                padding: 30px;
                text-align: center;
                margin-bottom: 30px;
            }
            
            .title {
                font-size: 24px;
                font-weight: bold;
            }
            
            .content {
                padding: 0 30px;
            }
            
            .section {
                margin-bottom: 30px;
            }
            
            .section-title {
                font-size: 16px;
                font-weight: bold;
                color: #374151;
                margin-bottom: 15px;
                border-bottom: 2px solid #E5E7EB;
                padding-bottom: 5px;
            }
            
            .info-row {
                display: flex;
                margin-bottom: 8px;
            }
            
            .info-label {
                font-weight: bold;
                width: 150px;
                color: #4B5563;
            }
            
            .info-value {
                flex: 1;
                color: #111827;
            }
            
            .footer {
                position: fixed;
                bottom: 30px;
                left: 0;
                right: 0;
                text-align: center;
                color: #6B7280;
                font-size: 12px;
                padding: 20px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">Teklif Yanıtı #${quoteResponse.id}</div>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">Teklif Detayları</div>
                <div class="info-row">
                    <div class="info-label">Başlık:</div>
                    <div class="info-value">${quoteResponse.title || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Açıklama:</div>
                    <div class="info-value">${quoteResponse.description || 'Belirtilmemiş'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Fiyat:</div>
                    <div class="info-value">${quoteResponse.price} ${quoteResponse.currency}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Teslimat Süresi:</div>
                    <div class="info-value">${quoteResponse.deliveryTime || 'Belirtilmemiş'}</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <div><strong>DİP - Digital İhracat Platformu</strong></div>
            <div>https://partner.dip.tc</div>
        </div>
    </body>
    </html>
    `;

    const options = {
      format: 'A4',
      border: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      },
      encoding: 'utf-8'
    };

    try {
      const file = { content: html };
      const pdfBuffer = await htmlPdf.generatePdf(file, options);
      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF');
    }
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