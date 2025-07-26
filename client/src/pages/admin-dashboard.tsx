import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ApplicationDetailDialog } from "@/components/forms/application-detail-dialog";
import { PartnerApplication, Partner, QuoteRequest } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  UserCheck, 
  Building, 
  FileText, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  Globe,
  Eye,
  Edit,
  Trash2
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerFormData, setPartnerFormData] = useState<Partial<Partner & { email?: string; password?: string }>>({});

  const { data: applications = [] } = useQuery<PartnerApplication[]>({
    queryKey: ["/api/partner-applications"],
    enabled: !!user && ["master_admin", "editor_admin"].includes(user.userType),
  });

  const { data: partners = [] } = useQuery<Partner[]>({
    queryKey: ["/api/partners", { approved: undefined }],
    queryFn: async () => {
      const response = await fetch("/api/partners?approved=");
      if (!response.ok) throw new Error("Failed to fetch partners");
      return response.json();
    },
    enabled: !!user && ["master_admin", "editor_admin"].includes(user.userType),
  });

  const { data: allQuoteRequests = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests", "all"],
    queryFn: async () => {
      const response = await fetch("/api/quote-requests");
      if (!response.ok) throw new Error("Failed to fetch quote requests");
      return response.json();
    },
    enabled: !!user && user.userType === "master_admin",
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const response = await apiRequest("PATCH", `/api/partner-applications/${id}`, {
        status,
        notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({
        title: "Başarılı",
        description: "Başvuru durumu güncellendi",
      });
      setDetailDialogOpen(false);
      setSelectedApplicationId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Başvuru güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async (updatedPartner: Partial<Partner & { email?: string; password?: string }> & { id: number }) => {
      const response = await apiRequest("PATCH", `/api/partners/${updatedPartner.id}`, updatedPartner);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({
        title: "Başarılı",
        description: "Partner bilgileri güncellendi",
      });
      setEditingPartner(null);
      setPartnerFormData({});
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Partner güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  if (!user || !["master_admin", "editor_admin"].includes(user.userType)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Bu sayfaya erişim yetkiniz bulunmamaktadır
          </h1>
          <p className="text-gray-600">
            Admin paneline erişebilmek için yönetici hesabınızla giriş yapmanız gerekmektedir.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  const handleApproveApplication = (id: number, notes?: string) => {
    updateApplicationMutation.mutate({ 
      id, 
      status: "approved", 
      notes: notes || "Başvuru onaylandı ve partner olarak sisteme eklendi." 
    });
  };

  const handleRejectApplication = (id: number, notes?: string) => {
    updateApplicationMutation.mutate({ 
      id, 
      status: "rejected", 
      notes: notes || "Başvuru kriterleri karşılamadığı için reddedildi." 
    });
  };

  const handleViewApplicationDetail = (id: number) => {
    setSelectedApplicationId(id);
    setDetailDialogOpen(true);
  };

  const handleEditPartner = (partner: Partner) => {
    setEditingPartner(partner);
    setPartnerFormData(partner);
  };

  const handleSavePartner = () => {
    if (!editingPartner) return;
    updatePartnerMutation.mutate({ ...partnerFormData, id: editingPartner.id });
  };

  const togglePartnerStatus = (partnerId: number, isActive: boolean) => {
    updatePartnerMutation.mutate({ id: partnerId, isActive });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Beklemede";
      case "approved":
        return "Onaylandı";
      case "rejected":
        return "Reddedildi";
      default:
        return status;
    }
  };

  const pendingApplications = applications.filter(app => app.status === "pending").length;
  const approvedPartners = partners.filter(p => p.isApproved).length;
  const totalPartners = partners.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.userType === "master_admin" ? "Master Admin" : "Editör Admin"} Paneli
              </h1>
              <p className="text-gray-600 mt-2">
                Hoş geldiniz, {user.firstName} {user.lastName}
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="applications">Başvurular</TabsTrigger>
            <TabsTrigger value="partners">Partnerler</TabsTrigger>
            {user.userType === "master_admin" && (
              <TabsTrigger value="quotes">Teklif Talepleri</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bekleyen Başvurular</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingApplications}</div>
                  <p className="text-xs text-muted-foreground">
                    Onay bekleyen partner başvuruları
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktif Partnerler</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{approvedPartners}</div>
                  <p className="text-xs text-muted-foreground">
                    Onaylanmış ve aktif partnerler
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Partnerler</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPartners}</div>
                  <p className="text-xs text-muted-foreground">
                    Sistemdeki tüm partnerler
                  </p>
                </CardContent>
              </Card>

              {user.userType === "master_admin" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Teklif Talepleri</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{allQuoteRequests.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Toplam teklif talebi sayısı
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Son Aktiviteler</CardTitle>
                <CardDescription>
                  Sistemdeki son partner başvuruları ve güncellemeler
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Henüz başvuru yok
                    </h3>
                    <p className="text-gray-600">
                      Partner başvuruları geldiğinde burada görünecekler.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.slice(0, 5).map((application) => (
                      <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">
                              {application.firstName || ''} {application.lastName || ''}
                            </h4>
                            <Badge className={getStatusColor(application.status || 'pending')}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(application.status || 'pending')}
                                <span>{getStatusText(application.status || 'pending')}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{application.company || ''}</p>
                          <p className="text-sm text-gray-500 mt-1">{application.serviceCategory}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {application.createdAt ? new Date(application.createdAt).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş'}
                          </p>
                          {application.status === "pending" && (
                            <div className="flex space-x-2 mt-2">
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApproveApplication(application.id)}
                                disabled={updateApplicationMutation.isPending}
                              >
                                Onayla
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRejectApplication(application.id)}
                                disabled={updateApplicationMutation.isPending}
                              >
                                Reddet
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Partner Başvuruları</CardTitle>
                <CardDescription>
                  Partner olmak isteyen şirketlerin başvurularını yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Başvuru bulunmuyor
                    </h3>
                    <p className="text-gray-600">
                      Partner başvuruları geldiğinde burada görünecekler.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Başvuran</TableHead>
                        <TableHead>Şirket</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>İletişim</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {application.firstName} {application.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{application.title}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{application.company}</div>
                              {application.website && (
                                <div className="text-sm text-gray-500 flex items-center space-x-1">
                                  <Globe className="h-3 w-3" />
                                  <span>{application.website}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{application.serviceCategory}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{application.email || ''}</span>
                              </div>
                              <div className="text-sm flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{application.phone || ''}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(application.status || 'pending')}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(application.status || 'pending')}
                                <span>{getStatusText(application.status || 'pending')}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {application.createdAt ? new Date(application.createdAt).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewApplicationDetail(application.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Detay
                              </Button>
                              {application.status === "pending" && (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApproveApplication(application.id)}
                                    disabled={updateApplicationMutation.isPending}
                                  >
                                    Onayla
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleRejectApplication(application.id)}
                                    disabled={updateApplicationMutation.isPending}
                                  >
                                    Reddet
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partners" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Partner Yönetimi</CardTitle>
                <CardDescription>
                  Sistemdeki partnerleri görüntüleyin ve yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {partners.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Partner bulunmuyor
                    </h3>
                    <p className="text-gray-600">
                      Onaylanan partnerler burada görünecekler.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Şirket</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Takipçi</TableHead>
                        <TableHead>Görüntüleme</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Kayıt Tarihi</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partners.map((partner) => (
                        <TableRow key={partner.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                {partner.logo ? (
                                  <img 
                                    src={partner.logo} 
                                    alt={partner.companyName}
                                    className="w-8 h-8 rounded-lg object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-gray-600">
                                    {partner.companyName.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{partner.companyName}</div>
                                <div className="text-sm text-gray-500">{partner.city}, {partner.country}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{partner.serviceCategory}</TableCell>
                          <TableCell>{partner.followersCount}</TableCell>
                          <TableCell>{partner.profileViews}</TableCell>
                          <TableCell>
                            <Badge variant={partner.isApproved ? "default" : "secondary"}>
                              {partner.isApproved ? "Aktif" : "Beklemede"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {partner.createdAt ? new Date(partner.createdAt).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                Görüntüle
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditPartner(partner)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Düzenle
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {user.userType === "master_admin" && (
            <TabsContent value="quotes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Teklif Talepleri</CardTitle>
                  <CardDescription>
                    Sistemdeki tüm teklif taleplerini görüntüleyin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allQuoteRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Teklif talebi bulunmuyor
                      </h3>
                      <p className="text-gray-600">
                        Kullanıcılar teklif talep ettiğinde burada görünecekler.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Teklif Talepleri Listesi
                      </h3>
                      <p className="text-gray-600">
                        {allQuoteRequests.length} adet teklif talebi bulunmaktadır.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Application Detail Dialog */}
      <ApplicationDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        applicationId={selectedApplicationId}
        onApprove={handleApproveApplication}
        onReject={handleRejectApplication}
      />
      
      {/* Partner Edit Dialog */}
      <Dialog open={!!editingPartner} onOpenChange={() => {
        setEditingPartner(null);
        setPartnerFormData({});
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partner Bilgilerini Düzenle</DialogTitle>
            <DialogDescription>
              {editingPartner?.companyName} partner bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          
          {editingPartner && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Şirket Adı</Label>
                  <Input
                    id="companyName"
                    value={partnerFormData.companyName || ''}
                    onChange={(e) => setPartnerFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">İletişim Kişisi</Label>
                  <Input
                    id="contactPerson"
                    value={partnerFormData.contactPerson || ''}
                    onChange={(e) => setPartnerFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={partnerFormData.website || ''}
                    onChange={(e) => setPartnerFormData(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceCategory">Hizmet Kategorisi</Label>
                  <Input
                    id="serviceCategory"
                    value={partnerFormData.serviceCategory || ''}
                    onChange={(e) => setPartnerFormData(prev => ({ ...prev, serviceCategory: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companySize">Şirket Büyüklüğü</Label>
                  <Input
                    id="companySize"
                    value={partnerFormData.companySize || ''}
                    onChange={(e) => setPartnerFormData(prev => ({ ...prev, companySize: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sectorExperience">Sektör Deneyimi (yıl)</Label>
                  <Input
                    id="sectorExperience"
                    value={partnerFormData.sectorExperience || ''}
                    onChange={(e) => setPartnerFormData(prev => ({ ...prev, sectorExperience: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={partnerFormData.description || ''}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="services">Hizmetler</Label>
                <Textarea
                  id="services"
                  value={partnerFormData.services || ''}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, services: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Şirket Adresi</Label>
                <Textarea
                  id="companyAddress"
                  value={partnerFormData.companyAddress || ''}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                  rows={3}
                />
              </div>
              
              {user?.userType === "master_admin" && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-yellow-50">
                  <div className="space-y-2">
                    <Label htmlFor="partnerEmail">Partner E-posta</Label>
                    <Input
                      id="partnerEmail"
                      type="email"
                      value={partnerFormData.email || ''}
                      onChange={(e) => setPartnerFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="partner@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partnerPassword">Partner Şifresi</Label>
                    <Input
                      id="partnerPassword"
                      type="password"
                      value={partnerFormData.password || ''}
                      onChange={(e) => setPartnerFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Yeni şifre"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingPartner(null);
                    setPartnerFormData({});
                  }}
                >
                  İptal
                </Button>
                <Button 
                  onClick={handleSavePartner}
                  disabled={updatePartnerMutation.isPending}
                >
                  {updatePartnerMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
