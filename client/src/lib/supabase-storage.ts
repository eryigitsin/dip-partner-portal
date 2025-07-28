import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// Create Supabase client for client-side operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export class ClientSupabaseStorage {
  private readonly buckets = {
    PARTNER_LOGOS: 'partner-logos',
    PARTNER_COVERS: 'partner-covers', 
    PARTNER_DOCUMENTS: 'partner-documents',
    USER_AVATARS: 'user-avatars'
  };

  async uploadFile(
    file: File, 
    bucket: keyof typeof this.buckets, 
    folder: string = '',
    fileName?: string
  ): Promise<UploadResult> {
    try {
      const bucketId = this.buckets[bucket];

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const extension = file.name.split('.').pop() || '';
      const uniqueFileName = fileName || `${file.name.split('.')[0]}-${timestamp}-${random}.${extension}`;
      
      const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketId)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketId)
        .getPublicUrl(filePath);

      return { 
        success: true, 
        url: publicUrl, 
        path: filePath 
      };

    } catch (error) {
      console.error('Upload error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown upload error' 
      };
    }
  }

  async deleteFile(bucket: keyof typeof this.buckets, filePath: string): Promise<boolean> {
    try {
      const bucketId = this.buckets[bucket];
      const { error } = await supabase.storage
        .from(bucketId)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  async uploadPartnerLogo(file: File, partnerId: string): Promise<UploadResult> {
    return this.uploadFile(file, 'PARTNER_LOGOS', `partner-${partnerId}`);
  }

  async uploadPartnerCover(file: File, partnerId: string): Promise<UploadResult> {
    return this.uploadFile(file, 'PARTNER_COVERS', `partner-${partnerId}`);
  }

  async uploadPartnerDocument(file: File, applicationId: string): Promise<UploadResult> {
    return this.uploadFile(file, 'PARTNER_DOCUMENTS', `application-${applicationId}`);
  }

  async uploadUserAvatar(file: File, userId: string): Promise<UploadResult> {
    return this.uploadFile(file, 'USER_AVATARS', `user-${userId}`);
  }

  // Utility function to extract file path from Supabase URL
  getFilePathFromUrl(url: string, bucket: keyof typeof this.buckets): string | null {
    try {
      const bucketId = this.buckets[bucket];
      const bucketPath = `/storage/v1/object/public/${bucketId}/`;
      const index = url.indexOf(bucketPath);
      
      if (index !== -1) {
        return url.substring(index + bucketPath.length);
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting file path:', error);
      return null;
    }
  }
}

export const clientSupabaseStorage = new ClientSupabaseStorage();