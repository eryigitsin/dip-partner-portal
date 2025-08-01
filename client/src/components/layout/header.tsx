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
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { AccountTypeSelector } from '@/components/account-type-selector';
import { t } from '@/lib/i18n';
import { Menu, X, User, Settings, MessageCircle, FileText, LogOut, ChevronDown, MapPin, Mail, Phone, Shield, Users, BarChart3, Activity, Database, ArrowLeftRight, Building2 } from 'lucide-react';
import dipLightLogo from '@assets/dip-beyaz-yan_1753361664424.png';
import dipDarkLogo from '@assets/dip ince_1753361664425.png';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accountSelectorOpen, setAccountSelectorOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { user, logoutMutation } = useAuth();
  const { signOut } = useSupabaseAuth();
  const [location] = useLocation();

  // Check if user has multiple account types available - include current type + available types
  const allUserTypes = user ? [user.userType, ...(user.availableUserTypes || [])] : [];
  const uniqueUserTypes = [...new Set(allUserTypes)];
  const hasMultipleAccountTypes = uniqueUserTypes.length > 1;
  
  // Always show account type switching for users with multiple types
  const showAccountTypeSwitching = hasMultipleAccountTypes;

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
          <div className="flex justify-between items-center h-10 text-xs sm:text-sm">
            <div className="flex items-center space-x-2 sm:space-x-4 text-gray-600 overflow-hidden">
              <div className="hidden md:flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>Ecza Sok. No:4-1 Şişli, İstanbul</span>
              </div>
              <div className="hidden sm:flex md:flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>info@dip.tc</span>
              </div>
              <a href="tel:+908503071245" className="flex items-center gap-1 whitespace-nowrap hover:text-blue-600 transition-colors">
                <Phone className="h-3 w-3" />
                <span>08503071245</span>
              </a>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
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
                {(user.activeUserType || user.userType) === 'user' && (
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
                      {hasMultipleAccountTypes && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setAccountSelectorOpen(true)}
                            className="flex items-center"
                          >
                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                            <span>Hesap Türü Değiştir</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => signOut()}
                        className="text-red-600 focus:text-red-600"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Çıkış Yap</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Partner users */}
                {(user.activeUserType || user.userType) === 'partner' && (
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
                        <Link href="/partner-dashboard" className="flex items-center">
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Partner Paneli</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/partner-profile" className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profil</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/partner-statistics" className="flex items-center">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          <span>İstatistikler</span>
                        </Link>
                      </DropdownMenuItem>
                      {showAccountTypeSwitching && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setAccountSelectorOpen(true)}
                            className="flex items-center"
                          >
                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                            <span>Hesap Türü Değiştir</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => signOut()}
                        className="text-red-600 focus:text-red-600"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Çıkış Yap</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Admin users */}
                {['master_admin', 'editor_admin'].includes(user.activeUserType || user.userType) && (
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
                        <Link href="/admin-dashboard" className="flex items-center">
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Yönetici Paneli</span>
                        </Link>
                      </DropdownMenuItem>
                      
                      {/* Master Admin only items */}
                      {(user.activeUserType === 'master_admin' || user.userType === 'master_admin') && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href="/user-management" className="flex items-center">
                              <Users className="mr-2 h-4 w-4" />
                              <span>Kullanıcı Yönetimi</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/statistics" className="flex items-center">
                              <BarChart3 className="mr-2 h-4 w-4" />
                              <span>İstatistikler</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/system-status" className="flex items-center">
                              <Activity className="mr-2 h-4 w-4" />
                              <span>Sistem Durumu</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/marketing-list" className="flex items-center">
                              <Database className="mr-2 h-4 w-4" />
                              <span>Pazarlama & CRM</span>
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      <DropdownMenuItem asChild>
                        <Link href="/system-settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Sistem Ayarları</span>
                        </Link>
                      </DropdownMenuItem>
                      
                      {showAccountTypeSwitching && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setAccountSelectorOpen(true)}
                            className="flex items-center"
                          >
                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                            <span>Hesap Türü Değiştir</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => signOut()}
                        className="text-red-600 focus:text-red-600"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Çıkış Yap</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

      {/* Account Type Selector Modal */}
      {user && showAccountTypeSwitching && (
        <AccountTypeSelector
          isOpen={accountSelectorOpen}
          onClose={() => setAccountSelectorOpen(false)}
          availableTypes={uniqueUserTypes}
          currentType={user.activeUserType || user.userType}
        />
      )}
    </header>
  );
}
