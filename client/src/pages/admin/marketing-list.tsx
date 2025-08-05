import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Download, 
  Mail,
  Phone,
  Building,
  Globe,
  Linkedin,
  Tag,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

interface MarketingContact {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  title: string;
  website: string;
  linkedinProfile: string;
  userType: string;
  source: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function MarketingListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  // Fetch marketing contacts
  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/marketing-contacts'],
  }) as { data: MarketingContact[], isLoading: boolean, refetch: () => void };

  // Sync contacts mutation
  const syncContactsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/sync-marketing-contacts'),
    onSuccess: (data: any) => {
      toast({
        title: "Başarılı!",
        description: data?.message || 'Pazarlama listesi başarıyla senkronize edildi',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || 'Senkronizasyon işlemi başarısız',
        variant: "destructive",
      });
    },
  });

  // Filter contacts based on search and tab
  const filteredContacts = contacts.filter((contact: MarketingContact) => {
    const matchesSearch = 
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = 
      activeTab === 'all' ||
      (activeTab === 'users' && contact.userType === 'user') ||
      (activeTab === 'partners' && contact.userType === 'partner') ||
      (activeTab === 'admins' && contact.userType === 'admin') ||
      (activeTab === 'applicants' && contact.userType === 'applicant');

    return matchesSearch && matchesTab;
  });

  // Export contacts as CSV
  const exportToCSV = () => {
    const headers = [
      'E-posta', 'Ad', 'Soyad', 'Telefon', 'Şirket', 'Ünvan', 
      'Website', 'LinkedIn', 'Kullanıcı Tipi', 'Kaynak', 'Etiketler', 
      'Aktif', 'Kayıt Tarihi'
    ];
    
    const csvData = filteredContacts.map((contact: MarketingContact) => [
      contact.email || '',
      contact.firstName || '',
      contact.lastName || '',
      contact.phone || '',
      contact.company || '',
      contact.title || '',
      contact.website || '',
      contact.linkedinProfile || '',
      contact.userType || '',
      contact.source || '',
      (contact.tags || []).join('; '),
      contact.isActive ? 'Evet' : 'Hayır',
      new Date(contact.createdAt).toLocaleDateString('tr-TR')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pazarlama_listesi_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const stats = {
    total: contacts.length,
    users: contacts.filter((c: MarketingContact) => c.userType === 'user').length,
    partners: contacts.filter((c: MarketingContact) => c.userType === 'partner').length,
    admins: contacts.filter((c: MarketingContact) => c.userType === 'admin').length,
    applicants: contacts.filter((c: MarketingContact) => c.userType === 'applicant').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Pazarlama & CRM</h1>
        <p className="text-gray-600">
          Resend API ile senkronize edilen tüm iletişim bilgileri ve pazarlama listesi yönetimi
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-blue-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-500">Toplam İletişim</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.users}</p>
                <p className="text-xs text-gray-500">Kullanıcılar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Building className="h-4 w-4 text-purple-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.partners}</p>
                <p className="text-xs text-gray-500">Partnerler</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-red-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.admins}</p>
                <p className="text-xs text-gray-500">Adminler</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-orange-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.applicants}</p>
                <p className="text-xs text-gray-500">Başvuranlar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Liste Yönetimi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="E-posta, ad, şirket ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-72"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={exportToCSV}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV İndir
              </Button>
              
              <Button 
                onClick={() => syncContactsMutation.mutate()}
                disabled={syncContactsMutation.isPending}
                size="sm"
              >
                {syncContactsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Senkronize Et
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>İletişim Listesi ({filteredContacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 w-full mb-4">
              <TabsTrigger value="all">Tümü ({stats.total})</TabsTrigger>
              <TabsTrigger value="users">Kullanıcılar ({stats.users})</TabsTrigger>
              <TabsTrigger value="partners">Partnerler ({stats.partners})</TabsTrigger>
              <TabsTrigger value="admins">Adminler ({stats.admins})</TabsTrigger>
              <TabsTrigger value="applicants">Başvuranlar ({stats.applicants})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İletişim Bilgileri</TableHead>
                      <TableHead>Şirket</TableHead>
                      <TableHead>Sosyal Ağlar</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Kaynak</TableHead>
                      <TableHead>Etiketler</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Yükleniyor...
                        </TableCell>
                      </TableRow>
                    ) : filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Hiç iletişim bulunamadı
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((contact: MarketingContact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {contact.firstName} {contact.lastName}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Mail className="h-3 w-3 mr-1" />
                                {contact.email}
                              </div>
                              {contact.phone && (
                                <div className="flex items-center text-sm text-gray-500">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {contact.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-1">
                              {contact.company && (
                                <div className="flex items-center text-sm">
                                  <Building className="h-3 w-3 mr-1" />
                                  {contact.company}
                                </div>
                              )}
                              {contact.title && (
                                <div className="text-sm text-gray-500">
                                  {contact.title}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex space-x-2">
                              {contact.website && (
                                <a 
                                  href={contact.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <Globe className="h-4 w-4" />
                                </a>
                              )}
                              {contact.linkedinProfile && (
                                <a 
                                  href={contact.linkedinProfile} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <Linkedin className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge 
                              variant={
                                contact.userType === 'admin' ? 'destructive' :
                                contact.userType === 'partner' ? 'default' :
                                contact.userType === 'applicant' ? 'secondary' :
                                'outline'
                              }
                            >
                              {contact.userType === 'admin' ? 'Admin' :
                               contact.userType === 'partner' ? 'Partner' :
                               contact.userType === 'applicant' ? 'Başvuran' :
                               'Kullanıcı'}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {contact.source === 'registration' ? 'Kayıt' :
                               contact.source === 'partner_application' ? 'Partner Başvuru' :
                               contact.source === 'admin_sync' ? 'Admin Senkronizasyon' :
                               contact.source}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {contact.tags?.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <Tag className="h-2 w-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {contact.tags?.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{contact.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant={contact.isActive ? 'default' : 'secondary'}>
                              {contact.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {new Date(contact.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
      <Footer />
    </div>
  );
}