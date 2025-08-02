// routes/pdf.ts
import express from 'express';
import { PDFGenerator } from '../utils/pdf-generator'; // Düzeltilmiş PDFKit versiyonu
import { PuppeteerPDFGenerator } from '../utils/puppeteer-pdf-generator'; // Puppeteer versiyonu
import { ReactPDFGenerator } from '../utils/react-pdf-generator'; // React-PDF versiyonu

const router = express.Router();

// PDFKit ile PDF oluşturma (düzeltilmiş versiyon)
router.get('/quote-request/:id/pdf', async (req, res) => {
  try {
    const quoteRequest = await getQuoteRequestById(req.params.id);
    const partner = await getPartnerById(quoteRequest.partnerId);
    
    const pdfGenerator = new PDFGenerator();
    await pdfGenerator.generateQuoteRequestPDF({
      quoteRequest,
      partner,
      type: 'quote_request'
    }, res);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF oluşturulurken bir hata oluştu' });
  }
});

// Puppeteer ile PDF oluşturma (önerilen)
router.get('/quote-request/:id/pdf-puppeteer', async (req, res) => {
  try {
    const quoteRequest = await getQuoteRequestById(req.params.id);
    const partner = await getPartnerById(quoteRequest.partnerId);
    
    const pdfGenerator = new PuppeteerPDFGenerator();
    await pdfGenerator.generateQuoteRequestPDF({
      quoteRequest,
      partner,
      type: 'quote_request'
    }, res);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF oluşturulurken bir hata oluştu' });
  }
});

// React-PDF ile PDF oluşturma
router.get('/quote-request/:id/pdf-react', async (req, res) => {
  try {
    const quoteRequest = await getQuoteRequestById(req.params.id);
    const partner = await getPartnerById(quoteRequest.partnerId);
    
    const pdfGenerator = new ReactPDFGenerator();
    await pdfGenerator.generateQuoteRequestPDF({
      quoteRequest,
      partner,
      type: 'quote_request'
    }, res);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF oluşturulurken bir hata oluştu' });
  }
});

// Teklif yanıtı PDF'leri için de benzer route'lar
router.get('/quote-response/:id/pdf', async (req, res) => {
  try {
    const quoteResponse = await getQuoteResponseById(req.params.id);
    const quoteRequest = await getQuoteRequestById(quoteResponse.quoteRequestId);
    const partner = await getPartnerById(quoteResponse.partnerId);
    
    // İstediğiniz generator'ı seçin
    const pdfGenerator = new PuppeteerPDFGenerator(); // Önerilen
    
    await pdfGenerator.generateQuoteResponsePDF({
      quoteRequest,
      partner,
      quoteResponse,
      type: 'quote_response'
    }, res);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF oluşturulurken bir hata oluştu' });
  }
});

export default router;

// Helper functions (veritabanı işlemleri)
async function getQuoteRequestById(id: string) {
  // Veritabanından teklif talebini getir
  return {
    id,
    fullName: 'Sinan Eryiğit',
    email: 'sinan@example.com',
    phone: '+90 555 123 45 67',
    companyName: 'Sinan Tekstil',
    serviceNeeded: 'eTicaret Otomasyonu ve Uçtan Uca İhracat Yönetimi',
    budget: '50.000 - 100.000 TL',
    message: 'Mevcut tekstil işimizi dijital ihracata dönüştürmek istiyoruz.',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

async function getPartnerById(id: string) {
  return {
    id,
    companyName: 'DİP Teknoloji',
    email: 'info@dip.tc',
    phone: '+90 212 123 45 67'
  };
}

async function getQuoteResponseById(id: string) {
  return {
    id,
    title: 'eTicaret ve İhracat Yönetimi Teklifi',
    quoteNumber: 'DIP2025529824',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün sonra
    deliveryTime: '4-6 hafta',
    items: [
      {
        description: 'eTicaret Otomasyonu',
        quantity: 1,
        unitPrice: 25000,
        total: 25000
      },
      {
        description: 'Uçtan Uca İhracat Yönetimi',
        quantity: 1,
        unitPrice: 35000,
        total: 35000
      }
    ],
    subtotal: 6000000, // 60.000 TL (kuruş cinsinden)
    taxRate: 20,
    taxAmount: 1200000, // 12.000 TL KDV
    totalAmount: 7200000, // 72.000 TL
    notes: 'Aylık bakım ve destek dahildir. İlk 6 ay ücretsiz eğitim verilecektir.',
    paymentTerms: '%50 peşin, %50 teslimat sonrası',
    description: 'Çalışma Şekli: Aylık\n\nDetaylı proje planı ve milestone\'lar ayrıca paylaşılacaktır.'
  };
}