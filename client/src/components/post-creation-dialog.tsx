import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { uploadFile } from '@/lib/supabase-file-upload';
import { Image, Video, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostCreationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: number;
}

type MediaType = 'image' | 'video' | null;

interface MediaPreview {
  file: File;
  type: MediaType;
  preview: string;
}

export function PostCreationDialog({ isOpen, onOpenChange, partnerId }: PostCreationDialogProps) {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaPreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: {
      content: string;
      type: string;
      imageUrl?: string;
      videoUrl?: string;
    }) => {
      const response = await apiRequest('POST', `/api/partners/${partnerId}/posts`, postData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Paylaşım oluşturuldu',
      });
      onOpenChange(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/partners', partnerId, 'posts'] });
    },
    onError: (error) => {
      console.error('Post creation error:', error);
      toast({
        title: 'Hata',
        description: 'Paylaşım oluşturulamadı',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setContent('');
    setMedia(null);
    setIsUploading(false);
    // Reset file inputs
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>, type: MediaType) => {
    const file = event.target.files?.[0];
    if (!file || !type) return;

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'Hata',
        description: 'Dosya boyutu 10MB\'dan küçük olmalıdır',
        variant: 'destructive',
      });
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setMedia({ file, type, preview });
  };

  const removeMedia = () => {
    if (media?.preview) {
      URL.revokeObjectURL(media.preview);
    }
    setMedia(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() && !media) {
      toast({
        title: 'Hata',
        description: 'Lütfen içerik yazın veya medya ekleyin',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      let uploadedUrl = '';
      let postType = 'text';

      // Upload media if present
      if (media) {
        const uploadResult = await uploadFile(media.file, 'publicfiles', {
          folder: 'partner-posts',
          maxSize: 10, // 10MB
          allowedTypes: media.type === 'image' ? ['image/*'] : ['video/*']
        });
        
        uploadedUrl = uploadResult.url;
        postType = media.type;
      }

      // Create the post
      const postData = {
        content: content.trim(),
        type: postType,
        ...(postType === 'image' && uploadedUrl ? { imageUrl: uploadedUrl } : {}),
        ...(postType === 'video' && uploadedUrl ? { videoUrl: uploadedUrl } : {})
      };

      await createPostMutation.mutateAsync(postData);
    } catch (error: any) {
      console.error('Media upload error:', error);
      toast({
        title: 'Hata',
        description: error.message || 'Medya yüklenirken hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmitDisabled = isUploading || createPostMutation.isPending || (!content.trim() && !media);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Paylaşım Oluştur</DialogTitle>
          <DialogDescription>
            Metin, fotoğraf veya video paylaşın
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Content Input */}
          <div>
            <Label htmlFor="content">İçerik</Label>
            <Textarea
              id="content"
              placeholder="Ne düşünüyorsunuz?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {content.length}/1000
            </div>
          </div>

          {/* Media Preview */}
          {media && (
            <div className="relative border rounded-lg p-4 bg-gray-50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeMedia}
                className="absolute top-2 right-2 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
              
              {media.type === 'image' ? (
                <img
                  src={media.preview}
                  alt="Preview"
                  className="w-full max-h-64 object-cover rounded"
                />
              ) : (
                <video
                  src={media.preview}
                  controls
                  className="w-full max-h-64 rounded"
                />
              )}
              
              <div className="mt-2 text-sm text-gray-600">
                {media.file.name} ({(media.file.size / (1024 * 1024)).toFixed(1)} MB)
              </div>
            </div>
          )}

          {/* Media Upload Buttons */}
          {!media && (
            <div className="flex gap-2">
              {/* Image Upload */}
              <div>
                <Input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMediaSelect(e, 'image')}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Image className="h-4 w-4" />
                  Fotoğraf
                </Button>
              </div>

              {/* Video Upload */}
              <div>
                <Input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleMediaSelect(e, 'video')}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  Video
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isUploading || createPostMutation.isPending}
            >
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="min-w-[100px]"
            >
              {(isUploading || createPostMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isUploading ? 'Yükleniyor...' : 'Paylaşılıyor...'}
                </>
              ) : (
                'Paylaş'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}