import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/sections/hero-section';
import { CategoryCards } from '@/components/sections/category-cards';
import { PartnersCatalog } from '@/components/sections/partners-catalog';
import { PartnershipCta } from '@/components/sections/partnership-cta';
import { PartnerApplicationModal } from '@/components/modals/partner-application-modal';
import { QuoteRequestModal } from '@/components/modals/quote-request-modal';
import { Partner } from '@shared/schema';

export default function HomePage() {
  const [isPartnerApplicationOpen, setIsPartnerApplicationOpen] = useState(false);
  const [isQuoteRequestOpen, setIsQuoteRequestOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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
    setSelectedPartner(partner);
    setIsQuoteRequestOpen(true);
  };

  const handleViewProfile = (partner: Partner) => {
    // TODO: Navigate to partner profile page
    console.log('View profile for partner:', partner.id);
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

      <PartnerApplicationModal 
        isOpen={isPartnerApplicationOpen}
        onClose={() => setIsPartnerApplicationOpen(false)}
      />

      <QuoteRequestModal 
        isOpen={isQuoteRequestOpen}
        onClose={() => setIsQuoteRequestOpen(false)}
        partner={selectedPartner}
      />
    </div>
  );
}
