import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

interface NotificationsDropdownProps {
  unreadCount?: { count: number };
}

export function NotificationsDropdown({ unreadCount }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery<{
    notifications: Notification[];
    totalCount: number;
    hasMore: boolean;
  }>({
    queryKey: ['/api/notifications', 1, 10], // page, limit
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/notifications?page=1&limit=10');
      return await response.json();
    },
    enabled: isOpen,
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
      window.location.href = notification.actionUrl;
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-3 w-3";
    switch (type) {
      case 'quote_request':
        return <div className={`${iconClass} bg-blue-500 rounded-full`} />;
      case 'quote_response':
        return <div className={`${iconClass} bg-green-500 rounded-full`} />;
      case 'partner_application':
        return <div className={`${iconClass} bg-purple-500 rounded-full`} />;
      case 'project_update':
        return <div className={`${iconClass} bg-orange-500 rounded-full`} />;
      case 'follower':
        return <div className={`${iconClass} bg-pink-500 rounded-full`} />;
      case 'feedback':
        return <div className={`${iconClass} bg-yellow-500 rounded-full`} />;
      case 'system_status':
        return <div className={`${iconClass} bg-red-500 rounded-full`} />;
      default:
        return <div className={`${iconClass} bg-gray-500 rounded-full`} />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5 text-gray-600 hover:text-gray-900" />
          {unreadCount && unreadCount.count > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount.count > 99 ? '99+' : unreadCount.count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-96"
        data-testid="notifications-dropdown"
      >
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Bildirimler</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/notifications'}
              className="h-7 text-xs flex-1"
              data-testid="button-view-all"
            >
              Tümünü Gör
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="h-7 text-xs flex-1"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Tümünü Okunmuş İşaretle
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Bildirimler yükleniyor...
            </div>
          ) : !notifications || !notifications.notifications || notifications.notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Henüz bildiriminiz yok
            </div>
          ) : (
            <div className="py-1">
              {notifications?.notifications?.map((notification: Notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-3 cursor-pointer border-b border-gray-50 last:border-b-0 ${
                    !notification.isRead ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: tr
                          })}
                        </p>
                        {notification.actionUrl && (
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}