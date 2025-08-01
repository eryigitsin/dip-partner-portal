import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { insertQuoteRequestSchema, Partner } from '@shared/schema';
import { z } from 'zod';
import { useState } from 'react';

interface Service {
  id: number;
  name: string;
  description?: string;
  category?: string;
}

interface PartnerService {
  id: number;
  partnerId: number;
  serviceId: number;
  service: Service;
  isCustom: boolean;
  createdAt: string;
}

const formSchema = z.object({
  partnerId: z.number(),
  firstName: z.string().min(1, "Ad zorunludur"),
  lastName: z.string().min(1, "Soyad zorunludur"),
  email: z.string().email("Geçerli bir email adresi giriniz"),
  phone: z.string().min(1, "Telefon numarası zorunludur"),
  company: z.string().min(1, "Şirket adı zorunludur"),
  serviceNeeded: z.string().optional(), // Made optional since it can be populated from selectedServices
  budget: z.string().optional(),
  message: z.string().optional(),
  kvkkConsent: z.boolean().refine(val => val === true, {
    message: "KVKK onayı zorunludur",
  }),
  projectStartDate: z.string().optional(),
  projectEndDate: z.string().optional(),
  workType: z.enum(['project', 'monthly']).optional(),
  selectedServices: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface QuoteRequestFormProps {
  partner: Partner;
  onSuccess: () => void;
  onCancel: () => void;
}

export function QuoteRequestForm({ partner, onSuccess, onCancel }: QuoteRequestFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [workType, setWorkType] = useState<'project' | 'monthly'>('monthly');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);

  // Fetch partner's services from the service pool
  const { data: partnerServicesData = [] } = useQuery<PartnerService[]>({
    queryKey: ['/api/partner/services', partner.id],
    queryFn: async () => {
      const response = await fetch(`/api/partner/services?partnerId=${partner.id}`);
      if (!response.ok) throw new Error('Partner hizmetleri yüklenemedi');
      return response.json();
    },
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partnerId: partner.id,
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      company: '',
      serviceNeeded: '',
      budget: '',
      message: '',
      projectStartDate: '',
      projectEndDate: '',
      kvkkConsent: false,
    },
  });

  const quoteRequestMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log('🚀 Quote request form data:', data);
      
      const { kvkkConsent, firstName, lastName, company, projectStartDate, projectEndDate, workType, selectedServices, ...requestData } = data;
      
      // Transform data to match backend schema
      const fullName = `${firstName} ${lastName}`.trim();
      const companyName = company;
      
      const transformedData = {
        ...requestData,
        fullName,
        companyName,
        message: data.message || '', // Ensure message field is included
      };
      
      console.log('🔄 Transformed data being sent:', transformedData);
      console.log('🔐 Current user:', user);
      
      try {
        const response = await apiRequest('POST', '/api/quote-requests', transformedData);
        console.log('✅ Quote request response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Quote request failed:', response.status, errorText);
          throw new Error(`Server error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Quote request success:', result);
        return result;
      } catch (error) {
        console.error('💥 Quote request error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Teklif Talebi Gönderildi',
        description: 'Teklif talebiniz başarıyla gönderildi. Partner en kısa sürede sizinle iletişime geçecektir.',
      });
      onSuccess();
    },
    onError: (error: Error) => {
      console.error('💥 Quote request mutation error:', error);
      toast({
        title: 'Teklif Talebi Gönderilemedi',
        description: error.message || 'Bilinmeyen bir hata oluştu',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('📋 Form submission started with data:', data);
    console.log('👤 Current user:', user);
    console.log('🏢 Partner:', partner);
    
    // Validate service selection for structured services
    if (partnerServices.length > 0 && selectedServices.length === 0) {
      console.warn('⚠️ Service validation failed: No services selected');
      toast({
        title: "Hata",
        description: "En az bir hizmet seçiniz",
        variant: "destructive",
      });
      return;
    }

    // For partners without structured services, check serviceNeeded field
    if (partnerServices.length === 0 && (!data.serviceNeeded || data.serviceNeeded.trim() === '')) {
      console.warn('⚠️ Service description validation failed');
      toast({
        title: "Hata",
        description: "Hizmet açıklaması zorunludur",
        variant: "destructive",
      });
      return;
    }

    // Prepare service information
    let serviceInfo = '';
    if (partnerServices.length > 0) {
      serviceInfo = selectedServices.join(', ');
      console.log('🔧 Using structured services:', selectedServices);
    } else {
      serviceInfo = data.serviceNeeded || '';
      console.log('📝 Using manual service input:', data.serviceNeeded);
    }
    
    // Add work type information
    const workTypeText = workType === 'project' ? 'Proje Bazlı' : 'Aylık Çalışma';
    serviceInfo += `\n\nÇalışma Şekli: ${workTypeText}`;
    
    // Add project dates only if project-based work is selected
    if (workType === 'project' && data.projectStartDate && data.projectEndDate) {
      serviceInfo += `\nProje Tarihi: ${data.projectStartDate} - ${data.projectEndDate}`;
    } else if (workType === 'project' && data.projectStartDate) {
      serviceInfo += `\nBaşlangıç Tarihi: ${data.projectStartDate}`;
    } else if (workType === 'project' && data.projectEndDate) {
      serviceInfo += `\nBitiş Tarihi: ${data.projectEndDate}`;
    }
    
    console.log('📤 Final service info:', serviceInfo);
    
    const finalData = {
      ...data,
      serviceNeeded: serviceInfo,
      message: data.message || '', // Ensure message is included
    };
    
    console.log('🚀 Triggering mutation with:', finalData);
    quoteRequestMutation.mutate(finalData);
  };

  // Get partner services from the new service pool system
  const getPartnerServices = () => {
    // First priority: services from the service pool
    if (partnerServicesData.length > 0) {
      return partnerServicesData.map(ps => ps.service.name);
    }
    
    // Fallback: legacy text field services
    if (!partner.services) return [];
    
    // Split by common delimiters and clean up
    const services = partner.services
      .split(/[\r\n\*\-•]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s !== '*' && s !== '-' && s !== '•')
      .slice(0, 10); // Limit to 10 services for UI
    
    return services;
  };

  const partnerServices = getPartnerServices();

  return (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          console.log('🎯 Form submit event triggered!');
          console.log('📋 Event details:', e);
          form.handleSubmit(onSubmit)(e);
        }} 
        className="space-y-6"
      >
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

        {/* Service Selection from Service Pool */}
        {partnerServices.length > 0 && (
          <div className="space-y-4">
            <div>
              <FormLabel className="text-base font-medium">
                {partner.companyName} Hizmetleri * 
              </FormLabel>
              <p className="text-sm text-gray-600 mt-1">
                İhtiyacınız olan hizmetleri seçin (birden fazla seçim yapabilirsiniz)
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {partnerServices.map((serviceName, index) => {
                const serviceData = partnerServicesData.find(ps => ps.service.name === serviceName);
                return (
                  <div 
                    key={index}
                    className={`border rounded-lg p-3 cursor-pointer transition-all hover:border-dip-blue ${
                      selectedServices.includes(serviceName) 
                        ? 'border-dip-blue bg-dip-blue bg-opacity-5' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => {
                      if (selectedServices.includes(serviceName)) {
                        setSelectedServices(prev => prev.filter(s => s !== serviceName));
                      } else {
                        setSelectedServices(prev => [...prev, serviceName]);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <Checkbox
                            checked={selectedServices.includes(serviceName)}
                            onChange={() => {}} // Handled by parent div click
                            className="mr-3"
                          />
                          <h4 className="font-medium text-gray-900">{serviceName}</h4>
                        </div>
                        {serviceData?.service.description && (
                          <p className="text-sm text-gray-600 mt-1 ml-6">
                            {serviceData.service.description}
                          </p>
                        )}
                        {serviceData?.service.category && (
                          <Badge variant="secondary" className="mt-2 ml-6">
                            {serviceData.service.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Other option */}
              <div 
                className={`border rounded-lg p-3 cursor-pointer transition-all hover:border-dip-blue ${
                  selectedServices.includes('Diğer') 
                    ? 'border-dip-blue bg-dip-blue bg-opacity-5' 
                    : 'border-gray-200'
                }`}
                onClick={() => {
                  if (selectedServices.includes('Diğer')) {
                    setSelectedServices(prev => prev.filter(s => s !== 'Diğer'));
                  } else {
                    setSelectedServices(prev => [...prev, 'Diğer']);
                  }
                }}
              >
                <div className="flex items-center">
                  <Checkbox
                    checked={selectedServices.includes('Diğer')}
                    onChange={() => {}} // Handled by parent div click
                    className="mr-3"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">Diğer</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Yukarıda bulunmayan bir hizmet (açıklama kısmında belirtiniz)
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {selectedServices.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-2">
                  Seçilen Hizmetler ({selectedServices.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedServices.map((service, index) => (
                    <Badge key={index} variant="outline" className="text-green-700 border-green-300">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {selectedServices.length === 0 && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                ⚠️ En az bir hizmet seçiniz
              </p>
            )}
          </div>
        )}

        {/* Fallback for partners without structured services */}
        {partnerServices.length === 0 && (
          <FormField
            control={form.control}
            name="serviceNeeded"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hizmet İhtiyacınız *</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    rows={4}
                    placeholder="İhtiyacınız olan hizmeti detaylıca açıklayınız..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Additional Details Field */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ek Açıklama</FormLabel>
              <FormControl>
                <Textarea 
                  {...field}
                  placeholder={partnerServices.length > 0 
                    ? "Seçtiğiniz hizmet hakkında ek detaylar yazabilirsiniz..." 
                    : "Projeniz hakkında ek bilgiler yazabilirsiniz..."
                  }
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="budget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proje Bütçeniz</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="under-5k">5.000 TL altı</SelectItem>
                  <SelectItem value="5k-15k">5.000 - 15.000 TL</SelectItem>
                  <SelectItem value="15k-50k">15.000 - 50.000 TL</SelectItem>
                  <SelectItem value="50k-100k">50.000 - 100.000 TL</SelectItem>
                  <SelectItem value="over-100k">100.000 TL üzeri</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Work Type Selection */}
        <div className="space-y-4">
          <FormLabel>Çalışma Şekli *</FormLabel>
          <RadioGroup 
            value={workType} 
            onValueChange={(value: 'project' | 'monthly') => setWorkType(value)}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monthly" id="work-monthly" />
              <label htmlFor="work-monthly" className="text-sm font-medium">
                Aylık Çalışma
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="project" id="work-project" />
              <label htmlFor="work-project" className="text-sm font-medium">
                Proje Bazlı
              </label>
            </div>
          </RadioGroup>
        </div>

        {/* Conditional Project Date Range */}
        {workType === 'project' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Beklenen Proje Başlangıç & Bitiş Tarihleri</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlangıç Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitiş Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

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
                  6698 Sayılı KVKK uyarınca, bilgilerimin ticari bilgi kapsamında işlenmesine ve iletişim kurulmasına razı olduğumu kabul ederim. *
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
            disabled={quoteRequestMutation.isPending}
            className="flex-1 bg-dip-green hover:bg-green-600"
            onClick={(e) => {
              console.log('🔘 Submit button clicked!');
              console.log('📝 Form state:', form.formState);
              console.log('🔍 Form errors:', form.formState.errors);
              console.log('📊 Form values:', form.getValues());
              // Don't prevent default - let form handle submission
            }}
          >
            {quoteRequestMutation.isPending ? 'Gönderiliyor...' : 'Teklif Talep Et'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
