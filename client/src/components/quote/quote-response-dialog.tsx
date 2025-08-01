import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { QuoteRequest, Partner } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import ServiceAutocomplete from "@/components/ui/service-autocomplete";
import { 
  Plus, 
  Minus, 
  Calculator, 
  FileText, 
  Send,
  DollarSign,
  Building,
  Calendar
} from "lucide-react";

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const quoteItemSchema = z.object({
  description: z.string().min(1, "Hizmet açıklaması gerekli"),
  quantity: z.number().min(1, "Miktar en az 1 olmalı"),
  unitPrice: z.number().min(0, "Birim fiyat 0'dan büyük olmalı"),
  total: z.number()
});

const quoteResponseSchema = z.object({
  title: z.string().min(1, "Teklif başlığı gerekli"),
  description: z.string().min(1, "Teklif açıklaması gerekli"),
  items: z.array(quoteItemSchema).min(1, "En az bir hizmet kalemi eklenmeli"),
  subtotal: z.number(),
  taxRate: z.number().min(0).max(100),
  taxAmount: z.number(),
  total: z.number(),
  validUntil: z.string().min(1, "Geçerlilik tarihi gerekli"),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTime: z.string().min(1, "Teslimat süresi gerekli"),
});

interface QuoteResponseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequest: QuoteRequest;
  onSuccess: () => void;
}

