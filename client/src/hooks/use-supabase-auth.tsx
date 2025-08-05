import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from "@/lib/supabase";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User as SelectUser } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type SupabaseAuthContextType = {
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  localUser: SelectUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

export const SupabaseAuthContext = createContext<SupabaseAuthContextType | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Get local user data when we have a Supabase session
  const { data: localUser, refetch } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    enabled: !!session,
    retry: false,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        try {
          await syncWithBackend(session.user);
        } catch (error) {
          // Error already handled in syncWithBackend
        }
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase auth event:', event, 'session:', session?.user?.email, 'hash:', window.location.hash, 'pathname:', window.location.pathname, 'full URL:', window.location.href);
      
      // Handle auth event flows based on type
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery detected, redirecting to password reset page');
        window.location.href = '/password-reset-html';
        return;
      }
      
      if (event === 'SIGNED_IN') {
        const hash = window.location.hash;
        const search = window.location.search;
        
        console.log('SIGNED_IN event - hash:', hash, 'search:', search);
        
        // Check if this is a magic link authentication (OTP)
        if (hash.includes('type=magiclink')) {
          console.log('Magic link authentication detected, redirecting to home');
          // Clean up URL and redirect to home with magic parameter
          window.history.replaceState({}, '', '/');
          window.location.href = '/?magic=true';
          return;
        }
        
        // Handle password recovery (reset)
        if (hash.includes('type=recovery')) {
          console.log('Password recovery detected, redirecting to password reset page');
          // Don't redirect immediately, let the user stay on the password reset page
          if (window.location.pathname !== '/password-reset') {
            window.location.href = '/password-reset';
          }
          return;
        }
        
        // Handle email confirmation from signup
        if (hash.includes('type=signup') && session?.user?.email_confirmed_at) {
          console.log('Email confirmation detected, redirecting to home');
          localStorage.setItem('email_confirmed_shown', 'true');
          window.history.replaceState({}, '', '/');
          window.location.href = '/?confirmed=true';
          return;
        }
        
        // Check for manual magic link parameter
        const urlParams = new URLSearchParams(search);
        if (urlParams.get('magic') === 'true') {
          console.log('Manual magic link parameter detected, redirecting to home');
          window.history.replaceState({}, '', '/');
          window.location.href = '/?magic=true';
          return;
        }
      }
      
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        // Skip auto-sync for password reset and email confirmation flows
        if (window.location.pathname === '/password-reset' || 
            window.location.pathname === '/email-confirmed' ||
            window.location.pathname === '/password-reset-html') {
          return;
        }
        
        try {
          await syncWithBackend(session.user);
          sessionStorage.removeItem('sync_error_count'); // Reset error count on success
        } catch (error) {
          // Error already handled in syncWithBackend
        }
      } else if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(["/api/user"], null);
        queryClient.clear(); // Clear all cached data
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncWithBackend = async (supabaseUser: SupabaseUser) => {
    try {
      const response = await apiRequest("POST", "/api/auth/sync-supabase-user", {
        supabaseUser: {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          user_metadata: supabaseUser.user_metadata,
          app_metadata: supabaseUser.app_metadata,
        },
      });

      const result = await response.json();
      if (result.success) {
        queryClient.setQueryData(["/api/user"], result.user);
        return result.user;
      } else {
        throw new Error(result.error || 'Failed to sync user');
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
      // Only show error toast on repeated failures
      const errorCount = sessionStorage.getItem('sync_error_count') || '0';
      const count = parseInt(errorCount);
      if (count < 2) {
        sessionStorage.setItem('sync_error_count', (count + 1).toString());
      } else {
        toast({
          title: "Bağlantı Hatası",
          description: "Lütfen sayfayı yenileyin",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // First logout from backend
      try {
        await apiRequest("POST", "/api/auth/logout", {});
      } catch (error) {
        console.error('Error logging out from backend:', error);
      }
      
      // Clear query cache
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear(); // Clear all cached data
      
      // Sign out from Supabase (this will trigger SIGNED_OUT event)
      await supabase.auth.signOut();
      
      // Force clear local state
      setSession(null);
      setSupabaseUser(null);
      
      // Clear any session storage
      sessionStorage.clear();
      
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Çıkış Hatası",
        description: "Çıkış yapılırken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  return (
    <SupabaseAuthContext.Provider value={{
      supabaseUser,
      session,
      localUser: localUser || null,
      isLoading,
      signOut,
    }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}