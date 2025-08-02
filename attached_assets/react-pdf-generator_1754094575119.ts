import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { Response } from 'express';
import { QuoteRequest, Partner } from '../shared/schema';

interface PDFGeneratorOptions {
  quoteRequest: QuoteRequest;
  partner?: Partner;
  type: 'quote_request' | 'quote_response';
  quoteResponse?: any;
}

// Türkçe karakterleri destekleyen font stilleri
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontFamily: 'Helvetica', // React-PDF otomatik olarak Unicode destekler
  },
  header: {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottom: '1 solid #e5e7eb',
    paddingBottom: 5,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 8,
    flexDirection: 'row',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    width: 120,
  },
  infoValue: {
    fontSize: 11,
    color: '#6b7280',
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 8,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    padding: 8,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 10,
  },
  totals: {
    marginTop: 20,
    borderTop: '2 solid #e5e7eb',
    paddingTop: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 20,
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 20,
    borderTop: '1 solid #d1d5db',
    paddingTop: 8,
    marginTop: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  terms: {
    backgroundColor: '#f9fafb',
    border: '1 solid #e5e7eb',
    borderRadius: 4,
    padding: 15,
    margin: '20 0',
    fontSize: 10,
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    textAlign: 'right',
    fontSize: 11,
    color: '#6b7280',
  },
  website: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    fontSize: 10,
    color: '#9ca3af',
    transform: 'translateX(-50%)',
  },
});

