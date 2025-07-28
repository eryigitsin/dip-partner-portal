import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SupabaseAuth } from "@/components/auth/supabase-auth";
import dipLogo from '@assets/dip ince_1753540745210.png';
import workshopBg from '@assets/dip-workshop_1753540666527.png';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 grid lg:grid-cols-2 min-h-0">
        {/* Left Column - Auth Form */}
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
                DİP Platformu
              </h2>
              <p className="mt-2 text-gray-600">
                Giriş yapın veya yeni hesap oluşturun
              </p>
            </div>

            {/* Supabase Auth Component */}
            <SupabaseAuth />
          </div>
        </div>

        {/* Right Column - Background Image */}
        <div className="hidden lg:block relative">
          <img
            src={workshopBg}
            alt="DİP Workshop"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-dip-blue bg-opacity-80"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white p-8">
              <h3 className="text-3xl font-bold mb-4">
                Dijital İhracat Yolculuğunuz Başlıyor
              </h3>
              <p className="text-xl opacity-90">
                Güvenilir partnerlerle tanışın, ihracat süreçlerinizi dijitalleştirin
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}