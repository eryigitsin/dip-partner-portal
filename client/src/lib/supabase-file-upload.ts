import { supabase } from './supabase';

export interface UploadOptions {
  folder?: string;
  fileName?: string;
  maxSize?: number; // in MB
  allowedTypes?: string[];
}

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
}

/**
 * Upload a file to Supabase storage
 */
export async function uploadFile(
  file: File,
  bucketName: string = 'publicfiles',
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    folder = 'partner-posts',
    fileName,
    maxSize = 10, // 10MB default
    allowedTypes = ['image/*', 'video/*']
  } = options;

  // Validate file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSize) {
    throw new Error(`File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed size (${maxSize}MB)`);
  }

  // Validate file type
  const isValidType = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', '/'));
    }
    return file.type === type;
  });

  if (!isValidType) {
    throw new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Generate unique filename
  const fileExtension = file.name.split('.').pop();
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const uniqueFileName = fileName || `${timestamp}_${randomId}.${fileExtension}`;
  const filePath = `${folder}/${uniqueFileName}`;

  try {
    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      url: publicData.publicUrl,
      path: filePath,
      fileName: uniqueFileName
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
  files: File[],
  bucketName: string = 'publicfiles',
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (const file of files) {
    try {
      const result = await uploadFile(file, bucketName, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Delete file from Supabase storage
 */
export async function deleteFile(
  filePath: string,
  bucketName: string = 'publicfiles'
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('Delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Get file info including metadata
 */
export async function getFileInfo(
  filePath: string,
  bucketName: string = 'publicfiles'
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      });

    if (error) {
      throw error;
    }

    return data?.[0] || null;
  } catch (error: any) {
    console.error('Get file info error:', error);
    throw new Error(`Failed to get file info: ${error.message}`);
  }
}