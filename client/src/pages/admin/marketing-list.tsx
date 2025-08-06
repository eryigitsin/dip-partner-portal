import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  RotateCcw,
  Send,
  Eye
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
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignContent, setCampaignContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();

  // Fetch marketing contacts
  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/marketing-contacts'],
  }) as { data: MarketingContact[], isLoading: boolean, refetch: () => void };

  // Fetch newsletter subscribers
  const subscribersQuery = useQuery({
    queryKey: ['/api/admin/newsletter-subscribers'],
  });
  const { data: subscribers = [], isLoading: subscribersLoading } = subscribersQuery as { data: any[], isLoading: boolean };

  // Fetch email templates
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['/api/admin/email-templates'],
  });

  // Sync contacts mutation
  const syncContactsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/sync-marketing-contacts'),
    onSuccess: (data: any) => {
      toast({
        title: "Başarılı!",
        description: `${data.syncedCount || 0} kişi başarıyla senkronize edildi`,
      });
      refetch();
      subscribersQuery.refetch();
      // Refresh page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || 'Senkronizasyon işlemi başarısız',
        variant: "destructive",
      });
    },
  });

  // Send bulk campaign mutation
  const sendCampaignMutation = useMutation({
    mutationFn: (data: { subject: string; content: string; recipients: string[] }) =>
      apiRequest('POST', '/api/admin/send-bulk-campaign', data),
    onSuccess: (data: any) => {
      toast({
        title: "Başarılı!",
        description: `Kampanya ${data.sentCount || 0} kişiye gönderildi`,
      });
      setCampaignSubject('');
      setCampaignContent('');
      setSelectedTemplate('');
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || "Kampanya gönderimi sırasında bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Combine contacts and subscribers for display
  const allData = [...contacts, ...subscribers.map(sub => ({
    ...sub,
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
    title: '',
    website: '',
    linkedinProfile: '',
    userType: 'subscriber',
    source: sub.source || 'homepage',
    tags: [],
    isActive: sub.isActive,
    createdAt: sub.subscribedAt,
    updatedAt: sub.subscribedAt
  }))];

  // Filter contacts based on search and tab
  const filteredContacts = allData.filter((contact: any) => {
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
      (activeTab === 'applicants' && contact.userType === 'applicant') ||
      (activeTab === 'subscribers' && contact.userType === 'subscriber');

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

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find((t: any) => t.id === parseInt(templateId));
    if (template) {
      setCampaignSubject(template.subject);
      setCampaignContent(template.htmlContent);
    }
    setSelectedTemplate(templateId);
  };

  // Send campaign to selected recipients
  const sendCampaign = () => {
    if (!campaignSubject.trim() || !campaignContent.trim()) {
      toast({
        title: "Hata!",
        description: "Konu ve içerik alanları boş olamaz",
        variant: "destructive",
      });
      return;
    }

    const recipients = filteredContacts.map((contact: any) => contact.email).filter(Boolean);
    
    if (recipients.length === 0) {
      toast({
        title: "Hata!",
        description: "Gönderilebilecek e-posta adresi bulunamadı",
        variant: "destructive",
      });
      return;
    }

    sendCampaignMutation.mutate({
      subject: campaignSubject,
      content: campaignContent,
      recipients
    });
  };

  const stats = {
    total: allData.length,
    users: contacts.filter((c: MarketingContact) => c.userType === 'user').length,
    partners: contacts.filter((c: MarketingContact) => c.userType === 'partner').length,
    admins: contacts.filter((c: MarketingContact) => c.userType === 'admin').length,
    applicants: contacts.filter((c: MarketingContact) => c.userType === 'applicant').length,
    subscribers: subscribers.length,
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="h-4 w-4 text-indigo-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.subscribers}</p>
                <p className="text-xs text-gray-500">Abone</p>
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

      {/* Main Tabs */}
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contacts">İletişim Listesi</TabsTrigger>
          <TabsTrigger value="campaign">Toplu Kampanya Gönderimi</TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>İletişim Listesi ({filteredContacts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-6 w-full mb-4">
                  <TabsTrigger value="all">Tümü ({stats.total})</TabsTrigger>
                  <TabsTrigger value="users">Kullanıcılar ({stats.users})</TabsTrigger>
                  <TabsTrigger value="partners">Partnerler ({stats.partners})</TabsTrigger>
                  <TabsTrigger value="admins">Adminler ({stats.admins})</TabsTrigger>
                  <TabsTrigger value="applicants">Başvuranlar ({stats.applicants})</TabsTrigger>
                  <TabsTrigger value="subscribers">Abone ({stats.subscribers})</TabsTrigger>
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
                      filteredContacts.map((contact: any) => (
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
                                contact.userType === 'subscriber' ? 'default' :
                                'outline'
                              }
                            >
                              {contact.userType === 'admin' ? 'Admin' :
                               contact.userType === 'partner' ? 'Partner' :
                               contact.userType === 'applicant' ? 'Başvuran' :
                               contact.userType === 'subscriber' ? 'Abone' :
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
        </TabsContent>

        {/* Campaign Tab */}
        <TabsContent value="campaign" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Toplu Kampanya Gönderimi</CardTitle>
              <CardDescription>
                Tüm e-posta listesine toplu kampanya gönderin. Hedef: {filteredContacts.filter((c: any) => c.email).length} kişi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template-select">Şablon Seçin (Opsiyonel)</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Önceden hazırlanmış şablon seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTemplates.map((template: any) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} - {template.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="campaign-subject">E-posta Konusu</Label>
                <Input
                  id="campaign-subject"
                  placeholder="Kampanya e-posta konusu"
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="campaign-content">E-posta İçeriği</Label>
                <Textarea
                  id="campaign-content"
                  placeholder="Kampanya e-posta içeriği (HTML desteklenir)"
                  value={campaignContent}
                  onChange={(e) => setCampaignContent(e.target.value)}
                  rows={10}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  onClick={() => setPreviewOpen(true)}
                  variant="outline"
                  disabled={!campaignSubject.trim() || !campaignContent.trim()}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Önizle
                </Button>
                
                <Button
                  onClick={sendCampaign}
                  disabled={sendCampaignMutation.isPending || !campaignSubject.trim() || !campaignContent.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendCampaignMutation.isPending ? 'Gönderiliyor...' : `Kampanya Gönder (${filteredContacts.filter((c: any) => c.email).length} kişi)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
      
      {/* Preview Dialog */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Kampanya Önizleme</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)}>×</Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Konu:</Label>
                <p className="font-medium">{campaignSubject}</p>
              </div>
              <div>
                <Label>İçerik:</Label>
                <div 
                  className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900"
                  dangerouslySetInnerHTML={{ __html: campaignContent }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}