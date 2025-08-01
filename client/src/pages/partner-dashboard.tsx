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
import { TooltipNoDelay, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip-no-delay";
import { FeedbackModal } from "@/components/feedback/feedback-modal";
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
  ExternalLink,
  Award,
  Target
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PartnerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedQuoteRequest, setSelectedQuoteRequest] = useState<QuoteRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [quotesHelpDismissed, setQuotesHelpDismissed] = useState(() => {
    return localStorage.getItem('quotesHelpDismissed') === 'true';
  });
  const [isUsernameChangeDialogOpen, setIsUsernameChangeDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [performanceHelpDismissed, setPerformanceHelpDismissed] = useState(() => {
    return localStorage.getItem('performanceHelpDismissed') === 'true';
  });

  // Helper functions for performance calculations
  const calculateProfileCompletion = (partner: Partner | undefined) => {
    if (!partner) return 0;
    let score = 0;
    if (partner.logo) score += 25;
    if (partner.coverImage) score += 25;
    if (partner.description) score += 25;
    if (partner.username) score += 25;
    return score;
  };

  const calculateResponseTimeScore = (quoteRequests: QuoteRequest[]) => {
    if (quoteRequests.length === 0) return 100;
    
    let totalScore = 0;
    let responseCount = 0;
    
    quoteRequests.forEach(quote => {
      if (quote.status !== 'pending' && quote.responseTime) {
        responseCount++;
        const responseTimeMinutes = quote.responseTime;
        
        if (responseTimeMinutes <= 30) {
          totalScore += 100;
        } else if (responseTimeMinutes <= 120) {
          totalScore += 85;
        } else if (responseTimeMinutes <= 360) {
          totalScore += 70;
        } else if (responseTimeMinutes <= 720) {
          totalScore += 50;
        } else if (responseTimeMinutes <= 1440) {
          totalScore += 25;
        } else {
          totalScore += 0;
        }
      }
    });
    
    return responseCount > 0 ? Math.round(totalScore / responseCount) : 100;
  };

  const calculateSatisfactionScore = (quoteRequests: QuoteRequest[]) => {
    const ratedQuotes = quoteRequests.filter(quote => quote.satisfactionRating);
    if (ratedQuotes.length === 0) return 92; // Default value when no ratings yet
    
    let totalScore = 0;
    ratedQuotes.forEach(quote => {
      const rating = quote.satisfactionRating!;
      switch (rating) {
        case 5: totalScore += 100; break; // Çok Memnun Kaldım
        case 4: totalScore += 75; break;  // Memnun Kaldım
        case 3: totalScore += 50; break;  // Ortalama
        case 2: totalScore += 25; break;  // Memnun Kalmadım
        case 1: totalScore += 0; break;   // Hiç Memnun Kalmadım
      }
    });
    
    return Math.round(totalScore / ratedQuotes.length);
  };

  const handleDismissPerformanceHelp = () => {
    setPerformanceHelpDismissed(true);
    localStorage.setItem('performanceHelpDismissed', 'true');
  };


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

  // Get partner view statistics
  const { data: viewStats = [] } = useQuery<Array<{date: string, visits: number}>>({
    queryKey: ["/api/partners", partner?.id, "view-stats"],
    queryFn: async () => {
      if (!partner?.id) return [];
      const response = await fetch(`/api/partners/${partner.id}/view-stats?days=7`);
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="quotes">Teklif Talepleri</TabsTrigger>
            <TabsTrigger value="performance">Performans</TabsTrigger>
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
                            data={viewStats.length > 0 ? viewStats : [
                              { date: 'Veri yok', visits: 0 }
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
                              Detaylı istatistikler eklenecektir. Talepleriniz için lütfen "Geribildirim Formu"nu kullanın.
                            </div>
                            <div className="text-center mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsFeedbackModalOpen(true)}
                                className="text-dip-blue border-dip-blue hover:bg-dip-blue hover:text-white"
                              >
                                Geri Bildirim Formu
                              </Button>
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
              <Card className="border-blue-200 bg-blue-50 relative">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-800 mb-2">
                        Nasıl Çalışır?
                      </h3>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Talebi İncele:</strong> Gelen teklif taleplerinin detaylarını "Detaylar" butonuyla görüntüleyin.</p>
                        <p><strong>Teklif Hazırla:</strong> "Teklif Hazırla" butonuyla profesyonel PDF teklif oluşturun.</p>
                        <p><strong>Durum Takibi:</strong> Teklif durumları otomatik güncellenir (Bekleyen, İnceleniyor, Gönderildi).</p>
                      </div>
                    </div>
                    <TooltipNoDelay delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                          onClick={dismissQuotesHelp}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tekrar Gösterilmesin</p>
                      </TooltipContent>
                    </TooltipNoDelay>
                  </div>
                </CardContent>
              </Card>
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



          <TabsContent value="performance" className="space-y-6">
            {/* How It Works Section */}
            {!performanceHelpDismissed && (
              <Card className="border-blue-200 bg-blue-50 relative">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-800 mb-2">
                        Nasıl Çalışır?
                      </h3>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Profil Tamamlama:</strong> Logo (%25), kapak fotoğrafı (%25), açıklama (%25) ve kullanıcı adı (%25) ile hesaplanır.</p>
                        <p><strong>Yanıt Hızı:</strong> Teklif taleplerini ne kadar hızlı yanıtladığınıza göre hesaplanır (30dk içinde %100, 2 saat içinde %85, vb.).</p>
                        <p><strong>Müşteri Memnuniyeti:</strong> Teklif sonrası müşteri anketlerine verilen cevaplara göre hesaplanır (%0-100 arası).</p>
                        <p><strong>Hedefler:</strong> Yönetici tarafından belirlenen aylık hedeflerinizi gösterir. Hedefleriniz için yönetici ile iletişime geçebilirsiniz.</p>
                      </div>
                    </div>
                    <TooltipNoDelay delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                          onClick={handleDismissPerformanceHelp}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tekrar Gösterilmesin</p>
                      </TooltipContent>
                    </TooltipNoDelay>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Scores and Monthly Goals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="mr-2 h-5 w-5" />
                    Performans Skorları
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Profil Tamamlama</span>
                    <span className="text-sm font-bold text-green-600">%{calculateProfileCompletion(partner)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${calculateProfileCompletion(partner)}%` }}></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Yanıt Hızı</span>
                    <span className="text-sm font-bold text-blue-600">%{calculateResponseTimeScore(quoteRequests)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${calculateResponseTimeScore(quoteRequests)}%` }}></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Müşteri Memnuniyeti</span>
                    <span className="text-sm font-bold text-purple-600">%{calculateSatisfactionScore(quoteRequests)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${calculateSatisfactionScore(quoteRequests)}%` }}></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="mr-2 h-5 w-5" />
                    Bu Ay Hedefleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">Profil Görüntülenme</h4>
                    <p className="text-sm text-gray-600">Hedef: {partner?.targetProfileViews || 1000} / Mevcut: {partner?.profileViews || 0}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(((partner?.profileViews || 0) / (partner?.targetProfileViews || 1000)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-medium">Yeni Takipçi</h4>
                    <p className="text-sm text-gray-600">Hedef: {partner?.targetNewFollowers || 50} / Mevcut: {partner?.followersCount || 0}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(((partner?.followersCount || 0) / (partner?.targetNewFollowers || 50)) * 100, 100)}%` }}></div>
                    </div>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-medium">Tamamlanan Projeler</h4>
                    <p className="text-sm text-gray-600">Hedef: {partner?.targetCompletedProjects || 10} / Mevcut: {completedQuotes}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((completedQuotes / (partner?.targetCompletedProjects || 10)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Son Aktiviteler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Yeni teklif talebi alındı</p>
                      <p className="text-xs text-gray-500">2 saat önce</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Proje tamamlandı</p>
                      <p className="text-xs text-gray-500">1 gün önce</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Yeni takipçi kazanıldı</p>
                      <p className="text-xs text-gray-500">2 gün önce</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Profil güncellendi</p>
                      <p className="text-xs text-gray-500">3 gün önce</p>
                    </div>
                  </div>
                </div>
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

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </div>
  );
}
