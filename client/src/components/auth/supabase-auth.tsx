import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function SupabaseAuth() {
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setLocation('/');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        toast({
          title: "Başarıyla giriş yapıldı!",
          description: "Hoş geldiniz.",
        });
        setLocation('/');
      } else if (event === 'SIGNED_UP' && session) {
        toast({
          title: "Kayıt başarılı!",
          description: "E-posta adresinizi doğrulayın.",
        });
      } else if (event === 'PASSWORD_RECOVERY') {
        toast({
          title: "Şifre sıfırlama",
          description: "E-posta adresinizi kontrol edin.",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>DİP Platformu</CardTitle>
        <CardDescription>
          Giriş yapın veya yeni hesap oluşturun
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#1c1545',
                  brandAccent: '#2563eb',
                  brandButtonText: 'white',
                  defaultButtonBackground: '#f8fafc',
                  defaultButtonBackgroundHover: '#f1f5f9',
                  inputBackground: 'white',
                  inputBorder: '#d1d5db',
                  inputBorderHover: '#9ca3af',
                  inputBorderFocus: '#1c1545',
                }
              }
            },
            className: {
              anchor: 'text-blue-600 hover:text-blue-800',
              button: 'px-4 py-2 rounded-md font-medium transition-colors',
              container: 'space-y-4',
              divider: 'my-4',
              input: 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
              label: 'block text-sm font-medium text-gray-700 mb-1',
              loader: 'animate-spin',
              message: 'text-sm text-red-600',
            }
          }}
          localization={{
            variables: {
              sign_up: {
                email_label: 'E-posta',
                password_label: 'Şifre',
                email_input_placeholder: 'E-posta adresiniz',
                password_input_placeholder: 'Şifreniz',
                button_label: 'Kayıt Ol',
                loading_button_label: 'Kayıt oluşturuluyor...',
                social_provider_text: '{{provider}} ile devam et',
                link_text: 'Hesabınız yok mu? Kayıt olun',
                confirmation_text: 'E-posta adresinizi kontrol edin ve doğrulama linkine tıklayın'
              },
              sign_in: {
                email_label: 'E-posta',
                password_label: 'Şifre',
                email_input_placeholder: 'E-posta adresiniz',
                password_input_placeholder: 'Şifreniz',
                button_label: 'Giriş Yap',
                loading_button_label: 'Giriş yapılıyor...',
                social_provider_text: '{{provider}} ile giriş yap',
                link_text: 'Zaten hesabınız var mı? Giriş yapın'
              },
              magic_link: {
                email_input_label: 'E-posta adresi',
                email_input_placeholder: 'E-posta adresiniz',
                button_label: 'Sihirli Link Gönder',
                loading_button_label: 'Gönderiliyor...',
                link_text: 'Şifresiz giriş için sihirli link gönder',
                confirmation_text: 'E-posta adresinizi kontrol edin'
              },
              forgotten_password: {
                email_label: 'E-posta',
                password_label: 'Şifre',
                email_input_placeholder: 'E-posta adresiniz',
                button_label: 'Şifre Sıfırlama Linki Gönder',
                loading_button_label: 'Gönderiliyor...',
                link_text: 'Şifrenizi mi unuttunuz?',
                confirmation_text: 'E-posta adresinizi kontrol edin'
              }
            }
          }}
          providers={['google']}
          redirectTo={`${window.location.origin}/auth`}
          onlyThirdPartyProviders={false}
          showLinks={true}
        />
      </CardContent>
    </Card>
  );
}