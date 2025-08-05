import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bell, Check, MessageSquare, Building2, User, AlertCircle, TrendingUp, Mail, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

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
      return <MessageSquare className="h-4 w-4 text-blue-600" />;
    case 'partner_application':
      return <Building2 className="h-4 w-4 text-green-600" />;
    case 'follower':
      return <User className="h-4 w-4 text-purple-600" />;
    case 'project_update':
      return <TrendingUp className="h-4 w-4 text-orange-600" />;
    case 'feedback':
      return <MessageSquare className="h-4 w-4 text-yellow-600" />;
    case 'newsletter_subscriber':
      return <Mail className="h-4 w-4 text-indigo-600" />;
    case 'system_status':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'partner_post':
      return <Bell className="h-4 w-4 text-pink-600" />;
    case 'campaign':
      return <TrendingUp className="h-4 w-4 text-teal-600" />;
    default:
      return <Bell className="h-4 w-4 text-gray-600" />;
  }
};

interface NotificationsDropdownProps {
  unreadCount?: { count: number };
}

export function NotificationsDropdown({ unreadCount }: NotificationsDropdownProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notificationData, isLoading } = useQuery<NotificationResponse>({
    queryKey: ['/api/notifications', 1],
    enabled: isOpen,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/${notificationId}/read`, 'PATCH');
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
    
    setIsOpen(false);
    
    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith('http')) {
        window.open(notification.actionUrl, '_blank');
      } else {
        setLocation(notification.actionUrl);
      }
    }
  };

  const handleSeeAll = () => {
    setIsOpen(false);
    setLocation('/notifications');
  };

  const recentNotifications = notificationData?.notifications.slice(0, 5) || [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2"
          data-testid="button-notifications-dropdown"
        >
          <Bell className="h-5 w-5 text-gray-600 hover:text-gray-900" />
          {unreadCount && unreadCount.count > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount.count > 99 ? '99+' : unreadCount.count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Bildirimler</h3>
            <Button
              onClick={handleSeeAll}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 h-auto p-1"
              data-testid="button-see-all-notifications"
            >
              Tümünü Gör
            </Button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !recentNotifications.length ? (
            <div className="text-center py-8 px-4">
              <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Henüz bildirim yok</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                  }`}
                  data-testid={`notification-dropdown-item-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium truncate ${
                          !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2"></div>
                        )}
                      </div>
                      
                      <p className={`text-xs line-clamp-2 ${
                        !notification.isRead ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: tr
                          })}
                        </span>
                        
                        {notification.actionUrl && (
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {recentNotifications.length > 0 && (
          <>
            <Separator />
            <div className="p-3">
              <Button
                onClick={handleSeeAll}
                variant="ghost"
                size="sm"
                className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                data-testid="button-see-all-bottom"
              >
                Tüm Bildirimleri Görüntüle
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}