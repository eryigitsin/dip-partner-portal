import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Trash2, Plus, Edit2, Save, X, Upload, Settings, Mail, MessageSquare, Shield, Database, Video, Eye } from 'lucide-react';
import { EmailPreviewDialog } from '@/components/email-preview-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Service {
  id: number;
  name: string;
  description: string;
  category: string;
  categoryId: number;
  isActive: boolean;
}

interface Market {
  id: number;
  name: string;
  nameEn?: string;
  region?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SystemConfig {
  siteName: string;
  defaultLanguage: string;
  maintenanceMode: boolean;
  autoApprovalEnabled: boolean;
  sessionTimeout: number;
  passwordMinLength: number;
  require2FA: boolean;
  heroVideoUrl: string;
  seoSettings: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    ogUrl: string;
    twitterTitle: string;
    twitterDescription: string;
    twitterImage: string;
  };
  emailSettings: {
    resendApiKey: string;
    fromEmail: string;
    fromName: string;
  };
  smsSettings: {
    netgsmUsername: string;
    netgsmPassword: string;
    netgsmMsgHeader: string;
  };
}

export default function SystemSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailPreview, setEmailPreview] = useState<{subject: string; content: string} | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newService, setNewService] = useState({ name: '', description: '', category: '' });
  const [newMarket, setNewMarket] = useState({ name: '', nameEn: '', region: '' });
  
  // Local state for form fields
  const [platformSettings, setPlatformSettings] = useState({
    siteName: '',
    defaultLanguage: 'tr',
    maintenanceMode: false,
    autoApprovalEnabled: false,
  });

  const [seoSettings, setSeoSettings] = useState({
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    ogUrl: '',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 60,
    passwordMinLength: 8,
    require2FA: false,
  });
  
  const [emailSettings, setEmailSettings] = useState({
    resendApiKey: '',
    fromEmail: '',
    fromName: 'DİP Platform',
  });
  
  const [smsSettings, setSmsSettings] = useState({
    netgsmUsername: '',
    netgsmPassword: '',
    netgsmMsgHeader: '',
  });
  
  const [mediaSettings, setMediaSettings] = useState({
    heroVideoUrl: '',
  });

  // Rest of component implementation would go here...
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Sistem Ayarları</h1>
        
        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="platform">Platform</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="security">Güvenlik</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="media">Medya</TabsTrigger>
          </TabsList>

          {/* Platform Settings */}
          <TabsContent value="platform" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Ayarları</CardTitle>
                <CardDescription>Temel platform konfigürasyonu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="siteName">Site Adı</Label>
                  <Input
                    id="siteName"
                    placeholder="Site adı"
                    value={platformSettings.siteName}
                    onChange={(e) => setPlatformSettings(prev => ({ ...prev, siteName: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="defaultLanguage">Varsayılan Dil</Label>
                  <Select value={platformSettings.defaultLanguage} onValueChange={(value) => setPlatformSettings(prev => ({ ...prev, defaultLanguage: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tr">Türkçe</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="maintenanceMode"
                    checked={platformSettings.maintenanceMode}
                    onCheckedChange={(checked) => setPlatformSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                  />
                  <Label htmlFor="maintenanceMode">Bakım Modu</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoApprovalEnabled"
                    checked={platformSettings.autoApprovalEnabled}
                    onCheckedChange={(checked) => setPlatformSettings(prev => ({ ...prev, autoApprovalEnabled: checked }))}
                  />
                  <Label htmlFor="autoApprovalEnabled">Otomatik Onay</Label>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMS Settings */}
          <TabsContent value="sms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SMS Ayarları</CardTitle>
                <CardDescription>NetGSM API konfigürasyonu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="netgsmUsername">NetGSM Kullanıcı Adı</Label>
                    <Input
                      id="netgsmUsername"
                      value={smsSettings.netgsmUsername}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, netgsmUsername: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="netgsmPassword">NetGSM Şifre</Label>
                    <Input
                      id="netgsmPassword"
                      type="password"
                      value={smsSettings.netgsmPassword}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, netgsmPassword: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="netgsmMsgHeader">NetGSM Mesaj Başlığı</Label>
                  <Input
                    id="netgsmMsgHeader"
                    value={smsSettings.netgsmMsgHeader}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, netgsmMsgHeader: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Settings */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Medya Ayarları</CardTitle>
                <CardDescription>Hero video ve diğer medya içeriklerini yönetin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="heroVideoUrl">Hero Bölümü Video URL</Label>
                  <Input
                    id="heroVideoUrl"
                    placeholder="https://example.com/video.mp4"
                    value={mediaSettings.heroVideoUrl}
                    onChange={(e) => setMediaSettings(prev => ({ ...prev, heroVideoUrl: e.target.value }))}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  <p>Video URL'si değiştirildiğinde anasayfadaki hero bölümünde otomatik olarak güncellenir.</p>
                  <p>Desteklenen formatlar: MP4, WebM, OGV</p>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}