import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuoteRequestForm } from '@/components/forms/quote-request-form';
import { Partner } from '@shared/schema';

interface QuoteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner | null;
}

export function QuoteRequestModal({ isOpen, onClose, partner }: QuoteRequestModalProps) {
  if (!partner) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="bg-gradient-to-r from-dip-blue to-dip-green text-white p-4 rounded-lg mb-6 -mx-6 -mt-6">
            <h3 className="text-xl font-bold mb-2">DİP'e Özel Avantajlar</h3>
            <p className="text-blue-100">Bu partnerden özel indirimli hizmet alabilirsiniz</p>
          </div>
          <DialogTitle className="text-lg font-semibold">
            {partner.companyName} - Teklif Talep Formu
          </DialogTitle>
        </DialogHeader>
        <QuoteRequestForm partner={partner} onSuccess={onClose} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
