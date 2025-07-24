import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { t } from '@/lib/i18n';
import { Handshake, Mail } from 'lucide-react';

interface PartnershipCtaProps {
  onBecomePartner: () => void;
}

export function PartnershipCta({ onBecomePartner }: PartnershipCtaProps) {
  const { language } = useLanguage();

  const handleContactUs = () => {
    window.open('https://dip.tc/iletisim', '_blank');
  };

  return (
    <section className="py-16 bg-dip-blue">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {t('partnershipCtaTitle', language)}
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            {t('partnershipCtaSubtitle', language)}
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
              onClick={handleContactUs}
              variant="secondary"
              className="bg-white text-dip-blue px-8 py-4 text-lg font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
              size="lg"
            >
              <Mail className="mr-2 h-5 w-5" />
              {t('contactUs', language)}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
