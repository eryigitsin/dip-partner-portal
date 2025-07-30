import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { t } from '@/lib/i18n';
import { ChevronDown, Handshake, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface HeroSectionProps {
  onBecomePartner: () => void;
  onGetService: () => void;
}

export function HeroSection({ onBecomePartner, onGetService }: HeroSectionProps) {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  // Supabase Storage URL for hero video - CDN optimized
  const heroVideoUrl = 'https://fgjuscppjxzznslgtkgu.supabase.co/storage/v1/object/public/hero-assets/hero-background.mp4';
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedData = () => {
      setVideoLoaded(true);
      video.play().catch(() => {
        // Auto-play failed, which is expected in some browsers
        console.log('Auto-play prevented by browser');
      });
    };
    
    const handleError = () => {
      setVideoError(true);
      console.error('Video failed to load');
    };
    
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ pointerEvents: 'none' }}
      >
        <source src={heroVideoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Fallback Background Image */}
      {(!videoLoaded || videoError) && (
        <div 
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-dip-blue via-blue-600 to-blue-800"
          style={{ 
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="7" cy="7" r="2"/%3E%3Ccircle cx="53" cy="7" r="2"/%3E%3Ccircle cx="7" cy="53" r="2"/%3E%3Ccircle cx="53" cy="53" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
      )}
      
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
