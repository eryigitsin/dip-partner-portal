import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Partner, QuoteRequest } from "@shared/schema";
import { 
  BarChart3, 
  Users, 
  Eye, 
  TrendingUp,
  MessageSquare,
  Calendar,
  Award,
  Target
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function PartnerStatisticsPage() {
  const { user } = useAuth();

  const { data: partner, isLoading: partnerLoading } = useQuery<Partner>({
    queryKey: ["/api/partners", "me"],
    queryFn: async () => {
      const response = await fetch("/api/partners/me");
      if (!response.ok) throw new Error("Failed to fetch partner data");
      return response.json();
    },
    enabled: !!user && user.userType === "partner",
  });

  const { data: quoteRequests = [], isLoading: quotesLoading } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
    enabled: !!user && user.userType === "partner",
  });

  if (!user || user.userType !== "partner") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Bu sayfaya erişim yetkiniz bulunmamaktadır
          </h1>
          <p className="text-gray-600">
            Partner istatistik sayfasına erişebilmek için partner hesabınızla giriş yapmanız gerekmektedir.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  if (partnerLoading || quotesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate statistics
  const totalQuotes = quoteRequests.length;
  const pendingQuotes = quoteRequests.filter(q => q.status === 'pending').length;
  const acceptedQuotes = quoteRequests.filter(q => q.status === 'accepted').length;
  const completedQuotes = quoteRequests.filter(q => q.status === 'completed').length;
  const responseRate = totalQuotes > 0 ? ((totalQuotes - pendingQuotes) / totalQuotes * 100).toFixed(1) : 0;

  // Mock data for charts (this would come from real analytics in production)
  const monthlyViews = [
    { month: 'Ocak', views: 234, followers: 12, quotes: 8 },
    { month: 'Şubat', views: 289, followers: 18, quotes: 12 },
    { month: 'Mart', views: 356, followers: 23, quotes: 15 },
    { month: 'Nisan', views: 423, followers: 31, quotes: 19 },
    { month: 'Mayıs', views: 512, followers: 28, quotes: 22 },
    { month: 'Haziran', views: 634, followers: 35, quotes: 26 }
  ];

  const serviceDistribution = [
    { name: 'E-Ticaret', value: 35, color: '#0088FE' },
    { name: 'Pazarlama', value: 25, color: '#00C49F' },
    { name: 'Teknoloji', value: 20, color: '#FFBB28' },
    { name: 'Tasarım', value: 15, color: '#FF8042' },
    { name: 'Diğer', value: 5, color: '#8884d8' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">İstatistikler</h1>
          <p className="text-gray-600 mt-2">Profil performansınızı ve iş analizlerinizi görüntüleyin</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profil Görüntülenme</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{partner?.profileViews || 0}</div>
              <p className="text-xs text-muted-foreground">
                Son 30 günde +12%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Takipçi Sayısı</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{partner?.followersCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Bu ay +{Math.floor(Math.random() * 15 + 5)} yeni takipçi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hizmet Talepleri</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuotes}</div>
              <p className="text-xs text-muted-foreground">
                {pendingQuotes} beklemede
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Yanıt Oranı</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">%{responseRate}</div>
              <p className="text-xs text-muted-foreground">
                Ortalama yanıt süresi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Aylık Performans Trendi</CardTitle>
              <CardDescription>
                Profil görüntülenme, takipçi ve teklif talepleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyViews}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="views" stackId="1" stroke="#8884d8" fill="#8884d8" name="Görüntülenme" />
                  <Area type="monotone" dataKey="quotes" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Teklif Talepleri" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hizmet Talep Dağılımı</CardTitle>
              <CardDescription>
                Kategorilere göre gelen teklif talepleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                <span className="text-sm font-bold text-green-600">%85</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Yanıt Hızı</span>
                <span className="text-sm font-bold text-blue-600">%{responseRate}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${responseRate}%` }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Müşteri Memnuniyeti</span>
                <span className="text-sm font-bold text-purple-600">%92</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '92%' }}></div>
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
                <p className="text-sm text-gray-600">Hedef: 1000 / Mevcut: {partner?.profileViews || 0}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(((partner?.profileViews || 0) / 1000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-medium">Yeni Takipçi</h4>
                <p className="text-sm text-gray-600">Hedef: 50 / Mevcut: 23</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '46%' }}></div>
                </div>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-medium">Tamamlanan Projeler</h4>
                <p className="text-sm text-gray-600">Hedef: 10 / Mevcut: {completedQuotes}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${Math.min((completedQuotes / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

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
        </div>

        {/* Coming Soon Notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Gelişmiş Analitik Özellikleri
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  ROI analizi, müşteri davranış analizi, rekabet analizi ve daha detaylı raporlama özelliklerini yakında kullanabileceksiniz.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}