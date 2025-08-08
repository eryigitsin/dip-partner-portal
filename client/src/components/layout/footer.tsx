import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { t } from '@/lib/i18n';
import { MapPin, Mail, Phone } from 'lucide-react';
import { FaLinkedin, FaInstagram, FaYoutube, FaTwitter } from 'react-icons/fa';
import dipLogo from '@assets/dip-partner-logo_1754613891917.png';

export function Footer() {
  const { language, setLanguage } = useLanguage();

  const dipAboutLinks = [
    { name: "DİP Ana Sayfa", href: "https://dip.tc", external: true },
    { name: "DEX Platform", href: "https://dex.tc", external: true },
    { name: "dipTALKS", href: "https://diptalks.dip.tc", external: true },
    { name: "İletişim", href: "https://dip.tc/iletisim", external: true },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <Link href="/" className="flex items-center mb-4">
              <img 
                src={dipLogo} 
                alt="DİP - Dijital İhracat Platformu" 
                className="h-8 sm:h-10 md:h-12 w-auto max-w-[120px] sm:max-w-[140px] md:max-w-[160px] object-contain"
              />
            </Link>
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

          {/* DİP Hakkında */}
          <div>
            <h4 className="text-lg font-semibold mb-4">DİP Hakkında</h4>
            <ul className="space-y-2">
              {dipAboutLinks.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a 
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-dip-blue transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link href={link.href}>
                      <span className="text-gray-300 hover:text-dip-blue transition-colors cursor-pointer">
                        {link.name}
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            
            {/* Social Media Icons */}
            <div className="flex items-center space-x-4 mt-4">
              <a 
                href="https://www.linkedin.com/company/dip-tc/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-dip-blue transition-colors"
              >
                <FaLinkedin className="h-5 w-5" />
              </a>
              <a 
                href="https://www.instagram.com/dip_tc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-dip-blue transition-colors"
              >
                <FaInstagram className="h-5 w-5" />
              </a>
              <a 
                href="https://www.youtube.com/@dip_tc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-dip-blue transition-colors"
              >
                <FaYoutube className="h-5 w-5" />
              </a>
              <a 
                href="https://x.com/dip_tc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-dip-blue transition-colors"
              >
                <FaTwitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Map */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Konum</h4>
            <div className="w-full h-48 rounded-lg overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3009.6084742924813!2d28.975912876042317!3d41.04748747134457!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cab9c5a7f2e2f7%3A0x7c4f8e2f8e2f8e2f!2sEcza%20Sk.%20No%3A4%2C%20%C5%9Ei%C5%9Fli%2F%C4%B0stanbul!5e0!3m2!1str!2str!4v1697899999999!5m2!1str!2str"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="DİP Ofis Konumu - Ecza Sok. No:4-1 Şişli, İstanbul"
              ></iframe>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm">
              <p className="mb-2">© 2025 DİP - Dijital İhracat Platformu. Tüm hakları saklıdır.</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <a 
                  href="https://dip.tc/kullanim-sartlari" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-dip-blue transition-colors underline"
                >
                  Kullanım Şartları
                </a>
                <a 
                  href="https://dip.tc/gizlilik-ilkesi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-dip-blue transition-colors underline"
                >
                  Gizlilik Politikası
                </a>
              </div>
            </div>
            
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
      </div>
    </footer>
  );
}

export default Footer;
