import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  Shield, 
  BarChart3,
  TrendingUp,
  Eye,
  MessageCircle,
  Heart,
  Clock,
  MousePointer,
  FileText,
  Target,
  Award
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Statistics() {
  const { user } = useAuth();

  // Mock data - in real app this would come from API
  const userStats = {
    totalUsers: 1248,
    activeUsers: 892,
    newUsersThisMonth: 67,
    averageSessionDuration: '14:32',
    dailyLogins: [
      { date: '01/01', logins: 245 },
      { date: '01/02', logins: 278 },
      { date: '01/03', logins: 312 },
      { date: '01/04', logins: 289 },
      { date: '01/05', logins: 356 },
      { date: '01/06', logins: 401 },
      { date: '01/07', logins: 378 }
    ],
    topInteractions: [
      { partner: 'Markaşef', views: 1245, follows: 89, quotes: 34 },
      { partner: 'TechCorp', views: 967, follows: 67, quotes: 28 },
      { partner: 'LogiFlow', views: 823, follows: 45, quotes: 19 },
      { partner: 'DesignHub', views: 756, follows: 38, quotes: 15 },
      { partner: 'DataSys', views: 634, follows: 29, quotes: 12 }
    ]
  };

  const partnerStats = {
    totalPartners: 89,
    activePartners: 76,
    approvedPartners: 71,
    pendingApprovals: 5,
    averageServices: 4.2,
    totalPosts: 234,
    totalViews: 45678,
    totalFollowers: 2341,
    performanceData: [
      { month: 'Ocak', profileViews: 4234, followers: 189, posts: 45 },
      { month: 'Şubat', profileViews: 5123, followers: 223, posts: 52 },
      { month: 'Mart', profileViews: 4567, followers: 198, posts: 38 },
      { month: 'Nisan', profileViews: 6234, followers: 267, posts: 61 },
      { month: 'Mayıs', profileViews: 5789, followers: 234, posts: 48 },
      { month: 'Haziran', profileViews: 6789, followers: 289, posts: 56 }
    ],
    topPartners: [
      { name: 'Markaşef', views: 8945, followers: 234, posts: 23, engagement: 4.8 },
      { name: 'TechCorp', views: 7234, followers: 189, posts: 19, engagement: 4.6 },
      { name: 'LogiFlow', views: 6123, followers: 156, posts: 15, engagement: 4.2 },
      { name: 'DesignHub', views: 5678, followers: 134, posts: 18, engagement: 4.1 },
      { name: 'DataSys', views: 4567, followers: 98, posts: 12, engagement: 3.9 }
    ]
  };

  const editorStats = {
    totalEditors: 12,
    activeEditors: 9,
    averageActions: 23.4,
    totalApprovals: 156,
    activityData: [
      { editor: 'Ahmet Yılmaz', approvals: 34, rejections: 5, messages: 12 },
      { editor: 'Ayşe Kaya', approvals: 28, rejections: 3, messages: 8 },
      { editor: 'Mehmet Özkan', approvals: 22, rejections: 7, messages: 15 },
      { editor: 'Fatma Şahin', approvals: 19, rejections: 2, messages: 6 },
      { editor: 'Ali Demir', approvals: 16, rejections: 4, messages: 9 }
    ]
  };

  if (user?.userType !== 'master_admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Erişim Reddedildi</h1>
            <p className="text-gray-600 mt-2">Bu sayfaya erişim yetkiniz bulunmuyor.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">İstatistikler</h1>
          <p className="text-gray-600">Platform performansını ve kullanıcı aktivitelerini takip edin.</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Kullanıcılar
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Partnerler
            </TabsTrigger>
            <TabsTrigger value="editors" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Editörler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    +{userStats.newUsersThisMonth} bu ay
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktif Kullanıcı</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    %{((userStats.activeUsers / userStats.totalUsers) * 100).toFixed(1)} aktiflik oranı
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ortalama Oturum</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.averageSessionDuration}</div>
                  <p className="text-xs text-muted-foreground">
                    dakika/oturum
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Günlük Giriş</CardTitle>
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.dailyLogins[userStats.dailyLogins.length - 1].logins}</div>
                  <p className="text-xs text-muted-foreground">
                    son 24 saat
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Günlük Giriş Sayıları</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={userStats.dailyLogins}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="logins" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>En Çok Etkileşim Alan Partnerler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userStats.topInteractions.map((partner, index) => (
                      <div key={partner.partner} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{partner.partner}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {partner.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {partner.follows}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {partner.quotes}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="partners" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Partner</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{partnerStats.totalPartners}</div>
                  <p className="text-xs text-muted-foreground">
                    {partnerStats.pendingApprovals} onay bekliyor
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktif Partner</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{partnerStats.activePartners}</div>
                  <p className="text-xs text-muted-foreground">
                    %{((partnerStats.activePartners / partnerStats.totalPartners) * 100).toFixed(1)} aktiflik oranı
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Paylaşım</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{partnerStats.totalPosts}</div>
                  <p className="text-xs text-muted-foreground">
                    Ortalama {partnerStats.averageServices} hizmet/partner
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Görüntülenme</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{partnerStats.totalViews.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {partnerStats.totalFollowers} toplam takipçi
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Partner Performans Trendi</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={partnerStats.performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="profileViews" stackId="1" stroke="#8884d8" fill="#8884d8" />
                      <Area type="monotone" dataKey="followers" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>En Başarılı Partnerler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {partnerStats.topPartners.map((partner, index) => (
                      <div key={partner.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{partner.name}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {partner.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {partner.followers}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {partner.posts}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Award className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">{partner.engagement}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="editors" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Editör</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{editorStats.totalEditors}</div>
                  <p className="text-xs text-muted-foreground">
                    {editorStats.activeEditors} aktif editör
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ortalama Aktivite</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{editorStats.averageActions}</div>
                  <p className="text-xs text-muted-foreground">
                    günlük aksiyon/editör
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Onay</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{editorStats.totalApprovals}</div>
                  <p className="text-xs text-muted-foreground">
                    bu ay verilen onaylar
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ortalama Yanıt</CardTitle>
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.4h</div>
                  <p className="text-xs text-muted-foreground">
                    yanıt süresi
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Editör Aktivite Performansı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {editorStats.activityData.map((editor, index) => (
                    <div key={editor.editor} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{editor.editor}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              {editor.approvals} Onay
                            </Badge>
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              {editor.rejections} Red
                            </Badge>
                            <Badge variant="outline">
                              {editor.messages} Mesaj
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          {((editor.approvals / (editor.approvals + editor.rejections)) * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-500">Onay Oranı</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
}