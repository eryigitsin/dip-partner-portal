import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Mail, Bell, Plus, Send, Layout, MessageSquare, Type, Palette, Users, Image, Edit, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { EmailTemplate, NotificationTemplate } from "@shared/schema";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

interface EmailPreview {
  subject: string;
  content: string;
}

interface EmailPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  htmlContent: string;
}

const EmailPreviewDialog = ({ isOpen, onClose, subject, htmlContent }: EmailPreviewDialogProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Email Önizleme</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Konu:</Label>
            <p className="font-medium">{subject}</p>
          </div>
          <div>
            <Label>İçerik:</Label>
            <div 
              className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Comprehensive email template types for the system
const EMAIL_TEMPLATE_TYPES = [
  { value: "partner_welcome", label: "Partner Hoşgeldin", description: "Yeni partner onaylandığında gönderilen hoşgeldin maili" },
  { value: "quote_received", label: "Teklif Alındı", description: "Müşteriye teklif talebinin alındığını bildiren mail" },
  { value: "quote_approved", label: "Teklif Onaylandı", description: "Partner'e teklifinin onaylandığını bildiren mail" },
  { value: "quote_rejected", label: "Teklif Reddedildi", description: "Partner'e teklifinin reddedildiğini bildiren mail" },
  { value: "password_reset", label: "Şifre Sıfırlama", description: "Şifre sıfırlama linki içeren mail" },
  { value: "email_verification", label: "Email Doğrulama", description: "Email adresini doğrulamak için gönderilen mail" },
  { value: "payment_confirmation", label: "Ödeme Onayı", description: "Ödeme onaylandığında gönderilen mail" },
  { value: "project_reminder", label: "Proje Hatırlatma", description: "Proje deadline'larında gönderilen hatırlatma" },
  { value: "partner_application_received", label: "Partner Başvuru Alındı", description: "Partner başvurusu alındığında gönderilen mail" },
  { value: "partner_application_approved", label: "Partner Başvuru Onaylandı", description: "Partner başvurusu onaylandığında gönderilen mail" },
  { value: "partner_application_rejected", label: "Partner Başvuru Reddedildi", description: "Partner başvurusu reddedildiğinde gönderilen mail" },
  { value: "newsletter_welcome", label: "Newsletter Hoşgeldin", description: "Newsletter'a abone olan kullanıcılara hoşgeldin maili" },
  { value: "newsletter_monthly", label: "Aylık Newsletter", description: "Aylık gönderilen newsletter maili" },
  { value: "project_started", label: "Proje Başladı", description: "Yeni proje başlatıldığında gönderilen mail" },
  { value: "project_completed", label: "Proje Tamamlandı", description: "Proje tamamlandığında gönderilen mail" },
  { value: "project_cancelled", label: "Proje İptal Edildi", description: "Proje iptal edildiğinde gönderilen mail" },
  { value: "feedback_received", label: "Geri Bildirim Alındı", description: "Geri bildirim alındığında partner'e gönderilen mail" },
  { value: "feedback_reminder", label: "Geri Bildirim Hatırlatma", description: "Proje sonrası geri bildirim hatırlatması" },
  { value: "account_suspended", label: "Hesap Askıya Alındı", description: "Hesap askıya alındığında gönderilen mail" },
  { value: "account_reactivated", label: "Hesap Yeniden Aktifleştirildi", description: "Hesap yeniden aktifleştirildiğinde gönderilen mail" },
  { value: "new_message", label: "Yeni Mesaj", description: "Yeni mesaj alındığında gönderilen bildirim maili" },
  { value: "profile_incomplete", label: "Profil Eksik", description: "Profili tamamlanmamış kullanıcılara gönderilen hatırlatma" },
  { value: "weekly_summary", label: "Haftalık Özet", description: "Haftalık aktivite özeti maili" },
  { value: "system_maintenance", label: "Sistem Bakımı", description: "Sistem bakımı öncesi bilgilendirme maili" },
  { value: "data_export_ready", label: "Veri Dışa Aktarma Hazır", description: "Veri dışa aktarma tamamlandığında gönderilen mail" },
  { value: "security_alert", label: "Güvenlik Uyarısı", description: "Güvenlik ihlali durumunda gönderilen uyarı maili" }
];

const NOTIFICATION_TEMPLATE_TYPES = [
  { value: "quote_request", label: "Teklif Talebi", description: "Yeni teklif talebi geldiğinde" },
  { value: "quote_response", label: "Teklif Yanıtı", description: "Teklif yanıtlandığında" },
  { value: "partner_application", label: "Partner Başvurusu", description: "Yeni partner başvurusu" },
  { value: "follower", label: "Yeni Takipçi", description: "Yeni takipçi eklendiğinde" },
  { value: "project_update", label: "Proje Güncellemesi", description: "Proje durumu güncellendiğinde" },
  { value: "feedback", label: "Geri Bildirim", description: "Yeni geri bildirim alındığında" },
  { value: "newsletter_subscriber", label: "Newsletter Aboneliği", description: "Newsletter'a yeni abone olunduğunda" },
  { value: "system_status", label: "Sistem Durumu", description: "Sistem durumu değişikliklerinde" },
  { value: "partner_post", label: "Partner Paylaşımı", description: "Partner yeni paylaşım yaptığında" },
  { value: "campaign", label: "Kampanya", description: "Yeni kampanya duyurularında" },
  { value: "message_received", label: "Mesaj Alındı", description: "Yeni mesaj alındığında" },
  { value: "profile_viewed", label: "Profil Görüntülendi", description: "Profil görüntülendiğinde" },
  { value: "service_inquiry", label: "Hizmet Sorgusu", description: "Hizmet ile ilgili soru sorulduğunda" },
  { value: "payment_received", label: "Ödeme Alındı", description: "Ödeme alındığında" },
  { value: "payment_pending", label: "Ödeme Beklemede", description: "Ödeme onay beklerken" },
  { value: "contract_signed", label: "Sözleşme İmzalandı", description: "Dijital sözleşme imzalandığında" },
  { value: "milestone_reached", label: "Kilometre Taşı", description: "Proje kilometre taşı tamamlandığında" },
  { value: "deadline_approaching", label: "Deadline Yaklaşıyor", description: "Deadline yaklaştığında" },
  { value: "task_assigned", label: "Görev Atandı", description: "Yeni görev atandığında" },
  { value: "task_completed", label: "Görev Tamamlandı", description: "Görev tamamlandığında" }
];

// SMS Template Types including OTP verification
const SMS_TEMPLATE_TYPES = [
  { value: "otp_verification", label: "OTP Doğrulama", description: "Hesap doğrulama OTP kodu" },
  { value: "login_verification", label: "Giriş Doğrulama", description: "Güvenli giriş için gönderilen kod" },
  { value: "password_reset", label: "Şifre Sıfırlama", description: "Şifre sıfırlama kodu" },
  { value: "welcome", label: "Hoşgeldin SMS", description: "Yeni üye kayıt sonrası hoşgeldin" },
  { value: "campaign", label: "Kampanya SMS", description: "Kampanya duyuru mesajları" },
  { value: "announcement", label: "Duyuru SMS", description: "Önemli platform duyuruları" },
  { value: "reminder", label: "Hatırlatma SMS", description: "Proje ve ödeme hatırlatmaları" },
  { value: "payment_confirmation", label: "Ödeme Onayı", description: "Ödeme onay bildirimi" },
  { value: "appointment_reminder", label: "Randevu Hatırlatma", description: "Toplantı ve randevu hatırlatmaları" },
  { value: "project_update", label: "Proje Güncellemesi", description: "Proje durum güncellemeleri" }
];

// Pre-made template categories for drag-drop editor
const TEMPLATE_CATEGORIES = {
  business: {
    name: "İş & Kurumsal",
    templates: [
      { id: "business-formal", name: "Resmi İş", preview: "Profesyonel ve resmi ton" },
      { id: "business-friendly", name: "Samimi İş", preview: "Dostane ama profesyonel" },
      { id: "business-minimal", name: "Minimal İş", preview: "Sade ve temiz tasarım" }
    ]
  },
  marketing: {
    name: "Pazarlama & Kampanya",
    templates: [
      { id: "marketing-promo", name: "Promosyon", preview: "Dikkat çekici kampanya" },
      { id: "marketing-newsletter", name: "Newsletter", preview: "Bilgilendirici bülten" },
      { id: "marketing-announcement", name: "Duyuru", preview: "Önemli bilgilendirme" }
    ]
  },
  transactional: {
    name: "İşlemsel & Bildirim",
    templates: [
      { id: "transactional-receipt", name: "Makbuz", preview: "Ödeme ve işlem onayı" },
      { id: "transactional-welcome", name: "Hoşgeldin", preview: "Yeni üye karşılama" },
      { id: "transactional-reset", name: "Sıfırlama", preview: "Şifre ve hesap sıfırlama" }
    ]
  }
};

export default function TemplateManagement() {
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>("");
  const [selectedNotificationTemplate, setSelectedNotificationTemplate] = useState<string>("");
  const [selectedSmsTemplate, setSelectedSmsTemplate] = useState<string>("");
  const [currentEmailTemplate, setCurrentEmailTemplate] = useState<EmailTemplate | null>(null);
  const [currentNotificationTemplate, setCurrentNotificationTemplate] = useState<NotificationTemplate | null>(null);
  const [currentSmsTemplate, setCurrentSmsTemplate] = useState<any | null>(null);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showEmailBuilder, setShowEmailBuilder] = useState(false);
  const [showNotificationCreator, setShowNotificationCreator] = useState(false);
  const [showSmsCreator, setShowSmsCreator] = useState(false);
  const [templateCreatorType, setTemplateCreatorType] = useState<'email' | 'notification' | 'sms'>('email');
  
  const queryClient = useQueryClient();

  // Email Templates API
  const { data: emailTemplates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
  });

  const { data: notificationTemplates = [] } = useQuery<NotificationTemplate[]>({
    queryKey: ["/api/admin/notification-templates"],
  });

  // SMS Templates API
  const { data: smsTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/sms-templates"],
  });

  // Load selected email template
  useEffect(() => {
    if (selectedEmailTemplate) {
      const template = emailTemplates.find(t => t.type === selectedEmailTemplate);
      setCurrentEmailTemplate(template || null);
    }
  }, [selectedEmailTemplate, emailTemplates]);

  // Load selected notification template
  useEffect(() => {
    if (selectedNotificationTemplate) {
      const template = notificationTemplates.find(t => t.type === selectedNotificationTemplate);
      setCurrentNotificationTemplate(template || null);
    }
  }, [selectedNotificationTemplate, notificationTemplates]);

  // Load selected SMS template
  useEffect(() => {
    if (selectedSmsTemplate) {
      const template = smsTemplates.find((t: any) => t.type === selectedSmsTemplate);
      setCurrentSmsTemplate(template || null);
    }
  }, [selectedSmsTemplate, smsTemplates]);

  // Email template save mutation
  const saveEmailTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!currentEmailTemplate) return;
      
      return await apiRequest('PUT', `/api/admin/email-templates/${currentEmailTemplate.type}`, {
        subject: currentEmailTemplate.subject,
        htmlContent: currentEmailTemplate.htmlContent
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
    }
  });

  // Notification template save mutation
  const saveNotificationTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!currentNotificationTemplate) return;
      
      return await apiRequest('PUT', `/api/admin/notification-templates/${currentNotificationTemplate.type}`, {
        title: currentNotificationTemplate.title,
        message: currentNotificationTemplate.message
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-templates"] });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Şablon Yönetimi</h1>
            <p className="text-sm text-muted-foreground">
              Email ve bildirim şablonlarını yönetin
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Button
            onClick={() => { setShowTemplateCreator(true); setTemplateCreatorType('email'); }}
            className="flex items-center gap-2"
            data-testid="button-create-template"
          >
            <Plus className="h-4 w-4" />
            Yeni Şablon Oluştur
          </Button>

          <Button
            onClick={() => setShowTemplateLibrary(true)}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-template-library"
          >
            <Layout className="h-4 w-4" />
            Şablon Kütüphanesi
          </Button>
        </div>

      <Tabs defaultValue="emails" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            E-Postalar
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Bildirimler
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS
          </TabsTrigger>
        </TabsList>

        {/* E-Postalar Tab */}
        <TabsContent value="emails" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>E-Posta Şablonları</CardTitle>
              <CardDescription>Email şablonlarını yönet ve düzenle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emailTemplateSelect">Şablon Seç</Label>
                  <Select value={selectedEmailTemplate} onValueChange={setSelectedEmailTemplate}>
                    <SelectTrigger data-testid="select-email-template">
                      <SelectValue placeholder="Email şablonu seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TEMPLATE_TYPES.map((template) => (
                        <SelectItem key={template.value} value={template.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{template.label}</span>
                            <span className="text-xs text-muted-foreground">{template.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedEmailTemplate && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="emailSubject">Konu</Label>
                    <Input 
                      id="emailSubject"
                      data-testid="input-email-subject"
                      placeholder="Email konusu"
                      value={currentEmailTemplate?.subject || ""}
                      onChange={(e) => setCurrentEmailTemplate(prev => 
                        prev ? { ...prev, subject: e.target.value } : 
                        { id: 0, name: selectedEmailTemplate, type: selectedEmailTemplate, subject: e.target.value, htmlContent: "", isActive: true, createdAt: new Date(), updatedAt: new Date() }
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailHtmlContent">HTML İçerik</Label>
                    <Textarea 
                      id="emailHtmlContent"
                      data-testid="textarea-email-content"
                      className="min-h-[300px] font-mono"
                      placeholder="HTML email içeriği..."
                      value={currentEmailTemplate?.htmlContent || ""}
                      onChange={(e) => setCurrentEmailTemplate(prev => 
                        prev ? { ...prev, htmlContent: e.target.value } : 
                        { id: 0, name: selectedEmailTemplate, type: selectedEmailTemplate, subject: "", htmlContent: e.target.value, isActive: true, createdAt: new Date(), updatedAt: new Date() }
                      )}
                    />
                  </div>
                  
                  {/* Parameter Legend */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Kullanılabilir Parametreler:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <code>{"{{partnerName}}"}</code>
                      <code>{"{{companyName}}"}</code>
                      <code>{"{{customerName}}"}</code>
                      <code>{"{{serviceNeeded}}"}</code>
                      <code>{"{{budget}}"}</code>
                      <code>{"{{partnerCompany}}"}</code>
                      <code>{"{{userName}}"}</code>
                      <code>{"{{resetLink}}"}</code>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      data-testid="button-preview-email"
                      onClick={() => setEmailPreview({
                        subject: currentEmailTemplate?.subject || "",
                        content: (currentEmailTemplate?.htmlContent || "").replace(/\{\{(\w+)\}\}/g, (match, key) => {
                          const mockData: Record<string, string> = {
                            partnerName: 'Test Partner',
                            companyName: 'Test Şirketi',
                            customerName: 'Test Müşteri',
                            serviceNeeded: 'Dijital Pazarlama',
                            budget: '10.000 TL',
                            partnerCompany: 'Test Şirketi',
                            userName: 'Test Kullanıcı',
                            resetLink: 'https://example.com/reset'
                          };
                          return mockData[key] || match;
                        })
                      })}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Önizle
                    </Button>
                    <Button 
                      size="sm"
                      data-testid="button-save-email-template"
                      onClick={() => saveEmailTemplateMutation.mutate()}
                      disabled={saveEmailTemplateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveEmailTemplateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bildirimler Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bildirim Şablonları</CardTitle>
              <CardDescription>Bildirim şablonlarını yönet ve düzenle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="notificationTemplateSelect">Şablon Seç</Label>
                  <Select value={selectedNotificationTemplate} onValueChange={setSelectedNotificationTemplate}>
                    <SelectTrigger data-testid="select-notification-template">
                      <SelectValue placeholder="Bildirim şablonu seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_TEMPLATE_TYPES.map((template) => (
                        <SelectItem key={template.value} value={template.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{template.label}</span>
                            <span className="text-xs text-muted-foreground">{template.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedNotificationTemplate && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notificationTitle">Başlık</Label>
                    <Input 
                      id="notificationTitle"
                      data-testid="input-notification-title"
                      placeholder="Bildirim başlığı"
                      value={currentNotificationTemplate?.title || ""}
                      onChange={(e) => setCurrentNotificationTemplate(prev => 
                        prev ? { ...prev, title: e.target.value } : 
                        { id: 0, type: selectedNotificationTemplate, title: e.target.value, content: "", userId: null, isRead: false, createdAt: new Date(), updatedAt: new Date() }
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notificationMessage">Mesaj</Label>
                    <Textarea 
                      id="notificationMessage"
                      data-testid="textarea-notification-message"
                      className="min-h-[150px]"
                      placeholder="Bildirim mesajı..."
                      value={currentNotificationTemplate?.content || ""}
                      onChange={(e) => setCurrentNotificationTemplate(prev => 
                        prev ? { ...prev, content: e.target.value } : 
                        { id: 0, type: selectedNotificationTemplate, title: "", content: e.target.value, userId: null, isRead: false, createdAt: new Date(), updatedAt: new Date() }
                      )}
                    />
                  </div>
                  
                  {/* Parameter Legend */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Kullanılabilir Parametreler:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <code>{"{{customerName}}"}</code>
                      <code>{"{{partnerName}}"}</code>
                      <code>{"{{serviceNeeded}}"}</code>
                      <code>{"{{companyName}}"}</code>
                      <code>{"{{followerName}}"}</code>
                      <code>{"{{projectTitle}}"}</code>
                      <code>{"{{rating}}"}</code>
                      <code>{"{{email}}"}</code>
                      <code>{"{{message}}"}</code>
                      <code>{"{{postTitle}}"}</code>
                      <code>{"{{campaignTitle}}"}</code>
                      <code>{"{{campaignDescription}}"}</code>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      data-testid="button-save-notification-template"
                      onClick={() => saveNotificationTemplateMutation.mutate()}
                      disabled={saveNotificationTemplateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveNotificationTemplateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SMS Şablonları</CardTitle>
              <CardDescription>SMS şablonlarını yönet ve düzenle (OTP dahil)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smsTemplateSelect">Şablon Seç</Label>
                  <Select value={selectedSmsTemplate} onValueChange={setSelectedSmsTemplate}>
                    <SelectTrigger data-testid="select-sms-template">
                      <SelectValue placeholder="SMS şablonu seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {SMS_TEMPLATE_TYPES.map((template) => (
                        <SelectItem key={template.value} value={template.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{template.label}</span>
                            <span className="text-xs text-muted-foreground">{template.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSmsTemplate && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="smsContent">SMS İçeriği</Label>
                    <Textarea 
                      id="smsContent"
                      data-testid="textarea-sms-content"
                      className="min-h-[120px]"
                      placeholder="SMS içeriği... (160 karakter limitine dikkat edin)"
                      value={currentSmsTemplate?.content || ""}
                      onChange={(e) => setCurrentSmsTemplate((prev: any) => 
                        prev ? { ...prev, content: e.target.value } : 
                        { id: 0, type: selectedSmsTemplate, content: e.target.value, isActive: true, createdAt: new Date(), updatedAt: new Date() }
                      )}
                      maxLength={160}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {currentSmsTemplate?.content?.length || 0}/160 karakter
                    </div>
                  </div>
                  
                  {/* SMS Parameter Legend */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Kullanılabilir Parametreler:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <code>{"{{code}}"}</code>
                      <code>{"{{name}}"}</code>
                      <code>{"{{company}}"}</code>
                      <code>{"{{amount}}"}</code>
                      <code>{"{{date}}"}</code>
                      <code>{"{{time}}"}</code>
                      <code>{"{{projectTitle}}"}</code>
                      <code>{"{{partnerName}}"}</code>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const preview = (currentSmsTemplate?.content || "").replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
                          const mockData = {
                            code: '123456',
                            name: 'Test Kullanıcı',
                            company: 'Test Şirket',
                            amount: '1000 TL',
                            date: '06.08.2025',
                            time: '15:30',
                            projectTitle: 'Test Proje',
                            partnerName: 'Test Partner'
                          };
                          return (mockData as any)[key] || match;
                        });
                        alert(`SMS Önizleme:\n\n${preview}`);
                      }}
                      data-testid="button-preview-sms"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Önizle
                    </Button>
                    <Button 
                      size="sm"
                      data-testid="button-save-sms-template"
                      onClick={() => console.log('SMS template save')}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Advanced Template Creator Dialog */}
      <Dialog open={showTemplateCreator} onOpenChange={setShowTemplateCreator}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Gelişmiş Şablon Oluşturucu
            </DialogTitle>
            <DialogDescription>
              Sürükle-bırak editörü ile profesyonel şablonlar oluşturun
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Template Categories */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Şablon Kategorileri</h3>
              {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => (
                <div key={key} className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">{category.name}</h4>
                  {category.templates.map((template) => (
                    <div 
                      key={template.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      data-testid={`template-${template.id}`}
                    >
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground">{template.preview}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Drag-Drop Editor Area */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Type className="h-4 w-4" />
                <span className="font-medium">Şablon Editörü</span>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 min-h-[400px] bg-gray-50 dark:bg-gray-900">
                <div className="text-center text-muted-foreground">
                  <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Buraya şablon bileşenlerini sürükleyin</p>
                  <p className="text-xs mt-2">Header, Content, Footer, Button gibi bileşenler ekleyin</p>
                </div>
              </div>
            </div>

            {/* Component Library */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Bileşen Kütüphanesi</h3>
              
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Temel Bileşenler</h4>
                {[
                  { name: "Header", icon: Type },
                  { name: "Paragraf", icon: Type },
                  { name: "Buton", icon: Layout },
                  { name: "Görsel", icon: Image },
                  { name: "Ayırıcı", icon: Layout }
                ].map((component) => (
                  <div 
                    key={component.name}
                    className="p-2 border rounded cursor-move hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    draggable
                    data-testid={`component-${component.name.toLowerCase()}`}
                  >
                    <component.icon className="h-4 w-4" size={16} />
                    <span className="text-sm">{component.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTemplateCreator(false)}>
              İptal
            </Button>
            <div className="flex gap-2">
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Önizle
              </Button>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Şablonu Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Library Dialog */}
      <Dialog open={showTemplateLibrary} onOpenChange={setShowTemplateLibrary}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Şablon Kütüphanesi
            </DialogTitle>
            <DialogDescription>
              E-posta, SMS ve bildirim şablonlarını oluşturun ve yönetin
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="email">E-Posta Şablonları</TabsTrigger>
                <TabsTrigger value="notification">Bildirim Şablonları</TabsTrigger>
                <TabsTrigger value="sms">SMS Şablonları</TabsTrigger>
              </TabsList>
              
              <TabsContent value="email" className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">E-Posta Şablonları</h3>
                    <Button 
                      onClick={() => setShowEmailBuilder(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Yeni E-Posta Şablonu
                    </Button>
                  </div>
                  
                  <div className="text-center py-8 text-muted-foreground">
                    <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz özel e-posta şablonu oluşturmamışsınız</p>
                    <p className="text-sm">Yukarıdaki butonu kullanarak görsel editör ile şablon oluşturabilirsiniz</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="notification" className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Bildirim Şablonları</h3>
                    <Button 
                      onClick={() => setShowNotificationCreator(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Yeni Bildirim Şablonu
                    </Button>
                  </div>
                  
                  <div className="text-center py-8 text-muted-foreground">
                    <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz özel bildirim şablonu oluşturmamışsınız</p>
                    <p className="text-sm">Yukarıdaki butonu kullanarak text-based editör ile şablon oluşturabilirsiniz</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="sms" className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">SMS Şablonları</h3>
                    <Button 
                      onClick={() => setShowSmsCreator(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Yeni SMS Şablonu
                    </Button>
                  </div>
                  
                  <div className="text-center py-8 text-muted-foreground">
                    <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz özel SMS şablonu oluşturmamışsınız</p>
                    <p className="text-sm">Yukarıdaki butonu kullanarak text-based editör ile şablon oluşturabilirsiniz</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTemplateLibrary(false)}>
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Builder Dialog */}
      <Dialog open={showEmailBuilder} onOpenChange={setShowEmailBuilder}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              E-Posta Şablonu Oluşturucu
            </DialogTitle>
            <DialogDescription>
              Sürükle-bırak editörü ile profesyonel e-posta şablonları oluşturun
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 min-h-[500px] bg-gray-50 dark:bg-gray-900">
              <div className="text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Email Builder entegrasyonu yakında eklenecek</p>
                <p className="text-xs mt-2">email-builder-js paketi yüklendi</p>
              </div>
            </div>
            
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setShowEmailBuilder(false)}>
                İptal
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Önizle
                </Button>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Şablonu Kaydet
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Creator Dialog */}
      <Dialog open={showNotificationCreator} onOpenChange={setShowNotificationCreator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Bildirim Şablonu Oluşturucu
            </DialogTitle>
            <DialogDescription>
              Text-based editör ile bildirim şablonu oluşturun
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="notif-name">Şablon Adı</Label>
              <Input 
                id="notif-name"
                placeholder="Bildirim şablon adı"
              />
            </div>
            
            <div>
              <Label htmlFor="notif-title">Bildirim Başlığı</Label>
              <Input 
                id="notif-title"
                placeholder="Bildirim başlığı"
              />
            </div>
            
            <div>
              <Label htmlFor="notif-content">Bildirim İçeriği</Label>
              <Textarea 
                id="notif-content"
                className="min-h-[150px]"
                placeholder="Bildirim içeriği... Parametreler: {{customerName}}, {{partnerName}}, {{serviceNeeded}}"
              />
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Kullanılabilir Parametreler:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                <code>{"{{customerName}}"}</code>
                <code>{"{{partnerName}}"}</code>
                <code>{"{{serviceNeeded}}"}</code>
                <code>{"{{companyName}}"}</code>
                <code>{"{{projectTitle}}"}</code>
                <code>{"{{message}}"}</code>
              </div>
            </div>
            
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setShowNotificationCreator(false)}>
                İptal
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Önizle
                </Button>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Şablonu Kaydet
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Creator Dialog */}
      <Dialog open={showSmsCreator} onOpenChange={setShowSmsCreator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Şablonu Oluşturucu
            </DialogTitle>
            <DialogDescription>
              Text-based editör ile SMS şablonu oluşturun
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="sms-name">Şablon Adı</Label>
              <Input 
                id="sms-name"
                placeholder="SMS şablon adı"
              />
            </div>
            
            <div>
              <Label htmlFor="sms-content">SMS İçeriği</Label>
              <Textarea 
                id="sms-content"
                className="min-h-[120px]"
                placeholder="SMS içeriği... (160 karakter limitine dikkat edin)"
                maxLength={160}
              />
              <div className="text-xs text-muted-foreground mt-1">
                0/160 karakter
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Kullanılabilir Parametreler:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                <code>{"{{code}}"}</code>
                <code>{"{{name}}"}</code>
                <code>{"{{company}}"}</code>
                <code>{"{{amount}}"}</code>
                <code>{"{{date}}"}</code>
                <code>{"{{time}}"}</code>
              </div>
            </div>
            
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setShowSmsCreator(false)}>
                İptal
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Önizle
                </Button>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Şablonu Kaydet
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      {emailPreview && (
        <EmailPreviewDialog
          isOpen={!!emailPreview}
          onClose={() => setEmailPreview(null)}
          subject={emailPreview.subject}
          htmlContent={emailPreview.content}
        />
      )}
      </div>
      <Footer />
    </div>
  );
}