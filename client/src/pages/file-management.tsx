import { useState, useRef } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Checkbox } from '@/components/ui/checkbox';
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
  RefreshCw,
  Upload,
  Plus
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
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [makePublic, setMakePublic] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await fetch('/api/admin/files/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Upload failed');
        }
        return response.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/files'] });
      toast({
        title: 'Başarılı',
        description: 'Dosya başarıyla yüklendi.',
      });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setMakePublic(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Dosya yüklenirken bir hata oluştu.',
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
    if (mimeType?.startsWith('image/')) return <Image className="h-3 w-3" />;
    if (mimeType?.startsWith('video/')) return <Video className="h-3 w-3" />;
    return <FileText className="h-3 w-3" />;
  };

  const openPreview = (file: UploadedFile) => {
    setPreviewFile(file);
    setShowPreviewDialog(true);
  };

  const renderFilePreview = (file: UploadedFile, isHover = false) => {
    const maxSize = isHover ? 'max-w-64 max-h-48' : 'max-w-2xl max-h-96';
    
    if (file.mimeType?.startsWith('image/')) {
      return (
        <img 
          src={file.fileUrl} 
          alt={file.fileName}
          className={`${maxSize} object-contain rounded`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    
    if (file.mimeType?.startsWith('video/')) {
      return (
        <video 
          src={file.fileUrl}
          controls={!isHover}
          muted
          className={`${maxSize} rounded`}
          style={{ maxHeight: isHover ? '120px' : '300px' }}
        />
      );
    }
    
    // For other file types, show basic info
    return (
      <div className={`${maxSize} p-4 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-center`}>
        {getFileIcon(file.mimeType)}
        <p className="text-sm font-medium mt-2">{file.fileName}</p>
        <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
        <p className="text-xs text-gray-400 mt-1">{getSourceLabel(file.source)}</p>
      </div>
    );
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
      'post': 'İçerik Görseli',
      'attached_assets': 'Sistem Dosyası',
      'object_storage_public': 'Herkese Açık Depolama',
      'object_storage_private': 'Özel Depolama'
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
    if (file.isPublic || file.source === 'attached_assets' || file.source === 'object_storage_public') {
      return `${window.location.origin}/public-objects/${file.fileName}`;
    } else {
      return `${window.location.origin}/objects/${file.id}`;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: 'Hata',
        description: 'Lütfen bir dosya seçin.',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('makePublic', makePublic.toString());

    uploadFileMutation.mutate(formData);
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
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Yüklenmiş Dosyalar ({filteredFiles.length})</span>
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 h-8 text-sm"
                >
                  <RefreshCw className="h-3 w-3" />
                  Yenile
                </Button>
              </CardTitle>
              <CardDescription className="text-sm">
                Tüm dosya yüklemeleri ve dosya paylaşım URL'leri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Upload and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="search" className="text-sm">Dosya Ara</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3 w-3 text-gray-400" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Dosya adı ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="fileType" className="text-sm">Dosya Türü</Label>
                  <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                    <SelectTrigger className="w-[130px] h-8 text-sm">
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
                  <Label htmlFor="source" className="text-sm">Kaynak</Label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-[130px] h-8 text-sm">
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
                <div className="self-end">
                  <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2 h-8 text-sm">
                        <Upload className="h-3 w-3" />
                        Dosya Yükle
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Yeni Dosya Yükle</DialogTitle>
                        <DialogDescription>
                          Sisteme yeni bir dosya yükleyin. Herkese açık dosyalar paylaşılabilir URL ile erişilebilir olacaktır.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fileInput">Dosya Seç</Label>
                          <Input
                            id="fileInput"
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                          />
                          {selectedFile && (
                            <p className="text-sm text-gray-600 mt-2">
                              Seçilen dosya: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="makePublic"
                            checked={makePublic}
                            onCheckedChange={(checked) => setMakePublic(checked as boolean)}
                          />
                          <Label htmlFor="makePublic">
                            Herkese açık dosya (paylaşılabilir URL ile erişilebilir)
                          </Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowUploadDialog(false);
                            setSelectedFile(null);
                            setMakePublic(false);
                          }}
                        >
                          İptal
                        </Button>
                        <Button
                          onClick={handleUpload}
                          disabled={!selectedFile || uploadFileMutation.isPending}
                        >
                          {uploadFileMutation.isPending ? 'Yükleniyor...' : 'Yükle'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Files Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="h-10">
                      <TableHead className="text-xs font-semibold">Dosya</TableHead>
                      <TableHead className="text-xs font-semibold">Boyut</TableHead>
                      <TableHead className="text-xs font-semibold">Kaynak</TableHead>
                      <TableHead className="text-xs font-semibold">Yükleme Tarihi</TableHead>
                      <TableHead className="text-xs font-semibold">Erişim</TableHead>
                      <TableHead className="text-xs font-semibold">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-gray-500 text-sm">
                          {searchTerm || fileTypeFilter !== 'all' || sourceFilter !== 'all' 
                            ? 'Filtrelere uygun dosya bulunamadı.' 
                            : 'Henüz dosya yüklenmemiş.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFiles.map((file) => (
                        <TableRow key={file.id} className="h-12">
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.mimeType)}
                              <div>
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <div className="font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors">
                                      {file.fileName}
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-auto p-2">
                                    {renderFilePreview(file, true)}
                                  </HoverCardContent>
                                </HoverCard>
                                {file.uploadedBy && (
                                  <div className="text-xs text-gray-500">
                                    Yükleyen: {file.uploadedBy}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-sm">{formatFileSize(file.fileSize)}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-xs">
                              {getSourceLabel(file.source)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-sm">
                            {new Date(file.uploadedAt).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={file.isPublic ? 'default' : 'secondary'} className="text-xs">
                                {file.isPublic ? 'Herkese Açık' : 'Gizli'}
                              </Badge>
                              <Button
                                onClick={() => togglePublicMutation.mutate({ 
                                  fileId: file.id, 
                                  isPublic: !file.isPublic 
                                })}
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                disabled={togglePublicMutation.isPending}
                              >
                                {file.isPublic ? 'Gizle' : 'Herkese Aç'}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1">
                              <Button
                                onClick={() => openPreview(file)}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                data-testid={`button-view-${file.id}`}
                              >
                                <Eye className="h-3 w-3" />
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
                                className="h-7 w-7 p-0"
                                data-testid={`button-copy-${file.id}`}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <a
                                href={file.fileUrl}
                                download={file.fileName}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7"
                                data-testid={`button-download-${file.id}`}
                              >
                                <Download className="h-3 w-3" />
                              </a>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                                    data-testid={`button-delete-${file.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
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

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewFile && getFileIcon(previewFile.mimeType)}
              <span>{previewFile?.fileName}</span>
            </DialogTitle>
            <DialogDescription>
              {previewFile && (
                <div className="flex gap-4 text-sm">
                  <span>Boyut: {formatFileSize(previewFile.fileSize)}</span>
                  <span>Kaynak: {getSourceLabel(previewFile.source)}</span>
                  <span>Erişim: {previewFile.isPublic ? 'Herkese Açık' : 'Gizli'}</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center min-h-64">
            {previewFile && renderFilePreview(previewFile)}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => previewFile && window.open(previewFile.fileUrl, '_blank')}
            >
              Yeni Sekmede Aç
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (previewFile) {
                  const url = generateShareableUrl(previewFile);
                  navigator.clipboard.writeText(url);
                  toast({
                    title: 'Kopyalandı',
                    description: 'Dosya URL\'si panoya kopyalandı.',
                  });
                }
              }}
            >
              URL Kopyala
            </Button>
            <Button onClick={() => setShowPreviewDialog(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}