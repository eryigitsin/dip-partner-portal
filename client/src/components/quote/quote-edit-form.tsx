import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, X } from "lucide-react";

interface QuoteItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface QuoteEditFormProps {
  quoteResponse: any;
  onSave: (updatedQuoteData: any) => void;
  onCancel: () => void;
}

export function QuoteEditForm({ quoteResponse, onSave, onCancel }: QuoteEditFormProps) {
  const [formData, setFormData] = useState({
    title: quoteResponse.title || '',
    description: quoteResponse.description || '',
    validUntil: quoteResponse.validUntil ? new Date(quoteResponse.validUntil).toISOString().split('T')[0] : '',
    notes: quoteResponse.notes || '',
    paymentTerms: quoteResponse.paymentTerms || '',
    deliveryTime: quoteResponse.deliveryTime || '',
    taxRate: quoteResponse.taxRate || 2000, // 20% in basis points
  });

  const [items, setItems] = useState<QuoteItem[]>([]);

  useEffect(() => {
    if (quoteResponse.items) {
      const parsedItems = typeof quoteResponse.items === 'string' 
        ? JSON.parse(quoteResponse.items) 
        : quoteResponse.items;
      setItems(parsedItems || []);
    }
  }, [quoteResponse]);

  const addItem = () => {
    setItems([...items, {
      description: '',
      quantity: 1,
      unit: 'adet',
      unitPrice: 0,
      totalPrice: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = Math.round(subtotal * formData.taxRate / 10000);
    const totalAmount = subtotal + taxAmount;
    
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSave = () => {
    const { subtotal, taxAmount, totalAmount } = calculateTotals();
    
    const updatedQuoteData = {
      ...formData,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      status: 'pending' // Reset to pending when edited
    };
    
    onSave(updatedQuoteData);
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Temel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Teklif Başlığı</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Teklif başlığını girin"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Teklif açıklamasını girin"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="validUntil">Geçerlilik Tarihi</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="deliveryTime">Teslimat Süresi</Label>
              <Input
                id="deliveryTime"
                value={formData.deliveryTime}
                onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                placeholder="Örn: 2-3 iş günü"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quote Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Hizmet Kalemleri</CardTitle>
            <Button
              onClick={addItem}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Kalem Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline">Kalem {index + 1}</Badge>
                  <Button
                    onClick={() => removeItem(index)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Label>Hizmet Açıklaması</Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Hizmet açıklamasını girin"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Miktar</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Birim</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      placeholder="adet, kg, saat"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div>
                    <Label>Birim Fiyat (₺)</Label>
                    <Input
                      type="number"
                      value={item.unitPrice / 100}
                      onChange={(e) => updateItem(index, 'unitPrice', Math.round((parseFloat(e.target.value) || 0) * 100))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Toplam Fiyat (₺)</Label>
                    <Input
                      value={(item.totalPrice / 100).toFixed(2)}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {items.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                Henüz hizmet kalemi eklenmedi. "Kalem Ekle" butonuna tıklayarak başlayın.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Mali Özet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Ara Toplam</span>
              <span className="font-medium">₺{(subtotal / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>KDV</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={formData.taxRate / 100}
                  onChange={(e) => setFormData({ ...formData, taxRate: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                  className="w-20 text-right"
                  min="0"
                  max="100"
                  step="0.01"
                />
                <span>%</span>
                <span className="font-medium">₺{(taxAmount / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Genel Toplam</span>
              <span className="text-blue-600">₺{(totalAmount / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Ek Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="paymentTerms">Ödeme Koşulları</Label>
            <Textarea
              id="paymentTerms"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              placeholder="Ödeme koşullarını belirtin"
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ek notlarınızı yazın"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          İptal
        </Button>
        <Button
          onClick={handleSave}
          disabled={items.length === 0 || !formData.title || !formData.validUntil}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Güncelle ve Gönder
        </Button>
      </div>
    </div>
  );
}