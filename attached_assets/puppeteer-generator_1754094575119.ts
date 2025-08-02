import puppeteer from 'puppeteer';
import { Response } from 'express';
import { QuoteRequest, Partner } from '../shared/schema';

interface PDFGeneratorOptions {
  quoteRequest: QuoteRequest;
  partner?: Partner;
  type: 'quote_request' | 'quote_response';
  quoteResponse?: any;
}

export class PuppeteerPDFGenerator {
  
  async generateQuoteRequestPDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner } = options;
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // HTML içeriği oluştur
      const html = this.generateQuoteRequestHTML(quoteRequest, partner);
      
      // HTML'i yükle
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // PDF oluştur
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      // Response headers ayarla
      const filename = `Teklif_Talebi_${quoteRequest.id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      
      // PDF'i gönder
      res.send(pdf);
      
    } finally {
      await browser.close();
    }
  }

  async generateQuoteResponsePDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner, quoteResponse } = options;
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // HTML içeriği oluştur
      const html = this.generateQuoteResponseHTML(quoteResponse, quoteRequest, partner);
      
      // HTML'i yükle
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // PDF oluştur
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      // Response headers ayarla
      const filename = `Teklif_${quoteResponse.id}_${partner?.companyName || 'Partner'}.pdf`;
      res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      
      // PDF'i gönder
      res.send(pdf);
      
    } finally {
      await browser.close();
    }
  }

  private generateQuoteRequestHTML(quoteRequest: QuoteRequest, partner?: Partner): string {
    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Teklif Talebi</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Noto Sans', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: #333;
          background: white;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
        }
        
        .date {
          text-align: right;
          font-size: 10px;
          margin-bottom: 20px;
        }
        
        .company-name {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        
        .title {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin: 10px 0;
        }
        
        .section {
          margin-bottom: 25px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .info-item {
          display: flex;
          margin-bottom: 8px;
        }
        
        .info-label {
          font-weight: 600;
          min-width: 120px;
          color: #374151;
        }
        
        .info-value {
          color: #6b7280;
        }
        
        .service-list {
          list-style-type: disc;
          padding-left: 20px;
        }
        
        .service-list li {
          margin-bottom: 8px;
        }
        
        .message-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 15px;
          margin: 15px 0;
        }
        
        .footer {
          position: fixed;
          bottom: 20px;
          right: 20px;
          text-align: right;
          font-size: 11px;
          color: #6b7280;
        }
        
        .footer .signature {
          margin-top: 10px;
          font-weight: 600;
        }
        
        .website {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #9ca3af;
        }
        
        @page {
          margin: 20mm 15mm;
        }
      </style>
    </head>
    <body>
      <div class="date">
        ${new Date().toLocaleDateString('tr-TR')}
      </div>
      
      <div class="header">
        ${partner ? `<div class="company-name">${partner.companyName}</div>` : ''}
        <div class="title">TEKLİF TALEBİ #${quoteRequest.id}</div>
        <div style="font-size: 12px; color: #6b7280;">
          ${quoteRequest.createdAt ? new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR')}
        </div>
      </div>

      <div class="section">
        <div class="section-title">MÜŞTERİ BİLGİLERİ</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Ad Soyad:</span>
            <span class="info-value">${quoteRequest.fullName || 'Belirtilmemiş'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">E-posta:</span>
            <span class="info-value">${quoteRequest.email || 'Belirtilmemiş'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Telefon:</span>
            <span class="info-value">${quoteRequest.phone || 'Belirtilmemiş'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Şirket:</span>
            <span class="info-value">${quoteRequest.companyName || 'Belirtilmemiş'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">HİZMET DETAYLARI</div>
        <ul class="service-list">
          <li>${quoteRequest.serviceNeeded || 'Belirtilmemiş'}</li>
          ${quoteRequest.budget && quoteRequest.budget !== 'Belirtilmemiş' ? `<li>Bütçe: ${quoteRequest.budget}</li>` : ''}
        </ul>
      </div>

      ${quoteRequest.message ? `
        <div class="section">
          <div class="section-title">MÜŞTERİ MESAJI</div>
          <div class="message-box">
            ${quoteRequest.message.replace(/\n/g, '<br>')}
          </div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Talep Bilgileri</div>
        <div class="info-item">
          <span class="info-label">Talep Tarihi:</span>
          <span class="info-value">${quoteRequest.createdAt ? new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Son Güncelleme:</span>
          <span class="info-value">${quoteRequest.updatedAt ? new Date(quoteRequest.updatedAt).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</span>
        </div>
      </div>

      <div class="footer">
        <div>Saygılarımla,</div>
        <div class="signature">DİP Ekibi</div>
        <div>Dijital İhracat Platformu</div>
      </div>

      <div class="website">
        https://partner.dip.tc
      </div>
    </body>
    </html>
    `;
  }

  private generateQuoteResponseHTML(quoteResponse: any, quoteRequest: QuoteRequest, partner?: Partner): string {
    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Teklif</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Noto Sans', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: #333;
          background: white;
        }
        
        .header {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: white;
          padding: 30px 20px;
          text-align: center;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 24px;
          margin-bottom: 5px;
        }
        
        .header h2 {
          font-size: 18px;
          font-weight: 400;
          opacity: 0.9;
        }
        
        .section {
          margin-bottom: 25px;
          padding: 0 20px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 8px;
          margin-bottom: 15px;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
        }
        
        .detail-label {
          font-weight: 600;
          color: #374151;
          font-size: 11px;
          margin-bottom: 4px;
        }
        
        .detail-value {
          color: #6b7280;
          font-size: 12px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .items-table th,
        .items-table td {
          border: 1px solid #e5e7eb;
          padding: 12px 8px;
          text-align: left;
        }
        
        .items-table th {
          background: #f9fafb;
          font-weight: 600;
          font-size: 11px;
        }
        
        .items-table td {
          font-size: 10px;
        }
        
        .items-table .text-right {
          text-align: right;
        }
        
        .totals {
          margin-top: 20px;
          border-top: 2px solid #e5e7eb;
          padding-top: 15px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 0 20px;
        }
        
        .total-row.final {
          font-weight: 700;
          font-size: 14px;
          border-top: 1px solid #d1d5db;
          padding-top: 8px;
          margin-top: 8px;
        }
        
        .terms {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          font-size: 10px;
          line-height: 1.5;
        }
        
        .footer {
          position: fixed;
          bottom: 20px;
          right: 20px;
          text-align: right;
          font-size: 11px;
          color: #6b7280;
        }
        
        .footer .signature {
          margin-top: 10px;
          font-weight: 600;
        }
        
        .website {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #9ca3af;
        }
        
        @page {
          margin: 0;
        }
        
        @media print {
          .header {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${partner?.companyName || 'Teklif'}</h1>
        <h2>${quoteResponse.title}</h2>
      </div>

      <div class="section">
        <div class="section-title">Teklif Detayları</div>
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Müşteri</span>
            <span class="detail-value">${quoteRequest.fullName || 'Belirtilmemiş'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Teklif No</span>
            <span class="detail-value">${quoteResponse.quoteNumber || 'Belirtilmemiş'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Geçerlilik Tarihi</span>
            <span class="detail-value">${new Date(quoteResponse.validUntil).toLocaleDateString('tr-TR')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Teslimat Süresi</span>
            <span class="detail-value">${quoteResponse.deliveryTime || 'Belirtilmemiş'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Hizmet Kalemleri</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Hizmet</th>
              <th>Miktar</th>
              <th class="text-right">Birim Fiyat</th>
              <th class="text-right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            ${quoteResponse.items.map((item: any) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td class="text-right">${item.unitPrice.toFixed(2)} TL</td>
                <td class="text-right">${item.total.toFixed(2)} TL</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Ara Toplam:</span>
          <span>${(quoteResponse.subtotal / 100).toFixed(2)} TL</span>
        </div>
        <div class="total-row">
          <span>KDV (%${quoteResponse.taxRate || 20}):</span>
          <span>${(quoteResponse.taxAmount / 100).toFixed(2)} TL</span>
        </div>
        <div class="total-row final">
          <span>Genel Toplam:</span>
          <span>${(quoteResponse.totalAmount / 100).toFixed(2)} TL</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Şartlar ve Koşullar</div>
        <div class="terms">
          ${this.getTermsText(quoteResponse).replace(/\n/g, '<br>')}
        </div>
      </div>

      <div class="footer">
        <div>Saygılarımla,</div>
        <div class="signature">DİP Ekibi</div>
        <div>Dijital İhracat Platformu</div>
      </div>

      <div class="website">
        https://partner.dip.tc
      </div>
    </body>
    </html>
    `;
  }

  private getTermsText(quoteResponse: any): string {
    const workStyleMatch = quoteResponse.description?.match(/Çalışma Şekli:\s*(.+)/);
    const workStyle = workStyleMatch ? workStyleMatch[1] : null;
    
    let terms = quoteResponse.notes || '';
    if (workStyle) {
      terms = workStyle + (terms ? '\n\n' + terms : '');
    }
    
    if (!terms) {
      terms = 'Ödeme koşulları: ' + (quoteResponse.paymentTerms || 'Belirtilmemiş');
    }
    
    return terms;
  }
}

export const puppeteerPDFGenerator = new PuppeteerPDFGenerator();