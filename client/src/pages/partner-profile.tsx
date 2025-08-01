import { useState, useEffect, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, convertToPercentCrop, convertToPixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QuoteRequestModal } from '@/components/modals/quote-request-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Users, 
  Calendar, 
  TrendingUp,
  Edit, 
  MessageCircle, 
  Quote,
  Camera,
  Image,
  Video,
  Plus,
  Heart,
  HeartOff,
  ExternalLink,
  Building,
  Phone,
  Mail,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  User,
  Share2,
  Trash2
} from 'lucide-react';
// import experienceIcon from "@assets/Tecrübe İkonu_1753558515148.png";
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

interface Partner {
  id: number;
  userId: number;
  companyName: string;
  contactPerson: string;
  logo: string;
  coverImage: string;
  description: string;
  serviceCategory: string;
  services: string;
  dipAdvantages: string;
  address?: string;
  shortDescription?: string;
  businessType?: string;
  companyAddress?: string;
  targetMarkets?: string;
  city: string;
  country: string;
  companySize: string;
  foundingYear: string;
  sectorExperience: string;
  website: string;
  linkedinProfile: string;
  twitterProfile: string;
  instagramProfile: string;
  facebookProfile: string;
  followersCount: number;
  isApproved: boolean;
  isActive: boolean;
  username?: string;
  profileViews?: number;
  createdAt: string;
  updatedAt?: string;
}

interface PartnerPost {
  id: number;
  partnerId: number;
  title: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

interface QuoteRequest {
  serviceNeeded: string;
  budget: string;
  projectDate: string;
  message: string;
}

export default function PartnerProfile() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [postContent, setPostContent] = useState('');
  const [editData, setEditData] = useState({
    logo: '',
    coverImage: '',
    description: ''
  });
  const [uploadingFiles, setUploadingFiles] = useState({
    logo: false,
    coverImage: false
  });
  
