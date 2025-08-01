import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { SupabaseAuthProvider } from "@/hooks/use-supabase-auth";
import { LanguageProvider } from "@/contexts/language-context";
import { SeoHead } from "@/components/seo-head";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import AuthPage from "@/pages/auth";
import PartnerDashboard from "@/pages/partner-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import MarketingListPage from "@/pages/admin/marketing-list";
import PartnerInspectionPage from "@/pages/admin/partner-inspection";
import QuoteRequestsPage from "@/pages/admin/quote-requests";
import ServiceCategoriesPage from "@/pages/admin/service-categories";
import ServicesPage from "@/pages/admin/services";
import UserPanel from "@/pages/user-panel";
import ServiceRequests from "@/pages/service-requests";
import Messages from "@/pages/messages";
import ApplicationStatus from "@/pages/application-status";
import UserManagement from "@/pages/user-management";
import Statistics from "@/pages/statistics";
import SystemStatus from "@/pages/system-status";
import SystemSettings from "@/pages/system-settings";
import EmailPreferences from "@/pages/email-preferences";
import EmailSubscribers from "@/pages/admin/email-subscribers";
import PartnerProfile from "@/pages/partner-profile";
import PartnerProfilePage from "@/pages/partner-profile-page";
import PartnerStatisticsPage from "@/pages/partner-statistics-page";
import TestUpload from "@/pages/test-upload";
import { ProtectedRoute } from "./lib/protected-route";
import { useQuery } from "@tanstack/react-query";

interface SystemConfig {
  siteName?: string;
  seoSettings?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
  };
}

function InitApp() {
  // Initialize the app with service categories
  const { } = useQuery({
    queryKey: ["/api/init"],
    staleTime: Infinity,
  });

  // Fetch system config for SEO settings
  const { data: systemConfig } = useQuery<SystemConfig>({
    queryKey: ['/api/admin/system-config'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return (
    <SeoHead
      title={systemConfig?.seoSettings?.metaTitle || 'dip | iş ortakları platformu'}
      description={systemConfig?.seoSettings?.metaDescription || 'DİP İş Ortakları Platformu - Dijital ihracat süreçleriniz için güvenilir iş ortakları bulun ve işbirliği yapın'}
      keywords={systemConfig?.seoSettings?.metaKeywords || 'dip, iş ortakları, dijital ihracat, platform, işbirliği, hizmet sağlayıcıları'}
      ogTitle={systemConfig?.seoSettings?.ogTitle || 'dip | iş ortakları platformu'}
      ogDescription={systemConfig?.seoSettings?.ogDescription || 'DİP İş Ortakları Platformu - Dijital ihracat süreçleriniz için güvenilir iş ortakları bulun ve işbirliği yapın'}
      ogImage={systemConfig?.seoSettings?.ogImage || ''}
      ogUrl={systemConfig?.seoSettings?.ogUrl || ''}
      twitterTitle={systemConfig?.seoSettings?.twitterTitle || 'dip | iş ortakları platformu'}
      twitterDescription={systemConfig?.seoSettings?.twitterDescription || 'DİP İş Ortakları Platformu - Dijital ihracat süreçleriniz için güvenilir iş ortakları bulun ve işbirliği yapın'}
      twitterImage={systemConfig?.seoSettings?.twitterImage || ''}
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/partner-dashboard" component={PartnerDashboard} />
      <ProtectedRoute path="/partner-profile" component={PartnerProfilePage} />
      <ProtectedRoute path="/partner-statistics" component={PartnerStatisticsPage} />
      <ProtectedRoute path="/admin-dashboard" component={AdminDashboard} />
      <ProtectedRoute path="/user-panel" component={UserPanel} />
      <ProtectedRoute path="/service-requests" component={ServiceRequests} />
      <ProtectedRoute path="/messages" component={Messages} />
      <ProtectedRoute path="/user-management" component={UserManagement} />
      <ProtectedRoute path="/statistics" component={Statistics} />
      <ProtectedRoute path="/system-status" component={SystemStatus} />
      <ProtectedRoute path="/system-settings" component={SystemSettings} />
      <ProtectedRoute path="/email-preferences" component={EmailPreferences} />
      <ProtectedRoute path="/email-subscribers" component={EmailSubscribers} />
      <ProtectedRoute path="/marketing-list" component={MarketingListPage} />
      <ProtectedRoute path="/admin/partner-inspection/:partnerId" component={PartnerInspectionPage} />
      <ProtectedRoute path="/admin/quote-requests" component={QuoteRequestsPage} />
      <ProtectedRoute path="/admin/service-categories" component={ServiceCategoriesPage} />
      <ProtectedRoute path="/admin/services" component={ServicesPage} />
      <Route path="/application-status/:id" component={ApplicationStatus} />
      <Route path="/partner/:username" component={PartnerProfile} />
      <Route path="/test-upload" component={TestUpload} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SupabaseAuthProvider>
          <AuthProvider>
            <TooltipProvider>
              <InitApp />
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </SupabaseAuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
