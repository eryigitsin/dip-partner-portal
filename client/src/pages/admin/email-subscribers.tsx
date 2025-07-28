import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Users, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailSubscriber {
  id: number;
  userId: number;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string;
}

export default function EmailSubscribers() {
  // Get all email subscribers
  const { data: subscribers, isLoading } = useQuery({
    queryKey: ["/api/admin/email-subscribers"],
  });

  const exportSubscribers = () => {
    if (!subscribers) return;
    
    const csvContent = [
      ['E-posta', 'Durum', 'Abone Olma Tarihi', 'Abonelik İptal Tarihi'].join(','),
      ...subscribers.map((sub: EmailSubscriber) => [
        sub.email,
        sub.isActive ? 'Aktif' : 'İptal Edilmiş',
        new Date(sub.subscribedAt).toLocaleDateString('tr-TR'),
        sub.unsubscribedAt ? new Date(sub.unsubscribedAt).toLocaleDateString('tr-TR') : ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `email-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeSubscribers = subscribers?.filter((sub: EmailSubscriber) => sub.isActive) || [];
  const inactiveSubscribers = subscribers?.filter((sub: EmailSubscriber) => !sub.isActive) || [];

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">E-Posta Aboneleri</h1>
            <p className="text-gray-600">Platform e-posta listesi yönetimi</p>
          </div>
        </div>
        <Button onClick={exportSubscribers} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          CSV İndir
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Aktif Aboneler</p>
                <p className="text-2xl font-bold text-green-600">{activeSubscribers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">İptal Edilmiş</p>
                <p className="text-2xl font-bold text-red-600">{inactiveSubscribers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Toplam</p>
                <p className="text-2xl font-bold text-blue-600">{subscribers?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Subscribers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Aktif E-Posta Aboneleri
          </CardTitle>
          <CardDescription>
            E-posta bildirimleri almayı kabul eden kullanıcılar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSubscribers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Henüz aktif abone bulunmuyor</p>
          ) : (
            <div className="space-y-2">
              {activeSubscribers.map((subscriber: EmailSubscriber) => (
                <div
                  key={subscriber.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{subscriber.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Aktif
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(subscriber.subscribedAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Subscribers */}
      {inactiveSubscribers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-red-600" />
              İptal Edilmiş Abonelikler
            </CardTitle>
            <CardDescription>
              E-posta bildirimlerini iptal eden kullanıcılar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inactiveSubscribers.map((subscriber: EmailSubscriber) => (
                <div
                  key={subscriber.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-gray-600">{subscriber.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      İptal Edilmiş
                    </Badge>
                    {subscriber.unsubscribedAt && (
                      <span className="text-sm text-gray-500">
                        İptal: {new Date(subscriber.unsubscribedAt).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}