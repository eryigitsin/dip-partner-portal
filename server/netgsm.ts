import crypto from 'crypto';

interface NetGsmConfig {
  username: string;
  password: string;
  msgheader: string;
}

interface SendOtpResponse {
  success: boolean;
  jobId?: string;
  message: string;
  code?: string;
}

export class NetGsmService {
  private config: NetGsmConfig;
  private baseUrl = 'https://api.netgsm.com.tr';

  constructor(config: NetGsmConfig) {
    this.config = config;
  }

  // Generate 6-digit OTP code
  generateOtpCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Send OTP SMS using NetGSM API
  async sendOtpSms(phone: string, code: string): Promise<SendOtpResponse> {
    try {
      // Format phone number - remove country code for NetGSM API
      let formattedPhone = phone.replace(/[\s+]/g, '');
      
      // Remove Turkish country code (90) if present
      if (formattedPhone.startsWith('90') && formattedPhone.length === 12) {
        formattedPhone = formattedPhone.substring(2); // Remove 90
      }
      // Remove leading 0 if present
      if (formattedPhone.startsWith('0') && formattedPhone.length === 11) {
        formattedPhone = formattedPhone.substring(1); // Remove leading 0
      }
      
      // OTP message template
      const message = `DIP doğrulama kodunuz: ${code}`;

      // Prepare request data for NetGSM SMS API (resmi dokümantasyona göre)
      const requestData = new URLSearchParams({
        usercode: this.config.username,
        password: this.config.password,
        no: formattedPhone, // Resmi dokümantasyonda 'no' kullanılıyor
        msg: message, // Resmi dokümantasyonda 'msg' kullanılıyor
        msgheader: this.config.msgheader, // Resmi dokümantasyonda 'msgheader' kullanılıyor
        encoding: 'TR', // 'dil' değil 'encoding' kullanılıyor
        iysfilter: '0', // İYS filtresi - resmi parametre adı 'iysfilter'
      });

      console.log('Sending OTP SMS to:', formattedPhone);
      console.log('Message:', message);
      console.log('Request params:', Object.fromEntries(requestData));

      // Try the official SMS send endpoint first, then fallback to bulk endpoint
      let response = await fetch(`${this.baseUrl}/sms/send/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/plain',
        },
        body: requestData.toString(),
      });

      // If first endpoint fails, try the bulk endpoint
      if (!response.ok) {
        console.log('First endpoint failed, trying bulk endpoint...');
        response = await fetch(`${this.baseUrl}/bulkhttppost.asp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/plain',
          },
          body: requestData.toString(),
        });
      }

      const responseText = await response.text();
      console.log('NetGSM Response:', responseText);

      // Parse NetGSM response
      if (response.ok) {
        // NetGSM returns different responses:
        // Success: Job ID (e.g., "17377215342605050417149344")
        // Or: "00" for successful bulk SMS
        if (responseText && (responseText.trim() === '00' || (responseText.length > 5 && !responseText.includes('ERROR') && !responseText.includes('<')))) {
          return {
            success: true,
            jobId: responseText.trim(),
            message: 'OTP SMS sent successfully',
            code: code,
          };
        }
      }

      // Handle error responses
      return {
        success: false,
        message: this.parseErrorMessage(responseText),
      };

    } catch (error) {
      console.error('NetGSM API Error:', error);
      return {
        success: false,
        message: 'SMS gönderim hatası',
      };
    }
  }

  // Parse NetGSM error messages
  private parseErrorMessage(response: string): string {
    const errorMessages: { [key: string]: string } = {
      '20': 'Mesaj içeriği hatalı veya çok uzun',
      '30': 'Geçersiz kullanıcı adı veya şifre',
      '40': 'Mesaj başlığı sistemde tanımlı değil',
      '50': 'İYS kontrollü gönderim yapılamıyor',
      '51': 'İYS Marka bilgisi bulunamadı',
      '70': 'Hatalı XML formatı / Mesaj başlığı yetkisi yok (Başlığın panelde tanımlı ve aktif olduğundan emin olun)',
      '73': 'Input parametrelerini kontrol ediniz',
      '80': 'Gönderim sınır aşımı',
      '85': 'Mükerrer gönderim sınır aşımı',
    };

    // Check if response contains known error codes
    for (const [code, message] of Object.entries(errorMessages)) {
      if (response.includes(code)) {
        return message;
      }
    }

    return response || 'Bilinmeyen hata';
  }

  // Verify OTP code format
  isValidOtpCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

  // Format Turkish phone number for database storage (with country code)
  formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle Turkish phone numbers - always store with country code for database
    if (cleaned.startsWith('90') && cleaned.length === 12) {
      return cleaned; // Already formatted with country code
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '90' + cleaned.substring(1); // Add country code, remove leading 0
    } else if (cleaned.length === 10) {
      return '90' + cleaned; // Add country code
    }
    
    return cleaned; // Return as is for international numbers
  }
}

// Factory function to create NetGSM service
export function createNetGsmService(): NetGsmService | null {
  const username = process.env.NETGSM_USERCODE || process.env.NETGSM_USERNAME;
  const password = process.env.NETGSM_PASSWORD;
  // Force the correct msgheader value as requested by user
  const msgheader = 'ISTETKNLIK';

  console.log('NetGSM Factory - Environment check:', {
    username: username ? `Set (${username})` : 'Missing',
    password: password ? 'Set' : 'Missing',
    msgheader: msgheader ? `Set (${msgheader})` : 'Missing',
  });

  if (!username || !password || !msgheader) {
    console.warn('NetGSM credentials not fully configured');
    return null;
  }

  return new NetGsmService({
    username,
    password,
    msgheader,
  });
}