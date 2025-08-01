import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { QuoteRequestDetailModal } from "@/components/quote/quote-request-detail-modal";
import { QuoteResponseDialog } from "@/components/quote/quote-response-dialog";
import { PartnerServicesTab } from "@/components/partner-services-tab";
import { QuoteRequest, Partner } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  FileText, 
  Eye, 
  Calendar,
  TrendingUp,
  DollarSign,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Copy,
  Send,
  Activity,
  Timer
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PartnerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedQuoteRequest, setSelectedQuoteRequest] = useState<QuoteRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);


  const { data: partner } = useQuery<Partner>({
    queryKey: ["/api/partners", "me"],
    queryFn: async () => {
      const response = await fetch("/api/partners/me");
      if (!response.ok) throw new Error("Failed to fetch partner data");
      return response.json();
    },
    enabled: !!user && ((user.activeUserType === "partner") || (user.userType === "partner")),
  });

  // Removed updateProfileMutation as it's not used in the current dashboard

  const { data: quoteRequests = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
    enabled: !!user && ((user.activeUserType === "partner") || (user.userType === "partner")),
  });

  // Get partner followers
  const { data: followers = [] } = useQuery({
    queryKey: ["/api/partners/me/followers"],
    enabled: !!user && ((user.activeUserType === "partner") || (user.userType === "partner")) && !!partner,
  });

  const handleViewQuoteDetails = (request: QuoteRequest) => {
    setSelectedQuoteRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleSendQuote = (request: QuoteRequest) => {
    setSelectedQuoteRequest(request);
    setIsResponseDialogOpen(true);
  };



  if (!user || (user.activeUserType || user.userType) !== "partner") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Bu sayfaya erişim yetkiniz bulunmamaktadır
          </h1>
          <p className="text-gray-600">
            Partner paneline erişebilmek için partner hesabınızla giriş yapmanız gerekmektedir.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "responded":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "responded":
        return <MessageSquare className="h-4 w-4" />;
      case "accepted":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Beklemede";
      case "responded":
        return "Yanıtlandı";
      case "accepted":
        return "Kabul Edildi";
      case "rejected":
        return "Reddedildi";
      case "completed":
        return "Tamamlandı";
      default:
        return status;
    }
  };

  const pendingQuotes = quoteRequests.filter(q => q.status === "pending").length;
  const acceptedQuotes = quoteRequests.filter(q => q.status === "accepted").length;
  const completedQuotes = quoteRequests.filter(q => q.status === "completed").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Partner Paneli</h1>
              <p className="text-gray-600 mt-2">
                Hoş geldiniz, {user.firstName} {user.lastName}
              </p>
            </div>
            {partner && (
              <div className="text-right">
                <h2 className="text-xl font-semibold text-gray-900">{partner.companyName}</h2>
                <Badge variant={partner.isApproved ? "default" : "secondary"}>
                  {partner.isApproved ? "Onaylanmış Partner" : "Onay Bekliyor"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="quotes">Teklif Talepleri</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="services">Hizmetler</TabsTrigger>
            <TabsTrigger value="analytics">İstatistikler</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bekleyen Talepler</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingQuotes}</div>
                  <p className="text-xs text-muted-foreground">
                    Yanıt bekleyen teklif talepleri
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Kabul Edilen</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{acceptedQuotes}</div>
                  <p className="text-xs text-muted-foreground">
                    Aktif projeler
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedQuotes}</div>
                  <p className="text-xs text-muted-foreground">
                    Başarıyla tamamlanan projeler
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Takipçiler</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{partner?.followersCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Profilinizi takip eden kullanıcılar
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Profile Statistics and Quote Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Profil İstatistikleri</CardTitle>
                    <CardDescription>
                      Profil ziyaretçileri ve takipçi analizleri
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.location.href = `/partner/${partner?.username || partner?.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Detaylı İncele
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Profile Views Chart */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">Günlük Profil Ziyaretleri</h4>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { date: '28 Tem', visits: Math.floor((partner?.profileViews || 143) * 0.2) },
                              { date: '29 Tem', visits: Math.floor((partner?.profileViews || 143) * 0.25) },
                              { date: '30 Tem', visits: Math.floor((partner?.profileViews || 143) * 0.15) },
                              { date: '31 Tem', visits: Math.floor((partner?.profileViews || 143) * 0.2) },
                              { date: '1 Ağu', visits: Math.floor((partner?.profileViews || 143) * 0.2) }
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" fontSize={10} />
                            <YAxis fontSize={10} />
                            <Tooltip />
                            <Bar dataKey="visits" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Statistics Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{partner?.profileViews || 0}</div>
                        <div className="text-xs text-blue-600">Toplam Ziyaret</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{partner?.followersCount || 0}</div>
                        <div className="text-xs text-green-600">Takipçi Sayısı</div>
                      </div>
                    </div>

                    {/* Followers List Preview */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Son Takipçiler</h4>
                      <div className="space-y-2">
                        {followers.length === 0 ? (
                          <div className="text-center text-sm text-gray-500 py-4">
                            Henüz takipçiniz bulunmuyor
                          </div>
                        ) : (
                          <>
                            {followers.slice(0, 2).map((follower: any) => (
                              <div key={follower.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                <div>
                                  <div className="font-medium">
                                    {follower.firstName} {follower.lastName}
                                  </div>
                                  <div className="text-gray-500">
                                    {follower.company || follower.email.includes('@dip.tc') ? 'DİP Ekibi' : 'Kullanıcı'}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="text-center text-xs text-gray-500 mt-2">
                              Detaylı liste için profil sayfasını ziyaret edin
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Teklif Durumları</CardTitle>
                  <CardDescription>
                    Son gelen teklif talepleri ve durumları
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Recent Quotes Header */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Son Teklifler</h4>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setActiveTab("quotes")}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Detaylı İncele
                      </Button>
                    </div>

                    {/* Recent Quotes List */}
                    {quoteRequests.length === 0 ? (
                      <div className="text-center py-6">
                        <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Henüz teklif talebi bulunmuyor
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {quoteRequests.slice(0, 3).map((quote) => (
                          <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {quote.fullName || 'İsimsiz'}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {quote.companyName || 'Şirket belirtilmemiş'}
                              </div>
                            </div>
                            <Badge className={getStatusColor(quote.status || 'pending')} variant="secondary">
                              {getStatusText(quote.status || 'pending')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Monthly Summary */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-gray-600">Son 30 günde:</span>
                        <span className="font-medium">{quoteRequests.length} teklif talebi</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="text-sm font-bold text-green-600">{acceptedQuotes}</div>
                          <div className="text-xs text-green-600">Kabul</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <div className="text-sm font-bold text-yellow-600">{pendingQuotes}</div>
                          <div className="text-xs text-yellow-600">Bekleyen</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="text-sm font-bold text-blue-600">{completedQuotes}</div>
                          <div className="text-xs text-blue-600">Tamamlanan</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quotes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Teklif Talepleri</CardTitle>
                <CardDescription>
                  Size gelen tüm teklif talepleri ve CRM yönetimi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quoteRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Teklif talebi bulunmuyor
                    </h3>
                    <p className="text-gray-600">
                      Müşteriler sizden teklif talep ettiğinde burada görünecekler.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Şirket</TableHead>
                        <TableHead>Hizmet</TableHead>
                        <TableHead>Bütçe</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteRequests.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {quote.fullName || ''}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center space-x-2">
                                <Mail className="h-3 w-3" />
                                <span>{quote.email || ''}</span>
                              </div>
                              <div className="text-sm text-gray-500 flex items-center space-x-2">
                                <Phone className="h-3 w-3" />
                                <span>{quote.phone || ''}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{quote.companyName || ''}</TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm line-clamp-2">{quote.serviceNeeded || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell>{quote.budget || "Belirtilmemiş"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(quote.status || 'pending')}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(quote.status || 'pending')}
                                <span>{getStatusText(quote.status || 'pending')}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewQuoteDetails(quote)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Detaylar
                              </Button>
                              {(quote.status === "pending" || quote.status === "under_review") && (
                                <Button 
                                  size="sm" 
                                  className="bg-dip-blue hover:bg-dip-dark-blue"
                                  onClick={() => handleSendQuote(quote)}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Teklif Hazırla
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profil Bilgileri</CardTitle>
                <CardDescription>
                  Şirket profilinizi güncelleyin ve yönetin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile URL Display */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium text-gray-700">Mevcut Profil URL'niz:</Label>
                    <div className="mt-2 flex items-center justify-between">
                      <a 
                        href={`/partner/${partner?.username || partner?.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-dip-blue hover:text-dip-dark-blue underline flex-1 mr-4"
                      >
                        {window.location.origin}/partner/{partner?.username || partner?.id}
                      </a>
                      <Button 
                        onClick={() => {
                          const url = `${window.location.origin}/partner/${partner?.username || partner?.id}`;
                          navigator.clipboard.writeText(url).then(() => {
                            toast({
                              title: "Başarılı",
                              description: "URL kopyalandı",
                            });
                          });
                        }}
                        variant="outline"
                        size="sm"
                        className="ml-2"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Profili Paylaş
                      </Button>
                    </div>
                  </div>

                  {/* Company Info Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Şirket Adı</Label>
                      <p className="mt-1 text-gray-900">{partner?.companyName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Kullanıcı Adı</Label>
                      <p className="mt-1 text-gray-900">@{partner?.username || partner?.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">İletişim Kişisi</Label>
                      <p className="mt-1 text-gray-900">{partner?.contactPerson || "Belirtilmemiş"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Hizmet Kategorisi</Label>
                      <p className="mt-1 text-gray-900">{partner?.serviceCategory}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Profil Görüntüleme</Label>
                      <p className="mt-1 text-gray-900">{partner?.profileViews || 0} görüntüleme</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Takipçi Sayısı</Label>
                      <p className="mt-1 text-gray-900">{partner?.followersCount || 0} takipçi</p>
                    </div>
                  </div>

                  {/* Notice about editing */}
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800">
                          Profil Bilgilerini Düzenleme
                        </h3>
                        <p className="mt-1 text-sm text-yellow-700">
                          Kullanıcı adı ve diğer profil bilgilerinizi düzenlemek için yönetici ile iletişime geçiniz. Bu bilgiler sadece yetkili personel tarafından güncellenebilir.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <PartnerServicesTab />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>İstatistikler</CardTitle>
                <CardDescription>
                  Profil performansınızı ve iş analizlerini görüntüleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Detaylı İstatistikler
                  </h3>
                  <p className="text-gray-600">
                    İstatistik özellikleri yakında eklenecektir.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      {/* Quote Request Detail Modal */}
      {selectedQuoteRequest && (
        <QuoteRequestDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedQuoteRequest(null);
          }}
          quoteRequest={selectedQuoteRequest}
        />
      )}

      {/* Quote Response Dialog */}
      {selectedQuoteRequest && (
        <QuoteResponseDialog
          isOpen={isResponseDialogOpen}
          onClose={() => {
            setIsResponseDialogOpen(false);
            setSelectedQuoteRequest(null);
          }}
          quoteRequest={selectedQuoteRequest}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
            setIsResponseDialogOpen(false);
            setSelectedQuoteRequest(null);
            toast({
              title: "Başarılı",
              description: "Teklif başarıyla gönderildi",
            });
          }}
        />
      )}
    </div>
  );
}
