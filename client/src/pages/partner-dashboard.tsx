import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { QuoteRequestDetailModal } from "@/components/quote/quote-request-detail-modal";
import { QuoteResponseDialog } from "@/components/quote/quote-response-dialog";
import { QuoteEditForm } from "@/components/quote/quote-edit-form";
import { PartnerServicesTab } from "@/components/partner-services-tab";
import { PartnerMarketsTab } from "@/components/partner-markets-tab";
import { RecipientAccountsSection } from "@/components/recipient-accounts-section";
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
  Target,
  Download
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
  const [selectedRevisionRequest, setSelectedRevisionRequest] = useState<any>(null);
  const [isRevisionDetailsDialogOpen, setIsRevisionDetailsDialogOpen] = useState(false);
  const [performanceHelpDismissed, setPerformanceHelpDismissed] = useState(() => {
    return localStorage.getItem('performanceHelpDismissed') === 'true';
  });
  const [selectedQuoteResponse, setSelectedQuoteResponse] = useState<any>(null);
  const [isQuoteDetailsDialogOpen, setIsQuoteDetailsDialogOpen] = useState(false);
  const [selectedPaymentConfirmation, setSelectedPaymentConfirmation] = useState<any>(null);
  const [isPaymentConfirmationDialogOpen, setIsPaymentConfirmationDialogOpen] = useState(false);
  const [isEditingQuoteResponse, setIsEditingQuoteResponse] = useState(false);
  const [isPaymentInstructionsDialogOpen, setIsPaymentInstructionsDialogOpen] = useState(false);
  const [selectedRecipientAccount, setSelectedRecipientAccount] = useState<any>(null);
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [manualAccountData, setManualAccountData] = useState({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    iban: '',
    swiftCode: ''
  });
  const [isNewAccountDialogOpen, setIsNewAccountDialogOpen] = useState(false);

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

  // Get revision requests for this partner
  const { data: revisionRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/partner/revision-requests"],
    enabled: !!user && ((user.activeUserType === "partner") || (user.userType === "partner")),
  });

  // Get recipient accounts for payment instructions
  const { data: recipientAccounts = [] } = useQuery<any[]>({
    queryKey: ["/api/partner/recipient-accounts"],
    enabled: !!user && ((user.activeUserType === "partner") || (user.userType === "partner")),
  });

  // Fetch payment confirmations for partner
  const { data: paymentConfirmations = [] } = useQuery<any[]>({
    queryKey: ["/api/partner/payment-confirmations"],
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

  // Payment instructions mutation
  const sendPaymentInstructionsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/partner/send-payment-instructions', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Ödeme bilgileri kullanıcıya gönderildi."
      });
      setIsPaymentInstructionsDialogOpen(false);
      setSelectedRecipientAccount(null);
      setManualAccountData({
        bankName: '',
        accountHolderName: '',
        accountNumber: '',
        iban: '',
        swiftCode: ''
      });
      setPaymentInstructions('');
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Ödeme bilgileri gönderilemedi"
      });
    }
  });

  const handleSendPaymentInstructions = () => {
    if (!selectedQuoteResponse) return;

    const accountData = selectedRecipientAccount || manualAccountData;
    
    if (!accountData.bankName || !accountData.accountHolderName || !accountData.iban) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Banka, Alıcı Adı ve IBAN bilgileri zorunludur"
      });
      return;
    }

    const data = {
      quoteResponseId: selectedQuoteResponse.id,
      accountData,
      instructions: paymentInstructions,
      saveAccount: !selectedRecipientAccount // Save as new account if manually entered
    };

    sendPaymentInstructionsMutation.mutate(data);
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

  // Payment confirmation approval/rejection mutation
  const paymentConfirmationMutation = useMutation({
    mutationFn: async ({ confirmationId, status, note }: { confirmationId: number; status: 'confirmed' | 'rejected'; note?: string }) => {
      return await apiRequest('PATCH', `/api/payment-confirmations/${confirmationId}`, { status, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/payment-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quote-requests'] });
      setIsPaymentConfirmationDialogOpen(false);
      toast({
        title: 'Başarılı',
        description: 'Ödeme durumu güncellendi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Ödeme durumu güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  const handleViewQuoteDetails = (request: QuoteRequest) => {
    setSelectedQuoteRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleSendQuote = (request: QuoteRequest) => {
    setSelectedQuoteRequest(request);
    setIsResponseDialogOpen(true);
  };

  const handleViewQuoteResponse = async (quote: QuoteRequest) => {
    try {
      // First get the quote response for this request
      const response = await fetch(`/api/quote-requests/${quote.id}/response`);
      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Hata", 
          description: "Teklif yanıtı bulunamadı"
        });
        return;
      }
      
      const quoteResponse = await response.json();
      setSelectedQuoteResponse({ ...quoteResponse, quoteRequest: quote });
      setIsQuoteDetailsDialogOpen(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Teklif görüntülenirken bir hata oluştu"
      });
    }
  };

  const handleCancelQuoteResponse = async (quoteResponse: any) => {
    if (!confirm("Bu teklifi iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      return;
    }

    try {
      const response = await fetch(`/api/quote-responses/${quoteResponse.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel quote');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      setIsQuoteDetailsDialogOpen(false);
      setSelectedQuoteResponse(null);
      
      toast({
        title: "Başarılı",
        description: "Teklif başarıyla iptal edildi"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Teklif iptal edilirken hata oluştu"
      });
    }
  };

  const handleDownloadPDF = () => {
    if (selectedQuoteResponse) {
      window.open(`/api/quote-responses/${selectedQuoteResponse.id}/pdf`, '_blank');
    }
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
      case "quote_sent":
        return "bg-green-100 text-green-800";
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
      case "quote_sent":
        return <Send className="h-4 w-4" />;
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
      case "quote_sent":
        return "Teklif Gönderildi";
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

  // Helper function to check if a quote has pending revision requests
  const getQuoteRevisionStatus = (quoteId: number) => {
    const relevantRevisions = revisionRequests.filter((rev: any) => 
      rev.quoteRequest.id === quoteId && rev.status === 'pending'
    );
    return relevantRevisions.length > 0 ? relevantRevisions[0] : null;
  };

  // Handle viewing revision request details
  const handleViewRevisionRequest = (revisionRequest: any) => {
    setSelectedRevisionRequest(revisionRequest);
    setIsRevisionDetailsDialogOpen(true);
  };

  // Handle accepting/rejecting revision requests
  const revisionStatusMutation = useMutation({
    mutationFn: async ({ revisionId, status, updatedQuoteResponse }: { revisionId: number, status: string, updatedQuoteResponse?: any }) => {
      const response = await fetch(`/api/revision-requests/${revisionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, updatedQuoteResponse })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update revision request');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/revision-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      setIsRevisionDetailsDialogOpen(false);
      setSelectedRevisionRequest(null);
      toast({
        title: "Başarılı",
        description: "Revizyon talebi yanıtlandı"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Revizyon talebi yanıtlanırken hata oluştu"
      });
    }
  });

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
            <TabsTrigger value="performance">Performans</TabsTrigger>
            <TabsTrigger value="services">Hizmetler</TabsTrigger>
            <TabsTrigger value="markets">Pazarlar</TabsTrigger>
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
                            <div className="text-center text-xs text-gray-500 mt-2">Detaylı istatistikler eklenecektir. Talepleriniz için lütfen "Geri Bildirim Formu"nu kullanın.</div>
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
                            {(() => {
                              const revisionRequest = getQuoteRevisionStatus(quote.id);
                              if (revisionRequest && quote.status === 'quote_sent') {
                                return (
                                  <div className="space-y-1">
                                    <Badge className={getStatusColor(quote.status || 'pending')}>
                                      <div className="flex items-center space-x-1">
                                        {getStatusIcon(quote.status || 'pending')}
                                        <span>{getStatusText(quote.status || 'pending')}</span>
                                      </div>
                                    </Badge>
                                    <Badge 
                                      className="bg-orange-100 text-orange-800 cursor-pointer hover:bg-orange-200" 
                                      onClick={() => handleViewRevisionRequest(revisionRequest)}
                                    >
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Revizyon Talep Edildi
                                    </Badge>
                                  </div>
                                );
                              }
                              return (
                                <Badge className={getStatusColor(quote.status || 'pending')}>
                                  <div className="flex items-center space-x-1">
                                    {getStatusIcon(quote.status || 'pending')}
                                    <span>{getStatusText(quote.status || 'pending')}</span>
                                  </div>
                                </Badge>
                              );
                            })()}
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
                              {(quote.status === "quote_sent" || quote.status === "accepted") && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewQuoteResponse(quote)}
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Teklifi Gör
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

            {/* Payment Confirmations Section */}
            {paymentConfirmations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Ödeme Onayları
                  </CardTitle>
                  <CardDescription>
                    Müşterilerden gelen ödeme bildirimlerini onaylayın veya reddedin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Ödeme Yöntemi</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentConfirmations.map((confirmation) => (
                        <TableRow key={confirmation.id}>
                          <TableCell>
                            <div className="font-medium">{confirmation.user?.fullName || 'İsimsiz'}</div>
                            <div className="text-sm text-gray-500">{confirmation.user?.email}</div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ₺{(confirmation.amount / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {confirmation.paymentMethod === 'card' && 'Kredi/Banka Kartı'}
                              {confirmation.paymentMethod === 'transfer' && 'Havale/EFT'}
                              {confirmation.paymentMethod === 'other' && 'Diğer Yöntemler'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(confirmation.createdAt).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                confirmation.status === 'confirmed' ? 'default' : 
                                confirmation.status === 'rejected' ? 'destructive' : 
                                'secondary'
                              }
                            >
                              {confirmation.status === 'pending' && 'Bekleyen'}
                              {confirmation.status === 'confirmed' && 'Onaylandı'}
                              {confirmation.status === 'rejected' && 'Reddedildi'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {confirmation.status === 'pending' ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setSelectedPaymentConfirmation(confirmation);
                                    setIsPaymentConfirmationDialogOpen(true);
                                  }}
                                  data-testid={`button-confirm-payment-${confirmation.id}`}
                                >
                                  Onayla
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (window.confirm('Bu ödeme bildirimini reddetmek istediğinizden emin misiniz?')) {
                                      paymentConfirmationMutation.mutate({
                                        confirmationId: confirmation.id,
                                        status: 'rejected',
                                        note: 'Partner tarafından reddedildi'
                                      });
                                    }
                                  }}
                                  data-testid={`button-reject-payment-${confirmation.id}`}
                                >
                                  Reddet
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedPaymentConfirmation(confirmation);
                                    setIsPaymentConfirmationDialogOpen(true);
                                  }}
                                  data-testid={`button-view-payment-${confirmation.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Detay
                                </Button>
                                {confirmation.receiptFileUrl && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(confirmation.receiptFileUrl, '_blank')}
                                    data-testid={`button-view-receipt-${confirmation.id}`}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Dekont
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Recipient Account Information Section */}
            <Card>
              <CardHeader>
                <CardTitle>Alıcı Hesabı Bilgileri</CardTitle>
                <CardDescription>
                  Ödeme almak için hesap bilgilerinizi ekleyin ve yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecipientAccountsSection partnerId={partner?.id} />
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

          <TabsContent value="markets" className="space-y-6">
            <PartnerMarketsTab />
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
        source="partner"
      />
      
      {/* Quote Details Dialog */}
      {selectedQuoteResponse && (
        <Dialog open={isQuoteDetailsDialogOpen} onOpenChange={setIsQuoteDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Gönderilen Teklif Detayları
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingQuoteResponse(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Düzenle
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    PDF İndir
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            {isEditingQuoteResponse ? (
              <QuoteEditForm 
                quoteResponse={selectedQuoteResponse}
                onSave={async (updatedQuoteData) => {
                  try {
                    const response = await fetch(`/api/quote-responses/${selectedQuoteResponse.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(updatedQuoteData)
                    });

                    if (!response.ok) {
                      throw new Error('Failed to update quote');
                    }

                    const updatedQuote = await response.json();
                    setSelectedQuoteResponse({ ...updatedQuote, quoteRequest: selectedQuoteResponse.quoteRequest });
                    setIsEditingQuoteResponse(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
                    toast({
                      title: "Başarılı",
                      description: "Teklif başarıyla güncellendi ve müşteriye bildirim gönderildi"
                    });
                  } catch (error: any) {
                    toast({
                      variant: "destructive",
                      title: "Hata",
                      description: error.message || "Teklif güncellenirken hata oluştu"
                    });
                  }
                }}
                onCancel={() => setIsEditingQuoteResponse(false)}
              />
            ) : (
            <div className="space-y-6">
              {/* Quote Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Teklif Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Teklif Numarası</label>
                      <p className="text-sm font-medium">{selectedQuoteResponse.quoteNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Başlık</label>
                      <p className="text-sm">{selectedQuoteResponse.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Geçerlilik Tarihi</label>
                      <p className="text-sm">{new Date(selectedQuoteResponse.validUntil).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Durum</label>
                      <div className="mt-1">
                        <Badge variant={selectedQuoteResponse.status === 'accepted' ? 'default' : 'secondary'}>
                          {selectedQuoteResponse.status === 'pending' && 'Beklemede'}
                          {selectedQuoteResponse.status === 'accepted' && 'Kabul Edildi'}
                          {selectedQuoteResponse.status === 'rejected' && 'Reddedildi'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Müşteri Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Müşteri Adı</label>
                      <p className="text-sm">{selectedQuoteResponse.quoteRequest?.fullName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">E-posta</label>
                      <p className="text-sm">{selectedQuoteResponse.quoteRequest?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Telefon</label>
                      <p className="text-sm">{selectedQuoteResponse.quoteRequest?.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Şirket</label>
                      <p className="text-sm">{selectedQuoteResponse.quoteRequest?.company || 'Belirtilmemiş'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quote Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Teklif Kalemleri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedQuoteResponse.items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-gray-600">Miktar: {item.quantity} {item.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₺{(item.unitPrice / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-sm text-gray-600">Birim fiyat</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium">₺{(item.totalPrice / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-sm text-gray-600">Toplam</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mali Özet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Ara Toplam</span>
                      <span className="text-sm font-medium">₺{(selectedQuoteResponse.subtotal / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">KDV (%{selectedQuoteResponse.taxRate})</span>
                      <span className="text-sm font-medium">₺{(selectedQuoteResponse.taxAmount / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold">Genel Toplam</span>
                        <span className="text-lg font-semibold text-blue-600">₺{(selectedQuoteResponse.totalAmount / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedQuoteResponse.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notlar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedQuoteResponse.notes}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Expiration Message for Partner */}
              {selectedQuoteResponse.status === 'expired' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 mr-2" />
                    <div className="text-orange-800">
                      <p className="font-medium">Teklifin süresi doldu</p>
                      <p className="text-sm mt-1">
                        İsterseniz güncelleme yapıp geçerlilik tarihini değiştirebilir veya yeni şartlarla yeniden gönderebilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Action Footer */}
              <div className="flex justify-between items-center pt-6 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelQuoteResponse(selectedQuoteResponse)}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Teklifi İptal Et
                  </Button>
                  <Button
                    onClick={() => {
                      // Auto-select first account if available
                      if (recipientAccounts.length > 0) {
                        setSelectedRecipientAccount(recipientAccounts[0]);
                      } else {
                        setSelectedRecipientAccount(null);
                        // Clear manual data only if no accounts exist
                        setManualAccountData({
                          bankName: '',
                          accountHolderName: '',
                          accountNumber: '',
                          iban: '',
                          swiftCode: ''
                        });
                      }
                      setIsPaymentInstructionsDialogOpen(true);
                    }}
                    size="sm"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4" />
                    Havale / EFT Bilgisi Gönder
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsQuoteDetailsDialogOpen(false)}
                >
                  Kapat
                </Button>
              </div>
            </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Revision Request Details Dialog */}
      {selectedRevisionRequest && (
        <Dialog open={isRevisionDetailsDialogOpen} onOpenChange={setIsRevisionDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
                Revizyon Talebi Detayları
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Customer and Quote Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Müşteri ve Teklif Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Müşteri</label>
                      <p className="text-sm font-medium">{selectedRevisionRequest.quoteRequest?.firstName} {selectedRevisionRequest.quoteRequest?.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">E-posta</label>
                      <p className="text-sm">{selectedRevisionRequest.quoteRequest?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Teklif Numarası</label>
                      <p className="text-sm">{selectedRevisionRequest.quoteResponse?.quoteNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Talep Tarihi</label>
                      <p className="text-sm">{new Date(selectedRevisionRequest.createdAt).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Message */}
              {selectedRevisionRequest.message && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Müşteri Mesajı</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedRevisionRequest.message}</p>
                  </CardContent>
                </Card>
              )}

              {/* Requested Changes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Talep Edilen Değişiklikler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedRevisionRequest.requestedItems?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-gray-600">Miktar: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-orange-600">₺{(item.requestedUnitPrice / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-sm text-gray-600">Talep edilen birim fiyat</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium text-orange-600">₺{(item.requestedTotalPrice / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-sm text-gray-600">Talep edilen toplam</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="destructive"
                  onClick={() => revisionStatusMutation.mutate({ 
                    revisionId: selectedRevisionRequest.id, 
                    status: 'rejected' 
                  })}
                  disabled={revisionStatusMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reddet
                </Button>
                <Button
                  onClick={() => {
                    // Accept revision and update quote with new pricing
                    const updatedItems = selectedRevisionRequest.requestedItems.map((item: any) => ({
                      ...item,
                      unitPrice: item.requestedUnitPrice,
                      totalPrice: item.requestedTotalPrice
                    }));
                    
                    const subtotal = updatedItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
                    const taxRate = selectedRevisionRequest.quoteResponse.taxRate || 2000;
                    const taxAmount = Math.round(subtotal * taxRate / 10000);
                    const totalAmount = subtotal + taxAmount;

                    const updatedQuoteResponse = {
                      items: updatedItems,
                      subtotal,
                      taxAmount,
                      totalAmount,
                      updatedAt: new Date()
                    };

                    revisionStatusMutation.mutate({ 
                      revisionId: selectedRevisionRequest.id, 
                      status: 'accepted',
                      updatedQuoteResponse
                    });
                  }}
                  disabled={revisionStatusMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Kabul Et ve Fiyatları Güncelle
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Instructions Dialog */}
      <Dialog open={isPaymentInstructionsDialogOpen} onOpenChange={setIsPaymentInstructionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Havale / EFT Bilgisi Gönder</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Account Selection */}
            <div className="space-y-3">
              <Label>Alıcı Hesabı Seçin</Label>
              <Select 
                value={selectedRecipientAccount?.id?.toString() || ""} 
                onValueChange={(value) => {
                  if (value === "new_account") {
                    setSelectedRecipientAccount(null);
                    // Clear manual data when switching to new account
                    setManualAccountData({
                      bankName: '',
                      accountHolderName: '',
                      accountNumber: '',
                      iban: '',
                      swiftCode: ''
                    });
                  } else {
                    const account = recipientAccounts.find(acc => acc.id.toString() === value);
                    setSelectedRecipientAccount(account);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={selectedRecipientAccount ? undefined : (!selectedRecipientAccount && (manualAccountData.bankName || manualAccountData.accountHolderName || manualAccountData.iban) ? "+ Yeni Hesap Ekle" : "Kayıtlı hesaplarınızdan seçin...")} />
                </SelectTrigger>
                <SelectContent>
                  {recipientAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.accountName}
                    </SelectItem>
                  ))}
                  <SelectItem value="new_account" className="text-blue-600 font-medium">
                    + Yeni Hesap Ekle
                  </SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>

            {/* Account Details Form */}
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Banka *</Label>
                  <Input 
                    value={selectedRecipientAccount?.bankName || manualAccountData.bankName} 
                    onChange={(e) => !selectedRecipientAccount && setManualAccountData(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="Banka adı"
                    readOnly={!!selectedRecipientAccount}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Alıcı Adı *</Label>
                  <Input 
                    value={selectedRecipientAccount?.accountHolderName || manualAccountData.accountHolderName} 
                    onChange={(e) => !selectedRecipientAccount && setManualAccountData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                    placeholder="Hesap sahibinin adı"
                    readOnly={!!selectedRecipientAccount}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Hesap No</Label>
                  <Input 
                    value={selectedRecipientAccount?.accountNumber || manualAccountData.accountNumber} 
                    onChange={(e) => !selectedRecipientAccount && setManualAccountData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Hesap numarası"
                    readOnly={!!selectedRecipientAccount}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">IBAN *</Label>
                  <Input 
                    value={selectedRecipientAccount?.iban || manualAccountData.iban} 
                    onChange={(e) => !selectedRecipientAccount && setManualAccountData(prev => ({ ...prev, iban: e.target.value }))}
                    placeholder="TR123456789012345678901234"
                    readOnly={!!selectedRecipientAccount}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">SWIFT Kodu</Label>
                  <Input 
                    value={selectedRecipientAccount?.swiftCode || manualAccountData.swiftCode} 
                    onChange={(e) => !selectedRecipientAccount && setManualAccountData(prev => ({ ...prev, swiftCode: e.target.value }))}
                    placeholder="SWIFT kodu (opsiyonel)"
                    readOnly={!!selectedRecipientAccount}
                  />
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div>
              <Label className="text-sm font-medium">Ödeme Yönergeleri</Label>
              <Textarea
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="Buraya kullanıcı için ödeme yönergeleri yazın."
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsPaymentInstructionsDialogOpen(false)}
              >
                İptal
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!selectedRecipientAccount && (!manualAccountData.bankName || !manualAccountData.accountHolderName || !manualAccountData.iban)}
                onClick={() => handleSendPaymentInstructions()}
              >
                <Send className="h-4 w-4 mr-2" />
                Havale / EFT Bilgisi Gönder
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Detail Dialog */}
      {selectedPaymentConfirmation && (
        <Dialog open={isPaymentConfirmationDialogOpen} onOpenChange={setIsPaymentConfirmationDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Ödeme Onayı Detayları
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Müşteri</Label>
                  <p className="mt-1 font-medium">{selectedPaymentConfirmation.user?.fullName || 'İsimsiz'}</p>
                  <p className="text-sm text-gray-500">{selectedPaymentConfirmation.user?.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Tutar</Label>
                  <p className="mt-1 text-xl font-bold text-green-600">
                    ₺{(selectedPaymentConfirmation.amount / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Ödeme Yöntemi</Label>
                  <p className="mt-1">
                    {selectedPaymentConfirmation.paymentMethod === 'card' && 'Kredi/Banka Kartı'}
                    {selectedPaymentConfirmation.paymentMethod === 'transfer' && 'Havale/EFT'}
                    {selectedPaymentConfirmation.paymentMethod === 'other' && 'Diğer Yöntemler'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Tarih</Label>
                  <p className="mt-1">
                    {new Date(selectedPaymentConfirmation.createdAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Receipt */}
              {selectedPaymentConfirmation.receiptFileUrl && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Dekont/Makbuz</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {selectedPaymentConfirmation.receiptFileName || 'Dekont dosyası'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(selectedPaymentConfirmation.receiptFileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        İndir
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Note */}
              {selectedPaymentConfirmation.note && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Müşteri Notu</Label>
                  <div className="mt-2 p-3 border rounded-lg bg-blue-50">
                    <p className="text-sm text-blue-800">{selectedPaymentConfirmation.note}</p>
                  </div>
                </div>
              )}

              {/* Partner Notes */}
              {selectedPaymentConfirmation.partnerNotes && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">İş Ortağı Notları</Label>
                  <div className="mt-2 p-3 border rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-700">{selectedPaymentConfirmation.partnerNotes}</p>
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Durum</Label>
                <div className="mt-2">
                  <Badge 
                    variant={
                      selectedPaymentConfirmation.status === 'confirmed' ? 'default' : 
                      selectedPaymentConfirmation.status === 'rejected' ? 'destructive' : 
                      'secondary'
                    }
                    className="text-sm"
                  >
                    {selectedPaymentConfirmation.status === 'pending' && 'Bekleyen'}
                    {selectedPaymentConfirmation.status === 'confirmed' && 'Onaylandı'}
                    {selectedPaymentConfirmation.status === 'rejected' && 'Reddedildi'}
                  </Badge>
                </div>
              </div>

              {/* Action Buttons for Pending Confirmations */}
              {selectedPaymentConfirmation.status === 'pending' && (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm('Bu ödeme bildirimini reddetmek istediğinizden emin misiniz?')) {
                        paymentConfirmationMutation.mutate({
                          confirmationId: selectedPaymentConfirmation.id,
                          status: 'rejected',
                          note: 'Partner tarafından reddedildi'
                        });
                      }
                    }}
                    disabled={paymentConfirmationMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reddet
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      paymentConfirmationMutation.mutate({
                        confirmationId: selectedPaymentConfirmation.id,
                        status: 'confirmed',
                        note: 'Partner tarafından onaylandı'
                      });
                    }}
                    disabled={paymentConfirmationMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Ödemeyi Onayla
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
