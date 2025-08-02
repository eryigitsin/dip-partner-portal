import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { QuoteRequest, Partner } from '../shared/schema';
import path from 'path';
import fs from 'fs';

interface PDFGeneratorOptions {
  quoteRequest: QuoteRequest;
  partner?: Partner;
  type: 'quote_request' | 'quote_response';
  quoteResponse?: any;
}

export class PDFGenerator {
  private doc: PDFKit.PDFDocument;

  constructor() {
    this.doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      autoFirstPage: true,
      bufferPages: true
    });
    
    this.setupFonts();
  }

  private setupFonts(): void {
    try {
      // DejaVu Sans Unicode destekli font kullan (Roboto yerine)
      const fontBasePath = path.join(__dirname, '../fonts');
      
      // Öncelikle DejaVu fontlarını dene
      const dejavuRegular = path.join(fontBasePath, 'DejaVuSans.ttf');
      const dejavuBold = path.join(fontBasePath, 'DejaVuSans-Bold.ttf');
      
      if (fs.existsSync(dejavuRegular)) {
        this.doc.registerFont('Turkish', dejavuRegular);
        this.doc.font('Turkish');
        console.log('DejaVu Regular font loaded');
      } else {
        // Roboto fontlarını dene
        const robotoRegular = path.join(fontBasePath, 'Roboto-Regular.ttf');
        if (fs.existsSync(robotoRegular)) {
          this.doc.registerFont('Turkish', robotoRegular);
          this.doc.font('Turkish');
          console.log('Roboto Regular font loaded');
        } else {
          console.warn('No custom fonts found, using Helvetica with encoding fixes');
          this.doc.font('Helvetica');
        }
      }
      
      if (fs.existsSync(dejavuBold)) {
        this.doc.registerFont('Turkish-Bold', dejavuBold);
      } else {
        const robotoBold = path.join(fontBasePath, 'Roboto-Bold.ttf');
        if (fs.existsSync(robotoBold)) {
          this.doc.registerFont('Turkish-Bold', robotoBold);
        }
      }
      
    } catch (error) {
      console.error('Font loading error:', error);
      this.doc.font('Helvetica'); // Fallback
    }
  }

  // Unicode karakterleri düzelt
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    // Unicode normalizasyon
    const normalized = text.normalize('NFC');
    
    // Türkçe karakter eşleştirmesi
    const turkishChars: { [key: string]: string } = {
      'Ã¼': 'ü',
      'Ã§': 'ç',
      'Ä±': 'ı',
      'Ä°': 'İ',
      'Ã¶': 'ö',
      'ÅŸ': 'ş',
      'Ä°': 'İ',
      'Ä±': 'ı',
      'Ã‡': 'Ç',
      'Ãœ': 'Ü',
      'Ã–': 'Ö',
      'ÅŽ': 'Ş',
      'Äž': 'Ğ',
      'ÄŸ': 'ğ'
    };
    
    let cleaned = normalized;
    Object.keys(turkishChars).forEach(key => {
      cleaned = cleaned.replace(new RegExp(key, 'g'), turkishChars[key]);
    });
    
    return cleaned;
  }

  // Text ekleme metodunu override et
  private addText(text: string, x: number, y: number, options?: any): void {
    const cleanText = this.sanitizeText(text);
    this.doc.text(cleanText, x, y, options);
  }

  async generateQuoteRequestPDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner } = options;
    
    // UTF-8 encoding ile header ayarla
    const filename = `Teklif_Talebi_${quoteRequest.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    // Pipe PDF to response
    this.doc.pipe(res);
    
    // Add header with gray background
    this.addHeader(quoteRequest, partner);
    
    // Add customer information
    this.addCustomerSection(quoteRequest);
    
    // Add service details
    this.addServiceSection(quoteRequest);
    
    // Add customer message if exists
    if (quoteRequest.message) {
      this.addMessageSection(quoteRequest.message);
    }
    
    // Add request information
    this.addRequestInfoSection(quoteRequest);
    
    // Add footer at bottom
    this.addFooterAtBottom();
    
    // Finalize PDF
    this.doc.end();
  }

  async generateQuoteResponsePDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner, quoteResponse } = options;
    
    // UTF-8 encoding ile header ayarla
    const filename = `Teklif_${quoteResponse.id}_${partner?.companyName || 'Partner'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    // Pipe PDF to response
    this.doc.pipe(res);
    
    // Add header
    this.addQuoteResponseHeader(quoteResponse, partner);
    
    // Add quote details
    this.addQuoteResponseDetails(quoteResponse, quoteRequest);
    
    // Add items table
    this.addQuoteItemsTable(quoteResponse.items);
    
    // Add totals
    this.addQuoteTotals(quoteResponse);
    
    // Add terms and conditions
    this.addTermsAndConditions(quoteResponse);
    
    // Add footer at bottom
    this.addFooterAtBottom();
    
    // Finalize PDF
    this.doc.end();
  }

  private addHeader(quoteRequest: QuoteRequest, partner?: Partner): void {
    // Font ayarla
    this.setFont('Turkish');
    
    // Add date in top right corner
    this.doc.fillColor('black')
      .fontSize(10);
    this.addText(new Date().toLocaleDateString('tr-TR'), this.doc.page.width - 100, 30);
    
    // Add partner company name centered at top
    if (partner) {
      this.doc.fontSize(18);
      this.addText(this.sanitizeText(partner.companyName).toUpperCase(), 50, 80);
    }
    
    // Add quote request date
    const requestDate = quoteRequest.createdAt ? 
      new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR') : 
      new Date().toLocaleDateString('tr-TR');
    this.doc.fontSize(14);
    this.addText(requestDate, 50, 120);
    
    // Add main title
    this.doc.fontSize(16);
    this.addText(`TEKLİF TALEBİ #${quoteRequest.id}`, 50, 160);
    
    // Reset position for content
    this.doc.y = 220;
  }

  private addQuoteResponseHeader(quoteResponse: any, partner?: Partner): void {
    const headerHeight = 100;
    
    // Blue header for quote responses
    this.doc.rect(0, 0, this.doc.page.width, headerHeight)
      .fill('#2563eb');
    
    this.setFont('Turkish-Bold');
    
    this.doc.fillColor('white')
      .fontSize(18);
    this.addText(this.sanitizeText(partner?.companyName || 'Teklif'), 50, 25);
    
    this.doc.fontSize(20);
    this.addText(this.sanitizeText(quoteResponse.title), 50, 55);
    
    this.doc.y = headerHeight + 20;
    this.doc.fillColor('black');
    
    this.setFont('Turkish');
  }

  private addCustomerSection(quoteRequest: QuoteRequest): void {
    this.checkPageSpace(150);
    
    this.setFont('Turkish');
    
    // Customer information in a more formal layout
    this.doc.fontSize(12);
    this.addText('MÜŞTERİ BİLGİLERİ', 50, this.doc.y);
    
    this.doc.y += 30;
    
    const customerInfo = [
      { label: 'Ad Soyad:', value: this.sanitizeText(quoteRequest.fullName || 'Belirtilmemiş') },
      { label: 'E-posta:', value: this.sanitizeText(quoteRequest.email || 'Belirtilmemiş') },
      { label: 'Telefon:', value: this.sanitizeText(quoteRequest.phone || 'Belirtilmemiş') },
      { label: 'Şirket:', value: this.sanitizeText(quoteRequest.companyName || 'Belirtilmemiş') }
    ];
    
    customerInfo.forEach(info => {
      this.doc.fontSize(11);
      this.addText(`${info.label} ${info.value}`, 70, this.doc.y);
      this.doc.y += 20;
    });
    
    this.doc.y += 20;
  }

  private addServiceSection(quoteRequest: QuoteRequest): void {
    this.checkPageSpace(150);
    
    this.setFont('Turkish');
    
    // Service details with bullet points
    this.doc.fontSize(12);
    this.addText('HİZMET DETAYLARI', 50, this.doc.y);
    
    this.doc.y += 30;
    
    const serviceNeeded = this.sanitizeText(quoteRequest.serviceNeeded || '');
    const lines = serviceNeeded.split('\n').filter(line => line.trim());
    const mainService = lines.find(line => !line.includes('Çalışma Şekli:')) || serviceNeeded;
    
    // Display main service with bullet point
    this.doc.fontSize(11);
    this.addText(`• ${mainService}`, 70, this.doc.y);
    this.doc.y += 25;
    
    // Budget information
    if (quoteRequest.budget && quoteRequest.budget !== 'Belirtilmemiş') {
      this.addText(`• Bütçe: ${this.sanitizeText(quoteRequest.budget)}`, 70, this.doc.y);
      this.doc.y += 25;
    }
    
    this.doc.y += 20;
  }

  private addMessageSection(message: string): void {
    const cleanMessage = this.sanitizeText(message);
    const messageHeight = this.doc.heightOfString(cleanMessage, { width: 450 }) + 60;
    this.checkPageSpace(messageHeight);
    
    this.setFont('Turkish');
    
    this.doc.fontSize(12);
    this.addText('MÜŞTERİ MESAJI', 50, this.doc.y);
    
    this.doc.y += 30;
    
    this.doc.fontSize(11);
    this.addText(cleanMessage, 70, this.doc.y);
    
    this.doc.y += 30;
  }

  private addRequestInfoSection(quoteRequest: QuoteRequest): void {
    this.checkPageSpace(80);
    this.addSectionTitle('Talep Bilgileri');
    
    const requestInfo = [
      { 
        label: 'Talep Tarihi:', 
        value: quoteRequest.createdAt ? new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR') : 'Belirtilmemiş'
      },
      { 
        label: 'Son Güncelleme:', 
        value: quoteRequest.updatedAt ? new Date(quoteRequest.updatedAt).toLocaleDateString('tr-TR') : 'Belirtilmemiş'
      }
    ];
    
    requestInfo.forEach(info => {
      this.doc.fontSize(10);
      this.addText(`${info.label} ${info.value}`, 50, this.doc.y);
      this.doc.y += 18;
    });
  }

  private addQuoteResponseDetails(quoteResponse: any, quoteRequest: QuoteRequest): void {
    this.checkPageSpace(120);
    this.addSectionTitle('Teklif Detayları');
    
    const details = [
      { label: 'Müşteri:', value: this.sanitizeText(quoteRequest.fullName || 'Belirtilmemiş') },
      { label: 'Teklif No:', value: this.sanitizeText(quoteResponse.quoteNumber || 'Belirtilmemiş') },
      { label: 'Geçerlilik Tarihi:', value: new Date(quoteResponse.validUntil).toLocaleDateString('tr-TR') },
      { label: 'Teslimat Süresi:', value: this.sanitizeText(quoteResponse.deliveryTime || 'Belirtilmemiş') }
    ];
    
    details.forEach(detail => {
      this.doc.fontSize(10);
      this.addText(`${detail.label} ${detail.value}`, 50, this.doc.y);
      this.doc.y += 18;
    });
    
    this.doc.y += 15;
  }

  private addQuoteItemsTable(items: any[]): void {
    const tableHeight = 40 + (items.length * 30);
    this.checkPageSpace(tableHeight);
    
    this.addSectionTitle('Hizmet Kalemleri');
    
    // Table headers
    const tableTop = this.doc.y;
    const tableHeaders = ['Hizmet', 'Miktar', 'Birim Fiyat', 'Toplam'];
    const columnWidths = [250, 60, 90, 90];
    let x = 50;
    
    tableHeaders.forEach((header, i) => {
      this.doc.fontSize(9);
      this.addText(header, x, tableTop);
      x += columnWidths[i];
    });
    
    this.doc.y = tableTop + 20;
    
    // Table rows
    items.forEach(item => {
      const rowY = this.doc.y;
      x = 50;
      
      const rowData = [
        this.sanitizeText(item.description),
        item.quantity.toString(),
        `${item.unitPrice.toFixed(2)} TL`,
        `${item.total.toFixed(2)} TL`
      ];
      
      rowData.forEach((data, i) => {
        this.doc.fontSize(9);
        this.addText(data, x, rowY);
        x += columnWidths[i];
      });
      
      this.doc.y = rowY + 25;
    });
    
    this.doc.y += 15;
  }

  private addQuoteTotals(quoteResponse: any): void {
    this.checkPageSpace(80);
    
    const totalsX = 350;
    
    const totals = [
      { label: 'Ara Toplam:', value: `${(quoteResponse.subtotal / 100).toFixed(2)} TL` },
      { label: `KDV (%${quoteResponse.taxRate || 20}):`, value: `${(quoteResponse.taxAmount / 100).toFixed(2)} TL` },
      { label: 'Genel Toplam:', value: `${(quoteResponse.totalAmount / 100).toFixed(2)} TL`, bold: true }
    ];
    
    totals.forEach(total => {
      this.doc.fontSize(10);
      this.addText(total.label, totalsX, this.doc.y);
      this.addText(total.value, totalsX + 110, this.doc.y);
      this.doc.y += 20;
    });
    
    this.doc.y += 15;
  }

  private addTermsAndConditions(quoteResponse: any): void {
    const termsText = this.getTermsText(quoteResponse);
    const cleanTerms = this.sanitizeText(termsText);
    const termsHeight = this.doc.heightOfString(cleanTerms, { width: 480 }) + 40;
    this.checkPageSpace(termsHeight);
    
    this.addSectionTitle('Şartlar ve Koşullar');
    
    this.doc.fontSize(9);
    this.addText(cleanTerms, 50, this.doc.y);
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

  private addSectionTitle(title: string): void {
    this.setFont('Turkish-Bold');
    this.doc.fillColor('black')
      .fontSize(12);
    this.addText(title, 50, this.doc.y);
    
    this.setFont('Turkish');
    this.doc.y += 30;
  }

  private addFooterAtBottom(): void {
    const footerY = this.doc.page.height - 100;
    
    this.setFont('Turkish');
    
    // Add closing section similar to the template
    this.doc.fillColor('black')
      .fontSize(11);
    this.addText('Saygılarımla,', this.doc.page.width - 150, footerY);
    
    this.doc.fontSize(11);
    this.addText('DİP Ekibi', this.doc.page.width - 150, footerY + 20);
    
    this.doc.fontSize(10);
    this.addText('Dijital İhracat Platformu', this.doc.page.width - 150, footerY + 35);
    
    // Add website at the bottom
    this.doc.fontSize(9);
    this.addText('https://partner.dip.tc', 50, this.doc.page.height - 30);
  }

  private checkPageSpace(requiredSpace: number): void {
    if (this.doc.y + requiredSpace > this.doc.page.height - 100) {
      this.doc.addPage();
    }
  }

  private setFont(fontName: 'Turkish' | 'Turkish-Bold' = 'Turkish'): void {
    try {
      this.doc.font(fontName);
    } catch (e) {
      // Fallback to Helvetica if custom font fails
      if (fontName.includes('Bold')) {
        this.doc.font('Helvetica-Bold');
      } else {
        this.doc.font('Helvetica');
      }
    }
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Beklemede',
      'responded': 'Yanıtlandı',
      'quote_sent': 'Teklif Gönderildi',
      'accepted': 'Kabul Edildi',
      'rejected': 'Reddedildi',
      'completed': 'Tamamlandı'
    };
    
    return statusMap[status] || 'Bilinmiyor';
  }
}

export const pdfGenerator = new PDFGenerator();