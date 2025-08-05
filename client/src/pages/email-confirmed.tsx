import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function EmailConfirmedPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Auto-redirect to home page after 3 seconds
    const timer = setTimeout(() => {
      setLocation('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [setLocation]);

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
                Hesabınız Doğrulandı!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                E-posta adresiniz başarıyla doğrulandı. Aramıza hoş geldiniz!
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                3 saniye içinde ana sayfaya yönlendirileceksiniz...
              </p>
              <Button 
                onClick={() => setLocation('/')}
                className="w-full"
                data-testid="button-go-home"
              >
                Ana Sayfaya Git
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
}