export function QuoteResponseDialog({ 
  isOpen, 
  onClose, 
  quoteRequest,
  onSuccess 
}: QuoteResponseDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get partner data for services
  const { data: partner, isLoading: partnerLoading } = useQuery<Partner>({
    queryKey: ["/api/partners", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/partners");
      if (!response.ok) throw new Error("Failed to fetch partners");
      const partners = await response.json();
      const userPartner = partners.find((p: Partner) => p.userId === user?.id);
      if (!userPartner) throw new Error("Partner profile not found");
      return userPartner;
    },
    enabled: !!user && ((user.activeUserType === "partner") || (user.userType === "partner")),
  });

  // Get partner's selected services from the new system
  const { data: partnerServices = [] } = useQuery({
    queryKey: ["/api/partner/services"],
    enabled: !!user && ((user.activeUserType === "partner") || (user.userType === "partner")),
  });

  const generateQuoteTitle = () => {
    const currentDate = new Date().toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
    const companyName = quoteRequest.companyName || quoteRequest.fullName;
    return `${companyName} - ${currentDate} - DİP'e Özel Proje Teklifi`;
  };

  const parseServiceItems = (serviceNeeded: string) => {
    // Split services by common separators and create initial items
    const services = serviceNeeded.split(/[,\n\r;]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    // Filter out "Çalışma Şekli" items as they should go to notes
    const filteredServices = services.filter(service => 
      !service.toLowerCase().includes('çalışma şekli')
    );
    
    return filteredServices.map(service => ({
      description: service,
      quantity: 1,
      unitPrice: 0,
      total: 0
    }));
  };

  // Extract work style from service description for notes
  const extractWorkStyle = (serviceNeeded: string) => {
    const lines = serviceNeeded.split(/[,\n\r;]+/).map(s => s.trim()).filter(s => s.length > 0);
    const workStyleLine = lines.find(line => 
      line.toLowerCase().includes('çalışma şekli')
    );
    return workStyleLine || '';
  };

  const initialItems = parseServiceItems(quoteRequest.serviceNeeded || "");
  const [items, setItems] = useState<QuoteItem[]>(
    initialItems.length > 0 ? initialItems : [{ description: "", quantity: 1, unitPrice: 0, total: 0 }]
  );

  // Reset items when dialog opens
  useEffect(() => {
    if (isOpen) {
      const newInitialItems = parseServiceItems(quoteRequest.serviceNeeded || "");
      setItems(newInitialItems.length > 0 ? newInitialItems : [{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
    }
  }, [isOpen, quoteRequest.serviceNeeded]);

  // Generate a random quote number
  const quoteNumber = `DIP${new Date().getFullYear()}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

  const form = useForm<z.infer<typeof quoteResponseSchema>>({
    resolver: zodResolver(quoteResponseSchema),
    defaultValues: {
      title: generateQuoteTitle(),
      description: "",
      items: initialItems,
      subtotal: 0,
      taxRate: 20,
      taxAmount: 0,
      total: 0,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      notes: extractWorkStyle(quoteRequest.serviceNeeded || ''),
      paymentTerms: "Hizmet teslimi sonrası 30 gün içinde ödeme",
      deliveryTime: "15 iş günü",
    },
  });
  
  // Sync items with form when they change
  useEffect(() => {
    form.setValue('items', items);
  }, [items, form]);

  const addItem = () => {
    const newItems = [...items, { description: "", quantity: 1, unitPrice: 0, total: 0 }];
    setItems(newItems);
    form.setValue('items', newItems);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      form.setValue('items', newItems);
      calculateTotals(newItems);
    }
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate total for this item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setItems(updatedItems);
    calculateTotals(updatedItems);
    form.setValue('items', updatedItems);
  };

  const calculateTotals = (itemsToCalculate: QuoteItem[]) => {
    const subtotal = itemsToCalculate.reduce((sum, item) => sum + item.total, 0);
    const taxRate = form.getValues('taxRate') || 20;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    form.setValue('subtotal', subtotal);
    form.setValue('taxAmount', taxAmount);
    form.setValue('total', total);
  };

  const onSubmit = async (data: z.infer<typeof quoteResponseSchema>) => {
    console.log('Form submit started', data);
    console.log('Form errors:', form.formState.errors);
    console.log('Items:', items);
    
    setIsSubmitting(true);
    try {
      const quoteData = {
        ...data,
        quoteRequestId: quoteRequest.id,
        quoteNumber,
        items: items.filter(item => item.description.trim() !== ""),
      };
      
      console.log('Quote data to send:', quoteData);

      const response = await apiRequest("POST", "/api/quote-responses", quoteData);
      
      // Update quote request status to "quote_sent"
      await apiRequest("PATCH", `/api/quote-requests/${quoteRequest.id}`, {
        status: "quote_sent"
      });
      
      toast({
        title: "Başarılı",
        description: "Teklifiniz başarıyla gönderildi ve müşteriye iletildi",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Hata",
        description: "Teklif gönderilirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const taxRate = form.watch('taxRate') || 20;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Teklif Hazırla</span>
            <Badge variant="outline" className="font-mono">
              #{quoteNumber}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={(e) => {
              console.log('Form submit event triggered');
              form.handleSubmit(onSubmit)(e);
            }} 
            className="space-y-6"
          >
            {/* Quote Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Teklif Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teklif Başlığı</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Teklif başlığı" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teklif Açıklaması</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Sunacağınız hizmet hakkında detaylı açıklama yazın"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Quote Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Hizmet Kalemleri
                  </div>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Kalem Ekle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                      <div className="col-span-5">
                        <label className="text-sm font-medium">Hizmet Adı</label>
                        <ServiceAutocomplete
                          partnerId={partner?.id || 0}
                          partnerServices={Array.isArray(partnerServices) ? partnerServices.map((service: any) => service.name) : []}
                          value={item.description}
                          onChange={(value) => updateItem(index, 'description', value)}
                          placeholder="Hizmetlerinizden seçin."
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="text-sm font-medium">Miktar</label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="text-sm font-medium">Birim Fiyat (₺)</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="text-sm font-medium">Toplam (₺)</label>
                        <Input
                          value={item.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals Section */}
                <Separator className="my-6" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="taxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>KDV Oranı (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                calculateTotals(items);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium">Ara Toplam:</span>
                      <span>{form.watch('subtotal')?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'} ₺</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">KDV ({taxRate}%):</span>
                      <span>{form.watch('taxAmount')?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'} ₺</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Genel Toplam:</span>
                      <span className="text-dip-blue">
                        {form.watch('total')?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'} ₺
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Building className="h-5 w-5 mr-2" />
                  Şartlar ve Koşullar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geçerlilik Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teslimat Süresi</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="15 iş günü" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ödeme Koşulları</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Ödeme koşullarını belirtin"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notlar</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Ek açıklamalar ve notlar"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Separator />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-dip-blue hover:bg-dip-dark-blue"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? "Gönderiliyor..." : "Teklif Gönder"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}