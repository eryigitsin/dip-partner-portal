import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText,
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

export function QuoteRequestsEmbedded() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Teklif Talepleri ({totalRequests})</span>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {pendingRequests} beklemede • {respondedRequests} yanıtlandı
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
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
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedStatus === 'all' ? 'Teklif talebi bulunmuyor' : `${selectedStatus} durumunda teklif talebi bulunmuyor`}
            </h3>
            <p className="text-gray-600">
              Kullanıcılar teklif talep ettiğinde burada görünecekler.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Hizmet</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
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
                        {request.budget && (
                          <p className="text-xs text-gray-500">Bütçe: {request.budget}</p>
                        )}
                      </div>
                    </TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}