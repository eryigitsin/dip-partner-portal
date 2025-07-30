import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertPartnerApplicationSchema, ServiceCategory, Service } from '@shared/schema';
import { z } from 'zod';
import { useState, useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

const formSchema = insertPartnerApplicationSchema.extend({
  kvkkConsent: z.boolean().refine(val => val === true, {
    message: "KVKK onayı zorunludur",
  }),
  logoFile: z.any().optional(),
  coverFile: z.any().optional(),
  servicesList: z.array(z.string()).min(1, "En az bir hizmet seçmelisiniz"),
});

type FormData = z.infer<typeof formSchema>;

interface PartnerApplicationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function PartnerApplicationForm({ onSuccess, onCancel }: PartnerApplicationFormProps) {
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState('');
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  
  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/categories'],
  });
  
  const { data: existingServices = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      contactPerson: '',
      website: '',
      companyAddress: '',
      serviceCategory: '',
      services: '',
      dipAdvantages: '',
      kvkkConsent: false,
      servicesList: [],
    },
  });

  // File upload handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'Dosya Boyutu Hatası',
          description: 'Logo dosyası 5MB\'dan küçük olmalıdır.',
          variant: 'destructive',
        });
        return;
      }
      form.setValue('logoFile', file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'Dosya Boyutu Hatası',
          description: 'Kapak görseli 10MB\'dan küçük olmalıdır.',
          variant: 'destructive',
        });
        return;
      }
      form.setValue('coverFile', file);
      const reader = new FileReader();
      reader.onload = (e) => setCoverPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Service management with intelligent matching
  const addService = (serviceName: string) => {
    const trimmedName = serviceName.trim();
    if (!trimmedName) return;

    // Check for case-insensitive duplicates in selected services
    const isDuplicateInSelected = selectedServices.some(service => 
      service.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (isDuplicateInSelected) return;

    // Check if exact match exists in existing services and use that format
    const existingService = existingServices.find(service => 
      service.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    const serviceToAdd = existingService ? existingService.name : trimmedName;
    
    const newServices = [...selectedServices, serviceToAdd];
    setSelectedServices(newServices);
    form.setValue('servicesList', newServices);
    form.setValue('services', newServices.join('\n'));
    setServiceInput('');
  };

  const removeService = (serviceName: string) => {
    const newServices = selectedServices.filter(s => s !== serviceName);
    setSelectedServices(newServices);
    form.setValue('servicesList', newServices);
    form.setValue('services', newServices.join('\n'));
  };

  // Enhanced filtering with partial matching
  const filteredServices = existingServices.filter(service => {
    const serviceLower = service.name.toLowerCase();
    const inputLower = serviceInput.toLowerCase();
    
    // Check if service matches input and isn't already selected (case-insensitive)
    const matchesInput = serviceLower.includes(inputLower);
    const notSelected = !selectedServices.some(selected => 
      selected.toLowerCase() === serviceLower
    );
    
    return matchesInput && notSelected && serviceInput.length > 0;
  });

  // Check if exact match exists (case-insensitive)
  const exactMatchExists = existingServices.some(service => 
    service.name.toLowerCase() === serviceInput.toLowerCase()
  ) || selectedServices.some(service => 
    service.toLowerCase() === serviceInput.toLowerCase()
  );

  const applicationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { kvkkConsent, logoFile, coverFile, servicesList, ...applicationData } = data;
      
      // Create FormData for file upload
      const formData = new FormData();
      Object.entries(applicationData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as string);
        }
      });
      
      // Add services as JSON string
      formData.append('services', JSON.stringify(servicesList));
      
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (coverFile) {
        formData.append('coverImage', coverFile);
      }
      
      const response = await fetch('/api/partner-applications', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Başvuru gönderilemedi');
      }
      
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
    if (selectedServices.length === 0) {
      toast({
        title: 'Hizmet Seçimi Gerekli',
        description: 'En az bir hizmet eklemelisiniz.',
        variant: 'destructive',
      });
      return;
    }
    
    // Update form data with selected services
    data.servicesList = selectedServices;
    data.services = selectedServices.join('\n');
    
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
          name="contactPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İletişim Kişisi *</FormLabel>
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

        {/* Logo Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <FormLabel>Şirket Logosu</FormLabel>
            <div className="mt-2">
              <div 
                onClick={() => logoInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-dip-blue transition-colors"
              >
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo Preview" className="max-h-24 mx-auto rounded" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogoPreview('');
                        form.setValue('logoFile', undefined);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600 mt-2">Logo yükleyin</p>
                    <p className="text-xs text-gray-400">PNG, JPG (maks. 5MB)</p>
                    <p className="text-xs text-blue-600 font-medium">Önerilen: 200x200px</p>
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Cover Image Upload */}
          <div>
            <FormLabel>Profil Kapak Görseli</FormLabel>
            <div className="mt-2">
              <div 
                onClick={() => coverInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-dip-blue transition-colors"
              >
                {coverPreview ? (
                  <div className="relative">
                    <img src={coverPreview} alt="Cover Preview" className="max-h-24 mx-auto rounded" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverPreview('');
                        form.setValue('coverFile', undefined);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600 mt-2">Kapak görseli yükleyin</p>
                    <p className="text-xs text-gray-400">PNG, JPG (maks. 10MB)</p>
                    <p className="text-xs text-blue-600 font-medium">Önerilen: 1200x400px</p>
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Services Management */}
        <FormField
          control={form.control}
          name="servicesList"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sunduğunuz Hizmetler *</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      value={serviceInput}
                      onChange={(e) => setServiceInput(e.target.value)}
                      placeholder="Hizmet adı yazın..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (serviceInput.trim()) {
                            addService(serviceInput);
                          }
                        }
                      }}
                    />
                    {serviceInput && filteredServices.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                        {filteredServices.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => addService(service.name)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium">{service.name}</div>
                            {service.description && (
                              <div className="text-xs text-gray-500">{service.description}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {serviceInput && !exactMatchExists && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addService(serviceInput)}
                      className="w-full"
                    >
                      "{serviceInput}" hizmetini ekle
                    </Button>
                  )}

                  {selectedServices.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedServices.map((service, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {service}
                          <button
                            type="button"
                            onClick={() => removeService(service)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <X size={14} />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
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
