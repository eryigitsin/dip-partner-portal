import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertPartnerApplicationSchema, ServiceCategory } from '@shared/schema';
import { z } from 'zod';

const formSchema = insertPartnerApplicationSchema.extend({
  kvkkConsent: z.boolean().refine(val => val === true, {
    message: "KVKK onayı zorunludur",
  }),
});

type FormData = z.infer<typeof formSchema>;

interface PartnerApplicationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function PartnerApplicationForm({ onSuccess, onCancel }: PartnerApplicationFormProps) {
  const { toast } = useToast();
  
  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/categories'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      title: '',
      website: '',
      companyAddress: '',
      serviceCategory: '',
      services: '',
      dipAdvantages: '',
      kvkkConsent: false,
    },
  });

  const applicationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { kvkkConsent, ...applicationData } = data;
      const response = await apiRequest('POST', '/api/partner-applications', applicationData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Başvuru Gönderildi',
        description: 'İş ortağı başvurunuz başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Başvuru Gönderilemedi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: FormData) => {
    applicationMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ad *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Soyad *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-posta *</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon *</FormLabel>
              <FormControl>
                <Input type="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şirket *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ünvan *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input type="url" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şirket Adresi</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tam şirket adresinizi yazın..."
                  rows={3}
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="serviceCategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hizmet Kategorisiniz *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="services"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sunduğunuz Hizmetler *</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={4}
                  placeholder="Hizmetlerinizi detaylıca açıklayınız..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dipAdvantages"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DİP Üyelerine Özel Avantajlarınız</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  value={field.value || ''}
                  rows={3}
                  placeholder="İndirim oranları, özel hizmetler vb..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="kvkkConsent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm">
                  6698 Sayılı KVKK uyarınca, bilgilerimin ticari bilgi kapsamında Dijital İhracat Platformu ve paydaşları ile paylaşılmasına razı olduğumu kabul ederim. *
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="flex space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            İptal
          </Button>
          <Button 
            type="submit" 
            disabled={applicationMutation.isPending}
            className="flex-1 bg-dip-blue hover:bg-dip-dark-blue"
          >
            {applicationMutation.isPending ? 'Gönderiliyor...' : 'Başvuru Gönder'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
