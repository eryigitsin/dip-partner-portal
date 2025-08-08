import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  File, 
  Image, 
  Video, 
  FileText, 
  Trash2, 
  Eye, 
  Download, 
  Upload,
  Search,
  Filter,
  HardDrive,
  FolderOpen
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

interface AttachedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
  category: 'image' | 'document' | 'video' | 'other';
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
  if (type.includes('pdf') || type.includes('document')) return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

export default function FileManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch files from API
  const { data: files = [], isLoading } = useQuery<AttachedFile[]>({
    queryKey: ['/api/admin/files'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/files');
      const data = await response.json();
      return data as AttachedFile[];
    }
  });

  const filteredFiles = files.filter((file: AttachedFile) => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalStorageUsed = files.reduce((total: number, file: AttachedFile) => total + file.size, 0);
  const totalFiles = files.length;

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest('DELETE', `/api/admin/files/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Dosya başarıyla silindi"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/files'] });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Dosya silinirken bir hata oluştu",
        variant: "destructive"
      });
    }
  });

  const handlePreview = (file: AttachedFile) => {
    setPreviewFile(file);
    setShowPreview(true);
  };

  const handleDelete = (fileId: string) => {
    if (confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) {
      deleteFileMutation.mutate(fileId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <HardDrive className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dosya Yönetimi</h1>
            <p className="text-sm text-muted-foreground">
              Yüklenen dosyaları görüntüleyin ve yönetin
            </p>
          </div>
        </div>

        {/* Storage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Toplam Dosya</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFiles}</div>
              <p className="text-xs text-muted-foreground">Sistem genelinde</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Kullanılan Depolama</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(totalStorageUsed)}</div>
              <p className="text-xs text-muted-foreground">Toplam boyut</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ortalama Dosya Boyutu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalFiles > 0 ? formatFileSize(totalStorageUsed / totalFiles) : '0 B'}
              </div>
              <p className="text-xs text-muted-foreground">Dosya başına</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dosya Arama ve Filtreleme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Dosya adı ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  Tümü
                </Button>
                <Button
                  variant={selectedCategory === 'image' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('image')}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Resimler
                </Button>
                <Button
                  variant={selectedCategory === 'document' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('document')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Dökümanlar
                </Button>
                <Button
                  variant={selectedCategory === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('video')}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Videolar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File List */}
        <Card>
          <CardHeader>
            <CardTitle>Dosya Listesi</CardTitle>
            <CardDescription>
              {isLoading ? 'Dosyalar yükleniyor...' : `${filteredFiles.length} dosya listeleniyor`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p>Dosyalar yükleniyor...</p>
              </div>
            ) : (
            <div className="space-y-4">
              {filteredFiles.map((file: AttachedFile) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getFileIcon(file.type)}
                    </div>
                    <div>
                      <h4 className="font-medium">{file.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString('tr-TR')}</span>
                        <span>•</span>
                        <span className="capitalize">{file.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreview(file)}
                      data-testid="button-preview-file"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Önizle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const downloadUrl = file.path.startsWith('/objects') 
                          ? file.path 
                          : `/objects/${file.path.replace(/^\/+/, '')}`;
                        window.open(downloadUrl, '_blank');
                      }}
                      data-testid="button-download-file"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      İndir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
              {filteredFiles.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aradığınız kriterlere uygun dosya bulunamadı</p>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>

        {/* File Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Dosya Önizleme</DialogTitle>
              <DialogDescription>
                {previewFile?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {previewFile && (
                <div className="flex justify-center">
                  {previewFile.category === 'image' ? (
                    <img 
                      src={previewFile.path.startsWith('/objects') ? previewFile.path : `/objects/${previewFile.path.replace(/^\/+/, '')}`}
                      alt={previewFile.name}
                      className="max-w-full max-h-96 object-contain rounded-lg border"
                      onError={(e) => {
                        console.error('Image load error for:', previewFile.path);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : previewFile.category === 'document' ? (
                    <div className="text-center p-8 border rounded-lg">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p>Bu dosya türü için önizleme mevcut değil</p>
                      <Button 
                        onClick={() => {
                          const downloadUrl = previewFile.path.startsWith('/objects') 
                            ? previewFile.path 
                            : `/objects/${previewFile.path.replace(/^\/+/, '')}`;
                          window.open(downloadUrl, '_blank');
                        }}
                        className="mt-4"
                      >
                        Dosyayı Aç
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center p-8 border rounded-lg">
                      <File className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p>Bu dosya türü için önizleme mevcut değil</p>
                      <Button 
                        onClick={() => {
                          const downloadUrl = previewFile.path.startsWith('/objects') 
                            ? previewFile.path 
                            : `/objects/${previewFile.path.replace(/^\/+/, '')}`;
                          window.open(downloadUrl, '_blank');
                        }}
                        className="mt-4"
                      >
                        Dosyayı Aç
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Dosya Adı:</strong> {previewFile?.name}</p>
                <p><strong>Boyut:</strong> {previewFile ? formatFileSize(previewFile.size) : ''}</p>
                <p><strong>Tür:</strong> {previewFile?.type}</p>
                <p><strong>Yüklenme Tarihi:</strong> {previewFile ? new Date(previewFile.uploadedAt).toLocaleString('tr-TR') : ''}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Footer />
    </div>
  );
}