import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Tag, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Service {
  id: number;
  name: string;
  description?: string;
  category?: string;
}

interface PartnerService {
  id: number;
  name: string;
  description?: string;
  category?: string;
}

interface ServicePartner {
  partner: {
    id: number;
    companyName: string;
    username?: string;
    logo?: string;
  };
  user: {
    firstName: string;
    lastName: string;
  };
}

export function PartnerServicesTab() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isNewServiceDialogOpen, setIsNewServiceDialogOpen] = useState(false);
  const [isServicePartnersDialogOpen, setIsServicePartnersDialogOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all services from pool
  const { data: allServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
  });

  // Fetch partner's selected services
  const { data: partnerServices = [], isLoading: partnerServicesLoading } = useQuery({
    queryKey: ["/api/partner/services"],
  });

  // Fetch partners offering selected service
  const { data: servicePartners = [], isLoading: servicePartnersLoading } = useQuery({
    queryKey: ["/api/services", selectedService?.id, "partners"],
    enabled: !!selectedService?.id,
  });

  // Add service mutation
  const addServiceMutation = useMutation({
    mutationFn: (serviceId: number) =>
      apiRequest("/api/partner/services", "POST", { serviceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/services"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Başarılı",
        description: "Hizmet başarıyla eklendi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Hizmet eklenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Remove service mutation
  const removeServiceMutation = useMutation({
    mutationFn: (serviceId: number) =>
      apiRequest(`/api/partner/services/${serviceId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/services"] });
      toast({
        title: "Başarılı",
        description: "Hizmet kaldırıldı",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Hizmet kaldırılırken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Create new service mutation
  const createServiceMutation = useMutation({
    mutationFn: (serviceData: { name: string; description?: string; category?: string }) =>
      apiRequest("/api/partner/services/new", "POST", serviceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsNewServiceDialogOpen(false);
      setNewServiceName("");
      setNewServiceDescription("");
      setNewServiceCategory("");
      toast({
        title: "Başarılı",
        description: "Yeni hizmet oluşturuldu ve hizmetlerinize eklendi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Hizmet oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleAddService = (serviceId: number) => {
    addServiceMutation.mutate(serviceId);
  };

  const handleRemoveService = (serviceId: number) => {
    removeServiceMutation.mutate(serviceId);
  };

  const handleCreateNewService = () => {
    if (!newServiceName.trim()) {
      toast({
        title: "Hata",
        description: "Hizmet adı gereklidir",
        variant: "destructive",
      });
      return;
    }

    createServiceMutation.mutate({
      name: newServiceName.trim(),
      description: newServiceDescription.trim() || undefined,
      category: newServiceCategory.trim() || undefined,
    });
  };

  const handleServiceTagClick = (service: PartnerService) => {
    setSelectedService(service);
    setIsServicePartnersDialogOpen(true);
  };

  // Get services that are not already selected by partner
  const availableServices = (allServices as Service[]).filter(
    (service: Service) => !(partnerServices as PartnerService[]).some((ps: PartnerService) => ps.id === service.id)
  );

  if (partnerServicesLoading || servicesLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dip-blue mx-auto"></div>
            <p className="mt-2 text-gray-600">Hizmetler yükleniyor...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Hizmet Yönetimi</CardTitle>
          <CardDescription>
            Hizmet havuzundan hizmet seçin, yeni hizmet ekleyin ve sunduğunuz hizmetleri yönetin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Partner's Current Services */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Mevcut Hizmetleriniz</h3>
              <div className="flex space-x-2">
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Havuzdan Seç
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Hizmet Havuzundan Seç</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {availableServices.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">
                          Tüm mevcut hizmetler zaten seçili
                        </p>
                      ) : (
                        availableServices.map((service: Service) => (
                          <div
                            key={service.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <h4 className="font-medium">{service.name}</h4>
                              {service.description && (
                                <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                              )}
                              {service.category && (
                                <Badge variant="secondary" className="mt-2">
                                  {service.category}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddService(service.id)}
                              disabled={addServiceMutation.isPending}
                              className="bg-dip-blue hover:bg-dip-dark-blue"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Ekle
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isNewServiceDialogOpen} onOpenChange={setIsNewServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-dip-blue hover:bg-dip-dark-blue">
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni Hizmet
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni Hizmet Oluştur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="serviceName">Hizmet Adı</Label>
                        <Input
                          id="serviceName"
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          placeholder="Örn: SEO Optimizasyonu"
                        />
                      </div>
                      <div>
                        <Label htmlFor="serviceDescription">Açıklama (İsteğe bağlı)</Label>
                        <Textarea
                          id="serviceDescription"
                          value={newServiceDescription}
                          onChange={(e) => setNewServiceDescription(e.target.value)}
                          placeholder="Hizmet açıklaması..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="serviceCategory">Kategori (İsteğe bağlı)</Label>
                        <Input
                          id="serviceCategory"
                          value={newServiceCategory}
                          onChange={(e) => setNewServiceCategory(e.target.value)}
                          placeholder="Örn: Dijital Pazarlama"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsNewServiceDialogOpen(false)}
                        >
                          İptal
                        </Button>
                        <Button
                          onClick={handleCreateNewService}
                          disabled={createServiceMutation.isPending}
                          className="bg-dip-blue hover:bg-dip-dark-blue"
                        >
                          Oluştur ve Ekle
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {(partnerServices as PartnerService[]).length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Henüz hizmet eklenmemiş
                </h3>
                <p className="text-gray-600 mb-4">
                  Hizmet havuzundan seçim yapın veya yeni hizmet oluşturun
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(partnerServices as PartnerService[]).map((service: PartnerService) => (
                  <div key={service.id} className="relative group">
                    <Badge
                      variant="secondary"
                      className="pr-8 cursor-pointer hover:bg-dip-blue hover:text-white transition-colors"
                      onClick={() => handleServiceTagClick(service)}
                    >
                      {service.name}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveService(service.id);
                      }}
                      disabled={removeServiceMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Nasıl Çalışır?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Havuzdan Seç:</strong> Mevcut hizmet havuzundan istediğiniz hizmetleri seçin</li>
              <li>• <strong>Yeni Hizmet:</strong> Havuzda olmayan bir hizmet oluşturun (havuza otomatik eklenir)</li>
              <li>• <strong>Hizmet Etiketleri:</strong> Hizmetlerinize tıklayarak o hizmeti sunan diğer partnerleri görün</li>
              <li>• <strong>Kaldırma:</strong> Hizmet üzerine gelip X'e tıklayarak kendi hizmetlerinizden kaldırabilirsiniz (havuzdan silinmez)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Service Partners Dialog */}
      <Dialog open={isServicePartnersDialogOpen} onOpenChange={setIsServicePartnersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              "{selectedService?.name}" Hizmetini Sunan Partnerler
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {servicePartnersLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dip-blue mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Partnerler yükleniyor...</p>
              </div>
            ) : (servicePartners as ServicePartner[]).length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Bu hizmeti sunan başka partner bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(servicePartners as ServicePartner[]).map((sp: ServicePartner) => (
                  <div
                    key={sp.partner.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      {sp.partner.logo ? (
                        <img
                          src={sp.partner.logo}
                          alt={sp.partner.companyName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {sp.partner.companyName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium">{sp.partner.companyName}</h4>
                        <p className="text-sm text-gray-600">
                          {sp.user.firstName} {sp.user.lastName}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(`/partner/${sp.partner.username || sp.partner.id}`, '_blank');
                      }}
                    >
                      Profili Gör
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}