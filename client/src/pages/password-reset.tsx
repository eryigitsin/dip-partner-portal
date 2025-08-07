import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";
import dipLogo from '@assets/dip ince_1753361664425.png';

export default function PasswordResetPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handlePasswordResetFromURL = async () => {
      const hash = window.location.hash;
      
      // Check for expired token error
      if (hash.includes('error_description=Email+link+is+invalid+or+has+expired') || 
          hash.includes('error=invalid_request')) {
        setLocation('/auth?expired=true');
        return;
      }
      
      // Try to get session from URL - this is crucial for password reset to work
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        setLocation('/auth');
        return;
      }

      if (!session) {
        // If no session and no hash with access token, redirect to auth
        if (!hash || !hash.includes('access_token')) {
          setLocation('/auth');
          return;
        }
      }
    };

    handlePasswordResetFromURL();
  }, [setLocation]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Şifreler eşleşmiyor',
        description: 'Lütfen şifrelerinizi kontrol edin.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Şifre çok kısa',
        description: 'Şifreniz en az 6 karakter olmalıdır.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if we have a valid session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Geçerli bir oturum bulunamadı. Lütfen şifre sıfırlama linkini tekrar kullanın.');
      }

      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Password updated successfully:', data);

      // Show success message
      toast({
        title: 'Şifre başarıyla değiştirildi!',
        description: 'Yeni şifrenizle giriş yapabilirsiniz.',
        variant: 'default',
      });

      setIsSuccess(true);
      
      // Sign out the user after password change to force re-login
      await supabase.auth.signOut();
      
      // Redirect to auth page after success
      setTimeout(() => {
        setLocation('/auth');
      }, 3000);

    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Şifre değiştirme hatası',
        description: error.message || 'Şifreniz değiştirilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Şifreniz Değiştirildi
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Şifreniz başarıyla değiştirildi. Giriş sayfasına yönlendiriliyorsunuz...
                </p>
                <Button 
                  onClick={() => setLocation('/auth')}
                  className="w-full"
                >
                  Giriş Sayfasına Git
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img 
                src={dipLogo} 
                alt="DİP Logo" 
                className="h-12 w-auto mx-auto"
              />
            </div>
            <CardTitle className="text-2xl">Şifre Değiştir</CardTitle>
            <CardDescription>
              Lütfen yeni şifrenizi belirleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Yeni Şifre</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    required
                    minLength={6}
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifrenizi tekrar girin"
                    required
                    minLength={6}
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-reset-password"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Değiştiriliyor...
                  </>
                ) : (
                  'Şifreyi Değiştir'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
}