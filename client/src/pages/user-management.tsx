import React, { useState, useRef } from 'react';
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
  Search,
  Upload,
  X,
  ImageIcon
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
    phone: '',
    company: '',
    contactPerson: '',
    website: '',
    companyAddress: '',
    serviceCategory: '',
    businessDescription: '',
    companySize: '',
    foundingYear: '',
    sectorExperience: '',
    targetMarkets: '',
    services: '',
    dipAdvantages: '',
    whyPartner: '',
    references: '',
    linkedinProfile: '',
    twitterProfile: '',
    instagramProfile: '',
    facebookProfile: '',
    city: '',
    country: 'Türkiye'
  });
  
  // File upload states for new partner
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [coverPreview, setCoverPreview] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // File upload handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'Dosya Boyutu Hatası',
          description: 'Logo dosyası 5MB\'dan küçük olmalıdır.',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'Dosya Boyutu Hatası',
          description: 'Kapak dosyası 10MB\'dan küçük olmalıdır.',
          variant: 'destructive',
        });
        return;
      }
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setCoverPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };



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
  // Create partner mutation (using partner-applications endpoint for consistency)
  const createPartnerMutation = useMutation({
    mutationFn: async (partnerData: typeof newPartnerData) => {
      const formData = new FormData();
      
      // Add all text fields (matching partner application form structure)
      Object.entries(partnerData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as string);
        }
      });
      
      // Add services field
      formData.append('services', partnerData.services || '');
      
      // Add status as approved for auto-approval
      formData.append('status', 'approved');
      
      // Add files
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (coverFile) {
        formData.append('coverImage', coverFile);
      }
      
      const response = await fetch('/api/admin/create-partner-direct', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Partner oluşturulamadı');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Partner başarıyla oluşturuldu ve kataloga eklendi.",
      });
      setIsNewPartnerDialogOpen(false);
      // Reset form data
      setNewPartnerData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        contactPerson: '',
        website: '',
        companyAddress: '',
        serviceCategory: '',
        businessDescription: '',
        companySize: '',
        foundingYear: '',
        sectorExperience: '',
        targetMarkets: '',
        services: '',
        dipAdvantages: '',
        whyPartner: '',
        references: '',
        linkedinProfile: '',
        twitterProfile: '',
        instagramProfile: '',
        facebookProfile: '',
        city: '',
        country: 'Türkiye'
      });
      setLogoFile(null);
      setCoverFile(null);
      setLogoPreview('');
      setCoverPreview('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partners'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Partner oluşturulurken hata oluştu",
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
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Kişisel Bilgiler</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="partnerFirstName">Ad *</Label>
                      <Input
                        id="partnerFirstName"
                        value={newPartnerData.firstName}
                        onChange={(e) => setNewPartnerData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Adınız"
                      />
                    </div>
                    <div>
                      <Label htmlFor="partnerLastName">Soyad *</Label>
                      <Input
                        id="partnerLastName"
                        value={newPartnerData.lastName}
                        onChange={(e) => setNewPartnerData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Soyadınız"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="partnerEmail">E-posta *</Label>
                      <Input
                        id="partnerEmail"
                        type="email"
                        value={newPartnerData.email}
                        onChange={(e) => setNewPartnerData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="ornek@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="partnerPhone">Telefon</Label>
                      <Input
                        id="partnerPhone"
                        value={newPartnerData.phone}
                        onChange={(e) => setNewPartnerData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+90 555 123 4567"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Şirket Bilgileri</h3>
                  <div>
                    <Label htmlFor="companyName">Şirket Adı *</Label>
                    <Input
                      id="companyName"
                      value={newPartnerData.company}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Şirket adınız"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">İletişim Kişisi</Label>
                    <Input
                      id="contactPerson"
                      value={newPartnerData.contactPerson}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, contactPerson: e.target.value }))}
                      placeholder="İletişim sorumlusu"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="website">Web Sitesi</Label>
                      <Input
                        id="website"
                        value={newPartnerData.website}
                        onChange={(e) => setNewPartnerData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://www.sirketiniz.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="companySize">Şirket Büyüklüğü</Label>
                      <Input
                        id="companySize"
                        value={newPartnerData.companySize}
                        onChange={(e) => setNewPartnerData(prev => ({ ...prev, companySize: e.target.value }))}
                        placeholder="1-10, 11-50, 51-200 vb."
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="companyAddress">Şirket Adresi</Label>
                    <Textarea
                      id="companyAddress"
                      value={newPartnerData.companyAddress}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, companyAddress: e.target.value }))}
                      placeholder="Tam adres bilgileriniz"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessDescription">Şirket Açıklaması</Label>
                    <Textarea
                      id="businessDescription"
                      value={newPartnerData.businessDescription}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, businessDescription: e.target.value }))}
                      placeholder="Şirketinizin faaliyet alanı ve açıklaması"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Service Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Hizmet Bilgileri</h3>
                  <div>
                    <Label htmlFor="serviceCategory">Hizmet Kategorisi *</Label>
                    <Select
                      value={newPartnerData.serviceCategory}
                      onValueChange={(value) => setNewPartnerData(prev => ({ ...prev, serviceCategory: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories ? (categories as any[]).map((category: any) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="services">Sunduğunuz Hizmetler</Label>
                    <Textarea
                      id="services"
                      value={newPartnerData.services}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, services: e.target.value }))}
                      placeholder="Sunduğunuz hizmetleri açıklayın... (Partner daha sonra detaylandırabilir)"
                      rows={3}
                    />
                  </div>
                </div>

                {/* File Uploads */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Görseller</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Logo Upload */}
                    <div>
                      <Label>Şirket Logosu</Label>
                      <div className="mt-2">
                        <div 
                          onClick={() => logoInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                        >
                          {logoPreview ? (
                            <div className="relative">
                              <img src={logoPreview} alt="Logo Preview" className="max-h-20 mx-auto rounded" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLogoPreview('');
                                  setLogoFile(null);
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <Upload className="mx-auto h-8 w-8 text-gray-400" />
                              <p className="text-sm text-gray-600 mt-2">Logo yükleyin</p>
                              <p className="text-xs text-gray-400">PNG, JPG (maks. 5MB)</p>
                            </div>
                          )}
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Cover Image Upload */}
                    <div>
                      <Label>Kapak Görseli</Label>
                      <div className="mt-2">
                        <div 
                          onClick={() => coverInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                        >
                          {coverPreview ? (
                            <div className="relative">
                              <img src={coverPreview} alt="Cover Preview" className="max-h-20 mx-auto rounded" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCoverPreview('');
                                  setCoverFile(null);
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                              <p className="text-sm text-gray-600 mt-2">Kapak görseli yükleyin</p>
                              <p className="text-xs text-gray-400">PNG, JPG (maks. 10MB)</p>
                            </div>
                          )}
                        </div>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Ek Bilgiler</h3>
                  <div>
                    <Label htmlFor="dipAdvantages">DİP Üyelerine Özel Avantajlarınız</Label>
                    <Textarea
                      id="dipAdvantages"
                      value={newPartnerData.dipAdvantages}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, dipAdvantages: e.target.value }))}
                      placeholder="İndirim oranları, özel hizmetler vb..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="whyPartner">Neden DİP ile Çalışmak İstiyorsunuz?</Label>
                    <Textarea
                      id="whyPartner"
                      value={newPartnerData.whyPartner}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, whyPartner: e.target.value }))}
                      placeholder="Motivasyonunuzu açıklayın..."
                      rows={3}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => createPartnerMutation.mutate(newPartnerData)}
                  disabled={createPartnerMutation.isPending}
                  className="w-full"
                >
                  {createPartnerMutation.isPending ? 'Oluşturuluyor...' : 'Partner Oluştur ve Onayla'}
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
                              {(() => {
                                const managedPartner = partners.find(p => p.managedBy === user.id);
                                return managedPartner && (
                                  <Badge variant="secondary" className="text-blue-600">
                                    Yönettiği Partner: {managedPartner.companyName}
                                  </Badge>
                                );
                              })()}
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
                              {partners.filter(p => !p.managedBy || p.managedBy === user.id).map((partner) => (
                                <SelectItem key={partner.id} value={partner.id.toString()}>
                                  {partner.companyName} {partner.managedBy === user.id ? '(Yönetiyor)' : ''}
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
                              {partner.managedBy && (
                                <p className="text-sm text-blue-600 flex items-center gap-2">
                                  <Users className="h-3 w-3" />
                                  Yönetici: {(() => {
                                    const manager = regularUsers.concat(partnerUsers).concat(editorUsers).find(u => u.id === partner.managedBy);
                                    return manager ? `${manager.firstName} ${manager.lastName}` : 'Bilinmiyor';
                                  })()}
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