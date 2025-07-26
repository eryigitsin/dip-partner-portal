import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User, Building, CreditCard, Heart, Settings, Lock, Trash2, Save } from 'lucide-react';
import { UserProfile, CompanyBillingInfo, Partner } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function UserPanel() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');

  // Fetch user profile data
  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user/profile'],
    enabled: !!user,
  });

  // Fetch company billing info
  const { data: billingInfo, isLoading: billingLoading } = useQuery<CompanyBillingInfo>({
    queryKey: ['/api/user/billing'],
    enabled: !!user,
  });

  // Fetch followed partners
  const { data: followedPartners, isLoading: followersLoading } = useQuery<Partner[]>({
    queryKey: ['/api/user/followed-partners'],
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', '/api/user/profile', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Başarılı',
        description: 'Profil bilgileriniz güncellendi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Profil güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Update billing info mutation
  const updateBillingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', '/api/user/billing', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/billing'] });
      toast({
        title: 'Başarılı',
        description: 'Fatura bilgileriniz güncellendi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Fatura bilgileri güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Unfollow partner mutation
  const unfollowMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      const res = await apiRequest('DELETE', `/api/user/follow/${partnerId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/followed-partners'] });
      toast({
        title: 'Başarılı',
        description: 'Partner takipten çıkarıldı.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Partner takipten çıkarılırken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest('PUT', '/api/user/password', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Şifreniz güncellendi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Şifre güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/user/account');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Hesap Silindi',
        description: 'Hesabınız başarıyla silindi.',
      });
      // Logout after account deletion
      logoutMutation.mutate();
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Hesap silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone'),
      company: formData.get('company'),
      title: formData.get('title'),
      sector: formData.get('sector'),
      website: formData.get('website'),
      linkedinProfile: formData.get('linkedinProfile'),
    };
    updateProfileMutation.mutate(data);
  };

  const handleBillingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      companyName: formData.get('companyName'),
      taxNumber: formData.get('taxNumber'),
      taxOffice: formData.get('taxOffice'),
      address: formData.get('address'),
      city: formData.get('city'),
      country: formData.get('country'),
      postalCode: formData.get('postalCode'),
      phone: formData.get('phone'),
      email: formData.get('email'),
    };
    updateBillingMutation.mutate(data);
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Hata',
        description: 'Yeni şifreler eşleşmiyor.',
        variant: 'destructive',
      });
      return;
    }

    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (!user) {
    return <div>Yetkilendirme gerekli...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Kişisel Panelim</h1>
            <p className="text-gray-600 mt-2">Hesap bilgilerinizi yönetin ve takip ettiğiniz partnerleri görün</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Şirket
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Faturalama
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Takip Ettiklerim
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Ayarlar
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Kişisel Bilgiler</CardTitle>
                <CardDescription>
                  Temel profil bilgilerinizi güncelleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Ad</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        defaultValue={user.firstName}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Soyad</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        defaultValue={user.lastName}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-posta</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={user.email}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        name="phone"
                        defaultValue={user.phone || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="title">Ünvan</Label>
                      <Input
                        id="title"
                        name="title"
                        defaultValue={userProfile?.title || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sector">Sektör</Label>
                      <Input
                        id="sector"
                        name="sector"
                        defaultValue={userProfile?.sector || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Web Sitesi</Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        defaultValue={userProfile?.website || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="linkedinProfile">LinkedIn Profili</Label>
                      <Input
                        id="linkedinProfile"
                        name="linkedinProfile"
                        type="url"
                        defaultValue={userProfile?.linkedinProfile || ''}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateProfileMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Tab */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Şirket Bilgileri</CardTitle>
                <CardDescription>
                  Şirket bilgilerinizi güncelleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="company">Şirket Adı</Label>
                    <Input
                      id="company"
                      name="company"
                      defaultValue={userProfile?.company || ''}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateProfileMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Fatura Bilgileri</CardTitle>
                <CardDescription>
                  Faturalama için şirket bilgilerinizi girin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBillingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Şirket Unvanı</Label>
                      <Input
                        id="companyName"
                        name="companyName"
                        defaultValue={billingInfo?.companyName || ''}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="taxNumber">Vergi Numarası</Label>
                      <Input
                        id="taxNumber"
                        name="taxNumber"
                        defaultValue={billingInfo?.taxNumber || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="taxOffice">Vergi Dairesi</Label>
                      <Input
                        id="taxOffice"
                        name="taxOffice"
                        defaultValue={billingInfo?.taxOffice || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">Şehir</Label>
                      <Input
                        id="city"
                        name="city"
                        defaultValue={billingInfo?.city || ''}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Ülke</Label>
                      <Input
                        id="country"
                        name="country"
                        defaultValue={billingInfo?.country || 'Turkey'}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Posta Kodu</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        defaultValue={billingInfo?.postalCode || ''}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Adres</Label>
                    <Textarea
                      id="address"
                      name="address"
                      defaultValue={billingInfo?.address || ''}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        name="phone"
                        defaultValue={billingInfo?.phone || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-posta</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={billingInfo?.email || ''}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={updateBillingMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateBillingMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following">
            <Card>
              <CardHeader>
                <CardTitle>Takip Ettiğim Partnerler</CardTitle>
                <CardDescription>
                  Takip ettiğiniz partnerleri görün ve yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {followersLoading ? (
                  <div>Yükleniyor...</div>
                ) : !followedPartners || followedPartners.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz takip ettiğiniz partner yok</h3>
                    <p className="mt-1 text-sm text-gray-500">Partner kataloguna göz atın ve ilgilendiğiniz partnerleri takip edin.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {followedPartners?.map((partner: any) => (
                      <div key={partner.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{partner.companyName}</h3>
                            <p className="text-sm text-gray-600">{partner.serviceCategory}</p>
                            <Badge variant="secondary" className="mt-2">
                              {partner.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unfollowMutation.mutate(partner.id)}
                            disabled={unfollowMutation.isPending}
                          >
                            Takipten Çıkar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Password Change */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Şifre Değiştir
                  </CardTitle>
                  <CardDescription>
                    Hesabınızın güvenliği için düzenli olarak şifrenizi değiştirin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">Yeni Şifre</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Account Deletion */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="h-5 w-5" />
                    Hesabı Sil
                  </CardTitle>
                  <CardDescription>
                    Hesabınızı kalıcı olarak silin. Bu işlem geri alınamaz.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Hesabımı Sil
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hesabınızı silmek istediğinizden emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecek ve hesabınıza bir daha erişemeyeceksiniz.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteAccountMutation.mutate()}
                          disabled={deleteAccountMutation.isPending}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deleteAccountMutation.isPending ? 'Siliniyor...' : 'Evet, Hesabımı Sil'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}