import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { QuoteRequest, Partner } from '../shared/schema';

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
      margin: 50,
      size: 'A4'
    });
  }

  async generateQuoteRequestPDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner } = options;
    
    // Set response headers for PDF download
    const filename = `Teklif_Talebi_${quoteRequest.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
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
    
    // Add footer
    this.addFooter();
    
    // Finalize PDF
    this.doc.end();
  }

  async generateQuoteResponsePDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner, quoteResponse } = options;
    
    // Set response headers for PDF download
    const filename = `Teklif_${quoteResponse.id}_${partner?.companyName || 'Partner'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
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
    
    // Add footer
    this.addFooter();
    
    // Finalize PDF
    this.doc.end();
  }

  private addHeader(quoteRequest: QuoteRequest, partner?: Partner): void {
    // Gray header background
    this.doc.rect(0, 0, this.doc.page.width, 120)
      .fill('#6b7280');
    
    // Reset text color to white
    this.doc.fillColor('white');
    
    // Add partner logo and name if available
    if (partner) {
      this.doc.fontSize(18)
        .text(partner.companyName, 60, 30, { align: 'left' });
      
      this.doc.fontSize(24)
        .text(`Teklif Talebi #${quoteRequest.id}`, 60, 60, { align: 'left' });
    } else {
      this.doc.fontSize(20)
        .text('DİP - Dijital İhracat Platformu', 60, 30, { align: 'center', width: this.doc.page.width - 120 });
      
      this.doc.fontSize(24)
        .text(`Teklif Talebi #${quoteRequest.id}`, 60, 70, { align: 'center', width: this.doc.page.width - 120 });
    }
    
    // Reset position and color for content
    this.doc.y = 150;
    this.doc.fillColor('black');
  }

  private addQuoteResponseHeader(quoteResponse: any, partner?: Partner): void {
    // Blue header for quote responses
    this.doc.rect(0, 0, this.doc.page.width, 120)
      .fill('#2563eb');
    
    this.doc.fillColor('white')
      .fontSize(20)
      .text(partner?.companyName || 'Teklif', 60, 30, { align: 'center', width: this.doc.page.width - 120 });
    
    this.doc.fontSize(24)
      .text(quoteResponse.title, 60, 70, { align: 'center', width: this.doc.page.width - 120 });
    
    this.doc.y = 150;
    this.doc.fillColor('black');
  }

  private addCustomerSection(quoteRequest: QuoteRequest): void {
    this.addSectionTitle('Müşteri Bilgileri');
    
    const customerInfo = [
      { label: 'Ad Soyad:', value: quoteRequest.fullName || 'Belirtilmemiş' },
      { label: 'E-posta:', value: quoteRequest.email || 'Belirtilmemiş' },
      { label: 'Telefon:', value: quoteRequest.phone || 'Belirtilmemiş' },
      { label: 'Şirket:', value: quoteRequest.companyName || 'Belirtilmemiş' }
    ];
    
    customerInfo.forEach(info => {
      this.doc.fontSize(11)
        .font('Helvetica-Bold')
        .text(info.label, 60, this.doc.y, { continued: true })
        .font('Helvetica')
        .text(` ${info.value}`);
      this.doc.y += 15;
    });
    
    this.doc.y += 10;
  }

  private addServiceSection(quoteRequest: QuoteRequest): void {
    this.addSectionTitle('Hizmet Detayları');
    
    // Parse service details to separate main service from work style
    const serviceNeeded = quoteRequest.serviceNeeded || '';
    const lines = serviceNeeded.split('\n').filter(line => line.trim());
    const mainService = lines.find(line => !line.includes('Çalışma Şekli:')) || serviceNeeded;
    
    const serviceInfo = [
      { label: 'İhtiyaç Duyulan Hizmet:', value: mainService },
      { label: 'Bütçe:', value: quoteRequest.budget || 'Belirtilmemiş' },
      { label: 'Durum:', value: this.getStatusText(quoteRequest.status || 'pending') }
    ];
    
    serviceInfo.forEach(info => {
      this.doc.fontSize(11)
        .font('Helvetica-Bold')
        .text(info.label, 60, this.doc.y, { continued: true })
        .font('Helvetica')
        .text(` ${info.value}`, { width: 450 });
      this.doc.y += 15;
    });
    
    this.doc.y += 10;
  }

  private addMessageSection(message: string): void {
    this.addSectionTitle('Müşteri Mesajı');
    
    this.doc.fontSize(11)
      .font('Helvetica')
      .text(message, 60, this.doc.y, { width: 450 });
    
    this.doc.y += 20;
  }

  private addRequestInfoSection(quoteRequest: QuoteRequest): void {
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
      this.doc.fontSize(11)
        .font('Helvetica-Bold')
        .text(info.label, 60, this.doc.y, { continued: true })
        .font('Helvetica')
        .text(` ${info.value}`);
      this.doc.y += 15;
    });
  }

  private addQuoteResponseDetails(quoteResponse: any, quoteRequest: QuoteRequest): void {
    this.addSectionTitle('Teklif Detayları');
    
    const details = [
      { label: 'Müşteri:', value: quoteRequest.fullName || 'Belirtilmemiş' },
      { label: 'Teklif No:', value: quoteResponse.quoteNumber || 'Belirtilmemiş' },
      { label: 'Geçerlilik Tarihi:', value: new Date(quoteResponse.validUntil).toLocaleDateString('tr-TR') },
      { label: 'Teslimat Süresi:', value: quoteResponse.deliveryTime || 'Belirtilmemiş' }
    ];
    
    details.forEach(detail => {
      this.doc.fontSize(11)
        .font('Helvetica-Bold')
        .text(detail.label, 60, this.doc.y, { continued: true })
        .font('Helvetica')
        .text(` ${detail.value}`);
      this.doc.y += 15;
    });
    
    this.doc.y += 10;
  }

  private addQuoteItemsTable(items: any[]): void {
    this.addSectionTitle('Hizmet Kalemleri');
    
    // Table headers
    const tableTop = this.doc.y;
    const tableHeaders = ['Hizmet', 'Miktar', 'Birim Fiyat', 'Toplam'];
    const columnWidths = [250, 80, 100, 100];
    let x = 60;
    
    tableHeaders.forEach((header, i) => {
      this.doc.fontSize(10)
        .font('Helvetica-Bold')
        .text(header, x, tableTop, { width: columnWidths[i] });
      x += columnWidths[i];
    });
    
    this.doc.y = tableTop + 20;
    
    // Table rows
    items.forEach(item => {
      const rowY = this.doc.y;
      x = 60;
      
      const rowData = [
        item.description,
        item.quantity.toString(),
        `${item.unitPrice.toFixed(2)} TL`,
        `${item.total.toFixed(2)} TL`
      ];
      
      rowData.forEach((data, i) => {
        this.doc.fontSize(10)
          .font('Helvetica')
          .text(data, x, rowY, { width: columnWidths[i] });
        x += columnWidths[i];
      });
      
      this.doc.y = rowY + 25;
    });
    
    this.doc.y += 10;
  }

  private addQuoteTotals(quoteResponse: any): void {
    const totalsX = 350;
    const labelWidth = 100;
    const valueWidth = 100;
    
    const totals = [
      { label: 'Ara Toplam:', value: `${(quoteResponse.subtotal / 100).toFixed(2)} TL` },
      { label: `KDV (%${quoteResponse.taxRate || 20}):`, value: `${(quoteResponse.taxAmount / 100).toFixed(2)} TL` },
      { label: 'Genel Toplam:', value: `${(quoteResponse.totalAmount / 100).toFixed(2)} TL`, bold: true }
    ];
    
    totals.forEach(total => {
      this.doc.fontSize(11)
        .font(total.bold ? 'Helvetica-Bold' : 'Helvetica-Bold')
        .text(total.label, totalsX, this.doc.y, { width: labelWidth, align: 'right' })
        .font(total.bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(total.value, totalsX + labelWidth + 10, this.doc.y, { width: valueWidth, align: 'right' });
      this.doc.y += 20;
    });
    
    this.doc.y += 10;
  }

  private addTermsAndConditions(quoteResponse: any): void {
    this.addSectionTitle('Şartlar ve Koşullar');
    
    // Extract work style from service details if it exists
    const workStyleMatch = quoteResponse.description?.match(/Çalışma Şekli:\s*(.+)/);
    const workStyle = workStyleMatch ? workStyleMatch[1] : null;
    
    let terms = quoteResponse.notes || '';
    if (workStyle) {
      terms = workStyle + (terms ? '\n\n' + terms : '');
    }
    
    if (!terms) {
      terms = 'Ödeme koşulları: ' + (quoteResponse.paymentTerms || 'Belirtilmemiş');
    }
    
    this.doc.fontSize(10)
      .font('Helvetica')
      .text(terms, 60, this.doc.y, { width: 450 });
  }

  private addSectionTitle(title: string): void {
    this.doc.rect(50, this.doc.y - 5, this.doc.page.width - 100, 25)
      .fill('#f3f4f6');
    
    this.doc.fillColor('black')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(title, 60, this.doc.y, { align: 'left' });
    
    this.doc.y += 25;
  }

  private addFooter(): void {
    const footerY = this.doc.page.height - 80;
    
    // Footer background
    this.doc.rect(0, footerY, this.doc.page.width, 80)
      .fill('#ffffff')
      .stroke('#e5e7eb');
    
    // DİP Logo text (since we can't easily embed the image)
    this.doc.fillColor('#6b7280')
      .fontSize(10)
      .font('Helvetica')
      .text('DİP - Dijital İhracat Platformu', 60, footerY + 20, { align: 'center', width: this.doc.page.width - 120 })
      .text('https://partner.dip.tc', 60, footerY + 35, { align: 'center', width: this.doc.page.width - 120 });
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