import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Wand2 } from "lucide-react";
import { FaGoogle, FaLinkedin } from "react-icons/fa";
import dipLogo from '@assets/dip ince_1753361664425.png';
import workshopBg from '@assets/dip-workshop-kck_1753705308627.png';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { localUser } = useSupabaseAuth();
  const { toast } = useToast();

  // Fetch categories to get dynamic count
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  }) as { data: any[] };

  // Show auth warning message when coming from quote request or partner application
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuote = params.get('from') === 'quote';
    const fromPartner = params.get('from') === 'partner';
    const expired = params.get('expired') === 'true';
    
    if (expired) {
      toast({
        title: 'Bağlantının süresi doldu',
        description: 'Bu bağlantının geçerlilik süresi doldu! Lütfen yeni bir talepte bulunun.',
        variant: 'destructive',
        duration: 5000,
      });
    }
    
    if (fromQuote) {
      toast({
        title: 'Önce giriş yapın',
        description: 'Teklif talep etmek için üye olmanız gerekiyor. Üyeliğiniz yoksa kaydolun.',
        variant: 'destructive',
        duration: 3000,
      });
    }
    
    if (fromPartner) {
      toast({
        title: 'Giriş Gerekli',
        description: 'İş ortağı başvurusu yapabilmek için giriş yapmış olmanız gerekmektedir. Lütfen giriş yapın; üyeliğiniz yoksa üye olup tekrar deneyin.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  }, [toast]);

  if (localUser) {
    // Check for redirect parameter
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get('redirect') || '/';
    window.location.href = redirectTo;
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        toast({
          title: "Giriş Başarısız",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Başarıyla giriş yapıldı!",
          description: "Hoş geldiniz.",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
          },
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        toast({
          title: "Kayıt Başarısız",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setRegistrationSuccess(true);
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'linkedin_oidc') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        toast({
          title: "Giriş Başarısız",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Sosyal medya girişi başarısız",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast({
        title: "E-posta gerekli",
        description: "Şifre sıfırlama için e-posta adresinizi girin",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/password-reset`
      });
      
      if (error) {
        toast({
          title: "Hata",
          description: error.message === 'User not found' ? 'Bu e-posta adresi bulunamadı' : error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Şifre sıfırlama e-postası gönderildi",
          description: "E-posta adresinizi kontrol edin ve linkle şifrenizi değiştirin",
          duration: 6000,
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Şifre sıfırlama e-postası gönderilemedi",
        variant: "destructive",
      });
    }
  };

  const handleMagicLink = async () => {
    if (!formData.email) {
      toast({
        title: "Hata",
        description: "Lütfen e-posta adresinizi girin",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      console.log('Sending magic link to:', formData.email, 'redirect URL:', redirectUrl, 'current origin:', window.location.origin);
      
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        toast({
          title: "Hata",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setMagicLinkSent(true);
        toast({
          title: "Sihirli bağlantı gönderildi",
          description: "E-posta kutunuzu kontrol edin ve gelen bağlantıya tıklayın",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Sihirli bağlantı gönderilemedi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 grid lg:grid-cols-2 min-h-0">
        {/* Left Column - Auth Form */}
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Logo and Title */}
            <div className="text-center">
              <img 
                src={dipLogo} 
                alt="DİP - Dijital İhracat Platformu" 
                className="mx-auto h-16 w-auto mb-4"
              />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Giriş Yapın
              </h2>
              <p className="text-gray-600">
                Hesabınıza giriş yaparak devam edin
              </p>
            </div>

            {/* Magic Link Section */}
            <div className="w-full space-y-3 mb-6">
              <Button 
                type="button" 
                className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300" 
                onClick={handleMagicLink}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Şifresiz Giriş
                  </>
                )}
              </Button>
              
              <p className="text-xs text-gray-500 text-center leading-tight">
                Alttaki forma e-posta adresinizi yazıp tıklayın, e-postanıza gelecek sihirli bir bağlantı ile tek tıkla giriş yapın.
              </p>
              
              {magicLinkSent && (
                <div className="text-sm text-green-600 text-center p-3 bg-green-50 rounded-md">
                  ✓ Sihirli bağlantı gönderildi! E-posta kutunuzu kontrol edin.
                </div>
              )}
            </div>

            {/* Auth Form */}
            <Card className="w-full">
              <CardContent className="pt-6">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Giriş Yap</TabsTrigger>
                    <TabsTrigger value="signup">Kayıt Ol</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="signin" className="space-y-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">E-posta</Label>
                        <Input
                          id="signin-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Şifre</Label>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Giriş Yap
                      </Button>
                      
                      <Button
                        type="button"
                        variant="link"
                        onClick={handleForgotPassword}
                        className="w-full text-sm"
                        disabled={isLoading}
                      >
                        Şifrenizi mi unuttunuz?
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4">
                    {registrationSuccess ? (
                      <div className="text-center space-y-4 py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Son bir adım kaldı!</h3>
                        <p className="text-gray-600 max-w-sm mx-auto">
                          Gelen kutunuzda e-posta adresinizi onaylamayı unutmayın!
                        </p>
                        <p className="text-sm text-gray-500">
                          E-posta gelmedi mi? Spam klasörünüzü kontrol edin.
                        </p>
                        <Button 
                          onClick={() => window.location.href = '/'}
                          className="w-full mt-4"
                        >
                          Ana Sayfaya Dön
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Ad</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            required
                            value={formData.firstName}
                            onChange={handleInputChange}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Soyad</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            required
                            value={formData.lastName}
                            onChange={handleInputChange}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">E-posta</Label>
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Şifre</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
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
                        <Label htmlFor="phone">Cep Telefonu</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+90 5XX XXX XX XX"
                          value={formData.phone}
                          onChange={handleInputChange}
                          disabled={isLoading}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Kayıt Ol
                      </Button>
                    </form>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Social Auth Buttons */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">
                        Veya
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleSocialAuth('google')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <FaGoogle className="h-4 w-4 mr-2" />
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSocialAuth('linkedin_oidc')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <FaLinkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Features Section with Background */}
        <div className="hidden lg:block relative bg-gradient-to-br from-blue-500 to-teal-400">
          <img
            src={workshopBg}
            alt="DİP Workshop"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/80 to-teal-400/80"></div>
          <div className="relative flex items-center justify-center h-full p-12">
            <div className="text-center text-white">
              <div className="mb-8">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4">
                İş Ortakları Kataloğu
              </h3>
              <p className="text-lg opacity-90 mb-8 leading-relaxed">
                İş ortaklarımızla birlikte dijital ihracat yolculuğunuzda size en iyi hizmeti sunuyoruz. 
                Güvenilir partnerlerimizden faydalanın ve işinizi büyütün.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                  <span>{categories.length || 16} farklı hizmet kategorisi</span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                  <span>Güvenilir iş ortakları</span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                  <span>DİP üyelerine özel avantajlar</span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                  <span>Türkçe ve İngilizce destek</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}