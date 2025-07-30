import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
          {partner.dipAdvantages && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-lg mb-6 -mx-6 -mt-6">
              <h3 className="text-xl font-bold mb-2 flex items-center">
                {partner.logo && (
                  <img 
                    src={partner.logo} 
                    alt={partner.companyName}
                    className="w-8 h-8 rounded mr-3 bg-white p-1"
                  />
                )}
                {partner.companyName} - DİP'e Özel Avantajlar
              </h3>
              <p className="text-blue-100 leading-relaxed">
                {partner.dipAdvantages}
              </p>
            </div>
          )}
          <DialogTitle className="text-lg font-semibold">
            Teklif Talep Formu
          </DialogTitle>
          <DialogDescription className="sr-only">
            {partner.companyName} firmasından teklif almak için formu doldurun
          </DialogDescription>
        </DialogHeader>
        <QuoteRequestForm partner={partner} onSuccess={onClose} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
