import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  UserPlus, 
  Building2, 
  Shield, 
  Edit, 
  Mail,
  Phone,
  Calendar,
  MapPin,
  Globe,
  Search
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: string;
  isVerified: boolean;
  language: string;
  createdAt: string;
}

interface Partner {
  id: number;
  userId: number;
  companyName: string;
  contactPerson: string;
  logo?: string;
  description?: string;
  serviceCategory: string;
  city?: string;
  country?: string;
  website?: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [isNewPartnerDialogOpen, setIsNewPartnerDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // New user form state
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    userType: 'user',
    language: 'tr'
  });

  // New partner form state
  const [newPartnerData, setNewPartnerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    contactPerson: '',
    description: '',
    serviceCategory: '',
    services: '',
    city: '',
    country: 'Türkiye',
    website: '',
    dipAdvantages: ''
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.userType === 'master_admin',
  });

  // Fetch all partners
  const { data: partners = [], isLoading: partnersLoading } = useQuery<Partner[]>({
    queryKey: ['/api/admin/partners'],
    enabled: user?.userType === 'master_admin',
  });

  // Fetch service categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Filter users by search term
  const filteredUsers = users.filter((u: User) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(searchLower) ||
      u.lastName?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.phone?.toLowerCase().includes(searchLower) ||
      u.userType?.toLowerCase().includes(searchLower)
    );
  });

  // Filter partners by search term
  const filteredPartners = partners.filter((p: Partner) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      p.companyName?.toLowerCase().includes(searchLower) ||
      p.contactPerson?.toLowerCase().includes(searchLower) ||
      p.serviceCategory?.toLowerCase().includes(searchLower) ||
      p.city?.toLowerCase().includes(searchLower) ||
      p.country?.toLowerCase().includes(searchLower) ||
      p.website?.toLowerCase().includes(searchLower)
    );
  });

  // Filter users by type
  const regularUsers = filteredUsers.filter(u => u.userType === 'user');
  const partnerUsers = filteredUsers.filter(u => u.userType === 'partner');
  const editorUsers = filteredUsers.filter(u => u.userType === 'editor_admin');

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      const response = await apiRequest('POST', '/api/admin/users', userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Yeni kullanıcı oluşturuldu ve hoş geldin e-postası gönderildi.",
      });
      setIsNewUserDialogOpen(false);
      setNewUserData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        userType: 'user',
        language: 'tr'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Kullanıcı oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  // Create new partner mutation
  const createPartnerMutation = useMutation({
    mutationFn: async (partnerData: typeof newPartnerData) => {
      const response = await apiRequest('POST', '/api/admin/partners', partnerData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Yeni partner oluşturuldu ve hoş geldin e-postası gönderildi.",
      });
      setIsNewPartnerDialogOpen(false);
      setNewPartnerData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        companyName: '',
        contactPerson: '',
        description: '',
        serviceCategory: '',
        services: '',
        city: '',
        country: 'Türkiye',
        website: '',
        dipAdvantages: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Partner oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  // Update user type mutation
  const updateUserTypeMutation = useMutation({
    mutationFn: async ({ userId, userType }: { userId: number; userType: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${userId}/type`, { userType });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kullanıcı yetki düzeyi güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Yetki güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  // Assign user to partner mutation
  const assignToPartnerMutation = useMutation({
    mutationFn: async ({ userId, partnerId }: { userId: number; partnerId: number }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${userId}/assign-partner`, { partnerId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kullanıcı partnere atandı.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Partner ataması yapılırken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  if (user?.userType !== 'master_admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Erişim Reddedildi</h1>
            <p className="text-gray-600 mt-2">Bu sayfaya erişim yetkiniz bulunmuyor.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600">Tüm kullanıcıları, partnerleri ve editörleri yönetin.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              data-testid="input-user-search"
              type="text"
              placeholder="Kullanıcı ve partner ara (ad, şirket, e-posta, telefon, şehir...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Yeni Kullanıcı
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Ad</Label>
                    <Input
                      id="firstName"
                      value={newUserData.firstName}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Soyad</Label>
                    <Input
                      id="lastName"
                      value={newUserData.lastName}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Şifre</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="userType">Kullanıcı Tipi</Label>
                  <Select
                    value={newUserData.userType}
                    onValueChange={(value) => setNewUserData(prev => ({ ...prev, userType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Normal Kullanıcı</SelectItem>
                      <SelectItem value="editor_admin">Editör Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => createUserMutation.mutate(newUserData)}
                  disabled={createUserMutation.isPending}
                  className="w-full"
                >
                  {createUserMutation.isPending ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isNewPartnerDialogOpen} onOpenChange={setIsNewPartnerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Yeni Partner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Partner Ekle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="partnerFirstName">İletişim Kişisi Adı</Label>
                    <Input
                      id="partnerFirstName"
                      value={newPartnerData.firstName}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="partnerLastName">İletişim Kişisi Soyadı</Label>
                    <Input
                      id="partnerLastName"
                      value={newPartnerData.lastName}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="partnerEmail">E-posta</Label>
                  <Input
                    id="partnerEmail"
                    type="email"
                    value={newPartnerData.email}
                    onChange={(e) => setNewPartnerData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="partnerPassword">Şifre</Label>
                  <Input
                    id="partnerPassword"
                    type="password"
                    value={newPartnerData.password}
                    onChange={(e) => setNewPartnerData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="companyName">Şirket Adı</Label>
                  <Input
                    id="companyName"
                    value={newPartnerData.companyName}
                    onChange={(e) => setNewPartnerData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="contactPerson">İletişim Kişisi</Label>
                  <Input
                    id="contactPerson"
                    value={newPartnerData.contactPerson}
                    onChange={(e) => setNewPartnerData(prev => ({ ...prev, contactPerson: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="serviceCategory">Hizmet Kategorisi</Label>
                  <Select
                    value={newPartnerData.serviceCategory}
                    onValueChange={(value) => setNewPartnerData(prev => ({ ...prev, serviceCategory: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="services">Sunulan Hizmetler</Label>
                  <Textarea
                    id="services"
                    value={newPartnerData.services}
                    onChange={(e) => setNewPartnerData(prev => ({ ...prev, services: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Şirket Açıklaması</Label>
                  <Textarea
                    id="description"
                    value={newPartnerData.description}
                    onChange={(e) => setNewPartnerData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Şehir</Label>
                    <Input
                      id="city"
                      value={newPartnerData.city}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Web Sitesi</Label>
                    <Input
                      id="website"
                      value={newPartnerData.website}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, website: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="dipAdvantages">DİP Üyelerine Özel Avantajlar</Label>
                  <Textarea
                    id="dipAdvantages"
                    value={newPartnerData.dipAdvantages}
                    onChange={(e) => setNewPartnerData(prev => ({ ...prev, dipAdvantages: e.target.value }))}
                    rows={2}
                  />
                </div>
                <Button 
                  onClick={() => createPartnerMutation.mutate(newPartnerData)}
                  disabled={createPartnerMutation.isPending}
                  className="w-full"
                >
                  {createPartnerMutation.isPending ? 'Oluşturuluyor...' : 'Partner Oluştur'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Kullanıcılar ({regularUsers.length})
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Partnerler ({partnerUsers.length})
            </TabsTrigger>
            <TabsTrigger value="editors" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Editörler ({editorUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Normal Kullanıcılar</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : regularUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Henüz kullanıcı bulunmuyor.</p>
                ) : (
                  <div className="space-y-4">
                    {regularUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {user.email}
                              {user.phone && (
                                <>
                                  <Phone className="h-3 w-3 ml-2" />
                                  {user.phone}
                                </>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={user.isVerified ? "default" : "secondary"}>
                                {user.isVerified ? "Doğrulanmış" : "Doğrulanmamış"}
                              </Badge>
                              <Badge variant="outline">
                                {user.language === 'tr' ? 'Türkçe' : 'English'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserTypeMutation.mutate({ userId: user.id, userType: 'editor_admin' })}
                            disabled={updateUserTypeMutation.isPending}
                          >
                            Editör Yap
                          </Button>
                          <Select
                            onValueChange={(partnerId) => 
                              assignToPartnerMutation.mutate({ userId: user.id, partnerId: parseInt(partnerId) })
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Partner'e Ata" />
                            </SelectTrigger>
                            <SelectContent>
                              {partners.map((partner) => (
                                <SelectItem key={partner.id} value={partner.id.toString()}>
                                  {partner.companyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partners" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Partner Kullanıcıları</CardTitle>
              </CardHeader>
              <CardContent>
                {partnersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : filteredPartners.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {searchTerm ? 'Arama kriterlerine uygun partner bulunmuyor.' : 'Henüz partner bulunmuyor.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredPartners.map((partner) => {
                      const partnerUser = partnerUsers.find(u => u.id === partner.userId);
                      return (
                        <div key={partner.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{partner.companyName}</p>
                              <p className="text-sm text-gray-500">
                                İletişim: {partner.contactPerson}
                              </p>
                              {partnerUser && (
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                  <Mail className="h-3 w-3" />
                                  {partnerUser.email}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={partner.isApproved ? "default" : "secondary"}>
                                  {partner.isApproved ? "Onaylanmış" : "Onay Bekliyor"}
                                </Badge>
                                <Badge variant={partner.isActive ? "default" : "destructive"}>
                                  {partner.isActive ? "Aktif" : "Pasif"}
                                </Badge>
                                <Badge variant="outline">
                                  {partner.serviceCategory}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {partner.city && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <MapPin className="h-3 w-3" />
                                {partner.city}
                              </div>
                            )}
                            {partner.website && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Globe className="h-3 w-3" />
                                Web
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="editors" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Editör Adminler</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : editorUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Henüz editör admin bulunmuyor.</p>
                ) : (
                  <div className="space-y-4">
                    {editorUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Shield className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {user.email}
                              {user.phone && (
                                <>
                                  <Phone className="h-3 w-3 ml-2" />
                                  {user.phone}
                                </>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="default">Editör Admin</Badge>
                              <Badge variant={user.isVerified ? "default" : "secondary"}>
                                {user.isVerified ? "Doğrulanmış" : "Doğrulanmamış"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserTypeMutation.mutate({ userId: user.id, userType: 'user' })}
                            disabled={updateUserTypeMutation.isPending}
                          >
                            Normal Kullanıcı Yap
                          </Button>
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