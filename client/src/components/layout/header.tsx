import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/hooks/use-auth';
import { t } from '@/lib/i18n';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: t('home', language), href: '/' },
    { name: t('about', language), href: '/about' },
    { name: t('activities', language), href: '/activities' },
    { name: t('partnerships', language), href: '/partnerships' },
    { name: t('contact', language), href: '/contact' },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-dip-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">D</span>
                </div>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">DİP</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-dip-blue font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Language Switcher & Auth Buttons */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <div className="hidden sm:flex items-center space-x-2">
              <Button
                variant={language === 'tr' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('tr')}
                className="text-sm"
              >
                TR
              </Button>
              <Button
                variant={language === 'en' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('en')}
                className="text-sm"
              >
                EN
              </Button>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {user.firstName} {user.lastName}
                  </span>
                  {user.userType === 'partner' && (
                    <Link href="/partner-dashboard">
                      <Button variant="outline" size="sm">
                        Partner Paneli
                      </Button>
                    </Link>
                  )}
                  {['master_admin', 'editor_admin'].includes(user.userType) && (
                    <Link href="/admin-dashboard">
                      <Button variant="outline" size="sm">
                        Admin Paneli
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    Çıkış
                  </Button>
                </div>
              ) : (
                <>
                  <Link href="/auth">
                    <Button variant="ghost" size="sm">
                      {t('login', language)}
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button size="sm" className="bg-dip-blue hover:bg-dip-dark-blue">
                      {t('register', language)}
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-3 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block text-gray-700 hover:text-dip-blue font-medium py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex space-x-2 mb-3">
                <Button
                  variant={language === 'tr' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLanguage('tr')}
                  className="text-sm"
                >
                  TR
                </Button>
                <Button
                  variant={language === 'en' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLanguage('en')}
                  className="text-sm"
                >
                  EN
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
