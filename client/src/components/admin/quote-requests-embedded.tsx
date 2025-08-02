import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Eye,
  Download
} from 'lucide-react';

interface QuoteRequest {
  id: number;
  userId: number;
  partnerId: number;
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  serviceNeeded: string;
  budget: string;
  message: string;
  status: 'pending' | 'responded' | 'quote_sent' | 'accepted' | 'completed' | 'rejected';
  createdAt: string;
  updatedAt: string;
  partner?: {
    id: number;
    companyName: string;
    logo: string;
  };
}

interface QuoteResponse {
  id: number;
  quoteRequestId: number;
  partnerId: number;
  title: string;
  description: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil: string;
  notes: string;
  paymentTerms: string;
  deliveryTime: string;
  quoteNumber: string;
  status: string;
  createdAt: string;
}

export function QuoteRequestsEmbedded() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | null>(null);

  // Fetch current user to check if they're master admin
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await fetch('/api/user');
      if (!response.ok) throw new Error('User info could not be loaded');
      return response.json();
    }
  });

  // Fetch all quote requests
  const { data: quoteRequests = [], isLoading } = useQuery<QuoteRequest[]>({
    queryKey: ['/api/admin/quote-requests'],
    queryFn: async () => {
      const response = await fetch('/api/admin/quote-requests');
      if (!response.ok) throw new Error('Teklif talepleri yüklenemedi');
      return response.json();
    },
  });

  // Update quote request status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/quote-requests/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quote-requests'] });
      toast({
        title: 'Başarılı',
        description: 'Teklif durumu güncellendi',
      });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Durum güncellenirken hata oluştu',
        variant: 'destructive',
      });
    },
  });

  // Function to handle viewing quote details
  const handleViewDetails = async (request: QuoteRequest) => {
    setSelectedRequest(request);
    
    // If quote was sent, fetch the quote response details
    if (request.status === 'quote_sent' || request.status === 'responded') {
      try {
        const response = await fetch(`/api/quote-responses/${request.id}`);
        if (response.ok) {
          const quoteResponses = await response.json();
          if (quoteResponses.length > 0) {
            // Convert the data format to match our interface
            const quoteData = quoteResponses[0];
            setQuoteResponse({
              ...quoteData,
              total: quoteData.totalAmount ? quoteData.totalAmount / 100 : 0, // Convert from cents
              subtotal: quoteData.subtotal ? quoteData.subtotal / 100 : 0,
              taxAmount: quoteData.taxAmount ? quoteData.taxAmount / 100 : 0,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching quote response:', error);
      }
    } else {
      setQuoteResponse(null);
    }
    
    setIsDetailModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
    setQuoteResponse(null);
  };

  // Filter requests by status
  const filteredRequests = selectedStatus === 'all' 
    ? quoteRequests 
    : selectedStatus === 'responded' 
    ? quoteRequests.filter(req => req.status === 'responded' || req.status === 'quote_sent')
    : quoteRequests.filter(req => req.status === selectedStatus);

  // Calculate statistics
  const totalRequests = quoteRequests.length;
  const pendingRequests = quoteRequests.filter(req => req.status === 'pending').length;
  const respondedRequests = quoteRequests.filter(req => req.status === 'responded' || req.status === 'quote_sent').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Beklemede
        </Badge>;
      case 'responded':
      case 'quote_sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <MessageSquare className="h-3 w-3 mr-1" />
          Yanıtlandı
        </Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Kabul Edildi
        </Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Teklif Talepleri ({totalRequests})</span>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {pendingRequests} beklemede • {respondedRequests} yanıtlandı
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="pending">Beklemede</SelectItem>
                <SelectItem value="responded">Yanıtlandı</SelectItem>
                <SelectItem value="quote_sent">Teklif Gönderildi</SelectItem>
                <SelectItem value="accepted">Kabul Edildi</SelectItem>
                <SelectItem value="completed">Tamamlandı</SelectItem>
                <SelectItem value="rejected">Reddedildi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedStatus === 'all' ? 'Teklif talebi bulunmuyor' : `${selectedStatus} durumunda teklif talebi bulunmuyor`}
            </h3>
            <p className="text-gray-600">
              Kullanıcılar teklif talep ettiğinde burada görünecekler.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Hizmet</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.fullName}</p>
                        <p className="text-sm text-gray-500">{request.companyName}</p>
                        <p className="text-sm text-gray-500">{request.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {request.partner?.logo && (
                          <img 
                            src={request.partner.logo} 
                            alt={request.partner.companyName}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <span>{request.partner?.companyName || 'Partner Bulunamadı'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm truncate" title={request.serviceNeeded}>
                          {request.serviceNeeded}
                        </p>
                        {request.budget && (
                          <p className="text-xs text-gray-500">Bütçe: {request.budget}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(request.createdAt).toLocaleDateString('tr-TR')}</p>
                        <p className="text-gray-500">{new Date(request.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(request)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Detaylar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Quote Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Teklif Talebi Detayları
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Quote Request Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Teklif Talebi Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Müşteri Adı</label>
                      <p className="text-sm font-medium">{selectedRequest.fullName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Şirket</label>
                      <p className="text-sm">{selectedRequest.companyName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">E-posta</label>
                      <p className="text-sm">{selectedRequest.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Telefon</label>
                      <p className="text-sm">{selectedRequest.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Bütçe</label>
                      <p className="text-sm">{selectedRequest.budget || 'Belirtilmemiş'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Talep Tarihi</label>
                      <p className="text-sm">{new Date(selectedRequest.createdAt).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">İhtiyaç Duyulan Hizmetler</label>
                    <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{selectedRequest.serviceNeeded}</p>
                  </div>
                  
                  {selectedRequest.message && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Ek Mesaj</label>
                      <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{selectedRequest.message}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-600">Durum</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quote Response Details (if available) */}
              {quoteResponse && (
                <>
                  <Separator />
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-lg">Gönderilen Teklif Detayları</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/api/quote-responses/${quoteResponse.id}/pdf`, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          PDF İndir
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Teklif Numarası</label>
                          <p className="text-sm font-medium">{quoteResponse.quoteNumber}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Geçerlilik Tarihi</label>
                          <p className="text-sm">{new Date(quoteResponse.validUntil).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Teslimat Süresi</label>
                          <p className="text-sm">{quoteResponse.deliveryTime}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Teklif Tarihi</label>
                          <p className="text-sm">{new Date(quoteResponse.createdAt).toLocaleDateString('tr-TR')}</p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Teklif Başlığı</label>
                        <p className="text-sm mt-1 font-medium">{quoteResponse.title}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Açıklama</label>
                        <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{quoteResponse.description}</p>
                      </div>

                      {/* Quote Items */}
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">Hizmet Kalemleri</label>
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Hizmet</TableHead>
                                <TableHead className="text-right">Miktar</TableHead>
                                <TableHead className="text-right">Birim Fiyat</TableHead>
                                <TableHead className="text-right">Toplam</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {quoteResponse.items.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">
                                    {(currentUser?.userType === 'master_admin' || item.unitPrice > 0) ? 
                                      `₺${item.unitPrice.toLocaleString('tr-TR')}` : 'Özel Fiyat'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {(currentUser?.userType === 'master_admin' || item.total > 0) ? 
                                      `₺${item.total.toLocaleString('tr-TR')}` : 'Özel Fiyat'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Pricing Summary */}
                      <div className="bg-gray-50 p-4 rounded-md space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Ara Toplam:</span>
                          <span className="text-sm font-medium">
                            {(currentUser?.userType === 'master_admin' || quoteResponse.subtotal > 0) ? 
                              `₺${quoteResponse.subtotal.toLocaleString('tr-TR')}` : 'Özel Fiyat'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">KDV (%{quoteResponse.taxRate}):</span>
                          <span className="text-sm font-medium">
                            {(currentUser?.userType === 'master_admin' || quoteResponse.taxAmount > 0) ? 
                              `₺${quoteResponse.taxAmount.toLocaleString('tr-TR')}` : 'Dahil'}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-base font-medium">Genel Toplam:</span>
                          <span className="text-base font-bold">
                            {(currentUser?.userType === 'master_admin' || quoteResponse.total > 0) ? 
                              `₺${quoteResponse.total.toLocaleString('tr-TR')}` : 'Özel Fiyat - İletişime Geçiniz'}
                          </span>
                        </div>
                      </div>

                      {quoteResponse.notes && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Notlar</label>
                          <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{quoteResponse.notes}</p>
                        </div>
                      )}

                      {quoteResponse.paymentTerms && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Ödeme Koşulları</label>
                          <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{quoteResponse.paymentTerms}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}