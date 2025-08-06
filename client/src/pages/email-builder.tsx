import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Eye, Home } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Email Builder Components using email-builder-js
declare global {
  interface Window {
    EmailBuilder?: any;
  }
}

export default function EmailBuilderPage() {
  const builderRef = useRef<HTMLDivElement>(null);
  const [emailBuilder, setEmailBuilder] = useState<any>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);

  // Load email-builder-js library
  useEffect(() => {
    const loadEmailBuilder = async () => {
      try {
        // Load CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/email-builder-js@latest/dist/email-builder.min.css';
        document.head.appendChild(cssLink);

        // Load JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/email-builder-js@latest/dist/email-builder.min.js';
        script.onload = () => {
          setIsLibraryLoaded(true);
          initializeBuilder();
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error loading email builder:', error);
      }
    };

    loadEmailBuilder();

    return () => {
      // Cleanup
      const cssLinks = document.querySelectorAll('link[href*="email-builder"]');
      cssLinks.forEach(link => link.remove());
      
      const scripts = document.querySelectorAll('script[src*="email-builder"]');
      scripts.forEach(script => script.remove());
    };
  }, []);

  const initializeBuilder = () => {
    if (builderRef.current && window.EmailBuilder && isLibraryLoaded) {
      try {
        const builder = new window.EmailBuilder({
          container: builderRef.current,
          width: '100%',
          height: '600px',
          locale: 'tr',
          tools: {
            text: { enabled: true },
            image: { enabled: true },
            button: { enabled: true },
            divider: { enabled: true },
            spacer: { enabled: true },
            social: { enabled: true },
            html: { enabled: true }
          },
          fonts: [
            { name: 'Arial', url: '' },
            { name: 'Georgia', url: '' },
            { name: 'Times New Roman', url: '' },
            { name: 'Verdana', url: '' }
          ],
          mergeTags: [
            { name: 'Ad', value: '{{name}}' },
            { name: 'E-posta', value: '{{email}}' },
            { name: 'Şirket', value: '{{company}}' },
            { name: 'Proje', value: '{{projectTitle}}' },
            { name: 'Partner', value: '{{partnerName}}' },
            { name: 'Tutar', value: '{{amount}}' },
            { name: 'Tarih', value: '{{date}}' },
            { name: 'Abonelik İptal URL', value: '{{unsubscribeUrl}}' }
          ],
          onReady: function() {
            console.log('Email builder ready');
            
            // Add default DIP footer with unsubscribe
            const defaultFooter = {
              type: 'html',
              content: `
                <div style="margin-top: 40px; padding: 20px; background-color: #f8f9fa; border-top: 1px solid #dee2e6; text-align: center; font-size: 12px; color: #6c757d;">
                  <p style="margin: 0 0 10px 0;">
                    <strong>dip | iş ortakları platformu</strong>
                  </p>
                  <p style="margin: 0;">
                    Bu e-postayı almak istemiyorsanız 
                    <a href="{{unsubscribeUrl}}" style="color: #007bff; text-decoration: none;">buraya tıklayarak listeden çıkabilirsiniz</a>.
                  </p>
                </div>
              `
            };
            
            builder.addElement(defaultFooter);
          }
        });
        
        setEmailBuilder(builder);
      } catch (error) {
        console.error('Error initializing email builder:', error);
      }
    }
  };

  useEffect(() => {
    if (isLibraryLoaded) {
      initializeBuilder();
    }
  }, [isLibraryLoaded]);

  const handlePreview = () => {
    if (emailBuilder) {
      try {
        const html = emailBuilder.getHtml();
        setPreviewContent(html);
        setShowPreview(true);
      } catch (error) {
        console.error('Error getting preview:', error);
        alert('Önizleme oluşturulurken hata oluştu');
      }
    }
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      alert('Lütfen şablon adı girin');
      return;
    }

    if (!templateSubject.trim()) {
      alert('Lütfen e-posta konusu girin');
      return;
    }

    if (emailBuilder) {
      try {
        const html = emailBuilder.getHtml();
        
        // Add mandatory footer with unsubscribe functionality
        const footer = `
          <div style="margin-top: 40px; padding: 20px; background-color: #f8f9fa; border-top: 1px solid #dee2e6; text-align: center; font-size: 12px; color: #6c757d;">
            <p style="margin: 0 0 10px 0;">
              <strong>dip | iş ortakları platformu</strong>
            </p>
            <p style="margin: 0;">
              Bu e-postayı almak istemiyorsanız 
              <a href="{{unsubscribeUrl}}" style="color: #007bff; text-decoration: none;">buraya tıklayarak listeden çıkabilirsiniz</a>.
            </p>
          </div>
        `;
        
        let fullHtmlContent = html;
        
        // Add footer if not already present
        if (!fullHtmlContent.includes('dip | iş ortakları platformu')) {
          if (fullHtmlContent.includes('</body>')) {
            fullHtmlContent = fullHtmlContent.replace('</body>', footer + '</body>');
          } else {
            fullHtmlContent += footer;
          }
        }
        
        // Send message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'emailTemplate',
            template: {
              name: templateName,
              subject: templateSubject,
              htmlContent: fullHtmlContent
            }
          }, window.location.origin);
          
          alert('Şablon başarıyla kaydedildi! Pencere kapatılıyor...');
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          // If not opened from parent, download as file
          const blob = new Blob([fullHtmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${templateName}.html`;
          a.click();
          URL.revokeObjectURL(url);
          alert('Şablon dosya olarak indirildi!');
        }
      } catch (error) {
        console.error('Error saving template:', error);
        alert('Şablon kaydedilirken hata oluştu: ' + error.message);
      }
    } else {
      alert('Email builder henüz yüklenmedi. Lütfen bekleyin.');
    }
  };

  const goHome = () => {
    if (window.opener) {
      window.close();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">DİP Email Builder</h1>
            <div className="flex items-center gap-2">
              <div>
                <Label htmlFor="templateName" className="text-sm">Şablon Adı</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Email şablonu adı"
                  className="w-48"
                  data-testid="input-template-name"
                />
              </div>
              <div>
                <Label htmlFor="templateSubject" className="text-sm">E-posta Konusu</Label>
                <Input
                  id="templateSubject"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  placeholder="E-posta konusu"
                  className="w-64"
                  data-testid="input-template-subject"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePreview}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!emailBuilder}
              data-testid="button-preview"
            >
              <Eye className="h-4 w-4" />
              Önizle
            </Button>
            <Button
              onClick={handleSave}
              className="flex items-center gap-2"
              disabled={!emailBuilder || !templateName.trim() || !templateSubject.trim()}
              data-testid="button-save"
            >
              <Save className="h-4 w-4" />
              Kaydet
            </Button>
            <Button
              onClick={goHome}
              variant="ghost"
              className="flex items-center gap-2"
              data-testid="button-home"
            >
              <Home className="h-4 w-4" />
              Ana Sayfa
            </Button>
          </div>
        </div>
      </div>

      {/* Builder Container */}
      <div className="flex-1 p-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Email Şablonu Oluşturucu</CardTitle>
          </CardHeader>
          <CardContent className="h-full">
            {!isLibraryLoaded ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Email builder yükleniyor...</p>
                </div>
              </div>
            ) : (
              <div 
                ref={builderRef} 
                className="w-full h-full border rounded-lg"
                style={{ minHeight: '600px' }}
                data-testid="email-builder-container"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Email Önizleme</DialogTitle>
            <DialogDescription>
              E-posta şablonunuzun nasıl görüneceğini inceleyin
            </DialogDescription>
          </DialogHeader>
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: previewContent }}
            data-testid="email-preview"
          />
        </DialogContent>
      </Dialog>

      {/* Instructions */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-sm text-muted-foreground space-y-2">
            <h3 className="font-medium text-gray-900 mb-2">Kullanım Talimatları:</h3>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Sol taraftaki araçları kullanarak email şablonunuzu oluşturun</li>
              <li>Metin, resim, buton, sosyal medya ikonları ve daha fazlasını ekleyebilirsiniz</li>
              <li>Merge taglerini ({"{{name}}, {{email}}, vb."}) kullanarak dinamik içerik ekleyin</li>
              <li>Zorunlu abonelik çıkarma footer'ı otomatik olarak eklenir</li>
              <li>Şablon adı ve konusu girip "Kaydet" butonuna tıklayın</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}