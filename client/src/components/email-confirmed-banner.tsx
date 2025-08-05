import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function EmailConfirmedBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);

  useEffect(() => {
    // Check if this is from email confirmation or magic link
    const params = new URLSearchParams(window.location.search);
    const confirmed = params.get('confirmed') === 'true';
    const magic = params.get('magic') === 'true';
    
    if (confirmed || magic) {
      setIsVisible(true);
      setIsMagicLink(magic);
      
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-2">
        <div className="bg-white bg-opacity-20 rounded-full p-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="font-medium">
          {isMagicLink 
            ? 'Sihirli bağlantıyla giriş başarılı! Hoş geldiniz!' 
            : 'Hesabınız doğrulandı! Aramıza hoş geldiniz!'}
        </span>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="text-white hover:text-gray-200 transition-colors"
        aria-label="Bildirimi kapat"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}