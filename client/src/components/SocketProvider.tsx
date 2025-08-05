import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  error: null,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if user is not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const initializeSocket = () => {
      try {
        setError(null);
        
        // Initialize Socket.IO connection
        const newSocket = io('/', {
          auth: {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`.trim() || user.email,
            userEmail: user.email,
          },
          autoConnect: true,
        });

        newSocket.on('connect', () => {
          console.log('Socket.IO connected successfully:', newSocket.id);
          setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
          console.log('Socket.IO disconnected');
          setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
          console.error('Socket.IO connection error:', err);
          setError(`Connection failed: ${err.message}`);
          setIsConnected(false);
        });

        setSocket(newSocket);

      } catch (err) {
        console.error('Failed to initialize Socket.IO:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to chat service');
        setIsConnected(false);
      }
    };

    initializeSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  const value: SocketContextType = {
    socket,
    isConnected,
    error,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};