import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/contexts/language-context";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import AuthPage from "@/pages/auth";
import PartnerDashboard from "@/pages/partner-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import UserPanel from "@/pages/user-panel";
import ServiceRequests from "@/pages/service-requests";
import Messages from "@/pages/messages";
import ApplicationStatus from "@/pages/application-status";
import PartnerProfile from "@/pages/partner-profile";
import { ProtectedRoute } from "./lib/protected-route";
import { useQuery } from "@tanstack/react-query";

function InitApp() {
  // Initialize the app with service categories
  const { } = useQuery({
    queryKey: ["/api/init"],
    staleTime: Infinity,
  });

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/partner-dashboard" component={PartnerDashboard} />
      <ProtectedRoute path="/admin-dashboard" component={AdminDashboard} />
      <ProtectedRoute path="/user-panel" component={UserPanel} />
      <ProtectedRoute path="/service-requests" component={ServiceRequests} />
      <ProtectedRoute path="/messages" component={Messages} />
      <Route path="/application-status/:id" component={ApplicationStatus} />
      <Route path="/partner/:id" component={PartnerProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <InitApp />
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