// Teklif Talebi PDF Komponenti
const QuoteRequestPDF: React.FC<{ quoteRequest: QuoteRequest; partner?: Partner }> = ({ 
  quoteRequest, 
  partner 
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={[styles.section, { textAlign: 'right', marginBottom: 10 }]}>
        <Text style={{ fontSize: 10 }}>
          {new Date().toLocaleDateString('tr-TR')}
        </Text>
      </View>

      {/* Title Section */}
      <View style={[styles.section, { textAlign: 'center', borderBottom: '2 solid #e5e7eb', paddingBottom: 20 }]}>
        {partner && (
          <Text style={[styles.title, { textTransform: 'uppercase' }]}>
            {partner.companyName}
          </Text>
        )}
        <Text style={styles.subtitle}>
          TEKLİF TALEBİ #{quoteRequest.id}
        </Text>
        <Text style={{ fontSize: 12, color: '#6b7280' }}>
          {quoteRequest.createdAt ? 
            new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR') : 
            new Date().toLocaleDateString('tr-TR')
          }
        </Text>
      </View>

      {/* Customer Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MÜŞTERİ BİLGİLERİ</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Ad Soyad:</Text>
            <Text style={styles.infoValue}>{quoteRequest.fullName || 'Belirtilmemiş'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>E-posta:</Text>
            <Text style={styles.infoValue}>{quoteRequest.email || 'Belirtilmemiş'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Telefon:</Text>
            <Text style={styles.infoValue}>{quoteRequest.phone || 'Belirtilmemiş'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Şirket:</Text>
            <Text style={styles.infoValue}>{quoteRequest.companyName || 'Belirtilmemiş'}</Text>
          </View>
        </View>
      </View>

      {/* Service Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>HİZMET DETAYLARI</Text>
        <Text style={{ fontSize: 11, marginBottom: 8 }}>
          • {quoteRequest.serviceNeeded || 'Belirtilmemiş'}
        </Text>
        {quoteRequest.budget && quoteRequest.budget !== 'Belirtilmemiş' && (
          <Text style={{ fontSize: 11, marginBottom: 8 }}>
            • Bütçe: {quoteRequest.budget}
          </Text>
        )}
      </View>

      {/* Customer Message */}
      {quoteRequest.message && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MÜŞTERİ MESAJI</Text>
          <View style={[styles.terms, { backgroundColor: '#f9fafb' }]}>
            <Text style={{ fontSize: 11 }}>{quoteRequest.message}</Text>
          </View>
        </View>
      )}

      {/* Request Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Talep Bilgileri</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Talep Tarihi:</Text>
          <Text style={styles.infoValue}>
            {quoteRequest.createdAt ? 
              new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR') : 
              'Belirtilmemiş'
            }
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Son Güncelleme:</Text>
          <Text style={styles.infoValue}>
            {quoteRequest.updatedAt ? 
              new Date(quoteRequest.updatedAt).toLocaleDateString('tr-TR') : 
              'Belirtilmemiş'
            }
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Saygılarımla,</Text>
        <Text style={{ fontWeight: 'bold', marginTop: 5 }}>DİP Ekibi</Text>
        <Text>Dijital İhracat Platformu</Text>
      </View>

      <View style={styles.website}>
        <Text>https://partner.dip.tc</Text>
      </View>
    </Page>
  </Document>
);

// Teklif Yanıtı PDF Komponenti
const QuoteResponsePDF: React.FC<{ 
  quoteResponse: any; 
  quoteRequest: QuoteRequest; 
  partner?: Partner;
}> = ({ quoteResponse, quoteRequest, partner }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{partner?.companyName || 'Teklif'}</Text>
        <Text style={styles.subtitle}>{quoteResponse.title}</Text>
      </View>

      {/* Quote Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Teklif Detayları</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Müşteri:</Text>
            <Text style={styles.infoValue}>{quoteRequest.fullName || 'Belirtilmemiş'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Teklif No:</Text>
            <Text style={styles.infoValue}>{quoteResponse.quoteNumber || 'Belirtilmemiş'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Geçerlilik Tarihi:</Text>
            <Text style={styles.infoValue}>
              {new Date(quoteResponse.validUntil).toLocaleDateString('tr-TR')}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Teslimat Süresi:</Text>
            <Text style={styles.infoValue}>{quoteResponse.deliveryTime || 'Belirtilmemiş'}</Text>
          </View>
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hizmet Kalemleri</Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRow}>
            <View style={[styles.tableColHeader, { width: '50%' }]}>
              <Text style={styles.tableCellHeader}>Hizmet</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '15%' }]}>
              <Text style={styles.tableCellHeader}>Miktar</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '17.5%' }]}>
              <Text style={styles.tableCellHeader}>Birim Fiyat</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '17.5%' }]}>
              <Text style={styles.tableCellHeader}>Toplam</Text>
            </View>
          </View>
          
          {/* Rows */}
          {quoteResponse.items.map((item: any, index: number) => (
            <View style={styles.tableRow} key={index}>
              <View style={[styles.tableCol, { width: '50%' }]}>
                <Text style={styles.tableCell}>{item.description}</Text>
              </View>
              <View style={[styles.tableCol, { width: '15%' }]}>
                <Text style={styles.tableCell}>{item.quantity}</Text>
              </View>
              <View style={[styles.tableCol, { width: '17.5%' }]}>
                <Text style={styles.tableCell}>{item.unitPrice.toFixed(2)} TL</Text>
              </View>
              <View style={[styles.tableCol, { width: '17.5%' }]}>
                <Text style={styles.tableCell}>{item.total.toFixed(2)} TL</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={{ fontSize: 11 }}>Ara Toplam:</Text>
          <Text style={{ fontSize: 11 }}>{(quoteResponse.subtotal / 100).toFixed(2)} TL</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={{ fontSize: 11 }}>KDV (%{quoteResponse.taxRate || 20}):</Text>
          <Text style={{ fontSize: 11 }}>{(quoteResponse.taxAmount / 100).toFixed(2)} TL</Text>
        </View>
        <View style={styles.totalRowFinal}>
          <Text>Genel Toplam:</Text>
          <Text>{(quoteResponse.totalAmount / 100).toFixed(2)} TL</Text>
        </View>
      </View>

      {/* Terms and Conditions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Şartlar ve Koşullar</Text>
        <View style={styles.terms}>
          <Text>{getTermsText(quoteResponse)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Saygılarımla,</Text>
        <Text style={{ fontWeight: 'bold', marginTop: 5 }}>DİP Ekibi</Text>
        <Text>Dijital İhracat Platformu</Text>
      </View>

      <View style={styles.website}>
        <Text>https://partner.dip.tc</Text>
      </View>
    </Page>
  </Document>
);

function getTermsText(quoteResponse: any): string {
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

export class ReactPDFGenerator {
  
  async generateQuoteRequestPDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner } = options;
    
    try {
      // PDF oluştur
      const doc = <QuoteRequestPDF quoteRequest={quoteRequest} partner={partner} />;
      const pdfBuffer = await pdf(doc).toBuffer();
      
      // Response headers ayarla
      const filename = `Teklif_Talebi_${quoteRequest.id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      
      // PDF'i gönder
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ error: 'PDF oluşturulurken bir hata oluştu' });
    }
  }

  async generateQuoteResponsePDF(options: PDFGeneratorOptions, res: Response): Promise<void> {
    const { quoteRequest, partner, quoteResponse } = options;
    
    try {
      // PDF oluştur
      const doc = (
        <QuoteResponsePDF 
          quoteResponse={quoteResponse} 
          quoteRequest={quoteRequest} 
          partner={partner} 
        />
      );
      const pdfBuffer = await pdf(doc).toBuffer();
      
      // Response headers ayarla
      const filename = `Teklif_${quoteResponse.id}_${partner?.companyName || 'Partner'}.pdf`;
      res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      
      // PDF'i gönder
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ error: 'PDF oluşturulurken bir hata oluştu' });
    }
  }
}

export const reactPDFGenerator = new ReactPDFGenerator();