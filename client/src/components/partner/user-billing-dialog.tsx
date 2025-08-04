import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Globe, Linkedin, Phone, Mail, MapPin, FileText, ExternalLink } from 'lucide-react';
import { CompanyBillingInfo } from '@shared/schema';

interface UserBillingDialogProps {
  userId: number;
  userName?: string;
  children: React.ReactNode;
}

export function UserBillingDialog({ userId, userName, children }: UserBillingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: billingInfo, isLoading } = useQuery<CompanyBillingInfo>({
    queryKey: [`/api/partner/user-billing/${userId}`],
    enabled: isOpen && !!userId,
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {userName ? `${userName} - Fatura Bilgileri` : 'Müşteri Fatura Bilgileri'}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ) : !billingInfo ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Fatura Bilgisi Bulunamadı
              </h3>
              <p className="text-gray-500">
                Bu müşterinin henüz fatura bilgileri sisteme girilmemiş.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Company Title Section */}
            {billingInfo.companyTitle && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building className="h-5 w-5" />
                    Şirket Ünvanı
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium text-gray-900">
                    {billingInfo.companyTitle}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Basic Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5" />
                  Temel Bilgiler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Marka / Tabela İsmi</label>
                    <p className="text-base font-medium text-gray-900">{billingInfo.companyName}</p>
                  </div>
                  
                  {billingInfo.website && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Web Sitesi</label>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <a 
                          href={billingInfo.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                        >
                          {billingInfo.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {billingInfo.linkedinProfile && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">LinkedIn Sayfası</label>
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-blue-600" />
                        <a 
                          href={billingInfo.linkedinProfile} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                        >
                          {billingInfo.linkedinProfile}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tax Information */}
            {(billingInfo.taxNumber || billingInfo.taxOffice) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Vergi Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {billingInfo.taxNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Vergi Numarası</label>
                        <p className="text-base font-medium text-gray-900">{billingInfo.taxNumber}</p>
                      </div>
                    )}
                    {billingInfo.taxOffice && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Vergi Dairesi</label>
                        <p className="text-base font-medium text-gray-900">{billingInfo.taxOffice}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Adres Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Adres</label>
                  <p className="text-base font-medium text-gray-900">{billingInfo.address}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Şehir</label>
                    <p className="text-base font-medium text-gray-900">{billingInfo.city}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ülke</label>
                    <p className="text-base font-medium text-gray-900">{billingInfo.country}</p>
                  </div>
                  {billingInfo.postalCode && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Posta Kodu</label>
                      <p className="text-base font-medium text-gray-900">{billingInfo.postalCode}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            {(billingInfo.phone || billingInfo.email) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="h-5 w-5" />
                    İletişim Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {billingInfo.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div>
                          <label className="text-sm font-medium text-gray-500">Telefon</label>
                          <p className="text-base font-medium text-gray-900">{billingInfo.phone}</p>
                        </div>
                      </div>
                    )}
                    {billingInfo.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <label className="text-sm font-medium text-gray-500">E-posta</label>
                          <p className="text-base font-medium text-gray-900">{billingInfo.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}