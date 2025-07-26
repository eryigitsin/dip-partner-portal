import { useState, useEffect } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Users, 
  Calendar, 
  TrendingUp,
  Edit, 
  MessageCircle, 
  Quote,
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
  User
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
  createdAt: string;
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
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest>({
    serviceNeeded: '',
    budget: '',
    projectDate: '',
    message: ''
  });

  const partnerId = parseInt(id || '0');

  // Fetch partner data
  const { data: partner, isLoading: partnerLoading } = useQuery<Partner>({
    queryKey: ['/api/partners', partnerId],
    enabled: !!partnerId,
  });

  // Fetch partner posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<PartnerPost[]>({
    queryKey: ['/api/partners', partnerId, 'posts'],
    enabled: !!partnerId,
  });

  // Check if following
  const { data: followingStatus } = useQuery<{ isFollowing: boolean }>({
    queryKey: ['/api/partners', partnerId, 'following'],
    enabled: !!partnerId && !!user,
  });

  useEffect(() => {
    if (followingStatus) {
      setIsFollowing(followingStatus.isFollowing);
    }
  }, [followingStatus]);

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const res = await apiRequest('POST', `/api/partners/${partnerId}/${endpoint}`);
      return res.json();
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      queryClient.invalidateQueries({ queryKey: ['/api/partners', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['/api/partners', partnerId, 'following'] });
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

  // Send quote request mutation
  const quoteRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/quote-requests', {
        partnerId,
        ...quoteRequest
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Teklif talebiniz gönderildi',
      });
      setIsQuoteDialogOpen(false);
      setQuoteRequest({ serviceNeeded: '', budget: '', projectDate: '', message: '' });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Teklif talebi gönderilemedi',
        variant: 'destructive',
      });
    },
  });

  // Send message mutation
  const messageMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/messages', {
        receiverId: partner?.userId,
        message
      });
      return res.json();
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
      toast({
        title: 'Giriş Gerekli',
        description: 'Teklif almak için giriş yapmalısınız',
        variant: 'destructive',
      });
      setLocation('/auth');
      return;
    }
    quoteRequestMutation.mutate();
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
          className="h-80 bg-gradient-to-r from-blue-600 to-purple-600 bg-cover bg-center"
          style={{
            backgroundImage: partner.coverImage ? `url(${partner.coverImage})` : undefined
          }}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Service Category Badge */}
          <div className="absolute top-6 right-6">
            <Badge 
              variant="secondary" 
              className="bg-white/90 text-gray-900 hover:bg-white cursor-pointer"
              onClick={() => setLocation(`/?category=${encodeURIComponent(partner.serviceCategory)}`)}
            >
              {partner.serviceCategory}
            </Badge>
          </div>
          
          {/* Partner Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-6">
                {/* Profile Image */}
                <Avatar className="w-24 h-24 border-4 border-white">
                  <AvatarImage src={partner.logo} alt={partner.companyName} />
                  <AvatarFallback className="text-2xl">
                    {partner.companyName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Company Info */}
                <div className="text-white mb-2">
                  <h1 className="text-3xl font-bold">{partner.companyName}</h1>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{partner.city}, {partner.country}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span>{partner.companySize}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                      </svg>
                      <span>{partner.sectorExperience} yıl</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{partner.followersCount} takipçi</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mb-2">
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  onClick={handleFollow}
                  disabled={followMutation.isPending}
                  className={`group ${isFollowing ? 
                    'bg-blue-600 border-blue-600 text-white hover:bg-red-600 hover:border-red-600 hover:text-white' : 
                    'bg-white text-gray-900 hover:bg-gray-100'
                  }`}
                  onMouseEnter={(e) => {
                    if (isFollowing) {
                      e.currentTarget.innerHTML = '<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>TAKİPTEN ÇIK';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isFollowing) {
                      e.currentTarget.innerHTML = '<svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>TAKİP EDİLİYOR';
                    }
                  }}
                >
                  {isFollowing ? (
                    <>
                      <Heart className="h-4 w-4 mr-2 fill-current" />
                      TAKİP EDİLİYOR
                    </>
                  ) : (
                    <>
                      <Heart className="h-4 w-4 mr-2" />
                      TAKİP ET
                    </>
                  )}
                </Button>
                
                <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
                      <Quote className="h-4 w-4 mr-2" />
                      TEKLİF AL
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Teklif Talebi</DialogTitle>
                      <DialogDescription>
                        {partner.companyName} firmasından teklif almak için formu doldurun.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="İhtiyacınız olan hizmet"
                        value={quoteRequest.serviceNeeded}
                        onChange={(e) => setQuoteRequest(prev => ({ ...prev, serviceNeeded: e.target.value }))}
                      />
                      <Input
                        placeholder="Bütçe aralığınız"
                        value={quoteRequest.budget}
                        onChange={(e) => setQuoteRequest(prev => ({ ...prev, budget: e.target.value }))}
                      />
                      <Input
                        type="date"
                        placeholder="Proje tarihi"
                        value={quoteRequest.projectDate}
                        onChange={(e) => setQuoteRequest(prev => ({ ...prev, projectDate: e.target.value }))}
                      />
                      <Textarea
                        placeholder="Proje detayları..."
                        value={quoteRequest.message}
                        onChange={(e) => setQuoteRequest(prev => ({ ...prev, message: e.target.value }))}
                        rows={4}
                      />
                      <Button onClick={handleQuoteRequest} disabled={quoteRequestMutation.isPending} className="w-full">
                        Teklif Talebi Gönder
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                    <p className="text-gray-700 leading-relaxed">{partner.description}</p>
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
                    {partner.contactPerson && (
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">İletişim Kişisi: {partner.contactPerson}</span>
                      </div>
                    )}
                    {partner.companyAddress && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                        <span className="text-gray-700">Adres: {partner.companyAddress}</span>
                      </div>
                    )}
                    {partner.foundingYear && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">Kuruluş: {partner.foundingYear}</span>
                      </div>
                    )}
                    {partner.companySize && (
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">Şirket Büyüklüğü: {partner.companySize}</span>
                      </div>
                    )}
                    {partner.sectorExperience && (
                      <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                        </svg>
                        <span className="text-gray-700">Sektör Deneyimi: {partner.sectorExperience} yıl</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="posts" className="space-y-6">
                {postsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : posts.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-gray-500">Henüz paylaşım bulunmuyor.</p>
                    </CardContent>
                  </Card>
                ) : (
                  posts.map(post => (
                    <Card key={post.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{post.title}</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 mb-4">{post.content}</p>
                        {post.imageUrl && (
                          <img 
                            src={post.imageUrl} 
                            alt={post.title}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                          <span className="text-sm text-gray-500">{post.likesCount} beğeni</span>
                          <span className="text-sm text-gray-500">{post.commentsCount} yorum</span>
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
                    <p className="text-gray-700 leading-relaxed">{partner.services}</p>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}