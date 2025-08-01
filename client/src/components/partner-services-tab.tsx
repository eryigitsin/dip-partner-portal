import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Tag, Users, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export function PartnerServicesTab() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isNewServiceDialogOpen, setIsNewServiceDialogOpen] = useState(false);
  const [isServicePartnersDialogOpen, setIsServicePartnersDialogOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [servicesHelpDismissed, setServicesHelpDismissed] = useState(() => {
    return localStorage.getItem('servicesHelpDismissed') === 'true';
  });
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

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
      apiRequest("POST", "/api/partner/services", { serviceId }),
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
      apiRequest("DELETE", `/api/partner/services/${serviceId}`),
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
      apiRequest("POST", "/api/partner/services/new", serviceData),
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
    setSearchQuery(""); // Clear search after adding
    setShowSuggestions(false);
  };

  const handleRemoveService = (serviceId: number) => {
    removeServiceMutation.mutate(serviceId);
  };

  const dismissServicesHelp = () => {
    setServicesHelpDismissed(true);
    localStorage.setItem('servicesHelpDismissed', 'true');
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

  // Helper function for fuzzy search (tolerates typos)
  const fuzzyMatch = (text: string, query: string): boolean => {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match
    if (textLower.includes(queryLower)) return true;
    
    // Turkish character replacements
    const turkishMap: Record<string, string> = {
      'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
      'c': 'ç', 'g': 'ğ', 'i': 'ı', 'o': 'ö', 's': 'ş', 'u': 'ü'
    };
    
    let normalizedText = textLower;
    let normalizedQuery = queryLower;
    
    Object.entries(turkishMap).forEach(([from, to]) => {
      normalizedText = normalizedText.replace(new RegExp(from, 'g'), to);
      normalizedQuery = normalizedQuery.replace(new RegExp(from, 'g'), to);
    });
    
    if (normalizedText.includes(normalizedQuery)) return true;
    
    // Single character typo tolerance
    if (queryLower.length >= 3) {
      for (let i = 0; i < queryLower.length; i++) {
        const modified = queryLower.slice(0, i) + queryLower.slice(i + 1);
        if (textLower.includes(modified)) return true;
      }
    }
    
    // Keyboard proximity typos (common Turkish keyboard mistakes)
    const keyboardMap: Record<string, string[]> = {
      'e': ['r', 'w', 's', 'd'],
      'r': ['e', 't', 'd', 'f'],
      't': ['r', 'y', 'f', 'g'],
      'i': ['u', 'o', 'k', 'j'],
      'a': ['s', 'q', 'z'],
      's': ['a', 'd', 'w', 'e'],
      'd': ['s', 'f', 'e', 'r'],
      'n': ['m', 'b', 'h', 'j'],
      'm': ['n', 'k', 'j'],
    };
    
    if (queryLower.length >= 3) {
      for (let i = 0; i < queryLower.length; i++) {
        const char = queryLower[i];
        const alternatives = keyboardMap[char] || [];
        
        for (const alt of alternatives) {
          const modified = queryLower.slice(0, i) + alt + queryLower.slice(i + 1);
          if (textLower.includes(modified)) return true;
        }
      }
    }
    
    return false;
  };

  // Filter services based on search query with fuzzy matching
  const filteredServices = availableServices.filter((service: Service) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    
    return (
      fuzzyMatch(service.name, query) ||
      (service.description && fuzzyMatch(service.description, query)) ||
      (service.category && fuzzyMatch(service.category, query))
    );
  });

  // Smart suggestions based on partial input
  const getSearchSuggestions = () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    
    const suggestions = new Set<string>();
    const query = searchQuery.toLowerCase();
    
    availableServices.forEach((service: Service) => {
      // Add service name if it starts with query
      if (service.name.toLowerCase().startsWith(query)) {
        suggestions.add(service.name);
      }
      
      // Add category if it starts with query
      if (service.category && service.category.toLowerCase().startsWith(query)) {
        suggestions.add(service.category);
      }
      
      // Add words from description that start with query
      if (service.description) {
        const words = service.description.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.startsWith(query) && word.length > query.length) {
            suggestions.add(word);
          }
        });
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  };

  const searchSuggestions = getSearchSuggestions();

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
                    
                    {/* Search Input */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Hizmet ara... (örn: pazarlama, analiz, e-ticaret)"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        className="pl-10"
                      />
                      
                      {/* Search Suggestions */}
                      {searchQuery.length >= 2 && searchSuggestions.length > 0 && filteredServices.length > 0 && showSuggestions && (
                        <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                          <div className="p-2 text-xs text-gray-500 border-b">
                            <Search className="inline h-3 w-3 mr-1" />
                            Öneriler ({searchSuggestions.length}):
                          </div>
                          {searchSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-dip-blue hover:text-white transition-colors border-b last:border-b-0 flex items-center"
                              onClick={() => {
                                setSearchQuery(suggestion);
                                setShowSuggestions(false);
                              }}
                            >
                              <Search className="h-3 w-3 mr-2 opacity-60" />
                              <span className="capitalize">{suggestion}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div 
                      className="max-h-96 overflow-y-auto space-y-3"
                      onClick={() => setShowSuggestions(false)}
                    >
                      {availableServices.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">
                          Tüm mevcut hizmetler zaten seçili
                        </p>
                      ) : filteredServices.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-lg font-medium mb-2">Arama sonucu bulunamadı</p>
                          <p className="text-sm mb-4">
                            "{searchQuery}" için sonuç bulunamadı. 
                          </p>
                          <div className="text-xs text-gray-400 space-y-1">
                            <p>💡 İpucu: Yazım hatalarına toleranslıyız!</p>
                            <p>Deneyebileceğiniz kelimeler:</p>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {["pazarlama", "analiz", "e-ticaret", "lojistik", "danışmanlık"].map(word => (
                                <button
                                  key={word}
                                  className="px-2 py-1 bg-gray-100 hover:bg-dip-blue hover:text-white text-xs rounded transition-colors"
                                  onClick={() => {
                                    setSearchQuery(word);
                                    setShowSuggestions(false);
                                  }}
                                >
                                  {word}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        filteredServices.map((service: Service) => (
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
                        <Select
                          value={newServiceCategory}
                          onValueChange={setNewServiceCategory}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Kategori seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {(categories as Category[])?.filter((cat: Category) => cat.isActive).map((category: Category) => (
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
          {!servicesHelpDismissed && (
            <div className="bg-blue-50 p-4 rounded-lg relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-blue-100"
                title="Artık Gösterme"
                onClick={dismissServicesHelp}
              >
                <X className="h-4 w-4" />
              </Button>
              <h4 className="font-medium text-blue-900 mb-2">Nasıl Çalışır?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Havuzdan Seç:</strong> Mevcut hizmet havuzundan istediğiniz hizmetleri seçin.</li>
                <li>• <strong>Yeni Hizmet:</strong> Havuzda olmayan bir hizmet oluşturun. Bu işlemi teklif hazırlama aşamasında da yapabilirsiniz.</li>
                <li>• <strong>Hizmet Etiketleri:</strong> Hizmetlerinize tıklayarak o hizmeti sunan diğer partnerleri görün.</li>
                <li>• <strong>Kaldırma:</strong> Hizmet üzerine gelip X'e tıklayarak kendi hizmetlerinizden kaldırabilirsiniz.</li>
              </ul>
            </div>
          )}
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