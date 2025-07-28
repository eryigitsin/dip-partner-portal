import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/language-context';
import { t } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function CustomOAuth() {
  const { language } = useLanguage();
  const [location, setLocation] = useLocation();
  const { localUser, isLoading } = useSupabaseAuth();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);

  useEffect(() => {
    if (localUser && !isLoading) {
      setLocation('/');
    }
  }, [localUser, isLoading, setLocation]);

  // Handle JWT authentication from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jwt = params.get('jwt');
    const error = params.get('error');

    if (error) {
      let errorMessage = 'Giriş başarısız';
      switch (error) {
        case 'oauth_canceled':
          errorMessage = 'OAuth girişi iptal edildi';
          break;
        case 'oauth_failed':
          errorMessage = 'OAuth girişi başarısız';
          break;
        case 'login_failed':
          errorMessage = 'Oturum açma başarısız';
          break;
        case 'user_not_found':
          errorMessage = 'Kullanıcı bulunamadı';
          break;
      }
      
      toast({
        title: 'Giriş Hatası',
        description: errorMessage,
        variant: 'destructive'
      });
      
      // Clean URL
      window.history.replaceState({}, '', '/auth');
    }

    if (jwt) {
      // Authenticate with Supabase using JWT
      supabase.auth.setSession({
        access_token: jwt,
        refresh_token: '', // Will be handled by our backend
      } as any).then((result) => {
        if (result.error) {
          console.error('Supabase JWT auth error:', result.error);
          toast({
            title: 'Giriş Hatası',
            description: 'Oturum açma başarısız',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Başarılı',
            description: 'Giriş yapıldı',
          });
          setLocation('/');
        }
        
        // Clean URL
        window.history.replaceState({}, '', '/auth');
      });
    }
  }, [toast, setLocation]);

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    window.location.href = '/auth/google';
  };

  const handleLinkedInLogin = () => {
    setIsLinkedInLoading(true);
    window.location.href = '/auth/linkedin';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>DİP Platformu</CardTitle>
        <CardDescription>
          Giriş yapın veya yeni hesap oluşturun
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isLinkedInLoading}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 h-12"
        >
          {isGoogleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <span>Google ile Giriş Yap</span>
        </Button>

        <Button
          onClick={handleLinkedInLogin}
          disabled={isGoogleLoading || isLinkedInLoading}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 h-12"
        >
          {isLinkedInLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0077B5">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          )}
          <span>LinkedIn ile Giriş Yap</span>
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              veya
            </span>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>E-posta ile giriş yapmak için</p>
          <Button 
            variant="link" 
            className="p-0 h-auto text-blue-600"
            onClick={() => setLocation('/auth')}
          >
            buraya tıklayın
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}