  // Cropping states
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropField, setCropField] = useState<'logo' | 'coverImage'>('logo');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, width: 100, height: 100, unit: '%' });
  const [imageSrc, setImageSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);


  const identifier = username || '';

  // Fetch partner data using identifier (can be ID or username)
  const { data: partner, isLoading: partnerLoading } = useQuery<Partner>({
    queryKey: ['/api/partners', identifier],
    enabled: !!identifier,
  });

  // Update editData when partner data is loaded
  useEffect(() => {
    if (partner) {
      setEditData({
        logo: '',
        coverImage: '',
        description: partner.description || ''
      });
    }
  }, [partner]);



  // Fetch partner posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<PartnerPost[]>({
    queryKey: ['/api/partners', partner?.id, 'posts'],
    enabled: !!partner?.id,
  });

  // Check if following
  const { data: followingStatus } = useQuery<{ isFollowing: boolean }>({
    queryKey: ['/api/partners', partner?.id, 'following'],
    enabled: !!partner?.id && !!user,
  });

  useEffect(() => {
    if (followingStatus) {
      setIsFollowing(followingStatus.isFollowing);
    }
  }, [followingStatus]);

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!partner?.id) return;
      if (isFollowing) {
        return await apiRequest('DELETE', `/api/partners/${partner.id}/follow`);
      } else {
        return await apiRequest('POST', `/api/partners/${partner.id}/follow`);
      }
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      queryClient.invalidateQueries({ queryKey: ['/api/partners', partner?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/partners', partner?.id, 'following'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/followed-partners'] });
      
      toast({
        title: 'Başarılı',
        description: isFollowing ? 'Takipten çıktınız' : 'Takip etmeye başladınız',
      });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'İşlem gerçekleştirilemedi',
        variant: 'destructive',
      });
    },
  });



  // Send message mutation
  const messageMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/messages', {
        receiverId: partner?.userId,
        message
      });
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Mesajınız gönderildi',
      });
      setIsMessageDialogOpen(false);
      setMessage('');
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Mesaj gönderilemedi',
        variant: 'destructive',
      });
    },
  });

  // Update partner profile mutation for description
  const updatePartnerMutation = useMutation({
    mutationFn: async (updates: any) => {
      console.log('Updating partner with data:', updates);
      return await apiRequest('PATCH', `/api/partners/${partner?.id}`, updates);
    },
    onSuccess: (updatedPartner) => {
      console.log('Partner update successful:', updatedPartner);
      queryClient.invalidateQueries({ queryKey: ['/api/partners', identifier] });
      queryClient.invalidateQueries({ queryKey: ['/api/partners'] });
      toast({
        title: 'Başarılı',
        description: 'Profil başarıyla güncellendi',
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error('Partner update error:', error);
      toast({
        title: 'Hata',
        description: 'Profil güncellenirken bir hata oluştu',
        variant: 'destructive',
      });
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      console.log('🌐 API Request: POST /api/partners/' + partner?.id + '/posts');
      console.log('📦 Request data:', postData);
      const response = await apiRequest('POST', `/api/partners/${partner?.id}/posts`, postData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Paylaşım oluşturuldu',
      });
      setIsPostDialogOpen(false);
      setPostContent('');
      queryClient.invalidateQueries({ queryKey: [`/api/partners/${partner?.id}/posts`] });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Paylaşım oluşturulamadı',
        variant: 'destructive',
      });
    },
  });

  const handleFollow = () => {
    if (!user) {
      toast({
        title: 'Giriş Gerekli',
        description: 'Takip etmek için giriş yapmalısınız',
        variant: 'destructive',
      });
      setLocation('/auth');
      return;
    }
    followMutation.mutate();
  };

  const handleQuoteRequest = () => {
    if (!user) {
      setLocation('/auth?from=quote');
      return;
    }
    setIsQuoteModalOpen(true);
  };

  const handleSendMessage = () => {
    if (!user) {
      toast({
        title: 'Giriş Gerekli',
        description: 'Mesaj göndermek için giriş yapmalısınız',
        variant: 'destructive',
      });
      setLocation('/auth');
      return;
    }
    messageMutation.mutate();
  };

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest('DELETE', `/api/partners/${partner?.id}/posts/${postId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/partners/${partner?.id}/posts`] });
      toast({
        title: 'Başarılı',
        description: 'Paylaşım silindi',
      });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Paylaşım silinemedi',
        variant: 'destructive',
      });
    },
  });

  const handleCreatePost = () => {
    createPostMutation.mutate({ content: postContent });
  };

  const handleDeletePost = (postId: number) => {
    if (confirm('Bu paylaşımı silmek istediğinizden emin misiniz?')) {
      deletePostMutation.mutate(postId);
    }
  };

  // Image loading for crop
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    
    const { naturalWidth, naturalHeight } = imgRef.current;
    const aspect = cropField === 'logo' ? 1 : 3; // 1:1 for logo, 3:1 for cover
    
    // Create initial crop based on image dimensions
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, aspect, naturalWidth, naturalHeight),
      naturalWidth,
      naturalHeight
    );
    
    console.log('Image loaded:', { naturalWidth, naturalHeight, aspect, initialCrop });
    setCrop(initialCrop);
  }, [cropField]);

  // Handle file selection and open crop dialog
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'coverImage') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setSelectedFile(file);
      setCropField(field);
      setIsCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Create cropped image and upload
  const handleCropComplete = useCallback(async () => {
    if (!selectedFile || !imgRef.current) return;

    setUploadingFiles(prev => ({ ...prev, [cropField]: true }));

    try {
      // Create canvas to draw cropped image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const image = imgRef.current;
      const pixelCrop = convertToPixelCrop(crop, image.naturalWidth, image.naturalHeight);

      // Set canvas size based on field type
      const targetWidth = cropField === 'logo' ? 400 : 1200;
      const targetHeight = cropField === 'logo' ? 400 : 400;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Clear canvas with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Ensure crop coordinates are valid
      const validCrop = {
        x: Math.max(0, Math.min(pixelCrop.x, image.naturalWidth - pixelCrop.width)),
        y: Math.max(0, Math.min(pixelCrop.y, image.naturalHeight - pixelCrop.height)),
        width: Math.min(pixelCrop.width, image.naturalWidth - pixelCrop.x),
        height: Math.min(pixelCrop.height, image.naturalHeight - pixelCrop.y)
      };

      console.log('Drawing image with crop:', {
        source: validCrop,
        destination: { width: targetWidth, height: targetHeight },
        imageSize: { width: image.naturalWidth, height: image.naturalHeight }
      });

      ctx.drawImage(
        image,
        validCrop.x,
        validCrop.y,
        validCrop.width,
        validCrop.height,
        0,
        0,
        targetWidth,
        targetHeight
      );

      // Convert to blob and upload
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Canvas to blob conversion failed');

        console.log('Blob created:', blob.size, 'bytes for', cropField);
        
        const formData = new FormData();
        // Create a File object from blob with proper name and type
        const croppedFile = new File([blob], selectedFile.name, { 
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        formData.append(cropField, croppedFile);
        // Don't automatically include description during image crop
        // Description updates are handled separately

        console.log('Uploading to:', `/api/partners/${partner?.id}`);
        console.log('FormData entries:');
        for (const [key, value] of Array.from(formData.entries())) {
          console.log(key, value);
        }

        const res = await fetch(`/api/partners/${partner?.id}`, {
          method: 'PATCH',
          body: formData,
          credentials: 'include' // Ensure cookies are sent
        });
        
        console.log('Upload response status:', res.status);
        const responseData = await res.json();
        console.log('Upload response data:', responseData);
        
        if (!res.ok) throw new Error('Upload failed');
        
        queryClient.invalidateQueries({ queryKey: ['/api/partners', identifier] });
        toast({
          title: 'Başarılı',
          description: `${cropField === 'logo' ? 'Logo' : 'Kapak fotoğrafı'} başarıyla güncellendi`,
        });
        
        setIsCropDialogOpen(false);
        setSelectedFile(null);
        setImageSrc('');
      }, 'image/jpeg', 0.95);
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Dosya yüklenirken bir hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setUploadingFiles(prev => ({ ...prev, [cropField]: false }));
    }
  }, [selectedFile, crop, cropField, editData.description, partner?.id, identifier, queryClient, toast]);

  const handleUpdateProfile = () => {
    // Only include changed fields in the update
    const updates: any = {};
    if (editData.description !== partner?.description) {
      updates.description = editData.description;
    }
    
    // Only mutate if there are actual changes
    if (Object.keys(updates).length > 0) {
      updatePartnerMutation.mutate(updates);
    } else {
      // Close dialog if no changes were made
      setIsEditDialogOpen(false);
    }
  };



  // Check if current user is the partner owner
  const isOwner = user && partner && user.id === partner.userId;
  const isAdmin = user && (user.userType === 'master_admin' || user.userType === 'editor_admin');
  const canEdit = isOwner || isAdmin;

  if (partnerLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Partner bulunamadı</h1>
            <p className="text-gray-600 mt-2">Aradığınız partner mevcut değil.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Cover Image Section with Gradient */}
      <div className="relative">
        <div 
          className="h-32 sm:h-80 bg-gradient-to-r from-blue-600 to-purple-600 bg-cover bg-center"
          style={{
            backgroundImage: partner.coverImage && window.innerWidth >= 640 ? `url(${partner.coverImage})` : undefined
          }}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          
          {/* Edit Profile Button - Visible to owner and admins */}
          {canEdit && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 left-4 bg-white/90 hover:bg-white text-gray-900"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Profili Düzenle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Profili Düzenle</DialogTitle>
                  <DialogDescription>
                    Logo ve kapak fotoğrafınızı güncelleyin veya şirket açıklamanızı düzenleyin.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logo">Logo (Kare format önerilir - 400x400px)</Label>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'logo')}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">En iyi sonuç için 400x400px boyutunda yükleyin</p>
                  </div>
                  <div>
                    <Label htmlFor="coverImage">Kapak Fotoğrafı (1200x400px önerilir)</Label>
                    <Input
                      id="coverImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'coverImage')}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">En iyi sonuç için 1200x400px boyutunda yükleyin</p>
                  </div>
                  <div>
                    <Label htmlFor="description">Açıklama (HTML destekli)</Label>
                    <Textarea
                      id="description"
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      placeholder="Şirket açıklaması - HTML etiketleri kullanabilirsiniz: <b>kalın</b>, <i>italik</i>, <u>altı çizili</u>, <br/> yeni satır, <p>paragraf</p>"
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <div className="mt-2 p-3 border rounded-md bg-gray-50">
                      <Label className="text-xs text-gray-600 mb-2 block">Önizleme:</Label>
                      <div 
                        className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: editData.description || 'Açıklama yok...' }}
                      />
                    </div>
                  </div>
                  <Button onClick={handleUpdateProfile} className="w-full" disabled={updatePartnerMutation.isPending}>
                    {updatePartnerMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    ) : (
                      <Camera className="h-4 w-4 mr-2" />
                    )}
                    {updatePartnerMutation.isPending ? 'Güncelleniyor...' : 'Profili Güncelle'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          {/* Image Crop Dialog */}
          <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {cropField === 'logo' ? 'Logo' : 'Kapak Fotoğrafı'} Kırpma
                </DialogTitle>
                <DialogDescription>
                  {cropField === 'logo' 
                    ? 'Kare format için görseli kırpın (400x400px)'
                    : 'Geniş format için görseli kırpın (1200x400px)'
                  }
                </DialogDescription>
              </DialogHeader>
              {imageSrc && (
                <div className="space-y-4">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    aspect={cropField === 'logo' ? 1 : 3}
                    className="max-h-96"
                  >
                    <img
                      ref={imgRef}
                      src={imageSrc}
                      alt="Crop preview"
                      onLoad={onImageLoad}
                      className="max-w-full max-h-96 object-contain"
                    />
                  </ReactCrop>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsCropDialogOpen(false)}
                    >
                      İptal
                    </Button>
                    <Button
                      onClick={handleCropComplete}
                      disabled={uploadingFiles[cropField]}
                    >
                      {uploadingFiles[cropField] ? 'Yükleniyor...' : 'Kırp ve Kaydet'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Service Category Badge */}
          <div className="absolute top-4 right-4 md:top-6 md:right-6">
            <Badge 
              variant="secondary" 
              className="bg-white/90 text-gray-900 text-xs md:text-sm"
            >
              {partner.serviceCategory}
            </Badge>
          </div>
          
          {/* Partner Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            {/* Mobile Layout */}
            <div className="block sm:hidden">
              <div className="flex items-center justify-between">
                {/* Logo and Name */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-white">
                    <AvatarImage src={partner.logo} alt={partner.companyName} />
                    <AvatarFallback className="text-sm">
                      {partner.companyName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-white">
                    <h1 className="text-lg font-bold">{partner.companyName}</h1>
                    <div className="flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" />
                      <span>{partner.city}</span>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    onClick={handleFollow}
                    disabled={followMutation.isPending}
                    size="sm"
                    className={`text-xs ${isFollowing ? 
                      'bg-blue-600 border-blue-600 text-white hover:bg-red-600 hover:border-red-600 hover:text-white' : 
                      'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {followMutation.isPending ? (
                      <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                    ) : isFollowing ? (
                      <Heart className="h-3 w-3 fill-current" />
                    ) : (
                      <Heart className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-xs px-3"
                    onClick={() => setIsQuoteModalOpen(true)}
                  >
                    TEKLİF
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex items-end justify-between">
              <div className="flex items-end gap-6">
                {/* Profile Image */}
                <Avatar className="w-16 h-16 md:w-24 md:h-24 border-4 border-white">
                  <AvatarImage src={partner.logo} alt={partner.companyName} />
                  <AvatarFallback className="text-lg md:text-2xl">
                    {partner.companyName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Company Info */}
                <div className="text-white mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">{partner.companyName}</h1>
                  <div className="flex items-center gap-2 md:gap-4 mt-2 text-xs md:text-sm flex-wrap">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                            <span>{partner.city}, {partner.country}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Konum</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <Building className="h-3 w-3 md:h-4 md:w-4" />
                            <span>{partner.companySize}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Şirket Büyüklüğü</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <svg className="h-3 w-3 md:h-4 md:w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                            </svg>
                            <span>{partner.sectorExperience} yıl</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Sektör Deneyimi</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <Users className="h-3 w-3 md:h-4 md:w-4" />
                            <span>{partner.followersCount} takipçi</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Takipçi Sayısı</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
              
              {/* Desktop Action Buttons */}
              <div className="flex gap-3 mb-2">
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  onClick={handleFollow}
                  disabled={followMutation.isPending}
                  className={`group ${isFollowing ? 
                    'bg-blue-600 border-blue-600 text-white hover:bg-red-600 hover:border-red-600 hover:text-white' : 
                    'bg-white text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {followMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  ) : isFollowing ? (
                    <Heart className="h-4 w-4 mr-2 fill-current" />
                  ) : (
                    <Heart className="h-4 w-4 mr-2" />
                  )}
                  {followMutation.isPending ? "İŞLENİYOR..." : 
                   isFollowing ? "TAKİP EDİLİYOR" : "TAKİP ET"}
                </Button>
                
                <Button 
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                  onClick={handleQuoteRequest}
                >
                  TEKLİF AL
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="about">Hakkında</TabsTrigger>
                <TabsTrigger value="posts">Paylaşımlar</TabsTrigger>
                <TabsTrigger value="services">Hizmetler</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Şirket Hakkında</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: partner.description || '' }}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>DİP Üyelerine Özel Avantajlar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{partner.dipAdvantages}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Şirket Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {partner.companyName && (
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">Şirket: {partner.companyName}</span>
                      </div>
                    )}
                    {partner.contactPerson && (
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">İletişim Kişisi: {partner.contactPerson}</span>
                      </div>
                    )}
                    {partner.address && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-start gap-3 cursor-help">
                              <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                              <span className="text-gray-700">Adres: {partner.address}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Şirket Adresi</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {partner.foundingYear && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">Kuruluş: {partner.foundingYear}</span>
                      </div>
                    )}
                    {partner.companySize && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-3 cursor-help">
                              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                              </svg>
                              <span className="text-gray-700">Şirket Büyüklüğü: {partner.companySize}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Şirket Büyüklüğü</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {partner.sectorExperience && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-3 cursor-help">
                              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                              </svg>
                              <span className="text-gray-700">Sektör Deneyimi: {partner.sectorExperience} yıl</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Sektör Deneyimi</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="posts" className="space-y-6">
                {/* Create Post Section - Only visible to owner */}
                {isOwner && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={partner.logo} alt={partner.companyName} />
                          <AvatarFallback>{partner.companyName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 h-auto"
                              >
                                Ne düşünüyorsun, {partner.companyName}?
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Paylaşım Oluştur</DialogTitle>
                                <DialogDescription>
                                  Sosyal medya benzeri paylaşımınızı oluşturun ve takipçilerinizle paylaşın.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={partner.logo} alt={partner.companyName} />
                                    <AvatarFallback>{partner.companyName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold">{partner.companyName}</p>
                                    <p className="text-sm text-gray-500">Herkese açık</p>
                                  </div>
                                </div>
                                <Textarea
                                  value={postContent}
                                  onChange={(e) => setPostContent(e.target.value)}
                                  placeholder="Ne paylaşmak istiyorsun?"
                                  className="min-h-[120px] border-none resize-none text-lg"
                                />
                                <div className="flex items-center justify-between border-t pt-3">
                                  <div className="flex items-center gap-4">
                                    <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                      <Image className="h-5 w-5 mr-2" />
                                      Fotoğraf
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                      <Video className="h-5 w-5 mr-2" />
                                      Video
                                    </Button>
                                  </div>
                                  <Button
                                    onClick={handleCreatePost}
                                    disabled={!postContent.trim() || createPostMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    {createPostMutation.isPending ? 'Paylaşılıyor...' : 'Paylaş'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <Button variant="ghost" size="sm" className="flex-1 justify-center">
                          <Image className="h-5 w-5 mr-2" />
                          Fotoğraf/Video
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 justify-center">
                          <MessageCircle className="h-5 w-5 mr-2" />
                          Etkinlik
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 justify-center">
                          <Plus className="h-5 w-5 mr-2" />
                          Daha fazla
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Posts Feed */}
                {postsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : posts.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-gray-500">
                        {isOwner ? 'İlk paylaşımınızı yapın!' : 'Henüz paylaşım bulunmuyor.'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  posts.map(post => (
                    <Card key={post.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={partner.logo} alt={partner.companyName} />
                              <AvatarFallback>{partner.companyName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{partner.companyName}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(post.createdAt).toLocaleDateString('tr-TR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>
                        {post.imageUrl && (
                          <img 
                            src={post.imageUrl} 
                            alt="Paylaşım görseli"
                            className="w-full h-auto rounded-lg mb-4"
                          />
                        )}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="flex items-center gap-6">
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-600">
                              <Heart className="h-5 w-5 mr-2" />
                              {post.likesCount || 0}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600">
                              <MessageCircle className="h-5 w-5 mr-2" />
                              {post.commentsCount || 0}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-green-600">
                              <Share2 className="h-5 w-5 mr-2" />
                              Paylaş
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="services" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sunulan Hizmetler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PartnerServicesDisplay partnerId={partner.id} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>İletişim</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-gray-500" />
                    <a 
                      href={partner.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Web Sitesi
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  
                  {partner.linkedinProfile && (
                    <div className="flex items-center gap-3">
                      <Linkedin className="h-5 w-5 text-gray-500" />
                      <a 
                        href={partner.linkedinProfile} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        LinkedIn
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  
                  {partner.twitterProfile && (
                    <div className="flex items-center gap-3">
                      <Twitter className="h-5 w-5 text-gray-500" />
                      <a 
                        href={partner.twitterProfile} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Twitter
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  
                  {partner.instagramProfile && (
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-gray-500" />
                      <a 
                        href={partner.instagramProfile} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Instagram
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  
                  {partner.facebookProfile && (
                    <div className="flex items-center gap-3">
                      <Facebook className="h-5 w-5 text-gray-500" />
                      <a 
                        href={partner.facebookProfile} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Facebook
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Message Button - Only visible to regular users and partners, not admins */}
                {user && user.userType !== 'master_admin' && user.userType !== 'editor_admin' && (
                  <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Mesaj Gönder
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Mesaj Gönder</DialogTitle>
                        <DialogDescription>
                          {partner.companyName} firmasına mesaj gönderin.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Mesajınızı yazın..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={4}
                        />
                        <Button onClick={handleSendMessage} disabled={messageMutation.isPending} className="w-full">
                          Mesajı Gönder
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Quote Request Modal */}
      <QuoteRequestModal 
        isOpen={isQuoteModalOpen} 
        onClose={() => setIsQuoteModalOpen(false)} 
        partner={partner} 
      />
      
      <Footer />
    </div>
  );
}

// Partner Services Display Component
function PartnerServicesDisplay({ partnerId }: { partnerId: number }) {
  const [selectedServicePartners, setSelectedServicePartners] = useState<any[]>([]);
  const [isPartnersDialogOpen, setIsPartnersDialogOpen] = useState(false);
  const [selectedServiceName, setSelectedServiceName] = useState('');

  // Fetch partner's selected services
  const { data: partnerServices = [] } = useQuery<Array<{ id: number; name: string; description?: string; category?: string }>>({
    queryKey: ['/api/partner/services', partnerId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/partners/${partnerId}/services`);
      return res.json();
    }
  });

  // Handle service click to show all partners offering this service
  const handleServiceClick = async (serviceName: string) => {
    try {
      setSelectedServiceName(serviceName);
      const res = await apiRequest('GET', `/api/services/${encodeURIComponent(serviceName)}/partners`);
      const data = await res.json();
      setSelectedServicePartners(data);
      setIsPartnersDialogOpen(true);
    } catch (error) {
      console.error('Error fetching service partners:', error);
    }
  };

  if (partnerServices.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Henüz hizmet eklenmemiş.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {partnerServices.map((service) => (
          <Button
            key={service.id}
            variant="outline"
            size="sm"
            className="rounded-full hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
            onClick={() => handleServiceClick(service.name)}
          >
            {service.name}
          </Button>
        ))}
      </div>

      {/* Partners Dialog */}
      <Dialog open={isPartnersDialogOpen} onOpenChange={setIsPartnersDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedServiceName} Hizmeti Sunan Partnerler</DialogTitle>
            <DialogDescription>
              Bu hizmeti sunan tüm iş ortakları aşağıda listelenmiştir.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {selectedServicePartners.map((item: any) => {
              const partner = item.partner;
              return (
                <Card key={partner.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={partner.logo} alt={partner.companyName} />
                        <AvatarFallback>
                          {partner.companyName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{partner.companyName}</h3>
                        <p className="text-sm text-gray-600 mb-2">{partner.serviceCategory}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {partner.city}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {partner.foundingYear}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => window.open(`/partner/${partner.username || partner.id}`, '_blank')}
                        >
                          Profili Görüntüle
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}