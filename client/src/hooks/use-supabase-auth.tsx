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
      console.log('Supabase auth event:', event);
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try {
          await syncWithBackend(session.user);
          sessionStorage.removeItem('sync_error_count'); // Reset error count on success
        } catch (error) {
          // Error already handled in syncWithBackend
        }
      } else if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(["/api/user"], null);
        // Also logout from our backend
        try {
          await apiRequest("POST", "/api/auth/logout", {});
        } catch (error) {
          console.error('Error logging out from backend:', error);
        }
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
      await supabase.auth.signOut();
      queryClient.setQueryData(["/api/user"], null);
      // Backend logout will be handled by the auth state change listener
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
      localUser,
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