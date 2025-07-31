import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import type { Service } from "@shared/schema";

// Service categories will be fetched from API

const companySizes = [
  "1-10 çalışan",
  "11-30 çalışan", 
  "31-100 çalışan",
  "100-1000 çalışan",
  "1000+ çalışan"
];

const partnerApplicationSchema = z.object({
  firstName: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  lastName: z.string().min(2, "Soyad en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  company: z.string().min(2, "Şirket adı en az 2 karakter olmalıdır"),
  contactPerson: z.string().min(2, "İletişim kişisi en az 2 karakter olmalıdır"),
  username: z.string()
    .min(3, "Kullanıcı adı en az 3 karakter olmalıdır")
    .max(20, "Kullanıcı adı en fazla 20 karakter olabilir")
    .regex(/^[a-zA-Z0-9_-]+$/, "Kullanıcı adı sadece İngilizce harfler, rakamlar, alt çizgi ve tire içerebilir"),
  website: z.string().url("Geçerli bir web sitesi adresi giriniz").optional().or(z.literal("")),
  serviceCategory: z.string().min(1, "Hizmet kategorisi seçiniz"),
  businessDescription: z.string().min(10, "İş tanımı en az 10 karakter olmalıdır"),
  companySize: z.string().min(1, "Şirket büyüklüğü seçiniz"),
  foundingYear: z.string().min(4, "Kuruluş yılı giriniz"),
  sectorExperience: z.string().optional(),
  targetMarkets: z.string().optional(),
  services: z.string().min(10, "Sunacağınız hizmetler en az 10 karakter olmalıdır"),
  servicesList: z.array(z.string()).min(1, "En az bir hizmet seçmelisiniz"),
  dipAdvantages: z.string().min(10, "DİP üyelerine özel fırsat teklifiniz en az 10 karakter olmalıdır"),
  whyPartner: z.string().min(10, "Neden DİP ile iş ortağı olmak istediğiniz en az 10 karakter olmalıdır"),
  references: z.string().optional(),
  linkedinProfile: z.string().url("Geçerli bir LinkedIn profil adresi giriniz").optional().or(z.literal("")),
  twitterProfile: z.string().url("Geçerli bir Twitter profil adresi giriniz").optional().or(z.literal("")),
  instagramProfile: z.string().url("Geçerli bir Instagram profil adresi giriniz").optional().or(z.literal("")),
  facebookProfile: z.string().url("Geçerli bir Facebook sayfa adresi giriniz").optional().or(z.literal("")),
  kvkkAccepted: z.boolean().refine(val => val === true, "KVKK onayı zorunludur"),
  logoFile: z.any().optional(),
  coverFile: z.any().optional(),
});

type PartnerApplicationFormData = z.infer<typeof partnerApplicationSchema>;

interface PartnerApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledData?: Partial<PartnerApplicationFormData>;
  onSuccess?: () => void;
}

