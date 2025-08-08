import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { EmailConfirmedBanner } from "@/components/email-confirmed-banner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { SupabaseAuthProvider } from "@/hooks/use-supabase-auth";
import { SocketProvider } from "@/components/SocketProvider";
import { ChatPopup } from "@/components/ChatPopup";
import { LanguageProvider } from "@/contexts/language-context";
import { SeoHead } from "@/components/seo-head";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import AuthPage from "@/pages/auth";
import PasswordResetPage from "@/pages/password-reset";
import EmailConfirmedPage from "@/pages/email-confirmed";
import PartnerDashboard from "@/pages/partner-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import MarketingListPage from "@/pages/admin/marketing-list";
import PartnerInspectionPage from "@/pages/admin/partner-inspection";
import QuoteRequestsPage from "@/pages/admin/quote-requests";
import UserPanel from "@/pages/user-panel";
import ServiceRequests from "@/pages/service-requests";
import Chat from "@/pages/chat";
import ApplicationStatus from "@/pages/application-status";
import UserManagement from "@/pages/user-management";
import Statistics from "@/pages/statistics";
import SystemStatus from "@/pages/system-status";
import SystemSettings from "@/pages/system-settings";
import TemplateManagement from "@/pages/template-management";
import FileManagement from "@/pages/file-management";
import AdminFileManagement from "@/pages/admin/file-management";
import EmailPreferences from "@/pages/email-preferences";
import EmailSubscribers from "@/pages/admin/email-subscribers";
import PartnerProfile from "@/pages/partner-profile";
import NotificationsPage from "@/pages/notifications";
import EmailBuilderPage from "@/pages/email-builder";



import { ProtectedRoute } from "./lib/protected-route";
import { AdminProtectedRoute } from "./lib/admin-protected-route";
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
    <>
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
      <EmailConfirmedBanner />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/password-reset" component={PasswordResetPage} />
      <Route path="/email-confirmed" component={EmailConfirmedPage} />
      <ProtectedRoute path="/partner-dashboard" component={PartnerDashboard} />


      <ProtectedRoute path="/admin-dashboard" component={AdminDashboard} />
      <ProtectedRoute path="/user-panel" component={UserPanel} />
      <ProtectedRoute path="/service-requests" component={ServiceRequests} />
      <ProtectedRoute path="/messages" component={Chat} />
      <ProtectedRoute path="/chat" component={Chat} />
      <ProtectedRoute path="/user-management" component={UserManagement} />
      <ProtectedRoute path="/statistics" component={Statistics} />
      <ProtectedRoute path="/system-status" component={SystemStatus} />
      <ProtectedRoute path="/system-settings" component={SystemSettings} />
      <AdminProtectedRoute path="/template-management" component={TemplateManagement} />
      <AdminProtectedRoute path="/file-management" component={FileManagement} />
      <AdminProtectedRoute path="/admin/file-management" component={AdminFileManagement} />
      <ProtectedRoute path="/email-preferences" component={EmailPreferences} />
      <ProtectedRoute path="/email-subscribers" component={EmailSubscribers} />
      <AdminProtectedRoute path="/marketing-list" component={MarketingListPage} />
      <ProtectedRoute path="/admin/partner-inspection/:partnerId" component={PartnerInspectionPage} />
      <ProtectedRoute path="/admin/quote-requests" component={QuoteRequestsPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <Route path="/email-builder" component={EmailBuilderPage} />
      <Route path="/application-status/:id" component={ApplicationStatus} />
      <Route path="/partner/:username" component={PartnerProfile} />

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
            <SocketProvider>
              <TooltipProvider delayDuration={0}>
                <InitApp />
                <Toaster />
                <ChatPopup />
                <Router />
              </TooltipProvider>
            </SocketProvider>
          </AuthProvider>
        </SupabaseAuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
