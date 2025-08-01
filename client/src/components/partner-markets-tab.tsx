import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, X, Globe, Search, Trash2, Info } from 'lucide-react';

interface Market {
  id: number;
  name: string;
  nameEn?: string;
  region?: string;
  isActive: boolean;
}

export function PartnerMarketsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddMarketDialogOpen, setIsAddMarketDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [showNewMarketDialog, setShowNewMarketDialog] = useState(false);
  const [newMarketData, setNewMarketData] = useState({
    name: "",
    nameEn: "",
    region: ""
  });

  // Fetch partner data to get partner ID
  const { data: partnerData } = useQuery({
    queryKey: ['/api/partners/me'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/partners/me');
      return res.json();
    },
    enabled: !!user
  });

  const partnerId = partnerData?.id;

  // Fetch all available markets
  const { data: allMarkets = [] } = useQuery<Market[]>({
    queryKey: ['/api/markets'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/markets');
      return res.json();
    }
  });

  // Fetch partner's selected markets
  const { data: partnerMarkets = [] } = useQuery<Market[]>({
    queryKey: ['/api/partner/markets'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/partner/markets');
      return res.json();
    },
    enabled: !!user
  });

  // Add market to partner
  const addMarketMutation = useMutation({
    mutationFn: async (marketId: number) => {
      const res = await apiRequest('POST', '/api/partner/markets', { marketId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/markets'] });
      toast({ title: 'Pazar başarıyla eklendi' });
      setIsAddMarketDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Pazar eklenirken bir hata oluştu', variant: 'destructive' });
    }
  });

  // Remove market from partner
  const removeMarketMutation = useMutation({
    mutationFn: async (marketId: number) => {
      const res = await apiRequest('DELETE', `/api/partner/markets/${marketId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/markets'] });
      toast({ title: 'Pazar başarıyla kaldırıldı' });
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Pazar kaldırılırken bir hata oluştu', variant: 'destructive' });
    }
  });

  // Create new market
  const createMarketMutation = useMutation({
    mutationFn: async (marketData: { name: string; nameEn?: string; region?: string }) => {
      const res = await apiRequest('POST', '/api/partner/markets/new', marketData);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/markets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/markets'] });
      setShowNewMarketDialog(false);
      setNewMarketData({ name: "", nameEn: "", region: "" });
      toast({
        title: "Başarılı",
        description: data.message || "Yeni pazar oluşturuldu ve profilinize eklendi"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Pazar oluşturulurken hata oluştu",
        variant: "destructive"
      });
    }
  });

  // Filter available markets (not already selected by partner)
  const availableMarkets = allMarkets.filter(market => 
    market.isActive && 
    !partnerMarkets.some(pm => pm.id === market.id) &&
    (selectedRegion === 'all' || market.region === selectedRegion) &&
    (searchTerm === '' || 
     market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (market.nameEn && market.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (market.region && market.region.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  // Get unique regions for filter
  const regions = Array.from(new Set(allMarkets.map(m => m.region).filter(Boolean)));

  if (!partnerId) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            Partner bilgileri yükleniyor...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Hedef Pazarlar Nedir?
              </h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>Hedef pazarlar, hizmet verdiğiniz ülke ve bölgeleri belirtir. Bu bilgiler:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Müşterilerin size uygun partneri bulmasını kolaylaştırır</li>
                  <li>Profilinizde pazarlara özel filtreleme sağlar</li>
                  <li>İlgili müşteri taleplerinin size yönlendirilmesini artırır</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Markets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Hedef Pazarlarınız
              </CardTitle>
              <CardDescription>
                Hizmet verdiğiniz ülke ve bölgeler
              </CardDescription>
            </div>
            <Dialog open={isAddMarketDialogOpen} onOpenChange={setIsAddMarketDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Pazar Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Yeni Pazar Ekle</DialogTitle>
                  <DialogDescription>
                    Hizmet verdiğiniz yeni bir pazar ekleyin
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Search and Filter */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="search">Pazar Ara</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="search"
                          placeholder="Ülke, bölge veya pazar adı ara..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="w-48">
                      <Label htmlFor="region">Bölge Filtresi</Label>
                      <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Bölgeler</SelectItem>
                          {regions.map(region => (
                            <SelectItem key={region} value={region || ''}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Available Markets */}
                  <div className="max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {availableMarkets.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          {searchTerm || selectedRegion !== 'all' 
                            ? 'Arama kriterlerinize uygun pazar bulunamadı'
                            : 'Eklenebilecek pazar bulunmuyor'
                          }
                        </div>
                      ) : (
                        availableMarkets.map(market => (
                          <div
                            key={market.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <Globe className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{market.name}</span>
                                  {market.nameEn && (
                                    <span className="text-gray-500 text-sm">({market.nameEn})</span>
                                  )}
                                  {market.region && (
                                    <Badge variant="outline" className="text-xs">
                                      {market.region}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addMarketMutation.mutate(market.id)}
                              disabled={addMarketMutation.isPending}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Ekle
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Create New Market Button */}
                  <div className="border-t pt-4 mt-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-3">
                        Aradığınız pazar bulunamadı mı?
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddMarketDialogOpen(false);
                          setShowNewMarketDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Pazar Oluştur
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {partnerMarkets.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Henüz hedef pazar eklenmemiş
              </h3>
              <p className="text-gray-600 mb-4">
                Hizmet verdiğiniz ülke ve bölgeleri ekleyerek daha fazla müşteriye ulaşın.
              </p>
              <Button onClick={() => setIsAddMarketDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                İlk Pazarınızı Ekleyin
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partnerMarkets.map(market => (
                <div
                  key={market.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{market.name}</span>
                        {market.nameEn && (
                          <span className="text-gray-500 text-sm">({market.nameEn})</span>
                        )}
                      </div>
                      {market.region && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {market.region}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`"${market.name}" pazarını kaldırmak istediğinizden emin misiniz?`)) {
                        removeMarketMutation.mutate(market.id);
                      }
                    }}
                    disabled={removeMarketMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Market Dialog */}
      <Dialog open={showNewMarketDialog} onOpenChange={setShowNewMarketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Pazar Oluştur</DialogTitle>
            <DialogDescription>
              Sistemde bulunmayan yeni bir pazar oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newMarketName">Pazar Adı (Türkçe) *</Label>
              <Input
                id="newMarketName"
                value={newMarketData.name}
                onChange={(e) => setNewMarketData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: Hollanda"
              />
            </div>
            <div>
              <Label htmlFor="newMarketNameEn">Pazar Adı (İngilizce)</Label>
              <Input
                id="newMarketNameEn"
                value={newMarketData.nameEn}
                onChange={(e) => setNewMarketData(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="Örn: Netherlands"
              />
            </div>
            <div>
              <Label htmlFor="newMarketRegion">Bölge</Label>
              <Input
                id="newMarketRegion"
                value={newMarketData.region}
                onChange={(e) => setNewMarketData(prev => ({ ...prev, region: e.target.value }))}
                placeholder="Örn: Avrupa"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewMarketDialog(false);
                  setNewMarketData({ name: "", nameEn: "", region: "" });
                }}
              >
                İptal
              </Button>
              <Button
                onClick={() => {
                  if (newMarketData.name.trim()) {
                    createMarketMutation.mutate({
                      name: newMarketData.name.trim(),
                      nameEn: newMarketData.nameEn.trim() || undefined,
                      region: newMarketData.region.trim() || undefined
                    });
                  }
                }}
                disabled={!newMarketData.name.trim() || createMarketMutation.isPending}
              >
                {createMarketMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur ve Ekle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}