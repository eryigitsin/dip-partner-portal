import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

export interface FileSecurityOptions {
  maxFileSize?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  uploadPath?: string;
}

export class FileSecurityService {
  private maxFileSize: number;
  private allowedExtensions: string[];
  private allowedMimeTypes: string[];
  private uploadPath: string;

  constructor(options: FileSecurityOptions = {}) {
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.allowedExtensions = options.allowedExtensions || [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', // Images
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', // Documents
      '.txt', '.csv' // Text files
    ];
    this.allowedMimeTypes = options.allowedMimeTypes || [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];
    this.uploadPath = options.uploadPath || './uploads/';

    // Create upload directory if it doesn't exist
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  // Create secure multer storage configuration
  createSecureStorage(): multer.StorageEngine {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadPath);
      },
      filename: (req, file, cb) => {
        try {
          // Generate unique filename with crypto
          const uniqueName = crypto.randomBytes(16).toString('hex');
          const ext = path.extname(file.originalname).toLowerCase();
          
          // Validate file extension
          if (!this.allowedExtensions.includes(ext)) {
            return cb(new Error('Invalid file extension'));
          }
          
          // Generate secure filename
          const secureFilename = `${uniqueName}${ext}`;
          cb(null, secureFilename);
        } catch (error) {
          cb(error as Error, '');
        }
      }
    });
  }

  // Create secure multer configuration
  createSecureUpload(): multer.Multer {
    return multer({
      storage: this.createSecureStorage(),
      limits: {
        fileSize: this.maxFileSize,
        files: 5, // Maximum 5 files at once
        fieldSize: 1024, // 1KB field size limit
        headerPairs: 20 // Limit header pairs
      },
      fileFilter: (req, file, cb) => {
        try {
          // Check MIME type
          if (!this.allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type'));
          }

          // Check file extension
          const ext = path.extname(file.originalname).toLowerCase();
          if (!this.allowedExtensions.includes(ext)) {
            return cb(new Error('Invalid file extension'));
          }

          // Check for suspicious filenames
          if (this.hasSuspiciousFilename(file.originalname)) {
            return cb(new Error('Suspicious filename detected'));
          }

          cb(null, true);
        } catch (error) {
          cb(error as Error, false);
        }
      }
    });
  }

  // Check for suspicious patterns in filename
  private hasSuspiciousFilename(filename: string): boolean {
    const suspiciousPatterns = [
      /\.\./,           // Directory traversal
      /[<>:"\\|?*]/,    // Invalid characters
      /^\./,            // Hidden files
      /\.php$/i,        // PHP files
      /\.jsp$/i,        // JSP files
      /\.asp$/i,        // ASP files
      /\.js$/i,         // JavaScript files (if not allowing)
      /\.html?$/i,      // HTML files
      /\.exe$/i,        // Executable files
      /\.bat$/i,        // Batch files
      /\.sh$/i,         // Shell scripts
      /\.py$/i,         // Python files
      /\.pl$/i,         // Perl files
      /\.rb$/i,         // Ruby files
      /script/i,        // Contains 'script'
      /javascript/i,    // Contains 'javascript'
      /vbscript/i       // Contains 'vbscript'
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  // Validate uploaded file
  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${this.maxFileSize / (1024 * 1024)}MB`
      };
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type'
      };
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: 'Invalid file extension'
      };
    }

    // Additional security checks
    if (this.hasSuspiciousFilename(file.originalname)) {
      return {
        valid: false,
        error: 'Suspicious filename detected'
      };
    }

    return { valid: true };
  }

  // Sanitize filename for display
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"\\|?*]/g, '') // Remove invalid characters
      .replace(/\.\./g, '')        // Remove directory traversal
      .replace(/^\./, '')          // Remove leading dot
      .trim()
      .substring(0, 255);          // Limit length
  }

  // Get secure file path
  getSecureFilePath(filename: string): string {
    const sanitizedFilename = this.sanitizeFilename(filename);
    return path.join(this.uploadPath, sanitizedFilename);
  }

  // Delete file securely
  async deleteFile(filepath: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Ensure file is within upload directory
      const resolvedPath = path.resolve(filepath);
      const resolvedUploadPath = path.resolve(this.uploadPath);
      
      if (!resolvedPath.startsWith(resolvedUploadPath)) {
        return { success: false, error: 'Invalid file path' };
      }

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        return { success: false, error: 'File not found' };
      }

      // Delete file
      fs.unlinkSync(resolvedPath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const fileSecurityService = new FileSecurityService();