import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X, Search, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Market {
  id: number;
  name: string;
  nameEn?: string;
  region?: string;
}

interface AdminMarketsManagementProps {
  partnerId?: number;
}

export function AdminMarketsManagement({ partnerId }: AdminMarketsManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewMarketDialog, setShowNewMarketDialog] = useState(false);
  const [newMarketData, setNewMarketData] = useState({
    name: "",
    nameEn: "",
    region: ""
  });

  // Fetch all available markets
  const { data: allMarkets = [], isLoading: marketsLoading } = useQuery({
    queryKey: ['/api/markets'],
    enabled: !!partnerId
  });

  // Fetch partner's current markets
  const { data: partnerMarkets = [], isLoading: partnerMarketsLoading } = useQuery({
    queryKey: ['/api/partners', partnerId, 'markets'],
    enabled: !!partnerId
  });

  // Add market to partner
  const addMarketMutation = useMutation({
    mutationFn: async (marketId: number) => {
      return apiRequest(`/api/partners/${partnerId}/markets`, 'POST', { marketId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partners', partnerId, 'markets'] });
      toast({
        title: "Başarılı",
        description: "Pazar başarıyla eklendi"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Pazar eklenirken hata oluştu",
        variant: "destructive"
      });
    }
  });

  // Remove market from partner
  const removeMarketMutation = useMutation({
    mutationFn: async (marketId: number) => {
      return apiRequest(`/api/partners/${partnerId}/markets/${marketId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partners', partnerId, 'markets'] });
      toast({
        title: "Başarılı",
        description: "Pazar başarıyla kaldırıldı"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Pazar kaldırılırken hata oluştu",
        variant: "destructive"
      });
    }
  });

  // Create new market
  const createMarketMutation = useMutation({
    mutationFn: async (marketData: { name: string; nameEn?: string; region?: string }) => {
      return apiRequest('/api/partner/markets/new', 'POST', marketData);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/markets'] });
      // Automatically add new market to current partner
      if (partnerId && data.market) {
        addMarketMutation.mutate(data.market.id);
      }
      setShowNewMarketDialog(false);
      setNewMarketData({ name: "", nameEn: "", region: "" });
      toast({
        title: "Başarılı",
        description: "Yeni pazar oluşturuldu ve partnere eklendi"
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

  if (!partnerId) {
    return <div className="text-sm text-gray-500">Partner seçiniz</div>;
  }

  const partnerMarketIds = (partnerMarkets as Market[]).map((market: Market) => market.id);
  const availableMarkets = (allMarkets as Market[]).filter((market: Market) => 
    !partnerMarketIds.includes(market.id) &&
    market.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPartnerMarkets = (partnerMarkets as Market[]).filter((market: Market) =>
    market.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search and Add New Market */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pazar ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={showNewMarketDialog} onOpenChange={setShowNewMarketDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-dip-blue hover:bg-dip-blue/90">
              <Plus className="h-4 w-4 mr-1" />
              Yeni Pazar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Pazar Ekle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="market-name">Pazar Adı *</Label>
                <Input
                  id="market-name"
                  value={newMarketData.name}
                  onChange={(e) => setNewMarketData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Örn: Orta Doğu"
                />
              </div>
              <div>
                <Label htmlFor="market-name-en">İngilizce Adı</Label>
                <Input
                  id="market-name-en"
                  value={newMarketData.nameEn}
                  onChange={(e) => setNewMarketData(prev => ({ ...prev, nameEn: e.target.value }))}
                  placeholder="Örn: Middle East"
                />
              </div>
              <div>
                <Label htmlFor="market-region">Bölge</Label>
                <Input
                  id="market-region"
                  value={newMarketData.region}
                  onChange={(e) => setNewMarketData(prev => ({ ...prev, region: e.target.value }))}
                  placeholder="Örn: Middle East"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewMarketDialog(false)}>
                  İptal
                </Button>
                <Button 
                  onClick={() => createMarketMutation.mutate(newMarketData)}
                  disabled={!newMarketData.name || createMarketMutation.isPending}
                >
                  {createMarketMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(marketsLoading || partnerMarketsLoading) ? (
        <div className="text-sm text-gray-500">Yükleniyor...</div>
      ) : (
        <>
          {/* Partner's Current Markets */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700">
              Seçili Pazarlar ({partnerMarkets.length})
            </h4>
            <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-3 border rounded-md bg-gray-50">
              {filteredPartnerMarkets.length === 0 ? (
                <span className="text-sm text-gray-400">
                  {searchTerm ? "Arama sonucu bulunamadı" : "Henüz pazar seçilmemiş"}
                </span>
              ) : (
                filteredPartnerMarkets.map((market: Market) => (
                  <Badge 
                    key={market.id} 
                    variant="default" 
                    className="bg-dip-blue text-white hover:bg-dip-blue/90 cursor-pointer group"
                  >
                    <Globe className="h-3 w-3 mr-1" />
                    {market.name}
                    {market.region && (
                      <span className="ml-1 text-xs opacity-80">({market.region})</span>
                    )}
                    <button
                      onClick={() => removeMarketMutation.mutate(market.id)}
                      disabled={removeMarketMutation.isPending}
                      className="ml-2 opacity-60 hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Available Markets to Add */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700">
              Mevcut Pazarlar ({availableMarkets.length})
            </h4>
            <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-3 border rounded-md">
              {availableMarkets.length === 0 ? (
                <span className="text-sm text-gray-400">
                  {searchTerm ? "Arama sonucu bulunamadı" : "Tüm pazarlar zaten seçilmiş"}
                </span>
              ) : (
                availableMarkets.map((market: Market) => (
                  <Badge 
                    key={market.id} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-dip-blue hover:text-white hover:border-dip-blue"
                    onClick={() => addMarketMutation.mutate(market.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {market.name}
                    {market.region && (
                      <span className="ml-1 text-xs opacity-80">({market.region})</span>
                    )}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}