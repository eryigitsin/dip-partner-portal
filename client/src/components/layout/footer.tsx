import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { t } from '@/lib/i18n';
import { MapPin, Mail, Phone } from 'lucide-react';

export function Footer() {
  const { language, setLanguage } = useLanguage();

  const quickLinks = [
    { name: t('home', language), href: '/' },
    { name: t('about', language), href: '/about' },
    { name: t('activities', language), href: '/activities' },
    { name: t('partnerships', language), href: '/partnerships' },
    { name: t('contact', language), href: '/contact' },
  ];

  const services = [
    { name: "İş Ortağı Başvurusu", href: "/partner-application" },
    { name: "Hizmet Talebi", href: "/service-request" },
    { name: "Partner Kataloğu", href: "/#partnerships-section" },
    { name: "Üyelik", href: "/membership" },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 bg-dip-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <span className="ml-3 text-xl font-bold">DİP</span>
            </div>
            <p className="text-gray-300 mb-4 leading-relaxed">
              {t('footerDescription', language)}
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-gray-300">
                <MapPin className="h-4 w-4 mr-2 text-dip-blue" />
                Ecza Sok. No:4-1 Şişli, İstanbul
              </div>
              <div className="flex items-center text-gray-300">
                <Mail className="h-4 w-4 mr-2 text-dip-blue" />
                info@dip.tc
              </div>
              <div className="flex items-center text-gray-300">
                <Phone className="h-4 w-4 mr-2 text-dip-blue" />
                08503071245
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('quickLinks', language)}</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href}>
                    <span className="text-gray-300 hover:text-dip-blue transition-colors cursor-pointer">
                      {link.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('services', language)}</h4>
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service.name}>
                  <Link href={service.href}>
                    <span className="text-gray-300 hover:text-dip-blue transition-colors cursor-pointer">
                      {service.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 DİP - Dijital İhracat Platformu. Tüm hakları saklıdır.
          </p>
          
          {/* Language Switcher */}
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <span className="text-gray-400 text-sm mr-2">{t('language', language)}:</span>
            <Button
              variant={language === 'tr' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('tr')}
              className="text-xs"
            >
              TR
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('en')}
              className="text-xs"
            >
              EN
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
