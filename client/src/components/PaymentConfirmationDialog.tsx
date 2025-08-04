import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Upload, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PaymentConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  quoteResponse: any;
  availableQuotes?: any[];
}

export function PaymentConfirmationDialog({ 
  open, 
  onClose, 
  quoteResponse,
  availableQuotes = []
}: PaymentConfirmationDialogProps) {
  const [selectedQuoteId, setSelectedQuoteId] = useState(quoteResponse?.id || "");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedQuote = availableQuotes.find(q => q.id === parseInt(selectedQuoteId)) || quoteResponse;

  const paymentConfirmationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/payment-confirmations', {
        method: 'POST',
        body: data,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ödeme Bildirimi Gönderildi",
        description: "Ödeme bildiriminiz partnere gönderildi. Partner onayladıktan sonra hizmet talebiniz tamamlanacak.",
      });
      onClose();
      resetForm();
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/quote-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/quote-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Ödeme bildirimi gönderilirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedQuoteId(quoteResponse?.id.toString() || "");
    setPaymentMethod("");
    setAmount(quoteResponse ? (quoteResponse.totalAmount / 100).toString() : "");
    setNote("");
    setReceiptFile(null);
  };

  // Reset form when dialog opens with new quote data
  useEffect(() => {
    if (open && quoteResponse) {
      resetForm();
    }
  }, [open, quoteResponse]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedQuoteId || !paymentMethod || !amount) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen tüm gerekli alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    // Make receipt upload mandatory for all payments
    if (!receiptFile) {
      toast({
        title: "Dekont Gerekli",
        description: "Ödeme bildirimleri için dekont yüklenmesi zorunludur.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('quoteResponseId', selectedQuoteId);
    formData.append('paymentMethod', paymentMethod);
    formData.append('amount', (parseFloat(amount) * 100).toString()); // Convert to cents
    if (note) formData.append('note', note);
    if (receiptFile) formData.append('receipt', receiptFile);

    paymentConfirmationMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Dosya Çok Büyük",
          description: "Dosya boyutu en fazla 5MB olabilir.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Geçersiz Dosya Türü",
          description: "Sadece JPG, PNG ve PDF dosyaları kabul edilir.",
          variant: "destructive",
        });
        return;
      }
      
      setReceiptFile(file);
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="payment-confirmation-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Ödememi Yaptım
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quote Selection - only show if multiple quotes available */}
          {availableQuotes.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="quote-select">Teklif Seçin</Label>
              <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                <SelectTrigger data-testid="select-quote">
                  <SelectValue placeholder="Teklif seçin" />
                </SelectTrigger>
                <SelectContent>
                  {availableQuotes.map((quote) => (
                    <SelectItem key={quote.id} value={quote.id.toString()}>
                      {quote.title} - ₺{(quote.totalAmount / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Display selected quote info */}
          {selectedQuote && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900">{selectedQuote.title}</h4>
              <p className="text-sm text-blue-700">
                Toplam: ₺{(selectedQuote.totalAmount / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Ödeme Yöntemi</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger data-testid="select-payment-method">
                <SelectValue placeholder="Ödeme yöntemi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Kredi/Banka Kartı</SelectItem>
                <SelectItem value="transfer">Havale/EFT</SelectItem>
                <SelectItem value="other">Diğer Yöntemler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Ödenen Tutar (₺)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={selectedQuote ? (selectedQuote.totalAmount / 100).toString() : "0.00"}
              data-testid="input-amount"
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt">
              Dekont/Fiş Yükle <span className="text-red-500">*</span>
            </Label>
            {!receiptFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-receipt"
                />
                <label htmlFor="receipt" className="cursor-pointer block">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-1">Dosya Seç</p>
                  <p className="text-xs text-gray-500">JPG, PNG veya PDF dosyası seçin</p>
                  <p className="text-xs text-gray-400 mt-1">Maksimum dosya boyutu: 5MB</p>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Upload className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{receiptFile.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  data-testid="button-remove-receipt"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Not (Opsiyonel)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ödeme ile ilgili not ekleyin..."
              rows={3}
              data-testid="textarea-note"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={paymentConfirmationMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
              data-testid="button-submit-payment"
            >
              {paymentConfirmationMutation.isPending ? "Gönderiliyor..." : "Ödeme Bildir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}