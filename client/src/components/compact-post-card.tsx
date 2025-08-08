import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  ChevronUp, 
  ChevronDown, 
  MessageCircle, 
  Share2,
  Image,
  Video,
  MoreHorizontal,
  Copy,
  ExternalLink
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

interface CompactPostCardProps {
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
  };
  userVote?: number;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenFullView?: () => void;
  className?: string;
}

export function CompactPostCard({ 
  post, 
  partner, 
  userVote = null,
  canEdit = false,
  onEdit,
  onDelete,
  onOpenFullView,
  className 
}: CompactPostCardProps) {
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

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  const netScore = upvotes - downvotes;

  return (
    <div className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b last:border-b-0 ${className || ''}`}>
      {/* Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={partner.logo} />
        <AvatarFallback>
          {partner.companyName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900 text-sm">{partner.companyName}</span>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs text-gray-500">{formatDate(post.createdAt)}</span>
          {/* Media indicators */}
          {post.type === 'image' && <Image className="h-3 w-3 text-blue-600" />}
          {post.type === 'video' && <Video className="h-3 w-3 text-purple-600" />}
        </div>
        
        <p 
          className="text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors"
          onClick={onOpenFullView}
        >
          {truncateContent(post.content)}
        </p>
      </div>

      {/* Voting */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant={currentVote === 1 ? "default" : "ghost"}
          size="sm"
          onClick={() => handleVote(1)}
          disabled={voteMutation.isPending}
          className={`h-7 w-7 p-0 ${currentVote === 1 ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50 hover:text-green-600'}`}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        
        {netScore !== 0 && (
          <span className={`text-xs font-medium px-1 ${netScore > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netScore > 0 ? `+${netScore}` : netScore}
          </span>
        )}
        
        <Button
          variant={currentVote === -1 ? "default" : "ghost"}
          size="sm"
          onClick={() => handleVote(-1)}
          disabled={voteMutation.isPending}
          className={`h-7 w-7 p-0 ${currentVote === -1 ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50 hover:text-red-600'}`}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      {/* More Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpenFullView}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Tam Boyutta Görüntüle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyPostUrl}>
            <Copy className="h-4 w-4 mr-2" />
            Linki Kopyala
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
  );
}