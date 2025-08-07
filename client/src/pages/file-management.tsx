import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Image, 
  Video, 
  Download, 
  Trash2, 
  Search, 
  Eye, 
  Share, 
  Copy,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

interface UploadedFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  source: string; // 'message', 'profile', 'partner', 'application', etc.
  sourceId: number;
  uploadedBy?: string;
  uploadedAt: string;
  isPublic: boolean;
}

export default function FileManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Fetch all uploaded files
  const { data: files, isLoading: filesLoading, refetch } = useQuery<UploadedFile[]>({
    queryKey: ['/api/admin/files'],
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return await apiRequest('DELETE', `/api/admin/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/files'] });
      toast({
        title: 'Başarılı',
        description: 'Dosya başarıyla silindi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Dosya silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Toggle file public status mutation
  const togglePublicMutation = useMutation({
    mutationFn: async ({ fileId, isPublic }: { fileId: string; isPublic: boolean }) => {
      return await apiRequest('PUT', `/api/admin/files/${fileId}/public`, { isPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/files'] });
      toast({
        title: 'Başarılı',
        description: 'Dosya erişim durumu güncellendi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Dosya erişim durumu güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Filter files based on search and filters
  const filteredFiles = files?.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || 
      (fileTypeFilter === 'image' && file.mimeType?.startsWith('image/')) ||
      (fileTypeFilter === 'video' && file.mimeType?.startsWith('video/')) ||
      (fileTypeFilter === 'document' && !file.mimeType?.startsWith('image/') && !file.mimeType?.startsWith('video/'));
    const matchesSource = sourceFilter === 'all' || file.source === sourceFilter;
    
    return matchesSearch && matchesType && matchesSource;
  }) || [];

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType?.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Bilinmiyor';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'message': 'Mesaj Eki',
      'profile': 'Profil Fotoğrafı',
      'partner': 'Partner Görseli',
      'application': 'Başvuru Belgesi',
      'payment': 'Ödeme Makbuzu',
      'post': 'İçerik Görseli'
    };
    return labels[source] || source;
  };

  const copyPublicUrl = (file: UploadedFile) => {
    const publicUrl = `${window.location.origin}/public-objects/${file.fileName}`;
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: 'Kopyalandı',
      description: 'Dosya URL\'si panoya kopyalandı.',
    });
  };

  const generateShareableUrl = (file: UploadedFile) => {
    if (file.isPublic) {
      return `${window.location.origin}/public-objects/${file.fileName}`;
    } else {
      return `${window.location.origin}/objects/${file.id}`;
    }
  };

  if (filesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dosya Yönetimi</h1>
            <p className="text-gray-600 mt-2">Sisteme yüklenmiş tüm dosyaları görüntüleyin ve yönetin</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Yüklenmiş Dosyalar ({filteredFiles.length})</span>
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Yenile
                </Button>
              </CardTitle>
              <CardDescription>
                Tüm dosya yüklemeleri ve dosya paylaşım URL'leri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="search">Dosya Ara</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Dosya adı ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="fileType">Dosya Türü</Label>
                  <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Türler</SelectItem>
                      <SelectItem value="image">Görsel</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Belge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="source">Kaynak</Label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                      <SelectItem value="message">Mesajlar</SelectItem>
                      <SelectItem value="profile">Profiller</SelectItem>
                      <SelectItem value="partner">Partnerler</SelectItem>
                      <SelectItem value="application">Başvurular</SelectItem>
                      <SelectItem value="payment">Ödemeler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Files Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dosya</TableHead>
                      <TableHead>Boyut</TableHead>
                      <TableHead>Kaynak</TableHead>
                      <TableHead>Yükleme Tarihi</TableHead>
                      <TableHead>Erişim</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {searchTerm || fileTypeFilter !== 'all' || sourceFilter !== 'all' 
                            ? 'Filtrelere uygun dosya bulunamadı.' 
                            : 'Henüz dosya yüklenmemiş.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {getFileIcon(file.mimeType)}
                              <div>
                                <div className="font-medium">{file.fileName}</div>
                                {file.uploadedBy && (
                                  <div className="text-sm text-gray-500">
                                    Yükleyen: {file.uploadedBy}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getSourceLabel(file.source)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(file.uploadedAt).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={file.isPublic ? 'default' : 'secondary'}>
                                {file.isPublic ? 'Herkese Açık' : 'Gizli'}
                              </Badge>
                              <Button
                                onClick={() => togglePublicMutation.mutate({ 
                                  fileId: file.id, 
                                  isPublic: !file.isPublic 
                                })}
                                variant="ghost"
                                size="sm"
                                disabled={togglePublicMutation.isPending}
                              >
                                {file.isPublic ? 'Gizle' : 'Herkese Aç'}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => window.open(file.fileUrl, '_blank')}
                                variant="ghost"
                                size="sm"
                                data-testid={`button-view-${file.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => {
                                  const url = generateShareableUrl(file);
                                  navigator.clipboard.writeText(url);
                                  toast({
                                    title: 'Kopyalandı',
                                    description: 'Dosya URL\'si panoya kopyalandı.',
                                  });
                                }}
                                variant="ghost"
                                size="sm"
                                data-testid={`button-copy-${file.id}`}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <a
                                href={file.fileUrl}
                                download={file.fileName}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                                data-testid={`button-download-${file.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    data-testid={`button-delete-${file.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Dosyayı Sil</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      "{file.fileName}" dosyasını silmek istediğinizden emin misiniz? 
                                      Bu işlem geri alınamaz ve dosya kalıcı olarak silinecektir.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteFileMutation.mutate(file.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={deleteFileMutation.isPending}
                                    >
                                      {deleteFileMutation.isPending ? 'Siliniyor...' : 'Sil'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}