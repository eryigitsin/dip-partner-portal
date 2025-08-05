import React, { createContext, useContext, useEffect, useState } from 'react';
import SendbirdChat, { User } from '@sendbird/chat';
import { GroupChannelModule } from '@sendbird/chat/groupChannel';
import { useAuth } from '@/hooks/use-auth';

interface SendbirdContextType {
  sb: SendbirdChat | null;
  currentUser: User | null;
  isConnected: boolean;
  error: string | null;
}

const SendbirdContext = createContext<SendbirdContextType>({
  sb: null,
  currentUser: null,
  isConnected: false,
  error: null,
});

export const useSendbird = () => {
  const context = useContext(SendbirdContext);
  if (!context) {
    throw new Error('useSendbird must be used within SendbirdProvider');
  }
  return context;
};

interface SendbirdProviderProps {
  children: React.ReactNode;
}

export const SendbirdProvider: React.FC<SendbirdProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [sb, setSb] = useState<SendbirdChat | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if user is not authenticated
      if (sb) {
        sb.disconnect();
        setSb(null);
        setCurrentUser(null);
        setIsConnected(false);
      }
      return;
    }

    const initializeSendbird = async () => {
      try {
        setError(null);
        
        // Initialize Sendbird
        const sendbirdChat = SendbirdChat.init({
          appId: import.meta.env.VITE_SENDBIRD_APP_ID || 'BC823AD85-6A73-4006-8B32-4597A7530647',
          modules: [new GroupChannelModule()],
        });

        setSb(sendbirdChat);

        // Connect user
        const connectedUser = await sendbirdChat.connect(user.id.toString(), {
          nickname: `${user.firstName} ${user.lastName}`.trim() || user.email,
          profileUrl: '',
          metadata: {
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
          }
        });
        setCurrentUser(connectedUser);
        setIsConnected(true);

        console.log('Sendbird connected successfully:', connectedUser);

      } catch (err) {
        console.error('Failed to initialize Sendbird:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to chat service');
        setIsConnected(false);
      }
    };

    initializeSendbird();

    return () => {
      if (sb) {
        sb.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  const value: SendbirdContextType = {
    sb,
    currentUser,
    isConnected,
    error,
  };

  return (
    <SendbirdContext.Provider value={value}>
      {children}
    </SendbirdContext.Provider>
  );
};