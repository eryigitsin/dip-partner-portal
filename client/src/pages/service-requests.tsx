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
  Download,
  UserCheck,
  HandHeart,
  X
} from 'lucide-react';
import { QuoteRequest, QuoteResponse, Partner } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

// Utility function to clean HTML tags from text
const cleanHTMLTags = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

// Function to get smart badge based on user-partner interaction
const getSmartBadge = (partner: any, userInteractions: any) => {
  const interaction = userInteractions?.find((i: any) => i.partnerId === partner.id);
  
  if (interaction?.hasPaidForService || interaction?.hasWorkedTogether) {
    return { text: 'Çalıştın', variant: 'default', icon: HandHeart };
  }
  if (interaction?.hasMessaged) {
    return { text: 'İletişime Geçtin', variant: 'secondary', icon: MessageCircle };
  }
  if (interaction?.isFollowing) {
    return { text: 'Takip Ediyorsun', variant: 'outline', icon: UserCheck };
  }
  if (interaction?.hasVisitedProfile) {
    return { text: 'İnceledin', variant: 'outline', icon: Eye };
  }
  
  return { text: 'Aktif', variant: partner.isActive ? 'default' : 'secondary', icon: null };
};

export default function ServiceRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');
  const [selectedQuoteResponse, setSelectedQuoteResponse] = useState<any>(null);
  const [isQuoteDetailsDialogOpen, setIsQuoteDetailsDialogOpen] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
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

  // Fetch user-partner interactions for smart badges
  const { data: userInteractions } = useQuery({
    queryKey: ['/api/user/partner-interactions'],
    enabled: !!user && activeTab === 'suggested',
  });

  // Fetch user's previous quote requests to show info cards
  const { data: userQuoteHistory } = useQuery({
    queryKey: ['/api/user/quote-history'],
    enabled: !!user && activeTab === 'suggested',
  });

  // Dismiss info card mutation
  const dismissCardMutation = useMutation({
    mutationFn: async ({ cardType, referenceId }: { cardType: string; referenceId: number }) => {
      const res = await apiRequest('POST', '/api/user/dismiss-info-card', {
        cardType,
        referenceId,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      setDismissedCards(prev => new Set([...prev, `${variables.cardType}-${variables.referenceId}`]));
      toast({
        title: 'Bilgi',
        description: 'Kart gizlendi.',
      });
    },
  });

  // Accept quote response mutation
  const acceptQuoteMutation = useMutation({
    mutationFn: async (responseId: number) => {
      const res = await apiRequest('PUT', `/api/quote-responses/${responseId}/status`, {
        status: 'accepted'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/quote-requests'] });
      setIsQuoteDetailsDialogOpen(false);
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
      const res = await apiRequest('PUT', `/api/quote-responses/${responseId}/status`, {
        status: 'rejected'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/quote-requests'] });
      setIsQuoteDetailsDialogOpen(false);
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
      case 'quote_sent':
        return <Badge className="flex items-center gap-1 bg-blue-600">
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
      case 'cancelled':
        return <Badge variant="outline" className="flex items-center gap-1 text-gray-600 border-gray-400">
          <XCircle className="h-3 w-3" />
          İptal Edildi
        </Badge>;
      case 'expired':
        return <Badge variant="outline" className="flex items-center gap-1 text-orange-600 border-orange-400">
          <Clock className="h-3 w-3" />
          Süresi Doldu
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Handle downloading PDF
  const handleDownloadPDF = async (responseId: number) => {
    try {
      const res = await fetch(`/api/quote-responses/${responseId}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('PDF download failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `teklif-${responseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Hata',
        description: 'PDF indirilirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  // Handle opening revision dialog
  const handleRevisionRequest = (quoteResponse: any) => {
    if (quoteResponse.items) {
      try {
        let items;

        // Handle both string and object formats
        if (typeof quoteResponse.items === 'string') {
          items = JSON.parse(quoteResponse.items);
        } else if (Array.isArray(quoteResponse.items)) {
          items = quoteResponse.items;
        } else {
          throw new Error('Invalid items format');
        }

        if (Array.isArray(items) && items.length > 0) {
          setRevisionItems(items.map((item: any) => ({
            ...item,
            requestedUnitPrice: (item.unitPrice || 0) / 100, // Convert from cents for display
            requestedTotalPrice: (item.totalPrice || 0) / 100
          })));
        } else {
          throw new Error('No items found in quote response');
        }
      } catch (error) {
        console.error('Error parsing quote items:', error, 'Quote response:', quoteResponse);
        // Create a default item based on quote response data
        setRevisionItems([{
          description: quoteResponse.title || 'Hizmet açıklaması mevcut değil',
          quantity: 1,
          unitPrice: (quoteResponse.totalAmount || 0) / 100,
          totalPrice: (quoteResponse.totalAmount || 0) / 100,
          requestedUnitPrice: (quoteResponse.totalAmount || 0) / 100,
          requestedTotalPrice: (quoteResponse.totalAmount || 0) / 100
        }]);
      }
    } else {
      // If no items, create a default item from the quote total
      setRevisionItems([{
        description: quoteResponse.title || 'Hizmet açıklaması mevcut değil',
        quantity: 1,
        unitPrice: (quoteResponse.totalAmount || 0) / 100,
        totalPrice: (quoteResponse.totalAmount || 0) / 100,
        requestedUnitPrice: (quoteResponse.totalAmount || 0) / 100,
        requestedTotalPrice: (quoteResponse.totalAmount || 0) / 100
      }]);
    }
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
                              {request.partner?.companyName || 'Partner Bilgisi Yok'}
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
                                      {formatCurrency(response.totalAmount)}
                                    </div>
                                    {response.validUntil && (
                                      <div className="text-sm text-gray-500">
                                        Geçerlilik: {formatDate(response.validUntil)}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {response.notes && (
                                  <div className="bg-white p-3 rounded border mb-3">
                                    <h6 className="font-medium text-sm mb-1">Notlar:</h6>
                                    <p className="text-sm text-gray-600">{response.notes}</p>
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

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                        {request.responses && request.responses.length > 0 ? (
                          <>
                            <Button
                              onClick={() => {
                                setSelectedQuoteResponse(request.responses[0]);
                                setIsQuoteDetailsDialogOpen(true);
                              }}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                              <Eye className="h-4 w-4" />
                              Teklifi Gör
                            </Button>

                            {request.responses[0].status !== 'accepted' && request.responses[0].status !== 'rejected' && (
                              <Button
                                onClick={() => handleRevisionRequest(request.responses[0])}
                                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
                              >
                                <Edit className="h-4 w-4" />
                                Revizyon İste
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Mesaj Gönder
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Mesaj Gönder
                          </Button>
                        )}
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
                    {suggestedPartners.map((partner) => {
                      const smartBadge = getSmartBadge(partner, userInteractions);
                      const BadgeIcon = smartBadge.icon;
                      const hasRequestedQuote = userQuoteHistory?.some((req: any) => req.partnerId === partner.id && !req.hasWorkedTogether);
                      const cardDismissKey = `previous_quote_request-${partner.id}`;
                      const isCardDismissed = dismissedCards.has(cardDismissKey);
                      
                      return (
                        <div key={partner.id} className="space-y-3">
                          {/* Dismissible Info Card for Previous Quote Requests */}
                          {hasRequestedQuote && !isCardDismissed && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 relative">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                onClick={() => dismissCardMutation.mutate({ cardType: 'previous_quote_request', referenceId: partner.id })}
                                data-testid={`dismiss-info-card-${partner.id}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <div className="flex items-center gap-2 text-blue-700 text-sm">
                                <MessageCircle className="h-4 w-4" />
                                <span className="font-medium">Daha önce teklif talep ettin</span>
                              </div>
                              <p className="text-blue-600 text-xs mt-1">Bu partnerden daha önce teklif almıştın.</p>
                            </div>
                          )}
                          
                          {/* Partner Card */}
                          <Card className="hover:shadow-md transition-shadow">
                            <CardHeader>
                              <div className="flex items-start gap-3">
                                {/* Partner Logo */}
                                <div className="flex-shrink-0">
                                  {partner.logo ? (
                                    <img
                                      src={partner.logo}
                                      alt={`${partner.companyName} logo`}
                                      className="w-12 h-12 object-contain rounded-lg border border-gray-200"
                                      data-testid={`partner-logo-${partner.id}`}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                      <Building className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-lg truncate">{partner.companyName}</CardTitle>
                                  <CardDescription className="truncate">{partner.serviceCategory}</CardDescription>
                                </div>
                                
                                {/* Smart Badge */}
                                <Badge 
                                  variant={smartBadge.variant as any} 
                                  className="flex-shrink-0"
                                  data-testid={`smart-badge-${partner.id}`}
                                >
                                  <div className="flex items-center gap-1">
                                    {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
                                    {smartBadge.text}
                                  </div>
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-600 mb-4 line-clamp-3" data-testid={`partner-description-${partner.id}`}>
                                {cleanHTMLTags(partner.shortDescription || partner.description || '')?.substring(0, 120) + 
                                 (cleanHTMLTags(partner.shortDescription || partner.description || '')?.length > 120 ? '...' : '')}
                              </p>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1"
                                  onClick={() => window.open(`https://partner.dip.tc/partner/${partner.username}`, '_blank')}
                                  data-testid={`view-profile-${partner.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Profili Görüntüle
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
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
                  {selectedQuoteResponse.items && (typeof selectedQuoteResponse.items === 'string' ? JSON.parse(selectedQuoteResponse.items) : selectedQuoteResponse.items).map((item: any, index: number) => (
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
                {selectedQuoteResponse.status === 'accepted' ? (
                  <Button
                    disabled
                    className="flex items-center gap-2 bg-green-600 opacity-75 cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Kabul Edildi
                  </Button>
                ) : selectedQuoteResponse.status === 'rejected' ? (
                  <Button
                    disabled
                    variant="destructive"
                    className="flex items-center gap-2 opacity-75 cursor-not-allowed"
                  >
                    <XCircle className="h-4 w-4" />
                    ✓ Reddedildi
                  </Button>
                ) : selectedQuoteResponse.status === 'cancelled' ? (
                  <div className="text-gray-500 italic p-2">
                    Bu teklif partner tarafından iptal edilmiştir.
                  </div>
                ) : selectedQuoteResponse.status === 'expired' ? (
                  <div className="text-orange-600 italic p-2">
                    Bu teklifin süresi doldu. Şartlar değişmiş olabilir. Lütfen iş ortağı ile iletişime geçin.
                  </div>
                ) : (
                  <>
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
                  </>
                )}
                <Button
                  onClick={() => handleDownloadPDF(selectedQuoteResponse.id)}
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