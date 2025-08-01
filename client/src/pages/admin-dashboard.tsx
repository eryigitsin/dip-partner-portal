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
import { QuoteRequestsEmbedded } from "@/components/admin/quote-requests-embedded";
import { PartnerInspectionModal } from "@/components/admin/partner-inspection-modal";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
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
  Trash2,
  Upload,
  ImageIcon,
  MessageSquare,
  User,
  Flag,
  Handshake,
  ChevronDown,
  ChevronRight
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerFormData, setPartnerFormData] = useState<Partial<Partner>>({});
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [adminLogoFile, setAdminLogoFile] = useState<File | null>(null);
  const [adminCoverFile, setAdminCoverFile] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropType, setCropType] = useState<'logo' | 'cover'>('logo');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<Set<number>>(new Set());

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

  // Fetch feedback for master admin
  const { data: feedbackList = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/feedback"],
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

  const deletePartnerMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      const response = await apiRequest("DELETE", `/api/partners/${partnerId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({
        title: "Başarılı",
        description: "Partner başarıyla silindi",
      });
      setDeleteDialogOpen(false);
      setPartnerToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Partner silinirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Feedback status update mutation
  const updateFeedbackStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/feedback/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({
        title: "Başarılı",
        description: "Geri bildirim durumu güncellendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Geri bildirim güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Feedback delete mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/feedback/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({
        title: "Başarılı",
        description: "Geri bildirim silindi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Geri bildirim silinirken hata oluştu",
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
    setAdminLogoFile(null);
    setAdminCoverFile(null);
  };

  const handleViewPartner = (partnerId: number) => {
    setSelectedPartnerId(partnerId);
    setInspectionModalOpen(true);
  };

  const handleDeletePartner = (partner: Partner) => {
    setPartnerToDelete(partner);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePartner = () => {
    if (partnerToDelete) {
      deletePartnerMutation.mutate(partnerToDelete.id);
    }
  };

  // Admin upload handlers
  const handleAdminLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Dosya Boyutu Hatası',
          description: 'Logo dosyası 5MB\'dan küçük olmalıdır.',
          variant: 'destructive',
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Hata",
          description: "Lütfen sadece resim dosyası seçiniz.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setCropImageSrc(imageSrc);
        setCropType('logo');
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdminCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Dosya Boyutu Hatası',
          description: 'Kapak görseli 10MB\'dan küçük olmalıdır.',
          variant: 'destructive',
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Hata",
          description: "Lütfen sadece resim dosyası seçiniz.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setCropImageSrc(imageSrc);
        setCropType('cover');
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdminCropComplete = (croppedImageBlob: Blob) => {
    const croppedFile = new File([croppedImageBlob], `${cropType}-cropped.jpg`, {
      type: 'image/jpeg',
    });

    if (cropType === 'logo') {
      setAdminLogoFile(croppedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const newLogoUrl = e.target?.result as string;
        setPartnerFormData(prev => ({ ...prev, logo: newLogoUrl }));
      };
      reader.readAsDataURL(croppedFile);
    } else {
      setAdminCoverFile(croppedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const newCoverUrl = e.target?.result as string;
        setPartnerFormData(prev => ({ ...prev, coverImage: newCoverUrl }));
      };
      reader.readAsDataURL(croppedFile);
    }
  };

  const handleSavePartner = async () => {
    if (!editingPartner) return;

    try {
      const formData = new FormData();
      
      // Add partner data (excluding email and password fields)
      Object.entries(partnerFormData).forEach(([key, value]) => {
        if (key !== 'logo' && key !== 'coverImage' && key !== 'email' && key !== 'password' && value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Add files if selected
      if (adminLogoFile) {
        formData.append('logo', adminLogoFile);
      }
      if (adminCoverFile) {
        formData.append('coverImage', adminCoverFile);
      }

      const response = await fetch(`/api/partners/${editingPartner.id}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Partner güncelleme başarısız');
      }

      const updatedPartner = await response.json();
      
      toast({
        title: "Başarılı",
        description: "Partner bilgileri başarıyla güncellendi.",
      });

      setEditingPartner(null);
      setPartnerFormData({});
      setAdminLogoFile(null);
      setAdminCoverFile(null);

      // Refresh partners list
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Partner güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    }
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="applications">Başvurular</TabsTrigger>
            <TabsTrigger value="partners">Partnerler</TabsTrigger>
            <TabsTrigger value="quotes">Teklif Talepleri</TabsTrigger>
            <TabsTrigger value="feedback">Geri Bildirimler</TabsTrigger>
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
                              <div className="text-sm text-gray-500">{application.contactPerson}</div>
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
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewPartner(partner.id)}
                              >
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
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDeletePartner(partner)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Sil
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

          <TabsContent value="quotes" className="space-y-6">
            <QuoteRequestsEmbedded />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            {/* Feedback Categories Header */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* User Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Kullanıcı Geri Bildirimleri
                  </CardTitle>
                  <CardDescription>
                    Kullanıcılardan gelen platform geri bildirimleri
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {feedbackList.filter((f: any) => f.source !== 'partner').length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p>Henüz kullanıcı geri bildirimi bulunmamaktadır</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {feedbackList.filter((f: any) => f.source !== 'partner').map((feedback: any) => {
                        const isExpanded = expandedFeedback.has(feedback.id);
                        return (
                          <Card key={feedback.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-0">
                              {/* Header - Always Visible */}
                              <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                  const newExpanded = new Set(expandedFeedback);
                                  if (isExpanded) {
                                    newExpanded.delete(feedback.id);
                                  } else {
                                    newExpanded.add(feedback.id);
                                  }
                                  setExpandedFeedback(newExpanded);
                                }}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-gray-400 mt-0.5" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5" />
                                    )}
                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant={
                                          feedback.category === 'bug' ? 'destructive' : 
                                          feedback.category === 'feature' ? 'secondary' :
                                          feedback.category === 'complaint' ? 'destructive' :
                                          'default'
                                        }>
                                          {feedback.category === 'request' && 'İstek / Öneri'}
                                          {feedback.category === 'bug' && 'Hata Bildirme'}
                                          {feedback.category === 'feature' && 'Özellik Talebi'}
                                          {feedback.category === 'complaint' && 'Şikayet'}
                                          {feedback.category === 'other' && 'Diğer'}
                                        </Badge>
                                        <Badge 
                                          variant={
                                            feedback.status === 'new' ? 'default' :
                                            feedback.status === 'reviewed' ? 'secondary' :
                                            feedback.status === 'resolved' ? 'outline' :
                                            'default'
                                          }
                                          className={
                                            feedback.status === 'new' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                            feedback.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                            feedback.status === 'resolved' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                            'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                          }
                                        >
                                          {feedback.status === 'new' && 'Yeni'}
                                          {feedback.status === 'reviewed' && 'İncelendi'}
                                          {feedback.status === 'resolved' && 'Çözüldü'}
                                        </Badge>
                                      </div>
                                      <div className="text-sm font-medium text-gray-800">{feedback.name}</div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 text-right whitespace-nowrap ml-2">
                                    {new Date(feedback.createdAt).toLocaleDateString('tr-TR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                    <br />
                                    {new Date(feedback.createdAt).toLocaleTimeString('tr-TR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* Expandable Content */}
                              {isExpanded && (
                                <div className="px-4 pb-4 border-t bg-gray-50/50">
                                  <div className="space-y-3 pt-3">
                                    <div className="flex items-center gap-3 text-xs flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        <a 
                                          href={`mailto:${feedback.email}`}
                                          className="text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          {feedback.email}
                                        </a>
                                      </div>
                                      {feedback.phone && (
                                        <div className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          <a 
                                            href={`tel:${feedback.phone}`}
                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                          >
                                            {feedback.phone}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="bg-white p-3 rounded-lg border">
                                      <p className="text-sm leading-relaxed">{feedback.message}</p>
                                    </div>
                                    
                                    <div className="flex gap-2 pt-2">
                                      <Select
                                        value={feedback.status}
                                        onValueChange={(status) => 
                                          updateFeedbackStatusMutation.mutate({ id: feedback.id, status })
                                        }
                                      >
                                        <SelectTrigger className="w-[150px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="new">Yeni</SelectItem>
                                          <SelectItem value="reviewed">İncelendi</SelectItem>
                                          <SelectItem value="resolved">Çözüldü</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                        onClick={() => {
                                          if (confirm('Bu geri bildirimi silmek istediğinizden emin misiniz?')) {
                                            deleteFeedbackMutation.mutate(feedback.id);
                                          }
                                        }}
                                        disabled={deleteFeedbackMutation.isPending}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                      
                                      {feedback.category === 'bug' && (
                                        <Button size="sm" variant="outline" className="text-red-600">
                                          <Flag className="h-4 w-4 mr-1" />
                                          Öncelikli
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Partner Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Handshake className="h-5 w-5" />
                    Partner Geri Bildirimleri
                  </CardTitle>
                  <CardDescription>
                    Partnerlerden gelen sistem geri bildirimleri
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {feedbackList.filter((f: any) => f.source === 'partner').length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Handshake className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p>Henüz partner geri bildirimi bulunmamaktadır</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {feedbackList.filter((f: any) => f.source === 'partner').map((feedback: any) => {
                        const isExpanded = expandedFeedback.has(feedback.id);
                        return (
                          <Card key={feedback.id} className="border-l-4 border-l-orange-500">
                            <CardContent className="p-0">
                              {/* Header - Always Visible */}
                              <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                  const newExpanded = new Set(expandedFeedback);
                                  if (isExpanded) {
                                    newExpanded.delete(feedback.id);
                                  } else {
                                    newExpanded.add(feedback.id);
                                  }
                                  setExpandedFeedback(newExpanded);
                                }}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-gray-400 mt-0.5" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5" />
                                    )}
                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant={
                                          feedback.category === 'bug' ? 'destructive' : 
                                          feedback.category === 'feature' ? 'secondary' :
                                          feedback.category === 'complaint' ? 'destructive' :
                                          'default'
                                        }>
                                          {feedback.category === 'request' && 'İstek / Öneri'}
                                          {feedback.category === 'bug' && 'Hata Bildirme'}
                                          {feedback.category === 'feature' && 'Özellik Talebi'}
                                          {feedback.category === 'complaint' && 'Şikayet'}
                                          {feedback.category === 'other' && 'Diğer'}
                                        </Badge>
                                        <Badge 
                                          variant={
                                            feedback.status === 'new' ? 'default' :
                                            feedback.status === 'reviewed' ? 'secondary' :
                                            feedback.status === 'resolved' ? 'outline' :
                                            'default'
                                          }
                                          className={
                                            feedback.status === 'new' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                            feedback.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                            feedback.status === 'resolved' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                            'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                          }
                                        >
                                          {feedback.status === 'new' && 'Yeni'}
                                          {feedback.status === 'reviewed' && 'İncelendi'}
                                          {feedback.status === 'resolved' && 'Çözüldü'}
                                        </Badge>
                                      </div>
                                      <div className="text-sm font-medium text-gray-800">{feedback.name}</div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 text-right whitespace-nowrap ml-2">
                                    {new Date(feedback.createdAt).toLocaleDateString('tr-TR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                    <br />
                                    {new Date(feedback.createdAt).toLocaleTimeString('tr-TR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* Expandable Content */}
                              {isExpanded && (
                                <div className="px-4 pb-4 border-t bg-orange-50/30">
                                  <div className="space-y-3 pt-3">
                                    <div className="flex items-center gap-3 text-xs flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        <a 
                                          href={`mailto:${feedback.email}`}
                                          className="text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          {feedback.email}
                                        </a>
                                      </div>
                                      {feedback.phone && (
                                        <div className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          <a 
                                            href={`tel:${feedback.phone}`}
                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                          >
                                            {feedback.phone}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="bg-white p-3 rounded-lg border">
                                      <p className="text-sm leading-relaxed">{feedback.message}</p>
                                    </div>
                                    
                                    <div className="flex gap-2 pt-2">
                                      <Select
                                        value={feedback.status}
                                        onValueChange={(status) => 
                                          updateFeedbackStatusMutation.mutate({ id: feedback.id, status })
                                        }
                                      >
                                        <SelectTrigger className="w-[150px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="new">Yeni</SelectItem>
                                          <SelectItem value="reviewed">İncelendi</SelectItem>
                                          <SelectItem value="resolved">Çözüldü</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                        onClick={() => {
                                          if (confirm('Bu geri bildirimi silmek istediğinizden emin misiniz?')) {
                                            deleteFeedbackMutation.mutate(feedback.id);
                                          }
                                        }}
                                        disabled={deleteFeedbackMutation.isPending}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                      
                                      {feedback.category === 'bug' && (
                                        <Button size="sm" variant="outline" className="text-red-600">
                                          <Flag className="h-4 w-4 mr-1" />
                                          Öncelikli
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
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
                  <Label htmlFor="companyAddress">Şirket Adresi</Label>
                  <Input
                    id="companyAddress"
                    value={partnerFormData.companyAddress || ''}
                    onChange={(e) => setPartnerFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
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
              
              {/* Logo and Cover Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium">Şirket Logosu</Label>
                  <div className="mt-2">
                    <div 
                      onClick={() => document.getElementById('admin-logo-input')?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-dip-blue transition-colors"
                    >
                      {partnerFormData.logo ? (
                        <div className="relative">
                          <img src={partnerFormData.logo} alt="Current Logo" className="max-h-16 mx-auto rounded" />
                          <p className="text-xs text-gray-500 mt-2">Yeni logo yüklemek için tıklayın</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="mx-auto h-6 w-6 text-gray-400" />
                          <p className="text-xs text-gray-600 mt-1">Logo yükleyin</p>
                        </div>
                      )}
                    </div>
                    <input
                      id="admin-logo-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAdminLogoChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Kapak Görseli</Label>
                  <div className="mt-2">
                    <div 
                      onClick={() => document.getElementById('admin-cover-input')?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-dip-blue transition-colors"
                    >
                      {partnerFormData.coverImage ? (
                        <div className="relative">
                          <img src={partnerFormData.coverImage} alt="Current Cover" className="max-h-16 mx-auto rounded" />
                          <p className="text-xs text-gray-500 mt-2">Yeni kapak yüklemek için tıklayın</p>
                        </div>
                      ) : (
                        <div>
                          <ImageIcon className="mx-auto h-6 w-6 text-gray-400" />
                          <p className="text-xs text-gray-600 mt-1">Kapak yükleyin</p>
                        </div>
                      )}
                    </div>
                    <input
                      id="admin-cover-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAdminCoverChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="services">Hizmetler</Label>
                <Textarea
                  id="services"
                  value={typeof partnerFormData.services === 'string' ? partnerFormData.services : JSON.stringify(partnerFormData.services || [])}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, services: e.target.value }))}
                  rows={3}
                  placeholder="Hizmetleri JSON array formatında veya her satırda bir hizmet olacak şekilde giriniz"
                />
                <p className="text-xs text-gray-500">Not: Hizmetler JSON array formatında olmalıdır: ["Hizmet 1", "Hizmet 2"] veya her satırda bir hizmet</p>
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
      
      {/* Partner Inspection Modal */}
      <PartnerInspectionModal
        open={inspectionModalOpen}
        onOpenChange={setInspectionModalOpen}
        partnerId={selectedPartnerId}
      />
      
      {/* Admin Image Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={cropImageSrc}
        onCropComplete={handleAdminCropComplete}
        aspectRatio={cropType === 'logo' ? 1 : 3}
        title={cropType === 'logo' ? 'Logo Kırp' : 'Kapak Görseli Kırp'}
        description={cropType === 'logo' ? 'Logoyu kare formata kırpın' : 'Kapak görselini 3:1 oranında kırpın'}
      />
      
      {/* Delete Partner Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partner Silme Onayı</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Partner silindiğinde tüm verileri kalıcı olarak kaldırılacaktır.
            </DialogDescription>
          </DialogHeader>
          
          {partnerToDelete && (
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  {partnerToDelete.logo ? (
                    <img 
                      src={partnerToDelete.logo} 
                      alt={partnerToDelete.companyName}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-600">
                        {partnerToDelete.companyName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-red-900">{partnerToDelete.companyName}</div>
                    <div className="text-sm text-red-700">{partnerToDelete.serviceCategory}</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-red-800">
                  <strong>Silinecek veriler:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Partner profil bilgileri</li>
                    <li>Şirket logosu ve kapak görseli</li>
                    <li>Hizmet bilgileri ve açıklamalar</li>
                    <li>Teklif talepleri ve yanıtları</li>
                    <li>Kullanıcı hesabı</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletePartnerMutation.isPending}
            >
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeletePartner}
              disabled={deletePartnerMutation.isPending}
            >
              {deletePartnerMutation.isPending ? "Siliniyor..." : "Partneri Sil"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
