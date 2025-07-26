import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/hooks/use-auth';
import { t } from '@/lib/i18n';
import { Menu, X, User, Settings, MessageCircle, FileText, LogOut, ChevronDown } from 'lucide-react';
import dipLightLogo from '@assets/dip-beyaz-yan_1753361664424.png';
import dipDarkLogo from '@assets/dip ince_1753361664425.png';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: t('about', language), href: 'https://dip.tc/hakkimizda/', external: true },
    { name: t('activities', language), href: 'https://dip.tc/faaliyetler/', external: true },
    { name: 'Haberler', href: 'https://dip.tc/haber-ve-makaleler/', external: true },
    { name: t('contact', language), href: 'https://dip.tc/iletisim/', external: true },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      {/* Top contact bar */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-10 text-sm">
            <div className="flex items-center space-x-4 text-gray-600">
              <span>Ecza Sok. No:4-1 Şişli, İstanbul</span>
              <span>info@dip.tc</span>
              <span>08503071245</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={language === 'tr' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('tr')}
                className="text-xs h-6 px-2"
              >
                TR
              </Button>
              <span className="text-gray-400">|</span>
              <Button
                variant={language === 'en' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('en')}
                className="text-xs h-6 px-2"
              >
                EN
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img 
              src={dipDarkLogo} 
              alt="DİP - Dijital İhracat Platformu" 
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-8">
            {navigation.map((item) => (
              item.external ? (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-dip-blue font-medium transition-colors"
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-dip-blue font-medium transition-colors"
                >
                  {item.name}
                </Link>
              )
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-3">
            <Button
              asChild
              variant="default"
              className="hidden sm:inline-flex hover:bg-red-900 text-white bg-[#1c1545]"
            >
              <a href="https://dip.tc" target="_blank" rel="noopener noreferrer">
                DİP'e DÖN
              </a>
            </Button>

            {user ? (
              <div className="flex items-center space-x-3">
                {/* Dropdown menu for regular users */}
                {user.userType === 'user' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                      >
                        <span>{user.firstName} {user.lastName}</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/user-panel" className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <span>Kişisel Panelim</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/service-requests" className="flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          <span>Hizmet Taleplerim</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/messages" className="flex items-center">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          <span>Sohbet</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => logoutMutation.mutate()}
                        disabled={logoutMutation.isPending}
                        className="text-red-600 focus:text-red-600"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Çıkış Yap</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Partner users */}
                {user.userType === 'partner' && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {user.firstName} {user.lastName}
                    </span>
                    <Link href="/partner-dashboard">
                      <Button variant="outline" size="sm">
                        Partner Paneli
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                    >
                      Çıkış
                    </Button>
                  </div>
                )}

                {/* Admin users */}
                {['master_admin', 'editor_admin'].includes(user.userType) && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {user.firstName} {user.lastName}
                    </span>
                    <Link href="/admin-dashboard">
                      <Button variant="outline" size="sm">
                        Admin Paneli
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                    >
                      Çıkış
                    </Button>
                  </div>
                )}
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

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
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
        <div className="lg:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-3 space-y-2">
            {navigation.map((item) => (
              item.external ? (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-700 hover:text-dip-blue font-medium py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block text-gray-700 hover:text-dip-blue font-medium py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              )
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
