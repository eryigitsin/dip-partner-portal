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
import { Trash2, Plus, Edit2, Save, X, Upload, Settings, Mail, MessageSquare, Shield, Database, Video } from 'lucide-react';
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
  categoryId: number;
  isActive: boolean;
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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newService, setNewService] = useState({ name: '', description: '', categoryId: 0 });
  
  // Local state for form fields
  const [platformSettings, setPlatformSettings] = useState({
    siteName: '',
    defaultLanguage: 'tr',
    maintenanceMode: false,
    autoApprovalEnabled: false,
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

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/admin/categories'],
  });

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/admin/services'],
  });

  // Fetch system config
  const { data: systemConfig } = useQuery<SystemConfig>({
    queryKey: ['/api/admin/system-config'],
  });

  // Update local state when systemConfig loads
  React.useEffect(() => {
    if (systemConfig) {
      setPlatformSettings({
        siteName: systemConfig.siteName || '',
        defaultLanguage: systemConfig.defaultLanguage || 'tr',
        maintenanceMode: systemConfig.maintenanceMode || false,
        autoApprovalEnabled: systemConfig.autoApprovalEnabled || false,
      });
      
      setSecuritySettings({
        sessionTimeout: systemConfig.sessionTimeout || 60,
        passwordMinLength: systemConfig.passwordMinLength || 8,
        require2FA: systemConfig.require2FA || false,
      });
      
      setEmailSettings({
        resendApiKey: systemConfig.emailSettings?.resendApiKey || '',
        fromEmail: systemConfig.emailSettings?.fromEmail || '',
        fromName: systemConfig.emailSettings?.fromName || 'DİP Platform',
      });
      
      setSmsSettings({
        netgsmUsername: systemConfig.smsSettings?.netgsmUsername || '',
        netgsmPassword: systemConfig.smsSettings?.netgsmPassword || '',
        netgsmMsgHeader: systemConfig.smsSettings?.netgsmMsgHeader || '',
      });
      
      setMediaSettings({
        heroVideoUrl: systemConfig.heroVideoUrl || '',
      });
    }
  }, [systemConfig]);

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (category: Category) => {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({ title: 'Kategori güncellendi' });
      setEditingCategory(null);
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; description: string }) => {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({ title: 'Kategori oluşturuldu' });
      setNewCategory({ name: '', description: '' });
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async (service: Service) => {
      const response = await fetch(`/api/admin/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
      });
      if (!response.ok) throw new Error('Failed to update service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      toast({ title: 'Hizmet güncellendi' });
      setEditingService(null);
    },
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (service: { name: string; description: string; categoryId: number }) => {
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
      });
      if (!response.ok) throw new Error('Failed to create service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      toast({ title: 'Hizmet oluşturuldu' });
      setNewService({ name: '', description: '', categoryId: 0 });
    },
  });

  // Save mutations for different settings sections
  const savePlatformSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platformSettings),
      });
      if (!response.ok) throw new Error('Failed to update platform settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-config'] });
      toast({ title: 'Platform ayarları kaydedildi' });
    },
  });

  const saveSecuritySettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securitySettings),
      });
      if (!response.ok) throw new Error('Failed to update security settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-config'] });
      toast({ title: 'Güvenlik ayarları kaydedildi' });
    },
  });

  const saveEmailSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSettings }),
      });
      if (!response.ok) throw new Error('Failed to update email settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-config'] });
      toast({ title: 'E-posta ayarları kaydedildi' });
    },
  });

  const saveSmsSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsSettings }),
      });
      if (!response.ok) throw new Error('Failed to update SMS settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-config'] });
      toast({ title: 'SMS ayarları kaydedildi' });
    },
  });

  const saveMediaSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaSettings),
      });
      if (!response.ok) throw new Error('Failed to update media settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-config'] });
      toast({ title: 'Medya ayarları kaydedildi' });
    },
  });

  const handleCategoryEdit = (category: Category) => {
    setEditingCategory({ ...category });
  };

  const handleServiceEdit = (service: Service) => {
    setEditingService({ ...service });
  };

  if (user?.userType !== 'master_admin' && user?.activeUserType !== 'master_admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Yetkisiz Erişim</h1>
            <p className="text-gray-600 mt-2">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Sistem Ayarları</h1>
          <p className="text-gray-600">
            Platform ayarları, hizmet kategorileri ve sistem konfigürasyonlarını yönetin
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Genel
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Kategoriler
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Hizmetler
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Medya
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Ayarları</CardTitle>
                <CardDescription>Genel platform konfigürasyonları</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="siteName">Site Adı</Label>
                    <Input
                      id="siteName"
                      value={platformSettings.siteName}
                      onChange={(e) => setPlatformSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultLanguage">Varsayılan Dil</Label>
                    <Select
                      value={platformSettings.defaultLanguage}
                      onValueChange={(value) => setPlatformSettings(prev => ({ ...prev, defaultLanguage: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tr">Türkçe</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="maintenance"
                    checked={platformSettings.maintenanceMode}
                    onCheckedChange={(checked) => setPlatformSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                  />
                  <Label htmlFor="maintenance">Bakım Modu</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoApproval"
                    checked={platformSettings.autoApprovalEnabled}
                    onCheckedChange={(checked) => setPlatformSettings(prev => ({ ...prev, autoApprovalEnabled: checked }))}
                  />
                  <Label htmlFor="autoApproval">Otomatik Partner Onayı</Label>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => savePlatformSettingsMutation.mutate()}
                    disabled={savePlatformSettingsMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savePlatformSettingsMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Güvenlik Ayarları</CardTitle>
                <CardDescription>Kullanıcı güvenliği ve oturum yönetimi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Oturum Süresi (dakika)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 60 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="passwordMinLength">Minimum Şifre Uzunluğu</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) || 8 }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="require2FA"
                    checked={securitySettings.require2FA}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, require2FA: checked }))}
                  />
                  <Label htmlFor="require2FA">2FA Zorunlu</Label>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => saveSecuritySettingsMutation.mutate()}
                    disabled={saveSecuritySettingsMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveSecuritySettingsMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Management */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hizmet Kategorileri</CardTitle>
                <CardDescription>Partnerlerin sunabileceği hizmet kategorilerini yönetin</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add new category */}
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-3">Yeni Kategori Ekle</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Kategori adı"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    />
                    <Input
                      placeholder="Açıklama"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    />
                  </div>
                  <Button
                    className="mt-3"
                    onClick={() => createCategoryMutation.mutate(newCategory)}
                    disabled={!newCategory.name || createCategoryMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Kategori Ekle
                  </Button>
                </div>

                {/* Categories list */}
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                      {editingCategory?.id === category.id ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 mr-3">
                          <Input
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                          />
                          <Input
                            value={editingCategory.description || ''}
                            onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                            placeholder="Açıklama"
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{category.name}</span>
                            <Badge variant={category.isActive ? 'default' : 'secondary'}>
                              {category.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </div>
                          {category.description && (
                            <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {editingCategory?.id === category.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateCategoryMutation.mutate(editingCategory)}
                              disabled={updateCategoryMutation.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCategory(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Switch
                              checked={category.isActive}
                              onCheckedChange={(checked) => 
                                updateCategoryMutation.mutate({ ...category, isActive: checked })
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCategoryEdit(category)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Management */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hizmetler</CardTitle>
                <CardDescription>Partner hizmetlerini toplu olarak yönetin</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add new service */}
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-3">Yeni Hizmet Ekle</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Hizmet adı"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    />
                    <Select
                      value={newService.categoryId.toString()}
                      onValueChange={(value) => setNewService({ ...newService, categoryId: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Açıklama"
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    />
                  </div>
                  <Button
                    className="mt-3"
                    onClick={() => createServiceMutation.mutate(newService)}
                    disabled={!newService.name || !newService.categoryId || createServiceMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Hizmet Ekle
                  </Button>
                </div>

                {/* Services list */}
                <div className="space-y-3">
                  {services.map((service) => {
                    const category = categories.find(c => c.id === service.categoryId);
                    return (
                      <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                        {editingService?.id === service.id ? (
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 mr-3">
                            <Input
                              value={editingService.name}
                              onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                            />
                            <Select
                              value={editingService.categoryId.toString()}
                              onValueChange={(value) => setEditingService({ ...editingService, categoryId: parseInt(value) })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={editingService.description}
                              onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{service.name}</span>
                              <Badge variant="outline">{category?.name}</Badge>
                              <Badge variant={service.isActive ? 'default' : 'secondary'}>
                                {service.isActive ? 'Aktif' : 'Pasif'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {editingService?.id === service.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateServiceMutation.mutate(editingService)}
                                disabled={updateServiceMutation.isPending}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingService(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Switch
                                checked={service.isActive}
                                onCheckedChange={(checked) => 
                                  updateServiceMutation.mutate({ ...service, isActive: checked })
                                }
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleServiceEdit(service)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Ayarları</CardTitle>
                <CardDescription>Resend API konfigürasyonu ve email şablonları</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="resendApiKey">Resend API Key</Label>
                  <Input
                    id="resendApiKey"
                    type="password"
                    value={emailSettings.resendApiKey}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, resendApiKey: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromEmail">Gönderen Email</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={emailSettings.fromEmail}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromName">Gönderen Ad</Label>
                    <Input
                      id="fromName"
                      value={emailSettings.fromName}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => saveEmailSettingsMutation.mutate()}
                    disabled={saveEmailSettingsMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveEmailSettingsMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
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
                  <Button 
                    onClick={() => saveSmsSettingsMutation.mutate()}
                    disabled={saveSmsSettingsMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveSmsSettingsMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
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
                  <Button 
                    onClick={() => saveMediaSettingsMutation.mutate()}
                    disabled={saveMediaSettingsMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveMediaSettingsMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
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