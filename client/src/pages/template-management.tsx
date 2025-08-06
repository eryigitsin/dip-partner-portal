import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Mail, Bell } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { EmailTemplate, NotificationTemplate } from "@shared/schema";

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

export default function TemplateManagement() {
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>("");
  const [selectedNotificationTemplate, setSelectedNotificationTemplate] = useState<string>("");
  const [currentEmailTemplate, setCurrentEmailTemplate] = useState<EmailTemplate | null>(null);
  const [currentNotificationTemplate, setCurrentNotificationTemplate] = useState<NotificationTemplate | null>(null);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  
  const queryClient = useQueryClient();

  // Email Templates API
  const { data: emailTemplates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
  });

  const { data: notificationTemplates = [] } = useQuery<NotificationTemplate[]>({
    queryKey: ["/api/admin/notification-templates"],
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

  // Email template save mutation
  const saveEmailTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!currentEmailTemplate) return;
      
      return await apiRequest(`/api/admin/email-templates/${currentEmailTemplate.type}`, {
        method: "PUT",
        body: {
          subject: currentEmailTemplate.subject,
          htmlContent: currentEmailTemplate.htmlContent
        }
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
      
      return await apiRequest(`/api/admin/notification-templates/${currentNotificationTemplate.type}`, {
        method: "PUT",
        body: {
          title: currentNotificationTemplate.title,
          message: currentNotificationTemplate.message
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-templates"] });
    }
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
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

      <Tabs defaultValue="emails" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            E-Postalar
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Bildirimler
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
                      {emailTemplates.map((template) => (
                        <SelectItem key={template.type} value={template.type}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedEmailTemplate && currentEmailTemplate && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="emailSubject">Konu</Label>
                    <Input 
                      id="emailSubject"
                      data-testid="input-email-subject"
                      placeholder="Email konusu"
                      value={currentEmailTemplate.subject}
                      onChange={(e) => setCurrentEmailTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailHtmlContent">HTML İçerik</Label>
                    <Textarea 
                      id="emailHtmlContent"
                      data-testid="textarea-email-content"
                      className="min-h-[300px] font-mono"
                      placeholder="HTML email içeriği..."
                      value={currentEmailTemplate.htmlContent}
                      onChange={(e) => setCurrentEmailTemplate(prev => prev ? { ...prev, htmlContent: e.target.value } : null)}
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
                        subject: currentEmailTemplate.subject,
                        content: currentEmailTemplate.htmlContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
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
                      {notificationTemplates.map((template) => (
                        <SelectItem key={template.type} value={template.type}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedNotificationTemplate && currentNotificationTemplate && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notificationTitle">Başlık</Label>
                    <Input 
                      id="notificationTitle"
                      data-testid="input-notification-title"
                      placeholder="Bildirim başlığı"
                      value={currentNotificationTemplate.title}
                      onChange={(e) => setCurrentNotificationTemplate(prev => prev ? { ...prev, title: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notificationMessage">Mesaj</Label>
                    <Textarea 
                      id="notificationMessage"
                      data-testid="textarea-notification-message"
                      className="min-h-[150px]"
                      placeholder="Bildirim mesajı..."
                      value={currentNotificationTemplate.message}
                      onChange={(e) => setCurrentNotificationTemplate(prev => prev ? { ...prev, message: e.target.value } : null)}
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
      </Tabs>

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
  );
}