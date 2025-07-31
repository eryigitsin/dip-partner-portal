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
  private logoPath: string;

  constructor() {
    // Logo dosyasının yolu (assets klasörüne indirin)
    this.logoPath = path.join(__dirname, '../assets/dip-logo-beyaz.png');
    
    // Not: Önce Türkçe destekli bir font dosyası indirmeniz gerekiyor
    // Örnek: fonts/Roboto-Regular.ttf veya NotoSans-Regular.ttf
    this.doc = new PDFDocument({
      margin: 40, // Margin'i azalttım
      size: 'A4',
      autoFirstPage: true,
      bufferPages: true // Sayfa kontrolü için
    });
  }

  async generateQuoteRequestPDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner } = options;
    
    // Türkçe font dosyasını kaydet (fonts klasörüne Roboto veya benzeri bir font koyun)
    try {
      // Font dosyalarınızın yolunu belirtin
      const fontPath = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
      const fontBoldPath = path.join(__dirname, '../fonts/Roboto-Bold.ttf');
      
      // Fontları kaydet
      this.doc.registerFont('Turkish', fontPath);
      this.doc.registerFont('Turkish-Bold', fontBoldPath);
      
      // Varsayılan fontu ayarla
      this.doc.font('Turkish');
    } catch (error) {
      console.warn('Font yüklenemedi, varsayılan font kullanılacak:', error);
    }
    
    // Set response headers for PDF download
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
    
    // Footer'ı sayfa sonuna yerleştir
    this.addFooterAtBottom();
    
    // Finalize PDF
    this.doc.end();
  }

  async generateQuoteResponsePDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner, quoteResponse } = options;
    
    // Türkçe font ayarları
    try {
      const fontPath = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
      const fontBoldPath = path.join(__dirname, '../fonts/Roboto-Bold.ttf');
      
      this.doc.registerFont('Turkish', fontPath);
      this.doc.registerFont('Turkish-Bold', fontBoldPath);
      this.doc.font('Turkish');
    } catch (error) {
      console.warn('Font yüklenemedi:', error);
    }
    
    // Set response headers for PDF download
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
    
    // Footer'ı sayfa sonuna yerleştir
    this.addFooterAtBottom();
    
    // Finalize PDF
    this.doc.end();
  }

  private addHeader(quoteRequest: QuoteRequest, partner?: Partner): void {
    // Header yüksekliğini azalt
    const headerHeight = 100;
    
    // Gray header background
    this.doc.rect(0, 0, this.doc.page.width, headerHeight)
      .fill('#6b7280');
    
    // Reset text color to white
    this.doc.fillColor('white');
    
    // Add partner logo and name if available
    if (partner) {
      this.doc.fontSize(16)
        .font('Turkish-Bold')
        .text(partner.companyName, 50, 25, { align: 'left' });
      
      this.doc.fontSize(20)
        .font('Turkish-Bold')
        .text(`Teklif Talebi #${quoteRequest.id}`, 50, 50, { align: 'left' });
    } else {
      this.doc.fontSize(18)
        .font('Turkish-Bold')
        .text('DİP - Dijital İhracat Platformu', 50, 25, { 
          align: 'center', 
          width: this.doc.page.width - 100 
        });
      
      this.doc.fontSize(20)
        .font('Turkish-Bold')
        .text(`Teklif Talebi #${quoteRequest.id}`, 50, 55, { 
          align: 'center', 
          width: this.doc.page.width - 100 
        });
    }
    
    // Reset position and color for content
    this.doc.y = headerHeight + 20;
    this.doc.fillColor('black');
  }

  private addQuoteResponseHeader(quoteResponse: any, partner?: Partner): void {
    const headerHeight = 100;
    
    // Blue header for quote responses
    this.doc.rect(0, 0, this.doc.page.width, headerHeight)
      .fill('#2563eb');
    
    this.doc.fillColor('white')
      .fontSize(18)
      .font('Turkish-Bold')
      .text(partner?.companyName || 'Teklif', 50, 25, { 
        align: 'center', 
        width: this.doc.page.width - 100 
      });
    
    this.doc.fontSize(20)
      .font('Turkish-Bold')
      .text(quoteResponse.title, 50, 55, { 
        align: 'center', 
        width: this.doc.page.width - 100 
      });
    
    this.doc.y = headerHeight + 20;
    this.doc.fillColor('black');
  }

  private addCustomerSection(quoteRequest: QuoteRequest): void {
    this.checkPageSpace(150); // Bu bölüm için gereken alan
    this.addSectionTitle('Müşteri Bilgileri');
    
    const customerInfo = [
      { label: 'Ad Soyad:', value: quoteRequest.fullName || 'Belirtilmemiş' },
      { label: 'E-posta:', value: quoteRequest.email || 'Belirtilmemiş' },
      { label: 'Telefon:', value: quoteRequest.phone || 'Belirtilmemiş' },
      { label: 'Şirket:', value: quoteRequest.companyName || 'Belirtilmemiş' }
    ];
    
    customerInfo.forEach(info => {
      this.doc.fontSize(10)
        .font('Turkish-Bold')
        .text(info.label, 50, this.doc.y, { continued: true })
        .font('Turkish')
        .text(` ${info.value}`);
      this.doc.y += 18;
    });
    
    this.doc.y += 15;
  }

  private addServiceSection(quoteRequest: QuoteRequest): void {
    this.checkPageSpace(120);
    this.addSectionTitle('Hizmet Detayları');
    
    const serviceNeeded = quoteRequest.serviceNeeded || '';
    const lines = serviceNeeded.split('\n').filter(line => line.trim());
    const mainService = lines.find(line => !line.includes('Çalışma Şekli:')) || serviceNeeded;
    
    const serviceInfo = [
      { label: 'İhtiyaç Duyulan Hizmet:', value: mainService },
      { label: 'Bütçe:', value: quoteRequest.budget || 'Belirtilmemiş' },
      { label: 'Durum:', value: this.getStatusText(quoteRequest.status || 'pending') }
    ];
    
    serviceInfo.forEach(info => {
      this.doc.fontSize(10)
        .font('Turkish-Bold')
        .text(info.label, 50, this.doc.y, { continued: true })
        .font('Turkish')
        .text(` ${info.value}`, { width: 480 });
      this.doc.y += 18;
    });
    
    this.doc.y += 15;
  }

  private addMessageSection(message: string): void {
    const messageHeight = this.doc.heightOfString(message, { width: 480 }) + 40;
    this.checkPageSpace(messageHeight);
    
    this.addSectionTitle('Müşteri Mesajı');
    
    this.doc.fontSize(10)
      .font('Turkish')
      .text(message, 50, this.doc.y, { width: 480 });
    
    this.doc.y += 20;
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
        .font('Turkish-Bold')
        .text(info.label, 50, this.doc.y, { continued: true })
        .font('Turkish')
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
        .font('Turkish-Bold')
        .text(detail.label, 50, this.doc.y, { continued: true })
        .font('Turkish')
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
        .font('Turkish-Bold')
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
          .font('Turkish')
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
        .font(total.bold ? 'Turkish-Bold' : 'Turkish-Bold')
        .text(total.label, totalsX, this.doc.y, { width: labelWidth, align: 'right' })
        .font(total.bold ? 'Turkish-Bold' : 'Turkish')
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
      .font('Turkish')
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
    // Arka plan rengi
    this.doc.rect(40, this.doc.y - 5, this.doc.page.width - 80, 22)
      .fill('#f3f4f6');
    
    this.doc.fillColor('black')
      .fontSize(11)
      .font('Turkish-Bold')
      .text(title, 50, this.doc.y, { align: 'left' });
    
    this.doc.y += 25;
  }

  private addFooterAtBottom(): void {
    const footerHeight = 70;
    const footerY = this.doc.page.height - footerHeight - 20;
    
    // Footer arka planı - DİP marka rengi veya koyu gri
    this.doc.rect(0, footerY, this.doc.page.width, footerHeight)
      .fill('#1f2937'); // Koyu gri arka plan (beyaz logo için)
    
    try {
      // Logo'yu yükle
      const logoWidth = 140; // Logo genişliği biraz daha büyük
      const logoHeight = 35; // Logo yüksekliği
      const logoX = (this.doc.page.width - logoWidth) / 2; // Ortala
      const logoY = footerY + 12;
      
      // Önce local dosyadan yüklemeyi dene
      if (fs.existsSync(this.logoPath)) {
        this.doc.image(this.logoPath, logoX, logoY, {
          width: logoWidth,
          height: logoHeight,
          align: 'center',
          valign: 'center'
        });
      } else {
        // Local dosya yoksa URL'den yükle
        const logoUrl = 'https://partner.dip.tc/assets/dip-beyaz-yan_1753361664424-ClyMo0YY.png';
        this.doc.image(logoUrl, logoX, logoY, {
          width: logoWidth,
          height: logoHeight,
          align: 'center',
          valign: 'center'
        });
      }
      
      // Web sitesi linkini logo'nun altına ekle
      this.doc.fillColor('#d1d5db') // Açık gri metin
        .fontSize(9)
        .font('Turkish')
        .text('https://partner.dip.tc', 0, footerY + 48, { 
          align: 'center', 
          width: this.doc.page.width
        });
        
    } catch (error) {
      // Logo yüklenemezse metin göster
      console.warn('Logo yüklenemedi:', error);
      
      this.doc.fillColor('#ffffff') // Beyaz metin
        .fontSize(11)
        .font('Turkish-Bold')
        .text('DİP - Dijital İhracat Platformu', 0, footerY + 20, { 
          align: 'center', 
          width: this.doc.page.width
        })
        .fontSize(9)
        .font('Turkish')
        .fillColor('#d1d5db')
        .text('https://partner.dip.tc', 0, footerY + 40, { 
          align: 'center', 
          width: this.doc.page.width
        });
    }
  }

  private addFooter(): void {
    // Bu metod artık kullanılmıyor, yerine addFooterAtBottom kullanıyoruz
    this.addFooterAtBottom();
  }

  private checkPageSpace(requiredSpace: number): void {
    const footerSpace = 110; // Footer için daha fazla alan bırak
    const availableSpace = this.doc.page.height - this.doc.y - footerSpace;
    
    if (availableSpace < requiredSpace) {
      this.doc.addPage();
      this.doc.y = 50;
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