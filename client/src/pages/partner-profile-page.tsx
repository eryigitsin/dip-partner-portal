import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Partner } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy,
  MapPin,
  Mail,
  Phone,
  Globe,
  Building,
  User,
  Eye,
  Calendar
} from "lucide-react";

export default function PartnerProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: partner, isLoading } = useQuery<Partner>({
    queryKey: ["/api/partners", "me"],
    queryFn: async () => {
      const response = await fetch("/api/partners/me");
      if (!response.ok) throw new Error("Failed to fetch partner data");
      return response.json();
    },
    enabled: !!user && (user.activeUserType || user.userType) === "partner",
  });

  if (!user || (user.activeUserType || user.userType) !== "partner") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Bu sayfaya erişim yetkiniz bulunmamaktadır
          </h1>
          <p className="text-gray-600">
            Partner profil sayfasına erişebilmek için partner hesabınızla giriş yapmanız gerekmektedir.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profil Bilgileri</h1>
          <p className="text-gray-600 mt-2">Şirket profil bilgilerinizi görüntüleyin</p>
        </div>

        <div className="space-y-6">
          {/* Profile URL Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profil URL'niz</CardTitle>
              <CardDescription>
                Profilinizin herkese açık URL adresi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">Mevcut Profil URL'niz:</Label>
                <div className="mt-2 flex items-center justify-between">
                  <a 
                    href={`/partner/${partner?.username || partner?.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dip-blue hover:text-dip-dark-blue underline flex-1 mr-4"
                  >
                    https://partner.dip.tc/partner/{partner?.username || partner?.id}
                  </a>
                  <Button 
                    onClick={() => {
                      const url = `https://partner.dip.tc/partner/${partner?.username || partner?.id}`;
                      navigator.clipboard.writeText(url).then(() => {
                        toast({
                          title: "Başarılı",
                          description: "URL kopyalandı",
                        });
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="ml-2"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Profili Paylaş
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Şirket Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Şirket Adı</Label>
                  <p className="mt-1 text-gray-900 font-medium">{partner?.companyName || "Belirtilmemiş"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Kullanıcı Adı</Label>
                  <p className="mt-1 text-gray-900">@{partner?.username || partner?.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">İletişim Kişisi</Label>
                  <p className="mt-1 text-gray-900">{partner?.contactPerson || "Belirtilmemiş"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Hizmet Kategorisi</Label>
                  <p className="mt-1 text-gray-900">{partner?.serviceCategory || "Belirtilmemiş"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                İletişim Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    E-posta
                  </Label>
                  <p className="mt-1 text-gray-900">{(partner as any)?.contactEmail || "Belirtilmemiş"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center">
                    <Phone className="mr-2 h-4 w-4" />
                    Telefon
                  </Label>
                  <p className="mt-1 text-gray-900">{(partner as any)?.contactPhone || "Belirtilmemiş"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    Şehir
                  </Label>
                  <p className="mt-1 text-gray-900">{partner?.city || "Belirtilmemiş"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center">
                    <Globe className="mr-2 h-4 w-4" />
                    Website
                  </Label>
                  {partner?.website ? (
                    <a 
                      href={partner.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-1 text-dip-blue hover:text-dip-dark-blue underline"
                    >
                      {partner.website}
                    </a>
                  ) : (
                    <p className="mt-1 text-gray-900">Belirtilmemiş</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                Profil İstatistikleri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{partner?.profileViews || 0}</p>
                  <p className="text-sm text-gray-600">Profil Görüntüleme</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <User className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{partner?.followersCount || 0}</p>
                  <p className="text-sm text-gray-600">Takipçi</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">
                    {partner?.createdAt ? new Date(partner.createdAt).getFullYear() : "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">Üyelik Yılı</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description Card */}
          {partner?.description && (
            <Card>
              <CardHeader>
                <CardTitle>Şirket Açıklaması</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{partner.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Note about editing */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    Profil Bilgilerini Düzenleme
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Profil bilgilerinizi düzenlemek için yönetici ile iletişime geçiniz. Kullanıcı adı ve diğer bilgiler sadece yetkili personel tarafından güncellenebilir.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}