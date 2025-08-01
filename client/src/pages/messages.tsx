import { useState } from "react";
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
  const queryClient = useQueryClient();

  // Fetch user's conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/user/conversations"],
    queryFn: async () => {
      const response = await fetch("/api/user/conversations");
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json() as Conversation[];
    },
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const response = await fetch(`/api/conversations/${selectedConversation}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json() as Message[];
    },
    enabled: !!selectedConversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { receiverId: number; content: string }) => {
      return apiRequest("/api/messages", {
        method: "POST",
        body: JSON.stringify(messageData),
      });
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
      return apiRequest(`/api/conversations/${conversationId}/read`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/user/conversations"],
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    const conversation = conversations.find(c => 
      `${Math.min(c.partnerId, 6)}-${Math.max(c.partnerId, 6)}` === selectedConversation
    );
    
    if (conversation) {
      sendMessageMutation.mutate({
        receiverId: conversation.partnerId,
        content: newMessage.trim(),
      });
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    const conversationId = `${Math.min(conversation.partnerId, 6)}-${Math.max(conversation.partnerId, 6)}`;
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

  if (conversationsLoading) {
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
                    {conversations.map((conversation) => {
                      const conversationId = `${Math.min(conversation.partnerId, 6)}-${Math.max(conversation.partnerId, 6)}`;
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
                      const conversation = conversations.find(c => 
                        `${Math.min(c.partnerId, 6)}-${Math.max(c.partnerId, 6)}` === selectedConversation
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
                        {messages.map((message) => {
                          const isOwn = message.senderId === 6; // Current user ID
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  isOwn
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                                }`}
                              >
                                <p className="text-sm">{message.message}</p>
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
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
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