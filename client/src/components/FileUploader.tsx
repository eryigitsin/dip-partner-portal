import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, X, Upload, File } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FileUploaderProps {
  onFileSelect: (fileUrl: string, fileName: string) => void;
  onFileRemove: () => void;
  selectedFile?: {
    fileName: string;
    fileUrl: string;
  } | null;
  disabled?: boolean;
}

export function FileUploader({ onFileSelect, onFileRemove, selectedFile, disabled }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Dosya çok büyük",
        description: "Maksimum dosya boyutu 10MB olmalıdır.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get upload URL
      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload URL alınamadı');
      }

      const { uploadURL } = await uploadResponse.json();

      // Upload file to storage
      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error('Dosya yüklenemedi');
      }

      // Extract file path from upload URL
      const url = new URL(uploadURL);
      const filePath = url.pathname;
      const fileUrl = `/objects${filePath.split('/').slice(3).join('/')}`;

      onFileSelect(fileUrl, file.name);

      toast({
        title: "Dosya yüklendi",
        description: `${file.name} başarıyla yüklendi.`,
      });

    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Yükleme hatası",
        description: "Dosya yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
      />

      {selectedFile ? (
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 max-w-xs">
          <File className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {selectedFile.fileName}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onFileRemove}
            className="h-6 w-6 p-0"
            disabled={disabled}
            data-testid="button-remove-file"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={triggerFileSelect}
          disabled={disabled || isUploading}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          data-testid="button-attach-file"
        >
          {isUploading ? (
            <Upload className="w-4 h-4 animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}