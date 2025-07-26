import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Heart
} from 'lucide-react';
import { QuoteRequest, QuoteResponse, Partner } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function ServiceRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');

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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!user) {
    return <div>Yetkilendirme gerekli...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Hizmet Taleplerim</h1>
            <p className="text-gray-600 mt-2">Hizmet taleplerinizi yönetin ve teklifleri değerlendirin</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Mevcut Talepler
            </TabsTrigger>
            <TabsTrigger value="suggested" className="flex items-center gap-2">
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
                    <CardHeader className="bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            {request.partner?.companyName}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {request.serviceNeeded}
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                          <span className="text-sm">Şirket: {request.company}</span>
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
                      <div className="flex gap-2 mt-6 pt-4 border-t">
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
      
      <Footer />
    </div>
  );
}