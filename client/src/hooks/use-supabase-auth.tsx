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
  const { data: localUser } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    enabled: !!session,
    retry: false,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        syncWithBackend(session.user);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase auth event:', event);
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      
      if (session?.user && event === 'SIGNED_IN') {
        await syncWithBackend(session.user);
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
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

      if (!response.ok) {
        throw new Error('Failed to sync user with backend');
      }

      const result = await response.json();
      if (result.success) {
        queryClient.setQueryData(["/api/user"], result.user);
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
      toast({
        title: "Bağlantı Hatası",
        description: "Kullanıcı bilgileri senkronize edilemedi",
        variant: "destructive",
      });
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