import sanitizeHtml from 'sanitize-html';

// Email rate limiting store (in production, use Redis)
const emailRateLimit = new Map<string, { count: number; resetTime: number }>();

export interface EmailSecurityOptions {
  maxEmailsPerHour?: number;
  maxEmailsPerDay?: number;
  allowedHtmlTags?: string[];
  allowedAttributes?: Record<string, string[]>;
}

export class EmailSecurity {
  private maxEmailsPerHour: number;
  private maxEmailsPerDay: number;
  private allowedHtmlTags: string[];
  private allowedAttributes: Record<string, string[]>;

  constructor(options: EmailSecurityOptions = {}) {
    this.maxEmailsPerHour = options.maxEmailsPerHour || 10;
    this.maxEmailsPerDay = options.maxEmailsPerDay || 50;
    this.allowedHtmlTags = options.allowedHtmlTags || [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'strong', 'em', 'u', 'i',
      'a', 'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'img'
    ];
    this.allowedAttributes = options.allowedAttributes || {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'div': ['style'],
      'span': ['style'],
      'p': ['style'],
      'h1': ['style'],
      'h2': ['style'],
      'h3': ['style'],
      'h4': ['style'],
      'h5': ['style'],
      'h6': ['style'],
      'table': ['style', 'border', 'cellpadding', 'cellspacing'],
      'td': ['style', 'colspan', 'rowspan'],
      'th': ['style', 'colspan', 'rowspan']
    };
  }

  // Sanitize HTML content for email templates
  sanitizeEmailContent(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: this.allowedHtmlTags,
      allowedAttributes: this.allowedAttributes,
      allowedIframeHostnames: [], // No iframes allowed
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesByTag: {
        img: ['http', 'https', 'data'],
        a: ['http', 'https', 'mailto']
      },
      transformTags: {
        'a': (tagName: string, attribs: any) => {
          // Force external links to open in new tab and add security attributes
          if (attribs.href && (attribs.href.startsWith('http') || attribs.href.startsWith('https'))) {
            return {
              tagName,
              attribs: {
                ...attribs,
                target: '_blank',
                rel: 'noopener noreferrer'
              }
            };
          }
          return { tagName, attribs };
        }
      }
    });
  }

  // Sanitize template data to prevent injection
  sanitizeTemplateData(data: Record<string, any>): Record<string, any> {
    const sanitizedData: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Remove any potentially dangerous content from template variables
        sanitizedData[key] = sanitizeHtml(value, {
          allowedTags: [],
          allowedAttributes: {}
        });
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitizedData[key] = value;
      } else if (value === null || value === undefined) {
        sanitizedData[key] = '';
      } else {
        // For complex objects, convert to string and sanitize
        sanitizedData[key] = sanitizeHtml(String(value), {
          allowedTags: [],
          allowedAttributes: {}
        });
      }
    }
    
    return sanitizedData;
  }

  // Check rate limiting for email sending
  checkRateLimit(email: string): { allowed: boolean; error?: string } {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);

    // Clean up old entries
    this.cleanupRateLimit();

    const key = email.toLowerCase();
    const current = emailRateLimit.get(key) || { count: 0, resetTime: now + (60 * 60 * 1000) };

    // Check hourly limit
    if (current.count >= this.maxEmailsPerHour && current.resetTime > now) {
      return {
        allowed: false,
        error: `Email rate limit exceeded. Maximum ${this.maxEmailsPerHour} emails per hour allowed.`
      };
    }

    // Reset counter if time window passed
    if (current.resetTime <= now) {
      current.count = 0;
      current.resetTime = now + (60 * 60 * 1000);
    }

    // Increment counter
    current.count++;
    emailRateLimit.set(key, current);

    return { allowed: true };
  }

  // Clean up old rate limit entries
  private cleanupRateLimit(): void {
    const now = Date.now();
    const entries = Array.from(emailRateLimit.entries());
    for (const [key, data] of entries) {
      if (data.resetTime <= now) {
        emailRateLimit.delete(key);
      }
    }
  }

  // Validate email address format
  validateEmailAddress(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email address is required' };
    }

    if (email.length > 254) {
      return { valid: false, error: 'Email address is too long' };
    }

    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email address format' };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /<[^>]*>/,
      /['"\\]/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        return { valid: false, error: 'Email contains invalid characters' };
      }
    }

    return { valid: true };
  }

  // Validate subject line
  validateSubject(subject: string): { valid: boolean; error?: string } {
    if (!subject || typeof subject !== 'string') {
      return { valid: false, error: 'Email subject is required' };
    }

    if (subject.length > 200) {
      return { valid: false, error: 'Email subject is too long (max 200 characters)' };
    }

    // Check for spam-like patterns
    const spamPatterns = [
      /free\s*!/i,
      /click\s*here/i,
      /urgent/i,
      /winner/i,
      /congratulations/i,
      /\$+/,
      /!!!+/,
      /ALL CAPS WORDS{5,}/
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(subject)) {
        return { valid: false, error: 'Subject contains spam-like content' };
      }
    }

    return { valid: true };
  }
}

// Export singleton instance
export const emailSecurity = new EmailSecurity();