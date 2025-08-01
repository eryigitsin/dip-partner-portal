import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  source?: 'user' | 'partner';
}

export function FeedbackModal({ isOpen, onClose, source = 'user' }: FeedbackModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: '',
    message: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const feedbackMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/feedback', { ...data, source });
    },
    onSuccess: () => {
      setShowSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        category: '',
        message: ''
      });
      
      // Auto close after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 3000);
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Geri bildirim gönderilirken bir hata oluştu',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.category || !formData.message) {
      toast({
        title: 'Eksik Bilgi',
        description: 'Lütfen tüm zorunlu alanları doldurun',
        variant: 'destructive',
      });
      return;
    }

    feedbackMutation.mutate(formData);
  };

  const handleClose = () => {
    if (!feedbackMutation.isPending) {
      setShowSuccess(false);
      onClose();
    }
  };

  const categories = [
    { value: 'request', label: 'İstek / Öneri' },
    { value: 'bug', label: 'Hata Bildirme' },
    { value: 'feature', label: 'Özellik Talebi' },
    { value: 'complaint', label: 'Şikayet' },
    { value: 'other', label: 'Diğer' }
  ];

  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Başarıyla Gönderildi!
              </h3>
              <p className="text-green-700">
                Geri bildiriminiz başarılı şekilde alınmıştır. Gerek olması durumunda yöneticilerimiz sizlerle iletişime geçecektir.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Geri Bildirim Formu</DialogTitle>
          <DialogDescription>
            Görüşlerinizi, önerilerinizi ve karşılaştığınız sorunları bizimle paylaşın.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ad Soyad *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Adınız ve soyadınız"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-posta *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ornek@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">GSM No</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="05xx xxx xx xx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Konu *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Konu seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mesajınız *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Geri bildiriminizi detaylı olarak yazınız..."
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={feedbackMutation.isPending}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={feedbackMutation.isPending}
              className="flex-1 bg-dip-blue hover:bg-dip-dark-blue"
            >
              {feedbackMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}