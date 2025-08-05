import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSendbird } from '@/components/SendbirdProvider';
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
import { GroupChannel, GroupChannelModule } from '@sendbird/chat/groupChannel';
import type { BaseMessage, UserMessage } from '@sendbird/chat/message';
import type { Partner } from '@shared/schema';

export default function Chat() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { sb, currentUser, isConnected, error } = useSendbird();
  const [channels, setChannels] = useState<GroupChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<GroupChannel | null>(null);
  const [messages, setMessages] = useState<BaseMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newMessageDialogOpen, setNewMessageDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch partners for new conversations
  const { data: partners = [] } = useQuery<Partner[]>({
    queryKey: ['/api/partners'],
    enabled: isAuthenticated,
  });

  // Load channels when Sendbird is connected
  useEffect(() => {
    if (!sb || !isConnected) return;

    const loadChannels = async () => {
      try {
        const channelModule = sb.getModule(new GroupChannelModule());
        const channelListQuery = channelModule.createMyGroupChannelListQuery({
          includeEmpty: true,
          limit: 50,
        });
        
        const channelList = await channelListQuery.next();
        setChannels(channelList);
      } catch (err) {
        console.error('Failed to load channels:', err);
      }
    };

    loadChannels();
  }, [sb, isConnected]);

  // Load messages when a channel is selected
  useEffect(() => {
    if (!selectedChannel) return;

    const loadMessages = async () => {
      try {
        const messageListQuery = selectedChannel.createPreviousMessageListQuery({
          limit: 50,
        });
        
        const messageList = await messageListQuery.load();
        setMessages(messageList.reverse());
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };

    loadMessages();

    // Set up message event handlers
    const channelHandler = {
      onMessageReceived: (channel: GroupChannel, message: BaseMessage) => {
        if (channel.url === selectedChannel.url) {
          setMessages(prev => [...prev, message]);
        }
      },
    };

    const handlerId = 'message-handler-' + Date.now();
    const channelModule = sb?.getModule(new GroupChannelModule());
    channelModule?.addGroupChannelHandler(handlerId, channelHandler);

    return () => {
      if (sb) {
        const channelModule = sb.getModule(new GroupChannelModule());
        channelModule?.removeGroupChannelHandler(handlerId);
      }
    };
  }, [selectedChannel, sb]);

  const handleSendMessage = async () => {
    if (!selectedChannel || !newMessage.trim()) return;

    try {
      setLoading(true);
      const params = {
        message: newMessage.trim(),
      };

      const message = await selectedChannel.sendUserMessage(params);
      setMessages(prev => [...prev, message as BaseMessage]);
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

  const createChannelWithPartner = async (partner: Partner) => {
    if (!sb || !currentUser) return;

    try {
      setLoading(true);
      
      // Create channel with partner
      const params = {
        userIds: [partner.userId.toString()],
        name: `${currentUser?.nickname || 'User'} & ${partner.companyName}`,
        isDistinct: true, // Prevent duplicate channels
        customType: 'partner_chat',
      };

      const channelModule = sb.getModule(new GroupChannelModule());
      const channel = await channelModule.createChannel(params);
      setChannels(prev => [channel, ...prev]);
      setSelectedChannel(channel);
      setNewMessageDialogOpen(false);
    } catch (err) {
      console.error('Failed to create channel:', err);
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
                            onClick={() => createChannelWithPartner(partner)}
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
                  {channels.length === 0 ? (
                    <div className="p-6 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Henüz konuşmanız yok</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        İş ortaklarıyla mesajlaşmaya başlayın
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {channels.map((channel) => {
                        const isSelected = selectedChannel?.url === channel.url;
                        
                        return (
                          <div
                            key={channel.url}
                            className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
                            }`}
                            onClick={() => setSelectedChannel(channel)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback>
                                  {channel.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {channel.name}
                                  </h3>
                                  {channel.lastMessage && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatTime(channel.lastMessage.createdAt)}
                                    </span>
                                  )}
                                </div>
                                {channel.lastMessage && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {channel.lastMessage.message || 'Medya mesajı'}
                                  </p>
                                )}
                                {channel.unreadMessageCount > 0 && (
                                  <Badge variant="destructive" className="mt-1">
                                    {channel.unreadMessageCount}
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
                {selectedChannel ? (
                  <div className="flex flex-col h-full">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="lg:hidden"
                          onClick={() => setSelectedChannel(null)}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {selectedChannel.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {selectedChannel.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedChannel.memberCount} üye
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.map((message) => {
                          if (message.messageType !== 'user') return null;
                          
                          const userMessage = message as UserMessage;
                          const isOwn = userMessage.sender?.userId === currentUser?.userId;
                          
                          return (
                            <div
                              key={message.messageId}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                  isOwn
                                    ? 'bg-blue-500 text-white rounded-br-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                                } shadow-sm`}
                              >
                                <p className="text-sm">{userMessage.message}</p>
                                <p className={`text-xs mt-1 ${
                                  isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {formatTime(message.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
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