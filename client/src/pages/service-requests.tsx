import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageCircle, 
  CreditCard,
  Building,
  Calendar,
  DollarSign,
  Heart,
  Eye,
  Edit,
  Download
} from 'lucide-react';
import { QuoteRequest, QuoteResponse, Partner } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function ServiceRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');
  const [selectedQuoteResponse, setSelectedQuoteResponse] = useState<any>(null);
  const [isQuoteDetailsDialogOpen, setIsQuoteDetailsDialogOpen] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [revisionItems, setRevisionItems] = useState<any[]>([]);
  const [revisionMessage, setRevisionMessage] = useState('');

  // Fetch user's quote requests
  const { data: quoteRequests, isLoading: requestsLoading } = useQuery<(QuoteRequest & { partner: Partner; responses: QuoteResponse[] })[]>({
    queryKey: ['/api/user/quote-requests'],
    enabled: !!user,
  });

  // Fetch suggested partners
  const { data: suggestedPartners, isLoading: suggestedLoading } = useQuery<Partner[]>({
    queryKey: ['/api/user/suggested-partners'],
    enabled: !!user,
  });

  // Accept quote response mutation
  const acceptQuoteMutation = useMutation({
    mutationFn: async (responseId: number) => {
      const res = await apiRequest('PUT', `/api/quote-responses/${responseId}/accept`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/quote-requests'] });
      toast({
        title: 'Başarılı',
        description: 'Teklif kabul edildi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Teklif kabul edilirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Reject quote response mutation
  const rejectQuoteMutation = useMutation({
    mutationFn: async (responseId: number) => {
      const res = await apiRequest('PUT', `/api/quote-responses/${responseId}/reject`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/quote-requests'] });
      toast({
        title: 'Başarılı',
        description: 'Teklif reddedildi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Teklif reddedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Revision request mutation
  const revisionRequestMutation = useMutation({
    mutationFn: async (data: { quoteResponseId: number; requestedItems: any[]; message: string }) => {
      const res = await apiRequest('POST', '/api/revision-requests', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/quote-requests'] });
      setIsRevisionDialogOpen(false);
      setRevisionItems([]);
      setRevisionMessage('');
      toast({
        title: 'Başarılı',
        description: 'Revizyon talebiniz iş ortağına gönderildi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Revizyon talebi gönderilirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Teklif Bekleniyor
        </Badge>;
      case 'responded':
        return <Badge className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Teklif Alındı
        </Badge>;
      case 'accepted':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500">
          <CheckCircle className="h-3 w-3" />
          Kabul Edildi
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Reddedildi
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Handle viewing quote details
  const handleViewQuoteDetails = async (quoteRequestId: number) => {
    try {
      const response = await fetch(`/api/quote-requests/${quoteRequestId}/response`);
      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Hata", 
          description: "Teklif yanıtı bulunamadı"
        });
        return;
      }
      
      const quoteResponse = await response.json();
      setSelectedQuoteResponse(quoteResponse);
      setIsQuoteDetailsDialogOpen(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Teklif görüntülenirken bir hata oluştu"
      });
    }
  };

  // Handle opening revision dialog
  const handleRevisionRequest = (quoteResponse: any) => {
    const items = quoteResponse.items.map((item: any) => ({
      ...item,
      requestedUnitPrice: item.unitPrice / 100, // Convert from cents for display
      requestedTotalPrice: item.totalPrice / 100
    }));
    setRevisionItems(items);
    setSelectedQuoteResponse(quoteResponse);
    setIsRevisionDialogOpen(true);
  };

  // Handle submitting revision request
  const handleSubmitRevision = () => {
    const requestData = {
      quoteResponseId: selectedQuoteResponse.id,
      requestedItems: revisionItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        requestedUnitPrice: Math.round(item.requestedUnitPrice * 100), // Convert to cents
        requestedTotalPrice: Math.round(item.requestedTotalPrice * 100)
      })),
      message: revisionMessage
    };
    
    revisionRequestMutation.mutate(requestData);
  };

  // Handle updating revision item prices
  const updateRevisionItem = (index: number, field: string, value: number) => {
    const updatedItems = [...revisionItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate total if unit price or quantity changes
    if (field === 'requestedUnitPrice' || field === 'quantity') {
      updatedItems[index].requestedTotalPrice = updatedItems[index].requestedUnitPrice * updatedItems[index].quantity;
    }
    
    setRevisionItems(updatedItems);
  };

  const handleDownloadPDF = () => {
    if (selectedQuoteResponse) {
      window.open(`/api/quote-responses/${selectedQuoteResponse.id}/pdf`, '_blank');
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount / 100); // Convert from cents
  };

  if (!user) {
    return <div>Yetkilendirme gerekli...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Hizmet Taleplerim</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Hizmet taleplerinizi yönetin ve teklifleri değerlendirin</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap w-full gap-1 h-auto p-1">
            <TabsTrigger value="requests" className="flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[150px] px-4 py-2 text-sm">
              <FileText className="h-4 w-4" />
              Mevcut Talepler
            </TabsTrigger>
            <TabsTrigger value="suggested" className="flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[150px] px-4 py-2 text-sm">
              <Heart className="h-4 w-4" />
              Önerilen Partnerler
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <div className="space-y-6">
              {requestsLoading ? (
                <div className="text-center py-8">Yükleniyor...</div>
              ) : !quoteRequests || quoteRequests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz hizmet talebiniz yok</h3>
                    <p className="text-gray-500 mb-4">Partner kataloğuna göz atın ve hizmet talebi gönderin.</p>
                    <Button>Partner Kataloğuna Git</Button>
                  </CardContent>
                </Card>
              ) : (
                quoteRequests.map((request) => (
                  <Card key={request.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                        <div className="flex items-center gap-3">
                          {request.partner?.logo ? (
                            <img 
                              src={request.partner.logo} 
                              alt={`${request.partner.companyName} Logo`}
                              className="h-12 w-12 rounded-lg object-cover border"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center border">
                              <Building className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg">
                              {request.partner?.companyName}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {request.serviceNeeded || 'Hizmet belirtilmemiş'}
                            </CardDescription>
                          </div>
                        </div>
                        {getStatusBadge(request.responses && request.responses.length > 0 ? 'responded' : (request.status || 'pending'))}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Talep Tarihi: {request.createdAt ? formatDate(request.createdAt) : 'Bilinmiyor'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Bütçe: {request.budget || 'Belirtilmemiş'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Gönderen: {request.fullName}</span>
                        </div>
                      </div>

                      {/* Quote Responses */}
                      {request.responses && request.responses.length > 0 && (
                        <div className="border-t pt-6">
                          <h4 className="font-semibold text-gray-900 mb-4">Alınan Teklifler</h4>
                          <div className="space-y-4">
                            {request.responses.map((response) => (
                              <div key={response.id} className="border rounded-lg p-4 bg-blue-50">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h5 className="font-semibold">{response.title}</h5>
                                    <p className="text-sm text-gray-600 mt-1">{response.description}</p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-green-600">
                                      {response.price} {response.currency}
                                    </div>
                                    {response.deliveryTime && (
                                      <div className="text-sm text-gray-500">
                                        Teslimat: {response.deliveryTime}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {response.terms && (
                                  <div className="bg-white p-3 rounded border mb-3">
                                    <h6 className="font-medium text-sm mb-1">Şartlar:</h6>
                                    <p className="text-sm text-gray-600">{response.terms}</p>
                                  </div>
                                )}

                                {response.status === 'sent' && (
                                  <div className="flex gap-2 mt-4">
                                    <Button
                                      onClick={() => acceptQuoteMutation.mutate(response.id)}
                                      disabled={acceptQuoteMutation.isPending}
                                      className="flex items-center gap-2"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Kabul Et
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          className="flex items-center gap-2"
                                        >
                                          <XCircle className="h-4 w-4" />
                                          Reddet
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Teklifi reddetmek istediğinizden emin misiniz?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Bu işlem geri alınamaz. Partner bilgilendirilecek.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>İptal</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => rejectQuoteMutation.mutate(response.id)}
                                            disabled={rejectQuoteMutation.isPending}
                                          >
                                            Evet, Reddet
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                    <Button
                                      variant="secondary"
                                      className="flex items-center gap-2"
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                      Mesaj Gönder
                                    </Button>
                                  </div>
                                )}

                                {response.status === 'accepted' && (
                                  <div className="mt-4">
                                    <Button className="flex items-center gap-2">
                                      <CreditCard className="h-4 w-4" />
                                      Ödeme Yap
                                    </Button>
                                  </div>
                                )}

                                {response.status === 'rejected' && (
                                  <div className="mt-4">
                                    <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                      <XCircle className="h-3 w-3" />
                                      Reddedildi
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                        {request.responses && request.responses.length > 0 && (
                          <>
                            <Button
                              onClick={() => handleViewQuoteDetails(request.id)}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                              <Eye className="h-4 w-4" />
                              Teklifi Gör
                            </Button>
                            <Button
                              onClick={() => handleRevisionRequest(request.responses[0])}
                              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
                            >
                              <Edit className="h-4 w-4" />
                              Revizyon İste
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Mesaj Gönder
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Suggested Partners Tab */}
          <TabsContent value="suggested">
            <Card>
              <CardHeader>
                <CardTitle>Önerilen Diğer Partnerler</CardTitle>
                <CardDescription>
                  Henüz teklif talep etmediğiniz partnerler
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suggestedLoading ? (
                  <div className="text-center py-8">Yükleniyor...</div>
                ) : !suggestedPartners || suggestedPartners.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Önerilen partner bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500">Tüm partnerlere zaten teklif talebinde bulunmuşsunuz.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suggestedPartners.map((partner) => (
                      <Card key={partner.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{partner.companyName}</CardTitle>
                              <CardDescription>{partner.serviceCategory}</CardDescription>
                            </div>
                            <Badge variant={partner.isActive ? 'default' : 'secondary'}>
                              {partner.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 mb-4">
                            {partner.shortDescription || partner.description?.substring(0, 120) + '...'}
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1">
                              Teklif Talep Et
                            </Button>
                            <Button size="sm" variant="outline">
                              Profil
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Quote Details Dialog */}
      <Dialog open={isQuoteDetailsDialogOpen} onOpenChange={setIsQuoteDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Teklif Detayları</DialogTitle>
          </DialogHeader>
          {selectedQuoteResponse && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Teklif Numarası</Label>
                  <p className="text-lg font-semibold">{selectedQuoteResponse.quoteNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Geçerlilik Tarihi</Label>
                  <p>{selectedQuoteResponse.validUntil ? formatDate(selectedQuoteResponse.validUntil) : 'Belirtilmemiş'}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Başlık</Label>
                <p className="text-lg font-semibold">{selectedQuoteResponse.title}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Açıklama</Label>
                <p className="text-gray-600">{selectedQuoteResponse.description}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Hizmet Kalemleri</Label>
                <div className="space-y-3">
                  {selectedQuoteResponse.items && selectedQuoteResponse.items.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-xs text-gray-500">Hizmet</Label>
                          <p className="font-medium">{item.description}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Miktar</Label>
                          <p>{item.quantity}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Birim Fiyat</Label>
                          <p className="font-semibold">{formatCurrency(item.unitPrice)}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-right">
                        <Label className="text-xs text-gray-500">Toplam</Label>
                        <p className="font-bold text-lg">{formatCurrency(item.totalPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg">
                  <span>Ara Toplam:</span>
                  <span className="font-semibold">{formatCurrency(selectedQuoteResponse.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span>KDV ({selectedQuoteResponse.taxRate / 100}%):</span>
                  <span className="font-semibold">{formatCurrency(selectedQuoteResponse.taxAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-xl font-bold border-t pt-2 mt-2">
                  <span>Genel Toplam:</span>
                  <span className="text-green-600">{formatCurrency(selectedQuoteResponse.totalAmount)}</span>
                </div>
              </div>

              {selectedQuoteResponse.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Notlar</Label>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedQuoteResponse.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button
                  onClick={() => acceptQuoteMutation.mutate(selectedQuoteResponse.id)}
                  disabled={acceptQuoteMutation.isPending}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Kabul Et
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reddet
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Teklifi reddetmek istediğinizden emin misiniz?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bu işlem geri alınamaz. Partner bilgilendirilecek.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>İptal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          rejectQuoteMutation.mutate(selectedQuoteResponse.id);
                          setIsQuoteDetailsDialogOpen(false);
                        }}
                        disabled={rejectQuoteMutation.isPending}
                      >
                        Evet, Reddet
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  PDF İndir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revision Request Dialog */}
      <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revizyon Talebi</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-gray-600">
              Aşağıdaki hizmet kalemleri için önerdiğiniz fiyatları giriniz. Partner bu teklifi inceleyip kabul veya ret edecektir.
            </p>
            
            <div className="space-y-4">
              {revisionItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Hizmet</Label>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-gray-500">Miktar: {item.quantity}</p>
                    </div>
                    <div>
                      <Label htmlFor={`unitPrice-${index}`} className="text-sm font-medium">
                        Önerilen Birim Fiyat (TRY)
                      </Label>
                      <Input
                        id={`unitPrice-${index}`}
                        type="number"
                        step="0.01"
                        value={item.requestedUnitPrice || ''}
                        onChange={(e) => updateRevisionItem(index, 'requestedUnitPrice', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Toplam Fiyat</Label>
                      <p className="text-lg font-bold text-green-600 mt-1">
                        {formatCurrency(Math.round((item.requestedTotalPrice || 0) * 100))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="revisionMessage" className="text-sm font-medium">
                Ek Mesaj (İsteğe Bağlı)
              </Label>
              <Textarea
                id="revisionMessage"
                value={revisionMessage}
                onChange={(e) => setRevisionMessage(e.target.value)}
                placeholder="Revizyon talebiniz ile ilgili ek açıklamalar..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSubmitRevision}
                disabled={revisionRequestMutation.isPending}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
              >
                <Edit className="h-4 w-4" />
                Revizyon Talebini Gönder
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsRevisionDialogOpen(false)}
              >
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}