import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/language-context';
import { t } from '@/lib/i18n';
import { ServiceCategory } from '@shared/schema';

interface CategoryCardsProps {
  onCategorySelect: (category: string) => void;
}

export function CategoryCards({ onCategorySelect }: CategoryCardsProps) {
  const { language } = useLanguage();
  
  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/categories'],
  });

  const getCategoryIcon = (icon: string) => {
    // Return Font Awesome icon classes
    return icon || 'fas fa-clipboard-check';
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('categoriesTitle', language)}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('categoriesSubtitle', language)}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => onCategorySelect(category.slug)}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-dip-blue transition-all duration-300 cursor-pointer group"
            >
              <div className="text-center">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-dip-blue transition-all duration-300">
                  <i className={`${getCategoryIcon(category.icon)} text-2xl text-dip-blue group-hover:text-white transition-all duration-300`}></i>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {language === 'en' ? category.nameEn : category.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
