import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  X, 
  Minimize2, 
  Send, 
  Users,
  ChevronDown,
  Download,
  File
} from 'lucide-react';
import { FileUploader } from '@/components/FileUploader';

interface Partner {
  id: number;
  userId: number;
  companyName: string;
  logo?: string;
}

interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  fileUrl?: string;
  fileName?: string;
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

export function ChatPopup() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showPartnerList, setShowPartnerList] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{fileName: string, fileUrl: string} | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch partners for new conversations
  const { data: partners = [] } = useQuery<Partner[]>({
    queryKey: ['/api/partners'],
    enabled: isAuthenticated
  });

  // Fetch user conversations
  const { data: conversationsData = [] } = useQuery<ConversationData[]>({
    queryKey: ['/api/user/conversations'],
    enabled: isAuthenticated,
    refetchInterval: 3000, // Refresh every 3 seconds for real-time effect
  });

  // Fetch messages for selected conversation
  const conversationId = selectedConversation?.partnerId && user?.id ? 
    `${Math.min(user.id, selectedConversation.partnerId)}-${Math.max(user.id, selectedConversation.partnerId)}` : 
    null;
    
  const { data: conversationMessages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    enabled: !!selectedConversation && !!user && !!conversationId,
    refetchInterval: 2000, // Refresh every 2 seconds for real-time effect
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  // Show notification for new messages
  useEffect(() => {
    if (!conversationMessages.length || !user) return;
    
    const latestMessage = conversationMessages[conversationMessages.length - 1];
    if (latestMessage && latestMessage.senderId !== user.id && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const partner = partners.find(p => p.userId === latestMessage.senderId);
        new Notification(`${partner?.companyName || 'Partner'} mesaj gönderdi`, {
          body: latestMessage.message,
          icon: partner?.logo
        });
      }
    }
  }, [conversationMessages, user?.id, partners]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendMessage = useMutation({
    mutationFn: async (data: { 
      message: string; 
      conversationId: string; 
      recipientId: number;
      fileUrl?: string;
      fileName?: string;
    }) => {
      return apiRequest('POST', '/api/messages', data);
    },
    onSuccess: () => {
      setNewMessage('');
      setSelectedFile(null);
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

  const handleSendMessage = () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !user) return;

    const conversationId = `${Math.min(user.id, selectedConversation.partnerId)}-${Math.max(user.id, selectedConversation.partnerId)}`;
    
    sendMessage.mutate({
      message: newMessage.trim() || (selectedFile ? 'Dosya gönderildi' : ''),
      conversationId: conversationId,
      recipientId: selectedConversation.partnerId,
      fileUrl: selectedFile?.fileUrl,
      fileName: selectedFile?.fileName
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createConversationWithPartner = (partner: Partner) => {
    // Check if conversation already exists
    const existingConversation = conversationsData.find(conv => conv.partnerId === partner.userId);
    if (existingConversation) {
      setSelectedConversation(existingConversation);
      setShowPartnerList(false);
      return;
    }

    // Create new conversation data structure
    const newConversation: ConversationData = {
      partnerId: partner.userId,
      partner: partner,
      lastMessage: {
        id: 0,
        senderId: user!.id,
        receiverId: partner.userId,
        message: '',
        createdAt: new Date().toISOString(),
        isRead: false
      },
      unreadCount: 0,
      messages: []
    };

    setSelectedConversation(newConversation);
    setShowPartnerList(false);
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

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            data-testid="button-open-chat"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-semibold">
                {selectedConversation 
                  ? partners.find(p => p.userId === selectedConversation.partnerId)?.companyName || 'Partner'
                  : 'Mesajlar'
                }
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-blue-700 p-1 h-auto"
              >
                {isMinimized ? <ChevronDown className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-blue-700 p-1 h-auto"
                data-testid="button-close-chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {!selectedConversation ? (
                // Conversations List
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    {user?.userType !== 'partner' && (
                      <Button
                        onClick={() => setShowPartnerList(!showPartnerList)}
                        className="w-full text-sm"
                        variant="outline"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Yeni Konuşma Başlat
                      </Button>
                    )}
                  </div>

                  {showPartnerList && (
                    <div className="border-b border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
                      {partners.map((partner) => (
                        <div
                          key={partner.id}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600"
                          onClick={() => createConversationWithPartner(partner)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={partner.logo} />
                              <AvatarFallback className="text-xs">
                                {partner.companyName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {partner.companyName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <ScrollArea className="flex-1">
                    {conversationsData.length === 0 ? (
                      <div className="p-6 text-center">
                        <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Henüz konuşmanız yok</p>
                      </div>
                    ) : (
                      <div>
                        {conversationsData.map((conversation) => {
                          return (
                            <div
                              key={conversation.partnerId}
                              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600"
                              onClick={() => setSelectedConversation(conversation)}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={conversation.partner?.logo} />
                                  <AvatarFallback>
                                    {(conversation.partner?.companyName || 'Partner').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {conversation.partner?.companyName || 'Partner'}
                                    </h4>
                                    {conversation.lastMessage && (
                                      <span className="text-xs text-gray-500">
                                        {formatTime(conversation.lastMessage.createdAt)}
                                      </span>
                                    )}
                                  </div>
                                  {conversation.lastMessage && (
                                    <p className="text-xs text-gray-500 truncate">
                                      {conversation.lastMessage.message}
                                    </p>
                                  )}
                                </div>
                                {conversation.unreadCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              ) : (
                // Chat View
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversation(null)}
                      className="text-sm"
                    >
                      ← Geri Dön
                    </Button>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {conversationMessages.map((message) => {
                          const isFromUser = message.senderId === user?.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isFromUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                  isFromUser
                                    ? 'bg-blue-500 text-white rounded-br-none'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                                } shadow-sm`}
                              >
                                <p className="text-sm">{message.message}</p>
                                
                                {/* File attachment */}
                                {message.fileUrl && message.fileName && (
                                  <div className="mt-2 p-2 bg-white bg-opacity-20 rounded-md">
                                    <div className="flex items-center gap-2">
                                      <File className="w-4 h-4" />
                                      <a 
                                        href={message.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm hover:underline flex-1 truncate"
                                        data-testid="link-file-attachment"
                                      >
                                        {message.fileName}
                                      </a>
                                      <Download className="w-4 h-4" />
                                    </div>
                                  </div>
                                )}
                                
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
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    {/* File upload section */}
                    <div className="flex items-center gap-2">
                      <FileUploader
                        onFileSelect={(fileUrl, fileName) => setSelectedFile({ fileUrl, fileName })}
                        onFileRemove={() => setSelectedFile(null)}
                        selectedFile={selectedFile}
                        disabled={sendMessage.isPending}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Mesajınızı yazın..."
                        disabled={sendMessage.isPending}
                        className="flex-1 text-sm"
                        data-testid="input-chat-message"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !selectedFile) || sendMessage.isPending}
                        size="sm"
                        data-testid="button-send-chat-message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}