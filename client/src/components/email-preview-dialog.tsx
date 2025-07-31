import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EmailPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  htmlContent: string;
}

export function EmailPreviewDialog({ isOpen, onClose, subject, htmlContent }: EmailPreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Email Önizleme: {subject}</DialogTitle>
        </DialogHeader>
        
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <div className="text-sm text-gray-600">Konu: <span className="font-medium text-gray-900">{subject}</span></div>
          </div>
          
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <div 
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              className="prose prose-sm max-w-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}