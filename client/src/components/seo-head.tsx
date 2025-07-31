import React from 'react';

interface SeoHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

export function SeoHead(props: SeoHeadProps) {
  React.useEffect(() => {
    // Update document title
    if (props.title) {
      document.title = props.title;
    }

    // Update meta tags
    const updateMetaTag = (name: string, content: string) => {
      if (!content) return;
      
      let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.name = name;
        document.head.appendChild(element);
      }
      element.content = content;
    };

    const updatePropertyTag = (property: string, content: string) => {
      if (!content) return;
      
      let element = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.content = content;
    };

    // Update basic meta tags
    updateMetaTag('description', props.description || '');
    updateMetaTag('keywords', props.keywords || '');

    // Update Open Graph tags
    updatePropertyTag('og:title', props.ogTitle || props.title || '');
    updatePropertyTag('og:description', props.ogDescription || props.description || '');
    updatePropertyTag('og:image', props.ogImage || '');
    updatePropertyTag('og:url', props.ogUrl || '');
    updatePropertyTag('og:type', 'website');

    // Update Twitter tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', props.twitterTitle || props.title || '');
    updateMetaTag('twitter:description', props.twitterDescription || props.description || '');
    updateMetaTag('twitter:image', props.twitterImage || props.ogImage || '');

  }, [props]);

  return null; // This component doesn't render anything
}