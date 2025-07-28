# DİP Supabase Email Templates

Bu klasörde DİP platformu için tasarlanmış Supabase e-posta şablonları bulunmaktadır.

## Kullanım

Bu HTML şablonlarını Supabase Dashboard > Authentication > Email Templates bölümüne kopyalayıp yapıştırabilirsiniz.

## Şablonlar

### 1. supabase-confirmation.html
**Kullanım Yeri:** Confirm signup (sign-up confirmation)
**Açıklama:** Yeni kullanıcı kayıt onayı için kullanılır.

### 2. supabase-recovery.html  
**Kullanım Yeri:** Reset password (password recovery)
**Açıklama:** Şifre sıfırlama talepleri için kullanılır.

### 3. supabase-magic-link.html
**Kullanım Yeri:** Magic Link
**Açıklama:** Şifresiz giriş (magic link) için kullanılır.

### 4. supabase-invite.html
**Kullanım Yeri:** Invite user 
**Açıklama:** Yeni kullanıcı davetiyesi için kullanılır.

### 5. supabase-email-change.html
**Kullanım Yeri:** Change email address
**Açıklama:** E-posta adresi değişikliği onayı için kullanılır.

### 6. supabase-reauthentication.html
**Kullanım Yeri:** Reauthentication
**Açıklama:** Hassas işlemler için hesap yeniden doğrulama talebi için kullanılır.

## Supabase Parametreleri

Şablonlarda kullanılabilir parametreler:

- `{{ .ConfirmationURL }}` - Onay/eylem linki
- `{{ .Token }}` - Güvenlik token'ı  
- `{{ .TokenHash }}` - Token hash değeri
- `{{ .SiteURL }}` - Site ana URL'i
- `{{ .Email }}` - Kullanıcının mevcut e-posta adresi
- `{{ .NewEmail }}` - Yeni e-posta adresi (email change için)
- `{{ .Data }}` - Ek veri objesi
- `{{ .RedirectTo }}` - Yönlendirme URL'i

## Tasarım Özellikleri

- **Responsive Design:** Mobil ve desktop cihazlarda optimal görünüm
- **Bilingual Content:** Türkçe ve İngilizce içerik yan yana
- **Brand Consistent:** DİP marka renkleri ve tipografisi
- **User-Friendly:** Anlaşılır dil ve net call-to-action butonları
- **Security Focused:** Güvenlik uyarıları ve bilgilendirmeler

## Renk Paleti

- **Primary Blue:** #3b82f6
- **Primary Teal:** #14b8a6  
- **Gradient:** linear-gradient(135deg, #3b82f6 0%, #14b8a6 100%)
- **Text Dark:** #1e293b
- **Text Medium:** #64748b
- **Background:** #f8fafc

## Kurulum

1. Supabase Dashboard'a giriş yapın
2. Projenizi seçin
3. Authentication > Email Templates'e gidin
4. İlgili şablonu seçin
5. HTML içeriğini kopyalayıp yapıştırın
6. Subject kısmını da uygun şekilde güncelleyin

## Subject Önerileri

- **Confirmation:** `DİP Hesap Doğrulama - Account Verification`
- **Recovery:** `DİP Şifre Sıfırlama - Password Reset`  
- **Magic Link:** `DİP Güvenli Giriş - Secure Login`
- **Invite:** `DİP Platform Davetiniz - Your Platform Invitation`
- **Email Change:** `DİP E-posta Değişikliği - Email Change Confirmation`
- **Reauthentication:** `DİP Kimlik Onayı - Identity Confirmation Required`