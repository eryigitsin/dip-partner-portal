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
  }

  async generateQuoteRequestPDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner } = options;
    
    // Set response headers for PDF download with UTF-8 encoding
    const filename = `Teklif_Talebi_${quoteRequest.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
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
    
    // Set response headers for PDF download with UTF-8 encoding
    const filename = `Teklif_${quoteResponse.id}_${partner?.companyName || 'Partner'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
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
    // Add date in top right corner
    this.doc.fillColor('black')
      .fontSize(10)
      .text(new Date().toLocaleDateString('tr-TR'), this.doc.page.width - 100, 30, { align: 'right' });
    
    // Add partner company name centered at top
    if (partner) {
      this.doc.fontSize(18)
        .text(partner.companyName.toUpperCase(), 50, 80, { 
          align: 'center', 
          width: this.doc.page.width - 100 
        });
    }
    
    // Add quote request date
    const requestDate = quoteRequest.createdAt ? new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');
    this.doc.fontSize(14)
      .text(requestDate, 50, 120, { 
        align: 'center', 
        width: this.doc.page.width - 100 
      });
    
    // Add main title
    this.doc.fontSize(16)
      .text(`TEKLİF TALEBİ #${quoteRequest.id}`, 50, 160, { 
        align: 'center', 
        width: this.doc.page.width - 100 
      });
    
    // Reset position for content
    this.doc.y = 220;
  }

  private addQuoteResponseHeader(quoteResponse: any, partner?: Partner): void {
    const headerHeight = 100;
    
    // Blue header for quote responses
    this.doc.rect(0, 0, this.doc.page.width, headerHeight)
      .fill('#2563eb');
    
    this.doc.fillColor('white')
      .fontSize(18)
      .text(partner?.companyName || 'Teklif', 50, 25, { 
        align: 'center', 
        width: this.doc.page.width - 100 
      });
    
    this.doc.fontSize(20)
      .text(quoteResponse.title, 50, 55, { 
        align: 'center', 
        width: this.doc.page.width - 100 
      });
    
    this.doc.y = headerHeight + 20;
    this.doc.fillColor('black');
  }

  private addCustomerSection(quoteRequest: QuoteRequest): void {
    this.checkPageSpace(150);
    
    // Customer information in a more formal layout
    this.doc.fontSize(12)
      .text('MÜŞTERİ BİLGİLERİ', 50, this.doc.y, { 
        align: 'left',
        underline: true 
      });
    
    this.doc.y += 30;
    
    const customerInfo = [
      { label: 'Ad Soyad:', value: quoteRequest.fullName || 'Belirtilmemiş' },
      { label: 'E-posta:', value: quoteRequest.email || 'Belirtilmemiş' },
      { label: 'Telefon:', value: quoteRequest.phone || 'Belirtilmemiş' },
      { label: 'Şirket:', value: quoteRequest.companyName || 'Belirtilmemiş' }
    ];
    
    customerInfo.forEach(info => {
      this.doc.fontSize(11)
        .text(`${info.label} ${info.value}`, 70, this.doc.y);
      this.doc.y += 20;
    });
    
    this.doc.y += 20;
  }

  private addServiceSection(quoteRequest: QuoteRequest): void {
    this.checkPageSpace(150);
    
    // Service details with bullet points
    this.doc.fontSize(12)
      .text('HİZMET DETAYLARI', 50, this.doc.y, { 
        align: 'left',
        underline: true 
      });
    
    this.doc.y += 30;
    
    const serviceNeeded = quoteRequest.serviceNeeded || '';
    const lines = serviceNeeded.split('\n').filter(line => line.trim());
    const mainService = lines.find(line => !line.includes('Çalışma Şekli:')) || serviceNeeded;
    
    // Display main service with bullet point
    this.doc.fontSize(11)
      .text(`• ${mainService}`, 70, this.doc.y, { width: 450 });
    this.doc.y += 25;
    
    // Budget information
    if (quoteRequest.budget && quoteRequest.budget !== 'Belirtilmemiş') {
      this.doc.text(`• Bütçe: ${quoteRequest.budget}`, 70, this.doc.y);
      this.doc.y += 25;
    }
    
    this.doc.y += 20;
  }

  private addMessageSection(message: string): void {
    const messageHeight = this.doc.heightOfString(message, { width: 450 }) + 60;
    this.checkPageSpace(messageHeight);
    
    this.doc.fontSize(12)
      .text('MÜŞTERİ MESAJI', 50, this.doc.y, { 
        align: 'left',
        underline: true 
      });
    
    this.doc.y += 30;
    
    this.doc.fontSize(11)
      .text(message, 70, this.doc.y, { width: 450 });
    
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
      this.doc.fontSize(10)
        .text(info.label, 50, this.doc.y, { continued: true })
        .text(` ${info.value}`);
      this.doc.y += 18;
    });
  }

  private addQuoteResponseDetails(quoteResponse: any, quoteRequest: QuoteRequest): void {
    this.checkPageSpace(120);
    this.addSectionTitle('Teklif Detayları');
    
    const details = [
      { label: 'Müşteri:', value: quoteRequest.fullName || 'Belirtilmemiş' },
      { label: 'Teklif No:', value: quoteResponse.quoteNumber || 'Belirtilmemiş' },
      { label: 'Geçerlilik Tarihi:', value: new Date(quoteResponse.validUntil).toLocaleDateString('tr-TR') },
      { label: 'Teslimat Süresi:', value: quoteResponse.deliveryTime || 'Belirtilmemiş' }
    ];
    
    details.forEach(detail => {
      this.doc.fontSize(10)
        .text(detail.label, 50, this.doc.y, { continued: true })
        .text(` ${detail.value}`);
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
      this.doc.fontSize(9)
        .text(header, x, tableTop, { width: columnWidths[i] });
      x += columnWidths[i];
    });
    
    this.doc.y = tableTop + 20;
    
    // Table rows
    items.forEach(item => {
      const rowY = this.doc.y;
      x = 50;
      
      const rowData = [
        item.description,
        item.quantity.toString(),
        `${item.unitPrice.toFixed(2)} TL`,
        `${item.total.toFixed(2)} TL`
      ];
      
      rowData.forEach((data, i) => {
        this.doc.fontSize(9)
          .text(data, x, rowY, { width: columnWidths[i] });
        x += columnWidths[i];
      });
      
      this.doc.y = rowY + 25;
    });
    
    this.doc.y += 15;
  }

  private addQuoteTotals(quoteResponse: any): void {
    this.checkPageSpace(80);
    
    const totalsX = 350;
    const labelWidth = 100;
    const valueWidth = 90;
    
    const totals = [
      { label: 'Ara Toplam:', value: `${(quoteResponse.subtotal / 100).toFixed(2)} TL` },
      { label: `KDV (%${quoteResponse.taxRate || 20}):`, value: `${(quoteResponse.taxAmount / 100).toFixed(2)} TL` },
      { label: 'Genel Toplam:', value: `${(quoteResponse.totalAmount / 100).toFixed(2)} TL`, bold: true }
    ];
    
    totals.forEach(total => {
      this.doc.fontSize(10)
        .text(total.label, totalsX, this.doc.y, { width: labelWidth, align: 'right' })
        .text(total.value, totalsX + labelWidth + 10, this.doc.y, { width: valueWidth, align: 'right' });
      this.doc.y += 20;
    });
    
    this.doc.y += 15;
  }

  private addTermsAndConditions(quoteResponse: any): void {
    const termsText = this.getTermsText(quoteResponse);
    const termsHeight = this.doc.heightOfString(termsText, { width: 480 }) + 40;
    this.checkPageSpace(termsHeight);
    
    this.addSectionTitle('Şartlar ve Koşullar');
    
    this.doc.fontSize(9)
      .text(termsText, 50, this.doc.y, { width: 480 });
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
    this.doc.fillColor('black')
      .fontSize(12)
      .text(title, 50, this.doc.y, { align: 'left', underline: true });
    
    this.doc.y += 30;
  }

  private addFooterAtBottom(): void {
    const footerY = this.doc.page.height - 100;
    
    // Add closing section similar to the template
    this.doc.fillColor('black')
      .fontSize(11)
      .text('Saygılarımla,', this.doc.page.width - 150, footerY, { align: 'right' });
    
    this.doc.fontSize(11)
      .text('DİP Ekibi', this.doc.page.width - 150, footerY + 20, { align: 'right' });
    
    this.doc.fontSize(10)
      .text('Dijital İhracat Platformu', this.doc.page.width - 150, footerY + 35, { align: 'right' });
    
    // Add website at the bottom
    this.doc.fontSize(9)
      .text('https://partner.dip.tc', 50, this.doc.page.height - 30, { 
        align: 'center', 
        width: this.doc.page.width - 100 
      });
  }

  private checkPageSpace(requiredSpace: number): void {
    if (this.doc.y + requiredSpace > this.doc.page.height - 100) {
      this.doc.addPage();
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