import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Search,
  Building,
  User as UserIcon,
  Clock
} from 'lucide-react';
import { Message, Partner, User } from '@shared/schema';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

interface Conversation {
  partnerId: number;
  partner: Partner;
  lastMessage: Message;
  unreadCount: number;
  messages: Message[];
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/user/conversations'],
    enabled: !!user,
  });

  // Fetch all partners for new chat
  const { data: allPartners, isLoading: partnersLoading } = useQuery<Partner[]>({
    queryKey: ['/api/partners'],
    enabled: newChatOpen,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { partnerId: number; message: string }) => {
      const conversationId = `${user!.id}-${data.partnerId}`;
      const res = await apiRequest('POST', '/api/messages', {
        conversationId,
        receiverId: data.partnerId,
        message: data.message,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/conversations'] });
      setNewMessage('');
      toast({
        title: 'Başarılı',
        description: 'Mesaj gönderildi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Mesaj gönderilirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Start new conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      const conversationId = `${user!.id}-${partnerId}`;
      const res = await apiRequest('POST', '/api/messages', {
        conversationId,
        receiverId: partnerId,
        message: 'Merhaba, hizmetleriniz hakkında bilgi almak istiyorum.',
      });
      return res.json();
    },
    onSuccess: (data, partnerId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/conversations'] });
      setSelectedConversation(partnerId);
      setNewChatOpen(false);
      toast({
        title: 'Başarılı',
        description: 'Yeni sohbet başlatıldı.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Sohbet başlatılırken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      partnerId: selectedConversation,
      message: newMessage.trim(),
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredPartners = allPartners?.filter(partner =>
    partner.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.serviceCategory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConversationData = conversations?.find(c => c.partnerId === selectedConversation);

  if (!user) {
    return <div>Yetkilendirme gerekli...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sohbet</h1>
                <p className="text-gray-600 mt-2 text-sm sm:text-base">Partnerlerle mesajlaşın</p>
              </div>
              
              <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Yeni Sohbet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl mx-4">
                <DialogHeader>
                  <DialogTitle>Yeni Sohbet Başlat</DialogTitle>
                  <DialogDescription>
                    Mesajlaşmak istediğiniz partneri seçin
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Partner veya kategori ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-[300px] sm:h-[400px]">
                    {partnersLoading ? (
                      <div className="text-center py-8">Yükleniyor...</div>
                    ) : filteredPartners?.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Partner bulunamadı</h3>
                        <p className="mt-1 text-sm text-gray-500">Arama kriterlerinizi değiştirmeyi deneyin.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {filteredPartners?.map((partner) => (
                          <Card key={partner.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Building className="h-4 w-4 text-gray-500" />
                                    <h3 className="font-semibold">{partner.companyName}</h3>
                                    <Badge variant="secondary" className="text-xs">
                                      {partner.serviceCategory}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {partner.shortDescription || partner.description?.substring(0, 100) + '...'}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => startConversationMutation.mutate(partner.id)}
                                  disabled={startConversationMutation.isPending}
                                  className="ml-3"
                                >
                                  Mesaj Gönder
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 pb-8" style={{ minHeight: '600px' }}>
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Sohbetler
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] sm:h-[500px]">
                {conversationsLoading ? (
                  <div className="text-center py-8">Yükleniyor...</div>
                ) : !conversations || conversations.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz sohbet yok</h3>
                    <p className="mt-1 text-sm text-gray-500">Yeni sohbet başlatın.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.partnerId}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedConversation === conversation.partnerId ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                        onClick={() => setSelectedConversation(conversation.partnerId)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="font-semibold text-sm truncate">
                                {conversation.partner.companyName}
                              </span>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate">
                              {conversation.lastMessage.message}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-400">
                                {conversation.lastMessage?.createdAt ? formatTime(conversation.lastMessage.createdAt) : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="lg:col-span-2">
            {selectedConversationData ? (
              <>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {selectedConversationData.partner.companyName}
                  </CardTitle>
                  <CardDescription>
                    {selectedConversationData.partner.serviceCategory}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex flex-col" style={{ height: '60vh', minHeight: '400px' }}>
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {selectedConversationData.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              message.senderId === user.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className={`text-xs ${
                                message.senderId === user.id ? 'text-blue-200' : 'text-gray-500'
                              }`}>
                                {message.createdAt ? formatTime(message.createdAt) : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Send Message Form */}
                  <div className="border-t p-4">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        placeholder="Mesajınızı yazın..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        type="submit" 
                        disabled={sendMessageMutation.isPending || !newMessage.trim()}
                        className="flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Gönder
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center" style={{ height: '60vh', minHeight: '400px' }}>
                <div className="text-center">
                  <MessageCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Sohbet seçin</h3>
                  <p className="text-gray-500">Mesajlaşmak için soldaki listeden bir sohbet seçin</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}