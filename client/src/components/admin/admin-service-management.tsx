import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Tag, Search } from "lucide-react";
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

interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

interface AdminServiceManagementProps {
  partnerId?: number;
}

export function AdminServiceManagement({ partnerId }: AdminServiceManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isNewServiceDialogOpen, setIsNewServiceDialogOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Fetch all services from pool
  const { data: allServices = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Fetch partner's selected services
  const { data: partnerServices = [] } = useQuery<PartnerService[]>({
    queryKey: ["/api/partners", partnerId, "services"],
    queryFn: async () => {
      if (!partnerId) return [];
      const response = await apiRequest("GET", `/api/partners/${partnerId}/services`);
      return response.json();
    },
    enabled: !!partnerId,
  });

  // Add service to partner
  const addServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest("POST", `/api/partners/${partnerId}/services`, { serviceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners", partnerId, "services"] });
      toast({
        title: "Başarılı",
        description: "Hizmet partnere eklendi",
      });
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Hizmet eklenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Remove service from partner
  const removeServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest("DELETE", `/api/partners/${partnerId}/services/${serviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners", partnerId, "services"] });
      toast({
        title: "Başarılı",
        description: "Hizmet partnerden kaldırıldı",
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

  // Create new service
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: { name: string; description?: string; category?: string }) => {
      return apiRequest("POST", "/api/services", serviceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setNewServiceName("");
      setNewServiceDescription("");
      setNewServiceCategory("");
      setIsNewServiceDialogOpen(false);
      toast({
        title: "Başarılı",
        description: "Yeni hizmet oluşturuldu",
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

  // Filter available services (exclude already selected ones)
  const availableServices = allServices.filter(service => 
    !partnerServices.some(ps => ps.id === service.id) &&
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddService = (serviceId: number) => {
    addServiceMutation.mutate(serviceId);
  };

  const handleRemoveService = (serviceId: number) => {
    removeServiceMutation.mutate(serviceId);
  };

  const handleCreateNewService = () => {
    if (!newServiceName.trim()) return;
    
    createServiceMutation.mutate({
      name: newServiceName.trim(),
      description: newServiceDescription.trim() || undefined,
      category: newServiceCategory || undefined,
    });
  };

  if (!partnerId) {
    return (
      <div className="text-center py-4 text-gray-500">
        Partner seçilmedi
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Partner Services */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Seçili Hizmetler</span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Hizmet Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Hizmet Ekle</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="relative flex-1 mr-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Hizmet ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Dialog open={isNewServiceDialogOpen} onOpenChange={setIsNewServiceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
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
                            placeholder="Hizmet adını giriniz"
                          />
                        </div>
                        <div>
                          <Label htmlFor="serviceDescription">Açıklama (Opsiyonel)</Label>
                          <Textarea
                            id="serviceDescription"
                            value={newServiceDescription}
                            onChange={(e) => setNewServiceDescription(e.target.value)}
                            placeholder="Hizmet açıklaması"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="serviceCategory">Kategori (Opsiyonel)</Label>
                          <Select value={newServiceCategory} onValueChange={setNewServiceCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Kategori seçiniz" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.name}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            disabled={createServiceMutation.isPending || !newServiceName.trim()}
                          >
                            {createServiceMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {availableServices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Tag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>Eklenebilecek hizmet bulunamadı</p>
                    </div>
                  ) : (
                    availableServices.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{service.name}</div>
                          {service.description && (
                            <div className="text-sm text-gray-600">{service.description}</div>
                          )}
                          {service.category && (
                            <Badge variant="secondary" className="mt-1">
                              {service.category}
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddService(service.id)}
                          disabled={addServiceMutation.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Ekle
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {partnerServices.length === 0 ? (
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
            {partnerServices.map((service) => (
              <div key={service.id} className="relative group">
                <Badge
                  variant="secondary"
                  className="pr-8 cursor-pointer hover:bg-dip-blue hover:text-white transition-colors"
                >
                  {service.name}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full"
                  onClick={() => handleRemoveService(service.id)}
                  disabled={removeServiceMutation.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}