import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  LogIn,
  MessageSquare,
  FileText,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  Building,
  MapPin,
  Globe,
  ArrowLeft
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface Partner {
  id: number;
  userId: number;
  companyName: string;
  contactPerson: string;
  logo: string;
  description: string;
  serviceCategory: string;
  services: string;
  dipAdvantages: string;
  city: string;
  country: string;
  companySize: string;
  foundingYear: string;
  sectorExperience: string;
  website: string;
  linkedinProfile: string;
  email: string;
  phone: string;
  profileViews: number;
  followersCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PartnerActivity {
  id: number;
  type: 'login' | 'quote_response' | 'profile_update' | 'message_sent';
  description: string;
  details?: string;
  createdAt: string;
}

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
  status: 'pending' | 'responded' | 'accepted' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export default function PartnerInspectionPage() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('statistics');

  // Check admin access
  if (!user || (user.userType !== 'master_admin' && user.userType !== 'editor_admin')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Bu sayfaya erişim yetkiniz bulunmamaktadır
          </h1>
          <p className="text-gray-600">
            Partner inceleme sayfasına erişebilmek için yönetici hesabınızla giriş yapmanız gerekmektedir.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  // Fetch partner data
  const { data: partner, isLoading: partnerLoading } = useQuery<Partner>({
    queryKey: ['/api/admin/partners', partnerId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/partners/${partnerId}`);
      if (!response.ok) throw new Error('Partner bulunamadı');
      return response.json();
    },
    enabled: !!partnerId,
  });

  // Fetch partner activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<PartnerActivity[]>({
    queryKey: ['/api/admin/partner-activities', partnerId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/partner-activities/${partnerId}`);
      if (!response.ok) throw new Error('Aktiviteler yüklenemedi');
      return response.json();
    },
    enabled: !!partnerId,
  });

  // Fetch partner's quote requests
  const { data: quoteRequests = [], isLoading: quotesLoading } = useQuery<QuoteRequest[]>({
    queryKey: ['/api/admin/partner-quotes', partnerId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/partner-quotes/${partnerId}`);
      if (!response.ok) throw new Error('Teklif talepleri yüklenemedi');
      return response.json();
    },
    enabled: !!partnerId,
  });

  if (partnerLoading) {
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

  if (!partner) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Partner Bulunamadı</h1>
          <p className="text-gray-600">İstenen partner mevcut değil veya silinmiş olabilir.</p>
          <Button onClick={() => window.history.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate statistics
  const totalQuotes = quoteRequests.length;
  const pendingQuotes = quoteRequests.filter(q => q.status === 'pending').length;
  const respondedQuotes = quoteRequests.filter(q => q.status === 'responded').length;
  const completedQuotes = quoteRequests.filter(q => q.status === 'completed').length;
  const responseRate = totalQuotes > 0 ? ((totalQuotes - pendingQuotes) / totalQuotes * 100).toFixed(1) : '0';

  // Activity statistics
  const loginActivities = activities.filter(a => a.type === 'login').length;
  const profileUpdates = activities.filter(a => a.type === 'profile_update').length;
  const messagesSent = activities.filter(a => a.type === 'message_sent').length;

  // Chart data
  const activityChartData = [
    { name: 'Giriş', value: loginActivities, color: '#3B82F6' },
    { name: 'Profil Güncelleme', value: profileUpdates, color: '#10B981' },
    { name: 'Mesaj', value: messagesSent, color: '#F59E0B' },
    { name: 'Teklif Yanıtı', value: respondedQuotes, color: '#EF4444' },
  ];

  const quoteStatusData = [
    { name: 'Beklemede', value: pendingQuotes, color: '#F59E0B' },
    { name: 'Yanıtlandı', value: respondedQuotes, color: '#3B82F6' },
    { name: 'Tamamlandı', value: completedQuotes, color: '#10B981' },
  ];

  // Get activity icon and color
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <LogIn className="h-4 w-4 text-blue-600" />;
      case 'quote_response':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'profile_update':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'message_sent':
        return <MessageSquare className="h-4 w-4 text-orange-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-blue-50 border-blue-200';
      case 'quote_response':
        return 'bg-green-50 border-green-200';
      case 'profile_update':
        return 'bg-purple-50 border-purple-200';
      case 'message_sent':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getActivityTitle = (type: string) => {
    switch (type) {
      case 'login':
        return 'Partner giriş yaptı';
      case 'quote_response':
        return 'Teklif talebine yanıt verdi';
      case 'profile_update':
        return 'Profil bilgileri güncellendi';
      case 'message_sent':
        return 'Mesaj gönderdi';
      default:
        return 'Aktivite';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={partner.logo} alt={partner.companyName} />
                <AvatarFallback className="text-xl">
                  {partner.companyName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{partner.companyName}</h1>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {partner.contactPerson} ({partner.email})
                  </div>
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-1" />
                    {partner.serviceCategory}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {partner.city}, {partner.country}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <Badge variant={partner.isActive ? "default" : "secondary"}>
                  {partner.isActive ? 'Aktif' : 'Pasif'}
                </Badge>
                <div className="text-sm text-gray-500 mt-1">
                  Üyelik: {new Date(partner.createdAt).toLocaleDateString('tr-TR')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="statistics">İstatistikler</TabsTrigger>
            <TabsTrigger value="activities">Aktiviteler</TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Toplam Teklif</p>
                      <p className="text-2xl font-bold text-gray-900">{totalQuotes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Yanıt Oranı</p>
                      <p className="text-2xl font-bold text-gray-900">{responseRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <LogIn className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Toplam Giriş</p>
                      <p className="text-2xl font-bold text-gray-900">{loginActivities}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <MessageSquare className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Profil Görüntüleme</p>
                      <p className="text-2xl font-bold text-gray-900">{partner.profileViews || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Aktivite Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={activityChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {activityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center space-x-4 mt-4">
                    {activityChartData.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-600">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quote Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Teklif Durumu</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={quoteStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Quotes */}
            <Card>
              <CardHeader>
                <CardTitle>Son Teklif Talepleri</CardTitle>
              </CardHeader>
              <CardContent>
                {quotesLoading ? (
                  <div className="text-center py-8">Yükleniyor...</div>
                ) : quoteRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Henüz teklif talebi bulunmuyor
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quoteRequests.slice(0, 5).map((quote) => (
                      <div key={quote.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{quote.fullName}</p>
                          <p className="text-sm text-gray-600">{quote.companyName}</p>
                          <p className="text-sm text-gray-500">{quote.serviceNeeded}</p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              quote.status === 'completed' ? 'default' :
                              quote.status === 'responded' ? 'secondary' :
                              quote.status === 'pending' ? 'outline' : 'destructive'
                            }
                          >
                            {quote.status === 'pending' ? 'Beklemede' :
                             quote.status === 'responded' ? 'Yanıtlandı' :
                             quote.status === 'completed' ? 'Tamamlandı' : quote.status}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(quote.createdAt).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detaylı Aktivite Zaman Çizelgesi</CardTitle>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="text-center py-8">Yükleniyor...</div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Henüz aktivite kaydı bulunmuyor
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className={`flex items-start space-x-4 p-4 rounded-lg border ${getActivityColor(activity.type)}`}>
                        <div className="flex-shrink-0 mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">
                              {getActivityTitle(activity.type)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(activity.createdAt).toLocaleString('tr-TR')}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.description}
                          </p>
                          {activity.details && (
                            <p className="text-sm text-gray-500 mt-2 bg-white p-2 rounded border">
                              {activity.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}