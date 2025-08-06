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
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Eye,
  X,
  Plus,
  Edit,
  Trash2,
  Layout,
  MessageSquare,
  Bell
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

interface CampaignEmailTemplate {
  id: number;
  name: string;
  subject: string;
  htmlContent: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CampaignSmsTemplate {
  id: number;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CampaignNotificationTemplate {
  id: number;
  name: string;
  title: string;
  content: string;
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
  
  // Multi-channel campaign states
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['email']);
  const [selectedTargetGroups, setSelectedTargetGroups] = useState<string[]>(['all']);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [smsTemplate, setSmsTemplate] = useState('');
  const [notificationTemplate, setNotificationTemplate] = useState('');
  const [smsContent, setSmsContent] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationContent, setNotificationContent] = useState('');

  // Campaign template management states
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [templateType, setTemplateType] = useState<'email' | 'sms' | 'notification'>('email');
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState<any>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testingTemplate, setTestingTemplate] = useState<any>(null);
  const [testEmail, setTestEmail] = useState('');
  const { toast } = useToast();

  // Campaign template queries
  const { data: campaignEmailTemplates } = useQuery({
    queryKey: ["/api/admin/campaign-email-templates"],
  });

  const { data: campaignSmsTemplates } = useQuery({
    queryKey: ["/api/admin/campaign-sms-templates"],
  });

  const { data: campaignNotificationTemplates } = useQuery({
    queryKey: ["/api/admin/campaign-notification-templates"],
  });

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

  // Fetch SMS templates  
  const { data: smsTemplates = [] } = useQuery({
    queryKey: ['/api/admin/sms-templates'],
  });

  // Fetch notification templates
  const { data: notificationTemplates = [] } = useQuery({
    queryKey: ['/api/admin/notification-templates'],
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
    mutationFn: (data: any) =>
      apiRequest('POST', '/api/admin/send-bulk-campaign', data),
    onSuccess: (data: any) => {
      let message = '';
      if (data.channels) {
        // Multi-channel response
        message = `Kampanya başarıyla gönderildi: ${data.sentCount} toplam gönderim`;
        if (data.results) {
          const details = [];
          if (data.results.email.sent > 0) details.push(`${data.results.email.sent} e-posta`);
          if (data.results.sms.sent > 0) details.push(`${data.results.sms.sent} SMS`);
          if (data.results.notification.sent > 0) details.push(`${data.results.notification.sent} bildirim`);
          if (details.length > 0) {
            message += ` (${details.join(', ')})`;
          }
        }
      } else {
        // Legacy single-channel response
        message = `Kampanya ${data.sentCount || 0} kişiye gönderildi`;
      }
      
      toast({
        title: "Başarılı!",
        description: message,
      });
      
      // Reset form states
      setCampaignSubject('');
      setCampaignContent('');
      setSelectedTemplate('');
      setSmsContent('');
      setNotificationTitle('');
      setNotificationContent('');
      setEmailTemplate('');
      setSmsTemplate('');
      setNotificationTemplate('');
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || "Kampanya gönderimi sırasında bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Campaign template mutations
  const createEmailTemplateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/campaign-email-templates', data),
    onSuccess: () => {
      toast({ title: "E-posta şablonu oluşturuldu", description: "Şablon başarıyla kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-email-templates"] });
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon oluşturulamadı", variant: "destructive" });
    },
  });

  const createSmsTemplateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/campaign-sms-templates', data),
    onSuccess: () => {
      toast({ title: "SMS şablonu oluşturuldu", description: "Şablon başarıyla kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-sms-templates"] });
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon oluşturulamadı", variant: "destructive" });
    },
  });

  const createNotificationTemplateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/campaign-notification-templates', data),
    onSuccess: () => {
      toast({ title: "Bildirim şablonu oluşturuldu", description: "Şablon başarıyla kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-notification-templates"] });
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon oluşturulamadı", variant: "destructive" });
    },
  });

  // Update template mutations
  const updateEmailTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/admin/campaign-email-templates/${id}`, data),
    onSuccess: () => {
      toast({ title: "E-posta şablonu güncellendi", description: "Şablon başarıyla kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-email-templates"] });
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon güncellenemedi", variant: "destructive" });
    },
  });

  const updateSmsTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/admin/campaign-sms-templates/${id}`, data),
    onSuccess: () => {
      toast({ title: "SMS şablonu güncellendi", description: "Şablon başarıyla kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-sms-templates"] });
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon güncellenemedi", variant: "destructive" });
    },
  });

  const updateNotificationTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/admin/campaign-notification-templates/${id}`, data),
    onSuccess: () => {
      toast({ title: "Bildirim şablonu güncellendi", description: "Şablon başarıyla kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-notification-templates"] });
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon güncellenemedi", variant: "destructive" });
    },
  });

  const deleteEmailTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/campaign-email-templates/${id}`),
    onSuccess: () => {
      toast({ title: "E-posta şablonu silindi", description: "Şablon kaldırıldı" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-email-templates"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon silinemedi", variant: "destructive" });
    },
  });

  const deleteSmsTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/campaign-sms-templates/${id}`),
    onSuccess: () => {
      toast({ title: "SMS şablonu silindi", description: "Şablon kaldırıldı" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-sms-templates"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon silinemedi", variant: "destructive" });
    },
  });

  const deleteNotificationTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/campaign-notification-templates/${id}`),
    onSuccess: () => {
      toast({ title: "Bildirim şablonu silindi", description: "Şablon kaldırıldı" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-notification-templates"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon silinemedi", variant: "destructive" });
    },
  });

  // Test template mutation
  const testTemplateMutation = useMutation({
    mutationFn: (data: { type: string; templateId: number; email?: string }) =>
      apiRequest('POST', '/api/admin/test-template', data),
    onSuccess: () => {
      toast({
        title: "Başarılı!",
        description: "Test mesajı başarıyla gönderildi",
      });
      setShowTestDialog(false);
      setTestEmail('');
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || 'Test mesajı gönderilirken hata oluştu',
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const resetTemplateForm = () => {
    setTemplateName('');
    setTemplateSubject('');
    setTemplateContent('');
    setTemplateTitle('');
    setEditingTemplate(null);
    setShowTemplateCreator(false);
  };

  const handleCreateTemplate = () => {
    if (!templateName || !templateContent) {
      toast({ title: "Hata", description: "Şablon adı ve içerik gereklidir", variant: "destructive" });
      return;
    }

    const baseData = {
      name: templateName,
      content: templateContent
    };

    if (templateType === 'email') {
      if (!templateSubject) {
        toast({ title: "Hata", description: "E-posta konusu gereklidir", variant: "destructive" });
        return;
      }
      
      const emailData = {
        ...baseData,
        subject: templateSubject,
        htmlContent: templateContent
      };

      if (editingTemplate) {
        updateEmailTemplateMutation.mutate({ id: editingTemplate.id, data: emailData });
      } else {
        createEmailTemplateMutation.mutate(emailData);
      }
    } else if (templateType === 'sms') {
      if (editingTemplate) {
        updateSmsTemplateMutation.mutate({ id: editingTemplate.id, data: baseData });
      } else {
        createSmsTemplateMutation.mutate(baseData);
      }
    } else if (templateType === 'notification') {
      if (!templateTitle) {
        toast({ title: "Hata", description: "Bildirim başlığı gereklidir", variant: "destructive" });
        return;
      }
      
      const notificationData = {
        name: templateName,
        title: templateTitle,
        content: templateContent
      };

      if (editingTemplate) {
        updateNotificationTemplateMutation.mutate({ id: editingTemplate.id, data: notificationData });
      } else {
        createNotificationTemplateMutation.mutate(notificationData);
      }
    }
  };

  const handleDeleteTemplate = (template: any, type: 'email' | 'sms' | 'notification') => {
    if (type === 'email') {
      deleteEmailTemplateMutation.mutate(template.id);
    } else if (type === 'sms') {
      deleteSmsTemplateMutation.mutate(template.id);
    } else if (type === 'notification') {
      deleteNotificationTemplateMutation.mutate(template.id);
    }
  };

  // Combine contacts and subscribers for display
  const allData = [...contacts, ...subscribers.map((sub: any) => ({
    ...sub,
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
    title: '',
    website: '',
    linkedinProfile: '',
    userType: 'subscriber',
    source: 'homepage',
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
    if (campaignEmailTemplates && Array.isArray(campaignEmailTemplates)) {
      const template = campaignEmailTemplates.find((t: any) => t.id === parseInt(templateId));
      if (template) {
        setCampaignSubject(template.subject || '');
        setCampaignContent(template.htmlContent || '');
      }
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

  // Get target count based on selected group
  const getTargetCount = () => {
    const baseContacts = getFilteredContactsByGroup();
    return baseContacts.length;
  };

  // Filter contacts by multiple target groups
  const getFilteredContactsByGroup = () => {
    let filteredContacts: any[] = [];
    
    selectedTargetGroups.forEach(group => {
      switch (group) {
        case 'users':
          filteredContacts.push(...allData.filter((c: any) => c.userType === 'user'));
          break;
        case 'partners':
          filteredContacts.push(...allData.filter((c: any) => c.userType === 'partner'));
          break;
        case 'admins':
          filteredContacts.push(...allData.filter((c: any) => c.userType === 'master_admin' || c.userType === 'editor_admin'));
          break;
        case 'subscribers':
          filteredContacts.push(...allData.filter((c: any) => c.userType === 'subscriber'));
          break;
        case 'all':
          filteredContacts.push(...allData);
          break;
      }
    });
    
    // Remove duplicates based on email
    const uniqueContacts = filteredContacts.filter((contact, index, self) => 
      index === self.findIndex(c => c.email === contact.email)
    );
    
    return uniqueContacts;
  };

  // Multi-channel campaign function
  const sendMultiChannelCampaign = async () => {
    const targetContacts = getFilteredContactsByGroup();
    
    if (targetContacts.length === 0) {
      toast({
        title: "Hata!",
        description: "Hedef grupta gönderim yapılacak kişi bulunamadı",
        variant: "destructive",
      });
      return;
    }

    // Validate channel requirements
    const validationErrors = [];
    
    if (selectedChannels.includes('email') && (!campaignSubject.trim() || !campaignContent.trim())) {
      validationErrors.push("E-posta için konu ve içerik gerekli");
    }
    
    if (selectedChannels.includes('sms') && !smsContent.trim()) {
      validationErrors.push("SMS için içerik gerekli");
    }
    
    if (selectedChannels.includes('notification') && (!notificationTitle.trim() || !notificationContent.trim())) {
      validationErrors.push("Bildirim için başlık ve içerik gerekli");
    }

    if (validationErrors.length > 0) {
      toast({
        title: "Hata!",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    // Prepare campaign data
    const campaignData = {
      channels: selectedChannels,
      targetGroups: selectedTargetGroups,
      targetContacts: targetContacts.map((c: any) => ({ 
        email: c.email, 
        phone: c.phone,
        userId: c.userId || (c.userType === 'user' || c.userType === 'partner' || c.userType === 'admin' ? c.id : null)
      })),
      email: selectedChannels.includes('email') ? {
        subject: campaignSubject,
        content: campaignContent,
        templateId: emailTemplate || null
      } : null,
      sms: selectedChannels.includes('sms') ? {
        content: smsContent,
        templateId: smsTemplate || null
      } : null,
      notification: selectedChannels.includes('notification') ? {
        title: notificationTitle,
        content: notificationContent,
        templateId: notificationTemplate || null
      } : null
    };

    sendCampaignMutation.mutate(campaignData);
  };

  // Template selection handlers
  const handleEmailTemplateSelect = (templateId: string) => {
    setEmailTemplate(templateId);
    if (campaignEmailTemplates && Array.isArray(campaignEmailTemplates)) {
      const template = campaignEmailTemplates.find((t: CampaignEmailTemplate) => t.id.toString() === templateId);
      if (template) {
        setCampaignSubject(template.subject || '');
        setCampaignContent(template.htmlContent || '');
      }
    }
  };

  const handleSmsTemplateSelect = (templateId: string) => {
    setSmsTemplate(templateId);
    if (campaignSmsTemplates && Array.isArray(campaignSmsTemplates)) {
      const template = campaignSmsTemplates.find((t: CampaignSmsTemplate) => t.id.toString() === templateId);
      if (template) {
        setSmsContent(template.content || '');
      }
    }
  };

  const handleNotificationTemplateSelect = (templateId: string) => {
    setNotificationTemplate(templateId);
    if (campaignNotificationTemplates && Array.isArray(campaignNotificationTemplates)) {
      const template = campaignNotificationTemplates.find((t: CampaignNotificationTemplate) => t.id.toString() === templateId);
      if (template) {
        setNotificationTitle(template.title || '');
        setNotificationContent(template.content || '');
      }
    }
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contacts">İletişim Listesi</TabsTrigger>
          <TabsTrigger value="campaign">Toplu Kampanya Gönderimi</TabsTrigger>
          <TabsTrigger value="templates">Şablon Kütüphanesi</TabsTrigger>
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
                              {Array.isArray(contact.tags) && contact.tags.slice(0, 2).map((tag: any, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <Tag className="h-2 w-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {Array.isArray(contact.tags) && contact.tags.length > 2 && (
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
              <CardTitle>Çok Kanallı Kampanya Gönderimi</CardTitle>
              <CardDescription>
                E-posta, SMS ve bildirim kanallarında kampanya gönderin. Hedef: {filteredContacts.length} kişi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Channel Selection */}
              <div className="space-y-2">
                <Label>Kampanya Kanalları</Label>
                <div className="flex gap-4">
                  {[
                    { id: 'email', label: 'E-posta', icon: Mail },
                    { id: 'sms', label: 'SMS', icon: Phone },
                    { id: 'notification', label: 'Bildirim', icon: Globe }
                  ].map(channel => (
                    <label key={channel.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(channel.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChannels([...selectedChannels, channel.id]);
                          } else {
                            setSelectedChannels(selectedChannels.filter(c => c !== channel.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <channel.icon className="h-4 w-4" />
                      <span>{channel.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target Group Selection */}
              <div className="space-y-3">
                <Label>Hedef Gruplar (Çoklu Seçim)</Label>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'Tüm Kullanıcılar' },
                    { value: 'users', label: 'Sadece Kullanıcılar' },
                    { value: 'partners', label: 'Sadece Partnerler' },
                    { value: 'admins', label: 'Sadece Adminler' },
                    { value: 'subscribers', label: 'Sadece Aboneler' }
                  ].map((group) => (
                    <div key={group.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`target-group-${group.value}`}
                        checked={selectedTargetGroups.includes(group.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTargetGroups(prev => [...prev, group.value]);
                          } else {
                            setSelectedTargetGroups(prev => prev.filter(g => g !== group.value));
                          }
                        }}
                      />
                      <Label htmlFor={`target-group-${group.value}`} className="text-sm font-normal">
                        {group.label}
                      </Label>
                    </div>
                  ))}
                </div>
                
                {selectedTargetGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTargetGroups.map((group) => {
                      const groupLabel = {
                        all: 'Tüm Kullanıcılar',
                        users: 'Kullanıcılar',
                        partners: 'Partnerler',
                        admins: 'Adminler',
                        subscribers: 'Aboneler'
                      }[group];
                      
                      return (
                        <Badge key={group} variant="secondary" className="text-xs">
                          {groupLabel}
                          <button
                            onClick={() => setSelectedTargetGroups(prev => prev.filter(g => g !== group))}
                            className="ml-1 hover:bg-gray-300 rounded-full w-4 h-4 flex items-center justify-center"
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Email Campaign Section */}
              {selectedChannels.includes('email') && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-posta Kampanyası
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>E-posta Şablonu (Şablon Kütüphanesinden)</Label>
                    <Select value={emailTemplate} onValueChange={handleEmailTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="E-posta şablonu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignEmailTemplates && Array.isArray(campaignEmailTemplates) && campaignEmailTemplates.map((template: CampaignEmailTemplate) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name} - {template.subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-subject">E-posta Konusu</Label>
                    <Input
                      id="email-subject"
                      placeholder="Kampanya e-posta konusu"
                      value={campaignSubject}
                      onChange={(e) => setCampaignSubject(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-content">E-posta İçeriği</Label>
                    <Textarea
                      id="email-content"
                      placeholder="Kampanya e-posta içeriği (HTML desteklenir)"
                      value={campaignContent}
                      onChange={(e) => setCampaignContent(e.target.value)}
                      rows={6}
                    />
                  </div>
                </div>
              )}

              {/* SMS Campaign Section */}
              {selectedChannels.includes('sms') && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    SMS Kampanyası
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>SMS Şablonu (Şablon Kütüphanesinden)</Label>
                    <Select value={smsTemplate} onValueChange={handleSmsTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="SMS şablonu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignSmsTemplates && Array.isArray(campaignSmsTemplates) && campaignSmsTemplates.map((template: CampaignSmsTemplate) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sms-content">SMS İçeriği</Label>
                    <Textarea
                      id="sms-content"
                      placeholder="SMS mesajı (160 karakter önerilir)"
                      value={smsContent}
                      onChange={(e) => setSmsContent(e.target.value)}
                      rows={3}
                      maxLength={160}
                    />
                    <p className="text-sm text-gray-500">{smsContent.length}/160 karakter</p>
                  </div>
                </div>
              )}

              {/* Notification Campaign Section */}
              {selectedChannels.includes('notification') && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Bildirim Kampanyası
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>Bildirim Şablonu (Şablon Kütüphanesinden)</Label>
                    <Select value={notificationTemplate} onValueChange={handleNotificationTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Bildirim şablonu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignNotificationTemplates && Array.isArray(campaignNotificationTemplates) && campaignNotificationTemplates.map((template: CampaignNotificationTemplate) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name} - {template.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-title">Bildirim Başlığı</Label>
                    <Input
                      id="notification-title"
                      placeholder="Bildirim başlığı"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-content">Bildirim İçeriği</Label>
                    <Textarea
                      id="notification-content"
                      placeholder="Bildirim mesajı"
                      value={notificationContent}
                      onChange={(e) => setNotificationContent(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  onClick={() => setPreviewOpen(true)}
                  variant="outline"
                  disabled={selectedChannels.length === 0}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Önizle
                </Button>
                
                <Button
                  onClick={sendMultiChannelCampaign}
                  disabled={sendCampaignMutation.isPending || selectedChannels.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendCampaignMutation.isPending ? 'Gönderiliyor...' : `Kampanya Gönder (${getTargetCount()} kişi)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    Şablon Kütüphanesi
                  </CardTitle>
                  <CardDescription>
                    Kampanya şablonlarınızı oluşturun ve yönetin
                  </CardDescription>
                </div>
                <Button onClick={() => setShowTemplateCreator(true)} data-testid="button-create-template">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Şablon
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-posta Şablonları
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS Şablonları
                  </TabsTrigger>
                  <TabsTrigger value="notification" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Bildirim Şablonları
                  </TabsTrigger>
                </TabsList>

                {/* Email Templates */}
                <TabsContent value="email" className="space-y-4">
                  <div className="grid gap-4">
                    {campaignEmailTemplates && Array.isArray(campaignEmailTemplates) && campaignEmailTemplates.length > 0 ? (
                      campaignEmailTemplates.map((template: CampaignEmailTemplate) => (
                        <Card key={template.id} className="relative">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{template.name}</h3>
                                <p className="text-sm text-gray-600 mb-2">{template.subject}</p>
                                <div 
                                  className="text-sm text-gray-500 line-clamp-2"
                                  dangerouslySetInnerHTML={{ 
                                    __html: template.htmlContent.substring(0, 150) + '...' 
                                  }}
                                />
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewingTemplate(template);
                                    setTemplateType('email');
                                    setShowTemplatePreview(true);
                                  }}
                                  data-testid={`button-preview-email-${template.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTestingTemplate(template);
                                    setTemplateType('email');
                                    setShowTestDialog(true);
                                  }}
                                  data-testid={`button-test-email-${template.id}`}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTemplate(template);
                                    setTemplateType('email');
                                    setTemplateName(template.name);
                                    setTemplateSubject(template.subject);
                                    setTemplateContent(template.htmlContent);
                                    setShowTemplateCreator(true);
                                  }}
                                  data-testid={`button-edit-email-${template.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template, 'email')}
                                  data-testid={`button-delete-email-${template.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Henüz e-posta şablonu bulunmuyor</p>
                        <p className="text-sm">Yeni şablon oluşturmak için yukarıdaki butonu kullanın</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* SMS Templates */}
                <TabsContent value="sms" className="space-y-4">
                  <div className="grid gap-4">
                    {campaignSmsTemplates && Array.isArray(campaignSmsTemplates) && campaignSmsTemplates.length > 0 ? (
                      campaignSmsTemplates.map((template: CampaignSmsTemplate) => (
                        <Card key={template.id} className="relative">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{template.name}</h3>
                                <p className="text-sm text-gray-500 mt-2">
                                  {template.content.substring(0, 100)}
                                  {template.content.length > 100 ? '...' : ''}
                                </p>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewingTemplate(template);
                                    setTemplateType('sms');
                                    setShowTemplatePreview(true);
                                  }}
                                  data-testid={`button-preview-sms-${template.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTestingTemplate(template);
                                    setTemplateType('sms');
                                    setShowTestDialog(true);
                                  }}
                                  data-testid={`button-test-sms-${template.id}`}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTemplate(template);
                                    setTemplateType('sms');
                                    setTemplateName(template.name);
                                    setTemplateContent(template.content);
                                    setShowTemplateCreator(true);
                                  }}
                                  data-testid={`button-edit-sms-${template.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template, 'sms')}
                                  data-testid={`button-delete-sms-${template.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Henüz SMS şablonu bulunmuyor</p>
                        <p className="text-sm">Yeni şablon oluşturmak için yukarıdaki butonu kullanın</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Notification Templates */}
                <TabsContent value="notification" className="space-y-4">
                  <div className="grid gap-4">
                    {campaignNotificationTemplates && Array.isArray(campaignNotificationTemplates) && campaignNotificationTemplates.length > 0 ? (
                      campaignNotificationTemplates.map((template: CampaignNotificationTemplate) => (
                        <Card key={template.id} className="relative">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{template.name}</h3>
                                <p className="font-medium text-sm text-gray-700 mb-1">{template.title}</p>
                                <p className="text-sm text-gray-500">
                                  {template.content.substring(0, 100)}
                                  {template.content.length > 100 ? '...' : ''}
                                </p>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewingTemplate(template);
                                    setTemplateType('notification');
                                    setShowTemplatePreview(true);
                                  }}
                                  data-testid={`button-preview-notification-${template.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTestingTemplate(template);
                                    setTemplateType('notification');
                                    setShowTestDialog(true);
                                  }}
                                  data-testid={`button-test-notification-${template.id}`}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTemplate(template);
                                    setTemplateType('notification');
                                    setTemplateName(template.name);
                                    setTemplateTitle(template.title);
                                    setTemplateContent(template.content);
                                    setShowTemplateCreator(true);
                                  }}
                                  data-testid={`button-edit-notification-${template.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template, 'notification')}
                                  data-testid={`button-delete-notification-${template.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Henüz bildirim şablonu bulunmuyor</p>
                        <p className="text-sm">Yeni şablon oluşturmak için yukarıdaki butonu kullanın</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
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

      {/* Template Creator Dialog */}
      <Dialog open={showTemplateCreator} onOpenChange={setShowTemplateCreator}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Şablonu Düzenle' : 'Yeni Şablon Oluştur'}
            </DialogTitle>
            <DialogDescription>
              {templateType === 'email' && 'E-posta kampanyası için şablon oluşturun'}
              {templateType === 'sms' && 'SMS kampanyası için şablon oluşturun'}
              {templateType === 'notification' && 'Bildirim kampanyası için şablon oluşturun'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Type Selection */}
            {!editingTemplate && (
              <div className="space-y-2">
                <Label>Şablon Tipi</Label>
                <Select value={templateType} onValueChange={(value: 'email' | 'sms' | 'notification') => setTemplateType(value)}>
                  <SelectTrigger data-testid="select-template-type">
                    <SelectValue placeholder="Şablon tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">E-posta</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="notification">Bildirim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">Şablon Adı</Label>
              <Input
                id="template-name"
                placeholder="Şablon adı girin"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                data-testid="input-template-name"
              />
            </div>

            {/* Email Subject */}
            {templateType === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="template-subject">E-posta Konusu</Label>
                <Input
                  id="template-subject"
                  placeholder="E-posta konusu girin"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  data-testid="input-template-subject"
                />
              </div>
            )}

            {/* Notification Title */}
            {templateType === 'notification' && (
              <div className="space-y-2">
                <Label htmlFor="template-title">Bildirim Başlığı</Label>
                <Input
                  id="template-title"
                  placeholder="Bildirim başlığı girin"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  data-testid="input-template-title"
                />
              </div>
            )}

            {/* Template Content */}
            <div className="space-y-2">
              <Label htmlFor="template-content">
                {templateType === 'email' && 'E-posta İçeriği (HTML desteklenir)'}
                {templateType === 'sms' && 'SMS İçeriği'}
                {templateType === 'notification' && 'Bildirim İçeriği'}
              </Label>
              <Textarea
                id="template-content"
                placeholder={
                  templateType === 'email' 
                    ? 'E-posta içeriğini girin (HTML kullanabilirsiniz)' 
                    : templateType === 'sms'
                    ? 'SMS mesajını girin (160 karakter önerilir)'
                    : 'Bildirim mesajını girin'
                }
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                rows={templateType === 'email' ? 8 : 4}
                maxLength={templateType === 'sms' ? 160 : undefined}
                data-testid="textarea-template-content"
              />
              {templateType === 'sms' && (
                <p className="text-sm text-gray-500">{templateContent.length}/160 karakter</p>
              )}
            </div>

            {/* Available Parameters */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Kullanılabilir Parametreler:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex flex-col gap-1">
                  <span><code className="bg-gray-200 px-1 rounded">{"{{partnerName}}"}</code> - Partner adı</span>
                  <span><code className="bg-gray-200 px-1 rounded">{"{{companyName}}"}</code> - Şirket adı</span>
                  <span><code className="bg-gray-200 px-1 rounded">{"{{customerName}}"}</code> - Müşteri adı</span>
                  <span><code className="bg-gray-200 px-1 rounded">{"{{serviceNeeded}}"}</code> - İhtiyaç duyulan hizmet</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span><code className="bg-gray-200 px-1 rounded">{"{{budget}}"}</code> - Bütçe</span>
                  <span><code className="bg-gray-200 px-1 rounded">{"{{partnerCompany}}"}</code> - Partner şirketi</span>
                  <span><code className="bg-gray-200 px-1 rounded">{"{{userName}}"}</code> - Kullanıcı adı</span>
                  <span><code className="bg-gray-200 px-1 rounded">{"{{resetLink}}"}</code> - Sıfırlama linki</span>
                </div>
              </div>
            </div>

            {/* Mandatory Footer Notice */}
            {templateType === 'email' && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Önemli:</strong> E-posta şablonlarına otomatik olarak abonelik iptali bağlantısı eklenecektir.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setShowTemplatePreview(true)}
                disabled={!templateContent || (templateType === 'email' && !templateSubject) || (templateType === 'notification' && !templateTitle)}
                data-testid="button-preview-template"
              >
                <Eye className="h-4 w-4 mr-2" />
                Önizleme
              </Button>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetTemplateForm}
                  data-testid="button-cancel-template"
                >
                  İptal
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={
                    createEmailTemplateMutation.isPending ||
                    createSmsTemplateMutation.isPending ||
                    createNotificationTemplateMutation.isPending ||
                    updateEmailTemplateMutation.isPending ||
                    updateSmsTemplateMutation.isPending ||
                    updateNotificationTemplateMutation.isPending
                  }
                  data-testid="button-save-template"
                >
                  {editingTemplate ? 'Güncelle' : 'Oluştur'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={showTemplatePreview} onOpenChange={setShowTemplatePreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Şablon Önizleme</DialogTitle>
            <DialogDescription>
              {templateType === 'email' && 'E-posta şablonu önizlemesi'}
              {templateType === 'sms' && 'SMS şablonu önizlemesi'}
              {templateType === 'notification' && 'Bildirim şablonu önizlemesi'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Name */}
            <div>
              <Label className="text-sm font-medium">Şablon Adı:</Label>
              <p className="font-medium">
                {previewingTemplate 
                  ? previewingTemplate.name 
                  : templateName || 'Belirtilmedi'
                }
              </p>
            </div>

            {/* Email Subject */}
            {templateType === 'email' && (
              <div>
                <Label className="text-sm font-medium">E-posta Konusu:</Label>
                <p className="font-medium">
                  {previewingTemplate 
                    ? previewingTemplate.subject 
                    : templateSubject || 'Belirtilmedi'
                  }
                </p>
              </div>
            )}

            {/* Notification Title */}
            {templateType === 'notification' && (
              <div>
                <Label className="text-sm font-medium">Bildirim Başlığı:</Label>
                <p className="font-medium">
                  {previewingTemplate 
                    ? previewingTemplate.title 
                    : templateTitle || 'Belirtilmedi'
                  }
                </p>
              </div>
            )}

            {/* Template Content */}
            <div>
              <Label className="text-sm font-medium">İçerik:</Label>
              {templateType === 'email' ? (
                <div 
                  className="border rounded-lg p-4 bg-white dark:bg-gray-900 min-h-[200px]"
                  dangerouslySetInnerHTML={{ 
                    __html: previewingTemplate 
                      ? previewingTemplate.htmlContent 
                      : templateContent 
                  }}
                />
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 whitespace-pre-wrap">
                  {previewingTemplate 
                    ? previewingTemplate.content 
                    : templateContent || 'İçerik belirtilmedi'
                  }
                </div>
              )}
            </div>

            {/* Sample Data Notice */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Not:</strong> Bu önizlemede parametreler örnek verilerle değiştirilmez. 
                    Gerçek kullanımda {"{{partnerName}}"}, {"{{companyName}}"} gibi parametreler 
                    otomatik olarak değiştirilecektir.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTemplatePreview(false);
                  setPreviewingTemplate(null);
                }}
                data-testid="button-close-preview"
              >
                Kapat
              </Button>
              <Button
                onClick={() => {
                  // Close preview and open test dialog with the same template
                  setShowTemplatePreview(false);
                  setTestingTemplate(previewingTemplate);
                  setShowTestDialog(true);
                }}
                disabled={!previewingTemplate}
                data-testid="button-test-from-preview"
              >
                <Send className="h-4 w-4 mr-2" />
                Test Gönder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Template Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Test Gönder</DialogTitle>
            <DialogDescription>
              {templateType === 'email' && testingTemplate && 
                `"${testingTemplate.name}" e-posta şablonunu test et`
              }
              {templateType === 'sms' && testingTemplate && 
                `"${testingTemplate.name}" SMS şablonunu test et`
              }
              {templateType === 'notification' && testingTemplate && 
                `"${testingTemplate.name}" bildirim şablonunu test et`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Email input for email templates */}
            {templateType === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="test-email">Test E-posta Adresi</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  data-testid="input-test-email"
                />
              </div>
            )}

            {/* Phone number input for SMS templates */}
            {templateType === 'sms' && (
              <div className="space-y-2">
                <Label htmlFor="test-phone">Test Telefon Numarası</Label>
                <Input
                  id="test-phone"
                  type="tel"
                  placeholder="+90 5XX XXX XX XX"
                  value={testEmail} // using same state for simplicity
                  onChange={(e) => setTestEmail(e.target.value)}
                  data-testid="input-test-phone"
                />
              </div>
            )}

            {/* Note for notification templates */}
            {templateType === 'notification' && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="text-sm text-blue-700">
                  <strong>Not:</strong> Test bildirimi sadece sizin hesabınıza gönderilecektir.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTestDialog(false);
                  setTestingTemplate(null);
                  setTestEmail('');
                }}
                data-testid="button-cancel-test"
              >
                İptal
              </Button>
              <Button
                onClick={() => {
                  if (templateType === 'email' && !testEmail) {
                    toast({
                      title: "Hata!",
                      description: "E-posta adresi gereklidir",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (templateType === 'sms' && !testEmail) {
                    toast({
                      title: "Hata!",
                      description: "Telefon numarası gereklidir",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  testTemplateMutation.mutate({
                    type: templateType,
                    templateId: testingTemplate.id,
                    email: testEmail
                  });
                }}
                disabled={testTemplateMutation.isPending}
                data-testid="button-send-test"
              >
                {testTemplateMutation.isPending ? 'Gönderiliyor...' : 'Test Gönder'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}