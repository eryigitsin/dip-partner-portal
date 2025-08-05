import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Partner } from '@shared/schema';

interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface ConversationData {
  partnerId: number;
  partner: Partner;
  lastMessage: ChatMessage;
  unreadCount: number;
  messages: ChatMessage[];
}

export default function Chat() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const queryClient = useQueryClient();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
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

  // Fetch user conversations
  const { data: conversationsData = [] } = useQuery<ConversationData[]>({
    queryKey: ['/api/user/conversations'],
    enabled: isAuthenticated,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Update conversations state when data changes
  useEffect(() => {
    setConversations(conversationsData);
  }, [conversationsData]);

  // Fetch messages for selected conversation
  const { data: conversationMessages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/conversations', selectedConversation?.partnerId && user?.id ? 
      `${Math.min(user.id, selectedConversation.partnerId)}-${Math.max(user.id, selectedConversation.partnerId)}` : 
      null, 'messages'],
    enabled: !!selectedConversation && !!user,
    refetchInterval: 2000, // Refresh every 2 seconds for real-time effect
  });

  // Update messages when conversation messages change
  useEffect(() => {
    if (conversationMessages) {
      setMessages(conversationMessages);
    }
  }, [conversationMessages]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: { message: string; conversationId: string; recipientId: number }) => {
      return apiRequest('POST', '/api/messages', data);
    },
    onSuccess: () => {
      setNewMessage('');
      // Refresh conversations and messages
      queryClient.invalidateQueries({ queryKey: ['/api/user/conversations'] });
      if (selectedConversation && user) {
        const conversationId = `${Math.min(user.id, selectedConversation.partnerId)}-${Math.max(user.id, selectedConversation.partnerId)}`;
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      }
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    }
  });

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || !user) return;

    const conversationId = `${Math.min(user.id, selectedConversation.partnerId)}-${Math.max(user.id, selectedConversation.partnerId)}`;
    
    sendMessage.mutate({
      message: newMessage.trim(),
      conversationId: conversationId,
      recipientId: selectedConversation.partnerId
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createConversationWithPartner = async (partner: Partner) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Check if conversation already exists
      const existingConversation = conversations.find(conv => conv.partnerId === partner.userId);
      if (existingConversation) {
        setSelectedConversation(existingConversation);
        setNewMessageDialogOpen(false);
        return;
      }

      // Create new conversation data
      const newConversation: ConversationData = {
        partnerId: partner.userId,
        partner: partner,
        lastMessage: {} as ChatMessage, // Empty initially
        unreadCount: 0,
        messages: []
      };

      setSelectedConversation(newConversation);
      setNewMessageDialogOpen(false);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
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



  return (
    <>
      <Header />
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-16 pb-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
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
              {user?.userType !== 'partner' && (
                <Button onClick={() => setNewMessageDialogOpen(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Yeni Mesaj Yaz
                </Button>
              )}

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
                                <AvatarImage src={partner.logo || undefined} />
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6" style={{ height: 'calc(100vh - 220px)' }}>
            {/* Channels List */}
            <Card className="lg:col-span-1">
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Konuşmalar</h2>
                </div>
                <ScrollArea style={{ height: 'calc(100vh - 320px)' }}>
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
                        // Use the partner data from conversation which contains the actual user/partner info
                        const conversationPartner = conversation.partner;
                        const displayName = conversationPartner?.companyName || 'Kullanıcı';
                        const isSelected = selectedConversation?.partnerId === conversation.partnerId;
                        
                        return (
                          <div
                            key={conversation.partnerId}
                            className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
                            }`}
                            onClick={() => setSelectedConversation(conversation)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={conversationPartner?.logo || undefined} />
                                <AvatarFallback>
                                  {displayName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {displayName}
                                  </h3>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {conversation.lastMessage?.createdAt ? formatTime(conversation.lastMessage.createdAt) : ''}
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
                          <AvatarImage src={selectedConversation.partner?.logo || undefined} />
                          <AvatarFallback>
                            {(selectedConversation.partner?.companyName || 'Kullanıcı').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {selectedConversation.partner?.companyName || 'Kullanıcı'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Aktif
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
                                    {formatTime(message.createdAt)}
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
                          disabled={sendMessage.isPending}
                          className="flex-1"
                          data-testid="input-message"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sendMessage.isPending}
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