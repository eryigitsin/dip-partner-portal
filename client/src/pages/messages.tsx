import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, ArrowLeft, User } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface Partner {
  id: number;
  companyName: string;
  logo?: string;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  subject?: string;
  message: string;
  attachments?: any;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  partnerId: number;
  partner: Partner;
  lastMessage: Message;
  unreadCount: number;
  messages: Message[];
}

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket connection for real-time messaging
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('WebSocket connecting...');
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connected');
      // Authenticate user
      socket.send(JSON.stringify({
        type: 'auth',
        userId: user.id
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'notification' && data.data) {
          const notification = data.data;
          
          // Add notification to list
          setNotifications(prev => [notification, ...prev]);
          
          // Refresh conversations and messages
          queryClient.invalidateQueries({ queryKey: ["/api/user/conversations"] });
          if (selectedConversation) {
            queryClient.invalidateQueries({ 
              queryKey: ["/api/conversations", selectedConversation, "messages"] 
            });
          }

          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title || 'Yeni Mesaj', {
              body: notification.message,
              icon: '/favicon.ico'
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, [user, queryClient, selectedConversation]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch user's conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<ConversationWithPartner[]>({
    queryKey: ["/api/user/conversations"],
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    enabled: !!selectedConversation && !!user,
  });

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { receiverId: number; content: string }) => {
      return apiRequest("/api/messages", "POST", messageData);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation, "messages"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/user/conversations"],
      });
    },
  });

  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return apiRequest(`/api/conversations/${conversationId}/read`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/user/conversations"],
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    
    const conversation = conversations.find((c: ConversationWithPartner) => 
      `${Math.min(c.partnerId, user.id)}-${Math.max(c.partnerId, user.id)}` === selectedConversation
    );
    
    if (conversation) {
      sendMessageMutation.mutate({
        receiverId: conversation.partnerId,
        content: newMessage.trim(),
      });
    }
  };

  const handleConversationSelect = (conversation: ConversationWithPartner) => {
    if (!user) return;
    const conversationId = `${Math.min(conversation.partnerId, user.id)}-${Math.max(conversation.partnerId, user.id)}`;
    setSelectedConversation(conversationId);
    
    // Mark messages as read
    if (conversation.unreadCount > 0) {
      markAsReadMutation.mutate(conversationId);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
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

  if (conversationsLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600 dark:text-gray-400">Mesajlar yükleniyor...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/user-dashboard" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mesajlar</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">İş ortaklarınızla mesajlaşın</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Konuşmalar</h2>
              </div>
              <ScrollArea className="h-[calc(100vh-300px)]">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Henüz mesajınız yok</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      İş ortaklarıyla mesajlaşmaya başlayın
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {conversations.map((conversation: ConversationWithPartner) => {
                      if (!user) return null;
                      const conversationId = `${Math.min(conversation.partnerId, user.id)}-${Math.max(conversation.partnerId, user.id)}`;
                      const isSelected = selectedConversation === conversationId;
                      
                      return (
                        <div
                          key={conversationId}
                          className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
                          }`}
                          onClick={() => handleConversationSelect(conversation)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={conversation.partner.logo} />
                              <AvatarFallback>
                                {conversation.partner.companyName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {conversation.partner.companyName}
                                </h3>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatTime(conversation.lastMessage.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                  {conversation.lastMessage.message}
                                </p>
                                {conversation.unreadCount > 0 && (
                                  <Badge variant="default" className="ml-2 bg-blue-500">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
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

          {/* Messages View */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0 h-full flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    {(() => {
                      if (!user) return null;
                      const conversation = conversations.find((c: ConversationWithPartner) => 
                        `${Math.min(c.partnerId, user.id)}-${Math.max(c.partnerId, user.id)}` === selectedConversation
                      );
                      return conversation ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conversation.partner.logo} />
                            <AvatarFallback>
                              {conversation.partner.companyName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {conversation.partner.companyName}
                          </h3>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="text-gray-500">Mesajlar yükleniyor...</div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <MessageSquare className="h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">Henüz mesaj yok</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                          İlk mesajı göndererek konuşmayı başlatın
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message: Message) => {
                          if (!user) return null;
                          const isOwn = message.senderId === user.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                                  isOwn
                                    ? 'bg-blue-500 text-white rounded-br-md ml-auto'
                                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-600'
                                }`}
                                style={{
                                  wordWrap: 'break-word',
                                  borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                                }}
                              >
                                <p className="text-sm leading-relaxed">{message.message}</p>
                                <p className={`text-xs mt-1 ${
                                  isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {formatTime(message.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1 relative">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Mesajınızı yazın..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={sendMessageMutation.isPending}
                          className="min-h-[44px] rounded-3xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 px-4 py-3 pr-12 resize-none"
                          data-testid="input-message"
                        />
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        size="icon"
                        className="h-[44px] w-[44px] rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                        data-testid="button-send-message"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Mesajlaşmaya Başlayın
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Sol taraftan bir konuşma seçin veya yeni bir mesaj başlatın
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}