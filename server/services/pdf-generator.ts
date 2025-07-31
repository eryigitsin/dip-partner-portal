import { jsPDF } from 'jspdf';
import type { QuoteRequest, Partner } from '@shared/schema';

// Add Turkish character support
const turkishCharMap: { [key: string]: string } = {
  'ş': 's', 'Ş': 'S',
  'ğ': 'g', 'Ğ': 'G', 
  'ı': 'i', 'I': 'I',
  'ü': 'u', 'Ü': 'U',
  'ö': 'o', 'Ö': 'O',
  'ç': 'c', 'Ç': 'C'
};

function fixTurkishChars(text: string): string {
  return text.replace(/[şŞğĞıüÜöÖçÇ]/g, (match) => turkishCharMap[match] || match);
}

export class PDFGenerator {
  static async generateQuoteRequestPDF(quoteRequest: QuoteRequest, partner?: Partner): Promise<Buffer> {
    const doc = new jsPDF();
    
    // PDF dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = 20;
    
    // Header with blue background (matching HTML template)
    doc.setFillColor(37, 99, 235); // #2563eb
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(fixTurkishChars('DİP - Dijital İhracat Platformu'), pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(fixTurkishChars(`Teklif Talebi #${quoteRequest.id}`), pageWidth / 2, 35, { align: 'center' });
    
    yPosition = 70;
    
    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    
    // Section: Customer Information
    yPosition = this.addSection(doc, fixTurkishChars('Müşteri Bilgileri'), yPosition, margin, contentWidth);
    
    const customerInfo: [string, string][] = [
      [fixTurkishChars('Ad Soyad:'), fixTurkishChars(quoteRequest.fullName || 'Belirtilmemiş')],
      ['E-posta:', quoteRequest.email || fixTurkishChars('Belirtilmemiş')],
      ['Telefon:', quoteRequest.phone || fixTurkishChars('Belirtilmemiş')],
      [fixTurkishChars('Şirket:'), fixTurkishChars(quoteRequest.companyName || 'Belirtilmemiş')]
    ];
    
    yPosition = this.addInfoRows(doc, customerInfo, yPosition, margin);
    yPosition += 10;
    
    // Section: Service Details
    yPosition = this.addSection(doc, fixTurkishChars('Hizmet Detayları'), yPosition, margin, contentWidth);
    
    // Service needed (with proper text wrapping)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(fixTurkishChars('İhtiyaç Duyulan Hizmet:'), margin, yPosition);
    yPosition += 6;
    
    doc.setFont("helvetica", "normal");
    const serviceText = fixTurkishChars(quoteRequest.serviceNeeded || 'Belirtilmemiş');
    const serviceLines = doc.splitTextToSize(serviceText, contentWidth - 20);
    doc.text(serviceLines, margin + 10, yPosition);
    yPosition += serviceLines.length * 5 + 10;
    
    // Working style if exists - using message field instead
    if (quoteRequest.message) {
      doc.setFont("helvetica", "bold");
      doc.text(fixTurkishChars('Çalışma Şekli:'), margin, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(fixTurkishChars(quoteRequest.message), margin + 40, yPosition);
      yPosition += 8;
    }
    
    const serviceInfo: [string, string][] = [
      [fixTurkishChars('Bütçe:'), fixTurkishChars(quoteRequest.budget || 'Belirtilmemiş')],
      [fixTurkishChars('Durum:'), fixTurkishChars(getStatusText(quoteRequest.status || 'pending'))]
    ];
    
    yPosition = this.addInfoRows(doc, serviceInfo, yPosition, margin);
    yPosition += 10;
    
    // Section: Customer Message (if exists) - using message field
    if (quoteRequest.message) {
      yPosition = this.addSection(doc, fixTurkishChars('Müşteri Mesajı'), yPosition, margin, contentWidth);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const messageLines = doc.splitTextToSize(fixTurkishChars(quoteRequest.message), contentWidth - 20);
      doc.text(messageLines, margin + 10, yPosition);
      yPosition += messageLines.length * 5 + 15;
    }
    
    // Section: Request Information
    yPosition = this.addSection(doc, fixTurkishChars('Talep Bilgileri'), yPosition, margin, contentWidth);
    
    const requestInfo: [string, string][] = [
      [fixTurkishChars('Talep Tarihi:'), quoteRequest.createdAt ? new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR') : fixTurkishChars('Belirtilmemiş')],
      [fixTurkishChars('Son Güncelleme:'), quoteRequest.updatedAt ? new Date(quoteRequest.updatedAt).toLocaleDateString('tr-TR') : fixTurkishChars('Belirtilmemiş')]
    ];
    
    yPosition = this.addInfoRows(doc, requestInfo, yPosition, margin);
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(fixTurkishChars('DİP - Digital İhracat Platformu | https://partner.dip.tc'), pageWidth / 2, footerY, { align: 'center' });
    
    return Buffer.from(doc.output('arraybuffer'));
  }
  
  private static addSection(doc: jsPDF, title: string, yPosition: number, margin: number, contentWidth: number): number {
    // Section background (light border)
    doc.setDrawColor(229, 231, 235); // #e5e7eb
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition - 5, contentWidth, 20, 'S');
    
    // Section title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81); // #374151
    doc.text(title, margin + 5, yPosition + 5);
    
    return yPosition + 20;
  }
  
  private static addInfoRows(doc: jsPDF, info: Array<[string, string]>, yPosition: number, margin: number): number {
    doc.setFontSize(10);
    
    info.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 65, 81); // #374151
      doc.text(label, margin + 10, yPosition);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 24, 39); // #111827
      doc.text(value, margin + 60, yPosition);
      
      yPosition += 6;
    });
    
    return yPosition;
  }

  static async generateQuoteResponsePDF(quoteResponse: any, quoteRequest: QuoteRequest, partner?: Partner): Promise<Buffer> {
    const doc = new jsPDF();
    
    // PDF dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = 20;
    
    // Header with blue background
    doc.setFillColor(37, 99, 235); // #2563eb
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(fixTurkishChars('DİP - Dijital İhracat Platformu'), pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(fixTurkishChars(`Teklif Yanıtı #${quoteResponse.id}`), pageWidth / 2, 35, { align: 'center' });
    
    yPosition = 70;
    
    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    
    // Section: Quote Details
    yPosition = this.addSection(doc, fixTurkishChars('Teklif Detayları'), yPosition, margin, contentWidth);
    
    const quoteInfo: [string, string][] = [
      [fixTurkishChars('Başlık:'), fixTurkishChars(quoteResponse.title || 'Belirtilmemiş')],
      [fixTurkishChars('Açıklama:'), fixTurkishChars(quoteResponse.description || 'Belirtilmemiş')],
      [fixTurkishChars('Fiyat:'), fixTurkishChars(`${quoteResponse.price} ${quoteResponse.currency}`)],
      [fixTurkishChars('Teslimat Süresi:'), fixTurkishChars(quoteResponse.deliveryTime || 'Belirtilmemiş')]
    ];
    
    yPosition = this.addInfoRows(doc, quoteInfo, yPosition, margin);
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(fixTurkishChars('DİP - Digital İhracat Platformu | https://partner.dip.tc'), pageWidth / 2, footerY, { align: 'center' });
    
    return Buffer.from(doc.output('arraybuffer'));
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