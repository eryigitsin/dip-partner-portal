import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building,
  User,
  Globe,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Users,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Partner {
  id: number;
  companyName: string;
  description: string;
  website: string;
  logo: string;
  coverImage: string;
  serviceCategory: string;
  services: string;
  companySize: string;
  sectorExperience: string;
  city: string;
  country: string;
  companyAddress: string;
  isApproved: boolean;
  createdAt: string;
  email?: string;
  contactPerson?: string;
}

interface PartnerActivity {
  id: number;
  type: string;
  description: string;
  details?: string;
  createdAt: string;
}

interface QuoteRequest {
  id: number;
  fullName: string;
  email: string;
  companyName: string;
  serviceNeeded: string;
  budget: string;
  status: string;
  createdAt: string;
}

interface PartnerInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: number | null;
}

export function PartnerInspectionModal({ open, onOpenChange, partnerId }: PartnerInspectionModalProps) {
  // Fetch partner details
  const { data: partner, isLoading: partnerLoading } = useQuery<Partner>({
    queryKey: ['/api/admin/partners', partnerId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/partners/${partnerId}`);
      if (!response.ok) throw new Error('Partner bilgileri yüklenemedi');
      return response.json();
    },
    enabled: !!partnerId && open,
  });

  // Fetch partner activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<PartnerActivity[]>({
    queryKey: ['/api/admin/partner-activities', partnerId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/partner-activities/${partnerId}`);
      if (!response.ok) throw new Error('Aktiviteler yüklenemedi');
      return response.json();
    },
    enabled: !!partnerId && open,
  });

  // Fetch partner's quote requests
  const { data: quoteRequests = [], isLoading: quotesLoading } = useQuery<QuoteRequest[]>({
    queryKey: ['/api/admin/partner-quotes', partnerId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/partner-quotes/${partnerId}`);
      if (!response.ok) throw new Error('Teklif talepleri yüklenemedi');
      return response.json();
    },
    enabled: !!partnerId && open,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Beklemede
        </Badge>;
      case 'responded':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Yanıtlandı
        </Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Tamamlandı
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Reddedildi
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'profile_update':
        return <Building className="h-4 w-4 text-green-600" />;
      case 'quote_response':
        return <FileText className="h-4 w-4 text-purple-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!open || !partnerId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Partner İnceleme
          </DialogTitle>
        </DialogHeader>

        {partnerLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : partner ? (
          <div className="space-y-6">
            {/* Partner Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {partner.logo && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img 
                        src={partner.logo} 
                        alt={partner.companyName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{partner.companyName}</h2>
                        <p className="text-gray-600 mt-1">{partner.serviceCategory}</p>
                      </div>
                      <Badge variant={partner.isApproved ? "default" : "secondary"}>
                        {partner.isApproved ? "Aktif" : "Beklemede"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      {partner.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{partner.email}</span>
                        </div>
                      )}
                      {partner.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <span>{partner.website}</span>
                        </div>
                      )}
                      {partner.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{partner.city}</span>
                        </div>
                      )}
                      {partner.sectorExperience && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span>{partner.sectorExperience} yıl deneyim</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="info">Bilgiler</TabsTrigger>
                <TabsTrigger value="activities">Aktiviteler</TabsTrigger>
                <TabsTrigger value="quotes">Teklif Talepleri</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Şirket Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Açıklama</label>
                        <p className="text-sm mt-1">{partner.description || 'Belirtilmemiş'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Şirket Büyüklüğü</label>
                        <p className="text-sm mt-1">{partner.companySize || 'Belirtilmemiş'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Adres</label>
                        <p className="text-sm mt-1">{partner.companyAddress || 'Belirtilmemiş'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Hizmetler</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{partner.services || 'Hizmet bilgisi belirtilmemiş'}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activities">
                <Card>
                  <CardHeader>
                    <CardTitle>Son Aktiviteler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activitiesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Henüz aktivite bulunmuyor
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-shrink-0 mt-1">
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.description}
                              </p>
                              {activity.details && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {activity.details}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(activity.createdAt).toLocaleString('tr-TR')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="quotes">
                <Card>
                  <CardHeader>
                    <CardTitle>Teklif Talepleri ({quoteRequests.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {quotesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : quoteRequests.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Henüz teklif talebi bulunmuyor
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Müşteri</TableHead>
                              <TableHead>Hizmet</TableHead>
                              <TableHead>Bütçe</TableHead>
                              <TableHead>Durum</TableHead>
                              <TableHead>Tarih</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quoteRequests.map((request) => (
                              <TableRow key={request.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{request.fullName}</p>
                                    <p className="text-xs text-gray-500">{request.companyName}</p>
                                    <p className="text-xs text-gray-500">{request.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm">{request.serviceNeeded}</p>
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm">{request.budget || 'Belirtilmemiş'}</p>
                                </TableCell>
                                <TableCell>{getStatusBadge(request.status)}</TableCell>
                                <TableCell>
                                  <p className="text-sm">{new Date(request.createdAt).toLocaleDateString('tr-TR')}</p>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Partner bilgileri yüklenemedi</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}