import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export class SupabaseStorageService {
  private readonly buckets = {
    PARTNER_LOGOS: 'partner-logos',
    PARTNER_COVERS: 'partner-covers', 
    PARTNER_DOCUMENTS: 'partner-documents',
    USER_AVATARS: 'user-avatars'
  };

  constructor() {
    this.initializeBuckets();
  }

  private async initializeBuckets() {
    try {
      // Create buckets if they don't exist
      for (const [name, bucketId] of Object.entries(this.buckets)) {
        const { data: bucket } = await supabase.storage.getBucket(bucketId);
        
        if (!bucket) {
          const { error } = await supabase.storage.createBucket(bucketId, {
            public: true,
            allowedMimeTypes: name === 'PARTNER_DOCUMENTS' 
              ? ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
              : ['image/*'],
            fileSizeLimit: name === 'PARTNER_DOCUMENTS' ? 10485760 : 5242880 // 10MB for docs, 5MB for images
          });
          
          if (error) {
            console.error(`Failed to create bucket ${bucketId}:`, error);
          } else {
            console.log(`Created storage bucket: ${bucketId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing storage buckets:', error);
    }
  }

  async uploadFile(
    file: Express.Multer.File | Buffer, 
    bucket: keyof typeof this.buckets, 
    folder: string = '',
    fileName?: string
  ): Promise<UploadResult> {
    try {
      const bucketId = this.buckets[bucket];
      let fileBuffer: Buffer;
      let originalName: string;
      let mimeType: string;

      if (Buffer.isBuffer(file)) {
        fileBuffer = file;
        originalName = fileName || 'file';
        mimeType = 'application/octet-stream';
      } else {
        // Handle both memory storage (buffer) and disk storage
        if (file.buffer) {
          fileBuffer = file.buffer; // Memory storage
        } else if (file.path) {
          fileBuffer = fs.readFileSync(file.path); // Disk storage (legacy)
        } else {
          throw new Error('No file data available');
        }
        originalName = file.originalname;
        mimeType = file.mimetype;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const extension = path.extname(originalName);
      const uniqueFileName = `${path.basename(originalName, extension)}-${timestamp}-${random}${extension}`;
      
      const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketId)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          duplex: 'half'
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketId)
        .getPublicUrl(filePath);

      // Clean up local file if it was uploaded via multer disk storage (legacy)
      if (!Buffer.isBuffer(file) && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

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

  async uploadPartnerLogo(file: Express.Multer.File, partnerId: string): Promise<UploadResult> {
    return this.uploadFile(file, 'PARTNER_LOGOS', `partner-${partnerId}`);
  }

  async uploadPartnerCover(file: Express.Multer.File, partnerId: string): Promise<UploadResult> {
    return this.uploadFile(file, 'PARTNER_COVERS', `partner-${partnerId}`);
  }

  async uploadPartnerDocument(file: Express.Multer.File, applicationId: string): Promise<UploadResult> {
    return this.uploadFile(file, 'PARTNER_DOCUMENTS', `application-${applicationId}`);
  }

  async uploadUserAvatar(file: Express.Multer.File, userId: string): Promise<UploadResult> {
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

export const supabaseStorage = new SupabaseStorageService();