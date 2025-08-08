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
  Copy,
  RefreshCw,
  Upload,
  HardDrive,
  FolderOpen
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

interface AttachedFile {
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
  name?: string; // for backward compatibility
  path?: string; // for backward compatibility
  size?: number; // for backward compatibility
  type?: string; // for backward compatibility
  category?: 'image' | 'document' | 'video' | 'other'; // for backward compatibility
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType?: string, type?: string) => {
  const fileType = mimeType || type || '';
  if (fileType.startsWith('image/')) return <Image className="h-3 w-3" />;
  if (fileType.startsWith('video/')) return <Video className="h-3 w-3" />;
  return <FileText className="h-3 w-3" />;
};

export default function AdminFileManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [makePublic, setMakePublic] = useState(false);
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all uploaded files
  const { data: files, isLoading: filesLoading, refetch } = useQuery<AttachedFile[]>({
    queryKey: ['/api/admin/files'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/files');
      const data = await response.json();
      return data as AttachedFile[];
    }
  });

  const isLoading = filesLoading;
  const filesArray = files || [];

  // Filter files based on search and filters
  const filteredFiles = filesArray.filter(file => {
    const fileName = file.fileName || file.name || '';
    const matchesSearch = fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || 
      (fileTypeFilter === 'image' && (file.mimeType?.startsWith('image/') || file.type?.startsWith('image/') || file.category === 'image')) ||
      (fileTypeFilter === 'video' && (file.mimeType?.startsWith('video/') || file.type?.startsWith('video/') || file.category === 'video')) ||
      (fileTypeFilter === 'document' && (!file.mimeType?.startsWith('image/') && !file.mimeType?.startsWith('video/') && !file.type?.startsWith('image/') && !file.type?.startsWith('video/') && file.category !== 'image' && file.category !== 'video'));
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory || file.source === selectedCategory;
    const matchesSource = sourceFilter === 'all' || file.source === sourceFilter;
    
    return matchesSearch && matchesType && matchesCategory && matchesSource;
  });

  const totalStorageUsed = filesArray.reduce((total: number, file: AttachedFile) => total + (file.fileSize || file.size || 0), 0);
  const totalFiles = filesArray.length;

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

  const openPreview = (file: AttachedFile) => {
    setPreviewFile(file);
    setShowPreviewDialog(true);
  };

  const renderFilePreview = (file: AttachedFile, isHover = false) => {
    const maxSize = isHover ? 'max-w-64 max-h-48' : 'max-w-2xl max-h-96';
    const fileUrl = file.fileUrl || file.path || '';
    const mimeType = file.mimeType || file.type || '';
    
    if (mimeType.startsWith('image/')) {
      return (
        <img 
          src={fileUrl} 
          alt={file.fileName || file.name || 'Image'}
          className={`${maxSize} object-contain rounded`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    
    if (mimeType.startsWith('video/')) {
      return (
        <video 
          src={fileUrl}
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
        {getFileIcon(file.mimeType, file.type)}
        <p className="text-sm font-medium mt-2">{file.fileName || file.name}</p>
        <p className="text-xs text-gray-500">{formatFileSize(file.fileSize || file.size)}</p>
        <p className="text-xs text-gray-400 mt-1">{getSourceLabel(file.source || '')}</p>
      </div>
    );
  };

  const generateShareableUrl = (file: AttachedFile) => {
    const fileName = file.fileName || file.name || '';
    if (file.isPublic || file.source === 'attached_assets' || file.source === 'object_storage_public') {
      return `${window.location.origin}/public-objects/${fileName}`;
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

  if (isLoading || filesLoading) {
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Yüklenmiş Dosyalar ({filteredFiles.length})</span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 h-8 text-sm"
                >
                  <RefreshCw className="h-3 w-3" />
                  Yenile
                </Button>
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
                    filteredFiles.map((file) => {
                      const fileName = file.fileName || file.name || 'Unnamed';
                      const fileSize = file.fileSize || file.size || 0;
                      const mimeType = file.mimeType || file.type || '';
                      const fileUrl = file.fileUrl || file.path || '';
                      
                      return (
                        <TableRow key={file.id} className="h-12">
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              {getFileIcon(mimeType)}
                              <div>
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <div className="font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors">
                                      {fileName}
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
                          <TableCell className="py-2 text-sm">{formatFileSize(fileSize)}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-xs">
                              {getSourceLabel(file.source || '')}
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
                                href={fileUrl}
                                download={fileName}
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
                                      "{fileName}" dosyasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* File Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Dosya Önizleme</DialogTitle>
              <DialogDescription>
                {previewFile?.fileName || previewFile?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {previewFile && (
                <div className="flex justify-center">
                  {renderFilePreview(previewFile, false)}
                </div>
              )}
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Dosya Adı:</strong> {previewFile?.fileName || previewFile?.name}</p>
                <p><strong>Boyut:</strong> {previewFile ? formatFileSize(previewFile.fileSize || previewFile.size) : ''}</p>
                <p><strong>Tür:</strong> {previewFile?.mimeType || previewFile?.type}</p>
                <p><strong>Kaynak:</strong> {previewFile ? getSourceLabel(previewFile.source || '') : ''}</p>
                <p><strong>Yüklenme Tarihi:</strong> {previewFile ? new Date(previewFile.uploadedAt).toLocaleString('tr-TR') : ''}</p>
                {previewFile?.isPublic !== undefined && (
                  <p><strong>Erişim:</strong> {previewFile.isPublic ? 'Herkese Açık' : 'Gizli'}</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Footer />
    </div>
  );
}