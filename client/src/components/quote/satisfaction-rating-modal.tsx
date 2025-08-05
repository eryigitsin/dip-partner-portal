import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Heart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SatisfactionRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: number;
  partnerName: string;
  onSuccess?: () => void;
}

const ratingOptions = [
  { value: 5, label: "Çok Memnun Kaldım", color: "bg-green-500", emoji: "😊" },
  { value: 4, label: "Memnun Kaldım", color: "bg-blue-500", emoji: "🙂" },
  { value: 3, label: "Ortalama", color: "bg-yellow-500", emoji: "😐" },
  { value: 2, label: "Memnun Kalmadım", color: "bg-orange-500", emoji: "😕" },
  { value: 1, label: "Hiç Memnun Kalmadım", color: "bg-red-500", emoji: "😞" }
];

export function SatisfactionRatingModal({
  isOpen,
  onClose,
  quoteRequestId,
  partnerName,
  onSuccess
}: SatisfactionRatingModalProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedRating) return;

    setIsSubmitting(true);
    try {
      await apiRequest("POST", `/api/quote-requests/${quoteRequestId}/satisfaction`, {
        rating: selectedRating
      });

      toast({
        title: "Teşekkürler!",
        description: "Değerlendirmeniz başarıyla kaydedildi.",
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error submitting satisfaction rating:", error);
      toast({
        title: "Hata",
        description: "Değerlendirme kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Değerlendirme
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">
              {partnerName} ile yaşadığınız süreçten ne kadar memnun kaldınız?
            </p>
            <p className="text-sm text-gray-600">
              Değerlendirmeniz diğer kullanıcılar için önemli bir referans kaynağıdır.
            </p>
          </div>

          <div className="space-y-3">
            {ratingOptions.map((option) => (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedRating === option.value
                    ? 'ring-2 ring-blue-500 shadow-md'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRating(option.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${option.color} flex items-center justify-center text-white text-sm font-bold`}>
                      {option.value}
                    </div>
                    <span className="text-2xl">{option.emoji}</span>
                    <span className="font-medium text-gray-800">{option.label}</span>
                    {selectedRating === option.value && (
                      <Star className="h-5 w-5 text-yellow-500 ml-auto" fill="currentColor" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-dip-blue hover:bg-dip-dark-blue"
              disabled={!selectedRating || isSubmitting}
            >
              {isSubmitting ? "Gönderiliyor..." : "Değerlendir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}