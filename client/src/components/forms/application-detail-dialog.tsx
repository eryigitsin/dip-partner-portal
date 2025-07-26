import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQueryFn } from "@/lib/queryClient";
import { 
  Building, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  Users, 
  Target, 
  FileText, 
  Download,
  ExternalLink,
  Linkedin,
  Twitter,
  Instagram,
  Facebook
} from "lucide-react";

interface ApplicationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: number | null;
  onApprove?: (id: number, notes?: string) => void;
  onReject?: (id: number, notes?: string) => void;
}

export function ApplicationDetailDialog({ 
  open, 
  onOpenChange, 
  applicationId,
  onApprove,
  onReject 
}: ApplicationDetailDialogProps) {
  const [notes, setNotes] = useState("");

  const { data: application, isLoading } = useQuery({
    queryKey: [`/api/partner-applications/${applicationId}/details`],
    queryFn: getQueryFn(),
    enabled: !!applicationId && open,
  });

  const handleDownloadDocument = (documentId: number, fileName: string) => {
    window.open(`/api/partner-applications/${applicationId}/documents/${documentId}/download`, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      default: return 'Bekliyor';
    }
  };

  if (!application || isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                {application.company} - Partner Başvurusu
              </DialogTitle>
              <DialogDescription>
                Başvuru ID: #{application.id} | {new Date(application.createdAt).toLocaleDateString('tr-TR')}
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(application.status)}>
              {getStatusText(application.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kişisel ve İletişim Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Kişisel ve İletişim Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Ad Soyad</p>
                <p className="text-sm">{application.firstName} {application.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">İletişim Kişisi</p>
                <p className="text-sm">{application.contactPerson}</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{application.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{application.phone}</span>
              </div>
              {application.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a 
                    href={application.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {application.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Şirket Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Şirket Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Şirket Adı</p>
                <p className="text-sm font-semibold">{application.company}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">İş Türü</p>
                <p className="text-sm">{application.businessType}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{application.companySize}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">Kuruluş: {application.foundingYear}</span>
                </div>
              </div>
              {application.sectorExperience && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Sektör Deneyimi</p>
                  <p className="text-sm">{application.sectorExperience} yıl</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* İş Tanımı */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>İş Tanımı</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {application.businessDescription}
              </p>
            </CardContent>
          </Card>

          {/* Hedef Pazarlar */}
          {application.targetMarkets && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Hedef Pazarlar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {application.targetMarkets}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Sunacağı Hizmetler */}
          <Card>
            <CardHeader>
              <CardTitle>Sunacağı Hizmetler</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {application.services}
              </p>
            </CardContent>
          </Card>

          {/* DİP Avantajları */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>DİP Üyelerine Özel Fırsat Teklifi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {application.dipAdvantages}
              </p>
            </CardContent>
          </Card>

          {/* Neden Partner Olmak İstiyor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Neden DİP ile İş Ortağı Olmak İstiyor?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {application.whyPartner}
              </p>
            </CardContent>
          </Card>

          {/* Referanslar */}
          {application.references && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Referanslar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {application.references}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Sosyal Medya */}
          <Card>
            <CardHeader>
              <CardTitle>Sosyal Medya Profilleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {application.linkedinProfile && (
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  <a 
                    href={application.linkedinProfile} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    LinkedIn
                  </a>
                </div>
              )}
              {application.twitterProfile && (
                <div className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-blue-400" />
                  <a 
                    href={application.twitterProfile} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Twitter
                  </a>
                </div>
              )}
              {application.instagramProfile && (
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  <a 
                    href={application.instagramProfile} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Instagram
                  </a>
                </div>
              )}
              {application.facebookProfile && (
                <div className="flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  <a 
                    href={application.facebookProfile} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Facebook
                  </a>
                </div>
              )}
              {!application.linkedinProfile && !application.twitterProfile && !application.instagramProfile && !application.facebookProfile && (
                <p className="text-sm text-gray-500">Sosyal medya profili belirtilmemiş</p>
              )}
            </CardContent>
          </Card>

          {/* Yüklenen Belgeler */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Yüklenen Belgeler ({application.documents?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {application.documents && application.documents.length > 0 ? (
                <div className="space-y-2">
                  {application.documents.map((document: any, index: number) => (
                    <div key={document.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{document.originalName}</p>
                          <p className="text-xs text-gray-500">
                            {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadDocument(document.id, document.originalName)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        İndir
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Yüklenen belge bulunmuyor</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Notları ve İşlemler */}
        {application.status === 'pending' && (onApprove || onReject) && (
          <>
            <Separator />
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Yönetici Notları (İsteğe bağlı)
                </label>
                <Textarea
                  placeholder="Bu başvuru hakkında notlarınızı yazın..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Kapat
                </Button>
                {onReject && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onReject(application.id, notes);
                      onOpenChange(false);
                    }}
                  >
                    Reddet
                  </Button>
                )}
                {onApprove && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      onApprove(application.id, notes);
                      onOpenChange(false);
                    }}
                  >
                    Onayla
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Onaylanmış/Reddedilmiş başvurular için sadece kapat butonu */}
        {application.status !== 'pending' && (
          <>
            <Separator />
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Kapat
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}