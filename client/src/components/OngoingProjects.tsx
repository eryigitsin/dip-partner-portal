import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Calendar, 
  CheckCircle, 
  CreditCard, 
  AlertCircle,
  Clock
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface OngoingProject {
  id: number;
  projectTitle: string;
  projectNumber: string;
  projectType: 'monthly' | 'one-time';
  status: 'active' | 'completion-requested' | 'completed';
  startDate: string;
  endDate?: string;
  nextPaymentDue?: string;
  completionRequestedBy?: number;
  completionRequestedAt?: string;
  completedAt?: string;
  userId: number;
  partnerId: number;
  quoteResponse?: {
    items: any[];
    notes?: string;
    description?: string;
  };
}

interface ProjectComment {
  id: number;
  content: string;
  rating?: number;
  isPublic: boolean;
  authorId: number;
  createdAt: string;
}

interface ProjectPayment {
  id: number;
  amount: number;
  paymentMonth: string;
  status: 'due' | 'paid' | 'confirmed';
  dueDate: string;
  paidAt?: string;
  confirmedAt?: string;
}

interface OngoingProjectsProps {
  userType: 'user' | 'partner';
  userId?: number;
  partnerId?: number;
}

export function OngoingProjects({ userType, userId, partnerId }: OngoingProjectsProps) {
  const [selectedProject, setSelectedProject] = useState<OngoingProject | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [commentRating, setCommentRating] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch ongoing projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: [userType === 'user' ? '/api/user/ongoing-projects' : '/api/partner/ongoing-projects']
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ projectId, content, rating }: { projectId: number; content: string; rating?: number }) => {
      return await apiRequest('POST', `/api/projects/${projectId}/comments`, { content, rating, isPublic: false });
    },
    onSuccess: () => {
      toast({
        title: "Yorum eklendi",
        description: "Yorumunuz başarıyla kaydedildi."
      });
      setShowCommentDialog(false);
      setCommentContent("");
      setCommentRating(null);
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', selectedProject?.id, 'comments']
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Yorum eklenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  });

  // Request completion mutation
  const requestCompletionMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return await apiRequest('POST', `/api/projects/${projectId}/request-completion`);
    },
    onSuccess: (data, variables) => {
      const project = Array.isArray(projects) ? projects.find((p: OngoingProject) => p.id === variables) : undefined;
      const isMonthly = project?.projectType === 'monthly';
      toast({
        title: isMonthly ? "Sonlandırma talebi gönderildi" : "Tamamlanma talebi gönderildi",
        description: isMonthly 
          ? "Proje sonlandırma talebiniz karşı tarafa iletildi." 
          : "Proje tamamlanma talebiniz karşı tarafa iletildi."
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/user/ongoing-projects']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/partner/ongoing-projects']
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Tamamlanma talebi gönderilirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  });

  // Approve completion mutation
  const approveCompletionMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return await apiRequest('POST', `/api/projects/${projectId}/approve-completion`);
    },
    onSuccess: (data, variables) => {
      const project = Array.isArray(projects) ? projects.find((p: OngoingProject) => p.id === variables) : undefined;
      const isMonthly = project?.projectType === 'monthly';
      toast({
        title: isMonthly ? "Proje sonlandırıldı" : "Proje tamamlandı",
        description: isMonthly 
          ? "Proje başarıyla sonlandırıldı." 
          : "Proje başarıyla tamamlandı olarak işaretlendi."
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/user/ongoing-projects']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/partner/ongoing-projects']
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Proje onaylanırken bir hata oluştu.",
        variant: "destructive"
      });
    }
  });

  const handleAddComment = () => {
    if (!selectedProject || !commentContent.trim()) return;
    
    addCommentMutation.mutate({
      projectId: selectedProject.id,
      content: commentContent,
      rating: commentRating || undefined
    });
  };

  const handleRequestCompletion = (project: OngoingProject) => {
    requestCompletionMutation.mutate(project.id);
  };

  const handleApproveCompletion = (project: OngoingProject) => {
    approveCompletionMutation.mutate(project.id);
  };

  const getProjectStatusBadge = (project: OngoingProject) => {
    switch (project.status) {
      case 'active':
        return <Badge variant="default">Aktif</Badge>;
      case 'completion-requested':
        return <Badge variant="secondary">Tamamlanma Talebi</Badge>;
      case 'completed':
        return <Badge variant="outline">Tamamlandı</Badge>;
      default:
        return <Badge variant="secondary">{project.status}</Badge>;
    }
  };

  const shouldShowPaymentButton = (project: OngoingProject) => {
    if (project.projectType !== 'monthly' || project.status !== 'active') return false;
    if (!project.nextPaymentDue) return false;
    
    const dueDate = new Date(project.nextPaymentDue);
    const now = new Date();
    const sevenDaysFromNow = addDays(now, 7);
    
    return isAfter(sevenDaysFromNow, dueDate);
  };

  const shouldShowCommentButton = (project: OngoingProject) => {
    return project.projectType === 'one-time' && project.status === 'completed';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!Array.isArray(projects) || projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Henüz devam eden proje yok
          </h3>
          <p className="text-gray-500">
            {userType === 'user' 
              ? "Onayladığınız teklifler burada görünecek."
              : "Müşterilerinizin onayladığı teklifler burada görünecek."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Array.isArray(projects) && projects.map((project: OngoingProject) => (
        <Card key={project.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  {project.projectTitle}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Proje No: {project.projectNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getProjectStatusBadge(project)}
                <Badge variant={project.projectType === 'monthly' ? 'default' : 'secondary'}>
                  {project.projectType === 'monthly' ? 'Aylık' : 'Tek Seferlik'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Başlangıç: {format(new Date(project.startDate), 'dd MMM yyyy', { locale: tr })}</span>
              </div>
              
              {project.nextPaymentDue && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Sonraki Ödeme: {format(new Date(project.nextPaymentDue), 'dd MMM yyyy', { locale: tr })}
                  </span>
                </div>
              )}
              
              {project.completionRequestedAt && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    {project.projectType === 'monthly' ? 'Sonlandırma Talebi' : 'Tamamlanma Talebi'}: {format(new Date(project.completionRequestedAt), 'dd MMM yyyy', { locale: tr })}
                  </span>
                </div>
              )}
              
              {project.completedAt && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    {project.projectType === 'monthly' ? 'Sonlandırıldı' : 'Tamamlandı'}: {format(new Date(project.completedAt), 'dd MMM yyyy', { locale: tr })}
                  </span>
                </div>
              )}
            </div>
            
            {/* Quote Response Details */}
            {project.quoteResponse && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-3">Onaylanan Teklif Detayları</h4>
                
                {/* Service Items */}
                {project.quoteResponse.items && project.quoteResponse.items.length > 0 && (
                  <div className="mb-3">
                    <div className="space-y-2">
                      {project.quoteResponse.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                          <span className="font-medium">{item.description}</span>
                          <span className="text-green-600">
                            ₺{(item.totalPrice / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Partner Notes/Explanation */}
                {project.quoteResponse.notes && (
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Partner Açıklaması: </span>
                    <span>{project.quoteResponse.notes}</span>
                  </div>
                )}
                
                {project.quoteResponse.description && project.quoteResponse.description !== project.quoteResponse.notes && (
                  <div className="text-sm text-gray-700 mt-2">
                    <span className="font-medium">Açıklama: </span>
                    <span>{project.quoteResponse.description}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 flex-wrap">
              {shouldShowPaymentButton(project) && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid={`button-payment-${project.id}`}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Ödeme Yap
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aylık Ödeme</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>
                        <strong>{project.projectTitle}</strong> projesi için aylık ödemenizi gerçekleştirin.
                      </p>
                      <p className="text-sm text-gray-600">
                        Son ödeme tarihi: {format(new Date(project.nextPaymentDue!), 'dd MMM yyyy', { locale: tr })}
                      </p>
                      <div className="flex gap-2">
                        <Button className="flex-1">Kredi Kartı</Button>
                        <Button variant="outline" className="flex-1">Havale/EFT</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              {shouldShowCommentButton(project) && (
                <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedProject(project)}
                      data-testid={`button-comment-${project.id}`}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Yorum Yap
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Proje Yorumu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="comment">Yorumunuz</Label>
                        <Textarea
                          id="comment"
                          placeholder="Proje hakkındaki görüşlerinizi yazın..."
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rating">Değerlendirme (1-5)</Label>
                        <Input
                          id="rating"
                          type="number"
                          min="1"
                          max="5"
                          value={commentRating || ''}
                          onChange={(e) => setCommentRating(e.target.value ? parseInt(e.target.value) : null)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddComment}
                          disabled={!commentContent.trim() || addCommentMutation.isPending}
                          className="flex-1"
                        >
                          {addCommentMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowCommentDialog(false)}
                          className="flex-1"
                        >
                          İptal
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              {project.status === 'active' && !project.completionRequestedBy && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRequestCompletion(project)}
                  disabled={requestCompletionMutation.isPending}
                  data-testid={`button-request-completion-${project.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {requestCompletionMutation.isPending 
                    ? 'Gönderiliyor...' 
                    : project.projectType === 'monthly' 
                      ? 'Projeyi Sonlandırma Talebi Gönder' 
                      : 'Tamamlanma Talebi'
                  }
                </Button>
              )}
              
              {project.status === 'completion-requested' && 
               project.completionRequestedBy && 
               project.completionRequestedBy !== (userType === 'user' ? userId : partnerId) && (
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApproveCompletion(project)}
                  disabled={approveCompletionMutation.isPending}
                  data-testid={`button-approve-completion-${project.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {approveCompletionMutation.isPending 
                    ? 'Onaylanıyor...' 
                    : project.projectType === 'monthly' 
                      ? 'Sonlandırmayı Onayla' 
                      : 'Tamamlanmayı Onayla'
                  }
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}