export function PartnerApplicationDialog({ open, onOpenChange, prefilledData, onSuccess }: PartnerApplicationDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropType, setCropType] = useState<'logo' | 'cover'>('logo');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState('');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Fetch service categories
  const { data: categories = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/categories"],
  });

  // Fetch existing services
  const { data: existingServices = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
  });

  // File upload handlers with crop support
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Hata",
          description: "Lütfen sadece resim dosyası seçiniz.",
          variant: "destructive",
        });
        return;
      }

      // Create preview and open crop dialog
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setCropImageSrc(imageSrc);
        setCropType('logo');
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Hata",
          description: "Lütfen sadece resim dosyası seçiniz.",
          variant: "destructive",
        });
        return;
      }

      // Create preview and open crop dialog
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setCropImageSrc(imageSrc);
        setCropType('cover');
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Crop completion handler
  const handleCropComplete = (croppedImageBlob: Blob) => {
    const croppedFile = new File([croppedImageBlob], `${cropType}-cropped.jpg`, {
      type: 'image/jpeg',
    });

    if (cropType === 'logo') {
      setLogoFile(croppedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(croppedFile);
    } else {
      setCoverFile(croppedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string);
      };
      reader.readAsDataURL(croppedFile);
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

  // Crop image to square
  const cropImageToSquare = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        
        ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], file.name, { type: file.type });
            resolve(croppedFile);
          }
        }, file.type, 0.9);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const form = useForm<PartnerApplicationFormData>({
    resolver: zodResolver(partnerApplicationSchema),
    defaultValues: {
      firstName: prefilledData?.firstName || "",
      lastName: prefilledData?.lastName || "",
      email: prefilledData?.email || "",
      phone: prefilledData?.phone || "",
      company: prefilledData?.company || "",
      contactPerson: prefilledData?.contactPerson || "",
      username: prefilledData?.username || "",
      website: prefilledData?.website || "",
      serviceCategory: prefilledData?.serviceCategory || "",
      businessDescription: prefilledData?.businessDescription || "",
      companySize: prefilledData?.companySize || "",
      foundingYear: prefilledData?.foundingYear || "",
      sectorExperience: prefilledData?.sectorExperience || "",
      targetMarkets: prefilledData?.targetMarkets || "",
      services: prefilledData?.services || "",
      servicesList: [],
      dipAdvantages: prefilledData?.dipAdvantages || "",
      whyPartner: prefilledData?.whyPartner || "",
      references: prefilledData?.references || "",
      linkedinProfile: prefilledData?.linkedinProfile || "",
      twitterProfile: prefilledData?.twitterProfile || "",
      instagramProfile: prefilledData?.instagramProfile || "",
      facebookProfile: prefilledData?.facebookProfile || "",
      kvkkAccepted: false,
    },
  });

  // Reset form when dialog opens with prefilled data 
  useEffect(() => {
    if (open && prefilledData) {
      form.reset({
        firstName: prefilledData?.firstName || "",
        lastName: prefilledData?.lastName || "",
        email: prefilledData?.email || "",
        phone: prefilledData?.phone || "",
        company: prefilledData?.company || "",
        contactPerson: prefilledData?.contactPerson || "",
        username: prefilledData?.username || "",
        website: prefilledData?.website || "",
        serviceCategory: prefilledData?.serviceCategory || "",
        businessDescription: prefilledData?.businessDescription || "",
        companySize: prefilledData?.companySize || "",
        foundingYear: prefilledData?.foundingYear || "",
        sectorExperience: prefilledData?.sectorExperience || "",
        targetMarkets: prefilledData?.targetMarkets || "",
        services: prefilledData?.services || "",
        dipAdvantages: prefilledData?.dipAdvantages || "",
        whyPartner: prefilledData?.whyPartner || "",
        references: prefilledData?.references || "",
        linkedinProfile: prefilledData?.linkedinProfile || "",
        twitterProfile: prefilledData?.twitterProfile || "",
        instagramProfile: prefilledData?.instagramProfile || "",
        facebookProfile: prefilledData?.facebookProfile || "",
        kvkkAccepted: false,
      });
    }
  }, [open, prefilledData, form]);

  const onSubmit = async (data: PartnerApplicationFormData) => {
    console.log('🔄 Form submission attempt started');
    console.log('📝 Form data:', data);
    console.log('🎯 Selected services:', selectedServices);

    if (selectedServices.length === 0) {
      console.log('❌ Form validation failed: No services selected');
      toast({
        title: 'Hizmet Seçimi Gerekli',
        description: 'En az bir hizmet eklemelisiniz.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    console.log('⏳ Starting form submission...');
    try {
      const formData = new FormData();
      
      // Add form data
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'kvkkAccepted' && key !== 'logoFile' && key !== 'coverFile' && key !== 'servicesList' && value !== undefined && value !== '') {
          formData.append(key, value.toString());
        }
      });

      // Add services as JSON string (overwrite the services field)
      formData.set('services', JSON.stringify(selectedServices));

      // Add logo file if selected
      if (logoFile) {
        const croppedLogo = await cropImageToSquare(logoFile);
        formData.append('logo', croppedLogo);
      }

      // Add cover file if selected
      if (coverFile) {
        formData.append('coverImage', coverFile);
      }

      // Add files
      selectedFiles.forEach((file, index) => {
        formData.append(`documents`, file);
      });

      console.log('📤 Sending request to /api/partner-applications');
      const response = await fetch('/api/partner-applications', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Response status:', response.status, response.statusText);
      const result = await response.json();
      console.log('📄 Response data:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Başvuru gönderilemedi');
      }

      toast({
        title: "Başarılı",
        description: "İş ortağı başvurunuz başarıyla gönderildi. İnceleme süreci sonrasında size dönüş yapılacaktır.",
      });

      form.reset();
      setSelectedFiles([]);
      setLogoFile(null);
      setLogoPreview(null);
      setCoverFile(null);
      setCoverPreview(null);
      setSelectedServices([]);
      setServiceInput('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Başvuru gönderilirken bir hata oluştu",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "Dosya Hatası",
        description: "Sadece PDF, DOC, DOCX, JPG, JPEG, PNG formatları kabul ediliyor ve dosya boyutu 10MB'dan küçük olmalıdır.",
        variant: "destructive",
      });
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-dip-blue">İş Ortağı Başvurusu</DialogTitle>
          <DialogDescription>DİP ile birlikte dijital ihracat ekosisteminin bir parçası olun.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Kişisel Bilgiler */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Kişisel Bilgiler</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ad *</FormLabel>
                      <FormControl>
                        <Input placeholder="Adınız" {...field} />
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
                        <Input placeholder="Soyadınız" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-posta *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="ornek@email.com" {...field} />
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
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="5xxxxxxxxx" 
                          maxLength={10}
                          value={field.value ? field.value.replace(/\D/g, '') : ''}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            if (digits.length <= 10) {
                              // Always start with 5
                              if (digits.length === 0 || digits.startsWith('5')) {
                                field.onChange(digits);
                              } else if (digits.length === 1) {
                                field.onChange('5');
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Şirket Bilgileri */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Şirket Bilgileri</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şirket Adı *</FormLabel>
                      <FormControl>
                        <Input placeholder="Şirket adınız" {...field} />
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
                        <Input placeholder="İletişim kişisi adı" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Web Sitesi</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kullanıcı Adı *</FormLabel>
                      <FormControl>
                        <Input placeholder="partner-kullanici-adi" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-gray-500">Profil linkiniz: /partner/{field.value || 'kullanici-adi'}</p>
                    </FormItem>
                  )}
                />
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hizmet Kategorisi *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seçiniz..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
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
                  name="companySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şirket Büyüklüğü *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seçiniz..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companySizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="foundingYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kuruluş Yılı *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2020" min="1900" max={new Date().getFullYear()} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sectorExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sektör Deneyimi (Yıl)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" min="0" max="50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="businessDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İş Tanımı *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Şirketinizin faaliyet alanını ve sunduğu hizmetleri detaylıca açıklayınız..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetMarkets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hedef Pazarlar</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Hangi pazarlarda faaliyet gösteriyorsunuz veya göstermeyi planlıyorsunuz..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Hizmet Bilgileri */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Hizmet Bilgileri</h3>

              {/* Logo and Cover Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium">Şirket Logosu</Label>
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
                              setLogoPreview(null);
                              setLogoFile(null);
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
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Profil Kapak Görseli</Label>
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
                              setCoverPreview(null);
                              setCoverFile(null);
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
                      onChange={handleCoverChange}
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
                    <FormLabel>DİP Üyelerine Özel Fırsat Teklifiniz Nedir? *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="DİP üyelerine özel sunacağınız avantajları, indirimleri veya özel hizmetleri açıklayınız..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whyPartner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Neden DİP ile İş Ortağı Olmak İstiyorsunuz? *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="DİP ile iş ortaklığı yapmak isteme nedenlerinizi açıklayınız..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="references"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referanslar</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Referans olarak gösterebileceğiniz şirketler, projeler veya kişiler..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sosyal Medya */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Sosyal Medya Profilleri</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="linkedinProfile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn Sayfası</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://linkedin.com/in/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="twitterProfile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter (X) Profili</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://twitter.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="instagramProfile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram Profili</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://instagram.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facebookProfile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook Sayfası</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://facebook.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Dosya Yükleme */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">İş Belgeleri</h3>
              <p className="text-sm text-gray-600">
                Başvurunuzla ilgili referans v.b. belgeler ile şirketinizi temsil eden resmi belgeleri buradan ekleyebilirsiniz. 
                Dosya boyutu maksimum 10MB olmalıdır.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Dosya Seç (Birden Fazla Dosya Seçilebilir)
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      Desteklenen formatlar: PDF, DOC, DOCX, JPG, JPEG, PNG | Maksimum dosya boyutu: 10MB
                    </p>
                  </div>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Seçilen Dosyalar:</h4>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KVKK Onayı */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="kvkkAccepted"
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
                        6698 Sayılı KVKK uyarınca, bilgilerimin ticari bilgi kapsamında Dijital İhracat Platformu ve paydaşları ile paylaşılmasına ve gerçekleşecek olan etkinliklerde, OTT / Canlı kayıt - yayın yapılmasına razı olduğumu kabul / beyan ederim. *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="bg-dip-blue hover:bg-dip-dark-blue"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  "Başvuruyu Gönder"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <ImageCropDialog
      open={cropDialogOpen}
      onOpenChange={setCropDialogOpen}
      imageSrc={cropImageSrc}
      onCropComplete={handleCropComplete}
      aspectRatio={cropType === 'logo' ? 1 : 3}
      title={cropType === 'logo' ? 'Logo Kırp' : 'Kapak Görseli Kırp'}
      description={cropType === 'logo' ? 'Logoyu kare formata kırpın' : 'Kapak görselini 3:1 oranında kırpın'}
    />
    </>
  );
}