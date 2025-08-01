import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Timer,
  X,
  Edit,
  ExternalLink
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PartnerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedQuoteRequest, setSelectedQuoteRequest] = useState<QuoteRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [quotesHelpDismissed, setQuotesHelpDismissed] = useState(() => {
    return localStorage.getItem('quotesHelpDismissed') === 'true';
  });
  const [isUsernameChangeDialogOpen, setIsUsernameChangeDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");


  const { data: partner } = useQuery<Partner>({
    queryKey: ["/api/partners", user?.id],
    queryFn: async () => {
      // Fetch all partners and find the one belonging to current user
      const response = await fetch("/api/partners");
      if (!response.ok) {
        throw new Error("Failed to fetch partners");
      }
      const partners = await response.json();
      const userPartner = partners.find((p: Partner) => p.userId === user?.id);
      if (!userPartner) {
        throw new Error("Partner profile not found");
      }
      return userPartner;
    },
    enabled: !!user && ((user.activeUserType === "partner") || (user.userType === "partner")),
  });

  // Removed updateProfileMutation as it's not used in the current dashboard

  const { data: quoteRequests = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
    enabled: !!user && ((user.activeUserType === "partner") || (user.userType === "partner")),
  });

  // Username change mutation
  const changeUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      const response = await fetch("/api/partners/me/username", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: newUsername })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update username");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kullanıcı adınız güncellendi"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners", user?.id] });
      setIsUsernameChangeDialogOpen(false);
      setNewUsername("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Kullanıcı adı güncellenemedi"
      });
    }
  });

  const handleUsernameChange = () => {
    if (!newUsername.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kullanıcı adı boş olamaz"
      });
      return;
    }
    changeUsernameMutation.mutate(newUsername.trim());
  };

  const copyProfileUrl = () => {
    const profileUrl = `${window.location.origin}/partner/${partner?.username || partner?.id}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Kopyalandı",
      description: "Profil URL'niz panoya kopyalandı"
    });
  };

  // Get partner followers  
  const { data: followers = [] } = useQuery({
    queryKey: ["/api/partners", partner?.id, "followers"],
    queryFn: async () => {
      if (!partner?.id) return [];
      const response = await fetch(`/api/partners/${partner.id}/followers`);
      if (!response.ok) return [];
      return response.json();
    },
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

  const dismissQuotesHelp = () => {
    setQuotesHelpDismissed(true);
    localStorage.setItem('quotesHelpDismissed', 'true');
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="quotes">Teklif Talepleri</TabsTrigger>
            <TabsTrigger value="services">Hizmetler</TabsTrigger>
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

            {/* Profile URL Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Profil URL'niz
                </CardTitle>
                <CardDescription>
                  Profilinizin herkese açık bağlantısı. Bu URL'yi paylaşarak profilinize yönlendirebilirsiniz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <code className="flex-1 text-sm">
                    {window.location.origin}/partner/{partner?.username || partner?.id}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyProfileUrl}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Kopyala
                  </Button>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-sm font-medium">
                      Kullanıcı adınız: <span className="font-mono">{partner?.username || 'Belirlenmemiş'}</span>
                    </p>
                    {partner?.usernameChanged ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Kullanıcı adı bir kez değiştirilebilir. Bir talebiniz varsa yönetici ile iletişime geçin.
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 mt-1">
                        Kullanıcı adınızı henüz değiştirebilirsiniz
                      </p>
                    )}
                  </div>
                  
                  {!partner?.usernameChanged && (
                    <Dialog open={isUsernameChangeDialogOpen} onOpenChange={setIsUsernameChangeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Değiştir
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Kullanıcı Adını Değiştir</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="username">Yeni Kullanıcı Adı</Label>
                            <Input
                              id="username"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              placeholder="yeni-kullanici-adi"
                              pattern="[a-zA-Z0-9_-]+"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Sadece İngilizce harfler, rakamlar, alt çizgi ve tire kullanabilirsiniz
                            </p>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => setIsUsernameChangeDialogOpen(false)}
                            >
                              İptal
                            </Button>
                            <Button
                              onClick={handleUsernameChange}
                              disabled={changeUsernameMutation.isPending}
                            >
                              {changeUsernameMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>

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
                        {(followers as any[]).length === 0 ? (
                          <div className="text-center text-sm text-gray-500 py-4">
                            Henüz takipçiniz bulunmuyor
                          </div>
                        ) : (
                          <>
                            {(followers as any[]).slice(0, 2).map((follower: any) => (
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
            {/* Instructions for Quotes */}
            {!quotesHelpDismissed && (
              <div className="bg-green-50 p-4 rounded-lg relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-green-100"
                  title="Artık Gösterme"
                  onClick={dismissQuotesHelp}
                >
                  <X className="h-4 w-4" />
                </Button>
                <h4 className="font-medium text-green-900 mb-2">Nasıl Çalışır?</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• <strong>Talebi İncele:</strong> Gelen teklif taleplerinin detaylarını "Detaylar" butonuyla görüntüleyin.</li>
                  <li>• <strong>Teklif Hazırla:</strong> "Teklif Hazırla" butonuyla profesyonel PDF teklif oluşturun.</li>
                  <li>• <strong>Durum Takibi:</strong> Teklif durumları otomatik güncellenir (Bekleyen, İnceleniyor, Gönderildi).</li>
                </ul>
              </div>
            )}
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



          <TabsContent value="services" className="space-y-6">
            <PartnerServicesTab />
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
