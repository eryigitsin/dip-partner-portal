import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuoteRequest } from "@shared/schema";
import { 
  Calendar, 
  Mail, 
  Phone, 
  Building, 
  DollarSign, 
  FileText,
  User,
  MessageSquare,
  Download
} from "lucide-react";

interface QuoteRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequest: QuoteRequest;
}

export function QuoteRequestDetailModal({ 
  isOpen, 
  onClose, 
  quoteRequest 
}: QuoteRequestDetailModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      case "quote_sent":
        return "bg-purple-100 text-purple-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Beklemede";
      case "under_review":
        return "İnceleniyor";
      case "quote_sent":
        return "Teklif Gönderildi";
      case "accepted":
        return "Kabul Edildi";
      case "rejected":
        return "Reddedildi";
      case "completed":
        return "Tamamlandı";
      default:
        return "Bilinmeyen";
    }
  };

  const handleDownloadPDF = () => {
    // Generate and download PDF for the quote request
    const element = document.createElement('a');
    const pdfContent = generateQuoteRequestPDF(quoteRequest);
    const file = new Blob([pdfContent], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `teklif-talebi-${quoteRequest.id}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generateQuoteRequestPDF = (request: QuoteRequest) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Teklif Talebi #${request.id}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .label { font-weight: bold; color: #374151; }
            .value { margin-left: 10px; }
            .status { padding: 5px 10px; border-radius: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DİP - Dijital İhracat Platformu</h1>
            <h2>Teklif Talebi #${request.id}</h2>
          </div>
          
          <div class="section">
            <h3>Müşteri Bilgileri</h3>
            <p><span class="label">Ad Soyad:</span><span class="value">${request.firstName || ''} ${request.lastName || ''}</span></p>
            <p><span class="label">E-posta:</span><span class="value">${request.email || ''}</span></p>
            <p><span class="label">Telefon:</span><span class="value">${request.phone || ''}</span></p>
            <p><span class="label">Şirket:</span><span class="value">${request.company || 'Belirtilmemiş'}</span></p>
          </div>
          
          <div class="section">
            <h3>Hizmet Detayları</h3>
            <p><span class="label">İhtiyaç Duyulan Hizmet:</span><span class="value">${request.serviceNeeded || ''}</span></p>
            <p><span class="label">Bütçe:</span><span class="value">${request.budget || 'Belirtilmemiş'}</span></p>
            <p><span class="label">Durum:</span><span class="value">${getStatusText(request.status || 'pending')}</span></p>
          </div>
          
          ${request.message ? `
          <div class="section">
            <h3>Müşteri Mesajı</h3>
            <p>${request.message}</p>
          </div>
          ` : ''}
          
          <div class="section">
            <h3>Talep Bilgileri</h3>
            <p><span class="label">Talep Tarihi:</span><span class="value">${new Date(request.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
            <p><span class="label">Son Güncelleme:</span><span class="value">${new Date(request.updatedAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
          </div>
        </body>
      </html>
    `;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Teklif Talebi Detayları</span>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(quoteRequest.status || 'pending')}>
                {getStatusText(quoteRequest.status || 'pending')}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF İndir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <User className="h-5 w-5 mr-2" />
                Müşteri Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Ad Soyad:</span>
                  <span>{quoteRequest.firstName || ''} {quoteRequest.lastName || ''}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">E-posta:</span>
                  <span>{quoteRequest.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Telefon:</span>
                  <span>{quoteRequest.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Şirket:</span>
                  <span>{quoteRequest.company || 'Belirtilmemiş'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2" />
                Hizmet Detayları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">İhtiyaç Duyulan Hizmet:</span>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{quoteRequest.serviceNeeded}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Bütçe:</span>
                <span>{quoteRequest.budget || 'Belirtilmemiş'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Customer Message */}
          {quoteRequest.message && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Müşteri Mesajı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                  <p className="text-gray-700">{quoteRequest.message}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Request Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Calendar className="h-5 w-5 mr-2" />
                Talep Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Talep Tarihi:</span>
                  <p className="text-gray-600">
                    {new Date(quoteRequest.createdAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Son Güncelleme:</span>
                  <p className="text-gray-600">
                    {new Date(quoteRequest.updatedAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}