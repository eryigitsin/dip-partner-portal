import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Mail } from 'lucide-react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const subscribeToNewsletter = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest('POST', '/api/newsletter/subscribe', { email, source: 'homepage' });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Başarılı!",
        description: data?.message || "Newsletter aboneliğiniz başarıyla oluşturuldu",
      });
      setEmail('');
    },
    onError: (error: any) => {
      toast({
        title: "Hata!",
        description: error.message || "Abonelik işlemi başarısız",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({
        title: "Hata!",
        description: "Lütfen geçerli bir e-posta adresi girin",
        variant: "destructive",
      });
      return;
    }
    subscribeToNewsletter.mutate(email);
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Özel Fırsatlardan Haberdar Olun
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Partnerlerimizin DİP'e özel sunduğu avantajlardan ve (dijital) ihracata dair fırsatlardan haberdar olmak için abone olun.
          </p>
          
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="E-posta adresiniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                data-testid="input-newsletter-email"
                disabled={subscribeToNewsletter.isPending}
              />
              <Button
                type="submit"
                className="bg-blue-600 text-white hover:bg-blue-700 font-semibold px-8"
                disabled={subscribeToNewsletter.isPending}
                data-testid="button-newsletter-subscribe"
              >
                {subscribeToNewsletter.isPending ? 'Gönderiliyor...' : 'Abone Ol'}
              </Button>
            </div>
          </form>
          
          <p className="text-gray-500 text-sm mt-4">
            Spam göndermeyiz. İstediğiniz zaman aboneliğinizi iptal edebilirsiniz.
          </p>
        </div>
      </div>
    </section>
  );
}