import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/language-context';
import { t } from '@/lib/i18n';
import { Partner, ServiceCategory } from '@shared/schema';
import { Search, Plus } from 'lucide-react';

interface PartnersCatalogProps {
  onQuoteRequest: (partner: Partner) => void;
  onViewProfile: (partner: Partner) => void;
  selectedCategory?: string;
}

export function PartnersCatalog({ 
  onQuoteRequest, 
  onViewProfile, 
  selectedCategory 
}: PartnersCatalogProps) {
  const { language } = useLanguage();
  const [category, setCategory] = useState(selectedCategory || 'all');
  const [search, setSearch] = useState('');
  const [currentSearch, setCurrentSearch] = useState('');
  const [currentCategory, setCurrentCategory] = useState(selectedCategory || '');

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/categories'],
  });

  const { data: partners = [], isLoading } = useQuery<Partner[]>({
    queryKey: ['/api/partners', { category: currentCategory, search: currentSearch }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentCategory && currentCategory !== 'all') params.append('category', currentCategory);
      if (currentSearch) params.append('search', currentSearch);
      
      const response = await fetch(`/api/partners?${params}`);
      if (!response.ok) throw new Error('Failed to fetch partners');
      return response.json();
    },
  });

  useEffect(() => {
    if (selectedCategory) {
      setCategory(selectedCategory);
      setCurrentCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const handleSearch = () => {
    setCurrentSearch(search);
    setCurrentCategory(category);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('all');
    setCurrentSearch('');
    setCurrentCategory('');
  };

  const getCategoryName = (categorySlug: string) => {
    const cat = categories.find(c => c.slug === categorySlug);
    if (!cat) return categorySlug;
    return language === 'en' ? cat.nameEn : cat.name;
  };

  const getBadgeColor = (categorySlug: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-emerald-100 text-emerald-800',
    ];
    const index = categories.findIndex(c => c.slug === categorySlug) % colors.length;
    return colors[index] || colors[0];
  };

  return (
    <section id="partnerships-section" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('partnersCatalogTitle', language)}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('partnersCatalogSubtitle', language)}
          </p>
        </div>

        {/* Filtering Interface */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('category', language)}
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('allCategories', language)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allCategories', language)}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug}>
                        {language === 'en' ? cat.nameEn : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('search', language)}
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={t('searchPlaceholder', language)}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
              </div>

              {/* Search Button & Clear Filters */}
              <div className="flex flex-col justify-end">
                <Button 
                  onClick={handleSearch}
                  className="bg-dip-blue hover:bg-dip-dark-blue mb-2"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {t('searchButton', language)}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent h-10 px-4 py-2 text-sm hover:text-dip-blue bg-[#deffff] text-[#484d54]"
                >
                  {t('clearFilters', language)}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Partners Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-lg"></div>
                    <div className="ml-3">
                      <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-6">
                    <div className="h-3 bg-gray-300 rounded"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                  </div>
                  <div className="flex space-x-3">
                    <div className="h-10 bg-gray-300 rounded flex-1"></div>
                    <div className="h-10 bg-gray-300 rounded flex-1"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Arama kriterlerinize uygun iş ortağı bulunamadı
            </h3>
            <p className="text-gray-600 mb-4">
              Lütfen farklı kriterler deneyin veya filtreleri temizleyin.
            </p>
            <Button onClick={handleClearFilters} variant="outline">
              {t('clearFilters', language)}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {partners.map((partner) => (
              <Card key={partner.id} className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      {partner.logo ? (
                        <img 
                          src={partner.logo} 
                          alt={`${partner.companyName} Logo`}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-gray-600">
                          {partner.companyName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900">{partner.companyName}</h3>
                      <Badge className={getBadgeColor(partner.serviceCategory)}>
                        {getCategoryName(partner.serviceCategory)}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                    {partner.shortDescription || partner.description}
                  </p>

                  {partner.dipAdvantages && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-amber-800 text-sm font-medium">
                        🏷️ {partner.dipAdvantages}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                    <span>👥 {partner.followersCount} takipçi</span>
                    <span>👁️ {partner.profileViews} görüntüleme</span>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button 
                      onClick={() => window.location.href = `/partner/${partner.id}`}
                      className="flex-1 bg-dip-green hover:bg-green-600"
                    >
                      {t('getQuote', language)}
                    </Button>
                    <Button 
                      onClick={() => window.location.href = `/partner/${partner.id}`}
                      variant="outline"
                      className="flex-1"
                    >
                      {t('viewProfile', language)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {partners.length > 0 && partners.length % 20 === 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Daha Fazla Göster
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
