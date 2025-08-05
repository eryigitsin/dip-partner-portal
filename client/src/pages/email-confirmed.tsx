import { useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Check } from "lucide-react";
import dipLogo from '@assets/dip ince_1753361664425.png';

export default function EmailConfirmedPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Sign out user after email confirmation to require re-login
    const signOutUser = async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Error signing out after email confirmation:', error);
      }
    };

    // Check if user accessed this page from email confirmation
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('confirmation'))) {
      signOutUser();
    } else {
      // Redirect to auth page if not from email confirmation
      setLocation('/auth');
    }
  }, [setLocation]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto mb-4">
                <img 
                  src={dipLogo} 
                  alt="DİP Logo" 
                  className="h-12 w-auto mx-auto mb-4"
                />
              </div>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                E-posta Onaylandı
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                E-posta adresiniz başarıyla onaylandı. Artık hesabınıza giriş yapabilirsiniz.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => setLocation('/auth')}
                  className="w-full"
                  data-testid="button-go-to-login"
                >
                  Giriş Yap
                </Button>
                <Button 
                  onClick={() => setLocation('/')}
                  variant="outline"
                  className="w-full"
                  data-testid="button-go-to-home"
                >
                  Ana Sayfaya Git
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
}