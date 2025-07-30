import { useState, useEffect } from 'react';
import { useLocation, useRouter } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/sections/hero-section';
import { CategoryCards } from '@/components/sections/category-cards';
import { PartnersCatalog } from '@/components/sections/partners-catalog';
import { PartnershipCta } from '@/components/sections/partnership-cta';
import { PartnerApplicationDialog } from '@/components/forms/partner-application-dialog';
import { QuoteRequestModal } from '@/components/modals/quote-request-modal';
import { Partner } from '@shared/schema';

export default function HomePage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPartnerApplicationOpen, setIsPartnerApplicationOpen] = useState(false);
  const [isQuoteRequestOpen, setIsQuoteRequestOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Check URL parameters on mount and when location changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
      setSelectedCategory(decodeURIComponent(categoryParam));
      // Scroll to partners section after a brief delay
      setTimeout(() => {
        const partnersSection = document.getElementById('partnerships-section');
        if (partnersSection) {
          partnersSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location]);

  const handleBecomePartner = () => {
    setIsPartnerApplicationOpen(true);
  };

  const handleGetService = () => {
    const partnersSection = document.getElementById('partnerships-section');
    if (partnersSection) {
      partnersSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    const partnersSection = document.getElementById('partnerships-section');
    if (partnersSection) {
      partnersSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleQuoteRequest = (partner: Partner) => {
    if (!user) {
      toast({
        title: 'Önce giriş yapın',
        description: 'Teklif talep etmek için üye olmanız gerekiyor. Üyeliğiniz yoksa kaydolun.',
        variant: 'destructive',
        duration: 5000,
      });
      setTimeout(() => {
        setLocation('/auth');
      }, 5000);
      return;
    }
    setSelectedPartner(partner);
    setIsQuoteRequestOpen(true);
  };

  const handleViewProfile = (partner: Partner) => {
    window.location.href = `/partner/${partner.username || partner.id}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main>
        <HeroSection 
          onBecomePartner={handleBecomePartner}
          onGetService={handleGetService}
        />
        
        <CategoryCards onCategorySelect={handleCategorySelect} />
        
        <PartnersCatalog 
          onQuoteRequest={handleQuoteRequest}
          onViewProfile={handleViewProfile}
          selectedCategory={selectedCategory}
        />
        
        <PartnershipCta onBecomePartner={handleBecomePartner} />
      </main>
      
      <Footer />

      <PartnerApplicationDialog 
        open={isPartnerApplicationOpen}
        onOpenChange={setIsPartnerApplicationOpen}
      />

      <QuoteRequestModal 
        isOpen={isQuoteRequestOpen}
        onClose={() => setIsQuoteRequestOpen(false)}
        partner={selectedPartner}
      />
    </div>
  );
}
