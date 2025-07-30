import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText,
  Building,
  User,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface QuoteRequest {
  id: number;
  userId: number;
  partnerId: number;
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  serviceNeeded: string;
  budget: string;
  message: string;
  status: 'pending' | 'responded' | 'accepted' | 'completed' | 'rejected';
  createdAt: string;
  updatedAt: string;
  partner?: {
    id: number;
    companyName: string;
    logo: string;
  };
}

export default function QuoteRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Check admin access
  if (!user || (user.userType !== 'master_admin' && user.userType !== 'editor_admin')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Bu sayfaya erişim yetkiniz bulunmamaktadır
          </h1>
          <p className="text-gray-600">
            Teklif talepleri sayfasına erişebilmek için yönetici hesabınızla giriş yapmanız gerekmektedir.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  // Fetch all quote requests
  const { data: quoteRequests = [], isLoading } = useQuery<QuoteRequest[]>({
    queryKey: ['/api/admin/quote-requests'],
    queryFn: async () => {
      const response = await fetch('/api/admin/quote-requests');
      if (!response.ok) throw new Error('Teklif talepleri yüklenemedi');
      return response.json();
    },
  });

  // Update quote request status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/quote-requests/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quote-requests'] });
      toast({
        title: 'Başarılı',
        description: 'Teklif durumu güncellendi',
      });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Durum güncellenirken hata oluştu',
        variant: 'destructive',
      });
    },
  });

  // Filter requests by status
  const filteredRequests = selectedStatus === 'all' 
    ? quoteRequests 
    : quoteRequests.filter(req => req.status === selectedStatus);

  // Calculate statistics
  const totalRequests = quoteRequests.length;
  const pendingRequests = quoteRequests.filter(req => req.status === 'pending').length;
  const respondedRequests = quoteRequests.filter(req => req.status === 'responded').length;
  const completedRequests = quoteRequests.filter(req => req.status === 'completed').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Beklemede
        </Badge>;
      case 'responded':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Yanıtlandı
        </Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Kabul Edildi
        </Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Tamamlandı
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Reddedildi
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teklif Talepleri</h1>
          <p className="text-gray-600">Tüm teklif taleplerini görüntüleyin ve yönetin</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Talep</p>
                  <p className="text-2xl font-bold text-gray-900">{totalRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Beklemede</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Yanıtlandı</p>
                  <p className="text-2xl font-bold text-gray-900">{respondedRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tamamlandı</p>
                  <p className="text-2xl font-bold text-gray-900">{completedRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Duruma göre filtrele:</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="responded">Yanıtlandı</SelectItem>
                  <SelectItem value="accepted">Kabul Edildi</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quote Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Teklif Talepleri ({filteredRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Hizmet</TableHead>
                    <TableHead>Bütçe</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {selectedStatus === 'all' ? 'Henüz teklif talebi bulunmuyor' : `${selectedStatus} durumunda teklif talebi bulunmuyor`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.fullName}</p>
                            <p className="text-sm text-gray-500">{request.companyName}</p>
                            <p className="text-sm text-gray-500">{request.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {request.partner?.logo && (
                              <img 
                                src={request.partner.logo} 
                                alt={request.partner.companyName}
                                className="w-8 h-8 rounded object-cover"
                              />
                            )}
                            <span>{request.partner?.companyName || 'Partner Bulunamadı'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm truncate" title={request.serviceNeeded}>
                              {request.serviceNeeded}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{request.budget || 'Belirtilmemiş'}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{new Date(request.createdAt).toLocaleDateString('tr-TR')}</p>
                            <p className="text-gray-500">{new Date(request.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={request.status}
                            onValueChange={(value) => updateStatusMutation.mutate({ id: request.id, status: value })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Beklemede</SelectItem>
                              <SelectItem value="responded">Yanıtlandı</SelectItem>
                              <SelectItem value="accepted">Kabul Edildi</SelectItem>
                              <SelectItem value="completed">Tamamlandı</SelectItem>
                              <SelectItem value="rejected">Reddedildi</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}