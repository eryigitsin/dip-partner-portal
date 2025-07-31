import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Building2, Shield } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User as SelectUser } from '@shared/schema';

interface AccountTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  availableTypes: string[];
  currentType: string;
}

export function AccountTypeSelector({ isOpen, onClose, availableTypes, currentType }: AccountTypeSelectorProps) {
  const { toast } = useToast();

  const switchAccountMutation = useMutation({
    mutationFn: async (userType: string) => {
      const response = await apiRequest('POST', '/api/auth/switch-account-type', { userType });
      return response.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Hesap türü değiştirildi",
        description: `${getAccountTypeLabel(user.activeUserType)} hesabına geçiş yapıldı`,
      });
      onClose();
      
      // Navigate based on account type
      if (user.activeUserType === 'partner') {
        window.location.href = '/partner-dashboard';
      } else if (user.activeUserType === 'user') {
        window.location.href = '/user-panel';
      } else if (user.activeUserType === 'master_admin' || user.activeUserType === 'editor_admin') {
        window.location.href = '/admin-dashboard';
      }
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Hesap türü değiştirilemedi",
        variant: "destructive",
      });
    },
  });

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'user':
        return 'Kullanıcı';
      case 'partner':
        return 'İş Ortağı';
      case 'master_admin':
        return 'Yönetici';
      case 'editor_admin':
        return 'Editör';
      default:
        return type;
    }
  };

  const getAccountTypeDescription = (type: string) => {
    switch (type) {
      case 'user':
        return 'Hizmet alma, teklif isteme ve DİP platformunu kullanma';
      case 'partner':
        return 'Hizmet sunma, partner paneli ve müşteri yönetimi';
      case 'master_admin':
        return 'Tam yönetici erişimi';
      case 'editor_admin':
        return 'Sınırlı yönetici erişimi';
      default:
        return '';
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="h-8 w-8 text-blue-600" />;
      case 'partner':
        return <Building2 className="h-8 w-8 text-green-600" />;
      case 'master_admin':
      case 'editor_admin':
        return <Shield className="h-8 w-8 text-purple-600" />;
      default:
        return <User className="h-8 w-8 text-gray-600" />;
    }
  };

  const getCardStyle = (type: string) => {
    if (type === currentType) {
      return "border-2 border-blue-500 bg-blue-50";
    }
    return "border border-gray-200 hover:border-gray-300 cursor-pointer";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Hesap Türü Seçin
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Hangi hesap türüyle devam etmek istiyorsunuz?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {availableTypes.map((type) => (
            <Card 
              key={type} 
              className={getCardStyle(type)}
              onClick={() => type !== currentType && switchAccountMutation.mutate(type)}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getAccountTypeIcon(type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getAccountTypeLabel(type)}
                      {type === currentType && (
                        <span className="ml-2 text-sm font-normal text-blue-600">
                          (Aktif)
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {getAccountTypeDescription(type)}
                    </p>
                  </div>
                  {type !== currentType && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={switchAccountMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        switchAccountMutation.mutate(type);
                      }}
                    >
                      {switchAccountMutation.isPending ? 'Değiştiriliyor...' : 'Seç'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}