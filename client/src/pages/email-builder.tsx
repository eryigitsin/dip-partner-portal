import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Eye, Home, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function EmailBuilderPage() {
  const builderRef = useRef<HTMLDivElement>(null);
  const [emailBuilder, setEmailBuilder] = useState<any>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Kütüphaneler yükleniyor...');

  // Load GrapesJS for email builder
  useEffect(() => {
    const loadEmailBuilder = async () => {
      try {
        setLoadingStatus('GrapesJS CSS yükleniyor...');
        
        // Load GrapesJS CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/grapesjs@0.20.4/dist/css/grapes.min.css';
        document.head.appendChild(cssLink);

        setLoadingStatus('GrapesJS yükleniyor...');
        
        // Load GrapesJS
        const grapesScript = document.createElement('script');
        grapesScript.src = 'https://unpkg.com/grapesjs@0.20.4/dist/grapes.min.js';
        grapesScript.onload = () => {
          setLoadingStatus('Newsletter preset yükleniyor...');
          
          // Load newsletter preset
          const presetScript = document.createElement('script');
          presetScript.src = 'https://unpkg.com/grapesjs-preset-newsletter@0.2.20/dist/grapesjs-preset-newsletter.min.js';
          presetScript.onload = () => {
            setLoadingStatus('Email builder hazırlanıyor...');
            setIsLibraryLoaded(true);
          };
          presetScript.onerror = () => {
            setLoadingStatus('Newsletter preset yüklenemedi, basit editor kullanılacak...');
            setIsLibraryLoaded(true);
          };
          document.body.appendChild(presetScript);
        };
        grapesScript.onerror = () => {
          setLoadingStatus('GrapesJS yüklenemedi, fallback editor kullanılacak...');
          setIsLibraryLoaded(true);
        };
        document.body.appendChild(grapesScript);
      } catch (error) {
        console.error('Error loading email builder:', error);
        setLoadingStatus('Kütüphaneler yüklenemedi, basit editor kullanılacak...');
        setIsLibraryLoaded(true);
      }
    };

    loadEmailBuilder();

    return () => {
      // Cleanup
      const cssLinks = document.querySelectorAll('link[href*="grapes"]');
      cssLinks.forEach(link => link.remove());
      
      const scripts = document.querySelectorAll('script[src*="grapes"]');
      scripts.forEach(script => script.remove());
    };
  }, []);

  // Initialize builder when library is loaded
  useEffect(() => {
    if (isLibraryLoaded) {
      initializeBuilder();
    }
  }, [isLibraryLoaded]);

  const initializeBuilder = () => {
    if (builderRef.current && (window as any).grapesjs && isLibraryLoaded) {
      try {
        setLoadingStatus('Editor başlatılıyor...');
        
        const editor = (window as any).grapesjs.init({
          container: builderRef.current,
          height: '600px',
          width: 'auto',
          plugins: ['gjs-preset-newsletter'],
          pluginsOpts: {
            'gjs-preset-newsletter': {
              modalImportTitle: 'Template İçe Aktar',
              modalImportLabel: '<div style="margin-bottom: 10px; font-size: 13px;">HTML template içe aktar</div>',
              codeViewerTheme: 'hopscotch',
              categoryLabel: 'Email Elementleri'
            }
          },
          canvas: {
            styles: [
              'https://maxcdn.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css'
            ]
          },
          storageManager: false,
          blockManager: {
            appendTo: '.blocks-container'
          }
        });

        // Add DİP footer block
        editor.BlockManager.add('dip-footer', {
          label: 'DİP Footer',
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
          `,
          category: 'Basic'
        });

        // Load initial template
        editor.setComponents(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Email Şablonunuz</h1>
            <p style="color: #666; line-height: 1.6;">
              Buraya içeriğinizi ekleyebilirsiniz. Sol panelden elemanları sürükleyip bırakarak şablonunuzu oluşturun.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Örnek Buton
              </a>
            </div>
          </div>
        `);

        setEmailBuilder(editor);
        setLoadingStatus('Email builder hazır!');
        
        // Hide loading after 1 second
        setTimeout(() => {
          setLoadingStatus('');
        }, 1000);
        
      } catch (error) {
        console.error('Error initializing email builder:', error);
        setLoadingStatus('Editor başlatılamadı, basit metin editörü kullanılacak...');
        
        // Set a fallback simple builder
        setEmailBuilder({
          getHtml: () => builderRef.current?.innerHTML || '<p>Basit editor içeriği</p>'
        });
      }
    } else {
      setLoadingStatus('GrapesJS bulunamadı, basit editor kullanılıyor...');
      
      // Fallback simple editor
      setTimeout(() => {
        if (builderRef.current) {
          builderRef.current.innerHTML = `
            <div contenteditable="true" style="border: 1px solid #ddd; padding: 20px; min-height: 400px; font-family: Arial, sans-serif;">
              <h1>Email Şablonunuz</h1>
              <p>Bu basit bir metin editörüdür. İçeriğinizi buraya yazabilirsiniz.</p>
              <p>Parametreler: {{name}}, {{email}}, {{unsubscribeUrl}}</p>
            </div>
          `;
        }
        
        setEmailBuilder({
          getHtml: () => builderRef.current?.innerHTML || '<p>Fallback content</p>'
        });
        
        setLoadingStatus('Basit editor hazır!');
        setTimeout(() => setLoadingStatus(''), 1000);
      }, 1000);
    }
  };

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
        alert('Şablon kaydedilirken hata oluştu: ' + (error as Error).message);
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
            {loadingStatus && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <AlertCircle className="h-4 w-4 animate-spin" />
                {loadingStatus}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={goHome}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              Ana Sayfa
            </Button>
          </div>
        </div>
      </div>

      {/* Template Info */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="templateName" className="text-sm font-medium">Şablon Adı:</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Email şablonu adı"
              className="w-48"
              data-testid="input-template-name"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="templateSubject" className="text-sm font-medium">E-posta Konusu:</Label>
            <Input
              id="templateSubject"
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
              placeholder="E-posta konusu"
              className="w-64"
              data-testid="input-template-subject"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              onClick={handlePreview}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              data-testid="button-preview"
            >
              <Eye className="h-4 w-4" />
              Önizleme
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="flex items-center gap-1"
              data-testid="button-save"
            >
              <Save className="h-4 w-4" />
              Kaydet
            </Button>
          </div>
        </div>
      </div>

      {/* Email Builder */}
      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Email Tasarımcı</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                ref={builderRef} 
                className="w-full"
                style={{ minHeight: '600px' }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Email Önizlemesi</DialogTitle>
            <DialogDescription>
              Şablonunuzun nasıl görüneceğini inceleyin
            </DialogDescription>
          </DialogHeader>
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}