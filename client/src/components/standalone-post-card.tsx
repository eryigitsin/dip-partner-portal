import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  ChevronUp, 
  ChevronDown, 
  MessageCircle, 
  Share2, 
  Copy,
  ExternalLink,
  MoreHorizontal,
  Calendar
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StandalonePostCardProps {
  post: {
    id: number;
    partnerId: number;
    title?: string;
    content: string;
    type: string;
    imageUrl?: string;
    videoUrl?: string;
    upvotes: number;
    downvotes: number;
    createdAt: string;
  };
  partner: {
    id: number;
    companyName: string;
    logo?: string;
    username?: string;
    contactPerson?: string;
    isApproved?: boolean;
  };
  userVote?: number; // 1 for upvote, -1 for downvote, null for no vote
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function StandalonePostCard({ 
  post, 
  partner, 
  userVote = null,
  canEdit = false,
  onEdit,
  onDelete,
  className 
}: StandalonePostCardProps) {
  const { toast } = useToast();
  const [currentVote, setCurrentVote] = useState<number | null>(userVote);
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [downvotes, setDownvotes] = useState(post.downvotes);

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ vote }: { vote: number }) => {
      const response = await apiRequest('POST', `/api/posts/${post.id}/vote`, { vote });
      return response.json();
    },
    onSuccess: (data: any) => {
      setCurrentVote(data.userVote);
      setUpvotes(data.upvotes || 0);
      setDownvotes(data.downvotes || 0);
      queryClient.invalidateQueries({ queryKey: ['/api/partners', partner.id, 'posts'] });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Oy kullanılırken hata oluştu',
        variant: 'destructive',
      });
    },
  });

  const handleVote = (vote: number) => {
    if (voteMutation.isPending) return;
    
    // If clicking the same vote, remove it
    const newVote = currentVote === vote ? 0 : vote;
    voteMutation.mutate({ vote: newVote });
  };

  const copyPostUrl = async () => {
    try {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/partner/${partner.username || partner.id}/post/${post.id}`;
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Başarılı',
        description: 'Post linki kopyalandı',
      });
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Link kopyalanamadı',
        variant: 'destructive',
      });
    }
  };

  const openInNewTab = () => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/partner/${partner.username || partner.id}/post/${post.id}`;
    window.open(url, '_blank');
  };

  const sharePost = async () => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/partner/${partner.username || partner.id}/post/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || `${partner.companyName} - Paylaşım`,
          text: post.content.substring(0, 100) + '...',
          url: url,
        });
      } catch (error) {
        // User cancelled or error occurred, fallback to copy
        copyPostUrl();
      }
    } else {
      copyPostUrl();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(parseISO(dateString), { 
        addSuffix: true, 
        locale: tr 
      });
    } catch (error) {
      return 'Bilinmiyor';
    }
  };

  const netScore = upvotes - downvotes;

  return (
    <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className || ''}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={partner.logo} />
              <AvatarFallback>
                {partner.companyName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {partner.companyName}
                </h3>
                {partner.isApproved && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                    ✓ Onaylandı
                  </Badge>
                )}
              </div>
              {partner.contactPerson && (
                <p className="text-sm text-gray-600 mt-1">{partner.contactPerson}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyPostUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Linki Kopyala
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Yeni Sekmede Aç
              </DropdownMenuItem>
              {canEdit && onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  Düzenle
                </DropdownMenuItem>
              )}
              {canEdit && onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  Sil
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="mb-4">
          <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>
        </div>

        {/* Media */}
        {post.type === 'image' && post.imageUrl && (
          <div className="mb-4">
            <img
              src={post.imageUrl}
              alt="Post image"
              className="w-full max-h-[500px] object-cover rounded-lg border"
            />
          </div>
        )}

        {post.type === 'video' && post.videoUrl && (
          <div className="mb-4">
            <video
              src={post.videoUrl}
              controls
              className="w-full max-h-[500px] rounded-lg border"
              preload="metadata"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          {/* Voting */}
          <div className="flex items-center gap-1">
            <Button
              variant={currentVote === 1 ? "default" : "ghost"}
              size="sm"
              onClick={() => handleVote(1)}
              disabled={voteMutation.isPending}
              className={`h-9 px-3 ${currentVote === 1 ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50 hover:text-green-600'}`}
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              {upvotes}
            </Button>
            
            <Button
              variant={currentVote === -1 ? "default" : "ghost"}
              size="sm"
              onClick={() => handleVote(-1)}
              disabled={voteMutation.isPending}
              className={`h-9 px-3 ${currentVote === -1 ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50 hover:text-red-600'}`}
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              {downvotes}
            </Button>
            
            {netScore !== 0 && (
              <span className={`text-sm font-medium ml-2 ${netScore > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netScore > 0 ? `+${netScore}` : netScore}
              </span>
            )}
          </div>

          {/* Social Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
              title="Bu özellik çok yakında eklenecektir."
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Yorum
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={sharePost}
              className="text-gray-600 hover:text-gray-900"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Paylaş
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}