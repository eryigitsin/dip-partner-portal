import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Service, ServiceCategory, InsertService } from "@shared/schema";
import { Plus, Edit, Trash2, Search, Package } from "lucide-react";

export default function ServicesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    isActive: true,
  });

  // Fetch services
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['/api/admin/services'],
  });

  // Fetch service categories
  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/admin/service-categories'],
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: InsertService) => {
      const response = await apiRequest('POST', '/api/admin/services', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Başarılı",
        description: "Hizmet oluşturuldu",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Hizmet oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertService> }) => {
      const response = await apiRequest('PATCH', `/api/admin/services/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsDialogOpen(false);
      resetForm();
      setEditingService(null);
      toast({
        title: "Başarılı",
        description: "Hizmet güncellendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Hizmet güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Başarılı",
        description: "Hizmet silindi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Hizmet silinirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const serviceData = {
      name: formData.name,
      description: formData.description,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
      isActive: formData.isActive,
    };

    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: serviceData });
    } else {
      createServiceMutation.mutate(serviceData);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      categoryId: service.categoryId?.toString() || "",
      isActive: service.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Bu hizmeti silmek istediğinizden emin misiniz?")) {
      deleteServiceMutation.mutate(id);
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "Kategori Yok";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Bilinmeyen Kategori";
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Hizmet Havuzu</h1>
          <p className="text-muted-foreground mt-2">
            Platform genelinde kullanılan hizmetleri yönetin. Kategoriler opsiyoneldir.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingService(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Hizmet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Hizmet Düzenle" : "Yeni Hizmet Ekle"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Hizmet Adı *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: SEO Optimizasyonu, Logo Tasarımı"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Açıklama</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Hizmet hakkında kısa açıklama"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategori (Opsiyonel)</label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kategori Yok</SelectItem>
                    {categories
                      .filter(cat => cat.isActive)
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <label className="text-sm font-medium">Aktif</label>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                  className="flex-1"
                >
                  {editingService ? "Güncelle" : "Oluştur"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  İptal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Hizmetler ({filteredServices.length})
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Hizmet ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Arama kriterinize uygun hizmet bulunamadı" : "Henüz hizmet eklenmemiş"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hizmet Adı</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Oluşturma Tarihi</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="max-w-xs">
                      {service.description ? (
                        <div className="truncate" title={service.description}>
                          {service.description}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Açıklama yok</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryName(service.categoryId)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.isActive ? "default" : "secondary"}>
                        {service.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {service.createdAt ? new Date(service.createdAt).toLocaleDateString('tr-TR') : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}