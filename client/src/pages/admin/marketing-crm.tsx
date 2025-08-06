import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Send, 
  Users, 
  Mail, 
  MessageSquare, 
  Building, 
  Globe, 
  Search, 
  Download, 
  Eye, 
  Plus,
  Trash2,
  Filter
} from 'lucide-react';
import { EmailTemplate, NotificationTemplate } from "@shared/schema";

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

interface CampaignData {
  templateType: string;
  templateId: string;
  targetAudience: string;
  subject: string;
  content: string;
  selectedContacts: number[];
}

export default function MarketingCRM() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States
  const [showCampaignSender, setShowCampaignSender] = useState(false);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    templateType: '',
    templateId: '',
    targetAudience: 'all',
    subject: '',
    content: '',
    selectedContacts: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUserType, setFilterUserType] = useState('all');

  // Fetch data
  const { data: emailTemplates, isLoading: emailLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/admin/email-templates']
  });

  const { data: notificationTemplates, isLoading: notificationLoading } = useQuery<NotificationTemplate[]>({
    queryKey: ['/api/admin/notification-templates']
  });

  const { data: marketingContacts, isLoading: contactsLoading } = useQuery<MarketingContact[]>({
    queryKey: ['/api/admin/marketing-contacts']
  });

  // Mutation for bulk campaign sending
  const bulkCampaignMutation = useMutation({
    mutationFn: (campaignData: CampaignData) => 
      apiRequest('/api/admin/send-bulk-campaign', 'POST', campaignData),
    onSuccess: () => {
      toast({
        title: "Kampanya başarıyla gönderildi!",
        description: "Seçilen alıcılara kampanya mesajları gönderildi.",
      });
      setShowCampaignSender(false);
    },
    onError: () => {
      toast({
        title: "Kampanya gönderiminde hata",
        description: "Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    }
  });

  // Filter contacts
  const filteredContacts = marketingContacts?.filter(contact => {
    const matchesSearch = 
      contact.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterUserType === 'all' || contact.userType === filterUserType;
    
    return matchesSearch && matchesType;
  }) || [];

  const handleSendCampaign = () => {
    if (!campaignData.templateType || !campaignData.subject) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen şablon tipi ve konu alanlarını doldurun.",
        variant: "destructive",
      });
      return;
    }

    let targetContacts = filteredContacts;
    if (campaignData.targetAudience === 'partners') {
      targetContacts = filteredContacts.filter(c => c.userType === 'partner');
    } else if (campaignData.targetAudience === 'users') {
      targetContacts = filteredContacts.filter(c => c.userType === 'user');
    }

    const finalCampaignData = {
      ...campaignData,
      selectedContacts: targetContacts.map(c => c.id)
    };

    bulkCampaignMutation.mutate(finalCampaignData);
  };

  const exportContacts = () => {
    if (!filteredContacts.length) return;
    
    const csvContent = [
      ['Ad', 'Soyad', 'E-posta', 'Telefon', 'Şirket', 'Tip', 'Kaynak', 'Tarih'].join(','),
      ...filteredContacts.map((contact: MarketingContact) => [
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone || '',
        contact.company || '',
        contact.userType,
        contact.source || '',
        new Date(contact.createdAt).toLocaleDateString('tr-TR')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `marketing-contacts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const stats = {
    totalContacts: marketingContacts?.length || 0,
    activeContacts: marketingContacts?.filter(c => c.isActive).length || 0,
    partners: marketingContacts?.filter(c => c.userType === 'partner').length || 0,
    users: marketingContacts?.filter(c => c.userType === 'user').length || 0
  };

  return (
    <>
      <Header />
      <div className="container max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pazarlama & CRM</h1>
            <p className="text-muted-foreground">
              Müşteri ilişkileri yönetimi ve pazarlama kampanyaları
            </p>
          </div>
          <Button 
            onClick={() => setShowCampaignSender(true)}
            data-testid="button-bulk-campaign"
          >
            <Send className="h-4 w-4 mr-2" />
            Toplu Kampanya Gönder
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Users className="h-4 w-4 mr-2" />
              Genel Bakış
            </TabsTrigger>
            <TabsTrigger value="contacts" data-testid="tab-contacts">
              <Building className="h-4 w-4 mr-2" />
              Kişiler
            </TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">
              <Mail className="h-4 w-4 mr-2" />
              Kampanyalar
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <MessageSquare className="h-4 w-4 mr-2" />
              Analitik
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Kişi</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalContacts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktif Kişiler</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.activeContacts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Partnerler</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.partners}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Kullanıcılar</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats.users}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    data-testid="input-contacts-search"
                    placeholder="Kişi ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={filterUserType} onValueChange={setFilterUserType}>
                  <SelectTrigger className="w-48" data-testid="select-user-type-filter">
                    <SelectValue placeholder="Tip filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="user">Kullanıcılar</SelectItem>
                    <SelectItem value="partner">Partnerler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                onClick={exportContacts}
                data-testid="button-export-contacts"
              >
                <Download className="h-4 w-4 mr-2" />
                Dışa Aktar
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad Soyad</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Şirket</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Kaynak</TableHead>
                      <TableHead>Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Yükleniyor...
                        </TableCell>
                      </TableRow>
                    ) : filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Kişi bulunamadı
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </TableCell>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell>{contact.company || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={contact.userType === 'partner' ? 'default' : 'secondary'}>
                              {contact.userType === 'partner' ? 'Partner' : 'Kullanıcı'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={contact.isActive ? 'default' : 'destructive'}>
                              {contact.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </TableCell>
                          <TableCell>{contact.source || '-'}</TableCell>
                          <TableCell>
                            {new Date(contact.createdAt).toLocaleDateString('tr-TR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Son Kampanyalar</CardTitle>
                <CardDescription>
                  Gönderilen pazarlama kampanyalarının özeti
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Henüz kampanya gönderilmemiş. Toplu kampanya gönder butonunu kullanarak başlayın.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kampanya Analitikleri</CardTitle>
                <CardDescription>
                  E-posta açılma oranları ve tıklama istatistikleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Analitik verileri yakında kullanıma sunulacak.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bulk Campaign Sender Dialog */}
        <Dialog open={showCampaignSender} onOpenChange={setShowCampaignSender}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Toplu Kampanya Gönder
              </DialogTitle>
              <DialogDescription>
                Seçilen hedef kitleye e-posta veya bildirim kampanyası gönderin
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateType">Şablon Tipi</Label>
                  <Select 
                    value={campaignData.templateType} 
                    onValueChange={(value) => setCampaignData(prev => ({ ...prev, templateType: value }))}
                  >
                    <SelectTrigger data-testid="select-template-type">
                      <SelectValue placeholder="Şablon tipi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">E-posta Şablonu</SelectItem>
                      <SelectItem value="notification">Bildirim Şablonu</SelectItem>
                      <SelectItem value="sms">SMS Şablonu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {campaignData.templateType === 'email' && (
                  <div>
                    <Label htmlFor="emailTemplate">E-posta Şablonu</Label>
                    <Select 
                      value={campaignData.templateId}
                      onValueChange={(value) => setCampaignData(prev => ({ ...prev, templateId: value }))}
                    >
                      <SelectTrigger data-testid="select-email-template">
                        <SelectValue placeholder="E-posta şablonu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTemplates?.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {campaignData.templateType === 'notification' && (
                  <div>
                    <Label htmlFor="notificationTemplate">Bildirim Şablonu</Label>
                    <Select 
                      value={campaignData.templateId}
                      onValueChange={(value) => setCampaignData(prev => ({ ...prev, templateId: value }))}
                    >
                      <SelectTrigger data-testid="select-notification-template">
                        <SelectValue placeholder="Bildirim şablonu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationTemplates?.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="targetAudience">Hedef Kitle</Label>
                  <Select 
                    value={campaignData.targetAudience}
                    onValueChange={(value) => setCampaignData(prev => ({ ...prev, targetAudience: value }))}
                  >
                    <SelectTrigger data-testid="select-target-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Kişiler</SelectItem>
                      <SelectItem value="partners">Sadece Partnerler</SelectItem>
                      <SelectItem value="users">Sadece Kullanıcılar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Konu</Label>
                  <Input
                    id="subject"
                    data-testid="input-campaign-subject"
                    placeholder="Kampanya konusu"
                    value={campaignData.subject}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="content">İçerik Önizlemesi</Label>
                  <Textarea
                    id="content"
                    data-testid="textarea-campaign-content"
                    placeholder="Kampanya içeriği otomatik olarak seçilen şablondan alınacak"
                    value={campaignData.content}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, content: e.target.value }))}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Hedef Kitle Özeti:</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {campaignData.targetAudience === 'all' ? 'Tüm kişiler' : 
                     campaignData.targetAudience === 'partners' ? 'Sadece partnerler' : 
                     'Sadece kullanıcılar'} 
                    - Toplam: {
                      campaignData.targetAudience === 'all' ? stats.totalContacts :
                      campaignData.targetAudience === 'partners' ? stats.partners :
                      stats.users
                    } kişi
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCampaignSender(false)}>
                İptal
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Önizle
                </Button>
                <Button 
                  onClick={handleSendCampaign}
                  disabled={bulkCampaignMutation.isPending}
                  data-testid="button-send-campaign"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {bulkCampaignMutation.isPending ? 'Gönderiliyor...' : 'Kampanyayı Gönder'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Footer />
    </>
  );
}