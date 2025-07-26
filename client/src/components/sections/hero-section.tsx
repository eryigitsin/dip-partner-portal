import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { t } from '@/lib/i18n';
import { ChevronDown, Handshake, Search } from 'lucide-react';
import heroVideo from '@assets/diptalks1-yan-2_1753542464192.mp4';

interface HeroSectionProps {
  onBecomePartner: () => void;
  onGetService: () => void;
}

export function HeroSection({ onBecomePartner, onGetService }: HeroSectionProps) {
  const { language } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ pointerEvents: 'none' }}
      >
        <source src={heroVideo} type="video/mp4" />
      </video>
      
      {/* Video Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-blue-700/60 z-10"></div>
      
      <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {t('heroTitle', language)}
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
            {t('heroSubtitle', language)}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={onBecomePartner}
              className="bg-dip-green text-white px-8 py-4 text-lg font-semibold hover:bg-green-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
              size="lg"
            >
              <Handshake className="mr-2 h-5 w-5" />
              {t('becomePartner', language)}
            </Button>
            <Button 
              onClick={onGetService}
              variant="secondary"
              className="bg-white text-dip-blue px-8 py-4 text-lg font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
              size="lg"
            >
              <Search className="mr-2 h-5 w-5" />
              {t('getService', language)}
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="animate-bounce">
          <ChevronDown className="text-white h-8 w-8" />
        </div>
      </div>
    </section>
  );
}
