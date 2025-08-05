import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from '@/components/SocketProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Plus, Send, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useQuery } from '@tanstack/react-query';
import type { Partner } from '@shared/schema';

interface ChatMessage {
  id: string;
  senderId: number;
  receiverId: number;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface Conversation {
  roomId: string;
  partnerId: number;
  lastMessage?: ChatMessage;
  unreadCount: number;
  lastActivity: Date;
}

export default function Chat() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { socket, isConnected, error } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newMessageDialogOpen, setNewMessageDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch partners for new conversations
  const { data: partners = [] } = useQuery<Partner[]>({
    queryKey: ['/api/partners'],
    enabled: isAuthenticated,
  });

  // Initialize Socket.IO connection when authenticated
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    // Authenticate user with socket
    socket.emit('user:authenticate', {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`.trim() || user.email,
      userEmail: user.email,
    });

    // Listen for conversation list
    socket.on('conversations:list', (data: Conversation[]) => {
      setConversations(data);
    });

    // Listen for authentication confirmation
    socket.on('user:authenticated', (data: { success: boolean }) => {
      if (data.success) {
        console.log('Socket.IO user authenticated successfully');
      }
    });

    return () => {
      socket.off('conversations:list');
      socket.off('user:authenticated');
    };
  }, [socket, isConnected, user]);

  // Handle conversation selection and message loading
  useEffect(() => {
    if (!selectedConversation || !socket) return;

    // Join conversation room
    socket.emit('conversation:create', { partnerId: selectedConversation.partnerId });

    // Listen for conversation created and messages
    socket.on('conversation:created', (data: { roomId: string; partnerId: number; messages: ChatMessage[] }) => {
      setMessages(data.messages);
    });

    // Listen for new messages
    socket.on('message:received', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    // Listen for message read updates
    socket.on('message:read_updated', (data: { messageId: string; isRead: boolean }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, isRead: data.isRead } : msg
      ));
    });

    return () => {
      socket.off('conversation:created');
      socket.off('message:received');
      socket.off('message:read_updated');
    };
  }, [selectedConversation, socket]);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || !socket) return;

    try {
      setLoading(true);
      
      socket.emit('message:send', {
        roomId: selectedConversation.roomId,
        message: newMessage.trim(),
        receiverId: selectedConversation.partnerId,
      });

      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createConversationWithPartner = async (partner: Partner) => {
    if (!socket || !user) return;

    try {
      setLoading(true);
      
      // Generate room ID for this conversation
      const roomId = `room:${Math.min(user.id, partner.userId)}:${Math.max(user.id, partner.userId)}`;
      
      // Check if conversation already exists
      const existingConversation = conversations.find(conv => conv.partnerId === partner.userId);
      if (existingConversation) {
        setSelectedConversation(existingConversation);
        setNewMessageDialogOpen(false);
        return;
      }

      // Create new conversation
      const newConversation: Conversation = {
        roomId,
        partnerId: partner.userId,
        unreadCount: 0,
        lastActivity: new Date(),
      };

      setConversations(prev => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
      setNewMessageDialogOpen(false);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return new Intl.DateTimeFormat('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } else {
      return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: '2-digit'
      }).format(date);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-16 pb-20">
          <div className="max-w-7xl mx-auto p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Giriş Yapmanız Gerekiyor
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Mesajlaşma özelliğini kullanmak için lütfen giriş yapın.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-16 pb-20">
          <div className="max-w-7xl mx-auto p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Bağlantı Hatası
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Mesajlaşma servisiyle bağlantı kurulamadı: {error}
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-16 pb-20">
          <div className="max-w-7xl mx-auto p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Bağlanıyor...
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Mesajlaşma servisine bağlanılıyor.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-16 pb-20">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Mesajlar
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">İş ortaklarınızla mesajlaşın</p>
                </div>
              </div>
              <Button onClick={() => setNewMessageDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Yeni Mesaj Yaz
              </Button>

              {/* New Message Dialog */}
              <Dialog open={newMessageDialogOpen} onOpenChange={setNewMessageDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Yeni Mesaj</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Mesaj göndermek istediğiniz partneri seçin:
                    </p>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {partners.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">Partner bulunamadı</p>
                      ) : (
                        partners.map((partner) => (
                          <div
                            key={partner.id}
                            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => createConversationWithPartner(partner)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={partner.logo} />
                                <AvatarFallback>
                                  {partner.companyName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {partner.companyName}
                                </h3>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
            {/* Channels List */}
            <Card className="lg:col-span-1">
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Konuşmalar</h2>
                </div>
                <ScrollArea className="h-[calc(100vh-380px)]">
                  {conversations.length === 0 ? (
                    <div className="p-6 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Henüz konuşmanız yok</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        İş ortaklarıyla mesajlaşmaya başlayın
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {conversations.map((conversation) => {
                        const partner = partners.find(p => p.userId === conversation.partnerId);
                        const partnerName = partner?.companyName || 'Partner';
                        const isSelected = selectedConversation?.roomId === conversation.roomId;
                        
                        return (
                          <div
                            key={conversation.roomId}
                            className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
                            }`}
                            onClick={() => setSelectedConversation(conversation)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={partner?.logo} />
                                <AvatarFallback>
                                  {partnerName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {partnerName}
                                  </h3>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatTime(new Date(conversation.lastActivity).getTime())}
                                  </span>
                                </div>
                                {conversation.lastMessage && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {conversation.lastMessage.message || 'Medya mesajı'}
                                  </p>
                                )}
                                {conversation.unreadCount > 0 && (
                                  <Badge variant="destructive" className="mt-1">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="lg:col-span-2">
              <CardContent className="p-0 h-full">
                {selectedConversation ? (
                  <div className="flex flex-col h-full">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="lg:hidden"
                          onClick={() => setSelectedConversation(null)}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={partners.find(p => p.userId === selectedConversation.partnerId)?.logo} />
                          <AvatarFallback>
                            {(partners.find(p => p.userId === selectedConversation.partnerId)?.companyName || 'Partner').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {partners.find(p => p.userId === selectedConversation.partnerId)?.companyName || 'Partner'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isConnected ? 'Çevrimiçi' : 'Çevrimdışı'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isFromUser = message.senderId === user?.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isFromUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                  isFromUser
                                    ? 'bg-blue-500 text-white rounded-br-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                                } shadow-sm`}
                              >
                                <p className="text-sm">{message.message}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <p className={`text-xs ${
                                    isFromUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {formatTime(new Date(message.timestamp).getTime())}
                                  </p>
                                  {isFromUser && (
                                    <span className="text-xs text-blue-100 ml-2">
                                      {message.isRead ? '✓✓' : '✓'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Mesajınızı yazın..."
                          disabled={loading}
                          className="flex-1"
                          data-testid="input-message"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || loading}
                          data-testid="button-send-message"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Konuşma Seçin
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Mesajlaşmaya başlamak için bir konuşma seçin
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}