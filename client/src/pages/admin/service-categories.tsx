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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ServiceCategory, InsertServiceCategory } from "@shared/schema";
import { Plus, Edit, Trash2, Tag, ArrowUp, ArrowDown } from "lucide-react";

export default function ServiceCategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    slug: "",
    icon: "",
    isActive: true,
    sortOrder: 0,
  });

  // Fetch service categories
  const { data: categories = [], isLoading } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/admin/service-categories'],
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertServiceCategory) => {
      const response = await apiRequest('POST', '/api/admin/service-categories', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-categories'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Başarılı",
        description: "Hizmet kategorisi oluşturuldu",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Kategori oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertServiceCategory> }) => {
      const response = await apiRequest('PATCH', `/api/admin/service-categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-categories'] });
      setIsDialogOpen(false);
      resetForm();
      setEditingCategory(null);
      toast({
        title: "Başarılı",
        description: "Hizmet kategorisi güncellendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Kategori güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/service-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-categories'] });
      toast({
        title: "Başarılı",
        description: "Hizmet kategorisi silindi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Kategori silinirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      slug: "",
      icon: "",
      isActive: true,
      sortOrder: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const slug = formData.slug || formData.name.toLowerCase()
      .replace(/[^a-z0-9\s]/gi, '')
      .replace(/\s+/g, '-');

    const categoryData = {
      ...formData,
      slug,
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryData });
    } else {
      createCategoryMutation.mutate(categoryData);
    }
  };

  const handleEdit = (category: ServiceCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      nameEn: category.nameEn,
      slug: category.slug,
      icon: category.icon,
      isActive: category.isActive ?? true,
      sortOrder: category.sortOrder ?? 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Bu kategoriyi silmek istediğinizden emin misiniz?")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const updateCategorySortOrder = (id: number, direction: 'up' | 'down') => {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    const newSortOrder = direction === 'up' 
      ? (category.sortOrder ?? 0) - 1 
      : (category.sortOrder ?? 0) + 1;

    updateCategoryMutation.mutate({ 
      id, 
      data: { sortOrder: newSortOrder } 
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Hizmet Kategorileri</h1>
          <p className="text-muted-foreground mt-2">
            Hizmet havuzundaki kategorileri yönetin. Kategoriler opsiyoneldir ve hizmetlerin daha iyi organize edilmesini sağlar.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingCategory(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kategori
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Kategori Düzenle" : "Yeni Kategori Ekle"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Kategori Adı (Türkçe) *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Pazarlama & Reklam"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategori Adı (İngilizce) *</label>
                <Input
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="Örn: Marketing & Advertising"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL Kodu (Slug)</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Otomatik oluşturulur"
                />
              </div>
              <div>
                <label className="text-sm font-medium">İkon</label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Lucide React ikon adı (örn: megaphone)"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sıralama</label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
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
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="flex-1"
                >
                  {editingCategory ? "Güncelle" : "Oluştur"}
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
          <CardTitle className="flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Kategoriler ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz kategori eklenmemiş
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sıra</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>İngilizce</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{category.sortOrder ?? 0}</span>
                          <div className="flex flex-col">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateCategorySortOrder(category.id, 'up')}
                              className="h-4 w-4 p-0"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateCategorySortOrder(category.id, 'down')}
                              className="h-4 w-4 p-0"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {category.icon && <span className="text-lg">{category.icon}</span>}
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell>{category.nameEn}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-1 rounded">
                          {category.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
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