export const translations = {
  tr: {
    // Navigation
    home: "Ana Sayfa",
    about: "Hakkımızda",
    activities: "Faaliyetler",
    partnerships: "İş Birlikleri",
    contact: "İletişim",
    login: "Giriş Yap",
    register: "Üye Ol",
    
    // Hero section
    heroTitle: "İş Ortaklarımızla Büyüyün",
    heroSubtitle: "(Dijital) ihracat yolculuğunuzda size en iyi hizmeti sunabilmek için güvenilir iş ortaklarımızla çalışıyoruz.",
    becomePartner: "İŞ ORTAĞI OL",
    getService: "HİZMET AL",
    
    // Categories
    categoriesTitle: "Hizmet Kategorileri",
    categoriesSubtitle: "İhtiyacınıza uygun kategoriyi seçin ve güvenilir iş ortaklarımızla tanışın",
    
    // Partners catalog
    partnersCatalogTitle: "DİP İş Ortakları Kataloğu",
    partnersCatalogSubtitle: "Güvenilir iş ortaklarımızdan hizmet alın ve dijital ihracat yolculuğunuzda bir adım öne geçin",
    
    // Filtering
    category: "Kategori",
    allCategories: "Tüm Kategoriler",
    search: "Arama",
    searchPlaceholder: "İş ortağı ara...",
    searchButton: "Ara",
    clearFilters: "Filtreleri Temizle",
    
    // Partner cards
    getQuote: "TEKLİF AL",
    viewProfile: "PROFİLİ GÖR",
    
    // Partnership CTA
    partnershipCtaTitle: "İş Ortağımız Olun",
    partnershipCtaSubtitle: "Siz de ürün veya hizmetinizi DİP üyelerine indirimli sunarak ülkemizin ihracatını geliştirme yolundaki firmalarımıza destek olmak için bizimle irtibata geçin.",
    contactUs: "İLETİŞİME GEÇ",
    
    // Forms
    firstName: "Ad",
    lastName: "Soyad",
    email: "E-posta",
    phone: "Telefon",
    company: "Şirket",
    title: "Ünvan",
    website: "Website",
    required: "zorunlu",
    cancel: "İptal",
    submit: "Gönder",
    
    // Footer
    footerDescription: "Dijital İhracat Platformu olarak, ülkemizin ihracatını güçlendirmek için güvenilir iş ortaklarımızla birlikte çalışıyoruz.",
    quickLinks: "Hızlı Erişim",
    services: "Hizmetler",
    language: "Dil",
    
    // Service categories
    "pazar-analizi": "Pazar Analizi",
    "gumruk": "Gümrük", 
    "lojistik": "Lojistik & Depo",
    "pazarlama": "Pazarlama & Reklam",
    "fotograf": "Fotoğraf",
    "danismanlik": "Danışmanlık",
    "hukuk": "Hukuk",
    "finans": "Finans & Muhasebe",
    "marka": "Marka Koruma",
    "fuar": "Fuar & Etkinlik",
    "uretim": "Üretim",
    "paketleme": "Paketleme & Ambalaj",
    "odeme": "Ödeme",
    "eticaret": "E-Ticaret Altyapısı",
    "pazaryeri": "Pazaryeri",
    "it": "IT & Yazılım",
  },
  en: {
    // Navigation
    home: "Home",
    about: "About",
    activities: "Activities", 
    partnerships: "Partnerships",
    contact: "Contact",
    login: "Login",
    register: "Register",
    
    // Hero section
    heroTitle: "Grow with Our Partners",
    heroSubtitle: "We work with our trusted business partners to provide you with the best service on your (digital) export journey.",
    becomePartner: "BECOME A PARTNER",
    getService: "GET SERVICE",
    
    // Categories
    categoriesTitle: "Service Categories",
    categoriesSubtitle: "Choose the category that suits your needs and meet our trusted business partners",
    
    // Partners catalog
    partnersCatalogTitle: "DIP Business Partners Catalog",
    partnersCatalogSubtitle: "Get services from our trusted business partners and take a step ahead in your digital export journey",
    
    // Filtering
    category: "Category",
    allCategories: "All Categories",
    search: "Search",
    searchPlaceholder: "Search partners...",
    searchButton: "Search",
    clearFilters: "Clear Filters",
    
    // Partner cards
    getQuote: "GET QUOTE",
    viewProfile: "VIEW PROFILE",
    
    // Partnership CTA
    partnershipCtaTitle: "Become Our Partner",
    partnershipCtaSubtitle: "Support companies on their journey to develop our country's exports by offering your products or services to DIP members at a discount.",
    contactUs: "CONTACT US",
    
    // Forms
    firstName: "First Name",
    lastName: "Last Name", 
    email: "Email",
    phone: "Phone",
    company: "Company",
    title: "Title",
    website: "Website",
    required: "required",
    cancel: "Cancel",
    submit: "Submit",
    
    // Footer
    footerDescription: "As the Digital Export Platform, we work together with our trusted business partners to strengthen our country's exports.",
    quickLinks: "Quick Links",
    services: "Services",
    language: "Language",
    
    // Service categories
    "pazar-analizi": "Market Analysis",
    "gumruk": "Customs",
    "lojistik": "Logistics & Warehouse", 
    "pazarlama": "Marketing & Advertising",
    "fotograf": "Photography",
    "danismanlik": "Consulting",
    "hukuk": "Legal",
    "finans": "Finance & Accounting",
    "marka": "Brand Protection",
    "fuar": "Trade Fair & Events",
    "uretim": "Manufacturing",
    "paketleme": "Packaging",
    "odeme": "Payment",
    "eticaret": "E-commerce Infrastructure",
    "pazaryeri": "Marketplace", 
    "it": "IT & Software",
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.tr;

export function t(key: TranslationKey, language: Language = 'tr'): string {
  return translations[language][key] || translations.tr[key] || key;
}
