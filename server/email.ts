import { resendService } from './resend-service';

export const emailTemplates = {
  // Password reset email that uses HTML-based page
  passwordReset: {
    subject: 'Şifre Sıfırlama - DİP Partner Portal',
    html: (resetLink: string) => `
      <h2>Şifre Sıfırlama Talebi</h2>
      <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px;">
        Şifre Sıfırla
      </a>
      <p>Bu bağlantı 1 saat boyunca geçerlidir.</p>
      <p>Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
    `
  },
  
  // Email confirmation template
  emailConfirmation: {
    subject: 'E-posta Adresinizi Doğrulayın - DİP Partner Portal',
    html: (confirmLink: string) => `
      <h2>E-posta Doğrulama</h2>
      <p>Aramıza hoş geldiniz! E-posta adresinizi doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
      <a href="${confirmLink}" style="display: inline-block; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px;">
        E-posta Adresini Doğrula
      </a>
      <p>Bu bağlantı 24 saat boyunca geçerlidir.</p>
    `
  }
};

export async function sendEmail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    await resendService.sendEmail({
      to,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}