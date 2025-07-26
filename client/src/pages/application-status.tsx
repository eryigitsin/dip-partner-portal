import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, CheckCircle, Clock, XCircle } from "lucide-react";
// Footer component will be added later

interface ApplicationStatus {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export default function ApplicationStatus() {
  const { id } = useParams();
  
  const { data: application, isLoading } = useQuery<ApplicationStatus>({
    queryKey: ['/api/application-status', id],
    enabled: !!id,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      default:
        return 'İnceleniyor';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Başvuru Bulunamadı</CardTitle>
            <CardDescription>
              Belirtilen ID ile bir başvuru bulunamadı.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">DİP</span>
              </div>
              <CardTitle className="text-2xl">İş Ortağı Başvuru Durumu</CardTitle>
              <CardDescription>
                Başvuru ID: #{application.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-center gap-3">
                {getStatusIcon(application.status)}
                <Badge className={getStatusColor(application.status)}>
                  {getStatusText(application.status)}
                </Badge>
              </div>

              {/* Application Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Başvuru Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Ad Soyad:</span>
                    <p className="font-medium">{application.firstName} {application.lastName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Şirket:</span>
                    <p className="font-medium">{application.company}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">E-posta:</span>
                    <p className="font-medium">{application.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Telefon:</span>
                    <p className="font-medium">{application.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Başvuru Tarihi:</span>
                    <p className="font-medium">{new Date(application.createdAt).toLocaleDateString('tr-TR')}</p>
                  </div>
                  {application.reviewedAt && (
                    <div>
                      <span className="text-gray-600">İnceleme Tarihi:</span>
                      <p className="font-medium">{new Date(application.reviewedAt).toLocaleDateString('tr-TR')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Notes */}
              {application.reviewNotes && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">İnceleme Notları</h3>
                  <p className="text-sm text-gray-700">{application.reviewNotes}</p>
                </div>
              )}

              {/* Status Messages */}
              <div className="text-center">
                {application.status === 'pending' && (
                  <p className="text-gray-600">
                    Başvurunuz değerlendirme sürecinde. En kısa sürede size dönüş yapılacaktır.
                  </p>
                )}
                {application.status === 'approved' && (
                  <p className="text-green-600 font-medium">
                    Tebrikler! Başvurunuz onaylandı. Yakında sizinle iletişime geçilecektir.
                  </p>
                )}
                {application.status === 'rejected' && (
                  <p className="text-red-600">
                    Başvurunuz değerlendirme sonucunda uygun bulunmamıştır.
                  </p>
                )}
              </div>

              {/* Contact Section */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-4 text-center">İletişime Geçin</h3>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => window.location.href = 'mailto:info@dip.tc'}
                  >
                    <Mail className="h-4 w-4" />
                    info@dip.tc
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => window.location.href = 'tel:+908503071245'}
                  >
                    <Phone className="h-4 w-4" />
                    +90 850 307 12 45
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}