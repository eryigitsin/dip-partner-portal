import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Check, CheckCheck, MessageSquare, Building2, User, AlertCircle, TrendingUp, Mail, Settings, Clock, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import Footer from '@/components/layout/footer';
import { Header } from '@/components/layout/header';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

interface NotificationResponse {
  notifications: Notification[];
  totalCount: number;
  hasMore: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'quote_request':
    case 'quote_response':
      return <MessageSquare className="h-5 w-5 text-blue-600" />;
    case 'partner_application':
      return <Building2 className="h-5 w-5 text-green-600" />;
    case 'follower':
      return <User className="h-5 w-5 text-purple-600" />;
    case 'project_update':
      return <TrendingUp className="h-5 w-5 text-orange-600" />;
    case 'feedback':
      return <MessageSquare className="h-5 w-5 text-yellow-600" />;
    case 'newsletter_subscriber':
      return <Mail className="h-5 w-5 text-indigo-600" />;
    case 'system_status':
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case 'partner_post':
      return <Bell className="h-5 w-5 text-pink-600" />;
    case 'campaign':
      return <TrendingUp className="h-5 w-5 text-teal-600" />;
    default:
      return <Bell className="h-5 w-5 text-gray-600" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'quote_request':
    case 'quote_response':
      return 'bg-blue-100 border-blue-200';
    case 'partner_application':
      return 'bg-green-100 border-green-200';
    case 'follower':
      return 'bg-purple-100 border-purple-200';
    case 'project_update':
      return 'bg-orange-100 border-orange-200';
    case 'feedback':
      return 'bg-yellow-100 border-yellow-200';
    case 'newsletter_subscriber':
      return 'bg-indigo-100 border-indigo-200';
    case 'system_status':
      return 'bg-red-100 border-red-200';
    case 'partner_post':
      return 'bg-pink-100 border-pink-200';
    case 'campaign':
      return 'bg-teal-100 border-teal-200';
    default:
      return 'bg-gray-100 border-gray-200';
  }
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: notificationData, isLoading } = useQuery<NotificationResponse>({
    queryKey: ['/api/notifications', page],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/notifications?page=${page}&limit=20`);
      return await response.json();
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', '/api/notifications/mark-all-read');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith('http')) {
        window.open(notification.actionUrl, '_blank');
      } else {
        setLocation(notification.actionUrl);
      }
    }
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Bildirimlerinizi görüntülemek için giriş yapın.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bildirimler</h1>
                <p className="text-gray-600">
                  Tüm güncellemelerinizi buradan takip edebilirsiniz
                </p>
              </div>
            </div>
            {notificationData?.notifications.some(n => !n.isRead) && (
              <Button
                onClick={handleMarkAllRead}
                disabled={markAllAsReadMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="h-4 w-4" />
                Tümünü Okundu İşaretle
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : !notificationData?.notifications.length ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz bildirim yok</h3>
                  <p className="text-gray-500">
                    Yeni aktiviteler olduğunda burada görünecektir.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notificationData.notifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-blue-50 hover:bg-blue-100' : 'bg-gray-50 hover:bg-gray-100 opacity-75'
                      }`}
                      data-testid={`notification-item-${notification.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                  locale: tr
                                })}
                              </span>
                              {!notification.isRead ? (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              ) : (
                                <Check className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                          
                          <p className={`text-sm ${
                            !notification.isRead ? 'text-gray-800' : 'text-gray-400'
                          }`}>
                            {notification.message}
                          </p>
                          
                          {notification.actionUrl && (
                            <div className="flex items-center gap-1 mt-2">
                              <ExternalLink className="h-3 w-3 text-blue-600" />
                              <span className="text-xs text-blue-600">
                                {notification.actionUrl.startsWith('http') ? 'Dış bağlantı' : 'Detay'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {notificationData?.hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setPage(p => p + 1)}
                variant="outline"
                data-testid="button-load-more"
              >
                Daha Fazla Yükle
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}