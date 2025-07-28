import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle, XCircle } from "lucide-react";

interface EmailPreferences {
  id?: number;
  userId: number;
  marketingEmails: boolean;
  partnerUpdates: boolean;
  platformUpdates: boolean;
  weeklyDigest: boolean;
}

export default function EmailPreferences() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    userId: 0,
    marketingEmails: true,
    partnerUpdates: true,
    platformUpdates: true,
    weeklyDigest: false,
  });

  // Get current user
  const { data: user } = useQuery({ queryKey: ["/api/user"] });

  // Get user's email preferences
  const { data: userPreferences, isLoading } = useQuery({
    queryKey: ["/api/email-preferences"],
    enabled: !!user?.id,
  });

  // Update preferences when data loads
  useEffect(() => {
    if (userPreferences && user) {
      setPreferences({
        userId: user.id,
        marketingEmails: userPreferences.marketingEmails ?? true,
        partnerUpdates: userPreferences.partnerUpdates ?? true,
        platformUpdates: userPreferences.platformUpdates ?? true,
        weeklyDigest: userPreferences.weeklyDigest ?? false,
      });
    } else if (user) {
      setPreferences(prev => ({
        ...prev,
        userId: user.id,
      }));
    }
  }, [userPreferences, user]);

  // Save preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: EmailPreferences) => {
      const response = await apiRequest("POST", "/api/email-preferences", newPreferences);
      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-preferences"] });
      toast({
        title: "Tercihler Güncellendi",
        description: "E-posta bildirim tercihleriniz başarıyla kaydedildi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Tercihler güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Unsubscribe from all emails mutation
  const unsubscribeAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/email-preferences/unsubscribe-all");
      if (!response.ok) {
        throw new Error("Failed to unsubscribe");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-preferences"] });
      setPreferences(prev => ({
        ...prev,
        marketingEmails: false,
        partnerUpdates: false,
        weeklyDigest: false,
      }));
      toast({
        title: "Abonelik İptal Edildi",
        description: "Zorunlu e-postalar dışında bizden e-posta almayacaksınız.",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Abonelik iptal edilirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Subscribe back to marketing emails
  const subscribeBackMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/email-preferences/subscribe-back");
      if (!response.ok) {
        throw new Error("Failed to subscribe back");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-preferences"] });
      setPreferences(prev => ({
        ...prev,
        marketingEmails: true,
        partnerUpdates: true,
      }));
      toast({
        title: "Tekrar Abone Olundu",
        description: "Kampanya ve avantaj bildirimlerini tekrar alacaksınız.",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Tekrar abone olunurken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handlePreferenceChange = (key: keyof EmailPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  const handleUnsubscribeAll = () => {
    unsubscribeAllMutation.mutate();
  };

  const handleSubscribeBack = () => {
    subscribeBackMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <Mail className="h-12 w-12 text-blue-600 mx-auto" />
        <h1 className="text-3xl font-bold">E-Posta Bildirim Tercihi</h1>
        <p className="text-gray-600">
          Hangi e-posta bildirimlerini almak istediğinizi seçin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            E-Posta Bildirim Türleri
          </CardTitle>
          <CardDescription>
            Aşağıdaki bildirim türlerinden hangilerini almak istediğinizi seçebilirsiniz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Marketing emails */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="marketingEmails"
              checked={preferences.marketingEmails}
              onCheckedChange={(checked) => 
                handlePreferenceChange("marketingEmails", checked as boolean)
              }
            />
            <div className="space-y-1">
              <label 
                htmlFor="marketingEmails" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Kampanya ve kişiye özel avantaj bildirimlerini e-posta olarak al
              </label>
              <p className="text-xs text-gray-500">
                Özel kampanyalar, indirimler ve size özel avantajlar hakkında bilgi alın
              </p>
            </div>
          </div>

          {/* Partner updates */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="partnerUpdates"
              checked={preferences.partnerUpdates}
              onCheckedChange={(checked) => 
                handlePreferenceChange("partnerUpdates", checked as boolean)
              }
            />
            <div className="space-y-1">
              <label 
                htmlFor="partnerUpdates" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                İş ortağı güncellemeleri
              </label>
              <p className="text-xs text-gray-500">
                Takip ettiğiniz iş ortaklarından yeni hizmet ve duyurular
              </p>
            </div>
          </div>

          {/* Platform updates */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="platformUpdates"
              checked={preferences.platformUpdates}
              onCheckedChange={(checked) => 
                handlePreferenceChange("platformUpdates", checked as boolean)
              }
            />
            <div className="space-y-1">
              <label 
                htmlFor="platformUpdates" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Platform güncellemeleri
              </label>
              <p className="text-xs text-gray-500">
                DİP platformundaki yeni özellikler ve gelişmeler hakkında bilgi alın
              </p>
            </div>
          </div>

          {/* Weekly digest */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="weeklyDigest"
              checked={preferences.weeklyDigest}
              onCheckedChange={(checked) => 
                handlePreferenceChange("weeklyDigest", checked as boolean)
              }
            />
            <div className="space-y-1">
              <label 
                htmlFor="weeklyDigest" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Haftalık özet e-postası
              </label>
              <p className="text-xs text-gray-500">
                Haftanın öne çıkan fırsatları ve yeni iş ortakları hakkında özet
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave}
              disabled={updatePreferencesMutation.isPending}
              className="flex-1"
            >
              {updatePreferencesMutation.isPending ? "Kaydediliyor..." : "Tercihleri Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unsubscribe section */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            E-Posta Aboneliklerini İptal Et
          </CardTitle>
          <CardDescription>
            Zorunlu güvenlik e-postaları dışında tüm e-posta bildirimlerini iptal edebilirsiniz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Önemli:</strong> Hesap güvenliği, şifre sıfırlama ve önemli hesap bildirimleri gibi zorunlu e-postalar bu ayardan etkilenmez.
            </p>
          </div>

          {!preferences.marketingEmails && !preferences.partnerUpdates && !preferences.weeklyDigest ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Şu anda zorunlu e-postalar dışında bildirim almıyorsunuz.
              </p>
              <Button 
                onClick={handleSubscribeBack}
                disabled={subscribeBackMutation.isPending}
                variant="outline"
                className="w-full"
              >
                {subscribeBackMutation.isPending ? "İşleniyor..." : "Kampanya ve kişiye özel avantaj bildirimlerini e-posta olarak al"}
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleUnsubscribeAll}
              disabled={unsubscribeAllMutation.isPending}
              variant="destructive"
              className="w-full"
            >
              {unsubscribeAllMutation.isPending ? "İptal ediliyor..." : "Hesapla ilgili zorunlu e-postalar dışında e-posta almak istemiyorum"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}