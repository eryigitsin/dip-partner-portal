import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import { t } from "@/lib/i18n";
import { z } from "zod";
import { Loader2, Mail, Lock, User, Phone, Building, MessageSquare } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import dipLogo from '@assets/dip ince_1753540745210.png';
import workshopBg from '@assets/dip-workshop_1753540666527.png';

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

const registerSchema = z.object({
  firstName: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  lastName: z.string().min(2, "Soyad en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

const otpSchema = z.object({
  code: z.string().length(6, "Doğrulama kodu 6 haneli olmalıdır"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [kvkkDialogOpen, setKvkkDialogOpen] = useState(false);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [registrationPhone, setRegistrationPhone] = useState("");
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      code: "",
    },
  });

  // Redirect if user is already logged in (after hook calls)
  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  // Timer for resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onRegister = async (data: RegisterFormData) => {
    setIsSubmittingRegistration(true);
    try {
      const response = await apiRequest("POST", "/api/auth/register/start", data);
      const result = await response.json();
      
      if (result.success) {
        setRegistrationPhone(result.phone);
        setShowOtpStep(true);
        setResendTimer(60); // 60 seconds cooldown
        toast({
          title: "Doğrulama kodu gönderildi",
          description: `${result.phone} numarasına SMS ile doğrulama kodu gönderildi.`,
        });
      } else {
        toast({
          title: "Hata",
          description: result.message || "Kayıt işlemi başlatılamadı",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Bir hata oluştu",
        variant: "destructive",
      });
    }
    setIsSubmittingRegistration(false);
  };

  const onVerifyOtp = async (data: OtpFormData) => {
    setIsVerifyingOtp(true);
    try {
      const response = await apiRequest("POST", "/api/auth/register/verify", {
        phone: registrationPhone,
        code: data.code,
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Başarılı",
          description: "Hesabınız başarıyla oluşturuldu ve giriş yapıldı!",
        });
        // Auth hook will automatically update
        setLocation("/");
      } else {
        toast({
          title: "Hata",
          description: result.message || "Doğrulama başarısız",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Doğrulama sırasında hata oluştu",
        variant: "destructive",
      });
    }
    setIsVerifyingOtp(false);
  };

  const onResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setIsResendingOtp(true);
    try {
      const response = await apiRequest("POST", "/api/auth/resend-otp", {
        phone: registrationPhone,
        purpose: "registration",
      });
      const result = await response.json();
      
      if (result.success) {
        setResendTimer(60);
        toast({
          title: "Kod gönderildi",
          description: "Yeni doğrulama kodu gönderildi.",
        });
      } else {
        toast({
          title: "Hata",
          description: result.message || "Kod gönderilemedi",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Bir hata oluştu",
        variant: "destructive",
      });
    }
    setIsResendingOtp(false);
  };

  const onBackToRegistration = () => {
    setShowOtpStep(false);
    setRegistrationPhone("");
    otpForm.reset();
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-dip-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 grid lg:grid-cols-2 min-h-0">
        {/* Left Column - Forms */}
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Logo */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <img 
                  src={dipLogo} 
                  alt="DİP - Dijital İhracat Platformu" 
                  className="h-16 w-auto"
                />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                {activeTab === "login" ? "Giriş Yapın" : "Hesap Oluşturun"}
              </h2>
              <p className="mt-2 text-gray-600">
                {activeTab === "login" 
                  ? "Hesabınıza giriş yaparak devam edin" 
                  : "DİP ailesine katılın ve dijital ihracat yolculuğunuza başlayın"
                }
              </p>
            </div>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Giriş Yap</TabsTrigger>
                    <TabsTrigger value="register">Kayıt Ol</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4">
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-posta</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input 
                                    type="email" 
                                    placeholder="ornek@email.com"
                                    className="pl-10"
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Şifre</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input 
                                    type="password" 
                                    placeholder="••••••••"
                                    className="pl-10"
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full bg-dip-blue hover:bg-dip-dark-blue"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Giriş yapılıyor...
                            </>
                          ) : (
                            "Giriş Yap"
                          )}
                        </Button>
                      </form>
                    </Form>

                    <div className="text-center">
                      <Button variant="link" className="text-sm text-gray-600">
                        Şifrenizi mi unuttunuz?
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4">
                    {!showOtpStep ? (
                      <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ad</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input 
                                      placeholder="Adınız"
                                      className="pl-10"
                                      {...field} 
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Soyad</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input 
                                      placeholder="Soyadınız"
                                      className="pl-10"
                                      {...field} 
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-posta</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input 
                                    type="email" 
                                    placeholder="ornek@email.com"
                                    className="pl-10"
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefon</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input 
                                    type="tel" 
                                    placeholder="5xxxxxxxxx"
                                    className="pl-10"
                                    maxLength={10}
                                    value={field.value ? field.value.replace(/\D/g, '') : ''}
                                    onChange={(e) => {
                                      const digits = e.target.value.replace(/\D/g, '');
                                      if (digits.length <= 10) {
                                        // Always start with 5
                                        if (digits.length === 0 || digits.startsWith('5')) {
                                          field.onChange(digits);
                                        } else if (digits.length === 1) {
                                          field.onChange('5');
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Şifre</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input 
                                    type="password" 
                                    placeholder="••••••••"
                                    className="pl-10"
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Şifre Tekrar</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input 
                                    type="password" 
                                    placeholder="••••••••"
                                    className="pl-10"
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full bg-dip-blue hover:bg-dip-dark-blue"
                          disabled={isSubmittingRegistration}
                        >
                          {isSubmittingRegistration ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              SMS gönderiliyor...
                            </>
                          ) : (
                            "SMS Doğrulaması Gönder"
                          )}
                        </Button>
                        </form>
                      </Form>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="mb-4">
                            <MessageSquare className="w-12 h-12 text-dip-blue mx-auto mb-2" />
                            <h3 className="text-lg font-semibold">SMS Doğrulama</h3>
                            <p className="text-sm text-gray-600 mt-2">
                              {registrationPhone} numarasına gönderilen 6 haneli doğrulama kodunu giriniz
                            </p>
                          </div>
                        </div>

                        <Form {...otpForm}>
                          <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
                            <FormField
                              control={otpForm.control}
                              name="code"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Doğrulama Kodu</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="text" 
                                      placeholder="123456"
                                      className="text-center text-lg tracking-widest"
                                      maxLength={6}
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button 
                              type="submit" 
                              className="w-full bg-dip-blue hover:bg-dip-dark-blue"
                              disabled={isVerifyingOtp}
                            >
                              {isVerifyingOtp ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Doğrulanıyor...
                                </>
                              ) : (
                                "Doğrula ve Hesap Oluştur"
                              )}
                            </Button>
                          </form>
                        </Form>

                        <div className="text-center space-y-2">
                          <Button 
                            variant="link" 
                            onClick={onResendOtp}
                            disabled={resendTimer > 0 || isResendingOtp}
                            className="text-sm"
                          >
                            {isResendingOtp ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gönderiliyor...
                              </>
                            ) : resendTimer > 0 ? (
                              `Yeniden gönder (${resendTimer}s)`
                            ) : (
                              "Kodu yeniden gönder"
                            )}
                          </Button>
                          
                          <div>
                            <Button variant="ghost" onClick={onBackToRegistration} className="text-sm">
                              Geri dön
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {!showOtpStep && (
                      <div className="text-center text-sm text-gray-600">
                        Kayıt olarak{" "}
                        <Dialog open={kvkkDialogOpen} onOpenChange={setKvkkDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="link" className="p-0 h-auto text-dip-blue">
                              Kullanım Şartlarını
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>KVKK Kullanım Şartları</DialogTitle>
                              <DialogDescription className="text-left">
                                6698 Sayılı KVKK uyarınca, bilgilerimin ticari bilgi kapsamında Dijital İhracat Platformu ve paydaşları ile paylaşılmasına razı olduğumu kabul ederim.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button onClick={() => setKvkkDialogOpen(false)}>
                                Anladım
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>{" "}
                        ve{" "}
                        <a 
                          href="https://dip.tc/gizlilik-ilkesi/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-dip-blue hover:underline"
                        >
                          Gizlilik Politikasını
                        </a>{" "}
                        kabul etmiş olursunuz.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Hero Section with Background */}
        <div 
          className="hidden lg:flex items-center justify-center relative overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(59, 130, 246, 0.85), rgba(16, 185, 129, 0.85)), url(${workshopBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="max-w-md text-center text-white z-10 p-8">
            <div className="mb-8">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                <Building className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 drop-shadow-lg">
                İş Ortakları Kataloğu
              </h3>
              <p className="text-blue-100 leading-relaxed drop-shadow-md">
                İş ortaklarımızla birlikte dijital ihracat yolculuğunuzda size en iyi hizmeti sunuyoruz. 
                Güvenilir partnerlerimizden faydalanın ve işinizi büyütün.
              </p>
            </div>

            <div className="space-y-4 text-sm backdrop-blur-sm bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>16 farklı hizmet kategorisi</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>Güvenilir iş ortakları</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>DİP üyelerine özel avantajlar</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>Türkçe ve İngilizce destek</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
